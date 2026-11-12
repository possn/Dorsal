// Dorsal: leitura de ficheiros GPX, cálculo de distância/desnível/tempo, compressão do trilho e perfil de altitude.
(function () {
  "use strict";
  const R = 6371008.8;
  const rad = x => x * Math.PI / 180;
  function dist(a, b) {
    const dLa = rad(b[0] - a[0]), dLo = rad(b[1] - a[1]);
    const s = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  const filhos = (el, nome) => el.getElementsByTagName(nome);

  // Lê o texto de um GPX e devolve os pontos e as estatísticas.
  function ler(texto) {
    const doc = new DOMParser().parseFromString(texto, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("O ficheiro não é um GPX válido.");
    let nos = [...filhos(doc, "trkpt")];
    if (!nos.length) nos = [...filhos(doc, "rtept")];
    if (nos.length < 2) throw new Error("O GPX não tem pontos de trilho suficientes.");
    const pts = [];
    for (const n of nos) {
      const la = parseFloat(n.getAttribute("lat")), lo = parseFloat(n.getAttribute("lon"));
      if (!isFinite(la) || !isFinite(lo)) continue;
      const e = filhos(n, "ele")[0], t = filhos(n, "time")[0];
      pts.push({ la, lo, e: e ? parseFloat(e.textContent) : NaN, t: t ? Date.parse(t.textContent) : NaN });
    }
    if (pts.length < 2) throw new Error("O GPX não tem coordenadas válidas.");
    const nomeEl = filhos(doc, "trk")[0] && filhos(filhos(doc, "trk")[0], "name")[0];
    const metaT = filhos(doc, "metadata")[0] && filhos(filhos(doc, "metadata")[0], "time")[0];

    // distância acumulada
    let d = 0; const acum = [0];
    for (let i = 1; i < pts.length; i++) { d += dist([pts[i - 1].la, pts[i - 1].lo], [pts[i].la, pts[i].lo]); acum.push(d); }

    // desnível: média móvel de 5 pontos e histerese de 3 m, para não somar o ruído do GPS
    const temEle = pts.filter(p => isFinite(p.e)).length > pts.length * 0.8;
    let sobe = 0, desce = 0; const eleS = [];
    if (temEle) {
      const e = pts.map(p => p.e);
      for (let i = 0; i < e.length; i++) {
        let s = 0, n = 0;
        for (let j = Math.max(0, i - 2); j <= Math.min(e.length - 1, i + 2); j++) if (isFinite(e[j])) { s += e[j]; n++; }
        eleS.push(n ? s / n : NaN);
      }
      let ref = eleS.find(isFinite);
      for (const v of eleS) {
        if (!isFinite(v)) continue;
        if (v - ref >= 3) { sobe += v - ref; ref = v; } else if (ref - v >= 3) { desce += ref - v; ref = v; }
      }
    }

    // tempo total
    const tIni = pts.find(p => isFinite(p.t)), tFim = [...pts].reverse().find(p => isFinite(p.t));
    const duracao = tIni && tFim && tFim.t > tIni.t ? Math.round((tFim.t - tIni.t) / 1000) : null;
    const inicio = tIni ? new Date(tIni.t) : (metaT ? new Date(metaT.textContent) : null);

    // amostra para guardar (no máximo ~1500 pontos)
    const passo = Math.max(1, Math.ceil(pts.length / 1500));
    const amostra = [];
    for (let i = 0; i < pts.length; i += passo) amostra.push(i);
    if (amostra[amostra.length - 1] !== pts.length - 1) amostra.push(pts.length - 1);

    return {
      nome: nomeEl ? nomeEl.textContent.trim().slice(0, 120) : "",
      inicio, duracao_s: duracao,
      km: Math.round(d / 10) / 100,
      dplus: Math.round(sobe), dminus: Math.round(desce),
      pontos: codificar(amostra.map(i => [pts[i].la, pts[i].lo])),
      elev: temEle ? amostra.map(i => Math.round(eleS[i])).join(",") : "",
      n: pts.length
    };
  }

  // Polyline do Google (precisão 5)
  function codificar(coords) {
    let out = "", pla = 0, plo = 0;
    const enc = v => { v = v < 0 ? ~(v << 1) : v << 1; let s = ""; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); };
    for (const [la, lo] of coords) { const a = Math.round(la * 1e5), b = Math.round(lo * 1e5); out += enc(a - pla) + enc(b - plo); pla = a; plo = b; }
    return out;
  }
  function descodificar(str) {
    const out = []; let i = 0, la = 0, lo = 0;
    const dec = () => { let r = 0, s = 0, b; do { b = str.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20); return r & 1 ? ~(r >> 1) : r >> 1; };
    while (i < str.length) { la += dec(); lo += dec(); out.push([la / 1e5, lo / 1e5]); }
    return out;
  }

  // Perfil de altitude em SVG; series = [{coords, elev, cor}]
  function perfilSVG(series) {
    const W = 600, H = 210, P = { l: 66, r: 12, t: 14, b: 34 };
    const dados = series.map(s => {
      const el = s.elev ? s.elev.split(",").map(Number) : [];
      if (el.length !== s.coords.length || el.length < 2) return null;
      let d = 0; const x = [0];
      for (let i = 1; i < s.coords.length; i++) { d += dist(s.coords[i - 1], s.coords[i]); x.push(d / 1000); }
      return { x, el, cor: s.cor };
    }).filter(Boolean);
    if (!dados.length) return null;
    const maxX = Math.max(...dados.map(s => s.x[s.x.length - 1]));
    const minE = Math.min(...dados.flatMap(s => s.el)), maxE = Math.max(...dados.flatMap(s => s.el));
    const yE = v => P.t + (H - P.t - P.b) * (1 - (v - minE) / Math.max(1, maxE - minE));
    const xK = v => P.l + (W - P.l - P.r) * v / Math.max(0.01, maxX);
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "perfil"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Perfil de altitude: de ${Math.round(minE)} a ${Math.round(maxE)} metros ao longo de ${maxX.toFixed(1)} km`);
    const add = (tag, attrs, txt) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; };
    for (const v of [minE, (minE + maxE) / 2, maxE]) {
      add("line", { x1: P.l, x2: W - P.r, y1: yE(v), y2: yE(v), class: "grade" });
      add("text", { x: P.l - 8, y: yE(v) + 7, "text-anchor": "end", class: "eixo" }, Math.round(v) + " m");
    }
    const passoK = maxX > 60 ? 20 : maxX > 25 ? 10 : maxX > 10 ? 5 : 1;
    for (let k = 0; k <= maxX + 0.001; k += passoK) add("text", { x: xK(k), y: H - 8, "text-anchor": "middle", class: "eixo" }, k + " km");
    dados.forEach((s, j) => {
      const linha = s.x.map((xx, i) => `${i ? "L" : "M"}${xK(xx).toFixed(1)},${yE(s.el[i]).toFixed(1)}`).join("");
      if (dados.length === 1) add("path", { d: `${linha}L${xK(s.x[s.x.length - 1]).toFixed(1)},${H - P.b}L${xK(0)},${H - P.b}Z`, class: "area" });
      add("path", { d: linha, class: "linha", stroke: s.cor || "currentColor" });
    });
    return svg;
  }

  window.DorsalGPX = { ler, codificar, descodificar, perfilSVG, dist };
})();
