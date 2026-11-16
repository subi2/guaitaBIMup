/* ============================================================
   guaitaBIMup 10 — eines addicionals, nivells de treball,
   plans de referència, plans i caixa de secció, cotes i text,
   panell de navegació del ViewCube
   ============================================================ */
Object.assign(S, { viewClips: [], clipBox: { on: false, x0: 0, x1: 1, y0: 0, y1: 1, z0: 0, z1: 1, rot: 0 }, navOpen: false });

/* ---------- retalls (vistes + plans de secció + caixa) ---------- */
function secPlanes() {
  const a = [];
  for (const s of S.model.sections || []) { if (!s.on) continue; const n = s.flip ? V.mul(s.n, -1) : s.n, d = V.dot(n, s.o); a.push(new THREE.Plane(new THREE.Vector3(-n[0], -n[1], -n[2]), d)); }
  return a;
}
function boxPlanes() {
  const c = S.clipBox; if (!c.on) return [];
  const b = modelBox(), r = c.rot * Math.PI / 180, u = [Math.cos(r), Math.sin(r), 0], w = [-Math.sin(r), Math.cos(r), 0], out = [];
  const rng = ax => { let lo = Infinity, hi = -Infinity; for (let i = 0; i < 8; i++) { const p = [i & 1 ? b.max[0] : b.min[0], i & 2 ? b.max[1] : b.min[1], i & 4 ? b.max[2] : b.min[2]], d = V.dot(p, ax); lo = Math.min(lo, d); hi = Math.max(hi, d); } return [lo, hi]; };
  for (const [ax, f0, f1] of [[u, c.x0, c.x1], [w, c.y0, c.y1], [[0, 0, 1], c.z0, c.z1]]) {
    const [lo, hi] = rng(ax), L = lo + f0 * (hi - lo), H = lo + f1 * (hi - lo);
    if (f0 > 0.0005) out.push(new THREE.Plane(new THREE.Vector3(ax[0], ax[1], ax[2]), -L));
    if (f1 < 0.9995) out.push(new THREE.Plane(new THREE.Vector3(-ax[0], -ax[1], -ax[2]), H));
  }
  return out;
}
function applyClips() { if (!renderer) return; renderer.clippingPlanes = [...S.viewClips, ...secPlanes(), ...boxPlanes()]; needRender = true; }

/* ---------- nivell de treball ---------- */
function setLevel(id) { if (!S.model.levels.some(l => l.id === id)) return; S.level = id; const l = S.model.levels.find(x => x.id === id); refreshAll(); toast('Nivell de treball: ' + l.name + ' (' + fmtElev(l.elev) + ')'); }
function selZRange() {
  const { c, off } = ctxInfo(); let lo = Infinity, hi = -Infinity;
  for (const id of K.vertsOf(c, S.sel)) { const z = K.P(c, id)[2] + off[2]; lo = Math.min(lo, z); hi = Math.max(hi, z); }
  for (const gid of S.sel.groups) { const g = c.groups.get(gid); if (!g) continue; const b = K.bbox(g, V.add(off, g.t)); if (isFinite(b.min[2])) { lo = Math.min(lo, b.min[2]); hi = Math.max(hi, b.max[2]); } }
  return [lo, hi];
}
function sourceElev() {
  const { c } = ctxInfo(), gs = [...S.sel.groups].map(id => c.groups.get(id)).filter(Boolean);
  if (gs.length && !S.sel.faces.size && !S.sel.edges.size) { const ls = new Set(gs.map(g => g.level)); if (ls.size === 1) { const l = S.model.levels.find(x => x.id === gs[0].level); if (l) return l.elev; } }
  return selZRange()[0];
}
function toLevel(mode) { /* mode: 'move' | 'copy' | 'assign' */
  if (!selCount()) { toast('Selecciona primer els elements (cares, arestes o grups).'); return; }
  const L = S.model.levels.find(l => l.id === S.level); if (!L) return;
  const { c } = ctxInfo();
  if (mode === 'assign') { pushUndo(); S.sel.groups.forEach(id => { const g = c.groups.get(id); if (g) g.level = L.id; }); refreshAll(); toast('Assignat al nivell ' + L.name + ' (sense moure la geometria).'); return; }
  const dz = L.elev - sourceElev();
  if (Math.abs(dz) < 1e-6 && mode === 'copy') { toast('Els elements ja són al nivell ' + L.name + '. Tria un altre nivell de treball per copiar-los-hi.'); return; }
  pushUndo(); TOOLS.move.apply([0, 0, dz], mode === 'copy');
  const { c: c2 } = ctxInfo(); S.sel.groups.forEach(id => { const g = c2.groups.get(id); if (g) g.level = L.id; });
  refreshAll(); toast((mode === 'copy' ? 'Copiats' : 'Moguts') + ' al nivell ' + L.name + (Math.abs(dz) > 1e-6 ? ' (Δz ' + fmt(dz, 2) + ' m)' : '') + '.');
}
function editLevel(l, name, elev) {
  pushUndo(); const dz = elev - l.elev; l.name = name || l.name; l.elev = elev;
  if (Math.abs(dz) > 1e-9) for (const g of S.model.root.groups.values()) if (g.level === l.id && !g.par) g.t = V.add(g.t, [0, 0, dz]);
  S.model.levels.sort((a, b) => a.elev - b.elev); refreshAll();
}
function delLevel(l) {
  if (S.model.levels.length < 2) { toast('Ha de quedar com a mínim un nivell.'); return; }
  pushUndo(); S.model.levels = S.model.levels.filter(x => x !== l); (function w(c) { for (const g of c.groups.values()) { if (g.level === l.id) g.level = null; w(g); } })(S.model.root);
  if (S.level === l.id) S.level = S.model.levels[0].id; refreshAll();
}
function levelsPanel(b) {
  const top = el('div', 'row', '<span class="dim gw">Clic: activa el nivell de treball</span>'); const nb = el('button', 'btn sm', '+ Nivell'); nb.onclick = () => setTool('level'); top.appendChild(nb); b.appendChild(top);
  b.appendChild(visModeRow('lvl', 'Representació', [['full', 'Complet'], ['compact', 'Compacte']]));
  S.model.levels.slice().reverse().forEach(l => {
    const act = l.id === S.level, r = el('div', 'row it' + (act ? ' on' : ''), '<input type="checkbox" class="eye" title="Visible"' + (l.hidden ? '' : ' checked') + '><span style="color:var(--accent);width:10px">' + (act ? '●' : '○') + '</span><span class="gw">' + esc(l.name) + '</span><span class="mono dim">' + fmtElev(l.elev) + '</span>');
    r.onclick = () => setLevel(l.id); b.appendChild(r);
    { const ck = r.querySelector('.eye'); ck.onclick = e => e.stopPropagation(); ck.onchange = () => { l.hidden = !ck.checked; markDirty(); rebuildAnnot(); }; }
    if (act) {
      const ed = el('div', 'kv'); ed.style.margin = '4px 0 6px 16px';
      ed.innerHTML = '<span>Nom</span><input type="text" id="lvName" value="' + esc(l.name) + '"><span>Elevació (m)</span><input type="text" id="lvElev" value="' + fmt(l.elev, 3) + '"><span></span><span><button class="btn sm" id="lvDel">Esborra</button></span>';
      b.appendChild(ed);
      const q = id => ed.querySelector('#' + id), apply = () => { const v = parseNum(q('lvElev').value); if (v == null) { toast('Elevació no vàlida.'); return; } editLevel(l, q('lvName').value.trim(), v); };
      q('lvName').onchange = apply; q('lvElev').onchange = apply; q('lvDel').onclick = () => delLevel(l);
    }
  });
  const a = el('div', 'row', ''); a.style.flexWrap = 'wrap';
  [['Mou al nivell actiu', 'move'], ['Copia al nivell actiu', 'copy'], ['Assigna sense moure', 'assign']].forEach(([t, m]) => { const x = el('button', 'btn sm', t); x.onclick = () => toLevel(m); a.appendChild(x); });
  b.appendChild(a); b.appendChild(el('div', 'empty', 'Selecciona elements i prem el botó: es mouen o es copien amb el desnivell entre el seu nivell i l’actiu. Si canvies l’elevació d’un nivell, hi arrosseguen els grups assignats.'));
}
function guidesPanel(b) {
  const hd = t => b.appendChild(el('div', 'row hd', esc(t)));
  const delRow = (label, sub, onDel, extra) => { const r = el('div', 'row it', '<span class="gw">' + esc(label) + '</span><span class="mono dim">' + esc(sub || '') + '</span>'); if (extra) r.appendChild(extra); const x = el('button', 'x', '✕'); x.title = 'Esborra'; x.onclick = e => { e.stopPropagation(); pushUndo(); onDel(); refreshAll(); }; r.appendChild(x); b.appendChild(r); return r; };
  hd('Eixos de pilars'); b.appendChild(visModeRow('grd', 'Representació', [['full', 'Complet'], ['compact', 'Compacte'], ['plan', '1 línia en planta']])); if (!S.model.grids.length) b.appendChild(el('div', 'empty', 'Cap (GR).')); S.model.grids.forEach(g => delRow('Eix ' + g.name, fmtM(Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1])), () => { S.model.grids = S.model.grids.filter(x => x !== g); }, eyeBox(g)));
  hd('Plans de referència'); if (!S.model.refs.length) b.appendChild(el('div', 'empty', 'Cap (RP).')); S.model.refs.forEach(g => delRow(g.name, fmtM(Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1])), () => { S.model.refs = S.model.refs.filter(x => x !== g); }));
  hd('Plans de secció'); if (!S.model.sections.length) b.appendChild(el('div', 'empty', 'Cap (eina Pla de secció).'));
  S.model.sections.forEach(s => {
    const ctl = el('span', '', ''); ctl.style.display = 'flex'; ctl.style.gap = '4px';
    const on = el('input'); on.type = 'checkbox'; on.checked = s.on; on.title = 'Actiu (talla)'; on.onclick = e => e.stopPropagation(); on.onchange = () => { s.on = on.checked; applyClips(); refreshAll(); };
    const fl = el('button', 'btn sm', '⇄'); fl.title = 'Inverteix el costat'; fl.onclick = e => { e.stopPropagation(); s.flip = !s.flip; applyClips(); refreshAll(); };
    ctl.appendChild(on); ctl.appendChild(fl); delRow(s.name, '', () => { S.model.sections = S.model.sections.filter(x => x !== s); applyClips(); }, ctl);
  });
  hd('Cotes i textos'); if (!S.model.dims.length && !S.model.texts.length) b.appendChild(el('div', 'empty', 'Cap (D, X).'));
  S.model.dims.forEach(d => delRow('Cota', fmtM(V.dist(d.a, d.b)), () => { S.model.dims = S.model.dims.filter(x => x !== d); }));
  S.model.texts.forEach(t => delRow('Text', t.t.slice(0, 18), () => { S.model.texts = S.model.texts.filter(x => x !== t); }));
}

/* ---------- anotacions 3D: plans de referència, seccions, cotes, textos ---------- */
const matRefLine = new THREE.LineDashedMaterial({ color: 0x6F9B00, dashSize: 0.8, gapSize: 0.25 }), matRefFill = new THREE.MeshBasicMaterial({ color: 0xA6D800, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });
const matSecLine = new THREE.LineBasicMaterial({ color: 0xE08A00 }), matSecFill = new THREE.MeshBasicMaterial({ color: 0xFFB546, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
const matDimLine = new THREE.LineBasicMaterial({ color: 0x1B1D21, depthTest: false });
function dimOff(d) { return d.off || [0, 0, 0]; }
function annotExtra(e, quad, addLab) {
  if (typeof rebuildImages === 'function') rebuildImages();
  if (S.show.grids) for (const g of S.model.refs) {
    const q = gridEnds(g), z0 = e.z0, z1 = e.z1 + 0.6;
    quad([[q.a[0], q.a[1], z0], [q.b[0], q.b[1], z0], [q.b[0], q.b[1], z1], [q.a[0], q.a[1], z1]], matRefLine, matRefFill);
    addLab('rf', esc(g.name), [(q.a[0] + q.b[0]) / 2, (q.a[1] + q.b[1]) / 2, z1]);
  }
  for (const s of S.model.sections) {
    const { u, v } = planeAxes(s.n), R = Math.max(e.x1 - e.x0, e.y1 - e.y0, e.z1 - e.z0) / 2 + 1, c = s.o;
    const p = (a, b) => V.add(c, V.add(V.mul(u, a * R), V.mul(v, b * R)));
    quad([p(-1, -1), p(1, -1), p(1, 1), p(-1, 1)], matSecLine, s.on ? matSecFill : matRefFill);
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...c), new THREE.Vector3(...V.add(c, V.mul(s.flip ? V.mul(s.n, -1) : s.n, 1.2)))]); gAnnot.add(new THREE.Line(g, matSecLine));
    addLab('sc', esc(s.name), p(-1, 1));
  }
  for (const d of S.model.dims) {
    const o = dimOff(d), a2 = V.add(d.a, o), b2 = V.add(d.b, o);
    for (const [p, q] of [[d.a, a2], [d.b, b2], [a2, b2]]) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p), new THREE.Vector3(...q)]), matDimLine); l.renderOrder = 8; gAnnot.add(l); }
    addLab('dimtxt', fmt(V.dist(d.a, d.b), 3) + ' m', V.lerp(a2, b2, 0.5));
  }
  for (const t of S.model.texts) addLab('dimtxt', esc(t.t), t.p);
}

/* ---------- transformacions (rotació / escala) ---------- */
function recalcN(c) { for (const f of c.faces.values()) { const nn = K.newell(c, f.loop); if (V.len(nn) > 0.5) f.n = V.dot(nn, f.n) < 0 ? V.mul(nn, -1) : nn; } }
function xformGroup(g, ow, fn, parentNew) {
  const no = fn(ow);
  for (const v of g.verts.values()) v.p = V.sub(fn(V.add(ow, v.p)), no);
  recalcN(g);
  for (const sg of g.groups.values()) { const sow = V.add(ow, sg.t); xformGroup(sg, sow, fn, no); }
  g.t = V.sub(no, parentNew); return no;
}
function transformSel(fn) {
  const { c, off } = ctxInfo();
  for (const id of K.vertsOf(c, { faces: S.sel.faces, edges: S.sel.edges })) { const v = c.verts.get(id); if (v) v.p = V.sub(fn(V.add(v.p, off)), off); }
  recalcN(c);
  for (const gid of S.sel.groups) { const g = c.groups.get(gid); if (!g) continue; if (g.par) parXform(g, off, fn); else xformGroup(g, V.add(off, g.t), fn, off); }
}
const proj = (v, n) => V.sub(v, V.mul(n, V.dot(v, n)));
function rotPt(p, c, n, a) { const v = V.sub(p, c), ca = Math.cos(a), sa = Math.sin(a); return V.add(c, V.add(V.add(V.mul(v, ca), V.mul(V.cross(n, v), sa)), V.mul(n, V.dot(n, v) * (1 - ca)))); }
function ensureSel(mx, my) { if (selCount()) return true; const en = pickEntity(mx, my); if (!en || en.type === 'outside') { toast('Selecciona primer els elements.'); return false; } selectEntity(en, false); return true; }
function planeDir(n) { return planeAxes(n).u; }

TOOLS.rotate = {
  axis() { return LOCK != null ? AXES[LOCK] : st.n; },
  ang(pk) {
    const n = this.axis(), p = projToPlane(pk, { o: st.c, n }), cur = proj(V.sub(p, st.c), n); if (V.len(cur) < 1e-6) return 0;
    let a = Math.atan2(V.dot(V.cross(st.u0, cur), n), V.dot(st.u0, cur)); const q = Math.PI / 12, r = Math.round(a / q) * q; if (Math.abs(a - r) < 0.035) a = r; return a;
  },
  ring(n, R) { const u = V.norm(st.u0), w = V.cross(n, u), o = []; for (let i = 0; i < 48; i++) { const t = i / 48 * Math.PI * 2; o.push(V.add(st.c, V.add(V.mul(u, Math.cos(t) * R), V.mul(w, Math.sin(t) * R)))); } return o; },
  move(ev, mx, my) {
    const pk = pick(mx, my); st.pk = pk; clearPrev(); if (!st.c) { showTip(mx, my, pk); return; }
    if (!st.u0) { prevLine([st.c, pk.p], 0x8B939F); showTip(mx, my, pk, 'Origen de l’angle'); return; }
    const n = this.axis(), a = this.ang(pk); st.a = a; const R = Math.max(V.len(st.u0), 0.3);
    prevLine(this.ring(n, R), 0x8B939F, true); prevLine([st.c, V.add(st.c, V.mul(V.norm(st.u0), R))], 0x8B939F); prevLine([st.c, rotPt(V.add(st.c, V.mul(V.norm(st.u0), R)), st.c, n, a)], 0x86B300);
    const deg = Math.round(a * 180 / Math.PI * 10) / 10; showTip(mx, my, pk, deg + '°'); $('vcb').value = String(deg);
  },
  down(ev, mx, my) {
    const pk = pick(mx, my);
    if (!st.c) { if (!ensureSel(mx, my)) return; st.c = pk.p; st.n = planeOf(pk).n; return; }
    if (!st.u0) { const n = this.axis(), u = proj(V.sub(projToPlane(pk, { o: st.c, n }), st.c), n); if (V.len(u) < 1e-6) return; st.u0 = u; return; }
    this.commit(this.ang(pk), ev.ctrlKey || ev.metaKey);
  },
  commit(a, copy) {
    if (Math.abs(a) < 1e-6) return; const n = this.axis(), c = st.c; pushUndo();
    if (copy) TOOLS.move.apply([0, 0, 0], true);
    transformSel(p => rotPt(p, c, n, a)); cancelTool(); refreshAll();
  },
  vcb(txt) { const v = parseFloat(String(txt).replace(',', '.')); if (!isFinite(v) || !st.c) return; if (!st.u0) st.u0 = planeDir(this.axis()); this.commit(v * Math.PI / 180, false); },
};
TOOLS.scale = {
  move(ev, mx, my) {
    const pk = pick(mx, my, { from: st.c, lock: LOCK }); st.pk = pk; clearPrev(); if (!st.c) { showTip(mx, my, pk); return; }
    prevLine([st.c, pk.p], 0x8B939F); if (!st.r) { showTip(mx, my, pk, 'Punt de referència'); return; }
    st.f = V.dist(st.c, pk.p) / st.r; showTip(mx, my, pk, '× ' + fmt(st.f, 3)); $('vcb').value = fmt(st.f, 3);
  },
  down(ev, mx, my) {
    const pk = pick(mx, my, { from: st.c, lock: LOCK });
    if (!st.c) { if (!ensureSel(mx, my)) return; st.c = pk.p; return; }
    if (!st.r) { const d = V.dist(st.c, pk.p); if (d < 1e-4) return; st.r = d; return; }
    this.commit(V.dist(st.c, pk.p) / st.r);
  },
  commit(f) { if (!(f > 0.001)) return; const c = st.c; pushUndo(); transformSel(p => V.add(c, V.mul(V.sub(p, c), f))); cancelTool(); refreshAll(); },
  vcb(txt) { const f = parseFloat(String(txt).replace(',', '.').replace(/^x/i, '')); if (isFinite(f) && st.c) this.commit(f); },
};
TOOLS.followme = {
  chain(c) {
    const es = [...S.sel.edges].map(id => c.edges.get(id)).filter(Boolean), adj = new Map();
    for (const e of es) { for (const [x, y] of [[e.a, e.b], [e.b, e.a]]) { if (!adj.has(x)) adj.set(x, []); adj.get(x).push(y); } }
    if (!es.length) return null; for (const l of adj.values()) if (l.length > 2) return null;
    return { adj, closed: [...adj.values()].every(l => l.length === 2) };
  },
  move(ev, mx, my) { const h = faceHit(mouseRay(mx, my)); if (h && pathEq(h.path, S.ctx)) setHover(h.c, h.off, h.f); else setHover(null); },
  down(ev, mx, my) {
    const h = faceHit(mouseRay(mx, my)); if (!h || !pathEq(h.path, S.ctx)) return; const { c } = ctxInfo(), f = h.f;
    const ch = this.chain(c); if (!ch) { toast('Selecciona primer les arestes del camí (una cadena sense bifurcacions) i després fes clic a la cara del perfil.'); return; }
    const prof = f.loop.map(id => K.P(c, id)), cen = prof.reduce((a, p) => V.add(a, p), [0, 0, 0]).map(x => x / prof.length);
    let start = null, bd = Infinity; for (const id of ch.adj.keys()) { if (!ch.closed && ch.adj.get(id).length !== 1) continue; const d = V.dist(K.P(c, id), cen); if (d < bd) { bd = d; start = id; } }
    if (start == null) return; const ids = [start]; let prev = null, cur = start;
    for (;;) { const nx = ch.adj.get(cur).find(x => x !== prev && !(ids.length > 1 && x === start && false)); if (nx == null || nx === start) break; if (ids.includes(nx)) break; ids.push(nx); prev = cur; cur = nx; }
    if (ch.closed) ids.push(start);
    const pts = ids.map(id => K.P(c, id)); if (pts.length < 2) return;
    if (prof.some(p => ids.some(id => V.dist(K.P(c, id), p) < 1e-6)) && !ch.closed && false) return;
    pushUndo(); this.sweep(c, prof, pts, ch.closed); setHover(null); refreshAll(); toast('Follow Me: perfil extrudit al llarg del camí.');
  },
  sweep(c, P, pts, closed) {
    const n = pts.length - 1, T = []; for (let i = 0; i < n; i++) T.push(V.norm(V.sub(pts[i + 1], pts[i])));
    const M = i => (i === 0 ? (closed ? V.norm(V.add(T[n - 1], T[0])) : T[0]) : i === n ? (closed ? V.norm(V.add(T[n - 1], T[0])) : T[n - 1]) : V.norm(V.add(T[i - 1], T[i])));
    const hit = (p, t, o, m) => { const den = V.dot(m, t); if (Math.abs(den) < 1e-9) return p; return V.add(p, V.mul(t, V.dot(m, V.sub(o, p)) / den)); };
    const rings = [closed ? P.map(p => hit(p, T[0], pts[0], M(0))) : P.slice()];
    for (let i = 1; i <= n; i++) rings.push(rings[i - 1].map(p => hit(p, T[i - 1], pts[i], M(i))));
    if (closed) rings[n] = rings[0].slice();
    const m = P.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const k = (j + 1) % m; K.addPolyline(S.model, c, [rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]], true); }
    if (!closed) K.addPolyline(S.model, c, rings[n], true);
    /* elimina les seccions internes (anells intermedis) que el nucli ha pogut convertir en cares */
    const drop = ring => { for (const f of [...c.faces.values()]) { if (f.loop.length !== ring.length || f.holes.length) continue; if (ring.every(q => f.loop.some(id => V.dist(K.P(c, id), q) < 1e-6))) K.removeFace(c, f.id); } };
    for (let i = 1; i < n; i++) drop(rings[i]); if (closed) drop(rings[0]);
  },
};
TOOLS.dim = {
  off(pk) { const d = V.norm(V.sub(st.b, st.a)), cd = camDir(), nrm = V.norm(V.cross(V.cross(d, [cd.x, cd.y, cd.z]), d)); const p = V.len(nrm) < 0.5 ? pk.p : (rayPlane(pk.ray, st.a, nrm) || pk.p), v = V.sub(p, st.a); return V.sub(v, V.mul(d, V.dot(v, d))); },
  move(ev, mx, my) {
    const pk = pick(mx, my, { from: st.a && !st.b ? st.a : null, lock: LOCK }); st.pk = pk; clearPrev(); if (!st.a) { showTip(mx, my, pk); return; }
    if (!st.b) { prevLine([st.a, pk.p], 0x8B939F); showTip(mx, my, pk, fmtM(V.dist(st.a, pk.p))); return; }
    const o = this.off(pk); st.o = o; prevLine([st.a, V.add(st.a, o), V.add(st.b, o), st.b], 0x1B1D21); showTip(mx, my, pk, fmtM(V.dist(st.a, st.b)));
  },
  down(ev, mx, my) {
    const pk = pick(mx, my, { from: st.a && !st.b ? st.a : null, lock: LOCK });
    if (!st.a) { st.a = pk.p; return; } if (!st.b) { if (V.dist(st.a, pk.p) < K.TOL) return; st.b = pk.p; return; }
    pushUndo(); S.model.dims.push({ id: S.model.nid++, a: st.a, b: st.b, off: this.off(pk) }); cancelTool(); refreshAll();
  },
};
TOOLS.protr = {
  move(ev, mx, my) {
    const pk = pick(mx, my); st.pk = pk; clearPrev(); if (!st.c) { showTip(mx, my, pk); return; }
    if (!st.u) { prevLine([st.c, pk.p], 0x8B939F); showTip(mx, my, pk, 'Primer costat'); return; }
    const p = projToPlane(pk, { o: st.c, n: st.n }), v = proj(V.sub(p, st.c), st.n); if (V.len(v) < 1e-6) return; const a = Math.acos(Math.max(-1, Math.min(1, V.dot(V.norm(st.u), V.norm(v))))) * 180 / Math.PI;
    st.a = a; const R = Math.max(V.len(st.u), 0.3); prevLine([st.c, V.add(st.c, V.mul(V.norm(st.u), R))], 0x8B939F); prevLine([st.c, V.add(st.c, V.mul(V.norm(v), R))], 0x86B300); showTip(mx, my, pk, fmt(a, 1) + '°');
  },
  down(ev, mx, my) {
    const pk = pick(mx, my);
    if (!st.c) { st.c = pk.p; st.n = planeOf(pk).n; return; }
    if (!st.u) { const u = proj(V.sub(projToPlane(pk, { o: st.c, n: st.n }), st.c), st.n); if (V.len(u) < 1e-6) return; st.u = u; return; }
    toast('Angle: ' + fmt(st.a || 0, 2) + '°'); cancelTool();
  },
};
TOOLS.text = {
  move(ev, mx, my) { const pk = pick(mx, my); showTip(mx, my, pk); },
  down(ev, mx, my) {
    const p = pick(mx, my).p;
    $('dlgBox').innerHTML = '<h3>Text</h3><div class="kv" style="margin-bottom:12px"><span>Contingut</span><input type="text" id="txIn" maxlength="80"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="txX">Cancel·la</button><button class="btn acc" id="txOk">Afegeix</button></div>';
    $('dlg').classList.add('show'); const inp = $('txIn'); setTimeout(() => inp.focus(), 30);
    const ok = () => { const t = inp.value.trim(); $('dlg').classList.remove('show'); if (!t) return; pushUndo(); S.model.texts.push({ id: S.model.nid++, p, t }); refreshAll(); };
    $('txOk').onclick = ok; $('txX').onclick = () => $('dlg').classList.remove('show'); inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') ok(); if (e.key === 'Escape') $('dlg').classList.remove('show'); };
  },
};
TOOLS.section = {
  move(ev, mx, my) { const h = faceHit(mouseRay(mx, my)); if (h) setHover(h.c, h.off, h.f); else setHover(null); },
  down(ev, mx, my) {
    const ray = mouseRay(mx, my), h = faceHit(ray); let n, o;
    if (h) { n = h.f.n.slice(); o = h.p; } else { const pk = pick(mx, my), pl = planeOf(pk); n = pl.n; o = pk.p; }
    for (let i = 0; i < 3; i++) if (Math.abs(n[i]) > 0.985) n = [0, 0, 0].map((_, k) => k === i ? Math.sign(n[i]) : 0);
    if (V.dot(n, V.sub(V.add(ray.o, ray.d), o)) < 0 && false) n = V.mul(n, -1);
    pushUndo(); let k = S.model.sections.length + 1; while (S.model.sections.some(s => s.name === 'Secció ' + k)) k++;
    S.model.sections.push({ id: S.model.nid++, name: 'Secció ' + k, o, n, on: true, flip: false }); setHover(null); applyClips(); refreshAll(); toast('Pla de secció creat. Pots activar-lo, invertir-lo o esborrar-lo des de la safata.');
  },
};
TOOLS.zoomwin = {
  down(ev, mx, my) { st.d = { mx, my }; },
  move(ev, mx, my) { if (!st.d) return; const b = $('selBox'); b.style.display = 'block'; b.style.left = Math.min(mx, st.d.mx) + 'px'; b.style.top = Math.min(my, st.d.my) + 'px'; b.style.width = Math.abs(mx - st.d.mx) + 'px'; b.style.height = Math.abs(my - st.d.my) + 'px'; },
  up(ev, mx, my) {
    if (!st.d) return; const d = st.d; delete st.d; $('selBox').style.display = 'none'; const bw = Math.abs(mx - d.mx), bh = Math.abs(my - d.my); if (bw < 8 || bh < 8) return;
    const W = view.clientWidth || 1, H = view.clientHeight || 1, cd = camDir(), p = rayPlane(mouseRay((mx + d.mx) / 2, (my + d.my) / 2), CAM.target.toArray(), [cd.x, cd.y, cd.z]); if (!p) return;
    animateCam({ t: p, dist: Math.max(0.3, CAM.dist * Math.max(bw / W, bh / H)) });
  },
};
TOOLS.rrect = {
  pl() { return st.pl; },
  poly(w) { const perp = V.norm(V.cross(st.pl.n, V.sub(st.p2, st.p1))); return [st.p1, st.p2, V.add(st.p2, V.mul(perp, w)), V.add(st.p1, V.mul(perp, w))]; },
  width(pk) { const perp = V.norm(V.cross(st.pl.n, V.sub(st.p2, st.p1))); return V.dot(V.sub(projToPlane(pk, st.pl), st.p2), perp); },
  move(ev, mx, my) {
    const pk = pick(mx, my, { from: st.p1 && !st.p2 ? st.p1 : null, lock: LOCK }); st.pk = pk; clearPrev(); if (!st.p1) { showTip(mx, my, pk); return; }
    if (!st.p2) { const q = projToPlane(pk, st.pl); prevLine([st.p1, q], 0x8B939F); showTip(mx, my, pk, fmtM(V.dist(st.p1, q))); st.q = q; return; }
    const w = this.width(pk); st.w = w; prevLine(this.poly(w), 0x1B1D21, true); showTip(mx, my, pk, fmt(V.dist(st.p1, st.p2)) + ' ; ' + fmt(Math.abs(w))); $('vcb').value = fmt(Math.abs(w));
  },
  down(ev, mx, my) {
    const pk = pick(mx, my, { from: st.p1 && !st.p2 ? st.p1 : null, lock: LOCK });
    if (!st.p1) { st.p1 = pk.p; st.pl = planeOf(pk); return; } if (!st.p2) { const q = projToPlane(pk, st.pl); if (V.dist(q, st.p1) < K.TOL) return; st.p2 = q; return; }
    this.commit(this.width(pk));
  },
  commit(w) { if (Math.abs(w) < K.TOL) return; commitPoly(this.poly(w), true); cancelTool(); },
  vcb(txt) { const v = parseNum(txt); if (v == null) return; if (st.p2) this.commit((st.w < 0 ? -1 : 1) * v); else if (st.p1 && st.q) { st.p2 = V.add(st.p1, V.mul(V.norm(V.sub(st.q, st.p1)), v)); } },
};
TOOLS.freehand = {
  down(ev, mx, my) { const pk = pick(mx, my); st.pl = planeOf(pk); st.pts = [pk.p]; },
  move(ev, mx, my) { if (!st.pts) return; const pk = pick(mx, my), p = projToPlane(pk, st.pl); if (V.dist(p, st.pts[st.pts.length - 1]) > Math.max(0.02, CAM.dist * 0.004)) { st.pts.push(p); clearPrev(); prevLine(st.pts, 0x1B1D21); } },
  up() { if (!st.pts) return; const pts = st.pts; delete st.pts; clearPrev(); if (pts.length < 2) return; const closed = pts.length > 3 && V.dist(pts[0], pts[pts.length - 1]) < Math.max(0.05, CAM.dist * 0.008); if (closed) pts.pop(); commitPoly(pts, closed); },
};
TOOLS.refplane = {
  pt(mx, my) { return TOOLS.grid.pt(mx, my); },
  move(ev, mx, my) { const pk = this.pt(mx, my); clearPrev(); if (st.from) { prevLine([st.from, pk.p], 0x6F9B00); showTip(mx, my, pk, fmtM(V.dist(st.from, pk.p))); } else showTip(mx, my, pk); },
  down(ev, mx, my) {
    const pk = this.pt(mx, my); if (!st.from) { st.from = pk.p; return; }
    if (Math.hypot(pk.p[0] - st.from[0], pk.p[1] - st.from[1]) < 0.01) return; pushUndo(); let k = S.model.refs.length + 1; while (S.model.refs.some(r => r.name === 'PR' + k)) k++;
    const r = { id: S.model.nid++, name: 'PR' + k, a: [st.from[0], st.from[1]], b: [pk.p[0], pk.p[1]] }; S.model.refs.push(r); cancelTool(); refreshAll(); toast('Pla de referència ' + r.name + ' creat (línia d’ajuda per a la inferència).');
  },
};

/* ---------- panell de navegació del ViewCube (estil guaitaGBXML) ---------- */
const NAV_VIEWS = { O: [-1, 0, 0], PL: [0, 0, 1], E: [1, 0, 0], N: [0, 1, 0], S: [0, -1, 0], ISO: [1, -1, 0.9] };
function buildNav() {
  const p = $('navPanel'); p.innerHTML = '';
  const B = (host, html, title, fn, key, cls) => { const b = el('button', cls || '', html); b.title = title; if (key) b.dataset.k = key; b.onclick = e => { e.stopPropagation(); fn(); syncNav(); }; host.appendChild(b); return b; };
  const g = el('div', 'nc-grid'); p.appendChild(g);
  B(g, 'O', 'Alçat oest', () => goDir(NAV_VIEWS.O)); B(g, 'PL', 'Planta', () => goDir(NAV_VIEWS.PL)); B(g, 'E', 'Alçat est', () => goDir(NAV_VIEWS.E));
  B(g, 'N', 'Alçat nord', () => goDir(NAV_VIEWS.N)); B(g, '⌂', 'Isomètrica', () => { if (CAM.proj === 'mil' || CAM.proj === 'cav') CAM.proj = 'axo'; animateCam({ theta: -Math.PI / 4, phi: 0.95 }); }); B(g, 'S', 'Alçat sud', () => goDir(NAV_VIEWS.S));
  B(g, '⤢', 'Ajusta el model (selecció si n’hi ha)', () => fitView(!!selCount())); B(g, '↶', 'Vista anterior', prevView); B(g, '⛶', 'Caixa de secció', sectionBoxPanel, 'sec');
  const row = lab => { const r = el('div', 'nc-row'); r.appendChild(el('span', '', esc(lab))); p.appendChild(r); return r; };
  let r = row('Projecció');
  [['conic', 'Cònica'], ['axo', 'Axonomètrica'], ['cav', 'Cavallera'], ['mil', 'Militar']].forEach(([k, l]) => B(r, esc(l), l, () => setProj(k), 'P' + k, 'wide'));
  r = row('Estil');
  B(r, '▦', 'Filferro', () => { S.style.wire = !S.style.wire; refreshAll(); }, 'wire'); B(r, '▒', 'Raigs X', () => { S.style.xray = !S.style.xray; refreshAll(); }, 'xray'); B(r, '▭', 'Arestes', () => { S.style.edges = !S.style.edges; refreshAll(); }, 'edges'); B(r, 'IFC', 'Color per classe IFC', () => { S.style.colorBy = S.style.colorBy === 'ifc' ? 'mat' : 'ifc'; refreshAll(); }, 'cifc');
  r = row('Fons');
  [['sky', 'linear-gradient(#7FB0E8,#F2F5F8)', 'Cel'], ['white', '#f2f4f1', 'Blanc'], ['grey', '#23272E', 'Gris fosc'], ['black', '#0a0c0b', 'Negre']].forEach(([k, c, l]) => { const b = B(r, '', l, () => setBg(k), 'B' + k, 'bg'); b.style.background = c; });
  syncNav();
}
function syncNav() {
  document.querySelectorAll('#navPanel [data-k]').forEach(b => { const k = b.dataset.k; b.classList.toggle('on', k[0] === 'P' && k.length > 2 ? CAM.proj === k.slice(1) : k === 'wire' ? S.style.wire : k === 'xray' ? S.style.xray : k === 'edges' ? S.style.edges : k === 'cifc' ? S.style.colorBy === 'ifc' : k === 'sec' ? S.clipBox.on : k[0] === 'B' ? S.bg === k.slice(1) : false); });
  const pn = $('navPanel'); if (pn) pn.classList.toggle('show', S.navOpen); const nb = $('navBtnTxt'); if (nb) nb.textContent = { conic: 'Cònica', axo: 'Axonomètrica', cav: 'Cavallera', mil: 'Militar' }[CAM.proj];
}
function toggleNav(f) { S.navOpen = f == null ? !S.navOpen : f; syncNav(); }
function sectionBoxPanel() {
  const old = $('fpSec'); if (old) { old.remove(); return; }
  const c = S.clipBox, fp = el('div', ''); fp.id = 'fpSec';
  fp.innerHTML = '<div class="fh"><span>Caixa de secció</span><button class="x" id="fsX">✕</button></div><label class="fr"><input type="checkbox" id="fsOn"> Activa</label>';
  const rows = [['Alçada (Z)', 'z0', 'z1'], ['Eix X', 'x0', 'x1'], ['Eix Y', 'y0', 'y1']];
  rows.forEach(([lab, a, b]) => { const d = el('div', 'fs'); d.innerHTML = '<div class="fl">' + lab + '</div><input type="range" min="0" max="1" step="0.005" data-k="' + a + '"><input type="range" min="0" max="1" step="0.005" data-k="' + b + '">'; fp.appendChild(d); });
  const dr = el('div', 'fs'); dr.innerHTML = '<div class="fl">Gir <span id="fsRv">0°</span></div><input type="range" min="0" max="360" step="1" data-k="rot">'; fp.appendChild(dr);
  const lv = el('div', 'fs'); lv.innerHTML = '<div class="fl">Talla per nivell</div><select id="fsLv"><option value="">—</option>' + S.model.levels.map(l => '<option value="' + l.id + '">' + esc(l.name) + ' (' + fmtElev(l.elev) + ')</option>').join('') + '</select>'; fp.appendChild(lv);
  const rs = el('button', 'btn sm', 'Restableix'); rs.style.margin = '6px 0 0'; fp.appendChild(rs);
  $('viewWrap').appendChild(fp);
  const sync = () => { $('fsOn').checked = c.on; fp.querySelectorAll('input[type=range]').forEach(i => { i.value = c[i.dataset.k]; }); $('fsRv').textContent = Math.round(c.rot) + '°'; };
  const upd = () => { applyClips(); syncNav(); };
  fp.querySelectorAll('input[type=range]').forEach(i => i.oninput = () => {
    const k = i.dataset.k, v = +i.value; c[k] = v;
    if (k[1] === '0' && c[k[0] + '1'] < v + 0.01) c[k[0] + '1'] = Math.min(1, v + 0.01); if (k[1] === '1' && c[k[0] + '0'] > v - 0.01) c[k[0] + '0'] = Math.max(0, v - 0.01);
    c.on = true; sync(); upd();
  });
  $('fsOn').onchange = e => { c.on = e.target.checked; upd(); };
  $('fsLv').onchange = e => { const l = S.model.levels.find(x => String(x.id) === e.target.value); if (!l) return; const b = modelBox(), H = (b.max[2] - b.min[2]) || 1; c.z0 = Math.max(0, (l.elev - b.min[2]) / H - 0.002); c.z1 = Math.min(1, (l.elev + 1.2 - b.min[2]) / H); if (c.z1 <= c.z0 + 0.01) c.z1 = Math.min(1, c.z0 + 0.02); c.on = true; sync(); upd(); };
  rs.onclick = () => { Object.assign(c, { on: false, x0: 0, x1: 1, y0: 0, y1: 1, z0: 0, z1: 1, rot: 0 }); sync(); upd(); };
  $('fsX').onclick = () => { fp.remove(); };
  sync();
}
