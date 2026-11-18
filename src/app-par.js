/* v11 · elements paramètrics (mur). Es regeneren a cada canvi de paràmetres, nivells o unions. */
function levelElev(model, id) { const l = model.levels.find(x => x.id === id); return l ? l.elev : 0; }
function nextLevelAbove(model, e) { const ls = model.levels.slice().sort((a, b) => a.elev - b.elev); return ls.find(l => l.elev > e + 1e-6) || null; }
function topOf(model, par, base) {
  if (par.hm === 'fix') return base + par.h;
  if (par.hm === 'lvl') { const e = levelElev(model, par.hl); return e > base + 1e-6 ? e : base + par.h; }
  const n = nextLevelAbove(model, base); return n ? n.elev : base + par.h;
}
function eachContainer(c, off, fn) { fn(c, off); for (const g of c.groups.values()) eachContainer(g, V.add(off, g.t), fn); }
function addPar(c, par, label, ifc, lv) {
  const g = K.newContainer(S.model, 'group'); g.name = label + ' ' + g.id; g.t = [0, 0, 0]; g.ifc = ifc; g.level = lv; g.tag = 0; g.par = par;
  c.groups.set(g.id, g); return g;
}
/* v15 · contorn del mur amb unions netes: biaix en angle, estrella amb 3 o més murs i topall en T */
function wframe(W) { const p = W.par, v = [p.b[0] - p.a[0], p.b[1] - p.a[1]], L = Math.hypot(v[0], v[1]); if (!(L >= 1e-3)) return null; const d = [v[0] / L, v[1] / L], n = [-d[1], d[0]], lo = p.just === 'l' ? 0 : p.just === 'r' ? -p.t : -p.t / 2; return { p, d, n, lo, hi: lo + p.t, L }; }
function lineX(p, d, q, e) { const c = d[0] * e[1] - d[1] * e[0]; if (Math.abs(c) < 0.02) return null; const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / c; return [p[0] + d[0] * t, p[1] + d[1] * t]; }
function wallEnd(F, k) { const s = k ? -1 : 1; return { P: k ? F.p.b : F.p.a, d: [F.d[0] * s, F.d[1] * s], n: [F.n[0] * s, F.n[1] * s], oL: k ? -F.lo : F.hi, oR: k ? -F.hi : F.lo }; }
function wallFootprint(W, walls) {
  const F = wframe(W); if (!F) return null; const near = (x, y) => Math.hypot(x[0] - y[0], x[1] - y[1]) <= 1e-3, off = (E, o) => [E.P[0] + E.n[0] * o, E.P[1] + E.n[1] * o];
  const corner = k => {
    const E = wallEnd(F, k), def = { l: off(E, E.oL), r: off(E, E.oR), mid: null }, nb = [];
    for (const O of walls) { if (O === W) continue; const G = wframe(O); if (!G) continue; for (const j of [0, 1]) { const Q = wallEnd(G, j); if (!near(Q.P, E.P)) continue; const cr = E.d[0] * Q.d[1] - E.d[1] * Q.d[0], dt = E.d[0] * Q.d[0] + E.d[1] * Q.d[1]; if (Math.abs(cr) < 0.02 && dt > 0) continue; let a = Math.atan2(cr, dt); if (a < 0) a += 2 * Math.PI; nb.push({ Q, a, t: O.par.t }); } }
    if (nb.some(x => Math.abs(Math.sin(x.a)) >= 0.02)) {
      nb.sort((x, y) => x.a - y.a); const cw = nb[nb.length - 1], cc = nb[0], lim = 4 * Math.max(W.par.t, cw.t, cc.t);
      const l = lineX(def.l, E.d, off(cc.Q, cc.Q.oR), cc.Q.d), r = lineX(def.r, E.d, off(cw.Q, cw.Q.oL), cw.Q.d);
      return { l: l && Math.hypot(l[0] - E.P[0], l[1] - E.P[1]) < lim ? l : def.l, r: r && Math.hypot(r[0] - E.P[0], r[1] - E.P[1]) < lim ? r : def.r, mid: nb.length > 1 ? E.P.slice(0, 2) : null };
    }
    for (const O of walls) { /* topall en T contra la cara del mur passant */
      if (O === W) continue; const G = wframe(O); if (!G) continue; const rel = [E.P[0] - G.p.a[0], E.P[1] - G.p.a[1]], s = rel[0] * G.d[0] + rel[1] * G.d[1], dist = Math.abs(rel[0] * G.n[0] + rel[1] * G.n[1]);
      if (dist > 1e-3 || s < 1e-3 || s > G.L - 1e-3) continue; const face = (E.d[0] * G.n[0] + E.d[1] * G.n[1]) > 0 ? G.hi : G.lo, q = [G.p.a[0] + G.n[0] * face, G.p.a[1] + G.n[1] * face];
      const l = lineX(def.l, E.d, q, G.d), r = lineX(def.r, E.d, q, G.d); if (l && r) return { l, r, mid: null };
    }
    return def;
  };
  const A = corner(0), B = corner(1), raw = [A.r, B.l, B.mid, B.r, A.l, A.mid].filter(Boolean), out = [];
  for (const q of raw) if (!out.length || Math.hypot(q[0] - out[out.length - 1][0], q[1] - out[out.length - 1][1]) > 1e-6) out.push([q[0], q[1]]);
  if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 1e-6) out.pop();
  return out.length >= 3 ? out : null;
}
function prismPolys(fp0, z0, z1) {
  const fp = ccw(fp0), n = fp.length, out = [], tri = THREE.ShapeUtils.triangulateShape(fp.map(q => new THREE.Vector2(q[0], q[1])), []);
  for (const t of tri) {
    let [a, b, c] = t.map(i => fp[i]); if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0) [b, c] = [c, b];
    out.push(new BOOL.Poly([[a[0], a[1], z1], [b[0], b[1], z1], [c[0], c[1], z1]], null)); out.push(new BOOL.Poly([[a[0], a[1], z0], [c[0], c[1], z0], [b[0], b[1], z0]], null));
  }
  for (let i = 0; i < n; i++) { const a = fp[i], b = fp[(i + 1) % n]; out.push(new BOOL.Poly([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], null)); }
  return out;
}
function ccw(fp) { let s = 0; for (let i = 0; i < fp.length; i++) { const a = fp[i], b = fp[(i + 1) % fp.length]; s += a[0] * b[1] - b[0] * a[1]; } return s < 0 ? fp.slice().reverse() : fp; }
/* regenera la geometria d'un element paramètric dins del contenidor c (off = desplaçament del contenidor) */
/* v18 · cotes d'un element: base = nivell + desfasament; límit superior segons el mode d'alçada */
const PAR_TOL = 0.02, isVert = par => par.type === 'wall' || par.type === 'column' || par.type === 'stair', offKey = par => isVert(par) ? 'bo' : 'off';
function parZ(model, par) {
  const lvE = levelElev(model, par.lv), base = lvE + (par.bo || 0); let top, e = null, warn = null;
  if (par.hm === 'roof') return { base, top: base + par.h, warn };
  if (par.hm === 'fix') top = base + par.h;
  else { if (par.hm === 'lvl') { const l = model.levels.find(x => x.id === par.hl); e = l ? l.elev : null; } else { const n = nextLevelAbove(model, lvE); e = n ? n.elev : null; }
    if (e == null) { top = base + par.h; warn = 'No hi ha nivell superior: s’aplica l’alçada fixa de ' + fmt(par.h) + ' m.'; } else top = e + (par.to || 0); }
  if (top < base + 0.01) { top = base + par.h; warn = 'El límit superior queda per sota de la base: s’aplica l’alçada fixa de ' + fmt(par.h) + ' m.'; }
  return { base, top, warn };
}
/* reassigna el nivell base quan l'element s'ha mogut o copiat dz en vertical */
function parRelevel(model, g, dz) {
  const par = g.par, k = offKey(par), o = par[k] || 0, old = par.lv, z = levelElev(model, old) + o + dz, L = model.levels.slice().sort((x, y) => x.elev - y.elev);
  if (!L.length) { par[k] = o + dz; return; }
  let nl = L.find(l => Math.abs(z - o - l.elev) < PAR_TOL), no = o;
  if (!nl) { nl = L.find(l => Math.abs(z - l.elev) < PAR_TOL); no = 0; }
  if (!nl) { nl = L.filter(l => l.elev <= z + 1e-9).pop() || L[0]; no = z - nl.elev; }
  if (isVert(par) && par.hm === 'lvl' && nl.id !== old) {
    const i0 = L.findIndex(l => l.id === old), i1 = L.findIndex(l => l.id === par.hl), t = L[L.findIndex(l => l.id === nl.id) + (i1 - i0)];
    if (i0 >= 0 && i1 > i0 && t) par.hl = t.id; else { const zz = parZ(model, par); par.h = Math.max(0.1, zz.top - zz.base); par.hm = 'fix'; }
  }
  par.lv = nl.id; par[k] = Math.abs(no) < 1e-9 ? 0 : +no.toFixed(6); g.level = nl.id;
}
function rotRect(c, w, d, rot) { const a = (rot || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a); return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(q => [c[0] + q[0] * ca - q[1] * sa, c[1] + q[0] * sa + q[1] * ca]); }
function circPts(c, r, n) { const o = []; for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n; o.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } return o; }
/* regenera la geometria dels elements paramètrics del contenidor c (off = desplaçament del contenidor) */
function regenContainer(model, c, off) {
  const pars = [...c.groups.values()].filter(g => g.par); if (!pars.length) return;
  for (const g of pars) { /* el moviment del grup passa als paràmetres: XY a la geometria, Z al nivell i desfasament */
    const par = g.par; if (!g.t[0] && !g.t[1] && !g.t[2]) continue;
    if (par.type === 'comp' && par.host != null && c.groups.get(par.host)) { compBake(c, g); continue; }
    if (g.t[0] || g.t[1]) { for (const k of ['a', 'b', 'p']) if (par[k]) par[k] = [par[k][0] + g.t[0], par[k][1] + g.t[1]]; if (par.pts) par.pts = par.pts.map(q => [q[0] + g.t[0], q[1] + g.t[1]]); if (par.extra) for (const e of par.extra) e.p = [e.p[0] + g.t[0], e.p[1] + g.t[1]]; }
    if (Math.abs(g.t[2]) > 1e-9) parRelevel(model, g, g.t[2]);
    g.t = [0, 0, 0];
  }
  const walls = pars.filter(g => g.par.type === 'wall'), strips = pars.filter(g => g.par.type === 'strip'), empty = g => { g.verts = new Map(); g.edges = new Map(); g.faces = new Map(); }, holes = compHoles(c, pars);
  for (const g of pars) {
    if (g.par.type === 'comp') { compRegen(model, c, g, off); continue; }
    if (g.par.type === 'roof') { roofRegen(model, c, g, off); continue; }
    if (g.par.type === 'stair') { stairRegen(model, c, g, off); continue; }
    const par = g.par, ref = levelElev(model, par.lv) + (par.off || 0); let polys = []; g.warn = null;
    if (par.type === 'wall') {
      const fp = wallFootprint(g, walls); if (!fp) { empty(g); continue; }
      const z = parZ(model, par); g.warn = z.warn; polys = par.hm === 'roof' ? roofWallPolys(model, c, g, fp, z.base) : prismPolys(fp, z.base, z.top);
      for (const o of (par.openings || []).concat(holes.get(g.id) || [])) {
        const F = wframe(g), lo = F.lo - 0.05, hi = F.hi + 0.05, P = (s, w) => [par.a[0] + F.d[0] * s + F.n[0] * w, par.a[1] + F.d[1] * s + F.n[1] * w];
        const box = [P(o.s, lo), P(o.s + o.w, lo), P(o.s + o.w, hi), P(o.s, hi)];
        polys = BOOL.subtract(polys, prismPolys(box, z.base + o.sill, z.base + o.sill + o.h));
      }
    } else if (par.type === 'slab') polys = par.face === 'bot' ? prismPolys(par.pts, ref, ref + par.t) : prismPolys(par.pts, ref - par.t, ref);
    else if (par.type === 'column') { const z = parZ(model, par); g.warn = z.warn; polys = prismPolys(par.shape === 'circ' ? circPts(par.p, par.w / 2, 24) : rotRect(par.p, par.w, par.d, par.rot), z.base, z.top); }
    else if (par.type === 'pad') polys = prismPolys(rotRect(par.p, par.w, par.d, par.rot), ref - par.t, ref);
    else if (par.type === 'strip') { const fp = wallFootprint(g, strips); if (!fp) { empty(g); continue; } polys = prismPolys(fp, ref - par.d, ref); }
    const local = polys.map(q => new BOOL.Poly(q.v.map(v => [v[0] - off[0], v[1] - off[1], v[2] - off[2]]), q.mat));
    if (!local.length) { empty(g); continue; }
    const tmp = polysToGroup(local, c, g, g.name);
    g.verts = tmp.g.verts; g.edges = tmp.g.edges; g.faces = tmp.g.faces;
  }
}
/* rotació / escala / simetria d'un element paramètric: es transformen els paràmetres, no la malla */
function parXform(g, off, fn) {
  if (g.par.type === 'comp' && g.par.host != null) return;
  const par = g.par, z0 = levelElev(S.model, par.lv) + (par[offKey(par)] || 0), T = q => { const r = fn([q[0] + off[0], q[1] + off[1], z0 + off[2]]); return [r[0] - off[0], r[1] - off[1], r[2] - off[2]]; };
  let dz = 0; const ref = par.a || par.p || par.pts[0], o0 = T(ref), ox = T([ref[0] + 1, ref[1]]), da = Math.atan2(ox[1] - o0[1], ox[0] - o0[0]) * 180 / Math.PI; dz = o0[2] - z0;
  for (const k of ['a', 'b', 'p']) if (par[k]) { const r = T(par[k]); par[k] = [r[0], r[1]]; } if (par.pts) par.pts = par.pts.map(q => { const r = T(q); return [r[0], r[1]]; }); if (par.extra) for (const e of par.extra) { const r = T(e.p); e.p = [r[0], r[1]]; }
  if (par.type === 'column' || par.type === 'pad' || par.type === 'comp' || par.type === 'stair') par.rot = +(((par.rot || 0) + da) % 360).toFixed(4);
  if (Math.abs(dz) > 1e-9) g.t = [0, 0, dz];
}
function regenPar() { if (!S.model) return; eachContainer(S.model.root, [0, 0, 0], (c, off) => regenContainer(S.model, c, off)); }
function makeWall(a, b) {
  pushUndo(); const { c } = ctxInfo(); const lv = S.level, base = levelElev(S.model, lv), nx = nextLevelAbove(S.model, base);
  const par = { type: 'wall', a: [a[0], a[1]], b: [b[0], b[1]], t: OPT.wallT, just: OPT.wallJust, hm: OPT.wallHm, h: OPT.wallH, hl: nx ? nx.id : null, bo: 0, to: 0, lv, openings: [] };
  const g = addPar(c, par, 'Mur', 'IfcWall', lv);
  clearSel(); S.sel.groups.add(g.id); refreshAll(); return g;
}
TOOLS.wall = {
  move(ev, mx, my) {
    const pk = pick(mx, my, { from: st.from, lock: LOCK }); st.pk = pk; clearPrev();
    if (st.from) { const L = V.dist(st.from, pk.p); prevLine([st.from, pk.p], pk.axis != null ? AX_COL[pk.axis] : 0x1B1D21); showTip(mx, my, pk, fmtM(L) + ' · gruix ' + fmt(OPT.wallT)); $('vcb').value = fmt(OPT.wallT); }
    else showTip(mx, my, pk);
  },
  down(ev, mx, my) {
    const pk = pick(mx, my, { from: st.from, lock: LOCK });
    if (!st.from) { st.from = pk.p; return; }
    this.seg(pk.p);
  },
  seg(p) { if (V.dist(st.from, p) < K.TOL) return; makeWall(st.from, p); LOCK = null; clearPrev(); st.from = p.slice(); },
  vcb(txt) { const v = parseNum(txt); if (v == null || v <= 0.02) return; OPT.wallT = v; saveOpts(); toast('Gruix predeterminat ' + fmt(v) + ' m'); },
  hintExtra: 'Escriu el gruix al VCB (per defecte a Opcions).',
};
/* v12 · forjat, pilar i obertura */
const slabBase = () => S.tool === 'matf', slabKey = () => slabBase() ? 'matT' : 'slabT';
function slabPar(pts) { const base = slabBase(); return [{ type: 'slab', kind: base ? 'base' : 'floor', pts, t: OPT[slabKey()], off: 0, face: 'top', lv: S.level }, base ? 'Llosa de fonamentació' : 'Forjat']; }
function makeSlab(p1, p2) {
  pushUndo(); const { c } = ctxInfo(); const x0 = Math.min(p1[0], p2[0]), x1 = Math.max(p1[0], p2[0]), y0 = Math.min(p1[1], p2[1]), y1 = Math.max(p1[1], p2[1]);
  const [par, nm] = slabPar([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), g = addPar(c, par, nm, 'IfcSlab', par.lv); clearSel(); S.sel.groups.add(g.id); refreshAll(); return g;
}
function makeColumn(p) {
  pushUndo(); const { c } = ctxInfo(), lv = S.level;
  const par = { type: 'column', p: [p[0], p[1]], w: OPT.colW, d: OPT.colD, shape: 'rect', rot: 0, hm: OPT.wallHm, h: OPT.wallH, hl: null, bo: 0, to: 0, lv };
  const nx = nextLevelAbove(S.model, levelElev(S.model, lv)); par.hl = nx ? nx.id : null;
  const g = addPar(c, par, 'Pilar', 'IfcColumn', lv); clearSel(); S.sel.groups.add(g.id); refreshAll(); return g;
}
/* v18 · sabates: aïllada (sota un pilar o en un punt) i correguda (sota un mur o per una línia) */
function parAt(en, c, type) {
  if (!en || (en.type !== 'face' && en.type !== 'group')) return null;
  for (const g of c.groups.values()) if (g.par && g.par.type === type && (en.type === 'group' ? g.id === en.id : g.faces.has(en.id))) return g;
  return null;
}
function makePad(p, host) {
  pushUndo(); const { c } = ctxInfo(), hp = host && host.par;
  const par = { type: 'pad', p: hp ? hp.p.slice() : [p[0], p[1]], w: hp ? Math.max(OPT.padW, hp.w + 0.4) : OPT.padW, d: hp ? Math.max(OPT.padD, (hp.shape === 'circ' ? hp.w : hp.d) + 0.4) : OPT.padD, t: OPT.padT, rot: hp ? hp.rot || 0 : 0, off: hp ? hp.bo || 0 : 0, lv: hp ? hp.lv : S.level };
  const g = addPar(c, par, 'Sabata aïllada', 'IfcFooting', par.lv); clearSel(); S.sel.groups.add(g.id); refreshAll(); return g;
}
function makeStrip(a, b, host) {
  pushUndo(); const { c } = ctxInfo(), hp = host && host.par; let A = a && [a[0], a[1]], B = b && [b[0], b[1]], w = OPT.stripW;
  if (hp) { const F = wframe(host), m = (F.lo + F.hi) / 2; A = [hp.a[0] + F.n[0] * m, hp.a[1] + F.n[1] * m]; B = [hp.b[0] + F.n[0] * m, hp.b[1] + F.n[1] * m]; w = Math.max(OPT.stripW, hp.t + 0.3); }
  const par = { type: 'strip', a: A, b: B, t: w, just: 'c', d: OPT.stripD, off: hp ? hp.bo || 0 : 0, lv: hp ? hp.lv : S.level };
  const g = addPar(c, par, 'Sabata correguda', 'IfcFooting', par.lv); clearSel(); S.sel.groups.add(g.id); refreshAll(); return g;
}
TOOLS.pad = {
  move(ev, mx, my) { const pk = pick(mx, my); st.pk = pk; const { c } = ctxInfo(), h = parAt(pickEntity(mx, my), c, 'column'); showTip(mx, my, pk, h ? 'Sota el pilar «' + h.name + '» (centrada i girada com el pilar)' : fmt(OPT.padW) + ' × ' + fmt(OPT.padD) + ' × ' + fmt(OPT.padT)); },
  down(ev, mx, my) { const { c } = ctxInfo(), h = parAt(pickEntity(mx, my), c, 'column'), pk = pick(mx, my); makePad(pk.p, h); },
  vcb(txt) { const a = txt.split(/[;x×]/).map(parseNum); if (a[0] == null || a[0] <= 0.1) return; OPT.padW = a[0]; OPT.padD = a[1] > 0.1 ? a[1] : a[0]; if (a[2] > 0.05) OPT.padT = a[2]; saveOpts(); toast('Sabata ' + fmt(OPT.padW) + ' × ' + fmt(OPT.padD) + ' × ' + fmt(OPT.padT)); },
  hintExtra: 'Clic sobre un pilar: sabata centrada a sota · clic en un punt: sabata lliure · «amplada;llargada;cantell» al VCB.',
};
TOOLS.strip = {
  move(ev, mx, my) {
    const pk = pick(mx, my, { from: st.from, lock: LOCK }); st.pk = pk; clearPrev(); const { c } = ctxInfo(), h = st.from ? null : parAt(pickEntity(mx, my), c, 'wall');
    if (st.from) { prevLine([st.from, pk.p], 0x1B1D21); showTip(mx, my, pk, fmtM(V.dist(st.from, pk.p)) + ' · ' + fmt(OPT.stripW) + ' × ' + fmt(OPT.stripD)); } else showTip(mx, my, pk, h ? 'Sota el mur «' + h.name + '» (tot l’eix)' : null);
  },
  down(ev, mx, my) {
    const { c } = ctxInfo(), pk = pick(mx, my, { from: st.from, lock: LOCK });
    if (!st.from) { const h = parAt(pickEntity(mx, my), c, 'wall'); if (h) { makeStrip(null, null, h); return; } st.from = pk.p; return; }
    if (V.dist(st.from, pk.p) < K.TOL) return; makeStrip(st.from, pk.p); LOCK = null; clearPrev(); st.from = pk.p.slice();
  },
  vcb(txt) { const a = txt.split(/[;x×]/).map(parseNum); if (a[0] == null || a[0] <= 0.1) return; OPT.stripW = a[0]; if (a[1] > 0.05) OPT.stripD = a[1]; saveOpts(); toast('Sabata correguda ' + fmt(OPT.stripW) + ' × ' + fmt(OPT.stripD)); },
  hintExtra: 'Clic sobre un mur: sabata sota tot el mur · dos clics: tram lliure encadenat · «amplada;cantell» al VCB.',
};
function wallAt(en, c) {
  if (!en || (en.type !== 'face' && en.type !== 'group')) return null;
  if (en.type === 'group') { const g = c.groups.get(en.id); return g && g.par && g.par.type === 'wall' ? g : null; }
  for (const g of c.groups.values()) if (g.par && g.par.type === 'wall' && g.faces.has(en.id)) return g;
  return null;
}
function addOpening(W, pt, w, h, sill, kind) {
  const par = W.par, F = wframe(W), L = F.L;
  let s = (pt[0] - par.a[0]) * F.d[0] + (pt[1] - par.a[1]) * F.d[1] - w / 2; s = Math.max(0, Math.min(L - w, s));
  pushUndo(); par.openings.push({ s, w, h, sill, kind }); refreshAll(); toast((kind === 'IfcDoor' ? 'Porta' : 'Finestra') + ' afegida al mur');
}
function makeSlabPoly(pts) {
  let ar = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; ar += a[0] * b[1] - b[0] * a[1]; } if (pts.length < 3 || Math.abs(ar) < 1e-4) { toast('El contorn del forjat no té àrea.'); return null; }
  pushUndo(); const { c } = ctxInfo(), [par, nm] = slabPar(pts.map(q => [q[0], q[1]])), g = addPar(c, par, nm, 'IfcSlab', par.lv); clearSel(); S.sel.groups.add(g.id); refreshAll(); return g;
}
TOOLS.slab = {
  move(ev, mx, my) {
    const pk = pick(mx, my); st.pk = pk; clearPrev();
    if (!st.p1) { showTip(mx, my, pk); return; }
    if (st.poly) { prevLine([...st.poly, pk.p], 0x1B1D21, st.poly.length > 1); showTip(mx, my, pk, st.poly.length + ' punts · clica el primer punt per tancar'); return; }
    const a = st.p1, b = pk.p, q = [[a[0], a[1], a[2]], [b[0], a[1], a[2]], [b[0], b[1], a[2]], [a[0], b[1], a[2]]];
    prevLine(q, 0x1B1D21, true); showTip(mx, my, pk, fmt(Math.abs(b[0] - a[0])) + ' ; ' + fmt(Math.abs(b[1] - a[1])) + ' · gruix ' + fmt(OPT[slabKey()]));
  },
  down(ev, mx, my) {
    const pk = pick(mx, my);
    if (!st.p1) { st.p1 = pk.p; return; }
    if (st.poly || ev.shiftKey) {
      if (!st.poly) st.poly = [st.p1];
      if (st.poly.length >= 3 && V.dist(pk.p, st.poly[0]) < Math.max(0.05, K.TOL)) { const pts = st.poly; cancelTool(); makeSlabPoly(pts); return; }
      st.poly.push(pk.p); return;
    }
    if (Math.abs(pk.p[0] - st.p1[0]) < K.TOL || Math.abs(pk.p[1] - st.p1[1]) < K.TOL) return;
    makeSlab(st.p1, pk.p); cancelTool();
  },
  key(ev) { if (ev.key === 'Enter' && st.poly && st.poly.length >= 3) { const pts = st.poly; cancelTool(); makeSlabPoly(pts); return true; } return false; },
  vcb(txt) { const v = parseNum(txt); if (v == null || v <= 0.02) return; OPT[slabKey()] = v; saveOpts(); toast('Gruix ' + fmt(v) + ' m'); },
  hintExtra: 'Dos clics: rectangle · Maj+clic: contorn punt a punt (tanca al primer punt o amb Intro) · gruix al VCB.',
};
TOOLS.matf = TOOLS.slab;
TOOLS.column = {
  move(ev, mx, my) { const pk = pick(mx, my); st.pk = pk; showTip(mx, my, pk, fmt(OPT.colW) + ' × ' + fmt(OPT.colD)); },
  down(ev, mx, my) { const pk = pick(mx, my); makeColumn(pk.p); },
  vcb(txt) { const a = txt.split(/[;x×]/).map(parseNum); if (a[0] == null || a[0] <= 0.05) return; OPT.colW = a[0]; OPT.colD = a[1] != null && a[1] > 0.05 ? a[1] : a[0]; saveOpts(); toast('Secció del pilar ' + fmt(OPT.colW) + ' × ' + fmt(OPT.colD)); },
  hintExtra: 'Clic a la posició del pilar · secció «amplada;fondària» al VCB.',
};
TOOLS.opening = {
  move(ev, mx, my) { const pk = pick(mx, my); st.pk = pk; const { c } = ctxInfo(); const W = wallAt(pickEntity(mx, my), c); showTip(mx, my, pk, W ? 'Mur: clic per obrir' : 'Assenyala un mur'); },
  down(ev, mx, my) {
    const { c } = ctxInfo(); const W = wallAt(pickEntity(mx, my), c); if (!W) { toast('Assenyala un mur'); return; }
    const pk = pick(mx, my), kind = S.ifcActive === 'IfcDoor' ? 'IfcDoor' : 'IfcWindow';
    const door = kind === 'IfcDoor', w = st.ow || (door ? 0.90 : 1.20), h = st.oh || (door ? 2.10 : 1.20), sill = st.osill != null ? st.osill : (door ? 0 : 0.90);
    addOpening(W, pk.p, w, h, sill, kind);
  },
  vcb(txt) { const a = txt.split(/[;x×]/).map(parseNum); if (a[0] == null || a[0] <= 0.1) return; st.ow = a[0]; if (a[1] != null) st.oh = a[1]; if (a[2] != null) st.osill = a[2]; toast('Obertura ' + fmt(st.ow) + ' × ' + fmt(st.oh || 0) + ' · ampit ' + fmt(st.osill || 0)); },
  hintExtra: 'Clic a un mur · «amplada;alçada;ampit» al VCB.',
};

/* v15 · panell de propietats dels elements paramètrics */
function parPanel(b, g) {
  const par = g.par, L = S.model.levels.slice().sort((x, y) => x.elev - y.elev), up = fn => { pushUndo(); fn(); refreshAll(); };
  const row = (lab, node) => { const r = el('div', 'kv'); r.style.margin = '3px 0'; r.appendChild(el('span', '', esc(lab))); const w = el('span'); w.appendChild(node); r.appendChild(w); b.appendChild(r); return node; };
  const num = (lab, key, mn, mx, obj, k) => { const o = obj || par, i = el('input'); i.type = 'number'; i.step = 0.01; i.min = mn; i.max = mx; i.value = +(+o[key]).toFixed(4); i.style.width = '70px'; i.dataset.par = k || key; i.onchange = () => { const v = parseFloat(i.value); if (isFinite(v)) up(() => { o[key] = Math.min(mx, Math.max(mn, v)); }); }; return row(lab, i); };
  const sel = (lab, key, opts, cb) => { const i = el('select', '', opts.map(([k, l]) => '<option value="' + k + '"' + (String(par[key]) === String(k) ? ' selected' : '') + '>' + esc(l) + '</option>').join('')); i.dataset.par = key; i.onchange = () => up(() => { cb ? cb(i.value) : (par[key] = i.value); }); return row(lab, i); };
  const lvlOpts = L.map(l => [l.id, l.name + '  ' + fmtElev(l.elev)]);
  const height = () => { const rf = par.type === 'wall' ? roofsIn(ctxInfo().c) : []; sel('Alçada', 'hm', [['next', 'Fins al nivell de sobre'], ['lvl', 'Fins a un nivell'], ['fix', 'Alçada fixa']].concat(rf.length || par.hm === 'roof' ? [['roof', 'Fins a una coberta']] : []), v => { par.hm = v; if (v === 'roof' && !rf.some(r => r.id === par.hr)) par.hr = rf[0] ? rf[0].id : null; }); if (par.hm === 'roof') { sel('Coberta', 'hr', rf.map(r => [r.id, r.name]), v => { par.hr = +v; }); return; } if (par.hm === 'lvl') sel('Nivell superior', 'hl', lvlOpts, v => { par.hl = +v; }); if (par.hm !== 'fix') off('Desfasament superior (m)', 'to'); if (par.hm === 'fix' || par.hm === 'lvl' && !(levelElev(S.model, par.hl) > levelElev(S.model, par.lv))) num('Alçada (m)', 'h', 0.1, 100); };
  if (par.type === 'comp') { compPanel(b, g, { row, num, sel, up, lvlOpts }); return; }
  if (par.type === 'roof') { roofPanel(b, g, { row, num, sel, up, lvlOpts }); return; }
  if (par.type === 'stair') { stairPanel(b, g, { row, num, sel, up, lvlOpts }); return; }
  const off = (lab, key) => { if (par[key] == null) par[key] = 0; return num(lab, key, -100, 100); };
  b.appendChild(el('div', 'row hd', { wall: 'Mur paramètric', slab: par.kind === 'base' ? 'Llosa de fonamentació' : 'Forjat paramètric', column: 'Pilar paramètric', pad: 'Sabata aïllada', strip: 'Sabata correguda' }[par.type]));
  if (g.warn) b.appendChild(el('div', 'empty', '⚠ ' + esc(g.warn)));
  sel(isVert(par) ? 'Nivell base' : 'Nivell', 'lv', lvlOpts, v => { par.lv = +v; g.level = +v; });
  off(isVert(par) ? 'Desfasament de base (m)' : 'Desfasament (m)', offKey(par));
  if (par.type === 'wall') {
    num('Gruix (m)', 't', 0.03, 3); sel('Justificació', 'just', [['c', 'Centre'], ['l', 'Esquerra'], ['r', 'Dreta']]); height();
    const F = wframe(g); row('Longitud de l’eix', el('span', 'mono', F ? fmtM(F.L) : '—'));
    b.appendChild(el('div', 'row hd', 'Obertures (' + par.openings.length + ')'));
    par.openings.forEach((o, i) => {
      const r = el('div', 'row'); r.style.flexWrap = 'wrap'; r.style.gap = '4px';
      const k = el('select', '', '<option value="IfcWindow"' + (o.kind !== 'IfcDoor' ? ' selected' : '') + '>Finestra</option><option value="IfcDoor"' + (o.kind === 'IfcDoor' ? ' selected' : '') + '>Porta</option>'); k.onchange = () => up(() => { o.kind = k.value; }); r.appendChild(k);
      for (const [key, tt, mn, mx] of [['s', 'Posició des de l’inici', 0, 1000], ['w', 'Amplada', 0.1, 50], ['h', 'Alçada', 0.1, 50], ['sill', 'Ampit', 0, 50]]) { const i = el('input'); i.type = 'number'; i.step = 0.01; i.title = tt; i.value = +(+o[key]).toFixed(3); i.style.width = '52px'; i.dataset.op = i + ''; i.dataset.op = key + i; i.onchange = () => { const v = parseFloat(i.value); if (isFinite(v)) up(() => { o[key] = Math.min(mx, Math.max(mn, v)); }); }; r.appendChild(i); }
      r.querySelectorAll('input').forEach((inp, j) => { inp.dataset.op = ['s', 'w', 'h', 'sill'][j] + i; });
      const x = el('button', 'btn sm', '✕'); x.title = 'Esborra l’obertura'; x.dataset.opdel = i; x.onclick = () => up(() => { par.openings.splice(i, 1); }); r.appendChild(x); b.appendChild(r);
    });
    if (par.openings.length) b.appendChild(el('div', 'empty', 'Posició · amplada · alçada · ampit (m)'));
  } else if (par.type === 'slab') { if (!par.face) par.face = 'top'; num('Gruix (m)', 't', 0.03, 5); sel('El nivell és', 'face', [['top', 'La cara superior'], ['bot', 'La cara inferior']]); let ar = 0; const q = par.pts; for (let i = 0; i < q.length; i++) { const a = q[i], c = q[(i + 1) % q.length]; ar += a[0] * c[1] - c[0] * a[1]; } row('Àrea', el('span', 'mono', fmt(Math.abs(ar) / 2) + ' m²')); }
  else if (par.type === 'column') { if (!par.shape) par.shape = 'rect'; if (par.rot == null) par.rot = 0; sel('Secció', 'shape', [['rect', 'Rectangular'], ['circ', 'Circular']]); num(par.shape === 'circ' ? 'Diàmetre (m)' : 'Amplada (m)', 'w', 0.05, 5); if (par.shape !== 'circ') { num('Fondària (m)', 'd', 0.05, 5); num('Rotació (°)', 'rot', -360, 360); } height(); }
  else if (par.type === 'pad') { num('Amplada (m)', 'w', 0.1, 20); num('Llargada (m)', 'd', 0.1, 20); num('Cantell (m)', 't', 0.05, 5); num('Rotació (°)', 'rot', -360, 360); }
  else if (par.type === 'strip') { num('Amplada (m)', 't', 0.1, 20); num('Cantell (m)', 'd', 0.05, 5); const F = wframe(g); row('Longitud de l’eix', el('span', 'mono', F ? fmtM(F.L) : '—')); }
}
/* tipus predefinit IFC d'un element paramètric */
function parPdt(par) { return !par ? null : par.type === 'pad' ? '.PAD_FOOTING.' : par.type === 'strip' ? '.STRIP_FOOTING.' : par.type === 'slab' ? (par.kind === 'base' ? '.BASESLAB.' : '.FLOOR.') : par.type === 'roof' ? roofSolids(S.model, par).kind : par.type === 'stair' ? stairPdt(par) : null; }
function parById() { const m = new Map(); eachContainer(S.model.root, [0, 0, 0], c => { for (const g of c.groups.values()) if (g.par) m.set(g.id, g.par); }); return m; }
/* v15 · IFC: buit, finestra/porta i relacions per a cada obertura d'un mur */
function boxFaces(q, z0, z1) {
  const dn = q.map(p => [p[0], p[1], z0]), up = q.map(p => [p[0], p[1], z1]), fs = [{ o: up, h: [], n: [0, 0, 1], mat: null }, { o: dn.slice().reverse(), h: [], n: [0, 0, -1], mat: null }];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4, e = V.sub(dn[j], dn[i]), n = V.norm([e[1], -e[0], 0]); fs.push({ o: [dn[i], dn[j], up[j], up[i]], h: [], n, mat: null }); }
  return fs;
}
function openingEls() {
  const out = [];
  eachContainer(S.model.root, [0, 0, 0], (c, off) => { for (const g of c.groups.values()) {
    if (g.par && g.par.type === 'comp' && g.par.host != null && g.par.cut !== false) { const W = c.groups.get(g.par.host), d = compDef(g.par.cid), F = W && W.par && W.ifc && wframe(W); if (F && d && g.ifc) { const z0 = parZ(S.model, W.par).base + (g.par.sill || 0) + off[2], P = (s, w) => [W.par.a[0] + off[0] + F.d[0] * s + F.n[0] * w, W.par.a[1] + off[1] + F.d[1] * s + F.n[1] * w];
      out.push({ kind: 'bim', name: 'Buit · ' + g.name, ifc: 'IfcOpeningElement', level: W.level, tag: W.tag, id: 'opc' + g.id, faces: boxFaces([P(g.par.s, F.lo), P(g.par.s + d.size[0], F.lo), P(g.par.s + d.size[0], F.hi), P(g.par.s, F.hi)], z0, z0 + d.size[2]), edges: [], voids: W.id, filledBy: g.id }); } continue; }
    if (!g.par || g.par.type !== 'wall' || !g.par.openings.length || !g.ifc) continue; const F = wframe(g); if (!F) continue; const base = levelElev(S.model, g.par.lv) + (g.par.bo || 0) + off[2];
    g.par.openings.forEach((o, i) => {
      const P = (s, w) => [F.p.a[0] + off[0] + F.d[0] * s + F.n[0] * w, F.p.a[1] + off[1] + F.d[1] * s + F.n[1] * w], mid = (F.lo + F.hi) / 2, z0 = base + o.sill, z1 = z0 + o.h, door = o.kind === 'IfcDoor';
      const rect = (a, b2) => [P(o.s, a), P(o.s + o.w, a), P(o.s + o.w, b2), P(o.s, b2)];
      out.push({ kind: 'bim', name: 'Buit ' + (i + 1) + ' · ' + g.name, ifc: 'IfcOpeningElement', level: g.level, tag: g.tag, id: 'op' + g.id + '_' + i, faces: boxFaces(rect(F.lo, F.hi), z0, z1), edges: [], voids: g.id });
      out.push({ kind: 'bim', name: (door ? 'Porta ' : 'Finestra ') + (i + 1) + ' · ' + g.name, ifc: door ? 'IfcDoor' : 'IfcWindow', level: g.level, tag: g.tag, id: 'fl' + g.id + '_' + i, faces: boxFaces(rect(mid - 0.025, mid + 0.025), z0, z1), edges: [], fills: 'op' + g.id + '_' + i, ow: o.w, oh: o.h });
    });
  } });
  return out;
}
