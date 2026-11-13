// Dorsal: calendário pessoal subscrevível (ICS).
// GET ?m=<id do membro>  -> provas em que o membro está marcado (inscrito, vou, talvez) e treinos do grupo, de há 30 dias em diante.
// Público de propósito (os calendários não enviam cabeçalhos); o id do membro é aleatório e só o grupo o conhece.
const URL_BASE = Deno.env.get("SUPABASE_URL")!;
function chaveServico(): string {
  const legado = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legado) return legado;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; } catch { return ""; }
}
const SK = chaveServico();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function db(path: string) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { apikey: SK, Authorization: `Bearer ${SK}` } });
  if (!r.ok) throw new Error(`db ${r.status}`);
  return r.json();
}
const esc = (s: string) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// dobra linhas a 75 octetos (RFC 5545)
function dobrar(l: string) {
  const out: string[] = []; let cur = "", n = 0;
  for (const ch of l) { const b = new TextEncoder().encode(ch).length; if (n + b > 73) { out.push(cur); cur = " " + ch; n = 1 + b; } else { cur += ch; n += b; } }
  out.push(cur); return out.join("\r\n");
}
const d8 = (s: string) => s.replace(/-/g, "");
function utc(data: string, hora: string) {
  // hora local de Lisboa -> UTC
  const [H, M] = hora.split(":").map(Number);
  const guess = new Date(`${data}T${hora}:00Z`);
  const lx = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));
  const off = lx.getTime() - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const t = new Date(Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10), H, M) - off);
  return t.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}
const EST: Record<string, string> = { inscrito: "Inscrito", vou: "Vou", talvez: "Talvez" };

Deno.serve(async (req) => {
  const u = new URL(req.url), m = (u.searchParams.get("m") || "").toLowerCase();
  if (!UUID.test(m)) return new Response("pedido inválido", { status: 400 });
  try {
    const mb = (await db(`membros?id=eq.${m}&select=nome,grupo`))[0];
    if (!mb) return new Response("não encontrado", { status: 404 });
    const g = (await db(`grupos?codigo=eq.${mb.grupo}&select=nome`))[0]?.nome || "Dorsal";
    const desde = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const pres = await db(`presencas?grupo=eq.${mb.grupo}&membro_id=eq.${m}&estado=in.(inscrito,vou,talvez)&select=prova_id,estado,percurso`);
    const ids = (pres || []).map((x: { prova_id: string }) => `"${encodeURIComponent(x.prova_id)}"`);
    const provas = ids.length ? await db(`provas?id=in.(${ids.join(",")})&data=gte.${desde}&select=id,nome,data,hora,concelho,distrito,nota,fonte,inscricao,info`) : [];
    const treinos = await db(`provas?grupo=eq.${mb.grupo}&fonte=eq.treino&data=gte.${desde}&select=id,nome,data,hora,concelho,distrito,nota,fonte,info`);
    const todas = new Map<string, Record<string, string>>();
    for (const p of [...(provas || []), ...(treinos || [])]) todas.set(p.id, p);
    const agora = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const base = "https://possn.github.io/Dorsal/";
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dorsal//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      `X-WR-CALNAME:${esc("Dorsal · " + g)}`, "X-WR-TIMEZONE:Europe/Lisbon", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H"];
    for (const p of todas.values()) {
      const pr = (pres || []).find((x: { prova_id: string }) => x.prova_id === p.id);
      const treino = p.fonte === "treino";
      const titulo = (treino ? "🏃 " : "🏔 ") + p.nome + (pr && pr.estado === "talvez" ? " (talvez)" : "");
      const local = [treino ? p.nota : "", p.concelho, p.distrito].filter(Boolean).join(", ");
      const desc = [pr ? `Estado: ${EST[pr.estado] || pr.estado}` : "Treino do grupo", pr?.percurso ? `Percurso: ${pr.percurso}` : "", p.inscricao ? `Inscrição: ${p.inscricao}` : "", p.info ? `Informação: ${p.info}` : "", `No Dorsal: ${base}#p=${encodeURIComponent(p.id)}`].filter(Boolean).join("\n");
      L.push("BEGIN:VEVENT", `UID:${p.id}@dorsal-${m.slice(0, 8)}`, `DTSTAMP:${agora}`);
      if (p.hora) {
        const ini = utc(p.data, p.hora), fimD = new Date(Date.UTC(+ini.slice(0, 4), +ini.slice(4, 6) - 1, +ini.slice(6, 8), +ini.slice(9, 11), +ini.slice(11, 13)) + (treino ? 2 : 4) * 3600e3);
        L.push(`DTSTART:${ini}`, `DTEND:${fimD.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`);
      } else {
        const f = new Date(p.data + "T12:00:00Z"); f.setUTCDate(f.getUTCDate() + 1);
        L.push(`DTSTART;VALUE=DATE:${d8(p.data)}`, `DTEND;VALUE=DATE:${f.toISOString().slice(0, 10).replace(/-/g, "")}`);
      }
      L.push(`SUMMARY:${esc(titulo)}`, `LOCATION:${esc(local)}`, `DESCRIPTION:${esc(desc)}`, `URL:${base}#p=${encodeURIComponent(p.id)}`);
      if (p.hora) L.push("BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", `DESCRIPTION:${esc(p.nome)}`, "END:VALARM");
      else L.push("BEGIN:VALARM", "TRIGGER:-PT12H", "ACTION:DISPLAY", `DESCRIPTION:${esc("Amanhã: " + p.nome)}`, "END:VALARM");
      L.push("END:VEVENT");
    }
    L.push("END:VCALENDAR");
    return new Response(L.map(dobrar).join("\r\n") + "\r\n", { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "public, max-age=1800", "Content-Disposition": "inline; filename=dorsal.ics" } });
  } catch (e) {
    console.error(e);
    return new Response("erro", { status: 500 });
  }
});
