/* ============================================================
   guaitaBIMup 10 — sòlids amb booleanes (CSG per BSP)
   Unió · Intersecció · Resta (A−B) · Retall (A−B, B es conserva) · Divisió
   La tolerància és configurable a Fitxer ▸ Configuració (meta.tol, 1e-6 m).
   ============================================================ */
const TOL_DEF = 1e-6;
function TOLB() { const t = S.model && S.model.meta && +S.model.meta.tol; return t > 0 ? t : TOL_DEF; }

const BOOL = (() => {
  let EPS = TOL_DEF;
  const nrm = (a, b, c) => V.norm(V.cross(V.sub(b, a), V.sub(c, a)));
  class Poly { constructor(v, mat, pl) { this.v = v; this.mat = mat; if (pl) this.pl = pl; else { const n = nrm(v[0], v[1], v[2]); this.pl = { n, w: V.dot(n, v[0]) }; } } clone() { return new Poly(this.v.map(p => p.slice()), this.mat, { n: this.pl.n.slice(), w: this.pl.w }); } flip() { this.v.reverse(); this.pl = { n: this.pl.n.map(x => -x), w: -this.pl.w }; } }
  function splitPoly(pl, poly, cf, cb, f, b) {
    let pt = 0; const ty = [];
    for (const v of poly.v) { const t = V.dot(pl.n, v) - pl.w, k = t < -EPS ? 2 : t > EPS ? 1 : 0; pt |= k; ty.push(k); }
    if (pt === 0) (V.dot(pl.n, poly.pl.n) > 0 ? cf : cb).push(poly);
    else if (pt === 1) f.push(poly); else if (pt === 2) b.push(poly);
    else {
      const F = [], B = [], n = poly.v.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, ti = ty[i], tj = ty[j], vi = poly.v[i], vj = poly.v[j];
        if (ti !== 2) F.push(vi); if (ti !== 1) B.push(ti !== 2 ? vi.slice() : vi);
        if ((ti | tj) === 3) { const t = (pl.w - V.dot(pl.n, vi)) / V.dot(pl.n, V.sub(vj, vi)), v = V.add(vi, V.mul(V.sub(vj, vi), t)); F.push(v); B.push(v.slice()); }
      }
      if (F.length >= 3) f.push(new Poly(F, poly.mat, poly.pl)); if (B.length >= 3) b.push(new Poly(B, poly.mat, poly.pl));
    }
  }
  class Node {
    constructor(polys) { this.pl = null; this.front = null; this.back = null; this.polys = []; if (polys) this.build(polys); }
    invert() { for (const p of this.polys) p.flip(); if (this.pl) this.pl = { n: this.pl.n.map(x => -x), w: -this.pl.w }; if (this.front) this.front.invert(); if (this.back) this.back.invert(); const t = this.front; this.front = this.back; this.back = t; }
    clip(polys) {
      if (!this.pl) return polys.slice(); let f = [], b = [];
      for (const p of polys) splitPoly(this.pl, p, f, b, f, b);
      if (this.front) f = this.front.clip(f); b = this.back ? this.back.clip(b) : []; return f.concat(b);
    }
    clipTo(o) { this.polys = o.clip(this.polys); if (this.front) this.front.clipTo(o); if (this.back) this.back.clipTo(o); }
    all() { let r = this.polys.slice(); if (this.front) r = r.concat(this.front.all()); if (this.back) r = r.concat(this.back.all()); return r; }
    build(polys) {
      if (!polys.length) return; if (!this.pl) this.pl = { n: polys[0].pl.n.slice(), w: polys[0].pl.w };
      const f = [], b = [];
      for (const p of polys) splitPoly(this.pl, p, this.polys, this.polys, f, b);
      if (f.length) { if (!this.front) this.front = new Node(); this.front.build(f); } if (b.length) { if (!this.back) this.back = new Node(); this.back.build(b); }
    }
  }
  const cl = ps => ps.map(p => p.clone());
  const union = (A, B) => { const a = new Node(cl(A)), b = new Node(cl(B)); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.build(b.all()); return a.all(); };
  const subtract = (A, B) => { const a = new Node(cl(A)), b = new Node(cl(B)); a.invert(); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.build(b.all()); a.invert(); return a.all(); };
  const intersect = (A, B) => { const a = new Node(cl(A)), b = new Node(cl(B)); a.invert(); b.clipTo(a); b.invert(); a.clipTo(b); b.clipTo(a); a.build(b.all()); a.invert(); return a.all(); };
  return { Poly, union, subtract, intersect, setEps: e => { EPS = e; } };
})();

/* polígons triangulats i orientats cap enfora d'un grup tancat (coordenades del contenidor) */
function solidPolys(g) {
  const acc = { faces: [], edges: [] }; flatInto(g, g.t, acc);
  const wm = weldElement({ faces: acc.faces, edges: [] }), tol = TOLB(); if (!wm.faces.length) return { err: 'sense cares' };
  if (!wm.closed) return { err: 'no és un sòlid tancat (cada aresta ha de tenir exactament dues cares)' };
  const out = [];
  for (const f of wm.faces) {
    let n = [0, 0, 0]; for (let i = 0; i < f.o.length; i++) { const a = wm.pts[f.o[i]], b = wm.pts[f.o[(i + 1) % f.o.length]]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); } n = V.norm(n);
    for (const t of triIdx(wm.pts, f)) {
      let v = t.map(i => wm.pts[i].slice()); const tn = V.cross(V.sub(v[1], v[0]), V.sub(v[2], v[0]));
      if (V.len(tn) < tol * tol * 10) continue; if (V.dot(tn, n) < 0) v = [v[0], v[2], v[1]];
      out.push(new BOOL.Poly(v, f.mat));
    }
  }
  return { polys: out };
}
function solidVolume(g) { const acc = { faces: [], edges: [] }; flatInto(g, g.t, acc); const wm = weldElement({ faces: acc.faces, edges: [] }); if (!wm.closed) return NaN; let vol = 0; for (const { t } of tris(wm)) { const a = wm.pts[t[0]], b = wm.pts[t[1]], c = wm.pts[t[2]]; vol += V.dot(a, V.cross(b, c)) / 6; } return Math.abs(vol); }

/* reconstrueix cares (amb forats) fusionant els fragments coplanars */
function polysToGroup(polys, c, proto, name) {
  const tol = TOLB(), model = S.model, g = K.newContainer(model, 'group');
  g.name = name; g.t = [0, 0, 0]; g.ifc = proto.ifc || S.ifcActive || null; g.level = proto.level == null ? null : proto.level; g.tag = proto.tag || 0;
  /* 1) soldadura de vèrtexs amb graella de cel·la = 2·tol */
  const cell = tol * 2, grid = new Map(), pts = [], gk = (i, j, k) => i + ',' + j + ',' + k;
  const vid = p => {
    const ci = Math.floor(p[0] / cell), cj = Math.floor(p[1] / cell), ck = Math.floor(p[2] / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const l = grid.get(gk(ci + i, cj + j, ck + k)); if (l) for (const id of l) if (V.dist(pts[id], p) <= tol) return id; }
    const id = pts.length; pts.push(p.slice()); const key = gk(ci, cj, ck); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(id); return id;
  };
  let P = [];
  for (const p of polys) { const ids = []; for (const v of p.v) { const i = vid(v); if (!ids.length || ids[ids.length - 1] !== i) ids.push(i); } while (ids.length > 1 && ids[0] === ids[ids.length - 1]) ids.pop(); if (ids.length >= 3) P.push({ ids, mat: p.mat, n: p.pl.n, w: p.pl.w }); }
  /* 2) unions en T: insereix vèrtexs que cauen dins d'una aresta */
  const nV = pts.length; let tj = 0;
  if (nV * P.reduce((s, p) => s + p.ids.length, 0) < 4e7) {
    for (const p of P) {
      const out = []; const m = p.ids.length;
      for (let i = 0; i < m; i++) {
        const a = p.ids[i], b = p.ids[(i + 1) % m]; out.push(a); const A = pts[a], B = pts[b], AB = V.sub(B, A), L2 = V.dot(AB, AB), ins = [];
        for (let q = 0; q < nV; q++) { if (q === a || q === b) continue; const Q = pts[q]; if (Q[0] < Math.min(A[0], B[0]) - tol || Q[0] > Math.max(A[0], B[0]) + tol || Q[1] < Math.min(A[1], B[1]) - tol || Q[1] > Math.max(A[1], B[1]) + tol || Q[2] < Math.min(A[2], B[2]) - tol || Q[2] > Math.max(A[2], B[2]) + tol) continue; const t = V.dot(V.sub(Q, A), AB) / L2; if (t <= 0 || t >= 1) continue; if (V.dist(V.add(A, V.mul(AB, t)), Q) <= tol) ins.push([t, q]); }
        ins.sort((x, y) => x[0] - y[0]); for (const [, q] of ins) { out.push(q); tj++; }
      }
      p.ids = out;
    }
  }
  /* 3) agrupa per pla */
  const planes = [];
  for (const p of P) { let pl = planes.find(q => V.dist(q.n, p.n) < 1e-6 + tol && Math.abs(q.w - p.w) < tol * 10 + 1e-9 && q.mat === p.mat); if (!pl) { pl = { n: p.n, w: p.w, mat: p.mat, polys: [] }; planes.push(pl); } pl.polys.push(p); }
  const loopsByPlane = [];
  for (const pl of planes) {
    const dir = new Map(); for (const p of pl.polys) for (let i = 0; i < p.ids.length; i++) { const a = p.ids[i], b = p.ids[(i + 1) % p.ids.length]; if (a === b) continue; const k = a + '>' + b; dir.set(k, (dir.get(k) || 0) + 1); }
    const rem = []; for (const [k, cnt] of dir) { const [a, b] = k.split('>').map(Number); const rv = dir.get(b + '>' + a) || 0; const net = cnt - Math.min(cnt, rv); for (let i = 0; i < net; i++) rem.push([a, b]); }
    const out = new Map(); rem.forEach((e, i) => { if (!out.has(e[0])) out.set(e[0], []); out.get(e[0]).push(i); });
    const used = new Array(rem.length).fill(false), loops = [];
    for (let s = 0; s < rem.length; s++) {
      if (used[s]) continue; const lp = []; let e = s, guard = 0;
      while (e != null && !used[e] && guard++ < 100000) { used[e] = true; lp.push(rem[e][0]); const nx = (out.get(rem[e][1]) || []).filter(i => !used[i]); let pick = nx[0]; if (nx.length > 1) { const bs = K.basis(pl.n), o = pts[rem[e][0]], pa = K.to2D(pts[rem[e][0]], o, bs), pb = K.to2D(pts[rem[e][1]], o, bs), ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]); let best = -1e9; for (const i of nx) { const pc = K.to2D(pts[rem[i][1]], o, bs); let d = Math.atan2(pc[1] - pb[1], pc[0] - pb[0]) - ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (d > best) { best = d; pick = i; } } } e = pick; }
      if (lp.length >= 3) loops.push(lp);
    }
    loopsByPlane.push(loops);
  }
  /* 4) elimina vèrtexs colineals que només usa un pla */
  const use = new Map(); loopsByPlane.forEach((ls, pi) => ls.forEach(l => l.forEach(v => { if (!use.has(v)) use.set(v, new Set()); use.get(v).add(pi); })));
  const clean = l => { let ch = true; l = l.slice(); while (ch && l.length > 3) { ch = false; for (let i = 0; i < l.length; i++) { const a = pts[l[(i + l.length - 1) % l.length]], b = pts[l[i]], d = pts[l[(i + 1) % l.length]]; if (use.get(l[i]).size > 1) continue; const ad = V.sub(d, a), L = V.len(ad); if (L < tol) { l.splice(i, 1); ch = true; break; } if (V.len(V.cross(ad, V.sub(b, a))) / L <= tol) { l.splice(i, 1); ch = true; break; } } } return l; };
  /* 5) classifica contorns i forats, crea cares */
  const vmap = new Map(), gv = i => { if (!vmap.has(i)) { const v = { id: model.nid++, p: pts[i].slice() }; g.verts.set(v.id, v); vmap.set(i, v.id); } return vmap.get(i); };
  let nf = 0;
  planes.forEach((pl, pi) => {
    const bs = K.basis(pl.n), o = pts[loopsByPlane[pi][0] ? loopsByPlane[pi][0][0] : 0] || [0, 0, 0];
    const L = loopsByPlane[pi].map(clean).filter(l => l.length >= 3).map(l => { const q = l.map(i => K.to2D(pts[i], o, bs)); return { l, q, a: K.area2D(q) }; });
    const outers = L.filter(x => x.a > tol * tol), holes = L.filter(x => x.a < -tol * tol);
    const asg = outers.map(() => []);
    for (const h of holes) { let best = -1, ba = Infinity; outers.forEach((ot, i) => { if (ot.a >= ba) return; let ins = 0; for (const q of h.q) if (K.pointInPoly2D(q, ot.q)) ins++; if (ins > h.q.length / 2) { best = i; ba = ot.a; } }); if (best >= 0) asg[best].push(h); }
    outers.forEach((ot, i) => { const f = K.addFaceRaw(model, g, ot.l.map(gv), asg[i].map(h => h.l.map(gv)), pl.mat, pl.n.slice()); f.tag = proto.tag || 0; nf++; for (const lp of [ot.l, ...asg[i].map(h => h.l)]) for (let k = 0; k < lp.length; k++) K.addEdgeRaw(model, g, gv(lp[k]), gv(lp[(k + 1) % lp.length])); });
  });
  return { g, faces: nf, tjunctions: tj };
}

/* operació sobre la selecció: groups seleccionats al contenidor actiu */
const BOOL_NAMES = { union: 'Unió', intersect: 'Intersecció', subtract: 'Resta (A − B)', trim: 'Retall', split: 'Divisió' };
/* Verb primer: si no hi ha dos grups seleccionats, l'operació queda armada fins que se selecciona A i B i es confirma amb Enter. */
function boolArm(op) {
  S.boolPend = op; toast(BOOL_NAMES[op] + ': selecciona els dos grups (primer A, després B) i prem Enter. Esc cancel·la.');
  renderTray(); syncUI();
}
function boolCancel() { if (!S.boolPend) return false; S.boolPend = null; toast('Operació booleana cancel·lada.'); syncUI(); return true; }
function boolConfirm() {
  if (!S.boolPend) return false; const op = S.boolPend, n = S.sel.groups.size;
  if (n < 2) { toast('Falten grups: selecciona A i després B.'); return true; }
  S.boolPend = null; boolOp(op); return true;
}
function boolOp(op) {
  const { c } = ctxInfo(), gs = [...S.sel.groups].map(id => c.groups.get(id)).filter(Boolean);
  if (gs.length < 2) { boolArm(op); return; }
  if (S.boolPend) S.boolPend = null;
  if ((op === 'split') && gs.length !== 2) { toast('La divisió necessita exactament dos grups.'); return; }
  const tol = TOLB(); BOOL.setEps(tol); const sol = [];
  for (const g of gs) { const r = solidPolys(g); if (r.err) { toast('«' + (g.name || 'Grup ' + g.id) + '» ' + r.err + '.'); return; } sol.push(r.polys); }
  const A = sol[0]; let res = [], names = [];
  try {
    if (op === 'union') { let r = A; for (let i = 1; i < sol.length; i++) r = BOOL.union(r, sol[i]); res = [r]; names = ['Unió']; }
    else if (op === 'intersect') { let r = A; for (let i = 1; i < sol.length; i++) r = BOOL.intersect(r, sol[i]); res = [r]; names = ['Intersecció']; }
    else if (op === 'subtract' || op === 'trim') { let r = A; for (let i = 1; i < sol.length; i++) r = BOOL.subtract(r, sol[i]); res = [r]; names = [op === 'trim' ? 'Retall' : 'Resta']; }
    else if (op === 'split') { const B = sol[1]; res = [BOOL.intersect(A, B), BOOL.subtract(A, B), BOOL.subtract(B, A)]; names = ['Intersecció', 'A−B', 'B−A']; }
  } catch (e) { console.error(e); toast('Error en l’operació booleana: ' + e.message); return; }
  const keep = res.map((r, i) => ({ r, n: names[i] })).filter(x => x.r.length >= 4);
  if (!keep.length) { toast('El resultat és buit (els sòlids no es toquen o la tolerància és massa gran).'); return; }
  pushUndo(); const made = [], warn = [];
  for (const { r, n } of keep) {
    const o = polysToGroup(r, c, gs[0], (gs[0].name && !/^Grup \d+$/.test(gs[0].name) ? gs[0].name + ' · ' : '') + n);
    if (!o.faces) continue; c.groups.set(o.g.id, o.g); made.push(o.g);
    const acc = { faces: [], edges: [] }; flatInto(o.g, [0, 0, 0], acc); if (!weldElement({ faces: acc.faces, edges: [] }).closed) warn.push(n);
  }
  if (op === 'trim') { c.groups.delete(gs[0].id); } else for (const g of gs) c.groups.delete(g.id);
  clearSel(); made.forEach(g => S.sel.groups.add(g.id)); refreshAll();
  toast(({ union: 'Unió', intersect: 'Intersecció', subtract: 'Resta', trim: 'Retall', split: 'Divisió' })[op] + ' feta: ' + made.length + ' grup(s)' + (warn.length ? ' — atenció: «' + warn.join('», «') + '» no queda tancat; prova una altra tolerància a Fitxer ▸ Configuració.' : '.'));
  return made;
}
const BOOL_ITEMS = () => [{ l: 'Unió', f: () => boolOp('union') }, { l: 'Intersecció', f: () => boolOp('intersect') }, { l: 'Resta (A − B)', f: () => boolOp('subtract') }, { l: 'Retall (A − B, conserva B)', f: () => boolOp('trim') }, { l: 'Divisió (A∩B, A−B, B−A)', f: () => boolOp('split') }];

/* ---------- Fitxer ▸ Configuració ---------- */
function configDlg() {
  $('dlgBox').innerHTML = '<h3>Configuració</h3><div class="kv" style="margin-bottom:10px"><span>Tolerància geomètrica (m)</span><input type="text" id="cTol" value="' + esc(String(TOLB())) + '" style="font-family:var(--mono)"></div><p class="dim" style="font-size:12px;margin:0 0 10px">Distància màxima per considerar dos punts o dos plans iguals en les booleanes i en la soldadura de vèrtexs de l’exportació. Valor per defecte: 1e-6 (1 µm). Accepta notació científica (p. ex. 1e-5). Es desa amb el model.</p><div id="cErr" style="color:#ff7a7a;font-size:12px;min-height:16px"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="cDef">Per defecte</button><button class="btn" id="cX">Cancel·la</button><button class="btn acc" id="cOk">Aplica</button></div>';
  $('dlg').classList.add('show');
  $('cDef').onclick = () => { $('cTol').value = String(TOL_DEF); };
  $('cX').onclick = () => $('dlg').classList.remove('show');
  $('cOk').onclick = () => { const v = parseFloat(String($('cTol').value).replace(',', '.')); if (!(v >= 1e-12 && v <= 1e-2)) { $('cErr').textContent = 'Valor no vàlid: ha d’estar entre 1e-12 i 1e-2.'; return; } pushUndo(); if (v === TOL_DEF) delete S.model.meta.tol; else S.model.meta.tol = v; $('dlg').classList.remove('show'); toast('Tolerància: ' + v + ' m.'); };
}
