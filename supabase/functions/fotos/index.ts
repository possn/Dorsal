// Dorsal: fotos das provas.
// POST   { membro_id, prova_id, imagem (JPEG em base64), largura, altura }  (cabeçalho x-grupo) -> guarda no bucket "fotos"
// DELETE { id, membro_id }                                                   (cabeçalho x-grupo) -> apaga a foto (só a própria)
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
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const H = { apikey: SK, Authorization: `Bearer ${SK}` };
async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...H, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`db ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}
const MAX_MEMBRO_PROVA = 6, MAX_GRUPO = 3000, MAX_BYTES = 450000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const grupo = (req.headers.get("x-grupo") || "").toLowerCase();
    if (!/^[a-z0-9]{6,40}$/.test(grupo)) return json({ erro: "pedido inválido" }, 400);
    const body = await req.json().catch(() => ({}));
    const membro = String(body.membro_id || "");
    if (!UUID.test(membro)) return json({ erro: "pedido inválido" }, 400);
    const m = await db(`membros?id=eq.${membro}&grupo=eq.${grupo}&select=id`);
    if (!m || !m.length) return json({ erro: "membro desconhecido" }, 403);

    if (req.method === "DELETE") {
      const id = String(body.id || "");
      if (!UUID.test(id)) return json({ erro: "pedido inválido" }, 400);
      const f = (await db(`fotos?id=eq.${id}&grupo=eq.${grupo}&membro_id=eq.${membro}&select=caminho`))?.[0];
      if (!f) return json({ erro: "não encontrada" }, 404);
      await fetch(`${URL_BASE}/storage/v1/object/fotos/${f.caminho}`, { method: "DELETE", headers: H });
      await db(`fotos?id=eq.${id}`, { method: "DELETE" });
      return json({ ok: true });
    }
    if (req.method !== "POST") return json({ erro: "método" }, 405);

    const prova = String(body.prova_id || "");
    if (!prova || prova.length > 120) return json({ erro: "pedido inválido" }, 400);
    const pv = await db(`provas?id=eq.${encodeURIComponent(prova)}&or=(grupo.is.null,grupo.eq.${grupo})&select=id`);
    if (!pv || !pv.length) return json({ erro: "prova desconhecida" }, 404);
    const b64 = String(body.imagem || "").replace(/^data:image\/jpeg;base64,/, "");
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); } catch { return json({ erro: "imagem inválida" }, 400); }
    if (bytes.length < 1000 || bytes.length > MAX_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8) return json({ erro: "imagem inválida ou demasiado grande" }, 400);
    const [doMembro, doGrupo] = await Promise.all([
      fetch(`${URL_BASE}/rest/v1/fotos?grupo=eq.${grupo}&prova_id=eq.${encodeURIComponent(prova)}&membro_id=eq.${membro}&select=id`, { headers: { ...H, Prefer: "count=exact", Range: "0-0" } }),
      fetch(`${URL_BASE}/rest/v1/fotos?grupo=eq.${grupo}&select=id`, { headers: { ...H, Prefer: "count=exact", Range: "0-0" } })]);
    const total = (r: Response) => Number((r.headers.get("content-range") || "*/0").split("/")[1]) || 0;
    if (total(doMembro) >= MAX_MEMBRO_PROVA) return json({ erro: `Máximo de ${MAX_MEMBRO_PROVA} fotos por prova.` }, 409);
    if (total(doGrupo) >= MAX_GRUPO) return json({ erro: "O grupo chegou ao limite de fotos." }, 409);
    const caminho = `${grupo}/${crypto.randomUUID()}.jpg`;
    const up = await fetch(`${URL_BASE}/storage/v1/object/fotos/${caminho}`, { method: "POST", headers: { ...H, "Content-Type": "image/jpeg", "cache-control": "31536000" }, body: bytes });
    if (!up.ok) { console.error("upload", up.status, await up.text()); return json({ erro: "falha a guardar" }, 500); }
    const largura = Math.min(10000, Math.max(0, Math.round(Number(body.largura) || 0))) || null, altura = Math.min(10000, Math.max(0, Math.round(Number(body.altura) || 0))) || null;
    const r = await db("fotos", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ grupo, prova_id: prova, membro_id: membro, caminho, largura, altura }) });
    return json({ ok: true, foto: r?.[0] || null });
  } catch (e) {
    console.error(e);
    return json({ erro: "falha interna" }, 500);
  }
});
