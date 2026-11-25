/* ============================================================
   guaitaBIMup 10 — eines addicionals, nivells de treball,
   plans de referència, plans i caixa de secció, cotes i text,
   panell de navegació de la caseta de vistes
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
/* v0.59 · retall de planta: S.viewClips és el retall base de la vista; en una pestanya de planta es pot desactivar.
   S.pcut: null = automàtic (actiu només amb la càmera gairebé zenital), true/false = forçat per l'usuari fins que s'obri una altra vista */
const PC_ZEN = 0.26;
function planCutIsView() { return typeof S.view === 'string' && S.view.startsWith('plan:'); }
function planCutAuto() { const ph = camAnim && camAnim.to && camAnim.to.phi != null ? camAnim.to.phi : CAM.phi; return ph < PC_ZEN; }
function planCutOn() { if (!planCutIsView()) return true; return S.pcut == null ? planCutAuto() : !!S.pcut; }
function viewClipsEff() { return S.viewClips.length && planCutOn() ? S.viewClips : []; }
function planCutSync(force) {
  const on = planCutOn(); if (!force && S._pcLast === on) return; S._pcLast = on;
  if (typeof applyClips === 'function') applyClips();
  const b = document.querySelector('#tabs button.on i.pc'); if (b) planCutTab(b);
  if (typeof lnRefBuild === 'function' && planCutIsView()) lnRefBuild();
  needRender = true;
}
function planCutTab(i) { const on = planCutOn(), man = S.pcut != null; i.classList.toggle('off', !on); i.title = (on ? 'Retall de planta actiu' : 'Model complet, sense retall') + (man ? ' (manual)' : ' (automàtic)') + ' · clic: ' + (on ? 'mostra el model complet' : 'torna a tallar') + ' · Maj+clic: automàtic'; }
function togglePlanCut(auto) {
  if (!planCutIsView()) return;
  if (auto) { S.pcut = null; toast('Retall de planta: automàtic (només en vista de planta).'); }
  else { S.pcut = !planCutOn(); toast(S.pcut ? 'Retall de planta activat.' : 'Model complet: retall de planta desactivat.'); }
  planCutSync(true);
}
function applyClips() { if (!renderer) return; if (!S.viewClips.length) S.planGhost = null; const vc = viewClipsEff(); renderer.clippingPlanes = [...vc, ...secPlanes(), ...boxPlanes()]; needRender = true; }

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
/* v0.37 · còpia de nivells: només el nivell o amb el seu contingut (grups assignats al nivell, al context arrel) */
function levelSelIds() { const ids = S.model.levels.filter(l => S.selAnn.lvls.has(l.id)).map(l => l.id); return ids.length ? ids : [S.level]; }
function copyLevels(ids, dz, content) {
  const src = S.model.levels.filter(l => ids.includes(l.id)).sort((a, b) => a.elev - b.elev);
  if (!src.length || !isFinite(dz) || Math.abs(dz) < 1e-6) { toast('Indica un desplaçament diferent de zero.'); return false; }
  pushUndo('copiar nivell'); const map = new Map(); let skipped = 0; const root = S.model.root;
  for (const l of src) {
    const z = Math.round((l.elev + dz) * 1000) / 1000;
    if (S.model.levels.some(x => Math.abs(x.elev - z) < 1e-6)) { skipped++; continue; }
    let name = l.name + ' (còpia)', k = 2; while (S.model.levels.some(x => x.name === name)) name = l.name + ' (còpia ' + k++ + ')';
    const n = { id: S.model.nid++, name, elev: z }; S.model.levels.push(n); map.set(l.id, n);
  }
  S.model.levels.sort((a, b) => a.elev - b.elev);
  let cnt = 0;
  if (content) for (const [oid, n] of map) {
    const ol = S.model.levels.find(x => x.id === oid), d = n.elev - ol.elev, idm = new Map(), made = [];
    for (const g of [...root.groups.values()]) if (g.level === oid) { const c = K.cloneGroup(S.model, g); c.t = V.add(g.t, [0, 0, d]); c.name = g.name; c.level = n.id; root.groups.set(c.id, c); idm.set(g.id, c.id); made.push(c); cnt++; }
    for (const c of made) if (c.par && c.par.host != null && idm.has(c.par.host)) { c.par.host = idm.get(c.par.host); c.t = [0, 0, 0]; }
  }
  if (map.size) S.level = [...map.values()].pop().id;
  refreshAll(); clearAnnSel();
  toast(map.size + ' nivell(s) copiat(s)' + (content ? ' amb ' + cnt + ' element(s)' : '') + (skipped ? ' · ' + skipped + ' ja existia(n) a la cota' : '') + '.');
  return map.size > 0;
}
function levelsPanel(b) {
  const top = el('div', 'row', '<span class="dim gw">Clic: activa · Ctrl/Maj+clic: selecciona</span>'); const nb = el('button', 'btn sm', '+ Nivell'); nb.onclick = () => setTool('level'); top.appendChild(nb); b.appendChild(top);
  b.appendChild(visModeRow('lvl', 'Representació', [['full', 'Complet'], ['compact', 'Compacte']]));
  S.model.levels.slice().reverse().forEach(l => {
    const act = l.id === S.level, r = el('div', 'row it' + (act ? ' on' : '') + (S.selAnn.lvls.has(l.id) ? ' sel' : ''), '<input type="checkbox" class="eye" title="Visible"' + (l.hidden ? '' : ' checked') + '><span style="color:var(--accent);width:10px">' + (act ? '●' : '○') + '</span><span class="gw">' + esc(l.name) + '</span><span class="mono dim">' + fmtElev(l.elev) + '</span>');
    r.ondblclick = () => { annSelectOnly('lvls', l.id); annEditDlg('lvls', l); }; r.onclick = ev => { if (ev.ctrlKey || ev.metaKey || ev.shiftKey) { toggleAnnSel('lvls', l.id); renderTray(); } else setLevel(l.id); }; b.appendChild(r); if (S.selAnn.lvls.has(l.id)) r.style.outline = '1px solid var(--accent)';
    { const ck = r.querySelector('.eye'); ck.onclick = e => e.stopPropagation(); ck.onchange = () => { l.hidden = !ck.checked; markDirty(); rebuildAnnot(); }; }
    if (act) {
      const ed = el('div', 'kv'); ed.style.margin = '4px 0 6px 16px';
      ed.innerHTML = '<span>Nom</span><input type="text" id="lvName" value="' + esc(l.name) + '"><span>Elevació (m)</span><input type="text" id="lvElev" value="' + fmt(l.elev, 3) + '"><span></span><span><button class="btn sm" id="lvVr">Rang de vista…</button> <button class="btn sm" id="lvDel">Esborra</button></span>';
      b.appendChild(ed);
      const q = id => ed.querySelector('#' + id), apply = () => { const v = parseNum(q('lvElev').value); if (v == null) { toast('Elevació no vàlida.'); return; } editLevel(l, q('lvName').value.trim(), v); };
      q('lvName').onchange = apply; q('lvElev').onchange = apply; q('lvDel').onclick = () => delLevel(l); q('lvVr').onclick = () => annEditDlg('lvls', l);
    }
  });
  const a = el('div', 'row', ''); a.style.flexWrap = 'wrap';
  [['Mou al nivell actiu', 'move'], ['Copia al nivell actiu', 'copy'], ['Assigna sense moure', 'assign']].forEach(([t, m]) => { const x = el('button', 'btn sm', t); x.onclick = () => toLevel(m); a.appendChild(x); });
  b.appendChild(a);
  { const cp = el('div', 'row', '<span class="dim gw">Copia nivell(s) seleccionat(s) · Δz (m)</span><input type="text" id="lvDz" value="3" style="width:56px">'); cp.style.flexWrap = 'wrap'; b.appendChild(cp);
    const go = (content) => copyLevels(levelSelIds(), parseNum(cp.querySelector('#lvDz').value), content);
    const c1 = el('button', 'btn sm', 'Només el nivell'), c2 = el('button', 'btn sm', 'Nivell i contingut'); c1.onclick = () => go(false); c2.onclick = () => go(true); cp.appendChild(c1); cp.appendChild(c2); }
  b.appendChild(el('div', 'empty', 'Selecciona elements i prem el botó: es mouen o es copien amb el desnivell entre el seu nivell i l’actiu. Si canvies l’elevació d’un nivell, hi arrosseguen els grups assignats.'));
}
function guidesPanel(b) {
  const hd = t => b.appendChild(el('div', 'row hd', esc(t)));
  groundPanel(b);
  const delRow = (label, sub, onDel, extra) => { const r = el('div', 'row it', '<span class="gw">' + esc(label) + '</span><span class="mono dim">' + esc(sub || '') + '</span>'); if (extra) r.appendChild(extra); const x = el('button', 'x', '✕'); x.title = 'Esborra'; x.onclick = e => { e.stopPropagation(); pushUndo(); onDel(); refreshAll(); }; r.appendChild(x); b.appendChild(r); return r; };
  hd('Eixos de pilars'); b.appendChild(visModeRow('grd', 'Representació', [['full', 'Complet'], ['compact', 'Compacte'], ['plan', '1 línia en planta']])); if (!S.model.grids.length) b.appendChild(el('div', 'empty', 'Cap (GR).')); S.model.grids.forEach(g => { const r = delRow('Eix ' + g.name, fmtM(Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1])), () => { S.model.grids = S.model.grids.filter(x => x !== g); }, eyeBox(g)); r.title = 'Clic: selecciona (agafadors 3D) · doble clic: edita'; if (S.selAnn.grids.has(g.id)) r.style.outline = '1px solid var(--accent)'; r.onclick = () => { annSelectOnly('grids', g.id); renderTray(); }; r.ondblclick = () => annEditDlg('grids', g); });
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
const matDimLine = new THREE.LineBasicMaterial({ color: 0x1B1D21, depthTest: false }), matDimSel = new THREE.LineBasicMaterial({ color: 0xC6FF1A, depthTest: false });
/* cotes i textos: tria per pantalla (retorna {k:'dims'|'texts', id}) */
function segDist(px, py, a, b) { const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy, t = L ? Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / L)) : 0; return Math.hypot(px - (a.x + t * vx), py - (a.y + t * vy)); }
function pickAnn(mx, my) {
  let best = null, bd = Infinity; const S3 = p => { const s = toScreen(p); return s.z < 1 ? s : null; };
  for (const d of S.model.dims) {
    const o = dimOff(d), a = S3(d.a), b = S3(d.b), a2 = S3(V.add(d.a, o)), b2 = S3(V.add(d.b, o)); if (!a || !b || !a2 || !b2) continue;
    let m = Math.min(segDist(mx, my, a, a2), segDist(mx, my, b, b2), segDist(mx, my, a2, b2)); const cx = (a2.x + b2.x) / 2, cy = (a2.y + b2.y) / 2; if (Math.abs(mx - cx) < 32 && Math.abs(my - cy) < 10) m = 0;
    if (m <= OPT.pick && m < bd) { bd = m; best = { k: 'dims', id: d.id }; }
  }
  for (const t of S.model.texts) { const s = S3(t.p); if (!s) continue; const hw = Math.max(14, t.t.length * 3.6 + 8); if (Math.abs(mx - s.x) < hw && Math.abs(my - s.y) < 10) { const m = 0; if (m <= bd) { bd = m; best = { k: 'texts', id: t.id }; } } }
  return best;
}
function selAnnOp(an, mode) {
  if (mode === 'replace') clearSel(); const set = S.selAnn[an.k];
  if (mode === 'remove') set.delete(an.id); else if (mode === 'toggle') { if (set.has(an.id)) set.delete(an.id); else set.add(an.id); } else set.add(an.id);
  rebuildAnnot(); renderInfo(); syncUI();
}
function delSelAnn() { const A = S.selAnn; if (!A.dims.size && !A.texts.size) return false; S.model.dims = S.model.dims.filter(d => !A.dims.has(d.id)); S.model.texts = S.model.texts.filter(t => !A.texts.has(t.id)); A.dims.clear(); A.texts.clear(); return true; }
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
    const dsel = S.selAnn.dims.has(d.id); for (const [p, q] of [[d.a, a2], [d.b, b2], [a2, b2]]) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p), new THREE.Vector3(...q)]), dsel ? matDimSel : matDimLine); l.renderOrder = 8; gAnnot.add(l); }
    addLab('dimtxt' + (dsel ? ' sel' : ''), fmt(V.dist(d.a, d.b), 3) + ' m', V.lerp(a2, b2, 0.5));
  }
  for (const t of S.model.texts) addLab('dimtxt' + (S.selAnn.texts.has(t.id) ? ' sel' : ''), esc(t.t), t.p);
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

/* ---------- panell de vista i caixa de secció (v0.39.0) ---------- */
const NAV_VIEWS = { O: [-1, 0, 0], PL: [0, 0, 1], E: [1, 0, 0], N: [0, 1, 0], S: [0, -1, 0], ISO: [1, -1, 0.9] };
const NV_AX = { SO: [-1, -1, 'sud-oest'], SE: [1, -1, 'sud-est'], NE: [1, 1, 'nord-est'], NO: [-1, 1, 'nord-oest'] };
const axoDir = k => [NV_AX[k][0] * TRI[0], NV_AX[k][1] * TRI[1], TRI[2]];
function curDir() { const th = CAM.theta, ph = CAM.phi; return [Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph)]; }
const nvSvg = (d, vb, sw) => '<svg viewBox="0 0 ' + (vb || 24) + ' ' + (vb || 24) + '" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.6) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const NV_HINT = { N: 'Alçat nord, vist des del nord', S: 'Alçat sud, vist des del sud', E: 'Alçat est, vist des de l’est', O: 'Alçat oest, vist des de l’oest', PL: 'Planta, vista des de dalt', prev: 'Torna a la vista anterior', home: 'Isomètrica inicial', fit: 'Ajusta el model (selecció si n’hi ha)', sec: 'Caixa de secció' };
const NV_ACT = {
  N: () => goDir(NAV_VIEWS.N), S: () => goDir(NAV_VIEWS.S), E: () => goDir(NAV_VIEWS.E), O: () => goDir(NAV_VIEWS.O), PL: () => goDir(NAV_VIEWS.PL),
  home: () => { if (CAM.proj === 'mil' || CAM.proj === 'cav') CAM.proj = 'axo'; animateCam({ theta: -Math.PI / 4, phi: 0.95 }); },
  prev: () => prevView(), fit: () => fitView(!!selCount()), sec: () => sectionBoxPanel(),
  camwin: () => { if (CAM.proj !== 'conic') setProj('conic'); camWin(); }, conic: () => setProj('conic'), axo: () => setProj('axo'), cav: () => setProj('cav'), mil: () => setProj('mil'),
  SO: () => { CAM.proj = 'axo'; goDir(axoDir('SO')); }, SE: () => { CAM.proj = 'axo'; goDir(axoDir('SE')); }, NE: () => { CAM.proj = 'axo'; goDir(axoDir('NE')); }, NO: () => { CAM.proj = 'axo'; goDir(axoDir('NO')); },
  wire: () => { S.style.wire = !S.style.wire; refreshAll(); }, xray: () => { S.style.xray = !S.style.xray; refreshAll(); }, edges: () => { S.style.edges = !S.style.edges; refreshAll(); },
  cifc: () => { S.style.colorBy = S.style.colorBy === 'ifc' ? 'mat' : 'ifc'; refreshAll(); },
  ground: () => { S.show.ground = !S.show.ground; refreshAll(); }, sky: () => setBg('sky'), white: () => setBg('white'), grey: () => setBg('grey'), black: () => setBg('black'),
};
function buildNav() {
  const p = $('navPanel'), tri = (pos, d) => '<svg class="tri" style="' + pos + '" viewBox="0 0 8 8" aria-hidden="true"><path d="' + d + '"/></svg>';
  const cell = (a, cls, inner, lab) => '<button class="nv-c ' + cls + '" data-a="' + a + '" data-h="' + (NV_HINT[a] || lab) + '" title="' + (lab || NV_HINT[a]) + '" aria-label="' + (lab || NV_HINT[a]) + '">' + inner + '</button>';
  const sec = t => '<div class="nv-sec">' + t + '</div>';
  const proj = (k, l, ic) => '<button class="nv-o h" data-a="' + k + '" data-h="' + l + '" title="' + l + '">' + ic + l + '</button>';
  const sty = (k, l, ic) => '<button class="nv-o v" data-a="' + k + '" data-h="' + l + '" title="' + l + '">' + ic + '<span>' + l + '</span></button>';
  const pv = k => '<button class="nv-o v mono" data-a="' + k + '" data-h="Axonometria des del ' + NV_AX[k][2] + '" title="Des del ' + NV_AX[k][2] + '" aria-label="Axonometria des del ' + NV_AX[k][2] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="1"/><circle cx="' + (NV_AX[k][0] < 0 ? 4 : 20) + '" cy="' + (NV_AX[k][1] < 0 ? 20 : 4) + '" r="3" fill="currentColor" stroke="none"/></svg><span>' + k + '</span></button>';
  const bg = (k, l, c) => '<button class="nv-bg" data-a="' + k + '" data-h="Fons: ' + l + '" title="' + l + '" aria-label="Fons ' + l + '" style="background:' + c + '"></button>';
  p.innerHTML = '<div class="nv-hd"><b>Vista</b><span id="nvChip"></span></div>' +
    sec('Vistes ortogonals') + '<div class="nv-cross">' +
    cell('prev', 'ut', nvSvg('<path d="M4 9h10a5 5 0 0 1 0 10h-3M4 9l4-4M4 9l4 4"/>'), 'Vista anterior') +
    cell('N', '', tri('bottom:5px', 'M4 7L1 2h6z') + 'N', 'Alçat nord') +
    cell('home', 'ut', nvSvg('<path d="M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5"/>'), 'Isomètrica inicial') +
    cell('O', '', tri('right:6px', 'M7 4L2 1v6z') + 'O', 'Alçat oest') + cell('PL', 'pl', 'PL', 'Planta') + cell('E', '', tri('left:6px', 'M1 4l5-3v6z') + 'E', 'Alçat est') +
    cell('fit', 'ut', nvSvg('<path d="M4 20L20 4M14 4h6v6M10 20H4v-6"/>'), 'Ajusta el model') +
    cell('S', '', tri('top:5px', 'M4 1l3 5H1z') + 'S', 'Alçat sud') +
    cell('sec', 'ut', nvSvg('<path d="M4 8l8-4 8 4v8l-8 4-8-4z" stroke-dasharray="2.5 2"/><path d="M4 8l8 4 8-4M12 12v8"/>'), 'Caixa de secció') + '</div><div class="nv-hint" id="nvHint"></div>' +
    sec('Projecció') + '<div class="nv-row2">' +
    proj('axo', 'Axonomètrica', nvSvg('<path d="M13 3l9 5v10l-9 5-9-5V8zM4 8l9 5 9-5M13 13v10"/>', 26, 1.5)) + proj('conic', 'Cònica', nvSvg('<path d="M3 5h20v16H3zM9 9h8v8H9zM3 5l6 4M23 5l-6 4M3 21l6-4M23 21l-6-4"/>', 26, 1.5)) +
    proj('cav', 'Cavallera', nvSvg('<path d="M3 10h12v12H3zM9 4h12v12M3 10l6-6M15 10l6-6M15 22l6-6"/>', 26, 1.5)) + proj('mil', 'Militar', nvSvg('<path d="M4 13l9-4 9 4-9 4zM4 13v5l9 4 9-4v-5M13 17v5"/>', 26, 1.5)) + '</div>' +
    '<button class="nv-o h nv-wide" data-a="camwin" data-h="Càmera cònica: focal, quadre, fugues i òrbita" title="Càmera cònica…" aria-label="Càmera cònica">' + nvSvg('<path d="M3 8h14v10H3zM17 11l5-3v10l-5-3M7 8l1.5-2h5L15 8"/>', 26, 1.5) + 'Càmera cònica…</button>' +
    sec('Punt de vista axonomètric') + '<div class="nv-row4">' + pv('SO') + pv('SE') + pv('NE') + pv('NO') + '</div>' +
    sec('Estil') + '<div class="nv-row4">' +
    sty('wire', 'Filferro', nvSvg('<path d="M11 3l8 4v9l-8 4-8-4V7zM3 7l8 4 8-4"/><path d="M11 11v9" stroke-dasharray="2 2"/>', 22, 1.4)) +
    sty('xray', 'Raigs X', nvSvg('<path d="M3 7l8-4 8 4v9l-8 4-8-4z" stroke-dasharray="2 2"/><rect x="6" y="8" width="10" height="9" rx="1"/>', 22, 1.4)) +
    sty('edges', 'Arestes', nvSvg('<rect x="4" y="5" width="14" height="12" rx="1"/>', 22, 1.4)) +
    sty('cifc', 'IFC', '<b class="nv-ifc">IFC</b>') + '</div>' +
    sec('Terra i fons') + '<div class="nv-row5"><button class="nv-bg nv-gr" data-a="ground" data-h="Terra: mostra o amaga el pla del terra i la quadrícula" title="Terra" aria-label="Terra">' + nvSvg('<path d="M2 15l7-5h12l-7 5z"/><path d="M6 12.2h12M5 13.6h12" stroke-width="0.9"/>', 24, 1.3) + '</button>' + bg('sky', 'Cel', 'linear-gradient(#7FB0E8,#F2F5F8)') + bg('white', 'Blanc', '#f2f4f1') + bg('grey', 'Gris fosc', '#23272E') + bg('black', 'Negre', '#0a0c0b') + '</div>';
  p.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; e.stopPropagation(); const f = NV_ACT[b.dataset.a]; if (f) f(); syncNav(); };
  p.onmouseover = e => { const b = e.target.closest('[data-h]'), h = $('nvHint'); if (h) h.textContent = b ? b.dataset.h : ''; };
  p.onmouseleave = () => { const h = $('nvHint'); if (h) h.textContent = ''; };
  syncNav();
}
function nvOn(a) {
  const d = curDir(), same = k => { const n = V.norm(k); return V.dot(d, n) > 0.9995; };
  if (['N', 'S', 'E', 'O', 'PL'].includes(a)) return same(NAV_VIEWS[a]);
  if (NV_AX[a]) return CAM.proj === 'axo' && same(axoDir(a));
  if (['conic', 'axo', 'cav', 'mil'].includes(a)) return CAM.proj === a;
  return a === 'wire' ? !!S.style.wire : a === 'xray' ? !!S.style.xray : a === 'edges' ? !!S.style.edges : a === 'cifc' ? S.style.colorBy === 'ifc' : a === 'sec' ? !!S.clipBox.on : a === 'ground' ? !!S.show.ground : ['sky', 'white', 'grey', 'black'].includes(a) ? S.bg === a : false;
}
function syncNav() {
  const PN = { conic: 'Cònica', axo: 'Axonomètrica', cav: 'Cavallera', mil: 'Militar' };
  document.querySelectorAll('#navPanel [data-a]').forEach(b => { const a = b.dataset.a; if (['home', 'prev', 'fit'].includes(a)) return; const on = nvOn(a); b.classList.toggle('on', on); if (b.classList.contains('nv-o') || b.classList.contains('nv-bg')) b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  const ch = $('nvChip'); if (ch) ch.textContent = PN[CAM.proj] + (S.style.wire ? ', filferro' : '') + (S.style.xray ? ', raigs X' : '');
  const pn = $('navPanel'); if (pn) pn.classList.toggle('show', S.navOpen); const nb = $('navBtnTxt'); if (nb) nb.textContent = PN[CAM.proj];
}
function toggleNav(f) { S.navOpen = f == null ? !S.navOpen : f; syncNav(); }

/* ---------- caixa de secció amb planta en miniatura ---------- */
function boxFrame() {
  const c = S.clipBox, b = modelBox(), r = c.rot * Math.PI / 180, u = [Math.cos(r), Math.sin(r), 0], w = [-Math.sin(r), Math.cos(r), 0];
  const rng = ax => { let lo = Infinity, hi = -Infinity; for (let i = 0; i < 8; i++) { const p = [i & 1 ? b.max[0] : b.min[0], i & 2 ? b.max[1] : b.min[1], i & 4 ? b.max[2] : b.min[2]], d = V.dot(p, ax); lo = Math.min(lo, d); hi = Math.max(hi, d); } return [lo, hi]; };
  return { b, u, w, ru: rng(u), rw: rng(w), rz: [b.min[2], b.max[2]] };
}
function secPlanDraw(cv) {
  const c = S.clipBox, F = boxFrame(), W = 220, H = 176, g = cv.getContext('2d'); if (!g) return;
  cv.width = W * 2; cv.height = H * 2; g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, W, H);
  const L = (r, f) => r[0] + f * (r[1] - r[0]), uA = L(F.ru, c.x0), uB = L(F.ru, c.x1), wA = L(F.rw, c.y0), wB = L(F.rw, c.y1);
  const wp = (a, b) => [F.u[0] * a + F.w[0] * b, F.u[1] * a + F.w[1] * b], cr = [wp(uA, wA), wp(uB, wA), wp(uB, wB), wp(uA, wB)];
  const all = [...cr]; for (const x of [F.b.min[0], F.b.max[0]]) for (const y of [F.b.min[1], F.b.max[1]]) all.push([x, y]);
  const x0 = Math.min(...all.map(q => q[0])), x1 = Math.max(...all.map(q => q[0])), y0 = Math.min(...all.map(q => q[1])), y1 = Math.max(...all.map(q => q[1]));
  const sc = Math.min((W - 36) / Math.max(1e-6, x1 - x0), (H - 36) / Math.max(1e-6, y1 - y0)), ox = (W - (x1 - x0) * sc) / 2, oy = (H - (y1 - y0) * sc) / 2;
  const P = q => [ox + (q[0] - x0) * sc, H - (oy + (q[1] - y0) * sc)], E = (SNAP.edges || []).slice(0, 6000);
  const path = () => { g.beginPath(); for (const e of E) { const a = P(e.a), b = P(e.b); if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < 0.2) continue; g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } };
  const poly = () => { g.beginPath(); cr.forEach((q, i) => { const s = P(q); i ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); }); g.closePath(); };
  g.lineWidth = 1; g.strokeStyle = '#4A5361'; path(); g.stroke();
  if (c.on || c.x0 > 0 || c.x1 < 1 || c.y0 > 0 || c.y1 < 1) { g.save(); poly(); g.clip(); g.fillStyle = 'rgba(214,251,65,.10)'; g.fillRect(0, 0, W, H); g.strokeStyle = '#D6FB41'; g.lineWidth = 1.2; path(); g.stroke(); g.restore(); }
  poly(); g.setLineDash([4, 3]); g.strokeStyle = '#D6FB41'; g.lineWidth = 1.2; g.stroke(); g.setLineDash([]);
  for (let i = 0; i < 4; i++) { const a = P(cr[i]), b = P(cr[(i + 1) % 4]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; g.fillStyle = '#171B21'; g.strokeStyle = '#D6FB41'; g.lineWidth = 1.2; g.fillRect(m[0] - 3.5, m[1] - 3.5, 7, 7); g.strokeRect(m[0] - 3.5, m[1] - 3.5, 7, 7); }
  g.lineWidth = 1.6; g.lineCap = 'round'; g.strokeStyle = '#FF5E5E'; g.beginPath(); g.moveTo(10, H - 10); g.lineTo(34, H - 10); g.stroke(); g.strokeStyle = '#6EE7A8'; g.beginPath(); g.moveTo(10, H - 10); g.lineTo(10, H - 34); g.stroke();
  g.font = '9px ' + getComputedStyle(document.body).fontFamily; g.fillStyle = '#FF5E5E'; g.fillText('X', 38, H - 7); g.fillStyle = '#6EE7A8'; g.fillText('Y', 6, H - 38);
}
function sectionBoxPanel() {
  const old = $('fpSec'); if (old) { old.remove(); return; }
  const c = S.clipBox, fp = el('div', ''); fp.id = 'fpSec';
  const lvls = [...S.model.levels].sort((a, b) => a.elev - b.elev);
  fp.innerHTML = '<div class="sb-hd"><b>Caixa de secció</b><span class="sb-hr"><button class="sb-sw" id="fsOn" role="switch" aria-checked="false"><i class="tk"></i>Activa</button><button class="sb-x" id="fsX" aria-label="Tanca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span></div>' +
    '<div class="sb-top"><div class="sb-zc"><div class="sb-zr" id="fsZ1"></div><div class="sb-zt" id="fsZt"><div class="sb-vz"><div class="sb-vzi"><div class="dr"><div class="tr"></div><div class="fi" id="fiZ"></div><input type="range" min="0" max="1" step="0.005" data-k="z0" aria-label="Alçada mínima"><input type="range" min="0" max="1" step="0.005" data-k="z1" aria-label="Alçada màxima"></div></div></div></div><div class="sb-zr" id="fsZ0"></div></div>' +
    '<div class="sb-pv"><canvas id="fsPlan" width="440" height="352" role="img" aria-label="Planta amb la caixa de secció"></canvas></div></div>' +
    '<div class="sb-ctl"><div class="sb-rw"><span class="lb">Gir</span><div class="dr"><div class="tr"></div><div class="fi" id="fiR"></div><input type="range" min="0" max="360" step="1" data-k="rot" aria-label="Gir de la caixa"></div><span class="vl" id="fsRv"></span></div>' +
    '<div class="sb-rw"><span class="lb"><i style="background:#FF5E5E"></i>Eix X</span><div class="dr"><div class="tr"></div><div class="fi" id="fiX"></div><input type="range" min="0" max="1" step="0.005" data-k="x0" aria-label="X mínima"><input type="range" min="0" max="1" step="0.005" data-k="x1" aria-label="X màxima"></div><span class="vl" id="fsXv"></span></div>' +
    '<div class="sb-rw"><span class="lb"><i style="background:#6EE7A8"></i>Eix Y</span><div class="dr"><div class="tr"></div><div class="fi" id="fiY"></div><input type="range" min="0" max="1" step="0.005" data-k="y0" aria-label="Y mínima"><input type="range" min="0" max="1" step="0.005" data-k="y1" aria-label="Y màxima"></div><span class="vl" id="fsYv"></span></div></div>' +
    '<div class="sb-fr"><select id="fsLv" aria-label="Talla per nivell"><option value="">Talla per nivell</option>' + lvls.map(l => '<option value="' + l.id + '">' + esc(l.name) + ' (' + fmtElev(l.elev) + ')</option>').join('') + '<option value="all">Tot l’edifici</option></select><button class="sb-rs" id="fsRs">Restableix</button></div>' +
    '<div class="sb-lg"><span><i style="background:var(--accent)"></i>Part visible</span><span><i style="background:#4A5361"></i>Retallat</span></div>';
  $('viewWrap').appendChild(fp);
  const fill = (id, lo, hi, mx) => { const f = $(id); f.style.left = 'calc(8px + (100% - 16px) * ' + (lo / mx) + ')'; f.style.width = 'calc((100% - 16px) * ' + ((hi - lo) / mx) + ')'; };
  const m2 = v => v.toFixed(2) + ' m';
  const sync = () => {
    const F = boxFrame(), L = (r, f) => r[0] + f * (r[1] - r[0]); const sw = $('fsOn'); sw.classList.toggle('on', c.on); sw.setAttribute('aria-checked', c.on ? 'true' : 'false'); $('fpSec').classList.toggle('off', !c.on);
    fp.querySelectorAll('input[type=range]').forEach(i => { i.value = c[i.dataset.k]; });
    fill('fiZ', c.z0, c.z1, 1); fill('fiX', c.x0, c.x1, 1); fill('fiY', c.y0, c.y1, 1); fill('fiR', 0, c.rot, 360);
    $('fsZ1').textContent = m2(L(F.rz, c.z1)); $('fsZ0').textContent = m2(L(F.rz, c.z0)); $('fsRv').textContent = Math.round(c.rot) + '°';
    $('fsXv').textContent = L(F.ru, c.x0).toFixed(2) + ' a ' + L(F.ru, c.x1).toFixed(2) + ' m'; $('fsYv').textContent = L(F.rw, c.y0).toFixed(2) + ' a ' + L(F.rw, c.y1).toFixed(2) + ' m';
    const zt = $('fsZt'); zt.querySelectorAll('.sb-lab').forEach(n => n.remove()); const H = F.rz[1] - F.rz[0];
    if (H > 1e-6) for (const l of lvls) { const f = (l.elev - F.rz[0]) / H; if (f < -0.001 || f > 1.001) continue; const y = 8 + f * 160; zt.insertAdjacentHTML('beforeend', '<div class="sb-lab" style="bottom:' + y + 'px"><span>' + fmtElev(l.elev) + '</span><i></i></div>'); }
    secPlanDraw($('fsPlan'));
  };
  const upd = () => { applyClips(); syncNav(); };
  fp.querySelectorAll('input[type=range]').forEach(i => i.oninput = () => {
    const k = i.dataset.k, v = +i.value; c[k] = v;
    if (k[1] === '0' && c[k[0] + '1'] < v + 0.01) c[k[0] + '1'] = Math.min(1, v + 0.01); if (k[1] === '1' && c[k[0] + '0'] > v - 0.01) c[k[0] + '0'] = Math.max(0, v - 0.01);
    c.on = true; sync(); upd();
  });
  $('fsOn').onclick = () => { c.on = !c.on; sync(); upd(); };
  $('fsLv').onchange = e => {
    const val = e.target.value, F = boxFrame(), H = (F.rz[1] - F.rz[0]) || 1;
    if (val === 'all') { c.z0 = 0; c.z1 = 1; } else { const i = lvls.findIndex(x => String(x.id) === val); if (i < 0) return; const l = lvls[i], nx = lvls[i + 1], top = nx ? nx.elev : F.rz[1]; c.z0 = Math.max(0, (l.elev - F.rz[0]) / H - 0.002); c.z1 = Math.min(1, (top - F.rz[0]) / H); if (c.z1 <= c.z0 + 0.01) c.z1 = Math.min(1, c.z0 + 0.02); }
    c.on = true; sync(); upd();
  };
  $('fsRs').onclick = () => { Object.assign(c, { on: false, x0: 0, x1: 1, y0: 0, y1: 1, z0: 0, z1: 1, rot: 0 }); $('fsLv').value = ''; sync(); upd(); };
  $('fsX').onclick = () => { fp.remove(); };
  sync();
}

/* ---------- v0.40 · elements editables (nivells i eixos) i rang de vista de plantes ---------- */
/* rang de vista d'un nivell (com a Revit): pla de tall, fons del rang principal i profunditat de vista; tot en m respecte al nivell */
/* fletxes: amb un eix d'edició seleccionat, forcen la seva direcció (horitzontal/vertical) i conserven la longitud */
window.addEventListener('keydown', ev => {
  if (!/^Arrow(Up|Down|Left|Right)$/.test(ev.key) || ev.altKey || ev.ctrlKey || ev.metaKey) return;
  if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
  const t = typeof annGripTarget === 'function' ? annGripTarget() : null; if (!t || t.ann !== 'grid') return;
  const g = t.gr, dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[ev.key], len = Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]);
  ev.preventDefault(); pushUndo(); g.b = [g.a[0] + dir[0] * len, g.a[1] + dir[1] * len]; refreshAll();
});
/* vista de planta (Revit): el rang pertany a la vista, que té un nivell associat; el nivell només aporta l'elevació */
function pvOf(l) { return (S.model.planViews || []).find(p => p.lvl === l.id) || null; }
function pvSet(l, v) { S.model.planViews = S.model.planViews || []; let p = pvOf(l); if (!p) { p = { lvl: l.id }; S.model.planViews.push(p); } Object.assign(p, v); }
function vrOf(l) { const p = pvOf(l) || {}, n = x => (typeof x === 'number' && isFinite(x) ? x : null); return { cut: n(p.cut) != null ? p.cut : 1.2, bot: n(p.bot) != null ? p.bot : 0, depth: n(p.depth) != null ? p.depth : 0.1, rear: n(p.rear) != null ? p.rear : 0 }; }
function vrFar(l) { const v = vrOf(l); return Math.max(0.01, v.cut - v.bot + v.depth); }
function levelSetElev(l, v) {
  const dz = v - l.elev; l.elev = v;
  if (Math.abs(dz) > 1e-9) for (const g of S.model.root.groups.values()) if (g.level === l.id && !g.par) g.t = V.add(g.t, [0, 0, dz]);
  S.model.levels.sort((a, b) => a.elev - b.elev);
}
function annSelectOnly(kind, id) { clearSel(); S.selAnn[kind].add(id); rebuildAnnot(); renderInfo(); syncUI(); }
function annGripTarget() { const A = S.selAnn; if (A.dims.size || A.texts.size) return null; const n = A.lvls.size + A.grids.size; if (n !== 1) return null; if (A.lvls.size) { const l = S.model.levels.find(x => A.lvls.has(x.id)); return l ? { ann: 'lvl', l, g: null, c: null, off: [0, 0, 0] } : null; } const g = S.model.grids.find(x => A.grids.has(x.id)); return g ? { ann: 'grid', gr: g, g: null, c: null, off: [0, 0, 0] } : null; }
function annGripDefs(t) {
  const out = [];
  if (t.ann === 'lvl') { const l = t.l, e = annotExtent();
    out.push({ key: 'lz', cls: 'z', p: [e.x0, e.y0, l.elev], mode: 'z', z: l.elev, label: () => fmtElev(l.elev), get: () => l.elev, setZ: v => { levelSetElev(l, Math.round(v * 1000) / 1000); }, title: 'Arrossega: elevació del nivell (arrossega els grups assignats) · clic al valor: escriu-la · doble clic a l’etiqueta: edita' });
    return out; }
  const g = t.gr, z = workZ(), m = [(g.a[0] + g.b[0]) / 2, (g.a[1] + g.b[1]) / 2], a0 = g.a.slice(), b0 = g.b.slice();
  for (const k of ['a', 'b']) out.push({ key: 'g' + k, cls: 'v', p: [g[k][0], g[k][1], z], mode: 'xy', alt: 'orth', z, other: () => g[k === 'a' ? 'b' : 'a'], title: 'Arrossega l’extrem de l’eix (s’enganxa a punts del model) · Maj: força horitzontal o vertical · fletxes: direcció', set: q => { g[k] = q; } });
  out.push({ key: 'gm', cls: 'e', p: [m[0], m[1], z], mode: 'xy', z, title: 'Arrossega per moure tot l’eix', set: q => { const dx = q[0] - m[0], dy = q[1] - m[1]; g.a = [a0[0] + dx, a0[1] + dy]; g.b = [b0[0] + dx, b0[1] + dy]; } });
  return out;
}
function annEditDlg(kind, o) {
  const F = (id, lab, val) => '<span>' + lab + '</span><input type="text" id="' + id + '" value="' + esc(String(val)) + '">';
  let h = '<h3>' + (kind === 'lvls' ? 'Nivell' : 'Eix de pilars') + '</h3><div class="kv">';
  if (kind === 'lvls') { const v = vrOf(o); h += F('aeN', 'Nom', o.name) + F('aeZ', 'Elevació (m)', fmt(o.elev, 3)) + '</div><h3 style="margin-top:10px">Rang de vista de la planta</h3><div class="kv">' + F('aeC', 'Pla de tall (m sobre el nivell)', fmt(v.cut, 3)) + F('aeB', 'Fons del rang principal (m)', fmt(v.bot, 3)) + F('aeD', 'Profunditat de vista (m sota el fons)', fmt(v.depth, 3)) + F('aeRe', 'Darrere l’observador, reflexades (m; 0 = no)', fmt(v.rear, 3)); }
  else h += F('aeN', 'Nom', o.name) + F('aeAx', 'Inici X (m)', fmt(o.a[0], 3)) + F('aeAy', 'Inici Y (m)', fmt(o.a[1], 3)) + F('aeBx', 'Final X (m)', fmt(o.b[0], 3)) + F('aeBy', 'Final Y (m)', fmt(o.b[1], 3));
  h += '</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">' + (kind === 'lvls' ? '<button class="btn" id="aeR">Valors per defecte</button>' : '') + '<button class="btn" id="aeX">Cancel·la</button><button class="btn acc" id="aeOk">Aplica</button></div>';
  $('dlgBox').innerHTML = h; $('dlg').classList.add('show'); const q = id => $('dlgBox').querySelector('#' + id), close = () => $('dlg').classList.remove('show');
  q('aeX').onclick = close;
  if (kind === 'lvls') q('aeR').onclick = () => { q('aeC').value = '1.2'; q('aeB').value = '0'; q('aeD').value = '0.1'; q('aeRe').value = '0'; };
  q('aeOk').onclick = () => {
    if (kind === 'lvls') { const z = parseNum(q('aeZ').value), c = parseNum(q('aeC').value), b = parseNum(q('aeB').value), d = parseNum(q('aeD').value), rr = parseNum(q('aeRe').value); if (z == null || c == null || b == null || d == null || rr == null || rr < 0 || d < 0 || c <= b) { toast('Valors no vàlids: el pla de tall ha de ser sobre el fons i la profunditat ≥ 0.'); return; }
      pushUndo(); if (q('aeN').value.trim()) o.name = q('aeN').value.trim(); levelSetElev(o, z); pvSet(o, { cut: c, bot: b, depth: d, rear: rr }); }
    else { const v = ['aeAx', 'aeAy', 'aeBx', 'aeBy'].map(i => parseNum(q(i).value)); if (v.some(x => x == null) || (v[0] === v[2] && v[1] === v[3])) { toast('Coordenades no vàlides.'); return; }
      pushUndo(); if (q('aeN').value.trim()) o.name = q('aeN').value.trim(); o.a = [v[0], v[1]]; o.b = [v[2], v[3]]; }
    close(); refreshAll();
  };
}

/* ---------- directrius del projecte · Terra (v0.50) ---------- */
function groundPanel(b) {
  const c = groundCfg(), set = (k, v) => { pushUndo('Terra'); S.model.meta.ground = { ...groundCfg(), [k]: v }; refreshAll(); };
  const hd = el('div', 'row hd gr-hd'); const tg = el('label', 'gr-sw'); tg.innerHTML = '<input type="checkbox" id="grOn"' + (S.show.ground ? ' checked' : '') + '><span>Visible</span>'; tg.querySelector('input').onchange = e => { S.show.ground = e.target.checked; refreshAll(); };
  hd.appendChild(el('span', '', 'Terra')); hd.appendChild(tg); b.appendChild(hd);
  const box = el('div', 'gr-box' + (S.show.ground ? '' : ' off')); b.appendChild(box);
  const prev = el('div', 'gr-prev'); prev.style.setProperty('--gc', c.col); prev.style.setProperty('--go', c.op); prev.style.setProperty('--lc', c.gcol); prev.style.setProperty('--lo', c.grid ? c.gop : 0); prev.style.setProperty('--st', Math.max(4, Math.min(22, 14 * c.step)) + 'px'); prev.style.setProperty('--mj', c.major > 1 ? Math.max(4, Math.min(22, 14 * c.step)) * c.major + 'px' : '0px'); box.appendChild(prev);
  const R = (lab, inp, unit) => { const r = el('div', 'gr-r'); r.appendChild(el('span', '', lab)); r.appendChild(inp); if (unit) r.appendChild(el('i', '', unit)); box.appendChild(r); return inp; };
  const colr = (k) => { const i = el('input'); i.type = 'color'; i.value = c[k]; i.dataset.gr = k; i.onchange = () => set(k, i.value); return i; };
  const rng = (k, mn, mx, st, pct) => { const w = el('span', 'gr-rng'), i = el('input'), o = el('output'); i.type = 'range'; i.min = mn; i.max = mx; i.step = st; i.value = c[k]; i.dataset.gr = k; const f = v => o.textContent = pct ? Math.round(v * 100) + ' %' : v; f(c[k]); i.oninput = () => f(+i.value); i.onchange = () => set(k, +i.value); w.appendChild(i); w.appendChild(o); return w; };
  const nm = (k, mn, mx, st) => { const i = el('input'); i.type = 'number'; i.min = mn; i.max = mx; i.step = st; i.value = c[k]; i.dataset.gr = k; i.onchange = () => { const v = +i.value; if (isFinite(v) && v >= mn && v <= mx) set(k, v); else i.value = c[k]; }; return i; };
  box.appendChild(el('div', 'gr-sub', 'Pla'));
  R('Color', colr('col')); R('Opacitat', rng('op', 0, 1, 0.05, true)); R('Cota (m)', nm('z', -100, 100, 0.01));
  const sub = el('div', 'gr-sub'); const ck = el('input'); ck.type = 'checkbox'; ck.checked = !!c.grid; ck.dataset.gr = 'grid'; ck.onchange = () => set('grid', ck.checked); sub.appendChild(ck); sub.appendChild(document.createTextNode(' Quadrícula')); box.appendChild(sub);
  R('Pas', nm('step', 0.05, 100, 0.05), 'm'); R('Mestra cada', nm('major', 0, 50, 1), 'línies'); R('Extensió', nm('ext', 1, 2000, 1), 'm'); R('Color', colr('gcol')); R('Opacitat', rng('gop', 0, 1, 0.05, true));
  const rs = el('button', 'btn sm', 'Valors per defecte'); rs.onclick = () => { pushUndo('Terra'); delete S.model.meta.ground; refreshAll(); }; box.appendChild(rs);
}
