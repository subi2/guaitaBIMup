/* ============================================================
   v16 · documentació 2D vectorial: planta, alçat i secció amb
   eliminació de línies ocultes, ratllat del tall i làmina
   multivista. Sortida SVG, PDF i DXF.
   ============================================================ */
function docViews() {
  const L = S.model.levels.slice().sort((a, b) => b.elev - a.elev), out = [['multi', 'Làmina multivista (planta, alçats i secció)']];
  for (const l of L) out.push(['plan:' + l.id, 'Planta · ' + l.name]);
  for (const e of ELEVS) out.push(['elev:' + e[0], e[1]]);
  for (const g of S.model.grids) out.push(['sec:' + g.id, 'Secció · eix ' + g.name]);
  for (const s of S.model.sections || []) out.push(['cut:' + s.id, 'Secció · ' + s.name]);
  return out;
}
function docView(key) {
  const [t, id] = key.split(':'), mk = (name, o, dir, cut, far, kind) => { const u = Math.abs(dir[2]) > 0.99 ? [1, 0, 0] : V.norm(V.cross(dir, [0, 0, 1])); return { key, name, o, dir, u, v: V.cross(u, dir), cut, far, kind }; };
  if (t === 'plan') { const l = S.model.levels.find(x => String(x.id) === id); return l ? mk('Planta · ' + l.name, [0, 0, l.elev + 1.2], [0, 0, -1], true, 1.3, 'plan') : null; }
  if (t === 'elev') { const e = ELEVS.find(x => x[0] === id), d = { S: [0, 1, 0], N: [0, -1, 0], E: [-1, 0, 0], O: [1, 0, 0] }[id]; return e ? mk(e[1], [0, 0, 0], d, false, Infinity, 'elev') : null; }
  if (t === 'sec') { const g = S.model.grids.find(x => String(x.id) === id); if (!g) return null; const d = V.norm([g.b[0] - g.a[0], g.b[1] - g.a[1], 0]); return mk('Secció · eix ' + g.name, [g.a[0], g.a[1], 0], [-d[1], d[0], 0], true, Infinity, 'sec'); }
  if (t === 'cut') { const s = (S.model.sections || []).find(x => String(x.id) === id); if (!s) return null; const n = V.norm(s.flip ? V.mul(s.n, -1) : s.n), hz = Math.abs(n[2]) > 0.99; return mk('Secció · ' + s.name, hz ? s.o.slice() : [s.o[0], s.o[1], 0], V.mul(n, -1), true, Infinity, hz ? 'plan' : 'sec'); }
  return null;
}
/* genera el dibuix 2D d'una vista: tall, arestes vistes i ocultes */
function drawing2D(vw, opt) {
  opt = opt || {}; const o = vw.o, D = vw.dir, U = vw.u, W = vw.v, pr = p => { const x = p[0] - o[0], y = p[1] - o[1], z = p[2] - o[2]; return [x * U[0] + y * U[1] + z * U[2], x * W[0] + y * W[1] + z * W[2], x * D[0] + y * D[1] + z * D[2]]; };
  const lo = vw.cut ? 0 : -Infinity, hi = vw.cut ? vw.far : Infinity, tris = [], cutSeg = new Map();
  const clipPoly = (pts, f) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], da = f(a), db = f(b); if (da >= 0) out.push(a); if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); } } return out; };
  for (const m of pickMeshes) {
    if (m.userData.back) continue; const p = m.geometry.attributes.position.array, key = m.userData.path.join('/');
    for (let i = 0; i < p.length; i += 9) {
      const T = [pr([p[i], p[i + 1], p[i + 2]]), pr([p[i + 3], p[i + 4], p[i + 5]]), pr([p[i + 6], p[i + 7], p[i + 8]])];
      if (vw.cut) { const q = []; for (let k = 0; k < 3; k++) { const a = T[k], b = T[(k + 1) % 3]; if ((a[2] > 0) !== (b[2] > 0)) { const t = a[2] / (a[2] - b[2]); q.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } if (q.length === 2) { let l = cutSeg.get(key); if (!l) cutSeg.set(key, l = []); l.push(q); } }
      let poly = T; if (vw.cut) { poly = clipPoly(poly, a => a[2]); if (isFinite(hi) && poly.length) poly = clipPoly(poly, a => hi - a[2]); }
      for (let k = 1; k + 1 < poly.length; k++) { const a = poly[0], b = poly[k], c = poly[k + 1], ar = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); if (Math.abs(ar) > 1e-9) tris.push([a, b, c, ar]); }
    }
  }
  /* contorns del tall: encadena els segments de cada element */
  const cut = [], cutOpen = [], rk = q => Math.round(q[0] * 1e4) + ',' + Math.round(q[1] * 1e4);
  for (const [, segs] of cutSeg) {
    const adj = new Map(), used = new Array(segs.length).fill(false), add = (k, i) => { let l = adj.get(k); if (!l) adj.set(k, l = []); l.push(i); }, loops = [];
    segs.forEach((s, i) => { if (rk(s[0]) === rk(s[1])) { used[i] = true; return; } add(rk(s[0]), i); add(rk(s[1]), i); });
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue; used[i] = true; const pts = [segs[i][0], segs[i][1]], k0 = rk(pts[0]); let closed = false;
      for (;;) { const kc = rk(pts[pts.length - 1]); if (kc === k0 && pts.length > 2) { pts.pop(); closed = true; break; } const nx = (adj.get(kc) || []).find(j => !used[j]); if (nx == null) break; used[nx] = true; pts.push(rk(segs[nx][0]) === kc ? segs[nx][1] : segs[nx][0]); }
      if (closed && pts.length >= 3) loops.push(pts); else for (let k = 0; k + 1 < pts.length; k++) cutOpen.push([pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]]);
    }
    if (loops.length) cut.push({ loops });
  }
  /* graella d'acceleració per a les línies ocultes */
  let bb = { u0: Infinity, v0: Infinity, u1: -Infinity, v1: -Infinity }; const ext = (x, y) => { if (x < bb.u0) bb.u0 = x; if (x > bb.u1) bb.u1 = x; if (y < bb.v0) bb.v0 = y; if (y > bb.v1) bb.v1 = y; };
  for (const t of tris) for (let k = 0; k < 3; k++) ext(t[k][0], t[k][1]);
  const Gn = Math.max(8, Math.min(220, Math.ceil(Math.sqrt(tris.length)) * 2)), cw = Math.max(bb.u1 - bb.u0, 1e-6) / Gn, ch = Math.max(bb.v1 - bb.v0, 1e-6) / Gn, grid = new Map();
  tris.forEach((t, i) => { const x0 = Math.floor((Math.min(t[0][0], t[1][0], t[2][0]) - bb.u0) / cw), x1 = Math.floor((Math.max(t[0][0], t[1][0], t[2][0]) - bb.u0) / cw), y0 = Math.floor((Math.min(t[0][1], t[1][1], t[2][1]) - bb.v0) / ch), y1 = Math.floor((Math.max(t[0][1], t[1][1], t[2][1]) - bb.v0) / ch);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x * 4096 + y; let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); } });
  const hiddenAt = (x, y, d) => { const l = grid.get(Math.floor((x - bb.u0) / cw) * 4096 + Math.floor((y - bb.v0) / ch)); if (!l) return false;
    for (const i of l) { const [a, b, c, ar] = tris[i], w0 = ((b[0] - x) * (c[1] - y) - (b[1] - y) * (c[0] - x)) / ar, w1 = ((c[0] - x) * (a[1] - y) - (c[1] - y) * (a[0] - x)) / ar, w2 = 1 - w0 - w1; if (w0 > 1e-5 && w1 > 1e-5 && w2 > 1e-5 && w0 * a[2] + w1 * b[2] + w2 * c[2] < d - 2e-3) return true; } return false; };
  /* arestes: retall en profunditat, filtre de corbes suaus i visibilitat per mostreig */
  const vis = [], hid = [], adjC = new Map(), step = Math.max(Math.hypot(bb.u1 - bb.u0, bb.v1 - bb.v0) / 1500, 0.01);
  const adjOf = c => { let m = adjC.get(c); if (!m) { m = new Map(); for (const f of c.faces.values()) for (const lp of [f.loop, ...f.holes]) for (let i = 0; i < lp.length; i++) { const a = lp[i], b = lp[(i + 1) % lp.length], k = a < b ? a + '_' + b : b + '_' + a; let l = m.get(k); if (!l) m.set(k, l = []); l.push(f.n); } adjC.set(c, m); } return m; };
  for (const e of SNAP.edges) {
    const ed = e.c.edges.get(e.id); if (!ed) continue; const n = adjOf(e.c).get(ed.a < ed.b ? ed.a + '_' + ed.b : ed.b + '_' + ed.a) || [];
    if (n.length === 2 && V.dot(n[0], n[1]) > 0.9 && V.dot(n[0], D) * V.dot(n[1], D) >= 0) continue;
    let a = pr(e.a), b = pr(e.b);
    if (vw.cut) { if (a[2] < lo && b[2] < lo || a[2] > hi && b[2] > hi) continue; const cl = (f) => { const da = f(a), db = f(b); if (da < 0 && db < 0) return false; if (da < 0) { const t = da / (da - db); a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; } else if (db < 0) { const t = da / (da - db); b = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; } return true; }; if (!cl(q => q[2]) || (isFinite(hi) && !cl(q => hi - q[2]))) continue; }
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 1e-5) continue; const ns = Math.max(1, Math.min(240, Math.ceil(len / step))); let s0 = 0, cur = null;
    for (let i = 0; i <= ns; i++) {
      const stt = i === ns ? null : (() => { const t = (i + 0.5) / ns; return hiddenAt(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); })();
      if (stt !== cur) { if (cur !== null) { const t0 = s0 / ns, t1 = i / ns; (cur ? hid : vis).push([a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1]); } s0 = i; cur = stt; }
    }
  }
  for (const s of [...vis, ...cutOpen]) { ext(s[0], s[1]); ext(s[2], s[3]); } for (const c of cut) for (const l of c.loops) for (const q of l) ext(q[0], q[1]);
  if (!isFinite(bb.u0)) bb = { u0: 0, v0: 0, u1: 1, v1: 1 };
  /* anotacions: nivells en alçats i seccions, eixos de pilars en planta */
  const ann = { lines: [], texts: [] };
  if (vw.kind !== 'plan') for (const l of S.model.levels) { if (l.elev < bb.v0 - 3 || l.elev > bb.v1 + 3) continue; ann.lines.push([bb.u0 - 0.6, l.elev, bb.u1 + 0.6, l.elev]); ann.texts.push([bb.u1 + 0.7, l.elev, l.name + '  ' + fmtElev(l.elev)]); }
  else if (vw.key.startsWith('plan')) for (const g of S.model.grids) { const e = gridEnds(g), a = pr([e.a[0], e.a[1], o[2]]), b = pr([e.b[0], e.b[1], o[2]]); ann.lines.push([a[0], a[1], b[0], b[1]]); ann.texts.push([a[0] - e.d[0] * 0.35 - 0.1, a[1] - e.d[1] * 0.35 - 0.1, g.name]); }
  for (const s of ann.lines) { ext(s[0], s[1]); ext(s[2], s[3]); } for (const t of ann.texts) { ext(t[0], t[1]); ext(t[0] + 0.25 * t[2].length * (opt.scale || 100) / 100, t[1] + 0.3); }
  return { name: vw.name, cut, cutOpen, vis, hid: opt.hidden ? hid : [], ann, bb };
}
/* línies de ratllat dins d'uns contorns (regla parell-senar) */
function hatchLines(loops, sp, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), R = q => [q[0] * c + q[1] * s, -q[0] * s + q[1] * c], L = loops.map(l => l.map(R)), out = []; let y0 = Infinity, y1 = -Infinity;
  for (const l of L) for (const q of l) { if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
  for (let y = Math.ceil(y0 / sp) * sp + 1e-7; y < y1; y += sp) {
    const xs = []; for (const l of L) for (let i = 0; i < l.length; i++) { const a = l[i], b = l[(i + 1) % l.length]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])); }
    xs.sort((p, q) => p - q); for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i] * c - y * s, xs[i] * s + y * c, xs[i + 1] * c - y * s, xs[i + 1] * s + y * c]);
  }
  return out;
}
/* làmina: llista de primitives en mil·límetres de paper (Y amunt) */
function docSheet(keys, opt) {
  const N = opt.scale || 100, k = 1000 / N, sty = S.style, PX = 0.18, items = keys.map(docView).filter(Boolean).map(v => drawing2D(v, { hidden: opt.hidden, scale: N }));
  if (!items.length) return null; const gap = 14, cap = 8, sz = d => [(d.bb.u1 - d.bb.u0) * k, (d.bb.v1 - d.bb.v0) * k];
  /* disposició en dues columnes */
  const cols = items.length > 1 ? 2 : 1, rows = Math.ceil(items.length / cols), cwid = [0, 0], rhei = new Array(rows).fill(0);
  items.forEach((d, i) => { const [w, h] = sz(d); cwid[i % cols] = Math.max(cwid[i % cols], w); rhei[Math.floor(i / cols)] = Math.max(rhei[Math.floor(i / cols)], h + cap); });
  const mg = 10, tb = 12, needW = cwid[0] + (cols > 1 ? cwid[1] + gap : 0) + 2 * mg + 10, needH = rhei.reduce((a, b) => a + b, 0) + gap * (rows - 1) + 2 * mg + tb + 10;
  const fmtP = [['A4', 297, 210], ['A3', 420, 297], ['A2', 594, 420], ['A1', 841, 594], ['A0', 1189, 841]].find(f => f[1] >= needW && f[2] >= needH) || ['a mida', Math.ceil(needW), Math.ceil(needH)];
  const Wp = fmtP[1], Hp = fmtP[2], P = [], line = (x1, y1, x2, y2, w, col, layer, dash) => P.push({ t: 'l', x1, y1, x2, y2, w, col, layer, dash: dash || 0 });
  let yTop = Hp - mg - 5;
  for (let r = 0; r < rows; r++) {
    let x = mg + 5; const y = yTop - rhei[r];
    for (let cI = 0; cI < cols; cI++) {
      const d = items[r * cols + cI]; if (!d) continue; const ox = x, oy = y + cap, X = u => ox + (u - d.bb.u0) * k, Y = v => oy + (v - d.bb.v0) * k;
      for (const c of d.cut) {
        const loops = c.loops.map(l => l.map(q => [X(q[0]), Y(q[1])]));
        if (sty.sec.fill === 'solid') P.push({ t: 'p', loops, fill: sty.sec.color, layer: 'G-TALL-RATLLAT' });
        else if (sty.sec.fill !== 'none') { P.push({ t: 'p', loops, fill: sty.sec.bgc, layer: 'G-TALL-RATLLAT', nodxf: 1 }); for (const a of sty.sec.fill === 'cross' ? [Math.PI / 4, -Math.PI / 4] : [Math.PI / 4]) for (const h of hatchLines(loops, 1.6, a)) line(h[0], h[1], h[2], h[3], 0.1, sty.sec.color, 'G-TALL-RATLLAT'); }
      }
      for (const s of d.hid) line(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), 0.13, '#7A8089', 'G-OCULTA', 1);
      for (const s of d.vis) line(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), Math.max(0.09, sty.ed.w * PX), sty.ed.color, 'G-VISTA');
      for (const c of d.cut) for (const l of c.loops) for (let i = 0; i < l.length; i++) { const a = l[i], b = l[(i + 1) % l.length]; line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), Math.max(0.18, sty.ed.wc * PX), sty.sec.lc, 'G-TALL'); }
      for (const s of d.cutOpen) line(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), Math.max(0.18, sty.ed.wc * PX), sty.sec.lc, 'G-TALL');
      for (const s of d.ann.lines) line(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), 0.09, '#0E7C86', 'G-ANOT', 2);
      for (const t of d.ann.texts) P.push({ t: 't', x: X(t[0]), y: Y(t[1]) - 0.9, s: t[2], h: 2.5, col: '#0E7C86', layer: 'G-ANOT' });
      P.push({ t: 't', x: ox, y: y + 1.5, s: d.name + '   E 1:' + N, h: 3.2, col: '#000000', layer: 'G-MARC' });
      x += cwid[cI] + gap;
    }
    yTop = y - gap;
  }
  /* marc i caixetí */
  for (const [a, b, c, d2] of [[mg, mg, Wp - mg, mg], [Wp - mg, mg, Wp - mg, Hp - mg], [Wp - mg, Hp - mg, mg, Hp - mg], [mg, Hp - mg, mg, mg], [mg, mg + tb, Wp - mg, mg + tb]]) line(a, b, c, d2, 0.35, '#000000', 'G-MARC');
  P.push({ t: 't', x: mg + 3, y: mg + 4, s: baseName() + '  ·  ' + (items.length > 1 ? 'Làmina multivista' : items[0].name) + '  ·  Escala 1:' + N + '  ·  ' + fmtP[0] + '  ·  ' + new Date().toISOString().slice(0, 10) + '  ·  guaitaBIMup ' + VERSION + ' · SBS BIM Consulting', h: 3, col: '#000000', layer: 'G-MARC' });
  return { W: Wp, H: Hp, fmt: fmtP[0], N, prims: P, items };
}
const DOC_DASH = [null, [1.2, 0.8], [3, 0.8, 0.5, 0.8]];
function sheetSVG(sh) {
  const f = x => +x.toFixed(3), H = sh.H, o = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + sh.W + 'mm" height="' + H + 'mm" viewBox="0 0 ' + sh.W + ' ' + H + '" stroke-linecap="round" font-family="Helvetica,Arial,sans-serif"><rect width="' + sh.W + '" height="' + H + '" fill="#fff"/>'];
  let key = '', buf = []; const flush = () => { if (buf.length) { const [w, col, dash] = key.split('|'); o.push('<path fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (+dash ? ' stroke-dasharray="' + DOC_DASH[+dash].join(' ') + '"' : '') + ' d="' + buf.join('') + '"/>'); buf = []; } };
  for (const p of sh.prims) {
    if (p.t === 'l') { const k = f(p.w) + '|' + p.col + '|' + p.dash; if (k !== key) { flush(); key = k; } buf.push('M' + f(p.x1) + ' ' + f(H - p.y1) + 'L' + f(p.x2) + ' ' + f(H - p.y2)); }
    else { flush(); key = ''; if (p.t === 'p') o.push('<path fill="' + p.fill + '" fill-rule="evenodd" stroke="none" d="' + p.loops.map(l => 'M' + l.map(q => f(q[0]) + ' ' + f(H - q[1])).join('L') + 'Z').join('') + '"/>'); else o.push('<text x="' + f(p.x) + '" y="' + f(H - p.y) + '" font-size="' + p.h + '" fill="' + p.col + '">' + esc(p.s) + '</text>'); }
  }
  flush(); o.push('</svg>'); return o.join('\n');
}
function sheetPDF(sh) {
  const K2 = 72 / 25.4, f = x => (+(x * K2).toFixed(2)).toString(), rgb = h => hexRGB(h).map(x => +x.toFixed(3)).join(' '), c = [];
  const wa = { 0x2019: 0x92, 0x2018: 0x91, 0x201C: 0x93, 0x201D: 0x94, 0x2013: 0x96, 0x2014: 0x97, 0x20AC: 0x80 }, txt = s => { let r = ''; for (const ch of s) { let n = ch.codePointAt(0); if (n > 255) n = wa[n] || 63; const cc = String.fromCharCode(n); r += cc === '(' || cc === ')' || cc === '\\' ? '\\' + cc : cc; } return r; };
  c.push('1 J 1 j');
  for (const p of sh.prims) {
    if (p.t === 'l') c.push(rgb(p.col) + ' RG ' + f(p.w) + ' w ' + (p.dash ? '[' + DOC_DASH[p.dash].map(f).join(' ') + '] 0 d ' : '[] 0 d ') + f(p.x1) + ' ' + f(p.y1) + ' m ' + f(p.x2) + ' ' + f(p.y2) + ' l S');
    else if (p.t === 'p') c.push(rgb(p.fill) + ' rg ' + p.loops.map(l => l.map((q, i) => f(q[0]) + ' ' + f(q[1]) + (i ? ' l' : ' m')).join(' ') + ' h').join(' ') + ' f*');
    else c.push('BT ' + rgb(p.col) + ' rg /F1 ' + f(p.h) + ' Tf ' + f(p.x) + ' ' + f(p.y) + ' Td (' + txt(p.s) + ') Tj ET');
  }
  const stream = c.join('\n'), objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f(sh.W) + ' ' + f(sh.H) + '] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offs = []; objs.forEach((b, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + b + '\nendobj\n'; });
  const xr = out.length; out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF\n';
  const u8 = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) u8[i] = out.charCodeAt(i) & 255; return u8;
}
function sheetDXF(sh) {
  const m = sh.N / 1000, f = x => (+(x * m).toFixed(5)).toString(), LY = [['G-TALL', 7, 'CONTINUOUS'], ['G-TALL-RATLLAT', 8, 'CONTINUOUS'], ['G-VISTA', 7, 'CONTINUOUS'], ['G-OCULTA', 8, 'DASHED'], ['G-ANOT', 4, 'DASHDOT'], ['G-MARC', 7, 'CONTINUOUS']];
  const u = s => String(s).replace(/[^\x20-\x7e]/g, ch => '\\U+' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')), o = ['0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LTYPE', '70', '3',
    '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0',
    '0', 'LTYPE', '2', 'DASHED', '70', '0', '3', 'Dashed', '72', '65', '73', '2', '40', '0.15', '49', '0.1', '49', '-0.05',
    '0', 'LTYPE', '2', 'DASHDOT', '70', '0', '3', 'Dash dot', '72', '65', '73', '4', '40', '0.4', '49', '0.25', '49', '-0.06', '49', '0.0', '49', '-0.06', '0', 'ENDTAB', '0', 'TABLE', '2', 'LAYER', '70', String(LY.length)];
  for (const [n, c, lt] of LY) o.push('0', 'LAYER', '2', n, '70', '0', '62', String(c), '6', lt);
  o.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
  for (const p of sh.prims) {
    if (p.t === 'l') o.push('0', 'LINE', '8', p.layer, '10', f(p.x1), '20', f(p.y1), '30', '0.0', '11', f(p.x2), '21', f(p.y2), '31', '0.0');
    else if (p.t === 't') o.push('0', 'TEXT', '8', p.layer, '10', f(p.x), '20', f(p.y), '30', '0.0', '40', f(p.h), '1', u(p.s));
    else if (!p.nodxf) for (const l of p.loops) { o.push('0', 'POLYLINE', '8', p.layer, '66', '1', '70', '1'); for (const q of l) o.push('0', 'VERTEX', '8', p.layer, '10', f(q[0]), '20', f(q[1]), '30', '0.0'); o.push('0', 'SEQEND'); }
  }
  o.push('0', 'ENDSEC', '0', 'EOF'); return o.join('\n') + '\n';
}
function docDlg(key0) {
  const views = docViews(), st0 = { key: key0 && views.some(v => v[0] === key0) ? key0 : (S.view && views.some(v => v[0] === S.view) ? S.view : 'multi'), scale: 100, hidden: S.style.ed.hid !== 'off' };
  $('dlgBox').innerHTML = '<h3>Document 2D</h3><div class="kv"><span>Vista</span><select id="dcV">' + views.map(v => '<option value="' + v[0] + '"' + (v[0] === st0.key ? ' selected' : '') + '>' + esc(v[1]) + '</option>').join('') + '</select>'
    + '<span>Escala</span><select id="dcS">' + [20, 50, 100, 200, 500].map(n => '<option value="' + n + '"' + (n === 100 ? ' selected' : '') + '>1:' + n + '</option>').join('') + '</select>'
    + '<span>Arestes ocultes a traços</span><input type="checkbox" id="dcH"' + (st0.hidden ? ' checked' : '') + '></div>'
    + '<p class="dim" id="dcInfo" style="margin:8px 0"></p><div id="dcPrev" style="border:1px solid var(--line);background:#fff;height:300px;overflow:hidden;display:grid;place-items:center"></div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn" id="dcX">Tanca</button><button class="btn" id="dcDXF">DXF</button><button class="btn" id="dcSVG">SVG</button><button class="btn acc" id="dcPDF">PDF</button></div>';
  $('dlg').classList.add('show'); let sh = null;
  const keys = () => { const k = $('dcV').value; if (k !== 'multi') return [k]; const L = S.model.levels.find(l => l.id === S.level) || S.model.levels[0], a = []; if (L) a.push('plan:' + L.id); const sc = views.find(v => v[0].startsWith('cut:') || v[0].startsWith('sec:')); a.push(sc ? sc[0] : 'elev:N'); a.push('elev:S', 'elev:E'); return a; };
  const upd = () => { sh = docSheet(keys(), { scale: +$('dcS').value, hidden: $('dcH').checked }); if (!sh) { $('dcInfo').textContent = 'No hi ha res per dibuixar.'; return; }
    $('dcInfo').textContent = 'Full ' + sh.fmt + ' (' + sh.W + ' × ' + sh.H + ' mm) · ' + sh.prims.filter(p => p.t === 'l').length + ' línies · gruixos, colors i ratllat segons l’estil «' + S.style.name + '».';
    $('dcPrev').innerHTML = sheetSVG(sh).replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'style="max-width:100%;max-height:300px"'); };
  $('dcV').onchange = $('dcS').onchange = $('dcH').onchange = upd; upd();
  const nm = () => baseName() + '-' + ($('dcV').value === 'multi' ? 'lamina' : $('dcV').selectedOptions[0].textContent.replace(/[^\wÀ-ÿ]+/g, '_'));
  $('dcX').onclick = () => $('dlg').classList.remove('show');
  $('dcSVG').onclick = () => sh && deliver(nm() + '.svg', sheetSVG(sh), 'image/svg+xml'); $('dcPDF').onclick = () => sh && deliver(nm() + '.pdf', sheetPDF(sh), 'application/pdf'); $('dcDXF').onclick = () => sh && deliver(nm() + '.dxf', sheetDXF(sh), 'application/dxf');
}
