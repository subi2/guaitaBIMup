/* =====================================================================
   guaitaBIMup 10 — selecció a l'estil SketchUp/Revit
   Modificadors, triple clic, inversió, Tab (cadenes adjacents),
   punters per eina i barra de selecció per propietats.
   ===================================================================== */
const selMode = ev => { const c = ev.ctrlKey || ev.metaKey, s = ev.shiftKey; return c && s ? 'remove' : c ? 'add' : s ? 'toggle' : 'replace'; };
function selOp(set, id, mode) { if (mode === 'remove') set.delete(id); else if (mode === 'toggle') { if (set.has(id)) set.delete(id); else set.add(id); } else set.add(id); }
function applySelSets(s, mode) {
  if (mode === 'replace') clearSel();
  for (const k of ['faces', 'edges', 'groups']) for (const id of s[k] || []) selOp(S.sel[k], id, mode);
}
function invertSel() {
  const { c } = ctxInfo(), pick = (all, set) => [...all.keys()].filter(id => !set.has(id));
  const f = pick(c.faces, S.sel.faces), e = pick(c.edges, S.sel.edges), g = pick(c.groups, S.sel.groups);
  clearSel(); f.forEach(id => S.sel.faces.add(id)); e.forEach(id => S.sel.edges.add(id)); g.forEach(id => S.sel.groups.add(id)); refreshSel();
}

/* ---------- connectivitat ---------- */
const PTOL = 1e-4;
function loopsOf(f) { return [f.loop, ...f.holes]; }
function faceNbrMap(c) {
  const m = new Map(), key = (a, b) => a < b ? a + ',' + b : b + ',' + a;
  for (const f of c.faces.values()) for (const l of loopsOf(f)) for (let i = 0; i < l.length; i++) { const k = key(l[i], l[(i + 1) % l.length]); if (!m.has(k)) m.set(k, []); m.get(k).push(f.id); }
  const nb = new Map(); for (const f of c.faces.values()) nb.set(f.id, new Set());
  for (const ids of m.values()) for (const a of ids) for (const b of ids) if (a !== b) nb.get(a).add(b);
  return nb;
}
function faceChain(c, id, coplanar) {
  const nb = faceNbrMap(c), f0 = c.faces.get(id), d0 = V.dot(f0.n, K.P(c, f0.loop[0])), out = new Set([id]), q = [id];
  while (q.length) {
    const a = q.pop();
    for (const b of nb.get(a) || []) {
      if (out.has(b)) continue; const fb = c.faces.get(b);
      if (coplanar && !(V.dot(f0.n, fb.n) > 0.99999 && Math.abs(V.dot(f0.n, K.P(c, fb.loop[0])) - d0) < PTOL)) continue;
      out.add(b); q.push(b);
    }
  }
  return out;
}
function edgeAdj(c) { const m = new Map(); for (const e of c.edges.values()) for (const v of [e.a, e.b]) { if (!m.has(v)) m.set(v, []); m.get(v).push(e); } return m; }
function edgeDir(c, e) { return V.norm(V.sub(K.P(c, e.b), K.P(c, e.a))); }
function edgeChain(c, id, all) {
  const adj = edgeAdj(c), e0 = c.edges.get(id), out = new Set([id]), q = [[e0, e0.a], [e0, e0.b]];
  while (q.length) {
    const [e, v] = q.pop(), others = (adj.get(v) || []).filter(x => x.id !== e.id && !out.has(x.id));
    const all2 = (adj.get(v) || []).filter(x => x.id !== e.id);
    for (const x of others) {
      const cont = all || all2.length === 1 || Math.abs(V.dot(edgeDir(c, e), edgeDir(c, x))) > 0.99999;
      if (!cont) continue; out.add(x.id); q.push([x, x.a === v ? x.b : x.a]);
    }
  }
  return out;
}
/* geometria plana d'un grup (coordenades del contenidor que el conté) */
function flatGeom(g, o, out) {
  out = out || { faces: [], edges: [], box: { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] } };
  const off = V.add(o, g.t), P = id => V.add(g.verts.get(id).p, off);
  for (const f of g.faces.values()) out.faces.push({ pts: f.loop.map(P), n: f.n });
  for (const e of g.edges.values()) out.edges.push([P(e.a), P(e.b)]);
  for (const v of g.verts.values()) { const p = V.add(v.p, off); for (let i = 0; i < 3; i++) { if (p[i] < out.box.min[i]) out.box.min[i] = p[i]; if (p[i] > out.box.max[i]) out.box.max[i] = p[i]; } }
  for (const s of g.groups.values()) flatGeom(s, off, out); return out;
}
function inPoly2(pt, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j], cr = (pt[0] - a[0]) * (b[1] - a[1]) - (pt[1] - a[1]) * (b[0] - a[0]), len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    if (Math.abs(cr) <= PTOL * len && pt[0] >= Math.min(a[0], b[0]) - PTOL && pt[0] <= Math.max(a[0], b[0]) + PTOL && pt[1] >= Math.min(a[1], b[1]) - PTOL && pt[1] <= Math.max(a[1], b[1]) + PTOL) return true;
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins;
  }
  return ins;
}
function segCross2(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function polysTouch(A, B) {
  const n = V.norm(A.n), h = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], u = V.norm(V.cross(n, h)), v = V.cross(n, u), o = A.pts[0];
  const pr = p => { const d = V.sub(p, o); return [V.dot(d, u), V.dot(d, v)]; }, a = A.pts.map(pr), b = B.pts.map(pr);
  if (a.some(p => inPoly2(p, b)) || b.some(p => inPoly2(p, a))) return true;
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) if (segCross2(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true;
  return false;
}
function groupsAdjacent(GA, GB) {
  for (let i = 0; i < 3; i++) if (GA.box.max[i] < GB.box.min[i] - PTOL || GB.box.max[i] < GA.box.min[i] - PTOL) return false;
  for (const fa of GA.faces) for (const fb of GB.faces) {
    if (Math.abs(V.dot(V.norm(fa.n), V.norm(fb.n))) > 0.9999 && Math.abs(V.dot(V.norm(fa.n), V.sub(fb.pts[0], fa.pts[0]))) < PTOL && polysTouch(fa, fb)) return true;
  }
  for (const ea of GA.edges) {
    const d = V.norm(V.sub(ea[1], ea[0])), L = V.dist(ea[0], ea[1]);
    for (const eb of GB.edges) {
      const d2 = V.norm(V.sub(eb[1], eb[0])); if (Math.abs(V.dot(d, d2)) < 0.99999) continue;
      const w = V.sub(eb[0], ea[0]), perp = V.sub(w, V.mul(d, V.dot(w, d))); if (V.len(perp) > PTOL) continue;
      const t0 = V.dot(w, d), t1 = V.dot(V.sub(eb[1], ea[0]), d), lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(L, Math.max(t0, t1));
      if (hi - lo > PTOL) return true;
    }
  }
  return false;
}
function groupChain(c, id, sameClass) {
  const base = c.groups.get(id), cls = base.ifc || null, geo = new Map(), G = g => { if (!geo.has(g.id)) geo.set(g.id, flatGeom(g, [0, 0, 0])); return geo.get(g.id); };
  const pool = [...c.groups.values()].filter(g => !sameClass || (g.ifc || null) === cls), out = new Set([id]), q = [base];
  while (q.length) { const a = q.pop(); for (const b of pool) { if (out.has(b.id)) continue; if (groupsAdjacent(G(a), G(b))) { out.add(b.id); q.push(b); } } }
  return out;
}
/* flood de geometria connectada (triple clic) */
function floodFrom(c, vs) {
  const faces = new Set(), edges = new Set(); let ch = true;
  while (ch) {
    ch = false;
    for (const e of c.edges.values()) if (!edges.has(e.id) && (vs.has(e.a) || vs.has(e.b))) { edges.add(e.id); vs.add(e.a); vs.add(e.b); ch = true; }
    for (const f of c.faces.values()) if (!faces.has(f.id) && loopsOf(f).some(l => l.some(id => vs.has(id)))) { faces.add(f.id); loopsOf(f).forEach(l => l.forEach(id => vs.add(id))); ch = true; }
  }
  return { faces, edges, groups: new Set() };
}
function tripleSel(en, mode) {
  const { c } = ctxInfo(); let s;
  if (en.type === 'face') s = floodFrom(c, new Set(c.faces.get(en.id).loop));
  else if (en.type === 'edge') { const e = c.edges.get(en.id); s = floodFrom(c, new Set([e.a, e.b])); }
  else if (en.type === 'group') s = { faces: new Set(), edges: new Set(), groups: groupChain(c, en.id, false) };
  else return; applySelSets(s, mode); refreshSel();
}

/* ---------- Tab: cadenes adjacents ---------- */
let TABST = null;
function showSelPreview(c, off, s) {
  disposeGroup(gPrevHover);
  const fs = [...(s.faces || [])].map(id => c.faces.get(id)).filter(Boolean);
  if (fs.length) gPrevHover.add(new THREE.Mesh(faceGeometry(c, off, fs, null, null), matHover));
  const es = [...(s.edges || [])].map(id => c.edges.get(id)).filter(Boolean);
  if (es.length) { const l = new THREE.LineSegments(edgeGeometry(c, off, es), matSelE); l.renderOrder = 9; gPrevHover.add(l); }
  const addG = (g, o) => { const l = new THREE.LineSegments(edgeGeometry(g, o, [...g.edges.values()]), matSelE); l.renderOrder = 9; gPrevHover.add(l); for (const x of g.groups.values()) addG(x, V.add(o, x.t)); };
  for (const gid of s.groups || []) { const g = c.groups.get(gid); if (g) addG(g, V.add(off, g.t)); }
  needRender = true;
}
function tabCands(en) {
  const { c } = ctxInfo(), E = new Set(), mk = (label, o) => ({ label, faces: o.faces || E, edges: o.edges || E, groups: o.groups || E });
  const out = [];
  if (en.type === 'face') {
    out.push(mk('cara', { faces: new Set([en.id]) }));
    const cp = faceChain(c, en.id, true); if (cp.size > 1) out.push(mk('cares coplanàries adjacents', { faces: cp }));
    const al = faceChain(c, en.id, false); if (al.size > cp.size) out.push(mk('cares adjacents (totes)', { faces: al }));
  } else if (en.type === 'edge') {
    out.push(mk('aresta', { edges: new Set([en.id]) }));
    const ch = edgeChain(c, en.id, false); if (ch.size > 1) out.push(mk('cadena d’arestes', { edges: ch }));
    const al = edgeChain(c, en.id, true); if (al.size > ch.size) out.push(mk('arestes connectades (totes)', { edges: al }));
  } else if (en.type === 'group') {
    out.push(mk('grup', { groups: new Set([en.id]) }));
    const ch = groupChain(c, en.id, OPT.chainSameClass); if (ch.size > 1) out.push(mk(OPT.chainSameClass ? 'cadena de grups adjacents de la mateixa classe' : 'cadena de grups adjacents', { groups: ch }));
  }
  return out;
}
function tabReset() { if (!TABST) return; TABST = null; setHover(null); }
function tabCycle(dir) {
  if (!lastMouse) return;
  if (!TABST) {
    const en = pickEntity(lastMouse.mx, lastMouse.my); if (!en || en.type === 'outside') return;
    TABST = { cands: tabCands(en), i: 0, pos: { ...lastMouse } };
  }
  const n = TABST.cands.length; if (n < 2) { toast('Sense cadena adjacent per a aquest element.'); return; }
  TABST.i = (TABST.i + dir + n) % n; const cd = TABST.cands[TABST.i]; TABST.cur = cd;
  const { c, off } = ctxInfo(); showSelPreview(c, off, cd);
  $('stHint').textContent = 'Tab: ' + cd.label + ' (' + (cd.faces.size + cd.edges.size + cd.groups.size) + ') — clic o Enter per seleccionar · Maj+Tab enrere · Esc cancel·la';
}
function confirmTab(mode) {
  if (!TABST || !TABST.cur) return false; const cd = TABST.cur; TABST = null; setHover(null); applySelSets(cd, mode); refreshSel(); return true;
}

/* ---------- punters per eina ---------- */
const CURSORS = {};
function mkCursor(name, mod) {
  const key = name + '|' + mod; if (CURSORS[key]) return CURSORS[key];
  let svg, hx, hy;
  const st = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  if (name === 'select') {
    const badge = mod === 'add' ? '+' : mod === 'toggle' ? '±' : mod === 'remove' ? '−' : '';
    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 3v19l5-4.5 3.6 8 3-1.4-3.6-7.8h7z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/>'
      + (badge ? '<circle cx="24" cy="9" r="6" fill="#fff" stroke="#111"/><text x="24" y="12.5" font-size="11" font-weight="700" text-anchor="middle" font-family="sans-serif" fill="#111">' + badge + '</text>' : '') + '</svg>'; hx = 4; hy = 3;
  } else {
    const inner = (typeof ico === 'function' ? ico(name) : '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); if (!inner) return null;
    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><style>.g,.a{stroke:#111}.f{fill:#111;fill-opacity:.18;stroke:none}.p{fill:#111;stroke:none}</style>'
      + '<path d="M10 0v8M10 12v8M0 10h8M12 10h8" stroke="#fff" stroke-width="3.2" fill="none"/><path d="M10 0v8M10 12v8M0 10h8M12 10h8" stroke="#111" stroke-width="1.2" fill="none"/>'
      + '<rect x="14" y="14" width="17" height="17" rx="3" fill="#fff" stroke="#111"/><svg x="15.5" y="15.5" width="14" height="14" viewBox="0 0 24 24"><g ' + st + ' stroke-width="2.2">' + inner + '</g></svg></svg>'; hx = 10; hy = 10;
  }
  return CURSORS[key] = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '") ' + hx + ' ' + hy + ', ' + (name === 'select' ? 'default' : 'crosshair');
}
let CUR_MOD = 'replace';
function updCursor() {
  const cv = canvas; if (!cv) return;
  const nav = { orbit: 'grab', pan: 'move', zoom: 'zoom-in', zoomwin: 'zoom-in' };
  cv.style.cursor = nav[S.tool] || mkCursor(S.tool, S.tool === 'select' ? CUR_MOD : '') || 'crosshair';
}
function modOf(ev) { return selMode(ev); }
window.addEventListener('keydown', ev => { if (ev.key === 'Control' || ev.key === 'Shift' || ev.key === 'Meta') { CUR_MOD = modOf(ev); updCursor(); } });
window.addEventListener('keyup', ev => { if (ev.key === 'Control' || ev.key === 'Shift' || ev.key === 'Meta') { CUR_MOD = modOf(ev); updCursor(); } });
window.addEventListener('blur', () => { CUR_MOD = 'replace'; updCursor(); });

/* ---------- barra de selecció per propietats ---------- */
const SB = { open: false, filters: [{ p: 'classe', v: '' }], op: 'replace', scope: 'ctx' };
const areaOf = (c, f) => K.faceArea(c, f);
function numCond(txt, x) {
  const m = String(txt || '').replace(',', '.').match(/^\s*(>=|<=|>|<|=)?\s*(-?\d+(?:\.\d+)?)\s*$/); if (!m) return false;
  const v = parseFloat(m[2]), o = m[1] || '='; return o === '>' ? x > v : o === '<' ? x < v : o === '>=' ? x >= v : o === '<=' ? x <= v : Math.abs(x - v) < 1e-6;
}
const PROPS = {
  tipus: { label: 'Tipus', vals: () => [['face', 'Cara'], ['edge', 'Aresta'], ['group', 'Grup']], get: e => e.type },
  classe: { label: 'Classe IFC', vals: () => [['', 'No BIM (esbós)'], ...IFC.map(r => [r[0], r[1]])], get: e => e.type === 'group' ? (e.o.ifc || '') : undefined },
  nivell: { label: 'Nivell', vals: () => [['', 'Sense nivell'], ...S.model.levels.map(l => [String(l.id), l.name])], get: e => e.type === 'group' ? (e.o.level == null ? '' : String(e.o.level)) : undefined },
  etiqueta: { label: 'Etiqueta', vals: () => S.model.tags.map(t => [String(t.id), t.name]), get: e => e.type === 'edge' ? undefined : String(e.o.tag || 0) },
  material: { label: 'Material (cara)', vals: () => [['', 'Sense material'], ...S.model.materials.map((m, i) => [String(i), m.name])], get: e => e.type === 'face' ? (e.o.mat == null ? '' : String(e.o.mat)) : undefined },
  nom: { label: 'Nom (amb * ?)', text: true, get: e => e.type === 'group' ? (e.o.name || '') : undefined },
  orient: { label: 'Orientació (cara)', vals: () => [['h', 'Horitzontal'], ['v', 'Vertical'], ['i', 'Inclinada']], get: e => { if (e.type !== 'face') return undefined; const z = Math.abs(e.o.n[2]); return z > 0.999 ? 'h' : z < 0.001 ? 'v' : 'i'; } },
  pend: { label: 'Sense classificar', vals: () => [['1', 'Sí']], get: e => e.type === 'group' ? ((!e.o.ifc && e.o.faces.size > 0) ? '1' : '0') : undefined },
  mida: { label: 'Mida (m², m, m³)', text: true, num: true, get: e => e.num },
};
function entsOf(c) {
  const out = []; c.faces.forEach(o => out.push({ type: 'face', id: o.id, o, c, num: areaOf(c, o) }));
  c.edges.forEach(o => out.push({ type: 'edge', id: o.id, o, c, num: V.dist(K.P(c, o.a), K.P(c, o.b)) }));
  c.groups.forEach(o => { const b = K.bbox(o, [0, 0, 0]); out.push({ type: 'group', id: o.id, o, c, num: isFinite(b.min[0]) ? (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) * (b.max[2] - b.min[2]) : 0 }); });
  return out;
}
const hiddenEnt = e => e.type !== 'edge' && !tagVisible(e.o.tag) || (e.type === 'group' && e.o.ifc && S.hiddenIfc.has(e.o.ifc));
function entMatch(e, flt) {
  for (const f of flt) {
    const P = PROPS[f.p]; if (!P) continue; const val = P.get(e); if (val === undefined) return false;
    if (f.p === 'nom') { if (!f.v || !globRe(f.v).test(normTxt(val))) return false; }
    else if (f.p === 'mida') { if (!numCond(f.v, e.num)) return false; }
    else if (String(val) !== String(f.v)) return false;
  }
  return true;
}
function runFilter(extra) {
  const flt = extra || SB.filters, res = { faces: new Set(), edges: new Set(), groups: new Set() };
  const root = SB.scope === 'model' ? S.model.root : ctxInfo().c, vis = SB.scope === 'vis';
  const keep = e => !(vis && hiddenEnt(e));
  const deep = g => { for (const e of entsOf(g)) if (entMatch(e, flt) && keep(e)) return true; for (const s of g.groups.values()) if (deep(s)) return true; return false; };
  for (const e of entsOf(root)) {
    if (!keep(e)) continue;
    if (entMatch(e, flt) || (SB.scope === 'model' && e.type === 'group' && deep(e.o))) res[e.type + 's'].add(e.id);
  }
  return res;
}
const selTotal = s => s.faces.size + s.edges.size + s.groups.size;
function applyBar(res) {
  if (SB.scope === 'model') S.ctx = [];
  applySelSets(res, SB.op); refreshAll();
}
function similarSel() {
  const f = SB.filters[0], P = PROPS[f.p]; if (!P || P.num) { toast('Aquesta propietat no admet «similar».'); return; }
  const { c } = ctxInfo(), vals = new Set(), all = entsOf(c);
  for (const e of all) if (S.sel[e.type + 's'].has(e.id)) { const v = P.get(e); if (v !== undefined) vals.add(String(v)); }
  if (!vals.size) { toast('Selecciona primer un element que tingui aquesta propietat.'); return; }
  const res = { faces: new Set(), edges: new Set(), groups: new Set() };
  for (const e of all) { const v = P.get(e); if (v !== undefined && vals.has(String(v)) && !(SB.scope === 'vis' && hiddenEnt(e))) res[e.type + 's'].add(e.id); }
  applySelSets(res, SB.op); refreshSel(); toast(selTotal(res) + ' elements amb la mateixa ' + P.label.toLowerCase() + '.'); drawBar();
}
function toggleSelBar(on) { SB.open = on == null ? !SB.open : on; if (!SB.open) setHover(null); drawBar(); }
function drawBar() {
  const b = $('selBar'); if (!b) return; b.classList.toggle('show', SB.open); if (!SB.open) { b.innerHTML = ''; return; }
  const opt = (arr, sel) => arr.map(([v, l]) => '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
  b.innerHTML = '<b class="mono dim" style="font-size:11px">SELECCIÓ PER PROPIETATS</b>'
    + SB.filters.map((f, i) => { const P = PROPS[f.p]; return '<span class="flt"><select data-fp="' + i + '">' + opt(Object.keys(PROPS).map(k => [k, PROPS[k].label]), f.p) + '</select>'
      + (P.text ? '<input type="text" data-fv="' + i + '" value="' + esc(f.v) + '" placeholder="' + (P.num ? '≥ 2' : 'Mur*') + '">' : '<select data-fv="' + i + '">' + opt(P.vals(), f.v) + '</select>')
      + (SB.filters.length > 1 ? '<button class="btn sm" data-fd="' + i + '" title="Treu el filtre">✕</button>' : '') + '</span>'; }).join('<i class="dim">i</i>')
    + '<button class="btn sm" id="sbAdd" title="Afegeix un filtre (i)">+ filtre</button>'
    + '<select id="sbOp"><option value="replace">Substitueix</option><option value="add">Afegeix</option><option value="remove">Treu</option></select>'
    + '<select id="sbScope"><option value="ctx">Context actual</option><option value="model">Tot el model</option><option value="vis">Només visible</option></select>'
    + '<span class="mono" id="sbCnt"></span><button class="btn sm acc" id="sbGo">Selecciona</button><button class="btn sm" id="sbSim" title="Selecciona tot el que comparteix la propietat amb la selecció">Similar</button><button class="btn sm" id="sbX" title="Tanca">✕</button>';
  $('sbOp').value = SB.op; $('sbScope').value = SB.scope;
  const upd = () => { const r = runFilter(); $('sbCnt').textContent = selTotal(r) + ' coincidències'; const { c, off } = ctxInfo(); if (SB.scope !== 'model') showSelPreview(c, off, r); else setHover(null); return r; };
  b.querySelectorAll('[data-fp]').forEach(e => e.onchange = () => { const i = +e.dataset.fp, P = PROPS[e.value]; SB.filters[i] = { p: e.value, v: P.text ? '' : (P.vals()[0] || [''])[0] }; drawBar(); });
  b.querySelectorAll('[data-fv]').forEach(e => { const h = () => { SB.filters[+e.dataset.fv].v = e.value; upd(); }; e.onchange = h; e.oninput = h; });
  b.querySelectorAll('[data-fd]').forEach(e => e.onclick = () => { SB.filters.splice(+e.dataset.fd, 1); drawBar(); });
  $('sbAdd').onclick = () => { SB.filters.push({ p: 'tipus', v: 'group' }); drawBar(); };
  $('sbOp').onchange = e => { SB.op = e.target.value; }; $('sbScope').onchange = e => { SB.scope = e.target.value; drawBar(); };
  $('sbGo').onclick = () => { const r = upd(); setHover(null); applyBar(r); drawBar(); };
  $('sbSim').onclick = similarSel; $('sbX').onclick = () => toggleSelBar(false);
  upd();
}
