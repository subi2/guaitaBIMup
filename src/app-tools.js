/* ============================================================
   guaitaBIMup 10 — eines, ordres, navegació i ViewCube
   ============================================================ */
let T = null, LOCK = null, lastMouse = { mx: 0, my: 0 };
const st = {};
const pathEq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const pathStarts = (p, pre) => pre.every((x, i) => p[i] === x);
function parseNum(s) {
  s = String(s).trim().toLowerCase().replace(',', '.'); let k = 1;
  if (s.endsWith('mm')) { k = 0.001; s = s.slice(0, -2); } else if (s.endsWith('cm')) { k = 0.01; s = s.slice(0, -2); } else if (s.endsWith('m')) s = s.slice(0, -1);
  const v = parseFloat(s); return isFinite(v) ? v * k : null;
}
function refreshAll() { regenPar(); rebuild(); renderTray(); syncUI(); }
function refreshSel() { rebuildSel(); renderInfo(); syncUI(); }
function setTool(name) { if (!TOOLS[name]) return; cancelTool(); S.tool = name; T = TOOLS[name]; syncUI(); }
function cancelTool() { for (const k of Object.keys(st)) delete st[k]; LOCK = null; clearPrev(); setHover(null); gSel.position.set(0, 0, 0); $('vcb').value = ''; $('tip').style.display = 'none'; $('selBox').style.display = 'none'; needRender = true; }

/* entitat sota el cursor, relativa al context d'edició */
function pickEntity(mx, my) {
  const ray = mouseRay(mx, my), hit = faceHit(ray), ctx = S.ctx;
  let be = null, bd = OPT.pick;
  for (const e of SNAP.edges) {
    if (!pathStarts(e.path, ctx)) continue;
    const q = closestOnLineToRay(e.a, V.sub(e.b, e.a), ray, true); if (!q) continue;
    const s = toScreen(q.p), d = Math.hypot(s.x - mx, s.y - my);
    if (d < bd && (!hit || V.dist(ray.o, q.p) < V.dist(ray.o, hit.p) + 0.02)) { bd = d; be = e; }
  }
  if (be) return pathEq(be.path, ctx) ? { type: 'edge', id: be.id } : { type: 'group', id: be.path[ctx.length] };
  if (!hit) return null;
  if (!pathStarts(hit.path, ctx)) return { type: 'outside' };
  return pathEq(hit.path, ctx) ? { type: 'face', id: hit.f.id, hit } : { type: 'group', id: hit.path[ctx.length] };
}
function selectEntity(en, mode) {
  if (mode === true) mode = 'toggle'; else if (!mode) mode = 'replace';
  if (mode === 'replace') clearSel();
  if (en && en.type !== 'outside') selOp(S.sel[en.type + 's'], en.id, mode);
  refreshSel();
}

/* ---------- ordres ---------- */
function doDelete() {
  if (!selCount()) return; pushUndo(); const { c } = ctxInfo();
  for (const id of S.sel.groups) c.groups.delete(id);
  for (const id of S.sel.faces) K.removeFace(c, id);
  for (const id of S.sel.edges) K.removeEdge(S.model, c, id);
  clearSel(); refreshAll();
}
function doGroup() {
  if (!selCount()) { toast('Selecciona primer cares, arestes o grups.'); return null; }
  pushUndo(); const { c } = ctxInfo();
  const g = K.makeGroup(S.model, c, S.sel); g.level = S.level; applyActive(g); clearSel(); S.sel.groups.add(g.id); refreshAll(); return g;
}
function doExplode() { if (!S.sel.groups.size) return; pushUndo(); const { c } = ctxInfo(); for (const id of S.sel.groups) K.explodeGroup(S.model, c, id); clearSel(); refreshAll(); }
function selectAll() { const { c } = ctxInfo(); clearSel(); c.faces.forEach((f, id) => S.sel.faces.add(id)); c.edges.forEach((e, id) => S.sel.edges.add(id)); c.groups.forEach((g, id) => S.sel.groups.add(id)); refreshSel(); }
function exitCtx() { if (!S.ctx.length) return false; const gid = S.ctx.pop(); clearSel(); S.sel.groups.add(gid); refreshAll(); return true; }
function commitPoly(pts, closed) {
  pushUndo(); const { c, off } = ctxInfo();
  const r = K.addPolyline(S.model, c, pts.map(p => V.sub(p, off)), closed); refreshAll(); return r;
}
function connectedSel(c, f0) {
  const fs = new Set([f0.id]), vs = new Set(f0.loop); let ch = true;
  while (ch) { ch = false; for (const f of c.faces.values()) { if (fs.has(f.id)) continue; if (f.loop.some(id => vs.has(id)) || f.holes.some(h => h.some(id => vs.has(id)))) { fs.add(f.id); f.loop.forEach(id => vs.add(id)); f.holes.forEach(h => h.forEach(id => vs.add(id))); ch = true; } } }
  const es = new Set(); for (const e of c.edges.values()) if (vs.has(e.a) && vs.has(e.b)) es.add(e.id);
  return { faces: fs, edges: es, groups: new Set() };
}
function paintGroup(g, mat) { for (const f of g.faces.values()) f.mat = mat; for (const s of g.groups.values()) paintGroup(s, mat); }
function createLevel(z) {
  z = Math.round(z * 1000) / 1000;
  if (S.model.levels.some(l => Math.abs(l.elev - z) < 1e-6)) { toast('Ja hi ha un nivell a la cota ' + fmtElev(z) + '.'); return; }
  pushUndo(); let n = S.model.levels.length; while (S.model.levels.some(l => l.name === 'Nivell ' + n)) n++;
  const l = { id: S.model.nid++, name: 'Nivell ' + n, elev: z }; S.model.levels.push(l); S.model.levels.sort((a, b) => a.elev - b.elev); S.level = l.id;
  refreshAll(); toast(l.name + ' creat a ' + fmtElev(z) + ' amb la seva vista de planta.');
}
function createGrid(a, b) {
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.01) return null;
  pushUndo(); const horiz = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
  if ((horiz && b[0] < a[0]) || (!horiz && b[1] < a[1])) { const t = a; a = b; b = t; }
  let name;
  if (horiz) { let k = 0; const used = new Set(S.model.grids.map(g => g.name)); do { name = String.fromCharCode(65 + (k % 26)) + (k >= 26 ? Math.floor(k / 26) : ''); k++; } while (used.has(name)); }
  else { let k = 1; const used = new Set(S.model.grids.map(g => g.name)); while (used.has(String(k))) k++; name = String(k); }
  const g = { id: S.model.nid++, name, a: [a[0], a[1]], b: [b[0], b[1]] }; S.model.grids.push(g); refreshAll(); return g;
}

/* ---------- eines ---------- */
const TOOLS = {};
TOOLS.select = {
  down(ev, mx, my) { st.down = { mx, my }; },
  move(ev, mx, my) {
    if (TABST && Math.hypot(mx - TABST.pos.mx, my - TABST.pos.my) > 5) tabReset();
    if (!st.down) return; if (Math.hypot(mx - st.down.mx, my - st.down.my) < 5 && !st.box) return;
    st.box = true; const b = $('selBox'); b.style.display = 'block'; b.style.left = Math.min(mx, st.down.mx) + 'px'; b.style.top = Math.min(my, st.down.my) + 'px'; b.style.width = Math.abs(mx - st.down.mx) + 'px'; b.style.height = Math.abs(my - st.down.my) + 'px';
  },
  up(ev, mx, my) {
    if (!st.down) return; const d = st.down, box = st.box; delete st.down; delete st.box; $('selBox').style.display = 'none';
    if (box) {
      const x0 = Math.min(mx, d.mx), x1 = Math.max(mx, d.mx), y0 = Math.min(my, d.my), y1 = Math.max(my, d.my), { c, off } = ctxInfo();
      const inB = p => { const s = toScreen(V.add(p, off)); return s.z < 1 && s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1; }, cross = OPT.crossRL ? d.mx > mx : d.mx < mx;
      const mode = selMode(ev); if (mode === 'replace') clearSel();
      const vin = new Map(); for (const v of c.verts.values()) vin.set(v.id, inB(v.p));
      for (const e of c.edges.values()) if (cross ? (vin.get(e.a) || vin.get(e.b)) : (vin.get(e.a) && vin.get(e.b))) selOp(S.sel.edges, e.id, mode);
      for (const f of c.faces.values()) if (cross ? f.loop.some(id => vin.get(id)) : f.loop.every(id => vin.get(id))) selOp(S.sel.faces, f.id, mode);
      for (const g of c.groups.values()) { const b = K.bbox(g, g.t); if (!isFinite(b.min[0])) continue; const cs = []; for (let i = 0; i < 8; i++) cs.push(inB([i & 1 ? b.max[0] : b.min[0], i & 2 ? b.max[1] : b.min[1], i & 4 ? b.max[2] : b.min[2]])); if (cross ? cs.some(Boolean) : cs.every(Boolean)) selOp(S.sel.groups, g.id, mode); }
      refreshSel(); return;
    }
    const en = pickEntity(mx, my);
    if (en && en.type === 'outside') { exitCtx(); return; }
    if (confirmTab(selMode(ev))) return;
    if (ev.detail >= 3 && en && en.type !== 'outside') { tripleSel(en, selMode(ev)); return; }
    selectEntity(en, selMode(ev));
  },
  dbl(ev, mx, my) {
    const en = pickEntity(mx, my);
    if (!en || en.type === 'outside') { exitCtx(); return; }
    if (en.type === 'group') { S.ctx.push(en.id); clearSel(); refreshAll(); return; }
    if (en.type === 'face') { const { c } = ctxInfo(), f = c.faces.get(en.id); clearSel(); S.sel.faces.add(f.id); for (const l of [f.loop, ...f.holes]) for (let i = 0; i < l.length; i++) { const e = K.edgeBetween(c, l[i], l[(i + 1) % l.length]); if (e) S.sel.edges.add(e.id); } refreshSel(); }
  },
};
TOOLS.eraser = {
  down(ev, mx, my) { st.on = true; this.move(ev, mx, my); },
  move(ev, mx, my) {
    if (!st.on) return; const en = pickEntity(mx, my); if (!en || en.type === 'face' || en.type === 'outside') return;
    if (!st.undo) { pushUndo(); st.undo = true; } const { c } = ctxInfo();
    if (en.type === 'edge') K.removeEdge(S.model, c, en.id); else c.groups.delete(en.id);
    clearSel(); refreshAll();
  },
  up() { delete st.on; delete st.undo; },
};
TOOLS.paint = {
  down(ev, mx, my) {
    const en = pickEntity(mx, my); if (!en || en.type === 'edge' || en.type === 'outside') return; const { c } = ctxInfo();
    if (ev.altKey) { if (en.type === 'face') { S.mat = c.faces.get(en.id).mat; renderTray(); } return; }
    pushUndo(); if (en.type === 'face') c.faces.get(en.id).mat = S.mat; else paintGroup(c.groups.get(en.id), S.mat); refreshAll();
  },
};
TOOLS.line = {
  move(ev, mx, my) {
    const pk = pick(mx, my, { from: st.from, lock: LOCK }); st.pk = pk; clearPrev();
    if (st.from) { prevLine([st.from, pk.p], pk.axis != null ? AX_COL[pk.axis] : 0x1B1D21); showTip(mx, my, pk, fmtM(V.dist(st.from, pk.p))); $('vcb').value = fmt(V.dist(st.from, pk.p)); }
    else showTip(mx, my, pk);
  },
  down(ev, mx, my) {
    const pk = pick(mx, my, { from: st.from, lock: LOCK });
    if (!st.from) { st.from = pk.p; return; }
    this.seg(pk.p);
  },
  seg(p) {
    if (V.dist(st.from, p) < K.TOL) return;
    const r = commitPoly([st.from, p], false); LOCK = null; clearPrev();
    st.from = r.faces.length ? null : p;
  },
  vcb(txt) { const v = parseNum(txt); if (v == null || !st.from || !st.pk) return; const d = V.norm(V.sub(st.pk.p, st.from)); if (V.len(d) < 0.5) return; this.seg(V.add(st.from, V.mul(d, v))); },
  hintExtra: 'Fletxes: bloqueja l’eix (→ vermell, ← verd, ↑ blau).',
};
TOOLS.rect = {
  pts(p2) { const { u, v } = planeAxes(st.pl.n), d = V.sub(p2, st.p1), du = V.dot(d, u), dv = V.dot(d, v); st.du = du; st.dv = dv; return [st.p1, V.add(st.p1, V.mul(u, du)), V.add(V.add(st.p1, V.mul(u, du)), V.mul(v, dv)), V.add(st.p1, V.mul(v, dv))]; },
  move(ev, mx, my) {
    const pk = pick(mx, my); st.pk = pk; clearPrev();
    if (!st.p1) { showTip(mx, my, pk); return; }
    const q = this.pts(projToPlane(pk, st.pl)); prevLine(q, 0x1B1D21, true);
    const s = fmt(Math.abs(st.du)) + ' ; ' + fmt(Math.abs(st.dv)); showTip(mx, my, pk, s); $('vcb').value = s;
  },
  down(ev, mx, my) {
    const pk = pick(mx, my);
    if (!st.p1) { st.p1 = pk.p; st.pl = planeOf(pk); return; }
    const q = this.pts(projToPlane(pk, st.pl)); this.commit(q);
  },
  commit(q) { if (Math.abs(st.du) < K.TOL || Math.abs(st.dv) < K.TOL) return; commitPoly(q, true); cancelTool(); },
  vcb(txt) {
    if (!st.p1) return; const a = txt.split(/[;x×]/).map(parseNum); if (a.length < 2 || a[0] == null || a[1] == null) { toast('Escriu «amplada;fondària», per exemple 4;3'); return; }
    const { u, v } = planeAxes(st.pl.n), su = st.du < 0 ? -1 : 1, sv = st.dv < 0 ? -1 : 1;
    this.commit(this.pts(V.add(V.add(st.p1, V.mul(u, su * a[0])), V.mul(v, sv * a[1]))));
  },
};
function ngonTool(isCircle) {
  return {
    n() { return isCircle ? S.segs : S.sides; },
    pts(p2) { const { u, v } = planeAxes(st.pl.n), d = V.sub(p2, st.c), r = V.len(d), a0 = Math.atan2(V.dot(d, v), V.dot(d, u)), n = this.n(), o = []; st.r = r;
      for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; o.push(V.add(st.c, V.add(V.mul(u, Math.cos(a) * r), V.mul(v, Math.sin(a) * r)))); } return o; },
    move(ev, mx, my) {
      const pk = pick(mx, my); st.pk = pk; clearPrev(); if (!st.c) { showTip(mx, my, pk); return; }
      const p2 = projToPlane(pk, st.pl); st.p2 = p2; prevLine(this.pts(p2), 0x1B1D21, true); prevLine([st.c, p2], 0x8B939F); showTip(mx, my, pk, 'R ' + fmtM(st.r)); $('vcb').value = fmt(st.r);
    },
    down(ev, mx, my) { const pk = pick(mx, my); if (!st.c) { st.c = pk.p; st.pl = planeOf(pk); return; } const q = this.pts(projToPlane(pk, st.pl)); if (st.r > K.TOL) { commitPoly(q, true); cancelTool(); } },
    vcb(txt) {
      const m = /^\s*(\d+)\s*s\s*$/i.exec(txt);
      if (m) { const n = Math.max(3, Math.min(96, parseInt(m[1], 10))); if (isCircle) S.segs = n; else S.sides = n; toast((isCircle ? 'Segments del cercle: ' : 'Costats del polígon: ') + n); return; }
      const v = parseNum(txt); if (v == null || v <= 0 || !st.c) return; const { u } = planeAxes(st.pl.n); const d = st.p2 ? V.norm(V.sub(st.p2, st.c)) : u;
      commitPoly(this.pts(V.add(st.c, V.mul(V.len(d) > 0.5 ? d : u, v))), true); cancelTool();
    },
  };
}
TOOLS.circle = ngonTool(true); TOOLS.poly = ngonTool(false);
function arcPoints(p1, p2, perp, s, n) {
  const c = V.dist(p1, p2), as = Math.abs(s); if (as < 1e-6 || c < 1e-6) return [p1, p2];
  const R = (c * c / 4 + as * as) / (2 * as), sg = s < 0 ? -1 : 1, em = V.mul(perp, sg), ec = V.norm(V.sub(p2, p1)), mid = V.lerp(p1, p2, 0.5);
  const cen = V.sub(mid, V.mul(em, R - as)), ph = Math.atan2(c / 2, R - as), o = [];
  for (let i = 0; i <= n; i++) { const a = -ph + 2 * ph * i / n; o.push(V.add(cen, V.add(V.mul(em, R * Math.cos(a)), V.mul(ec, R * Math.sin(a))))); }
  o[0] = p1; o[n] = p2; return o;
}
TOOLS.arc = {
  frame() { let n = st.pl0.n; if (Math.abs(V.dot(V.sub(st.p2, st.p1), n)) > 1e-5) n = V.norm(V.cross(V.sub(st.p2, st.p1), [0, 0, 1])); if (V.len(n) < 0.5) n = [0, 1, 0]; st.n = n; st.perp = V.norm(V.cross(n, V.sub(st.p2, st.p1))); },
  move(ev, mx, my) {
    const pk = pick(mx, my, st.p1 && !st.p2 ? { from: st.p1, lock: LOCK } : null); st.pk = pk; clearPrev();
    if (!st.p1) { showTip(mx, my, pk); return; }
    if (!st.p2) { prevLine([st.p1, pk.p], 0x8B939F); showTip(mx, my, pk, fmtM(V.dist(st.p1, pk.p))); return; }
    const p = projToPlane(pk, { o: st.p1, n: st.n }); st.s = V.dot(V.sub(p, V.lerp(st.p1, st.p2, 0.5)), st.perp);
    prevLine(arcPoints(st.p1, st.p2, st.perp, st.s, 12), 0x1B1D21); showTip(mx, my, pk, 'Bombament ' + fmtM(Math.abs(st.s))); $('vcb').value = fmt(Math.abs(st.s));
  },
  down(ev, mx, my) {
    const pk = pick(mx, my, st.p1 && !st.p2 ? { from: st.p1, lock: LOCK } : null);
    if (!st.p1) { st.p1 = pk.p; st.pl0 = planeOf(pk); return; }
    if (!st.p2) { if (V.dist(st.p1, pk.p) < K.TOL) return; st.p2 = pk.p; this.frame(); return; }
    this.commit();
  },
  commit() { if (Math.abs(st.s || 0) < K.TOL) return; commitPoly(arcPoints(st.p1, st.p2, st.perp, st.s, 12), false); cancelTool(); },
  vcb(txt) { const v = parseNum(txt); if (v == null || !st.p2) return; st.s = (st.s < 0 ? -1 : 1) * v; this.commit(); },
};
TOOLS.pushpull = {
  dist(mx, my) {
    const pk = pick(mx, my), strong = pk.kind === 'end' || pk.kind === 'mid' || pk.kind === 'edge' || (pk.kind === 'face' && pk.hit && pk.hit.f.id !== st.f.id);
    let d; if (strong) d = V.dot(V.sub(pk.p, st.p0), st.n); else { const q = closestOnLineToRay(st.p0, st.n, pk.ray); d = q ? q.s : 0; pk.label = ''; }
    st.d = Math.round(d * 1000) / 1000;
    const sn = pushSnap(st.d); st.d = sn.d; st.snapLevel = sn.lvl;
    if (sn.lvl) pk.label = sn.lvl.name + ' · ' + fmtElev(sn.lvl.elev) + ' (magnetisme)';
    return pk;
  },
  move(ev, mx, my) {
    if (!st.f) { const h = faceHit(mouseRay(mx, my)); if (h && pathEq(h.path, S.ctx)) setHover(h.c, h.off, h.f); else setHover(null); return; }
    const pk = this.dist(mx, my); clearPrev(); const off = V.add(st.off, V.mul(st.n, st.d));
    for (const l of [st.f.loop, ...st.f.holes]) { prevLine(l.map(id => V.add(K.P(st.c, id), off)), 0x86B300, true); for (const id of l) prevLine([V.add(K.P(st.c, id), st.off), V.add(K.P(st.c, id), off)], 0x86B300); }
    showTip(mx, my, pk, fmtM(Math.abs(st.d))); $('vcb').value = fmt(Math.abs(st.d));
  },
  down(ev, mx, my) {
    if (st.f) { this.dist(mx, my); this.commit(st.d); return; }
    const h = faceHit(mouseRay(mx, my)); if (!h || !pathEq(h.path, S.ctx)) return;
    st.f = h.f; st.c = h.c; st.off = h.off; st.p0 = h.p; st.n = h.f.n.slice(); st.d = 0; st.dn = { mx, my }; setHover(null);
  },
  up(ev, mx, my) { if (st.f && st.dn && Math.hypot(mx - st.dn.mx, my - st.dn.my) > 8) { this.dist(mx, my); this.commit(st.d); } },
  commit(d) {
    if (Math.abs(d) < K.TOL) return; const fid = st.f.id, lvl = st.snapLevel || null; pushUndo();
    const cc = st.c, r = K.pushPull(S.model, cc, fid, d); cancelTool(); st.last = { fid, sign: d < 0 ? -1 : 1 }; clearSel();
    if (lvl && r && r.face) linkToLevel(cc, r.face, lvl);
    else if (r && r.face && !autoGroupAfter(cc, r.face)) S.sel.faces.add(r.face.id);
    refreshAll();
  },
  vcb(txt) {
    const v = parseNum(txt); if (v == null) return;
    if (st.f) { st.snapLevel = null; this.commit((st.d < 0 ? -1 : 1) * v); return; }
    if (st.last && S.undo.length) { const L = st.last; undo(); const { c } = ctxInfo(); if (!c.faces.has(L.fid)) return; pushUndo(); const r = K.pushPull(S.model, c, L.fid, L.sign * v); st.last = L; clearSel(); if (r && r.face && !autoGroupAfter(c, r.face)) S.sel.faces.add(r.face.id); refreshAll(); }
  },
};
TOOLS.move = {
  apply(delta, copy) {
    const { c } = ctxInfo();
    if (copy) {
      const ng = new Set(), idm = new Map();
      for (const gid of S.sel.groups) { const g = c.groups.get(gid); if (!g) continue; const n = K.cloneGroup(S.model, g); n.t = V.add(g.t, delta); n.name = g.name; c.groups.set(n.id, n); ng.add(n.id); idm.set(g.id, n.id); }
      for (const nid of ng) { const n = c.groups.get(nid); if (n.par && n.par.host != null && idm.has(n.par.host)) { n.par.host = idm.get(n.par.host); n.t = [0, 0, 0]; } }
      const vm = new Map(), cv = id => { if (!vm.has(id)) vm.set(id, K.addVertexRaw(S.model, c, V.add(K.P(c, id), delta)).id); return vm.get(id); };
      const es = new Set(S.sel.edges), nf = new Set();
      for (const fid of S.sel.faces) { const f = c.faces.get(fid); if (!f) continue; for (const l of [f.loop, ...f.holes]) for (let i = 0; i < l.length; i++) { const e = K.edgeBetween(c, l[i], l[(i + 1) % l.length]); if (e) es.add(e.id); } }
      const ne = new Set(); for (const eid of es) { const e = c.edges.get(eid); if (e) { const x = K.addEdgeRaw(S.model, c, cv(e.a), cv(e.b)); if (x) ne.add(x.id); } }
      for (const fid of S.sel.faces) { const f = c.faces.get(fid); if (!f) continue; const x = K.addFaceRaw(S.model, c, f.loop.map(cv), f.holes.map(h => h.map(cv)), f.mat, f.n.slice()); x.tag = f.tag; nf.add(x.id); }
      S.sel.groups = ng; S.sel.faces = nf; S.sel.edges = ne;
    } else {
      K.moveVerts(c, K.vertsOf(c, S.sel), delta);
      for (const gid of S.sel.groups) { const g = c.groups.get(gid); if (g) g.t = V.add(g.t, delta); }
    }
  },
  move(ev, mx, my) {
    const pk = pick(mx, my, { from: st.from, lock: LOCK }); st.pk = pk; clearPrev();
    if (!st.from) { showTip(mx, my, pk); return; }
    st.copy = st.copy || false; const d = V.sub(pk.p, st.from); st.delta = d; gSel.position.set(d[0], d[1], d[2]);
    prevLine([st.from, pk.p], pk.axis != null ? AX_COL[pk.axis] : 0x8B939F); showTip(mx, my, pk, (st.copy ? 'Còpia · ' : '') + fmtM(V.len(d))); $('vcb').value = fmt(V.len(d));
  },
  down(ev, mx, my) {
    if (!st.from) {
      if (!selCount()) { const en = pickEntity(mx, my); if (!en || en.type === 'outside') return; selectEntity(en, false); }
      st.from = pick(mx, my).p; st.copy = ev.ctrlKey || ev.metaKey; return;
    }
    const pk = pick(mx, my, { from: st.from, lock: LOCK }); this.commit(V.sub(pk.p, st.from));
  },
  commit(delta) {
    if (V.len(delta) < K.TOL) return; const copy = !!st.copy; pushUndo(); this.apply(delta, copy);
    cancelTool(); st.last = { delta, copy }; refreshAll();
  },
  key(ev) { if (ev.key === 'Control' && st.from) { st.copy = !st.copy; return true; } },
  vcb(txt) {
    const mx = /^\s*(?:x\s*(\d+)|(\d+)\s*x)\s*$/i.exec(txt);
    if (mx && st.last && st.last.copy) { const n = parseInt(mx[1] || mx[2], 10); pushUndo(); for (let i = 1; i < n; i++) this.apply(st.last.delta, true); refreshAll(); return; }
    const v = parseNum(txt); if (v == null) return;
    if (st.from && st.delta && V.len(st.delta) > 1e-9) { this.commit(V.mul(V.norm(st.delta), v)); return; }
    if (st.last && !st.from && S.undo.length) { const L = st.last, keep = { faces: new Set(S.sel.faces), edges: new Set(S.sel.edges), groups: new Set(S.sel.groups) }; if (L.copy) return; undo(); S.sel = keep; pushUndo(); L.delta = V.mul(V.norm(L.delta), v); this.apply(L.delta, false); st.last = L; refreshAll(); }
  },
};
TOOLS.offset = {
  calc(mx, my) {
    const ray = mouseRay(mx, my), o = V.add(K.P(st.c, st.f.loop[0]), st.off), p = rayPlane(ray, o, st.f.n); if (!p) return;
    const pl = V.sub(p, st.off); let best = Infinity;
    for (let i = 0; i < st.f.loop.length; i++) { const a = K.P(st.c, st.f.loop[i]), b = K.P(st.c, st.f.loop[(i + 1) % st.f.loop.length]); const ab = V.sub(b, a); let t = V.dot(V.sub(pl, a), ab) / V.dot(ab, ab); t = Math.max(0, Math.min(1, t)); best = Math.min(best, V.dist(pl, V.add(a, V.mul(ab, t)))); }
    const bs = K.basis(st.f.n), o2 = K.P(st.c, st.f.loop[0]), inside = K.pointInPoly2D(K.to2D(pl, o2, bs), st.f.loop.map(id => K.to2D(K.P(st.c, id), o2, bs)));
    st.d = Math.round((inside ? best : -best) * 1000) / 1000;
  },
  loop() { return K.offsetLoop(st.c, st.f, st.d).map(p => V.add(p, st.off)); },
  move(ev, mx, my) {
    if (!st.f) { const h = faceHit(mouseRay(mx, my)); if (h && pathEq(h.path, S.ctx)) setHover(h.c, h.off, h.f); else setHover(null); return; }
    this.calc(mx, my); clearPrev(); prevLine(this.loop(), 0x86B300, true); showTip(mx, my, { label: st.d >= 0 ? 'Cap endins' : 'Cap enfora', col: '#D6FB41' }, fmtM(Math.abs(st.d))); $('vcb').value = fmt(Math.abs(st.d));
  },
  down(ev, mx, my) {
    if (st.f) { this.calc(mx, my); this.commit(); return; }
    const h = faceHit(mouseRay(mx, my)); if (!h || !pathEq(h.path, S.ctx)) return; st.f = h.f; st.c = h.c; st.off = h.off; st.d = 0; setHover(null);
  },
  commit() { if (Math.abs(st.d) < K.TOL) return; const l = this.loop(); commitPoly(l, true); cancelTool(); },
  vcb(txt) { const v = parseNum(txt); if (v == null || !st.f) return; st.d = (st.d < 0 ? -1 : 1) * v; this.commit(); },
};
TOOLS.tape = {
  move(ev, mx, my) { const pk = pick(mx, my, { from: st.from, lock: LOCK }); clearPrev(); if (st.from) { prevLine([st.from, pk.p], 0x8B939F); showTip(mx, my, pk, fmtM(V.dist(st.from, pk.p))); $('vcb').value = fmt(V.dist(st.from, pk.p)); } else showTip(mx, my, pk); },
  down(ev, mx, my) { const pk = pick(mx, my, { from: st.from, lock: LOCK }); if (!st.from) { st.from = pk.p; return; } const d = V.dist(st.from, pk.p), dz = pk.p[2] - st.from[2]; toast('Distància: ' + fmtM(d) + (Math.abs(dz) > 1e-6 ? ' · desnivell ' + fmtM(Math.abs(dz)) : '')); cancelTool(); },
};
TOOLS.level = {
  z(mx, my) { const pk = pick(mx, my); if (pk.kind !== 'plane') return pk.p[2]; const q = closestOnLineToRay(CAM.target.toArray(), [0, 0, 1], pk.ray); return q ? q.p[2] : 0; },
  move(ev, mx, my) {
    const z = Math.round(this.z(mx, my) * 100) / 100, e = annotExtent(); st.z = z; clearPrev();
    prevLine([[e.x0, e.y0, z], [e.x1, e.y0, z], [e.x1, e.y1, z], [e.x0, e.y1, z]], 0x0E7C86, true);
    showTip(mx, my, { label: 'Nivell nou', col: '#0E7C86' }, fmtElev(z)); $('vcb').value = fmt(z, 2);
  },
  down(ev, mx, my) { createLevel(Math.round(this.z(mx, my) * 100) / 100); clearPrev(); },
  vcb(txt) { const v = parseNum(txt); if (v != null) createLevel(v); },
};
TOOLS.grid = {
  pt(mx, my) { const pk = pick(mx, my, { from: st.from, lock: LOCK === 2 ? null : LOCK }); const z = workZ(); let p = pk.p; if (Math.abs(p[2] - z) > 1e-6 && pk.kind === 'plane') p = rayPlane(pk.ray, [0, 0, z], [0, 0, 1]) || p; pk.p = [p[0], p[1], z]; return pk; },
  move(ev, mx, my) { const pk = this.pt(mx, my); clearPrev(); if (st.from) { prevLine([st.from, pk.p], 0xA3157F); showTip(mx, my, pk, fmtM(V.dist(st.from, pk.p))); } else showTip(mx, my, pk); },
  down(ev, mx, my) {
    const pk = this.pt(mx, my); if (!st.from) { st.from = pk.p; return; }
    const g = createGrid(st.from, pk.p); cancelTool(); if (g) { st.lastGrid = g.id; toast('Eix ' + g.name + ' creat. Escriu una distància per crear-ne un de paral·lel.'); }
  },
  vcb(txt) {
    const v = parseNum(txt), g = S.model.grids.find(x => x.id === st.lastGrid); if (v == null || !g) return;
    const d = V.norm([g.b[0] - g.a[0], g.b[1] - g.a[1], 0]); let n = [d[1], -d[0]]; if ((Math.abs(n[0]) >= Math.abs(n[1]) ? n[0] : n[1]) < 0) n = [-n[0], -n[1]];
    const ng = createGrid([g.a[0] + n[0] * v, g.a[1] + n[1] * v], [g.b[0] + n[0] * v, g.b[1] + n[1] * v]); if (ng) st.lastGrid = ng.id;
  },
};
TOOLS.ifc = {
  down(ev, mx, my) {
    const en = pickEntity(mx, my); if (!en || en.type === 'outside' || en.type === 'edge') return; const { c } = ctxInfo();
    if (ev.altKey) { if (en.type === 'group') { setActiveClass(c.groups.get(en.id).ifc || null); toast('Classe activa: ' + className(S.ifcActive)); } return; }
    pushUndo(); let g;
    if (en.type === 'group') g = c.groups.get(en.id);
    else { g = K.makeGroup(S.model, c, connectedSel(c, c.faces.get(en.id))); g.level = S.level; const r = IFC.find(x => x[0] === S.ifcActive); g.name = (r ? r[1] : 'Grup') + ' ' + g.id; }
    g.ifc = S.ifcActive || null; clearSel(); S.sel.groups.add(g.id); refreshAll();
  },
};
TOOLS.orbit = { nav: 'orbit' }; TOOLS.pan = { nav: 'pan' }; TOOLS.zoom = { nav: 'zoom' };

/* ---------- navegació ---------- */
let navDrag = null;
function modNav(ev) {
  const held = { alt: ev.altKey, meta: ev.metaKey, ctrl: ev.ctrlKey, shift: ev.shiftKey };
  for (const [k, m] of [['navOrbit', 'orbit'], ['navPan', 'pan'], ['navZoom', 'zoom']]) if (OPT[k] && OPT[k] !== 'none' && held[OPT[k]]) return m;
  return null;
}
function navMove(mode, dx, dy) {
  if (mode === 'zoom') { camAnim = null; CAM.dist = Math.max(0.2, Math.min(4000, CAM.dist * Math.exp(dy * OPT.wheel * 4))); updCam(); return; }
  if (mode === 'orbit') {
    camAnim = null; CAM.theta -= dx * OPT.orbit;
    if (CAM.proj === 'conic' || CAM.proj === 'axo') CAM.phi = Math.max(0.001, Math.min(Math.PI - 0.001, CAM.phi - dy * OPT.orbit * (OPT.orbitInvY ? -1 : 1)));
  } else if (mode === 'pan') {
    camAnim = null; const h = view.clientHeight || 1, s = 2 * CAM.dist * Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2)) / h, e = cam.matrixWorld.elements;
    CAM.target.x += (-e[0] * dx + e[4] * dy) * s; CAM.target.y += (-e[1] * dx + e[5] * dy) * s; CAM.target.z += (-e[2] * dx + e[6] * dy) * s;
  } else if (mode === 'zoom') { camAnim = null; CAM.dist = Math.max(0.2, Math.min(4000, CAM.dist * Math.exp(dy * 0.01))); }
  updCam();
}
function mpos(ev) { const r = view.getBoundingClientRect(); return { mx: ev.clientX - r.left, my: ev.clientY - r.top }; }
canvas.addEventListener('pointerdown', ev => {
  const { mx, my } = mpos(ev); canvas.focus(); $('vcb').blur();
  const nav = ev.button === 1 ? (ev.shiftKey ? 'pan' : 'orbit') : ev.button === 2 ? 'pan' : (ev.button === 0 && modNav(ev)) || (T && T.nav) || null;
  if (nav) { pushHist(); navDrag = { mode: nav, x: ev.clientX, y: ev.clientY, sx: ev.clientX, sy: ev.clientY, btn: ev.button }; canvas.setPointerCapture(ev.pointerId); ev.preventDefault(); return; }
  if (ev.button === 0 && T && T.down) { try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* */ } T.down(ev, mx, my); }
});
canvas.addEventListener('pointermove', ev => {
  const { mx, my } = mpos(ev); lastMouse = { mx, my }; if (SNAP_CYC && (Math.abs(mx - (SNAP_AT.x || 0)) > 3 || Math.abs(my - (SNAP_AT.y || 0)) > 3)) { SNAP_CYC = 0; }
  if (navDrag) { navMove(navDrag.mode, ev.clientX - navDrag.x, ev.clientY - navDrag.y); navDrag.x = ev.clientX; navDrag.y = ev.clientY; return; }
  if (T && T.move) T.move(ev, mx, my);
});
canvas.addEventListener('pointerup', ev => { const { mx, my } = mpos(ev); if (navDrag) { const nd = navDrag; navDrag = null; if (nd.btn === 2 && Math.hypot(ev.clientX - nd.sx, ev.clientY - nd.sy) < 4) openCtx(ev, mx, my); return; } if (ev.button === 0 && T && T.up) T.up(ev, mx, my); });
canvas.addEventListener('dblclick', ev => { const { mx, my } = mpos(ev); if (T && T.dbl) T.dbl(ev, mx, my); });
canvas.addEventListener('wheel', ev => {
  ev.preventDefault(); camAnim = null; const old = CAM.dist, nd = Math.max(0.2, Math.min(4000, old * Math.exp(ev.deltaY * OPT.wheel * (OPT.wheelInv ? -1 : 1))));
  if (OPT.zoomCursor) zoomAt(lastMouse.mx, lastMouse.my, nd / old);
  CAM.dist = nd; updCam(); if (T && T.move) T.move(ev, lastMouse.mx, lastMouse.my);
}, { passive: false });
function zoomAt(mx, my, f) {
  const ray = mouseRay(mx, my), h = faceHit(ray); let P = h ? h.p : null;
  if (!P && Math.abs(ray.d[2]) > 1e-6) { const t = (workZ() - ray.o[2]) / ray.d[2]; if (t > 0) P = V.add(ray.o, V.mul(ray.d, t)); }
  if (P) CAM.target.set(P[0] + (CAM.target.x - P[0]) * f, P[1] + (CAM.target.y - P[1]) * f, P[2] + (CAM.target.z - P[2]) * f);
}
canvas.addEventListener('contextmenu', ev => ev.preventDefault());
canvas.addEventListener('pointerleave', () => { $('tip').style.display = 'none'; snapDot(null); });

/* ---------- ViewCube (llenç 2D) ---------- */
const CUBE = { hover: null, drag: null };
const CF = [ /* normal, eix u, eix v, etiqueta */
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], t: 'DALT' }, { n: [0, 0, -1], u: [1, 0, 0], v: [0, -1, 0], t: 'BAIX' },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], t: 'FRONT' }, { n: [0, 1, 0], u: [-1, 0, 0], v: [0, 0, 1], t: 'DARRERE' },
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], t: 'DRETA' }, { n: [-1, 0, 0], u: [0, -1, 0], v: [0, 0, 1], t: 'ESQ.' }];
function cubeBasis() {
  const th = CAM.proj === 'cav' ? Math.round(CAM.theta / (Math.PI / 2)) * Math.PI / 2 : CAM.theta, ph = CAM.proj === 'mil' ? 0.5 : CAM.proj === 'cav' ? 1.25 : Math.max(0.05, Math.min(Math.PI - 0.05, CAM.phi));
  return { r: [-Math.sin(th), Math.cos(th), 0], u: [-Math.cos(ph) * Math.cos(th), -Math.cos(ph) * Math.sin(th), Math.sin(ph)], f: [Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph)] };
}
const CS = 30;
function cubeProj(p, b) { return [60 + V.dot(p, b.r) * CS, 56 - V.dot(p, b.u) * CS]; }
function drawCube() {
  const cv = $('vcube'); if (!cv || !S.show.cube) return; const g = cv.getContext('2d'); if (!g) return;
  const b = cubeBasis(); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 120, 120);
  g.strokeStyle = '#2E3F36'; g.lineWidth = 4; g.beginPath();
  for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, q = cubeProj([Math.cos(a) * 1.75, Math.sin(a) * 1.75, -1], b); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); } g.stroke();
  const nq = cubeProj([0, 1.75, -1], b); g.fillStyle = '#C6FF1A'; g.beginPath(); g.arc(nq[0], nq[1], 4, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1B1D21'; g.font = '600 9px ' + getComputedStyle(document.body).fontFamily; g.textAlign = 'center'; g.textBaseline = 'middle';
  const nl = cubeProj([0, 2.25, -1], b); g.fillText('N', nl[0], nl[1]);
  const vis = CF.filter(f => V.dot(f.n, b.f) > 0.02).sort((x, y) => V.dot(x.n, b.f) - V.dot(y.n, b.f));
  for (const f of vis) {
    const c = [-1, 1].flatMap(s => []) && null; const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => cubeProj(V.add(f.n, V.add(V.mul(f.u, s), V.mul(f.v, t))), b));
    g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
    g.fillStyle = f.t === 'DALT' ? '#252B34' : (f.t === 'FRONT' || f.t === 'DARRERE') ? '#1E232B' : '#171B21'; g.fill();
    if (CUBE.hover && CUBE.hover.f === f) {
      const h = CUBE.hover, rng = k => k === 0 ? [-0.6, 0.6] : k > 0 ? [0.6, 1] : [-1, -0.6], [s0, s1] = rng(h.s), [t0, t1] = rng(h.t);
      const hp = [[s0, t0], [s1, t0], [s1, t1], [s0, t1]].map(([s, t]) => cubeProj(V.add(f.n, V.add(V.mul(f.u, s), V.mul(f.v, t))), b));
      g.beginPath(); hp.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fillStyle = 'rgba(198,255,26,.55)'; g.fill();
    }
    g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.strokeStyle = 'rgba(198,255,26,.75)'; g.lineWidth = 1.2; g.lineJoin = 'round'; g.stroke();
    const c0 = cubeProj(f.n, b), ux = V.dot(f.u, b.r), uy = -V.dot(f.u, b.u), vx = -V.dot(f.v, b.r), vy = V.dot(f.v, b.u);
    if (Math.abs(ux * vy - uy * vx) > 0.25) { g.save(); g.transform(ux, uy, vx, vy, c0[0], c0[1]); g.fillStyle = '#E7EAEE'; g.font = '600 ' + (f.t.length > 5 ? 8 : 9.5) + 'px ' + getComputedStyle(document.body).fontFamily; g.fillText(f.t, 0, 0); g.restore(); }
  }
}
function cubeRegion(ev) {
  const r = $('vcube').getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, b = cubeBasis();
  const vis = CF.filter(f => V.dot(f.n, b.f) > 0.02).sort((p, q) => V.dot(q.n, b.f) - V.dot(p.n, b.f));
  for (const f of vis) {
    const c0 = cubeProj(f.n, b), ux = V.dot(f.u, b.r) * CS, uy = -V.dot(f.u, b.u) * CS, vx = V.dot(f.v, b.r) * CS, vy = -V.dot(f.v, b.u) * CS, den = ux * vy - uy * vx; if (Math.abs(den) < 1e-6) continue;
    const dx = x - c0[0], dy = y - c0[1], s = (dx * vy - dy * vx) / den, t = (ux * dy - uy * dx) / den;
    if (Math.abs(s) <= 1 && Math.abs(t) <= 1) return { f, s: Math.abs(s) > 0.6 ? Math.sign(s) : 0, t: Math.abs(t) > 0.6 ? Math.sign(t) : 0 };
  }
  return null;
}
function goDir(d) { const l = V.len(d); if (CAM.proj === 'mil' || CAM.proj === 'cav') CAM.proj = 'axo'; animateCam({ theta: Math.abs(d[0]) + Math.abs(d[1]) < 1e-6 ? -Math.PI / 2 : Math.atan2(d[1], d[0]), phi: Math.max(0.0005, Math.min(Math.PI - 0.0005, Math.acos(d[2] / l))) }); syncUI(); }
(function initCube() {
  const cv = $('vcube');
  cv.addEventListener('pointerdown', ev => { ev.stopPropagation(); cv.setPointerCapture(ev.pointerId); CUBE.drag = { x: ev.clientX, y: ev.clientY, moved: 0 }; });
  cv.addEventListener('pointermove', ev => {
    if (CUBE.drag) { const dx = ev.clientX - CUBE.drag.x, dy = ev.clientY - CUBE.drag.y; CUBE.drag.x = ev.clientX; CUBE.drag.y = ev.clientY; CUBE.drag.moved += Math.abs(dx) + Math.abs(dy); if (CUBE.drag.moved > 3) { CUBE.hover = null; navMove('orbit', dx * 1.6, dy * 1.6); } return; }
    CUBE.hover = cubeRegion(ev); cv.style.cursor = CUBE.hover ? 'pointer' : 'grab'; needRender = true;
  });
  cv.addEventListener('pointerup', ev => { const d = CUBE.drag; CUBE.drag = null; if (d && d.moved <= 3) { const r = cubeRegion(ev); if (r) goDir(V.add(r.f.n, V.add(V.mul(r.f.u, r.s), V.mul(r.f.v, r.t)))); } });
  cv.addEventListener('pointerleave', () => { if (!CUBE.drag) { CUBE.hover = null; needRender = true; } });
  const turn = (dth, dph) => { const s = camState(), to = { theta: s.theta + dth }; if (dph) to.phi = Math.min(Math.PI - 0.05, Math.max(0.05, s.phi + dph)); animateCam(to); };
  $('vcU').onclick = () => turn(0, -Math.PI / 2); $('vcD').onclick = () => turn(0, Math.PI / 2); $('vcL').onclick = () => turn(-Math.PI / 2); $('vcR').onclick = () => turn(Math.PI / 2);
  $('vcHome').onclick = () => { if (CAM.proj === 'mil' || CAM.proj === 'cav') CAM.proj = 'conic'; animateCam({ theta: -Math.PI / 3, phi: 1.15 }); fitView(); syncUI(); };
})();

/* ---------- vistes ---------- */
const ELEVS = [['S', 'Alçat sud', -Math.PI / 2], ['N', 'Alçat nord', Math.PI / 2], ['E', 'Alçat est', 0], ['O', 'Alçat oest', Math.PI]];
function viewName(key) {
  const [t, id] = key.split(':');
  if (t === 'scene') { const v = S.model.views.find(x => String(x.id) === id); return v ? v.name : null; }
  if (t === 'bsec') { const v = bsecOf(id); return v ? v.name : null; }
  if (t === 'plan') { const l = S.model.levels.find(x => String(x.id) === id); return l ? 'Planta · ' + l.name : null; }
  if (t === 'elev') { const e = ELEVS.find(x => x[0] === id); return e ? e[1] : null; }
  if (t === 'sec') { const g = S.model.grids.find(x => String(x.id) === id); return g ? 'Secció · eix ' + g.name : null; }
  return null;
}
function openView(key, quiet) {
  const [t, id] = key.split(':'); if (viewName(key) == null) return;
  S.view = key; if (!S.tabs.includes(key)) S.tabs.push(key);
  const clips = []; const b = modelBox(), cx = V.mul(V.add(b.min, b.max), 0.5), r = Math.max(V.dist(b.min, b.max) / 2, 3), fitD = r / Math.sin(THREE.MathUtils.degToRad(CAM.fov / 2)) * 1.05;
  if (t === 'scene') { const v = S.model.views.find(x => String(x.id) === id); if (v.cam) animateCam({ t: v.cam.t, theta: v.cam.theta, phi: v.cam.phi, dist: v.cam.dist, proj: v.cam.proj }); if (v.style) useStyle(v.style, true); }
  else if (t === 'plan') { const l = S.model.levels.find(x => String(x.id) === id); S.level = l.id; clips.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), l.elev + 1.2)); animateCam({ proj: 'axo', theta: -Math.PI / 2, phi: 0.0005, t: [cx[0], cx[1], l.elev], dist: fitD }); }
  else if (t === 'elev') { const e = ELEVS.find(x => x[0] === id); animateCam({ proj: 'axo', theta: e[2], phi: Math.PI / 2, t: cx, dist: fitD }); }
  else if (t === 'bsec') { const v = bsecOf(id); if (v) { const bc = bsecClips(v); clips.push(...bc.clips); animateCam({ proj: 'axo', theta: bc.theta, phi: Math.PI / 2, t: [cx[0], cx[1], cx[2]], dist: fitD }); } }
  else if (t === 'sec') { const g = S.model.grids.find(x => String(x.id) === id), d = V.norm([g.b[0] - g.a[0], g.b[1] - g.a[1], 0]), n = [d[1], -d[0], 0]; clips.push(new THREE.Plane(new THREE.Vector3(-n[0], -n[1], 0), n[0] * g.a[0] + n[1] * g.a[1] + 0.001)); animateCam({ proj: 'axo', theta: Math.atan2(n[1], n[0]), phi: Math.PI / 2, t: cx, dist: fitD }); }
  S.viewClips = clips; applyClips();
  if (!quiet) refreshAll(); else { renderTray(); syncUI(); }
}
function closeTab(key) { S.tabs = S.tabs.filter(k => k !== key); if (S.view === key) { if (S.tabs.length) openView(S.tabs[S.tabs.length - 1]); else { S.view = null; S.viewClips = []; applyClips(); refreshAll(); } } else syncUI(); }
function saveScene() {
  pushUndo(); let n = S.model.views.length + 1; while (S.model.views.some(v => v.name === 'Escena ' + n)) n++;
  const v = { id: S.model.nid++, name: 'Escena ' + n, cam: camState(), style: styleSnapshot() }; S.model.views.push(v); S.view = 'scene:' + v.id; S.tabs.push(S.view); S.viewClips = []; applyClips(); refreshAll(); toast(v.name + ' desada amb la càmera i la projecció actuals.');
}
