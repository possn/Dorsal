#!/usr/bin/env python3
"""Dorsal: recolha semanal de provas de trail em Portugal.

Fontes: gotrail.run (calendário de Portugal), Trilho Perdido (eventos), Portugal Running (páginas de eventos).
Lê as provas públicas já existentes na base de dados (só leitura, chave anónima) e produz recolha/provas.json com:
  novas      -> provas que ainda não existem
  completar  -> provas existentes com campos vazios que as fontes preenchem
A importação é feita do lado do Supabase (pg_cron + pg_net), que vai buscar este ficheiro ao GitHub.
Só biblioteca padrão. Respeita robots.txt das fontes e espera entre pedidos.
"""
import datetime as dt
import html
import json
import os
import re
import sys
import time
import unicodedata
import urllib.request
import urllib.error
import urllib.robotparser
from urllib.parse import urljoin, urlparse

UA = "Mozilla/5.0 (compatible; DorsalBot/1.0; +https://possn.github.io/Dorsal/)"
HOJE = dt.date.today()
LIMITE = HOJE + dt.timedelta(days=400)
SUPA = os.environ.get("SUPABASE_URL", "https://gubjzbirpkwrxoreqvfm.supabase.co")
ANON = os.environ.get("SUPABASE_ANON_KEY", "")
DISTRITOS = ["Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", "Évora", "Faro", "Guarda", "Leiria", "Lisboa",
             "Portalegre", "Porto", "Santarém", "Setúbal", "Viana do Castelo", "Vila Real", "Viseu", "Açores", "Madeira"]
ORDEM = ["Caminhada", "Trail kids", "Trail curto", "Trail longo", "Trail ultra", "Skyrunning", "Backyard"]
LOG = []


def log(*a):
    s = " ".join(str(x) for x in a)
    LOG.append(s)
    print(s, flush=True)


def norm(s):
    s = unicodedata.normalize("NFD", str(s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s)).strip()


def slug(s):
    return re.sub(r"-+", "-", norm(s).replace(" ", "-")).strip("-")[:60] or "prova"


_robots = {}


def pode(url):
    base = "{0.scheme}://{0.netloc}".format(urlparse(url))
    if base not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        try:
            req = urllib.request.Request(base + "/robots.txt", headers={"User-Agent": UA})
            rp.parse(urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore").splitlines())
        except Exception:
            rp = None
        _robots[base] = rp
    rp = _robots[base]
    return True if rp is None else rp.can_fetch("DorsalBot", url)


_ultimo = {}


def get(url, espera=1.2):
    if not pode(url):
        log("robots.txt não deixa:", url)
        return None
    host = urlparse(url).netloc
    dt_ = time.time() - _ultimo.get(host, 0)
    if dt_ < espera:
        time.sleep(espera - dt_)
    for tentativa in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "pt-PT,pt;q=0.9"})
            with urllib.request.urlopen(req, timeout=25) as r:
                _ultimo[host] = time.time()
                return r.read().decode("utf-8", "ignore")
        except urllib.error.HTTPError as e:
            _ultimo[host] = time.time()
            if e.code in (404, 410):
                return None
            time.sleep(2 * (tentativa + 1))
        except Exception:
            if tentativa >= 1:
                break
            time.sleep(2)
    log("falhou:", url)
    return None


def ld_json(s):
    out = []
    for b in re.findall(r"<script[^>]*application/ld\+json[^>]*>(.*?)</script>", s, re.S):
        try:
            j = json.loads(b)
        except Exception:
            continue
        stack = j if isinstance(j, list) else [j]
        while stack:
            x = stack.pop()
            if isinstance(x, dict):
                if "@graph" in x:
                    stack.extend(x["@graph"])
                out.append(x)
            elif isinstance(x, list):
                stack.extend(x)
    return out


def distrito_de(txt):
    t = norm(txt)
    t = t.replace("distrito de ", "").replace("distrito da ", "").replace("distrito do ", "")
    if "azores" in t or "acores" in t:
        return "Açores"
    for d in DISTRITOS:
        if norm(d) and re.search(r"\b" + norm(d) + r"\b", t):
            return d
    return ""


_LUG = None


def lugares():
    global _LUG
    if _LUG is None:
        _LUG = {}
        try:
            s = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lugares.js"), encoding="utf-8").read()
            j = json.loads(s[s.index("{"):s.rindex("}") + 1])
            for lista in (j.get("l", []), j.get("c", [])):  # concelhos por cima das localidades
                for x in lista:
                    _LUG[norm(x[0]).replace(" ", "")] = x[1]
                    if len(x) > 4:
                        _LUG[norm(x[4]).replace(" ", "")] = x[1]
        except Exception as e:
            log("lugares.js:", repr(e))
    return _LUG


def distrito_por_local(*txts):
    L = lugares()
    for t in txts:
        if not t:
            continue
        cands = re.findall(r"\(([^)]+)\)", t) + [t.split("(")[0], t.split(",")[0]]
        for c in cands:
            k = norm(re.sub(r"(?i)concelho d[aeo]s? ", "", c)).replace(" ", "")
            if k in L:
                return L[k]
    return ""


def categorias(kms, texto=""):
    """kms: lista de distâncias em km; texto: rótulos/descrições."""
    c = set()
    t = norm(texto)
    for k in kms:
        if k <= 0:
            continue
        if k <= 25.5:
            c.add("Trail curto")
        elif k <= 42.5:
            c.add("Trail longo")
        else:
            c.add("Trail ultra")
    if "caminhada" in t or "walk" in t:
        c.add("Caminhada")
    if "kids" in t or "infantil" in t or "jovem" in t:
        c.add("Trail kids")
    if "backyard" in t:
        c.add("Backyard")
    if "sky" in t:
        c.add("Skyrunning")
    for rot, cat in (("trail curto", "Trail curto"), ("trail longo", "Trail longo"), ("trail ultra", "Trail ultra"), ("ultra trail", "Trail ultra"), ("mini trail", "Trail curto")):
        if rot in t:
            c.add(cat)
    return ", ".join(x for x in ORDEM if x in c)


def kms_de(textos):
    ks = []
    for t in textos:
        tn = norm(t)
        if "meia maratona" in tn or "half marathon" in tn:
            ks.append(21.1)
            continue
        if re.search(r"\bmaratona\b|\bmarathon\b", tn):
            ks.append(42.2)
            continue
        for m in re.finditer(r"(\d+(?:[.,]\d+)?)\s*(?:km|k)\b", t, re.I):
            ks.append(float(m.group(1).replace(",", ".")))
    return ks


# ---------------- gotrail.run ----------------
def gotrail():
    provas = {}
    for pag in range(1, 30):
        url = "https://gotrail.run/calendario-trail-running/portugal" + ("" if pag == 1 else f"?page={pag}")
        s = get(url, 1.5)
        if not s:
            break
        ld = {}
        for x in ld_json(s):
            if x.get("@type") == "ItemList":
                for el in x.get("itemListElement", []):
                    it = el.get("item", el)
                    if it.get("url"):
                        ld[it["url"]] = it
        novos = 0
        for m in re.finditer(r'wire:key="event:\d+"', s):
            seg = s[m.start():m.start() + 8000]
            j = seg.find('wire:key="event:', 20)
            seg = seg[: j if j > 0 else 8000]
            u = re.search(r'href="(https://gotrail\.run/pt/event/[^"]+)"', seg)
            if not u:
                continue
            u = u.group(1)
            if u in provas:
                continue
            rot = re.findall(r'class="label-([a-z-]+)[^"]*"[^>]*>\s*([^<]+?)\s*<', seg)
            tipos = {r[0] for r in rot}
            if not tipos & {"trailrun", "skyrunning", "backyard", "backyardultra", "ultra"} :
                continue  # trail urbano, estrada, OCR, canicross...
            it = ld.get(u, {})
            nm = norm(it.get("name", ""))
            if re.search(r"canicross|corta mato|\bcross\b|\bocr\b|obstacul", nm) and not re.search(r"\btrail\b", nm):
                continue
            ini = it.get("startDate", "")
            try:
                d = dt.date.fromisoformat(ini[:10])
            except Exception:
                continue
            addr = (it.get("location") or {}).get("address") or {}
            dists = [r[1] for r in rot if r[0] == "distance"]
            rotulos = " ".join(r[1] for r in rot) + " " + str(it.get("description", ""))
            provas[u] = {
                "nome": html.unescape(it.get("name", "")).strip(),
                "data": d.isoformat(),
                "concelho": addr.get("addressLocality", ""),
                "distrito": distrito_de(addr.get("addressRegion", "")),
                "distancias": categorias(kms_de(dists), rotulos),
                "info": u,
                "inscricao": "",
                "fonte": "gotrail.run",
            }
            novos += 1
        log(f"gotrail página {pag}: {novos} provas de trail")
        if novos == 0 and not ld:
            break
    return list(provas.values())


# ---------------- Trilho Perdido ----------------
MESES = {"janeiro": 1, "fevereiro": 2, "marco": 3, "abril": 4, "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12}


def trilhoperdido():
    base = "https://www.trilhoperdido.com"
    s = get(base + "/eventos")
    if not s:
        return []
    links = sorted(set(re.findall(r'href="(/evento/[^"#?]+)"', s)))
    out = []
    for l in links:
        p = get(base + l, 1.5)
        if not p:
            continue
        txt = re.sub(r"<script.*?</script>|<style.*?</style>", "", p, flags=re.S)
        linhas = [html.unescape(x).strip() for x in re.sub(r"<[^>]+>", "\n", txt).split("\n")]
        linhas = [x for x in linhas if x]
        titulo = html.unescape((re.findall(r"<title>(.*?)</title>", p) or [""])[0]).replace("Trilho Perdido - ", "").strip()
        data = None
        local = ""
        for i, x in enumerate(linhas):
            if x.rstrip(":") == "Data" and i + 1 < len(linhas):
                m = re.search(r"(\d{1,2})\s+de\s+([A-Za-zçÇ]+)\s+de\s+(\d{4})", linhas[i + 1])
                if m and norm(m.group(2)) in MESES:
                    data = dt.date(int(m.group(3)), MESES[norm(m.group(2))], int(m.group(1)))
            if x.rstrip(":") == "Localidade" and i + 1 < len(linhas):
                local = linhas[i + 1]
        if not data or len(norm(titulo)) < 4:
            continue
        corpo = " ".join(linhas)
        if not re.search(r"\btrail\b|\btrilho|\bultra\b|\bsky", norm(titulo)) and not re.search(r"trail (curto|longo|ultra)|mini trail", norm(corpo)):
            continue
        if re.search(r"silvestre|\bbtt\b|ciclismo|estrada", norm(titulo)) and not re.search(r"\btrail\b", norm(titulo)):
            continue
        conc = local
        m = re.search(r"\(concelho d[aeo]s? ([^)]+)\)", local, re.I)
        if m:
            conc = local.split("(")[0].strip() + " (" + m.group(1).strip() + ")"
        dist_txt = [x for x in linhas if re.search(r"\d+\s*km", x, re.I) and re.search(r"trail|caminhada|mini", x, re.I)]
        insc = re.search(r'href="([^"]*(?:inscri|registo|formulario)[^"]*)"', p, re.I)
        out.append({
            "nome": re.sub(r"\s+20\d\d$", "", titulo).strip() or titulo,
            "data": data.isoformat(),
            "concelho": conc[:80],
            "distrito": "",
            "distancias": categorias(kms_de(dist_txt), " ".join(dist_txt) + " " + corpo[:3000]),
            "info": base + l,
            "inscricao": urljoin(base, insc.group(1)) if insc else base + l,
            "fonte": "trilhoperdido.com",
        })
    log(f"Trilho Perdido: {len(out)} provas de trail em {len(links)} eventos")
    return out


# ---------------- Portugal Running ----------------
def portugalrunning(cache):
    sm = get("https://www.portugalrunning.com/ajde_events-sitemap.xml")
    if not sm:
        return []
    urls = re.findall(r"<url>\s*<loc>([^<]+)</loc>\s*(?:<lastmod>([^<]+)</lastmod>)?", sm)
    log(f"Portugal Running: {len(urls)} eventos no sitemap")
    out, novos, t0 = [], 0, time.time()
    # mais recentes primeiro; orçamento de tempo para não esgotar o processo
    urls.sort(key=lambda x: x[1] or "", reverse=True)
    for u, lm in urls:
        lm = (lm or "")[:10]
        if lm and lm < (HOJE - dt.timedelta(days=500)).isoformat():
            continue
        c = cache.get(u)
        if c and c.get("lm") == lm:
            reg = c.get("reg")
        else:
            if novos >= 250 or time.time() - t0 > 14 * 60:
                continue
            p = get(u, 0.8)
            novos += 1
            if novos % 50 == 0:
                log(f"Portugal Running: {novos} páginas lidas ({int(time.time() - t0)} s)")
            reg = None
            if p:
                ev = [x for x in ld_json(p) if x.get("@type") in ("SportsEvent", "Event")]
                if ev:
                    e = ev[0]
                    tipos = re.findall(r'data-filter="event_type" data-v="([^"]+)"', p)
                    m = re.search(r'data-location_name="([^"]*)"', p)
                    locn = html.unescape(m.group(1)) if m else ""
                    if not locn and isinstance(e.get("location"), dict):
                        ad = e["location"].get("address") or {}
                        locn = ", ".join(x for x in (ad.get("addressLocality", ""), ad.get("addressRegion", "")) if x) if isinstance(ad, dict) else ""
                    ofertas = " ".join(str(o.get("name", "")) for o in (e.get("offers") or []) if isinstance(o, dict))
                    hora = ""
                    m = re.search(r"T(\d{2}:\d{2})", str(e.get("startDate", "")))
                    if m and m.group(1) != "00:00":
                        hora = m.group(1)
                    site = ""
                    org = e.get("url") or ""
                    if org and "portugalrunning.com" not in org:
                        site = org
                    reg = {"nome": html.unescape(e.get("name", "")).strip(), "data": str(e.get("startDate", ""))[:10], "local": locn,
                           "tipos": tipos, "hora": hora, "site": site, "texto": (ofertas + " " + html.unescape(str(e.get("description", ""))))[:1500]}
            cache[u] = {"lm": lm, "reg": reg}
        if not reg:
            continue
        try:
            d = dt.date.fromisoformat(reg["data"])
        except Exception:
            continue
        if d < HOJE or d > LIMITE:
            continue
        tl = [norm(t) for t in reg.get("tipos", [])]
        tipos = " ".join(reg.get("tipos", []))
        # só provas que o próprio site classifica como Trail (ou Skyrunning/Ultra)
        if not any(t.startswith("trail") or t.startswith("sky") or t.startswith("ultra") or t == "backyard" for t in tl):
            continue
        cats = set()
        for t in tl:
            for rot, cat in (("caminhada", "Caminhada"), ("trail kids", "Trail kids"), ("trail jovem", "Trail kids"), ("trail curto", "Trail curto"),
                             ("trail longo", "Trail longo"), ("trail ultra", "Trail ultra"), ("sky", "Skyrunning"), ("backyard", "Backyard")):
                if t.startswith(rot):
                    cats.add(cat)
        partes = [x.strip() for x in reg["local"].split(",")]
        out.append({
            "nome": re.sub(r"\s+20\d\d$", "", reg["nome"]).strip(),
            "data": d.isoformat(),
            "concelho": partes[0] if partes else "",
            "distrito": distrito_de(partes[-1] if len(partes) > 1 else reg["local"]),
            "distancias": ", ".join(x for x in ORDEM if x in cats) if (cats - {"Caminhada"}) else categorias(kms_de([reg.get("texto", "")]), tipos),
            "hora": reg.get("hora", ""),
            "info": u,
            "inscricao": reg.get("site", ""),
            "fonte": "portugalrunning.com",
        })
    log(f"Portugal Running: {len(out)} provas futuras de trail ({novos} páginas lidas nesta corrida)")
    return out


# ---------------- juntar, comparar e escrever ----------------
PALAVRAS_VAZIAS = set("trail trails trilho trilhos run running de da do das dos e the ultra edicao ed by caminhada corrida".split())


def chave_nome(n):
    t = [w for w in norm(n).split() if w not in PALAVRAS_VAZIAS and not re.fullmatch(r"\d+|[ivxlc]+|\d+o|\d+a|20\d\d", w)]
    # plural/singular: "solidarios" = "solidario", "trilhos" = "trilho"
    return {w[:-1] if len(w) > 4 and w.endswith("s") else w for w in t}


def parecidas(a, b):
    try:
        da, db = dt.date.fromisoformat(a["data"]), dt.date.fromisoformat(b["data"])
    except Exception:
        return False
    if abs((da - db).days) > 1:
        return False
    ka, kb = chave_nome(a["nome"]), chave_nome(b["nome"])
    if not ka or not kb:
        return norm(a["nome"]) == norm(b["nome"])
    inter = len(ka & kb)
    return inter / min(len(ka), len(kb)) >= 0.6 or (inter >= 1 and norm(a.get("concelho", ""))[:6] == norm(b.get("concelho", ""))[:6] and norm(a.get("concelho", "")) != "")


def juntar(lista):
    final = []
    for p in lista:
        for q in final:
            if parecidas(p, q):
                for k in ("distancias", "distrito", "concelho", "info", "inscricao", "hora"):
                    if not q.get(k) and p.get(k):
                        q[k] = p[k]
                if p.get("distancias") and len(p["distancias"]) > len(q.get("distancias", "")):
                    q["distancias"] = p["distancias"]
                q["fonte"] = ", ".join(sorted(set((q["fonte"] + ", " + p["fonte"]).split(", "))))
                break
        else:
            final.append(dict(p))
    return final


def existentes():
    if not ANON:
        return []
    url = f"{SUPA}/rest/v1/provas?select=id,nome,data,concelho,distrito,distancias,info,inscricao,hora&grupo=is.null&data=gte.{HOJE.isoformat()}"
    req = urllib.request.Request(url, headers={"apikey": ANON, "Authorization": "Bearer " + ANON})
    return json.loads(urllib.request.urlopen(req, timeout=40).read().decode())


def main():
    os.makedirs("recolha", exist_ok=True)
    cache_f = "recolha/cache_portugalrunning.json"
    try:
        cache = json.load(open(cache_f))
    except Exception:
        cache = {}
    todas = []
    for nome, fn in (("gotrail", gotrail), ("trilhoperdido", trilhoperdido), ("portugalrunning", lambda: portugalrunning(cache))):
        try:
            r = fn()
            todas += r
        except Exception as e:
            log("erro na fonte", nome, repr(e))
    json.dump(cache, open(cache_f, "w"), ensure_ascii=False)
    todas = [p for p in todas if p.get("nome") and HOJE.isoformat() <= p["data"] <= LIMITE.isoformat()]
    todas = [p for p in todas if not re.search(r"canicross|chamonix|mont blanc|espanha|spain|galiza|galicia", norm(p["nome"] + " " + p.get("concelho", "")))]
    for p in todas:
        if not p.get("distrito"):
            p["distrito"] = distrito_por_local(p.get("concelho", ""))
    # fora de Portugal: sem distrito conhecido e vindo só do Portugal Running (que também lista provas no estrangeiro)
    todas = [p for p in todas if p.get("distrito") or p["fonte"] != "portugalrunning.com"]
    juntas = juntar(todas)
    ex = existentes()
    novas, completar = [], []
    ids = {e["id"] for e in ex}
    for p in juntas:
        alvo = next((e for e in ex if parecidas(p, e)), None)
        if alvo:
            campos = {k: p.get(k, "") for k in ("distancias", "distrito", "concelho", "info", "inscricao", "hora")
                      if p.get(k) and not (alvo.get(k) or "")}
            if campos:
                completar.append({"id": alvo["id"], **campos})
            continue
        pid = slug(p["nome"]) + "-" + p["data"]
        if pid in ids:
            continue
        ids.add(pid)
        novas.append({"id": pid, "nome": p["nome"][:120], "data": p["data"], "concelho": p.get("concelho", "")[:80], "distrito": p.get("distrito", ""),
                      "distancias": p.get("distancias", ""), "hora": p.get("hora", ""), "info": p.get("info", ""), "inscricao": p.get("inscricao", ""),
                      "fonte": p.get("fonte", "")[:120], "nota": "" if p.get("distrito") else "local a confirmar"})
    res = {"gerado_em": dt.datetime.utcnow().isoformat(timespec="seconds") + "Z", "recolhidas": len(todas), "unicas": len(juntas),
           "existentes": len(ex), "novas": novas, "completar": completar, "registo": LOG[-60:]}
    json.dump(res, open("recolha/provas.json", "w"), ensure_ascii=False, indent=1)
    log(f"RESUMO: {len(todas)} recolhidas, {len(juntas)} únicas, {len(novas)} novas, {len(completar)} para completar")
    resumo = os.environ.get("GITHUB_STEP_SUMMARY")
    if resumo:
        with open(resumo, "a") as f:
            f.write(f"### Recolha de provas\n\n- Recolhidas: {len(todas)}\n- Únicas: {len(juntas)}\n- Novas: {len(novas)}\n- A completar: {len(completar)}\n\n")
            for n in novas[:80]:
                f.write(f"- {n['data']} · {n['nome']} · {n['concelho']} {n['distrito']} · {n['distancias']}\n")


if __name__ == "__main__":
    main()
