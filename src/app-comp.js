/* ============================================================
   v19 · components: definicions reutilitzables (importades de
   SKP o creades d'un grup) i instàncies paramètriques. Les
   portes i finestres s'allotgen en un mur i hi obren el forat;
   els components lliures (mobiliari…) no tallen res.
   ============================================================ */
const COMP_KINDS = [['free', 'Lliure (mobiliari, equipament…)'], ['door', 'Porta (allotjada en mur)'], ['window', 'Finestra (allotjada en mur)']];
const COMP_IFC = [['IfcFurniture', 'Mobiliari'], ['IfcSanitaryTerminal', 'Aparell sanitari'], ['IfcBuildingElementProxy', 'Element genèric'], ['', 'Sense classe BIM']];
function compDefs() { const m = S.model.meta; if (!Array.isArray(m.comps)) m.comps = []; return m.comps; }
function compDef(id) { return compDefs().find(d => d.id === id) || null; }
const compHostedKind = d => d && (d.kind === 'door' || d.kind === 'window');
/* v23 · una porta o finestra té l'amplada en X (al llarg del mur). Si el model la té en Y, es gira 90° la definició
   perquè l'eix d'allotjament coincideixi amb la fulla del mur i el forat tingui l'amplada real. Idempotent. */
/* v25 · orientació explícita: la direcció X de la definició (eixos del component) es fixa amb dos punts sobre una instància.
   Recentra com compSerialize: X de 0 a l’amplada, Y centrada, Z des de 0. */
function compReframe(d, qa, th) {
  const c = Math.cos(-th), s = Math.sin(-th), r = x => +x.toFixed(5);
  const v = d.v.map(q => { const x = q[0] - qa[0], y = q[1] - qa[1]; return [x * c - y * s, x * s + y * c, q[2]]; }), mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const p of v) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); }
  const o = [mn[0], (mn[1] + mx[1]) / 2, mn[2]];
  d.v = v.map(p => [r(p[0] - o[0]), r(p[1] - o[1]), r(p[2] - o[2])]);
  d.f = d.f.map(f => ({ ...f, n: [f.n[0] * c - f.n[1] * s, f.n[0] * s + f.n[1] * c, f.n[2]].map(r) }));
  d.size = [r(mx[0] - mn[0]), r(mx[1] - mn[1]), d.size[2]]; d.frame = true; d.ver = (d.ver || 1) + 1; return true;
}
/* les coordenades de l’instància (pl.T) → coordenades de la definició, invertint la transformació afí del pla XY */
function compAxesApply(d, A, B, pl) {
  const o = pl.T([0, 0, 0]), ex = pl.T([1, 0, 0]), ey = pl.T([0, 1, 0]);
  const a = ex[0] - o[0], b = ey[0] - o[0], c = ex[1] - o[1], e = ey[1] - o[1], det = a * e - b * c; if (Math.abs(det) < 1e-12) return false;
  const loc = P => { const x = P[0] - o[0], y = P[1] - o[1]; return [(e * x - b * y) / det, (-c * x + a * y) / det]; };
  const qa = loc(A), qb = loc(B), th = Math.atan2(qb[1] - qa[1], qb[0] - qa[0]);
  return compReframe(d, qa, th);
}
function compAlignHosted(d) {
  if (d.frame || !compHostedKind(d) || !(d.size[1] > d.size[0] + 1e-6)) return false;
  const r = x => +x.toFixed(5), v = d.v.map(q => [q[1], -q[0], q[2]]), mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const p of v) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); }
  const o = [mn[0], (mn[1] + mx[1]) / 2, mn[2]];
  d.v = v.map(p => [r(p[0] - o[0]), r(p[1] - o[1]), r(p[2] - o[2])]);
  d.f = d.f.map(f => ({ ...f, n: [f.n[1], -f.n[0], f.n[2]].map(r) }));
  d.size = [r(mx[0] - mn[0]), r(mx[1] - mn[1]), d.size[2]]; d.ver = (d.ver || 1) + 1; return true;
}
function compIfc(d) { return d.kind === 'door' ? 'IfcDoor' : d.kind === 'window' ? 'IfcWindow' : (d.ifc || null); }
/* serialitza un contenidor (i els seus subgrups) com a definició normalitzada: X de 0 a l'amplada, Y centrada, Z des de 0 */
function compSerialize(g, name, kind) {
  const v = [], e = [], f = [];
  const walk = (c, off) => { const map = new Map(); for (const x of c.verts.values()) { map.set(x.id, v.length); v.push(V.add(x.p, off)); }
    for (const x of c.edges.values()) e.push([map.get(x.a), map.get(x.b)]);
    for (const x of c.faces.values()) f.push({ l: x.loop.map(i => map.get(i)), h: x.holes.map(h => h.map(i => map.get(i))), m: x.mat, n: x.n.slice() });
    for (const sg of c.groups.values()) walk(sg, V.add(off, sg.t)); };
  walk(g, [0, 0, 0]); if (!v.length || !f.length) return null;
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (const p of v) for (let i = 0; i < 3; i++) { if (p[i] < mn[i]) mn[i] = p[i]; if (p[i] > mx[i]) mx[i] = p[i]; }
  const o = [mn[0], (mn[1] + mx[1]) / 2, mn[2]], r = x => +x.toFixed(5);
  const d = { id: S.model.nid++, name, kind: kind || 'free', ifc: 'IfcFurniture', ver: 1, size: [r(mx[0] - mn[0]), r(mx[1] - mn[1]), r(mx[2] - mn[2])], v: v.map(p => [r(p[0] - o[0]), r(p[1] - o[1]), r(p[2] - o[2])]), e, f };
  compAlignHosted(d); return d;
}
function compFromGroup(g, kind) { const d = compSerialize(g, g.name || 'Component', kind || (g.ifc === 'IfcDoor' ? 'door' : g.ifc === 'IfcWindow' ? 'window' : 'free')); if (!d) return null; if (g.ifc && d.kind === 'free') d.ifc = g.ifc; pushUndo(); compDefs().push(d); return d; }
/* importa un fitxer SketchUp com una sola definició (tota la geometria aplanada) */
function compFromSKP(name, buf) {
  const sc = OpenSKP.SkpFile.fromBuffer(buf).buildScene(), polys = [], seen = new Set(), mats = S.model.materials, matOf = new Map(); let ntri = 0;
  const hex = c => '#' + c.slice(0, 3).map(x => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  const mid = i => { if (matOf.has(i)) return matOf.get(i); const gm = sc.gltfMaterials && sc.gltfMaterials[i], col = gm && gm.pbrMetallicRoughness && gm.pbrMetallicRoughness.baseColorFactor ? hex(gm.pbrMetallicRoughness.baseColorFactor) : '#F4F4F0';
    let k = mats.findIndex(m => m.color.toUpperCase() === col); if (k < 0) { mats.push({ name: 'SKP ' + col, color: col }); k = mats.length - 1; } matOf.set(i, k); return k; };
  for (const pr of sc.glbPrimitives) {
    const p = pr.positions, ix = pr.indices, T = ix ? ix.length / 3 : p.length / 9, P = i => [p[3 * i], -p[3 * i + 2], p[3 * i + 1]];
    for (let t = 0; t < T; t++) {
      const tri = (ix ? [ix[3 * t], ix[3 * t + 1], ix[3 * t + 2]] : [3 * t, 3 * t + 1, 3 * t + 2]).map(P), key = tri.map(q => q.map(x => Math.round(x * 1e4)).join(',')).sort().join('|');
      if (seen.has(key)) continue; seen.add(key); if (V.len(V.cross(V.sub(tri[1], tri[0]), V.sub(tri[2], tri[0]))) < 1e-9) continue; polys.push(new BOOL.Poly(tri, mid(pr.materialIndex))); ntri++;
    }
  }
  if (!polys.length) throw new Error('el fitxer no conté cares');
  const tmp = polysToGroup(polys, S.model.root, {}, name), d = compSerialize(tmp.g, name, /port|door|puerta/i.test(name) ? 'door' : /finestr|window|ventana/i.test(name) ? 'window' : 'free');
  if (!d) throw new Error('geometria buida'); d.tris = ntri; compDefs().push(d); return d;
}
/* transformació de la instància i, si és allotjada, dades de l'amfitrió */
function compPlace(model, c, g) {
  const par = g.par, d = compDef(par.cid); if (!d) return null; compAlignHosted(d); const w = d.size[0];
  if (par.host != null) {
    const W = c.groups.get(par.host);
    if (W && W.par && W.par.type === 'wall' && wframe(W)) {
      const F = wframe(W), zb = parZ(model, W.par).base + (par.sill || 0), mid = (F.lo + F.hi) / 2, fl = !!par.flip, a = W.par.a, ang = Math.atan2(F.d[1], F.d[0]) + (fl ? Math.PI : 0);
      const T = q => { const X = fl ? w - q[0] : q[0], Y = fl ? -q[1] : q[1]; return [a[0] + F.d[0] * (par.s + X) + F.n[0] * (mid + Y), a[1] + F.d[1] * (par.s + X) + F.n[1] * (mid + Y), zb + q[2]]; };
      const ce = T([w / 2, 0, 0]); par.p = [ce[0], ce[1]]; par.rot = +(ang * 180 / Math.PI).toFixed(4); par.lv = W.par.lv; par.off = +(zb - levelElev(model, par.lv)).toFixed(6); g.level = W.level;
      return { d, T, ang, sig: [a, W.par.b, W.par.t, W.par.just, zb] };
    }
    delete par.host; delete par.s; delete par.sill; delete par.flip; /* l'amfitrió ja no hi és: passa a component lliure on era */
  }
  const ang = (par.rot || 0) * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang), z0 = levelElev(model, par.lv) + (par.off || 0);
  return { d, ang, T: q => { const x = q[0] - w / 2, y = q[1]; return [par.p[0] + x * ca - y * sa, par.p[1] + x * sa + y * ca, z0 + q[2]]; }, sig: [z0] };
}
function compRegen(model, c, g, off) {
  const pl = compPlace(model, c, g); if (!pl) { g.verts = new Map(); g.edges = new Map(); g.faces = new Map(); g.warn = 'La definició del component ja no existeix.'; return; }
  const sig = JSON.stringify([g.par, pl.d.ver, pl.sig, off]); if (g._sig === sig && g.verts.size) return; g._sig = sig; g.warn = null;
  g.verts = new Map(); g.edges = new Map(); g.faces = new Map(); const ca = Math.cos(pl.ang), sa = Math.sin(pl.ang), ids = pl.d.v.map(q => { const p = pl.T(q); return K.addVertexRaw(model, g, [p[0] - off[0], p[1] - off[1], p[2] - off[2]]).id; });
  for (const [a, b] of pl.d.e) K.addEdgeRaw(model, g, ids[a], ids[b]);
  for (const f of pl.d.f) K.addFaceRaw(model, g, f.l.map(i => ids[i]), f.h.map(h => h.map(i => ids[i])), f.m, [f.n[0] * ca - f.n[1] * sa, f.n[0] * sa + f.n[1] * ca, f.n[2]]);
}
/* el moviment d'un component allotjat llisca pel mur (posició) i en vertical (ampit) */
function compBake(c, g) { const par = g.par, W = c.groups.get(par.host), F = W && W.par && wframe(W); if (F) { par.s += g.t[0] * F.d[0] + g.t[1] * F.d[1]; par.sill = Math.max(0, (par.sill || 0) + g.t[2]); } g.t = [0, 0, 0]; }
/* forats que els components allotjats obren a cada mur */
function compHoles(c, pars) {
  const m = new Map();
  for (const g of pars) { const par = g.par; if (par.type !== 'comp' || par.host == null || par.cut === false) continue; const d = compDef(par.cid), W = c.groups.get(par.host); if (!d || !W || !W.par || W.par.type !== 'wall') continue;
    let l = m.get(par.host); if (!l) m.set(par.host, l = []); l.push({ s: par.s, w: d.size[0], h: d.size[2], sill: par.sill || 0, comp: g.id }); }
  return m;
}
function makeComp(d, pt, host) {
  pushUndo(); const { c } = ctxInfo(); let par; compAlignHosted(d);
  if (host) { const F = wframe(host), z = parZ(S.model, host.par), H = z.top - z.base; let s = (pt[0] - host.par.a[0]) * F.d[0] + (pt[1] - host.par.a[1]) * F.d[1] - d.size[0] / 2; s = Math.max(0, Math.min(F.L - d.size[0], s));
    let sill = d.kind === 'door' ? 0 : OPT.sillH; if (sill + d.size[2] > H) sill = Math.max(0, H - d.size[2]);
    par = { type: 'comp', cid: d.id, host: host.id, s: +s.toFixed(5), sill, flip: false, cut: true, p: [pt[0], pt[1]], rot: 0, off: 0, lv: host.par.lv }; }
  else par = { type: 'comp', cid: d.id, p: [pt[0], pt[1]], rot: 0, off: +(pt[2] - levelElev(S.model, S.level)).toFixed(5), lv: S.level };
  if (Math.abs(par.off) < 1e-6) par.off = 0;
  const g = addPar(c, par, d.name, compIfc(d), par.lv); clearSel(); S.sel.groups.add(g.id); refreshAll(); return g;
}
/* v25 · eina «Eixos del component»: dos clics sobre una instància → la direcció X de la definició (l’amplada de la porta) */
TOOLS.compax = {
  move(ev, mx, my) { const pk = pick(mx, my); st.pk = pk; clearPrev(); const d = compDef(S.axesDef);
    if (!d) { showTip(mx, my, pk, 'Tria «Eixos» en un component del panell'); return; }
    if (st.ax1) prevLine([[st.ax1[0], st.ax1[1], 0], [pk.p[0], pk.p[1], 0]], 0x1B1D21);
    showTip(mx, my, pk, st.ax1 ? 'Clic en la direcció X (amplada)' : 'Clic en l’origen · després la direcció X'); },
  down(ev, mx, my) { const d = compDef(S.axesDef); if (!d) { toast('Tria «Eixos» en un component del panell.'); return; }
    const { c } = ctxInfo(), g = parAt(pickEntity(mx, my), c, 'comp'); if (!g || g.par.cid !== d.id) { toast('Assenyala una instància del component «' + d.name + '».'); return; }
    const pk = pick(mx, my); if (!st.ax1) { st.ax1 = [pk.p[0], pk.p[1]]; return; }
    const pl = compPlace(S.model, c, g); pushUndo(); const ok = pl && compAxesApply(d, st.ax1, [pk.p[0], pk.p[1]], pl);
    st.ax1 = null; clearPrev(); if (ok) { toast('Eixos de «' + d.name + '» definits: X segueix la direcció triada.'); } else toast('No s’han pogut definir els eixos.'); refreshAll(); },
  hintExtra: 'Clic en l’origen i després en la direcció X d’una instància del component (la direcció X és l’amplada).',
};
TOOLS.comp = {
  move(ev, mx, my) { const d = compDef(S.compId), pk = pick(mx, my); st.pk = pk; if (!d) { showTip(mx, my, pk, 'Tria un component al panell «Components»'); return; }
    if (compHostedKind(d)) { const { c } = ctxInfo(), W = parAt(pickEntity(mx, my), c, 'wall'); showTip(mx, my, pk, W ? d.name + ' → ' + W.name : 'Assenyala un mur per allotjar «' + d.name + '»'); } else showTip(mx, my, pk, d.name); },
  down(ev, mx, my) { const d = compDef(S.compId); if (!d) { toast('Tria un component al panell «Components».'); return; } const pk = pick(mx, my);
    if (compHostedKind(d)) { const { c } = ctxInfo(), W = parAt(pickEntity(mx, my), c, 'wall'); if (!W) { toast('Les portes i finestres s’han de col·locar sobre un mur.'); return; } makeComp(d, pk.p, W); } else makeComp(d, pk.p, null); },
  hintExtra: 'Portes i finestres: clic sobre un mur (hi obren el forat) · components lliures: clic al punt d’inserció.',
};
function compCount(id) { let n = 0; eachContainer(S.model.root, [0, 0, 0], c => { for (const g of c.groups.values()) if (g.par && g.par.type === 'comp' && g.par.cid === id) n++; }); return n; }
function compsPanel(b) {
  const defs = compDefs(), bar = el('div'); bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px';
  const bi = el('button', 'btn sm', 'Importa SKP…'); bi.id = 'cmpImp'; bi.title = 'Importa un fitxer SketchUp (.skp) com a component';
  bi.onclick = () => { const f = el('input'); f.type = 'file'; f.accept = '.skp'; f.multiple = true; f.onchange = async () => { for (const file of f.files) { try { pushUndo(); const d = compFromSKP(file.name.replace(/\.skp$/i, ''), await file.arrayBuffer()); toast('Component «' + d.name + '» importat: ' + d.f.length + ' cares, ' + fmt(d.size[0]) + ' × ' + fmt(d.size[1]) + ' × ' + fmt(d.size[2]) + ' m.'); } catch (e) { toast('No s’ha pogut importar ' + file.name + ': ' + e.message); } } refreshAll(); }; f.click(); };
  const bg = el('button', 'btn sm', 'Del grup seleccionat'); bg.id = 'cmpGrp'; bg.title = 'Crea una definició de component a partir del grup seleccionat';
  bg.onclick = () => { const { c } = ctxInfo(), g = S.sel.groups.size === 1 ? c.groups.get([...S.sel.groups][0]) : null; if (!g || g.par) { toast('Selecciona un sol grup (no paramètric).'); return; } const d = compFromGroup(g); if (d) { toast('Component «' + d.name + '» creat.'); renderTray(); } else toast('El grup no té cares.'); };
  bar.appendChild(bi); bar.appendChild(bg); b.appendChild(bar);
  if (!defs.length) { b.appendChild(el('div', 'empty', 'Cap component. Importa un .skp o crea’n un d’un grup.')); return; }
  for (const d of defs) {
    const n = compCount(d.id), r = el('div', 'row' + (S.compId === d.id && S.tool === 'comp' ? ' on' : '')); r.style.flexWrap = 'wrap'; r.style.gap = '4px'; r.dataset.cmp = d.id;
    const nm = el('input'); nm.type = 'text'; nm.value = d.name; nm.style.cssText = 'flex:1;min-width:90px'; nm.onchange = () => { pushUndo(); d.name = nm.value.trim() || d.name; renderTray(); }; r.appendChild(nm);
    const ks = el('select', '', COMP_KINDS.map(([k, l]) => '<option value="' + k + '"' + (k === d.kind ? ' selected' : '') + '>' + esc(l) + '</option>').join('')); ks.dataset.cmpkind = d.id;
    ks.onchange = () => { if (n) { toast('Hi ha ' + n + ' instàncies col·locades: esborra-les abans de canviar el tipus.'); ks.value = d.kind; return; } pushUndo(); d.kind = ks.value; renderTray(); }; r.appendChild(ks);
    if (d.kind === 'free') { const cs = el('select', '', COMP_IFC.map(([k, l]) => '<option value="' + k + '"' + (k === (d.ifc || '') ? ' selected' : '') + '>' + esc(l) + '</option>').join('')); cs.onchange = () => { pushUndo(); d.ifc = cs.value || null; eachContainer(S.model.root, [0, 0, 0], c => { for (const g of c.groups.values()) if (g.par && g.par.type === 'comp' && g.par.cid === d.id) g.ifc = d.ifc; }); refreshAll(); }; r.appendChild(cs); }
    const ax = el('button', 'btn sm', 'Eixos'); ax.title = 'Defineix la direcció X del component amb dos clics sobre una instància'; ax.dataset.cmpax = d.id; ax.onclick = () => { S.axesDef = d.id; setTool('compax'); toast('Clic sobre una instància de «' + d.name + '»: origen i després direcció X.'); }; r.appendChild(ax);
    const ins = el('button', 'btn sm acc', 'Insereix'); ins.dataset.cmpins = d.id; ins.onclick = () => { S.compId = d.id; setTool('comp'); renderTray(); }; r.appendChild(ins);
    const x = el('button', 'btn sm', '✕'); x.title = 'Esborra la definició'; x.onclick = () => { if (n) { toast('No es pot esborrar: hi ha ' + n + ' instàncies al model.'); return; } pushUndo(); const a = compDefs(); a.splice(a.indexOf(d), 1); renderTray(); }; r.appendChild(x);
    b.appendChild(r); b.appendChild(el('div', 'empty', fmt(d.size[0]) + ' × ' + fmt(d.size[1]) + ' × ' + fmt(d.size[2]) + ' m · ' + d.f.length + ' cares · ' + n + ' instàncies'));
  }
}
function compPanel(b, g, h) {
  const par = g.par, d = compDef(par.cid); b.appendChild(el('div', 'row hd', 'Component' + (d ? ' · ' + esc(d.name) : '')));
  if (g.warn) b.appendChild(el('div', 'empty', '⚠ ' + esc(g.warn))); if (!d) return;
  if (par.host != null) { const W = ctxInfo().c.groups.get(par.host); h.row('Allotjat a', el('span', '', esc(W ? W.name : '—'))); h.num('Posició al mur (m)', 's', 0, 1000); h.num('Ampit (m)', 'sill', 0, 100);
    for (const [k, lab, def] of [['flip', 'Girat (obre cap a l’altra cara)', false], ['cut', 'Obre el forat al mur', true]]) { const i = el('input'); i.type = 'checkbox'; i.checked = par[k] == null ? def : !!par[k]; i.dataset.par = k; i.onchange = () => h.up(() => { par[k] = i.checked; }); h.row(lab, i); } }
  else { h.sel('Nivell', 'lv', h.lvlOpts, v => { par.lv = +v; g.level = +v; }); h.num('Desfasament (m)', 'off', -100, 100); h.num('Rotació (°)', 'rot', -360, 360); }
}
