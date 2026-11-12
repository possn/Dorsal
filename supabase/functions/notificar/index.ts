// Dorsal: notificações push.
// GET -> { publicKey }
// POST { comentario_id } ou { tipo: "comentario", comentario_id }  (cabeçalho x-grupo) -> mensagem nova na conversa de uma prova
// POST { tipo: "presenca", prova_id, membro_id }                    (cabeçalho x-grupo) -> alguém marcou Inscrito ou Vou
// POST { tipo: "lembretes" }                                         -> lembrete na véspera (chamado pelo pg_cron)
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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`db ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}

// Regista uma chave única; devolve true só na primeira vez (evita avisos repetidos).
async function primeiraVez(chave: string): Promise<boolean> {
  const r = await db("notif_log?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify({ chave }) });
  return Array.isArray(r) && r.length > 0;
}

async function chaves() {
  const l = await db("push_config?select=public_key,private_key&id=eq.1");
  if (l && l.length) return l[0];
  const k = webpush.generateVAPIDKeys();
  await db("push_config", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ id: 1, public_key: k.publicKey, private_key: k.privateKey }) });
  return (await db("push_config?select=public_key,private_key&id=eq.1"))[0];
}

type Sub = { endpoint: string; p256dh: string; auth: string; membro_id?: string };
async function enviar(subs: Sub[], payload: string) {
  let enviadas = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: "normal" });
      enviadas++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db(`subscricoes?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE" }).catch(() => {});
      else console.error("push falhou", code, String(e));
    }
  }));
  return enviadas;
}
const nomeGrupo = async (g: string) => (await db(`grupos?codigo=eq.${g}&select=nome`))?.[0]?.nome || "";
const nomeProva = async (id: string) => (await db(`provas?id=eq.${encodeURIComponent(id)}&select=nome,data`))?.[0] || null;
const nomeMembro = async (id: string) => (await db(`membros?id=eq.${id}&select=nome`))?.[0]?.nome || "Alguém";

async function comentario(grupo: string, comentario_id: number) {
  const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const marc = await db(`comentarios?id=eq.${comentario_id}&grupo=eq.${grupo}&notificado=eq.false&criado_em=gte.${desde}&select=id,prova_id,membro_id,texto`, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ notificado: true }),
  });
  if (!marc || !marc.length) return { enviadas: 0, motivo: "nada a notificar" };
  const c = marc[0];
  const [g, pv, au, subs] = await Promise.all([nomeGrupo(grupo), nomeProva(c.prova_id), nomeMembro(c.membro_id),
    db(`subscricoes?grupo=eq.${grupo}&membro_id=neq.${c.membro_id}&select=endpoint,p256dh,auth`)]);
  const payload = JSON.stringify({
    title: (pv?.nome || "Prova") + (g ? " · " + g : ""),
    body: `${au}: ${String(c.texto).replace(/\s+/g, " ").slice(0, 140)}`,
    url: `./?g=${grupo}#p=${encodeURIComponent(c.prova_id)}`, tag: `conv-${grupo}-${c.prova_id}`,
  });
  return { enviadas: await enviar(subs || [], payload), total: (subs || []).length };
}

async function presenca(grupo: string, prova_id: string, membro_id: string) {
  if (!UUID.test(membro_id) || !prova_id || prova_id.length > 80) return { erro: "pedido inválido" };
  const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const p = await db(`presencas?grupo=eq.${grupo}&membro_id=eq.${membro_id}&prova_id=eq.${encodeURIComponent(prova_id)}&atualizado=gte.${desde}&select=estado`);
  const estado = p?.[0]?.estado;
  if (estado !== "inscrito" && estado !== "vou") return { enviadas: 0, motivo: "sem presença recente" };
  if (!(await primeiraVez(`pres:${grupo}:${membro_id}:${prova_id}:${estado}`))) return { enviadas: 0, motivo: "já avisado" };
  // destinatários: quem também marcou esta prova
  const outros = await db(`presencas?grupo=eq.${grupo}&prova_id=eq.${encodeURIComponent(prova_id)}&membro_id=neq.${membro_id}&select=membro_id`);
  const ids = [...new Set((outros || []).map((x: { membro_id: string }) => x.membro_id))];
  if (!ids.length) return { enviadas: 0, motivo: "ninguém mais nesta prova" };
  const [g, pv, au, subs] = await Promise.all([nomeGrupo(grupo), nomeProva(prova_id), nomeMembro(membro_id),
    db(`subscricoes?grupo=eq.${grupo}&membro_id=in.(${ids.join(",")})&select=endpoint,p256dh,auth`)]);
  const payload = JSON.stringify({
    title: (pv?.nome || "Prova") + (g ? " · " + g : ""),
    body: estado === "inscrito" ? `${au} inscreveu-se ✓` : `${au} também vai`,
    url: `./?g=${grupo}#p=${encodeURIComponent(prova_id)}`, tag: `pres-${grupo}-${prova_id}`,
  });
  return { enviadas: await enviar(subs || [], payload), total: (subs || []).length };
}

async function lembretes() {
  // amanhã em Lisboa
  const lx = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));
  lx.setDate(lx.getDate() + 1);
  const amanha = `${lx.getFullYear()}-${String(lx.getMonth() + 1).padStart(2, "0")}-${String(lx.getDate()).padStart(2, "0")}`;
  const provas = await db(`provas?data=eq.${amanha}&select=id,nome,concelho`);
  if (!provas || !provas.length) return { enviadas: 0, motivo: "sem provas amanhã" };
  const ids = provas.map((p: { id: string }) => `"${encodeURIComponent(p.id)}"`).join(",");
  const pres = await db(`presencas?prova_id=in.(${ids})&estado=in.(inscrito,vou)&select=grupo,membro_id,prova_id,estado,percurso`);
  let enviadas = 0;
  for (const x of pres || []) {
    if (!(await primeiraVez(`lemb:${x.grupo}:${x.membro_id}:${x.prova_id}`))) continue;
    const subs = await db(`subscricoes?grupo=eq.${x.grupo}&membro_id=eq.${x.membro_id}&select=endpoint,p256dh,auth`);
    if (!subs || !subs.length) continue;
    const p = provas.find((q: { id: string }) => q.id === x.prova_id);
    const outros = await db(`presencas?grupo=eq.${x.grupo}&prova_id=eq.${encodeURIComponent(x.prova_id)}&estado=in.(inscrito,vou)&membro_id=neq.${x.membro_id}&select=membro_id`);
    const n = (outros || []).length;
    const payload = JSON.stringify({
      title: `Amanhã: ${p?.nome || "prova"}`,
      body: (x.estado === "vou" ? "Ainda não marcaste a inscrição. " : "") + (x.percurso ? `${x.percurso}. ` : "") + (n ? `Vão mais ${n} do grupo. ` : "") + "Confirma o material e o abastecimento. Boa prova!",
      url: `./?g=${x.grupo}#p=${encodeURIComponent(x.prova_id)}`, tag: `lemb-${x.prova_id}`,
    });
    enviadas += await enviar(subs, payload);
  }
  return { enviadas, provas: provas.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const k = await chaves();
    if (req.method === "GET") return json({ publicKey: k.public_key });
    if (req.method !== "POST") return json({ erro: "método" }, 405);
    webpush.setVapidDetails("https://possn.github.io/Dorsal/", k.public_key, k.private_key);
    const body = await req.json().catch(() => ({}));
    const tipo = body.tipo || (body.comentario_id ? "comentario" : "");
    if (tipo === "lembretes") return json(await lembretes());
    const grupo = (req.headers.get("x-grupo") || "").toLowerCase();
    if (!/^[a-z0-9]{6,40}$/.test(grupo)) return json({ erro: "pedido inválido" }, 400);
    if (tipo === "comentario" && Number.isInteger(body.comentario_id)) return json(await comentario(grupo, body.comentario_id));
    if (tipo === "presenca") return json(await presenca(grupo, String(body.prova_id || ""), String(body.membro_id || "")));
    return json({ erro: "pedido inválido" }, 400);
  } catch (e) {
    console.error(e);
    return json({ erro: "falha interna" }, 500);
  }
});
