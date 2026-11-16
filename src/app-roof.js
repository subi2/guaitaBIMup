/* ============================================================
   v20 · cobertes paramètriques (IfcRoof)
   · per perímetre i pendent de cada aresta (intersecció de plans)
   · per cotes de punts (formació de pendents)
   · murs units a la coberta · adopció d'un grup de geometria lliure
   El nivell és la cara inferior al ràfec; el gruix es mesura en vertical.
   ============================================================ */
const SLOPE_UNITS = [['pct', '%'], ['deg', '°'], ['ratio', '1:x']];
function slopeParse(txt, unit) {
  const s = String(txt).trim().replace(',', '.'); let m;
  if ((m = s.match(/^1\s*[\/:]\s*([\d.]+)$/))) { const x = parseFloat(m[1]); return x > 0 ? 100 / x : null; }
  if ((m = s.match(/^([\d.]+)\s*(°|d|deg|g)$/i))) { const a = parseFloat(m[1]); return a >= 0 && a < 89 ? Math.tan(a * Math.PI / 180) * 100 : null; }
  if ((m = s.match(/^([\d.]+)\s*%$/))) return parseFloat(m[1]);
  const v = parseFloat(s); if (!isFinite(v) || v < 0) return null;
  return unit === 'deg' ? (v < 89 ? Math.tan(v * Math.PI / 180) * 100 : null) : unit === 'ratio' ? (v > 0 ? 100 / v : null) : v;
}
function slopeFmt(p, unit) { const r = x => String(+x.toFixed(2)); return unit === 'deg' ? r(Math.atan(p / 100) * 180 / Math.PI) + '°' : unit === 'ratio' ? (p > 0 ? '1:' + r(100 / p) : '—') : r(p) + '%'; }
const X2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function polyArea(q) { let s = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
/* desplaça un polígon antihorari cap enfora (d: nombre o llista per aresta) amb cantonades a biaix */
function offsetPoly(P, d) {
  const n = P.length, D = i => Array.isArray(d) ? d[i] : d, L = i => { const a = P[i], b = P[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, e = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], o = [e[1] * D(i), -e[0] * D(i)]; return { p: [a[0] + o[0], a[1] + o[1]], e }; };
  return P.map((v, i) => { const A = L((i + n - 1) % n), B = L(i), x = lineX(A.p, A.e, B.p, B.e); return x || B.p; });
}
function hull2(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), h = []; const eps = 1e-9;
  for (const q of p) { while (h.length >= 2 && X2(h[h.length - 2], h[h.length - 1], q) <= eps) h.pop(); h.push(q); }
  const lo = h.length + 1; for (let i = p.length - 2; i >= 0; i--) { const q = p[i]; while (h.length >= lo && X2(h[h.length - 2], h[h.length - 1], q) <= eps) h.pop(); h.push(q); }
  h.pop(); return h;
}
function splitConvex(poly, p, e) { /* talla un polígon convex per la recta (p, e): [esquerra, dreta] */
  const sd = q => e[0] * (q[1] - p[1]) - e[1] * (q[0] - p[0]), A = [], B = [];
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], da = sd(a), db = sd(b); if (da >= -1e-9) A.push(a); if (da <= 1e-9) B.push(a);
    if ((da > 1e-9 && db < -1e-9) || (da < -1e-9 && db > 1e-9)) { const t = da / (da - db), x = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; A.push(x); B.push(x); } }
  return [A, B].filter(q => q.length >= 3 && Math.abs(polyArea(q)) > 1e-8);
}
/* peces convexes màximes d'un polígon (per resoldre aiguafons en plantes còncaves) */
function convexPieces(P) {
  const n = P.length, reflex = []; for (let i = 0; i < n; i++) if (X2(P[(i + n - 1) % n], P[i], P[(i + 1) % n]) < -1e-9) reflex.push(i);
  if (!reflex.length) return [P];
  let cells = THREE.ShapeUtils.triangulateShape(P.map(q => new THREE.Vector2(q[0], q[1])), []).map(t => { const q = t.map(i => P[i]); return polyArea(q) < 0 ? q.reverse() : q; });
  const lines = []; for (const i of reflex) for (const [a, b] of [[P[(i + n - 1) % n], P[i]], [P[i], P[(i + 1) % n]]]) { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > 1e-9) lines.push([a, [(b[0] - a[0]) / l, (b[1] - a[1]) / l]]); }
  for (const [p, e] of lines) { const nx = []; for (const c of cells) nx.push(...splitConvex(c, p, e)); cells = nx; if (cells.length > 600) break; }
  /* fragments del mateix costat de totes les rectes = una cel·la de l'arranjament */
  const bySig = new Map(); for (const c of cells) { const m = c.reduce((a, q) => [a[0] + q[0] / c.length, a[1] + q[1] / c.length], [0, 0]), k = lines.map(([p, e]) => (e[0] * (m[1] - p[1]) - e[1] * (m[0] - p[0]) > 0 ? 1 : 0)).join(''); if (!bySig.has(k)) bySig.set(k, []); bySig.get(k).push(c); }
  cells = []; for (const fr of bySig.values()) { const h = hull2([].concat(...fr)), sum = fr.reduce((a, c) => a + Math.abs(polyArea(c)), 0); if (Math.abs(polyArea(h)) <= sum * (1 + 1e-7) + 1e-9) cells.push(h); else cells.push(...fr); }
  const ar = cells.map(c => Math.abs(polyArea(c))), seen = new Set(), out = [];
  for (let k = 0; k < cells.length; k++) {
    const set = new Set([k]); let pts = cells[k].slice(), sum = ar[k], ch = true;
    while (ch) { ch = false; for (let j = 0; j < cells.length; j++) { if (set.has(j)) continue; const h = hull2(pts.concat(cells[j])); if (Math.abs(polyArea(h)) <= (sum + ar[j]) * (1 + 1e-7) + 1e-9) { set.add(j); pts = h; sum += ar[j]; ch = true; } } }
    const key = [...set].sort((a, b) => a - b).join(','); if (!seen.has(key)) { seen.add(key); out.push(hull2(pts)); }
  }
  return out;
}
/* políedre convex com a llista de cares; retall pel semiespai N·x ≤ w */
function clipConvex(faces, N, w) {
  const sd = q => N[0] * q[0] + N[1] * q[1] + N[2] * q[2] - w, out = [], cap = [];
  for (const f of faces) { const r = [];
    for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length], da = sd(a), db = sd(b); if (da <= 1e-9) r.push(a);
      if ((da < -1e-9 && db > 1e-9) || (da > 1e-9 && db < -1e-9)) { const t = da / (da - db), x = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; r.push(x); cap.push(x); } }
    if (r.length >= 3) out.push(r); for (const q of f) if (Math.abs(sd(q)) <= 1e-9) cap.push(q); }
  const u = []; for (const q of cap) if (!u.some(x => Math.abs(x[0] - q[0]) + Math.abs(x[1] - q[1]) + Math.abs(x[2] - q[2]) < 1e-7)) u.push(q);
  if (u.length >= 3 && out.length) { const c = u.reduce((s, q) => [s[0] + q[0] / u.length, s[1] + q[1] / u.length, s[2] + q[2] / u.length], [0, 0, 0]), nn = V.norm(N), ax = V.norm(V.cross(Math.abs(nn[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], nn)), ay = V.cross(nn, ax);
    u.sort((p, q) => Math.atan2(V.dot(V.sub(p, c), ay), V.dot(V.sub(p, c), ax)) - Math.atan2(V.dot(V.sub(q, c), ay), V.dot(V.sub(q, c), ax))); out.push(u); }
  return out;
}
function convexToPolys(faces) {
  let c = [0, 0, 0], k = 0; for (const f of faces) for (const q of f) { c = V.add(c, q); k++; } if (!k) return []; c = V.mul(c, 1 / k); const out = [];
  for (const f of faces) { let nn = [0, 0, 0]; for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length]; nn[0] += (a[1] - b[1]) * (a[2] + b[2]); nn[1] += (a[2] - b[2]) * (a[0] + b[0]); nn[2] += (a[0] - b[0]) * (a[1] + b[1]); }
    if (V.len(nn) < 1e-10) continue; const fc = f.reduce((s, q) => V.add(s, V.mul(q, 1 / f.length)), [0, 0, 0]); out.push(new BOOL.Poly((V.dot(nn, V.sub(fc, c)) < 0 ? f.slice().reverse() : f).map(q => q.slice()), null)); }
  return out;
}
function prismFaces(h, z0, z1) { const dn = h.map(q => [q[0], q[1], z0]), up = h.map(q => [q[0], q[1], z1]), f = [up, dn.slice().reverse()]; for (let i = 0; i < h.length; i++) { const j = (i + 1) % h.length; f.push([dn[i], dn[j], up[j], up[i]]); } return f; }
const BU = (a, b) => a ? BOOL.union(a, b) : b;
/* triangulació del contorn amb punts interiors (inserció i intercanvi d'arestes) */
function triWithPoints(P, extra) {
  const pts = P.map(q => [q[0], q[1]]), nb = pts.length; let T = THREE.ShapeUtils.triangulateShape(pts.map(q => new THREE.Vector2(q[0], q[1])), []).map(t => (X2(pts[t[0]], pts[t[1]], pts[t[2]]) < 0 ? [t[0], t[2], t[1]] : t.slice()));
  for (const e of extra) { const p = [e.p[0], e.p[1]], k = T.findIndex(t => X2(pts[t[0]], pts[t[1]], p) > -1e-9 && X2(pts[t[1]], pts[t[2]], p) > -1e-9 && X2(pts[t[2]], pts[t[0]], p) > -1e-9); if (k < 0) continue; const t = T[k], i = pts.length; let on = -1; for (let j = 0; j < 3; j++) if (Math.abs(X2(pts[t[j]], pts[t[(j + 1) % 3]], p)) <= 1e-9) on = on < 0 ? j : 9;
    if (on === 9) continue; pts.push(p);
    if (on < 0) T.splice(k, 1, [t[0], t[1], i], [t[1], t[2], i], [t[2], t[0], i]);
    else { const u = t[on], v = t[(on + 1) % 3], w = t[(on + 2) % 3], k2 = T.findIndex((q, j) => j !== k && q.includes(u) && q.includes(v)); T[k] = [u, i, w]; T.push([i, v, w]); if (k2 >= 0) { const q = T[k2], w2 = q.find(x => x !== u && x !== v); T[k2] = [v, i, w2]; T.push([i, u, w2]); } else { pts.pop(); T.pop(); T[k] = t; } } }
  const inC = (a, b, c, d) => { const ax = a[0] - d[0], ay = a[1] - d[1], bx = b[0] - d[0], by = b[1] - d[1], cx = c[0] - d[0], cy = c[1] - d[1]; return (ax * ax + ay * ay) * (bx * cy - cx * by) - (bx * bx + by * by) * (ax * cy - cx * ay) + (cx * cx + cy * cy) * (ax * by - bx * ay) > 1e-10; };
  if (pts.length > nb) for (let pass = 0, ch = true; ch && pass < 50; pass++) { ch = false;
    for (let i = 0; i < T.length && !ch; i++) for (let j = i + 1; j < T.length && !ch; j++) { const sh = T[i].filter(v => T[j].includes(v)); if (sh.length !== 2) continue; const [u, v] = sh; if (u < nb && v < nb && (Math.abs(u - v) === 1 || Math.abs(u - v) === nb - 1)) continue;
      const a = T[i].find(x => !sh.includes(x)), b = T[j].find(x => !sh.includes(x)); if (X2(pts[a], pts[u], pts[b]) * X2(pts[a], pts[v], pts[b]) >= -1e-12) continue; if (!inC(pts[T[i][0]], pts[T[i][1]], pts[T[i][2]], pts[b])) continue;
      const t1 = [a, u, b], t2 = [a, b, v]; T[i] = X2(pts[t1[0]], pts[t1[1]], pts[t1[2]]) < 0 ? [a, b, u] : t1; T[j] = X2(pts[t2[0]], pts[t2[1]], pts[t2[2]]) < 0 ? [a, v, b] : t2; ch = true; } }
  return { pts, T };
}
function roofFix(par) { const n = par.pts.length; if (polyArea(par.pts) < 0) par.pts.reverse(); if (!Array.isArray(par.sl) || par.sl.length !== n) par.sl = par.pts.map((q, i) => (par.sl && par.sl[i]) || { on: false, v: OPT.roofSlope }); if (!Array.isArray(par.dz) || par.dz.length !== n) par.dz = par.pts.map((q, i) => (par.dz && par.dz[i]) || 0); if (!par.extra) par.extra = []; }
/* sòlids d'una coberta: { polys (la coberta), under (volum sota la cara inferior, per als murs), zmax, warn } */
function roofSolids(model, par) {
  roofFix(par); const zb = levelElev(model, par.lv) + (par.off || 0), t = Math.max(0.02, par.t), P = par.ov > 0 ? offsetPoly(par.pts, par.ov) : par.pts.map(q => q.slice()); let warn = null;
  if (par.mode === 'pts') {
    const { pts, T } = triWithPoints(P, par.extra), nb = P.length, dz = i => i < nb ? par.dz[i] || 0 : (par.extra[i - nb] ? par.extra[i - nb].z || 0 : 0), par2 = par.under === 'par';
    const zt = i => zb + t + Math.max(par2 ? -1e9 : 0.02 - t, dz(i)), zl = i => par2 ? zb + dz(i) : zb, solid = (lo, hi) => { const o = [];
      for (const [a, b, c] of T) { o.push(new BOOL.Poly([[...pts[a], hi(a)], [...pts[b], hi(b)], [...pts[c], hi(c)]], null)); o.push(new BOOL.Poly([[...pts[a], lo(a)], [...pts[c], lo(c)], [...pts[b], lo(b)]], null)); }
      for (let i = 0; i < nb; i++) { const j = (i + 1) % nb; o.push(new BOOL.Poly([[...pts[i], lo(i)], [...pts[j], lo(j)], [...pts[j], hi(j)]], null)); o.push(new BOOL.Poly([[...pts[i], lo(i)], [...pts[j], hi(j)], [...pts[i], hi(i)]], null)); } return o; };
    let zmax = -Infinity; for (let i = 0; i < pts.length; i++) zmax = Math.max(zmax, zt(i));
    return { polys: solid(zl, zt), under: solid(() => zb - 1, zl), zb, zmax, warn, kind: pts.some((q, i) => Math.abs(dz(i)) > 1e-9) ? '.FREEFORM.' : '.FLAT_ROOF.' };
  }
  const n = P.length, on = par.sl.map(s => s.on && s.v > 0), nOn = on.filter(Boolean).length;
  if (!nOn) return { polys: prismPolys(P, zb, zb + t), under: prismPolys(P, zb - 1, zb), zb, zmax: zb + t, warn, kind: '.FLAT_ROOF.' };
  const diam = Math.hypot(...[0, 1].map(k => Math.max(...P.map(q => q[k])) - Math.min(...P.map(q => q[k])))), smax = Math.max(...par.sl.map(s => s.on ? s.v : 0)) / 100, zhi = zb + smax * diam + t + 2, cut = par.cutH > 0 ? par.cutH : 0;
  const pieces = convexPieces(P), build = (dz, grow, cz) => { let acc = null;
    for (const h0 of pieces) { const h = grow ? offsetPoly(h0, grow) : h0; let f = prismFaces(h, zb - 1, zhi), any = false;
      for (let i = 0; i < h0.length; i++) { const a = h0[i], b = h0[(i + 1) % h0.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]), e = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; let hit = -1, lineOk = false;
        for (let k = 0; k < n; k++) { const p = P[k], q = P[(k + 1) % n], lk = Math.hypot(q[0] - p[0], q[1] - p[1]), ek = [(q[0] - p[0]) / lk, (q[1] - p[1]) / lk]; if (e[0] * ek[0] + e[1] * ek[1] < 0.9999) continue; if (Math.abs(ek[0] * (a[1] - p[1]) - ek[1] * (a[0] - p[0])) > 1e-6) continue; lineOk = true; if (on[k]) { hit = k; break; } }
        if (!lineOk) warn = 'El perímetre té zones que no s’han pogut resoldre amb plans; revisa la forma o parteix la coberta.';
        if (hit >= 0) { const s = par.sl[hit].v / 100, ni = [-e[1], e[0]]; f = clipConvex(f, [-s * ni[0], -s * ni[1], 1], zb + dz - s * (ni[0] * a[0] + ni[1] * a[1])); any = true; } }
      if (!any) f = clipConvex(f, [0, 0, 1], zb + dz); if (cz != null) f = clipConvex(f, [0, 0, 1], cz);
      const pl = convexToPolys(f); if (pl.length >= 4) acc = BU(acc, pl); }
    return acc || []; };
  const top = build(t, 0, cut ? zb + cut : null), under = build(0, 0, cut > t ? zb + cut - t : null), underBig = build(0, 0.02, cut > t ? zb + cut - t : null);
  const polys = BOOL.subtract(top, underBig); let zmax = zb + t; for (const p of polys) for (const v of p.v) if (v[2] > zmax) zmax = v[2];
  const gab = n - nOn, kind = nOn === 1 ? '.SHED_ROOF.' : nOn === n ? '.HIP_ROOF.' : nOn === 2 && gab >= 2 ? '.GABLE_ROOF.' : '.FREEFORM.';
  return { polys, under, zb, zmax, warn, kind };
}
function roofCache(model, g) { const sig = JSON.stringify([g.par, levelElev(model, g.par.lv)]); if (!g._roof || g._roofSig !== sig) { g._roof = roofSolids(model, g.par); g._roofSig = sig; g._dirty = true; } return g._roof; }
function roofRegen(model, c, g, off) {
  const r = roofCache(model, g); g.warn = r.warn; if (!g._dirty && g.verts.size && g._off === off.join()) return; g._dirty = false; g._off = off.join();
  const local = r.polys.map(q => new BOOL.Poly(q.v.map(v => [v[0] - off[0], v[1] - off[1], v[2] - off[2]]), q.mat)); if (!local.length) { g.verts = new Map(); g.edges = new Map(); g.faces = new Map(); return; }
  const tmp = polysToGroup(local, c, g, g.name); g.verts = tmp.g.verts; g.edges = tmp.g.edges; g.faces = tmp.g.faces;
}
/* mur unit a una coberta: puja fins a la cara inferior */
function roofWallPolys(model, c, g, fp, base) {
  const R = c.groups.get(g.par.hr); if (!R || !R.par || R.par.type !== 'roof') { g.warn = 'La coberta de referència ja no existeix: s’aplica l’alçada fixa.'; return prismPolys(fp, base, base + g.par.h); }
  const r = roofCache(model, R), sig = JSON.stringify([fp, base, R._roofSig]); if (g._rw && g._rwSig === sig) return g._rw;
  const lo = Math.min(base, r.zb - 0.5); let polys = BOOL.intersect(prismPolys(fp, lo, r.zmax + 1), r.under);
  if (base < r.zb - 0.5) polys = BOOL.union(prismPolys(fp, base, r.zb - 0.25), polys); else if (base > lo) polys = BOOL.intersect(polys, prismPolys(offsetPoly(ccw(fp), 0.01), base, r.zmax + 2));
  if (!polys.length) { g.warn = 'El mur queda fora de la coberta: s’aplica l’alçada fixa.'; polys = prismPolys(fp, base, base + g.par.h); }
  g._rw = polys; g._rwSig = sig; return polys;
}
function roofsIn(c) { return [...c.groups.values()].filter(g => g.par && g.par.type === 'roof'); }
function makeRoof(pts, lv, off, t) {
  pushUndo(); const { c } = ctxInfo(), par = { type: 'roof', mode: 'slope', pts: pts.map(q => [q[0], q[1]]), t: t || OPT.roofT, ov: 0, cutH: 0, under: 'flat', lv: lv == null ? S.level : lv, off: off || 0 }; roofFix(par);
  const g = addPar(c, par, 'Coberta', 'IfcRoof', par.lv); clearSel(); S.sel.groups.add(g.id); refreshAll(); return g;
}
function zToLevel(z) { const L = S.model.levels.slice().sort((a, b) => a.elev - b.elev), l = L.find(x => Math.abs(x.elev - z) < PAR_TOL) || L.filter(x => x.elev <= z + 1e-9).pop() || L[0]; return l ? [l.id, Math.abs(z - l.elev) < 1e-9 ? 0 : +(z - l.elev).toFixed(5)] : [S.level, 0]; }
/* recinte tancat de murs que conté el mur W: perímetre per la cara exterior i cota superior */
function wallLoop(c, W) {
  const walls = [...c.groups.values()].filter(g => g.par && g.par.type === 'wall' && wframe(g)), near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-3, chain = [{ g: W, rev: false }]; let end = W.par.b; const used = new Set([W.id]);
  for (let k = 0; k < walls.length + 1; k++) { if (near(end, W.par.a) && chain.length > 2) break; const nx = walls.find(g => !used.has(g.id) && (near(g.par.a, end) || near(g.par.b, end))); if (!nx) return null; const rev = !near(nx.par.a, end); chain.push({ g: nx, rev }); used.add(nx.id); end = rev ? nx.par.a : nx.par.b; }
  if (!near(end, W.par.a) || chain.length < 3) return null;
  let ch = chain, P = ch.map(x => (x.rev ? x.g.par.b : x.g.par.a).slice(0, 2));
  if (polyArea(P) < 0) { ch = chain.slice().reverse().map(x => ({ g: x.g, rev: !x.rev })); P = ch.map(x => (x.rev ? x.g.par.b : x.g.par.a).slice(0, 2)); }
  const d = ch.map(x => { const F = wframe(x.g); return x.rev ? F.hi : -F.lo; });
  return { pts: offsetPoly(P, d), top: Math.max(...chain.map(x => parZ(S.model, x.g.par).top)), walls: chain.map(x => x.g) };
}
/* converteix un grup de geometria lliure en coberta paramètrica: perímetre de la cara inferior, gruix i cota */
function roofAdopt(c, g) {
  const off = g.t; let best = null, zmin = Infinity, zmax = -Infinity; for (const v of g.verts.values()) { zmin = Math.min(zmin, v.p[2]); zmax = Math.max(zmax, v.p[2]); }
  for (const f of g.faces.values()) { if (Math.abs(f.n[2]) < 0.9) continue; const q = f.loop.map(i => K.P(g, i)); if (q.some(p => Math.abs(p[2] - zmin) > 1e-4)) continue; const P = q.map(p => [p[0] + off[0], p[1] + off[1]]), a = Math.abs(polyArea(P)); if (!best || a > best.a) best = { P, a }; }
  if (!best || best.a < 1e-4 || zmax - zmin < 0.02) { toast('El grup no té una cara inferior horitzontal de la qual prendre el perímetre.'); return null; }
  const [lv, o] = zToLevel(zmin + off[2]), nm = g.name, tag = g.tag; pushUndo(); c.groups.delete(g.id);
  const R = makeRoof(best.P, lv, o, +(zmax - zmin).toFixed(4)); R.name = nm || R.name; R.tag = tag; refreshAll(); toast('Grup convertit en coberta paramètrica (plana). Activa el pendent de cada aresta al panell.'); return R;
}
TOOLS.roof = {
  move(ev, mx, my) {
    const pk = pick(mx, my); st.pk = pk; clearPrev();
    if (!st.p1) { const { c } = ctxInfo(), en = ev.ctrlKey ? null : pickEntity(mx, my), W = parAt(en, c, 'wall'), SL = parAt(en, c, 'slab'), G = en && en.type === 'group' ? c.groups.get(en.id) : null;
      showTip(mx, my, pk, W ? 'Recinte de murs: coberta sobre la seva coronació' : SL ? 'Perímetre del forjat «' + SL.name + '»' : G && !G.par ? 'Converteix el grup «' + G.name + '» en coberta' : null); return; }
    if (st.poly) { prevLine([...st.poly, pk.p], 0x1B1D21, st.poly.length > 1); showTip(mx, my, pk, st.poly.length + ' punts · clica el primer punt per tancar'); return; }
    const a = st.p1, b = pk.p; prevLine([[a[0], a[1], a[2]], [b[0], a[1], a[2]], [b[0], b[1], a[2]], [a[0], b[1], a[2]]], 0x1B1D21, true); showTip(mx, my, pk, fmt(Math.abs(b[0] - a[0])) + ' ; ' + fmt(Math.abs(b[1] - a[1])));
  },
  down(ev, mx, my) {
    const pk = pick(mx, my), { c } = ctxInfo();
    if (!st.p1 && !ev.ctrlKey) { const en = pickEntity(mx, my), W = parAt(en, c, 'wall'), SL = parAt(en, c, 'slab'), G = en && en.type === 'group' ? c.groups.get(en.id) : null;
      if (W) { const lp = wallLoop(c, W); if (!lp) { toast('Aquest mur no forma un recinte tancat.'); return; } const [lv, o] = zToLevel(lp.top); makeRoof(lp.pts, lv, o); return; }
      if (SL) { makeRoof(SL.par.pts); return; } if (G && !G.par) { roofAdopt(c, G); return; } }
    if (!st.p1) { st.p1 = pk.p; return; }
    if (st.poly || ev.shiftKey) { if (!st.poly) st.poly = [st.p1]; if (st.poly.length >= 3 && V.dist(pk.p, st.poly[0]) < Math.max(0.05, K.TOL)) { const pts = st.poly; cancelTool(); makeRoof(pts); return; } st.poly.push(pk.p); return; }
    if (Math.abs(pk.p[0] - st.p1[0]) < K.TOL || Math.abs(pk.p[1] - st.p1[1]) < K.TOL) return; const a = st.p1, b = pk.p; cancelTool(); makeRoof([[Math.min(a[0], b[0]), Math.min(a[1], b[1])], [Math.max(a[0], b[0]), Math.min(a[1], b[1])], [Math.max(a[0], b[0]), Math.max(a[1], b[1])], [Math.min(a[0], b[0]), Math.max(a[1], b[1])]]);
  },
  key(ev) { if (ev.key === 'Enter' && st.poly && st.poly.length >= 3) { const pts = st.poly; cancelTool(); makeRoof(pts); return true; } return false; },
  vcb(txt) { const v = parseNum(txt); if (v == null || v <= 0.02) return; OPT.roofT = v; saveOpts(); toast('Gruix de coberta ' + fmt(v) + ' m'); },
  hintExtra: 'Clic sobre un mur d’un recinte, un forjat o un grup · o dos clics (rectangle) · Maj+clic: contorn · Ctrl: ignora el que hi ha a sota.',
};
TOOLS.roofpt = { /* afegeix un punt de cota a la coberta seleccionada */
  move(ev, mx, my) { const pk = pick(mx, my); st.pk = pk; showTip(mx, my, pk, 'Clic dins de la coberta: nou punt de cota'); },
  down(ev, mx, my) { const { c } = ctxInfo(), R = c.groups.get(S.roofEdit), pk = pick(mx, my); if (!R || !R.par) { setTool('select'); return; } pushUndo(); R.par.extra.push({ p: [pk.p[0], pk.p[1]], z: 0 }); refreshAll(); clearSel(); S.sel.groups.add(R.id); setTool('select'); },
  hintExtra: 'Clic a la posició del punt (bunera, carener…); la cota s’escriu al panell.',
};
function roofPanel(b, g, h) {
  const par = g.par; roofFix(par); const un = OPT.slopeUnit || 'pct', r = roofCache(S.model, g);
  b.appendChild(el('div', 'row hd', 'Coberta paramètrica')); if (g.warn) b.appendChild(el('div', 'empty', '⚠ ' + esc(g.warn)));
  h.sel('Nivell (cara inferior al ràfec)', 'lv', h.lvlOpts, v => { par.lv = +v; g.level = +v; }); h.num('Desfasament (m)', 'off', -100, 100); h.num('Gruix en vertical (m)', 't', 0.02, 5); h.num('Volada del ràfec (m)', 'ov', 0, 10);
  h.sel('Forma', 'mode', [['slope', 'Pendent per aresta (intersecció de plans)'], ['pts', 'Cotes de punts (formació de pendents)']]);
  const hi = (a, c) => { clearPrev(); if (a) prevLine([[a[0], a[1], r.zb], [c[0], c[1], r.zb]], 0xD9480F); needRender = true; }, P = par.ov > 0 && par.mode !== 'pts' ? offsetPoly(par.pts, par.ov) : par.pts;
  if (par.mode !== 'pts') {
    h.num('Alçada de tall (0 = sense)', 'cutH', 0, 100);
    const us = el('select', '', SLOPE_UNITS.map(([k, l]) => '<option value="' + k + '"' + (k === un ? ' selected' : '') + '>' + l + '</option>').join('')); us.id = 'rfUnit'; us.onchange = () => { OPT.slopeUnit = us.value; saveOpts(); renderTray(); }; h.row('Unitat de pendent', us);
    const bar = el('div'); bar.style.cssText = 'display:flex;gap:4px;margin:4px 0'; for (const [lab, v, id] of [['Totes inclinades', true, 'rfAll'], ['Plana', false, 'rfNone']]) { const x = el('button', 'btn sm', lab); x.id = id; x.onclick = () => h.up(() => par.sl.forEach(s => { s.on = v; })); bar.appendChild(x); } b.appendChild(bar);
    b.appendChild(el('div', 'row hd', 'Arestes del perímetre (' + par.pts.length + ')'));
    par.sl.forEach((s, i) => { const a = P[i], c = P[(i + 1) % P.length], row = el('div', 'row'); row.style.gap = '6px'; row.onmouseenter = () => hi(a, c); row.onmouseleave = () => hi();
      const ck = el('input'); ck.type = 'checkbox'; ck.checked = !!s.on; ck.dataset.rfon = i; ck.title = 'Defineix pendent'; ck.onchange = () => h.up(() => { s.on = ck.checked; }); row.appendChild(ck);
      row.appendChild(el('span', 'gw', 'Aresta ' + (i + 1) + ' · ' + fmtM(Math.hypot(c[0] - a[0], c[1] - a[1]))));
      const tx = el('input'); tx.type = 'text'; tx.value = slopeFmt(s.v, un); tx.style.width = '64px'; tx.dataset.rfsl = i; tx.title = 'Pendent: 30, 30%, 16.7°, 1/3 o 1:3'; tx.onchange = () => { const v = slopeParse(tx.value, un); if (v == null || v > 1000) { toast('Pendent no vàlid. Exemples: 30 · 30% · 16.7° · 1/3'); tx.value = slopeFmt(s.v, un); return; } h.up(() => { s.v = +v.toFixed(4); s.on = v > 0; }); }; row.appendChild(tx); b.appendChild(row); });
    b.appendChild(el('div', 'empty', 'Cota màxima: ' + fmtElev(r.zmax) + ' · passa el ratolí per una fila per veure l’aresta.'));
  } else {
    h.sel('Cara inferior', 'under', [['flat', 'Plana (gruix variable)'], ['par', 'Paral·lela (gruix constant)']]);
    b.appendChild(el('div', 'row hd', 'Cotes dels vèrtexs (m sobre el pla)'));
    const cell = (lab, get, set, key, a, c) => { const row = el('div', 'row'); row.style.gap = '6px'; row.onmouseenter = () => hi(a, c); row.onmouseleave = () => hi(); row.appendChild(el('span', 'gw', lab)); const i = el('input'); i.type = 'number'; i.step = 0.01; i.value = +(+get()).toFixed(4); i.style.width = '70px'; i.dataset.rfz = key; i.onchange = () => { const v = parseFloat(i.value); if (isFinite(v)) h.up(() => set(v)); }; row.appendChild(i); b.appendChild(row); return row; };
    par.pts.forEach((q, i) => cell('Vèrtex ' + (i + 1), () => par.dz[i], v => { par.dz[i] = v; }, 'v' + i, q, [q[0] + 0.001, q[1]]));
    b.appendChild(el('div', 'row hd', 'Cotes per aresta (els dos extrems)'));
    par.pts.forEach((q, i) => { const j = (i + 1) % par.pts.length; cell('Aresta ' + (i + 1), () => (par.dz[i] + par.dz[j]) / 2, v => { par.dz[i] = v; par.dz[j] = v; }, 'e' + i, q, par.pts[j]); });
    b.appendChild(el('div', 'row hd', 'Punts interiors (' + par.extra.length + ')'));
    par.extra.forEach((e, i) => { const row = cell('Punt ' + (i + 1) + ' (' + fmt(e.p[0]) + ' ; ' + fmt(e.p[1]) + ')', () => e.z, v => { e.z = v; }, 'x' + i, e.p, [e.p[0] + 0.001, e.p[1]]); const x = el('button', 'btn sm', '✕'); x.onclick = () => h.up(() => par.extra.splice(i, 1)); row.appendChild(x); });
    const ad = el('button', 'btn sm', 'Afegeix un punt (clic a la coberta)'); ad.id = 'rfAddPt'; ad.onclick = () => { S.roofEdit = g.id; setTool('roofpt'); }; b.appendChild(ad);
  }
}
