/* ============================================================
   v0.55.0 · Sessions múltiples (autodesat per pestanya) i
   obrir / importar SketchUp (.skp) com a projecte.
   ============================================================ */
const SESS_IX = 'guaitabimup.sessions', SESS_P = 'guaitabimup.as.', SESS_DAYS = 30;
const SID = (() => { try { let s = sessionStorage.getItem('gbup.sid'); if (!s) { s = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); sessionStorage.setItem('gbup.sid', s); SID_NEW = true; } return s; } catch (e) { return 'x' + Date.now().toString(36); } })();
var SID_NEW;
const sessIx = () => { try { return JSON.parse(localStorage.getItem(SESS_IX)) || {}; } catch (e) { return {}; } };
const sessIxSet = o => { try { localStorage.setItem(SESS_IX, JSON.stringify(o)); } catch (e) { /* */ } };
function sessTouch(extra) { const o = sessIx(); o[SID] = { ...(o[SID] || {}), name: S.fileName || 'sense-títol', alive: Date.now(), ...extra }; sessIxSet(o); }
function sessSave(snap) { try { localStorage.setItem(SESS_P + SID, snap); sessTouch({ t: Date.now(), n: K.countAll(S.model.root).e }); } catch (e) { /* emmagatzematge ple */ } }
function sessDrop(id) { try { localStorage.removeItem(SESS_P + id); } catch (e) { } const o = sessIx(); delete o[id]; sessIxSet(o); }
function sessPurge() { const o = sessIx(), lim = Date.now() - SESS_DAYS * 864e5; for (const [id, r] of Object.entries(o)) if ((r.t || r.alive || 0) < lim || !localStorage.getItem(SESS_P + id)) { if (id !== SID) sessDrop(id); } }
/* còpies d'altres pestanyes que ja no estan obertes */
function sessOrphans() { const o = sessIx(), now = Date.now(); return Object.entries(o).filter(([id, r]) => id !== SID && r.t && now - (r.alive || 0) > 12000 && localStorage.getItem(SESS_P + id)).sort((a, b) => b[1].t - a[1].t); }
function sessLoad(js, name) { const m = K.fromJSON(JSON.parse(js)); cancelTool(); S.model = m; S.ctx = []; clearSel(); S.undo = []; S.redo = []; S.level = m.levels.length ? m.levels[0].id : null; S.tabs = []; S.view = null; if (name) S.fileName = name; S.viewClips = []; applyClips(); adoptStyle(); refreshAll(); fitView(); }
/* arrencada: recupera la pròpia sessió (recàrrega) o ofereix les còpies orfes */
function sessBoot() {
  sessPurge(); const nou = /[?&]nou/.test(location.search);
  try { const legacy = localStorage.getItem('guaitabimup.autosave') || localStorage.getItem('guaita3dsketch.autosave'); if (legacy) { const id = 'legacy'; localStorage.setItem(SESS_P + id, legacy); const o = sessIx(); o[id] = { name: 'còpia anterior a la v0.55', t: Date.now() - 1, alive: 0 }; sessIxSet(o); localStorage.removeItem('guaitabimup.autosave'); localStorage.removeItem('guaita3dsketch.autosave'); } } catch (e) { }
  if (nou) { sessTouch(); return; }
  const own = !SID_NEW && localStorage.getItem(SESS_P + SID); if (own) { try { const m = K.fromJSON(JSON.parse(own)); if (K.countAll(m.root).e) { S.model = m; S.level = m.levels.length ? m.levels[0].id : null; S.fileName = (sessIx()[SID] || {}).name || S.fileName; } } catch (e) { } sessTouch(); return; }
  sessTouch(); const L = sessOrphans(); if (L.length) setTimeout(() => sessDlg(L), 300);
}
function sessDlg(L) {
  L = L || sessOrphans(); const box = $('dlgBox'), fmt = t => new Date(t).toLocaleString('ca-ES', { dateStyle: 'short', timeStyle: 'short' });
  box.innerHTML = '<h3>Treballs sense desar</h3><p class="dim" style="font-size:12.5px">Aquestes còpies automàtiques són de sessions que ja no estan obertes. Recupera’n una en aquesta pestanya o descarta-les.</p><div id="sessL" class="sess-l"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn" id="sessAll">Descarta-les totes</button><button class="btn acc" id="sessX">Comença en blanc</button></div>';
  const ls = box.querySelector('#sessL'), draw = () => { ls.innerHTML = ''; const cur = sessOrphans(); if (!cur.length) { $('dlg').classList.remove('show'); return; }
    for (const [id, r] of cur) { const row = el('div', 'sess-r'); row.innerHTML = '<b>' + esc(r.name || 'sense títol') + '</b><span class="dim">' + fmt(r.t) + (r.n ? ' · ' + r.n + ' entitats' : '') + '</span>';
      const a = el('button', 'btn sm acc', 'Recupera'); a.dataset.sess = id; a.onclick = () => { try { sessLoad(localStorage.getItem(SESS_P + id), r.name); S.dirty = true; sessSave(snapshot()); sessDrop(id); updFileInfo(); toast('S’ha recuperat «' + (r.name || 'sense títol') + '».'); } catch (e) { toast('No s’ha pogut recuperar: ' + e.message); } $('dlg').classList.remove('show'); };
      const d = el('button', 'btn sm', 'Descarta'); d.onclick = () => { sessDrop(id); draw(); }; row.appendChild(a); row.appendChild(d); ls.appendChild(row); } };
  draw(); $('dlg').classList.add('show'); box.querySelector('#sessX').onclick = () => $('dlg').classList.remove('show'); box.querySelector('#sessAll').onclick = () => { for (const [id] of sessOrphans()) sessDrop(id); $('dlg').classList.remove('show'); };
}
function newWindow() { window.open(location.pathname + '?nou', '_blank'); }
setInterval(() => sessTouch(), 5000);
window.addEventListener('beforeunload', () => { const o = sessIx(); if (o[SID]) { o[SID].alive = 0; if (!S.dirty) { sessIxSet(o); sessDrop(SID); return; } sessIxSet(o); } });

/* ---------- SketchUp com a projecte ---------- */
/* v0.58 · marques d'aresta del SKP (soft, smooth, hidden) en coordenades de món (m), com les calcula OpenSKP:
   vèrtex de món = R·v + t (fila major, 13 valors: 9 de rotació, 3 de translació, 1 d'escala) per 0,0254 (polzades → m) */
function skpEdgeMarks(sk) {
  const out = [], I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], Z = 0.0254;
  let m; try { m = sk.parse(); } catch (e) { return out; }
  const ii = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2] + M[9], M[3] * p[0] + M[4] * p[1] + M[5] * p[2] + M[10], M[6] * p[0] + M[7] * p[1] + M[8] * p[2] + M[11]];
  const gs = (s, t) => { const i = [s[0], s[1], s[2], s[9]], r = [s[3], s[4], s[5], s[10]], o = [s[6], s[7], s[8], s[11]], a = [t[0], t[3], t[6], 0], c = [t[1], t[4], t[7], 0], f = [t[2], t[5], t[8], 0], l = [t[9], t[10], t[11], 1], h = (u, d) => u[0] * d[0] + u[1] * d[1] + u[2] * d[2] + u[3] * d[3];
    return [h(i, a), h(i, c), h(i, f), h(r, a), h(r, c), h(r, f), h(o, a), h(o, c), h(o, f), h(i, l), h(r, l), h(o, l), (s[12] || 1) * (t[12] || 1)]; };
  const walk = (d, M, depth) => {
    if (!d || depth > 24 || out.length > 4e6) return;
    const flagged = d.edges.filter(e => e.soft || e.smooth || e.hidden);
    if (flagged.length) { const vs = new Map(d.vertices.map(v => [v.id, v])); for (const e of flagged) { const a = vs.get(e.v1Id), b = vs.get(e.v2Id); if (!a || !b) continue;
      out.push({ a: ii(M, [a.x, a.y, a.z]).map(x => x * Z), b: ii(M, [b.x, b.y, b.z]).map(x => x * Z), soft: !!(e.soft || e.hidden), smooth: !!e.smooth }); } }
    for (const it of d.instances) { const dd = m.definitions.get(it.refIdx); if (dd && it.matrix && it.matrix.length >= 12) walk(dd, gs(M, it.matrix.length >= 13 ? it.matrix : [...it.matrix, 1]), depth + 1); }
  };
  walk(m.root, I3, 0); return out;
}
/* aplica les marques a les arestes d'un grup (coincidència d'extrems amb tolerància) */
function skpApplyMarks(g, marks) {
  if (!marks.length) return 0; const h = 4e-3, tol = Math.max(2e-3, TOLB() * 2), cell = p => p.map(x => Math.floor(x / h)), K = (i, j, k) => i + ',' + j + ',' + k, idx = new Map();
  for (const mk of marks) for (const p of [mk.a, mk.b]) { const c = cell(p), kk = K(c[0], c[1], c[2]); let l = idx.get(kk); if (!l) idx.set(kk, l = []); l.push(mk); }
  const near = p => { const c = cell(p), r = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const l = idx.get(K(c[0] + i, c[1] + j, c[2] + k)); if (l) for (const mk of l) r.push(mk); } return r; };
  let n = 0;
  for (const e of g.edges.values()) { const pa = g.verts.get(e.a).p, pb = g.verts.get(e.b).p; let hit = null;
    for (const mk of near(pa)) { const d1 = V.dist(mk.a, pa) <= tol && V.dist(mk.b, pb) <= tol, d2 = V.dist(mk.a, pb) <= tol && V.dist(mk.b, pa) <= tol; if (d1 || d2) { hit = hit || { soft: false, smooth: false }; hit.soft = hit.soft || mk.soft; hit.smooth = hit.smooth || mk.smooth; } }
    if (hit && (hit.soft || hit.smooth)) { if (hit.soft) e.sf = 1; if (hit.smooth) e.sm = 1; n++; } }
  return n;
}
/* v0.60 · classe IFC d'un diccionari d'atributs del SKP (AppliedSchemaTypes: {"IFC 2x3": "IfcWall"}) */
function skpIfcOf(ad) {
  const gb = ad && ad.guaitaBIMup; if (gb && /^Ifc[A-Za-z]+$/.test(String(gb.ifc_class || ''))) return { cls: String(gb.ifc_class), schema: 'guaitaBIMup' };
  const a = ad && ad.AppliedSchemaTypes; if (!a) return null;
  for (const k of Object.keys(a)) { let v = String(a[k] || '').trim(); if (!/^Ifc[A-Za-z]+$/.test(v)) continue;
    const b = v.replace(/(StandardCase|ElementedCase)$/, ''); if (b !== v && IFC.some(r => r[0] === b)) v = b; return { cls: v, schema: k }; }
  return null;
}
/* propietats del diccionari de l'esquema (només lectura): valors simples, com a text */
function skpPropsOf(ad, schema) {
  const d = ad && schema && ad[schema]; if (!d || typeof d !== 'object') return null; const o = {}; let n = 0;
  for (const k of Object.keys(d)) { const v = d[k]; if (v == null || typeof v === 'object') continue; o[k] = String(v).slice(0, 200); if (++n >= 60) break; }
  return n ? o : null;
}
/* v0.60 · una instància de primer nivell = un grup; els components repetits ja no es fusionen pel nom.
   Lector: OpenSKP buildInstancedScene (matrius 4×4 per columnes, metres, Y amunt) + parse() per saber si la definició és grup o component */
function skpToModel(buf, opt) {
  const skf = OpenSKP.SkpFile.fromBuffer(buf), sc = skf.buildInstancedScene(), mats = S.model.materials, matOf = new Map();
  let defs = null; try { defs = skf.parse().definitions; } catch (e) { defs = null; }
  const defById = new Map(), defByName = new Map(); if (defs) for (const [id, d] of defs) { defById.set(String(id), d); if (!defByName.has(d.name)) defByName.set(d.name, d); }
  const res = new Map((sc.meshResources || []).map(r => [r.id, r]));
  const hex = c => '#' + c.slice(0, 3).map(x => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  const mid = i => { if (matOf.has(i)) return matOf.get(i); const gm = sc.gltfMaterials && sc.gltfMaterials[i], col = gm && gm.pbrMetallicRoughness && gm.pbrMetallicRoughness.baseColorFactor ? hex(gm.pbrMetallicRoughness.baseColorFactor) : '#F4F4F0';
    let k = mats.findIndex(m => m.color.toUpperCase() === col); if (k < 0) { mats.push({ name: 'SKP ' + col, color: col }); k = mats.length - 1; } matOf.set(i, k); return k; };
  const tagOf = new Map(), tag = nm => { if (!nm || nm === 'Layer0' || nm === 'Untagged') return 0; if (tagOf.has(nm)) return tagOf.get(nm); let t = S.model.tags.find(x => x.name === nm); if (!t) { t = { id: Math.max(0, ...S.model.tags.map(x => x.id)) + 1, name: nm, color: '#8B939F', visible: true }; S.model.tags.push(t); } tagOf.set(nm, t.id); return t.id; };
  const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
  const I4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const addMesh = (B, rid, M) => { const r = res.get(rid); if (!r) return;
    for (const pr of r.primitives) { const p = pr.positions, ix = pr.indices, T = ix ? ix.length / 3 : p.length / 9;
      const P = i => { const x = p[3 * i], y = p[3 * i + 1], z = p[3 * i + 2], X = M[0] * x + M[4] * y + M[8] * z + M[12], Y = M[1] * x + M[5] * y + M[9] * z + M[13], Zz = M[2] * x + M[6] * y + M[10] * z + M[14]; return [X, -Zz, Y]; };
      for (let t = 0; t < T; t++) { const tri = (ix ? [ix[3 * t], ix[3 * t + 1], ix[3 * t + 2]] : [3 * t, 3 * t + 1, 3 * t + 2]).map(P), k2 = tri.map(q => q.map(x => Math.round(x * 1e4)).join(',')).sort().join('|');
        if (B.seen.has(k2)) continue; B.seen.add(k2); if (V.len(V.cross(V.sub(tri[1], tri[0]), V.sub(tri[2], tri[0]))) < 1e-9) continue; B.polys.push(new BOOL.Poly(tri, mid(pr.materialIndex))); } } };
  const walk = (B, n, M) => { if (n.hidden) return; const W = mul(M, n.matrix || I4); if (n.meshResourceId) addMesh(B, n.meshResourceId, W); for (const c of n.children || []) walk(B, c, W); };
  const root = sc.sceneHierarchy, R = root.matrix || I4, items = [];
  if (root.meshResourceId) { const B = { name: 'Geometria solta', polys: [], seen: new Set(), layer: null, skp: null, cls: null }; addMesh(B, root.meshResourceId, R); items.push(B); }
  for (const n of root.children || []) { if (n.hidden) continue;
    const rr = n.meshResourceId && res.get(n.meshResourceId), d = (rr && defById.get(String(rr.definitionId))) || defByName.get(n.definitionName) || null;
    const kind = d && d.isGroup != null ? (d.isGroup ? 'group' : 'component') : null;
    const ci = skpIfcOf(n.attributeDictionaries) || skpIfcOf(d && d.attributeDictionaries);
    const props = ci ? (skpPropsOf(n.attributeDictionaries, ci.schema) || skpPropsOf(d && d.attributeDictionaries, ci.schema)) : null;
    const B = { name: n.name || n.definitionName || 'SKP', polys: [], seen: new Set(), layer: n.layer, cls: ci ? ci.cls : null,
      skp: { def: n.definitionName || '', defId: rr ? String(rr.definitionId) : (d ? 'n:' + n.definitionName : ''), kind } };
    if (ci) { B.skp.schema = ci.schema; if (props) B.skp.props = props; }
    walk(B, n, R); items.push(B); }
  const out = [], used = new Map(), marks = skpEdgeMarks(skf); let marked = 0, nCls = 0;
  for (const B of items) { if (!B.polys.length) continue; let nm = B.name; const c = used.get(nm) || 0; used.set(nm, c + 1); if (c) nm += ' (' + (c + 1) + ')';
    const r = polysToGroup(B.polys, S.model.root, { ifc: null, level: opt.level == null ? null : opt.level, tag: tag(B.layer) }, nm); r.g.ifc = B.cls || null; if (B.cls) nCls++;
    if (B.skp) r.g.skp = B.skp; S.model.root.groups.set(r.g.id, r.g); out.push(r.g); marked += skpApplyMarks(r.g, marks); }
  if (!out.length) throw new Error('el fitxer no conté cares');
  const comps = new Set(out.filter(g => g.skp && g.skp.kind === 'component').map(g => g.skp.defId));
  return { groups: out, rep: items.length, marks: marks.length, marked, classified: nCls, comps: comps.size };
}
async function skpOpen(file, merge) {
  const buf = await file.arrayBuffer(), name = file.name.replace(/\.skp$/i, '');
  const go = () => { try {
    if (merge) pushUndo('Importa SKP'); else { cancelTool(); S.model = newModel(); S.ctx = []; clearSel(); S.undo = []; S.redo = []; S.level = S.model.levels[0].id; S.tabs = []; S.view = null; S.viewClips = []; applyClips(); }
    const r = skpToModel(buf, { level: merge ? S.level : null }); if (!merge) { S.fileName = name + '.gbup.json'; adoptStyle(); }
    clearSel(); r.groups.forEach(g => S.sel.groups.add(g.id)); refreshAll(); refreshSel(); if (!merge) fitView(); markDirty();
    toast((merge ? 'Importat ' : 'Obert ') + file.name + ': ' + r.groups.length + ' objecte(s)' + (r.comps ? ', ' + r.comps + ' component(s)' : '') + (r.classified ? ', ' + r.classified + ' amb classe IFC del fitxer' : '') + (r.marked ? ', ' + r.marked + ' aresta(es) suaus o suavitzades' : '') + '.');
  } catch (e) { toast('No s’ha pogut llegir el SKP: ' + e.message); } };
  if (!merge && S.dirty) { $('dlgBox').innerHTML = '<h3>Obre ' + esc(file.name) + '</h3><p>Hi ha canvis sense desar en aquest model. Vols descartar-los o obrir el SKP en una finestra nova?</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="sX">Cancel·la</button><button class="btn" id="sNw">Nova finestra…</button><button class="btn acc" id="sOk">Descarta i obre</button></div>'; $('dlg').classList.add('show');
    $('sX').onclick = () => $('dlg').classList.remove('show'); $('sNw').onclick = () => { $('dlg').classList.remove('show'); newWindow(); toast('Obre el SKP des de la finestra nova.'); }; $('sOk').onclick = () => { $('dlg').classList.remove('show'); go(); }; return; }
  go();
}
function skpPick(merge) { const f = el('input'); f.type = 'file'; f.accept = '.skp'; f.onchange = () => { if (f.files[0]) skpOpen(f.files[0], merge); }; f.click(); }
(function () { const st = document.createElement('style'); st.textContent = '.sess-l{display:grid;gap:6px;max-height:50vh;overflow:auto}.sess-r{display:grid;grid-template-columns:1fr auto auto;grid-template-rows:auto auto;gap:2px 8px;align-items:center;padding:6px 8px;border:1px solid var(--line);border-radius:6px}.sess-r b{grid-column:1}.sess-r span{grid-column:1;grid-row:2;font-size:12px}.sess-r button{grid-row:1/3}'; document.head.appendChild(st); })();
/* arrossegar fitxers sobre l'app: .skp (obre o importa) i .gbup.json */
window.addEventListener('dragover', e => { if ([...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
window.addEventListener('drop', e => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return; e.preventDefault();
  if (/\.json$/i.test(f.name)) { $('fileInput').onchange({ target: { files: [f], value: '' } }); return; }
  if (!/\.skp$/i.test(f.name)) { toast('Format no admès: ' + f.name); return; }
  $('dlgBox').innerHTML = '<h3>' + esc(f.name) + '</h3><p>Com vols fer servir aquest fitxer SketchUp?</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="dX">Cancel·la</button><button class="btn" id="dImp">Importa al projecte actual</button><button class="btn acc" id="dOpen">Obre com a projecte nou</button></div>'; $('dlg').classList.add('show');
  $('dX').onclick = () => $('dlg').classList.remove('show'); $('dImp').onclick = () => { $('dlg').classList.remove('show'); skpOpen(f, true); }; $('dOpen').onclick = () => { $('dlg').classList.remove('show'); skpOpen(f, false); }; });
window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); newWindow(); } }, true);
