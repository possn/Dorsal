// Dorsal: envia notificações push quando há uma mensagem nova na conversa de uma prova.
// Cópia de referência da função publicada no Supabase. Publicar com: supabase functions deploy notificar
// GET  -> { publicKey }  (cria as chaves VAPID na primeira vez e guarda-as em push_config)
// POST { comentario_id } com o cabeçalho x-grupo -> envia a notificação aos outros membros do grupo com notificações activas.
import webpush from "npm:web-push@3.6.7";

const URL_BASE = Deno.env.get("SUPABASE_URL")!;
function chaveServico(): string {
  const legado = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legado) return legado;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; } catch { return ""; }
}
const SK = chaveServico();
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-grupo",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`db ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}

async function chaves() {
  const l = await db("push_config?select=public_key,private_key&id=eq.1");
  if (l && l.length) return l[0];
  const k = webpush.generateVAPIDKeys();
  await db("push_config", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ id: 1, public_key: k.publicKey, private_key: k.privateKey }) });
  const l2 = await db("push_config?select=public_key,private_key&id=eq.1");
  return l2[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const k = await chaves();
    if (req.method === "GET") return json({ publicKey: k.public_key });
    if (req.method !== "POST") return json({ erro: "método" }, 405);

    const grupo = (req.headers.get("x-grupo") || "").toLowerCase();
    const { comentario_id } = await req.json().catch(() => ({}));
    if (!/^[a-z0-9]{6,40}$/.test(grupo) || !Number.isInteger(comentario_id)) return json({ erro: "pedido inválido" }, 400);

    // Marca como notificado de forma atómica: só avança se ainda não tinha sido notificado e é recente.
    const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const marc = await db(`comentarios?id=eq.${comentario_id}&grupo=eq.${grupo}&notificado=eq.false&criado_em=gte.${desde}&select=id,prova_id,membro_id,texto`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ notificado: true }),
    });
    if (!marc || !marc.length) return json({ enviadas: 0, motivo: "nada a notificar" });
    const c = marc[0];

    const [g, pv, au, subs] = await Promise.all([
      db(`grupos?codigo=eq.${grupo}&select=nome`),
      db(`provas?id=eq.${encodeURIComponent(c.prova_id)}&select=nome`),
      db(`membros?id=eq.${c.membro_id}&select=nome`),
      db(`subscricoes?grupo=eq.${grupo}&membro_id=neq.${c.membro_id}&select=endpoint,p256dh,auth`),
    ]);
    const nomeProva = pv?.[0]?.nome || "Prova";
    const autor = au?.[0]?.nome || "Alguém";
    const texto = String(c.texto).replace(/\s+/g, " ").slice(0, 140);
    const payload = JSON.stringify({
      title: nomeProva + (g?.[0]?.nome ? " · " + g[0].nome : ""),
      body: `${autor}: ${texto}`,
      url: `./?g=${grupo}#p=${encodeURIComponent(c.prova_id)}`,
      tag: `conv-${grupo}-${c.prova_id}`,
    });

    webpush.setVapidDetails("https://possn.github.io/Dorsal/", k.public_key, k.private_key);
    let enviadas = 0;
    await Promise.all((subs || []).map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: "normal" });
        enviadas++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db(`subscricoes?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE" }).catch(() => {});
        } else console.error("push falhou", code, String(e));
      }
    }));
    return json({ enviadas, total: (subs || []).length });
  } catch (e) {
    console.error(e);
    return json({ erro: "falha interna" }, 500);
  }
});
