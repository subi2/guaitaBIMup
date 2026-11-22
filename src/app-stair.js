/* ============================================================
   v22 · escales paramètriques (recta · L · U) lligades a nivells
   Model: p = peu del primer graó (eix), rot = direcció de pujada,
   w = amplada útil, g = estesa, n = contrapetges (auto o fix),
   n1 = contrapetges del primer tram, turn = gir (l/r), gap = ull.
   Geometria per trams: perfil serrat + llosa (gruix t) extruït
   en l'amplada; replans com a prismes. Comprovació CTE DB-SUA 1.
   ============================================================ */
const STAIR_CTE = {
  gen: { lab: 'Ús general', gMin: 0.28, rMin: 0.13, rMax: 0.185, wMin: 1.00, hMax: 2.25 },
  res: { lab: 'Ús restringit', gMin: 0.22, rMin: 0, rMax: 0.20, wMin: 0.80, hMax: 3.20 },
};
/* nombre de contrapetges i distribució en trams */
function stairCalc(model, par) {
  const z = parZ(model, par), H = Math.max(0.05, z.top - z.base);
  const n = par.nAuto !== false ? Math.max(2, Math.round(H / (OPT.stairR || 0.175))) : Math.max(2, par.n | 0), R = H / n;
  if (par.shape === 'I') {
    const counts = splitCounts(n, landCount(par, n, R), par, R);                             /* v26 · recta amb replans: trams de la mateixa direcció */
    return { z, H, n, R, n1: counts[0], n2: n - counts[0], counts, G: par.g, landH: counts[0] * R, landErr: par.hLand > 0 ? Math.abs(counts[0] * R - par.hLand) : 0 };
  }
  let n1;
  if (par.hLand > 0) n1 = Math.min(n - 1, Math.max(1, Math.round(par.hLand / R)));            /* v25 · replà fixat en metres: els graons del 1r tram se’n deriven */
  else n1 = par.n1Auto !== false ? Math.ceil(n / 2) : Math.min(n - 1, Math.max(1, par.n1 | 0));
  return { z, H, n, R, n1, n2: n - n1, counts: [n1, n - n1], G: par.g, landH: n1 * R, landErr: par.hLand > 0 ? Math.abs(n1 * R - par.hLand) : 0 };
}
/* v26 · replans d’una escala recta: 0 · automàtic (el límit de CTE per tram) · o un nombre fix */
function landCount(par, n, R) {
  if (par.hLand > 0 && !(par.lands | 0) && par.lands !== 'auto') return 1;   /* fixar l’alçada del replà implica un replà */
  if (par.lands === 'auto') { const hm = STAIR_CTE[par.use || 'gen'].hMax; return Math.max(0, Math.ceil(n * R / hm - 1e-9) - 1); }
  return Math.min(n - 2, Math.max(0, par.lands | 0));
}
/* reparteix els k graons en m+1 trams: el primer pot fixar-se en metres (hLand) o en graons (n1) quan només hi ha un replà */
function splitCounts(n, m, par, R) {
  if (m === 0) return [n];
  if (m === 1 && par.hLand > 0) { const k = Math.min(n - 1, Math.max(1, Math.round(par.hLand / R))); return [k, n - k]; }
  if (m === 1 && par.n1Auto === false && par.n1 > 0) { const k = Math.min(n - 1, Math.max(1, par.n1 | 0)); return [k, n - k]; }
  const parts = m + 1, base = Math.floor(n / parts), extra = n % parts;
  return Array.from({ length: parts }, (_, j) => base + (j < extra ? 1 : 0));
}
/* llargada del replà: per defecte, l’amplada útil */
function landingLen(par) { return par.lD > 0 ? par.lD : par.w; }
/* perfil d'un tram (k contrapetges, k−1 petjades) en coordenades (s, z); drop: el tram neix d'un replà i s'hi encasta; ext: el tram desemboca en un replà i s'hi encasta (sòlids solapats, no tangents, per a una unió neta) */
function flightProfile(k, R, G, t, z0, drop, ext) {
  const zb = z0 - (drop || 0), pr = [[0, zb]];
  for (let i = 0; i < k; i++) { pr.push([i * G, z0 + (i + 1) * R]); if (i < k - 1) pr.push([(i + 1) * G, z0 + (i + 1) * R]); }
  const se = (k - 1) * G, ze = z0 + k * R, c = G / Math.hypot(G, R), tc = t / c, s = R / G;
  if (k === 1) { pr.push([0.02, ze - Math.max(t, 0.05)]); pr.push([0.02, zb]); return pr.filter((q, i, a) => i === 0 || Math.abs(q[0] - a[i - 1][0]) > 1e-9 || Math.abs(q[1] - a[i - 1][1]) > 1e-9); }
  /* intradós paral·lel a la línia de gorges (vèrtexs interiors), a una distància t */
  if (ext) { pr.push([se + ext, ze]); pr.push([se + ext, ze - t]); }
  pr.push([se, Math.max(zb + 0.01, ze - R - tc)]);
  pr.push([Math.min(se - 0.01, Math.max(0.05, (tc - (drop || 0)) / s)), zb]);
  return pr;
}
/* extrusió d'un perfil (s, z) al llarg de l'amplada; O origen, u direcció del tram, v costat */
function extrudeProfile(pr, O, u, v, v0, v1) {
  let a2 = 0; for (let i = 0; i < pr.length; i++) { const a = pr[i], b = pr[(i + 1) % pr.length]; a2 += a[0] * b[1] - b[0] * a[1]; }
  const P = a2 < 0 ? pr.slice().reverse() : pr, W = (q, y) => [O[0] + u[0] * q[0] + v[0] * y, O[1] + u[1] * q[0] + v[1] * y, q[1]];
  const tri = THREE.ShapeUtils.triangulateShape(P.map(q => new THREE.Vector2(q[0], q[1])), []), out = [];
  /* (s, z, v) és una base dextrogira si u × v = +z; la cara a v0 mira cap a −v */
  for (const t of tri) { const [a, b, c] = t.map(i => P[i]); out.push(new BOOL.Poly([W(a, v0), W(b, v0), W(c, v0)], null)); out.push(new BOOL.Poly([W(a, v1), W(c, v1), W(b, v1)], null)); }
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; out.push(new BOOL.Poly([W(a, v0), W(a, v1), W(b, v1), W(b, v0)], null)); }
  const uz = u[0] * v[1] - u[1] * v[0]; if (uz < 0) for (const p of out) p.v.reverse();
  return out;
}
/* trams i replans en coordenades del pla */
function stairParts(model, par) {
  const C = stairCalc(model, par), a = (par.rot || 0) * Math.PI / 180, u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]], w = par.w, G = par.g, t = par.t;
  const P = (s, y) => [par.p[0] + u[0] * s + v[0] * y, par.p[1] + u[1] * s + v[1] * y], z0 = C.z.base, fl = [], ld = [];
  if (par.shape === 'I') {
    const cnt = C.counts, Lr = landingLen(par); let s = 0, z = z0;
    cnt.forEach((k, j) => {
      const last = j === cnt.length - 1;
      fl.push({ O: P(s, 0), u, v, k, z0: z, ext: last ? 0 : Math.min(w / 2, 0.3), drop: j ? t : 0 });
      if (!last) { const sl = s + k * G, zt = z + k * C.R; ld.push({ q: [P(sl, -w / 2), P(sl + Lr, -w / 2), P(sl + Lr, w / 2), P(sl, w / 2)], z: zt }); s = sl + Lr; z = zt; }
    });
    return { C, fl, ld, u, v };
  }
  fl.push({ O: P(0, 0), u, v, k: C.n1, z0, ext: Math.min(w / 2, 0.3) });
  const s1 = (C.n1 - 1) * G, zl = z0 + C.n1 * C.R;
  if (par.shape === 'L') {
    const sg = par.turn === 'r' ? -1 : 1, v2 = [v[0] * sg, v[1] * sg];
    ld.push({ q: [P(s1, -w / 2), P(s1 + w, -w / 2), P(s1 + w, w / 2), P(s1, w / 2)], z: zl });
    /* segon tram: puja cap al costat del gir, eix a s1 + w/2 */
    fl.push({ O: P(s1 + w / 2, sg * w / 2), u: v2, v: [-v2[1], v2[0]], k: C.n2, z0: zl, drop: t });
  } else if (par.shape === 'U') {
    const sg = par.turn === 'r' ? -1 : 1, off = w + (par.gap || 0), y0 = -w / 2, y1 = w / 2 + (par.gap || 0) + w;
    const yy = sg > 0 ? [y0, y1] : [-y1, -y0];
    ld.push({ q: [P(s1, yy[0]), P(s1 + w, yy[0]), P(s1 + w, yy[1]), P(s1, yy[1])], z: zl });
    fl.push({ O: P(s1, sg * off), u: [-u[0], -u[1]], v: [-v[0], -v[1]], k: C.n2, z0: zl, drop: t });
  }
  return { C, fl, ld, u, v };
}
function stairRegen(model, c, g, off) {
  const par = g.par, S0 = stairParts(model, par), C = S0.C, parts = [];
  for (const f of S0.fl) if (f.k >= 1) parts.push(extrudeProfile(flightProfile(f.k, C.R, par.g, par.t, f.z0, f.drop, f.ext), f.O, f.u, f.v, -par.w / 2, par.w / 2));
  for (const l of S0.ld) parts.push(prismPolys(l.q, l.z - par.t, l.z));
  let polys = [].concat(...parts);
  if (parts.length > 1) { try { let r = parts[0]; for (let i = 1; i < parts.length; i++) r = BOOL.union(r, parts[i]); if (r && r.length) polys = r; } catch (e) { /* es manté la geometria per peces */ } }
  const w = stairCheck(par, C); g.warn = [C.z.warn].concat(w).filter(Boolean).join(' · ') || null;
  const local = polys.map(q => new BOOL.Poly(q.v.map(p => [p[0] - off[0], p[1] - off[1], p[2] - off[2]]), q.mat));
  if (!local.length) { g.verts = new Map(); g.edges = new Map(); g.faces = new Map(); return; }
  const tmp = polysToGroup(local, c, g, g.name); g.verts = tmp.g.verts; g.edges = tmp.g.edges; g.faces = tmp.g.faces;
}
/* CTE DB-SUA 1 §4.2 (ús general) i §4.1 (ús restringit): avisos, no bloqueja */
function stairCheck(par, C) {
  const L = STAIR_CTE[par.use || 'gen'], o = [], mm = x => Math.round(x * 1000), R = C.R, G = par.g, b = 2 * R + G;
  if (R > L.rMax + 1e-6) o.push('Contrapetja ' + mm(R) + ' mm > ' + mm(L.rMax));
  if (L.rMin && R < L.rMin - 1e-6) o.push('Contrapetja ' + mm(R) + ' mm < ' + mm(L.rMin));
  if (G < L.gMin - 1e-6) o.push('Petjada ' + mm(G) + ' mm < ' + mm(L.gMin));
  if (par.use !== 'res' && (b < 0.54 - 1e-6 || b > 0.70 + 1e-6)) o.push('2C+H = ' + mm(b) + ' mm fora de 540–700');
  if (par.w < L.wMin - 1e-6) o.push('Amplada ' + fmt(par.w) + ' m < ' + fmt(L.wMin));
  const tr = C.counts;
  if (tr.some(k => k * R > L.hMax + 1e-6)) o.push('Un tram salva més de ' + fmt(L.hMax) + ' m');
  if (par.use !== 'res' && tr.some(k => k < 3)) o.push('Un tram té menys de 3 graons');
  return o;
}
function stairInfo(par) { const C = stairCalc(S.model, par); return { ...C, run: par.shape === 'I' ? (C.n - 1) * par.g + (C.counts.length - 1) * landingLen(par) : null, b: 2 * C.R + par.g, warn: stairCheck(par, C) }; }
function makeStair(p, dir) {
  pushUndo(); const { c } = ctxInfo(), lv = S.level, nx = nextLevelAbove(S.model, levelElev(S.model, lv));
  const rot = dir ? Math.atan2(dir[1] - p[1], dir[0] - p[0]) * 180 / Math.PI : 0;
  const par = { type: 'stair', shape: OPT.stairShape || 'I', turn: OPT.stairTurn || 'l', p: [p[0], p[1]], rot: +rot.toFixed(4), w: OPT.stairW, g: OPT.stairG, t: OPT.stairT, gap: OPT.stairGap, nAuto: true, n: 18, n1Auto: true, n1: 9, lands: 0, lD: 0, use: OPT.stairUse || 'gen', hm: 'next', h: OPT.wallH, hl: nx ? nx.id : null, bo: 0, to: 0, lv };
  const g = addPar(c, par, 'Escala', 'IfcStair', lv); clearSel(); S.sel.groups.add(g.id); refreshAll(); return g;
}
/* previsualització en planta del contorn de l'escala (línia d'empremta) */
function stairOutline(par) {
  const S0 = stairParts(S.model, par), segs = [], w = par.w;
  for (const f of S0.fl) { const L = Math.max(0.02, (f.k - 1) * par.g), Q = (s, y) => [f.O[0] + f.u[0] * s + f.v[0] * y, f.O[1] + f.u[1] * s + f.v[1] * y, f.z0];
    const r = [Q(0, -w / 2), Q(L, -w / 2), Q(L, w / 2), Q(0, w / 2)]; for (let i = 0; i < 4; i++) segs.push(r[i], r[(i + 1) % 4]); for (let i = 1; i < f.k - 1; i++) segs.push(Q(i * par.g, -w / 2), Q(i * par.g, w / 2));
    segs.push(Q(0, 0), Q(L, 0)); }
  for (const l of S0.ld) for (let i = 0; i < 4; i++) segs.push([...l.q[i], l.z], [...l.q[(i + 1) % 4], l.z]);
  return segs;
}
TOOLS.stair = {
  move(ev, mx, my) {
    const pk = pick(mx, my, { from: st.from, lock: LOCK }); st.pk = pk; clearPrev();
    if (!st.from) { showTip(mx, my, pk, (OPT.stairShape || 'I') + ' · amplada ' + fmt(OPT.stairW) + ' · clic al peu del primer graó'); return; }
    const par = { type: 'stair', shape: OPT.stairShape || 'I', turn: OPT.stairTurn || 'l', p: st.from.slice(0, 2), rot: Math.atan2(pk.p[1] - st.from[1], pk.p[0] - st.from[0]) * 180 / Math.PI, w: OPT.stairW, g: OPT.stairG, t: OPT.stairT, gap: OPT.stairGap, nAuto: true, n1Auto: true, use: OPT.stairUse || 'gen', hm: 'next', h: OPT.wallH, bo: 0, to: 0, lv: S.level };
    const segs = stairOutline(par), z = levelElev(S.model, S.level); for (let i = 0; i < segs.length; i += 2) prevLine([[segs[i][0], segs[i][1], z], [segs[i + 1][0], segs[i + 1][1], z]], 0x1B1D21);
    const I = stairInfo(par); showTip(mx, my, pk, I.n + ' contrapetges de ' + Math.round(I.R * 1000) + ' mm · petjada ' + Math.round(par.g * 1000) + (I.run != null ? ' · recorregut ' + fmtM(I.run) : '') + (I.warn.length ? ' · ⚠ ' + I.warn[0] : ''));
  },
  down(ev, mx, my) { const pk = pick(mx, my, { from: st.from, lock: LOCK }); if (!st.from) { st.from = pk.p; return; } if (V.dist(st.from, pk.p) < 0.05) return; makeStair(st.from, pk.p); st.from = null; LOCK = null; clearPrev(); },
  vcb(txt) {
    const m = String(txt).trim(); if (/^[ilu]$/i.test(m)) { OPT.stairShape = m.toUpperCase(); saveOpts(); toast('Escala ' + { I: 'recta', L: 'en L', U: 'en U' }[OPT.stairShape]); return; }
    const a = m.split(/[;x×]/).map(parseNum); if (a[0] == null || a[0] < 0.4) return; OPT.stairW = a[0]; if (a[1] > 0.15) OPT.stairG = a[1]; if (a[2] > 0.05) OPT.stairT = a[2]; saveOpts(); toast('Escala · amplada ' + fmt(OPT.stairW) + ' · petjada ' + fmt(OPT.stairG) + ' · llosa ' + fmt(OPT.stairT));
  },
  /* v23 · mentre l'eina Escala és activa, I/L/U trien el tipus i no canvien d'eina */
  key(ev) { const k = ev.key.toUpperCase(); if (ev.ctrlKey || ev.metaKey || ev.altKey || !/^[ILU]$/.test(k)) return false; OPT.stairShape = k; saveOpts(); toast('Escala ' + { I: 'recta', L: 'en L', U: 'en U' }[k]); ev.preventDefault(); return true; },
  hintExtra: 'Clic al peu del primer graó i clic en la direcció de pujada · I / L / U trien el tipus · «amplada;petjada;llosa» al VCB.',
};
function stairPanel(b, g, h) {
  const par = g.par, { row, num, sel, up, lvlOpts } = h, I = stairInfo(par), mm = x => Math.round(x * 1000) + ' mm';
  b.appendChild(el('div', 'row hd', 'Escala paramètrica'));
  if (g.warn) b.appendChild(el('div', 'empty', '⚠ ' + esc(g.warn)));
  sel('Tipus', 'shape', [['I', 'Recta'], ['L', 'En L (replà a 90°)'], ['U', 'En U (replà a 180°)']]);
  if (par.shape !== 'I') { sel('Gir', 'turn', [['l', 'A l’esquerra'], ['r', 'A la dreta']]); const bi = el('button', 'btn sm', 'Inverteix (primer tram a l’altre costat)'); bi.dataset.stairInv = '1'; bi.onclick = () => up(() => { par.turn = par.turn === 'r' ? 'l' : 'r'; }); b.appendChild(bi); }
  sel('Nivell base', 'lv', lvlOpts, v => { par.lv = +v; g.level = +v; });
  num('Desfasament de base (m)', 'bo', -100, 100);
  sel('Arriba', 'hm', [['next', 'Al nivell de sobre'], ['lvl', 'A un nivell'], ['fix', 'Alçada fixa']]);
  if (par.hm === 'lvl') sel('Nivell superior', 'hl', lvlOpts, v => { par.hl = +v; });
  if (par.hm !== 'fix') num('Desfasament superior (m)', 'to', -100, 100); else num('Alçada (m)', 'h', 0.2, 20);
  num('Amplada útil (m)', 'w', 0.4, 10); num('Petjada (m)', 'g', 0.15, 0.6); num('Gruix de la llosa (m)', 't', 0.05, 0.6);
  if (par.shape === 'U') num('Ull d’escala (m)', 'gap', 0, 3);
  num('Rotació (°)', 'rot', -360, 360);
  const ck = (lab, key, cb) => { const i = el('input'); i.type = 'checkbox'; i.checked = par[key] !== false; i.dataset.par = key; i.onchange = () => up(() => { par[key] = i.checked; cb && cb(); }); return row(lab, i); };
  ck('Contrapetges automàtiques', 'nAuto', () => { if (!par.nAuto) par.n = I.n; }); if (par.nAuto === false) { const r = num('Num. contrapetges', 'n', 2, 80), i = r.querySelector ? r.querySelector('input') : null, inp = i || b.querySelector('[data-par=n]'); if (inp) { inp.step = 1; inp.min = 2; inp.inputMode = 'numeric'; inp.value = Math.round(par.n); inp.onkeydown = e => { if (['.', ',', '-', 'e', 'E', '+'].includes(e.key)) e.preventDefault(); }; inp.onchange = () => { const v = Math.round(Math.abs(parseFloat(inp.value))); if (!isFinite(v) || v < 2) { inp.value = Math.round(par.n); toast('Num. contrapetges: cal un enter de 2 a 80.'); return; } up(() => { par.n = Math.min(80, v); }); }; } }
  /* v26 · replans: una recta pot tenir replans (automàtics o triats); la L i la U tenen el seu replà de gir */
  if (par.shape === 'I') sel('Replans', 'lands', [['0', 'Cap (recta)'], ['auto', 'Automàtic (CTE)'], ['1', '1 replà'], ['2', '2 replans'], ['3', '3 replans']], v => { par.lands = v === 'auto' ? 'auto' : +v; });
  if (par.shape !== 'I' || (I.counts.length > 1)) {
    const lh = el('input'); lh.type = 'number'; lh.step = 0.01; lh.min = 0; lh.value = par.hLand > 0 ? +par.hLand.toFixed(3) : ''; lh.placeholder = 'automàtic'; lh.dataset.par = 'hLand'; lh.style.width = '90px';
    lh.onchange = () => { const v = parseFloat(lh.value); up(() => { par.hLand = isFinite(v) && v > 0 ? v : 0; }); }; row('Alçada del replà (m)', lh);
    if (par.shape !== 'I' || I.counts.length === 2) { ck('Replà a mig recorregut', 'n1Auto', () => { if (!par.n1Auto) par.n1 = I.n1; }); if (par.n1Auto === false && !(par.hLand > 0)) num('Graons 1r tram', 'n1', 1, 79); }
    if (par.shape === 'I') { num('Llargada del replà (m, 0 = amplada)', 'lD', 0, 10); }
    row('Graons per tram', el('span', 'mono', I.counts.join(' + ')));
    if (I.landErr > 0.0005) b.appendChild(el('div', 'empty', 'El replà més proper és a ' + mm(I.landH) + ' (diferència ' + mm(I.landErr) + ').'));
  }
  sel('Normativa (CTE DB-SUA 1)', 'use', [['gen', STAIR_CTE.gen.lab], ['res', STAIR_CTE.res.lab]]);
  row('Alçada a salvar', el('span', 'mono', fmtM(I.H)));
  row('Contrapetja', el('span', 'mono', I.n + ' × ' + mm(I.R)));
  row('2C + H', el('span', 'mono', mm(I.b)));
  row('Pendent', el('span', 'mono', (Math.atan2(I.R, par.g) * 180 / Math.PI).toFixed(1) + '°'));
  if (par.shape !== 'I') row('Trams', el('span', 'mono', I.n1 + ' + ' + I.n2));
  else row('Recorregut', el('span', 'mono', fmtM(I.run)));
  b.appendChild(el('div', I.warn.length ? 'empty' : 'empty ok', I.warn.length ? 'No compleix: ' + esc(I.warn.join(' · ')) : '✓ Compleix les dimensions de DB-SUA 1 (' + STAIR_CTE[par.use || 'gen'].lab.toLowerCase() + ')'));
}
function stairPdt(par) { return par.shape === 'L' ? '.QUARTER_TURN_STAIR.' : par.shape === 'U' ? '.HALF_TURN_STAIR.' : '.STRAIGHT_RUN_STAIR.'; }
