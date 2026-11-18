/* ============================================================
   guaitaBIMup 10 — nucli de l'aplicació
   Estat · escena (Z amunt) · càmera i projeccions (cònica,
   axonomètrica, cavallera, militar) · reconstrucció de malles ·
   inferència i selecció de punts.
   ============================================================ */
'use strict';
const VERSION = '0.40.0';
const V = K.V;
const $ = id => document.getElementById(id);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const fmt = (x, d) => (Math.round(x * Math.pow(10, d == null ? 3 : d)) / Math.pow(10, d == null ? 3 : d)).toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: d == null ? 3 : d });
const fmtN = fmt; /* àlies: exportDlg(fmt) ombreja fmt */
const fmtM = x => fmt(x) + ' m';
const fmtElev = x => (Math.abs(x) < 1e-9 ? '±' : x > 0 ? '+' : '−') + fmt(Math.abs(x), 2);

/* ---------- classificador IFC reduït ---------- */
const IFC = [
  ['IfcWall', 'Mur', '#E8E2D0'], ['IfcCurtainWall', 'Mur cortina', '#9CC7E8'], ['IfcSlab', 'Forjat / llosa', '#9AA3AE'], ['IfcRoof', 'Coberta', '#D9764A'],
  ['IfcColumn', 'Pilar', '#FFE500'], ['IfcBeam', 'Biga', '#F2A93B'], ['IfcMember', 'Barra estructural', '#C98A2B'], ['IfcPlate', 'Placa / panell', '#B8C4CC'],
  ['IfcFooting', 'Fonament', '#7A6F63'], ['IfcPile', 'Pilot', '#5E554C'], ['IfcStair', 'Escala', '#C58CFF'], ['IfcRamp', 'Rampa', '#A77BE0'],
  ['IfcRailing', 'Barana', '#6EE7A8'], ['IfcDoor', 'Porta', '#B5533C'], ['IfcWindow', 'Finestra', '#6FB7E6'], ['IfcCovering', 'Revestiment / cel ras', '#E6D3A8'],
  ['IfcChimney', 'Xemeneia', '#8C5A4A'], ['IfcShadingDevice', 'Protecció solar', '#FFB546'], ['IfcFurniture', 'Mobiliari', '#C89B62'], ['IfcSanitaryTerminal', 'Aparell sanitari', '#F4F4F0'],
  ['IfcFlowSegment', 'Conducte / canonada', '#2BC4C4'], ['IfcTransportElement', 'Ascensor / transport', '#FF8A5C'], ['IfcSpace', 'Espai', '#7AA2FF'], ['IfcOpeningElement', 'Obertura', '#FF6F91'],
  ['IfcSite', 'Emplaçament', '#A9A493'], ['IfcGeographicElement', 'Terreny / vegetació', '#6F9B55'], ['IfcCivilElement', 'Element d’obra civil', '#8B939F'], ['IfcBuildingElementProxy', 'Element genèric', '#D44BC2'],
];
const ifcColor = cls => { const r = IFC.find(x => x[0] === cls); return r ? r[2] : null; };
const PALETTE = [['Blanc', '#F4F4F0'], ['Gris clar', '#C9CCD1'], ['Gris fosc', '#5C6470'], ['Maó', '#B5533C'], ['Fusta', '#C89B62'], ['Pedra', '#A9A493'], ['Vidre', '#AFC6DA'], ['Vegetació', '#6F9B55'],
  ['Formigó', '#9AA3AE'], ['Acer', '#6E7B8A'], ['Teula', '#D9764A'], ['Aigua', '#5AA9D6']];

/* ---------- opcions del programa (no formen part del model) ---------- */
const OPT_DEF = { pick: 6, crossRL: true, chainSameClass: true, orbit: 0.008, wheel: 0.0012, wheelInv: false, orbitInvY: false, zoomCursor: false, axisPx: 14, axisPxZ: 20, snapGrid: true, snapStep: 0.5, navOrbit: 'alt', navPan: 'meta', navZoom: 'ctrl', fov: 35, anim: 260, edgeBias: 2, snapPx: 12, wallT: 0.30, slabT: 0.20, roofT: 0.25, roofSlope: 30, slopeUnit: 'pct', sillH: 0.90, matT: 0.50, padW: 1.20, padD: 1.20, padT: 0.50, stripW: 0.60, stripD: 0.40, colW: 0.40, colD: 0.40, wallH: 3.00, wallJust: 'c', wallHm: 'next', stairShape: 'I', stairTurn: 'l', stairW: 1.00, stairG: 0.28, stairT: 0.15, stairGap: 0.10, stairR: 0.175, stairUse: 'gen' };
const OPT = (() => { const o = { ...OPT_DEF }; try { Object.assign(o, JSON.parse(localStorage.getItem('guaitabimup.opts')) || {}); } catch (e) { /* */ } return o; })();
const EDGE_BIAS = { value: OPT.edgeBias * 1e-5 };

/* ---------- estat ---------- */
const S = {
  model: null, ctx: [], sel: { faces: new Set(), edges: new Set(), groups: new Set() },
  tool: 'select', mat: null, ifcActive: null, autoGroup: false, level: null,
  style: null, show: { ground: true, axes: true, levels: true, grids: true, cube: true },
  hiddenIfc: new Set(), bg: 'sky', undo: [], redo: [], dirty: false, fileName: 'sense-títol.gbup.json', fileHandle: null,
  tabs: [], view: null, segs: 24, sides: 6, selAnn: { lvls: new Set(), grids: new Set(), dims: new Set(), texts: new Set() }, boolPend: null,
};
function newModel() {
  const m = K.newModel();
  m.materials = PALETTE.map(([name, color]) => ({ name, color }));
  m.levels = [{ id: m.nid++, name: 'Nivell 0', elev: 0 }];
  m.views = [{ id: m.nid++, name: 'Escena 1', cam: null }];
  return m;
}
function ctxInfo() {
  let c = S.model.root, off = [0, 0, 0]; const path = [];
  for (const gid of S.ctx) { const g = c.groups.get(gid); if (!g) break; c = g; off = V.add(off, g.t); path.push(gid); }
  S.ctx = path; return { c, off };
}
const toLocal = p => V.sub(p, ctxInfo().off);
const workZ = () => { const l = S.model.levels.find(x => x.id === S.level); return l ? l.elev : 0; };
function clearSel() { S.sel.faces.clear(); S.sel.edges.clear(); S.sel.groups.clear(); const A = S.selAnn; if (A.dims.size || A.texts.size) { A.dims.clear(); A.texts.clear(); if (typeof rebuildAnnot === 'function') rebuildAnnot(); } }
const selCount = () => S.sel.faces.size + S.sel.edges.size + S.sel.groups.size;

/* ---------- desfer / refer ---------- */
function snapshot() { S.model.meta.style = styleSnapshot(); return JSON.stringify(K.toJSON(S.model)); }
const OP_LBL = { move: 'moure', copy: 'copiar', rotate: 'girar', scale: 'escalar', pushpull: 'estirar', offset: 'desplaçar', followme: 'seguir', eraser: 'esborrar', paint: 'pintar', line: 'dibuixar', rect: 'rectangle', rrect: 'rectangle', circle: 'cercle', poly: 'polígon', arc: 'arc', freehand: 'dibuixar', wall: 'muro', column: 'pilar', slab: 'llosa', roof: 'coberta', stair: 'escala', opening: 'obertura', tape: 'mesura', dim: 'cota', text: 'text', level: 'nivell', grid: 'eix', select: 'selecció' };
function opLabel() { return OP_LBL[S.tool] || 'canvi'; }
function updUndoTitle() { const b = $('tb_undo'); if (!b) return; const l = S.undoL && S.undoL[S.undo.length - 1]; const t = l ? 'Desfer ' + l + ' (Ctrl+Z)' : 'Desfés (Ctrl+Z)'; b.title = t; b.setAttribute('aria-label', t); }
/* pila d'instantànies amb l'etiqueta de cada operació (per al botó Desfer) */
function pushUndo(label) { S.undoL = (S.undoL || []).slice(0, S.undo.length); S.undo.push(snapshot()); S.undoL.push(label || opLabel()); if (S.undo.length > 80) { S.undo.shift(); S.undoL.shift(); } S.redo.length = 0; markDirty(); updUndoTitle(); }
function restore(js) { S.model = K.fromJSON(JSON.parse(js)); clearSel(); ctxInfo(); if (!S.model.levels.some(l => l.id === S.level)) S.level = S.model.levels.length ? S.model.levels[0].id : null; refreshAll(); }
function undo() { if (!S.undo.length) return; cancelTool(); S.redo.push(snapshot()); restore(S.undo.pop()); if (S.undoL) S.undoL.pop(); markDirty(); updUndoTitle(); }
function redo() { if (!S.redo.length) return; cancelTool(); S.undo.push(snapshot()); restore(S.redo.pop()); markDirty(); }
let saveT = null;
function markDirty() {
  S.dirty = true; updFileInfo();
  clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem('guaitabimup.autosave', snapshot()); } catch (e) { /* sense emmagatzematge */ } }, 800);
}

/* ---------- escena ---------- */
THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
const view = $('view');
const scene = new THREE.Scene();
let renderer = null, glOK = true;
try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0); view.appendChild(renderer.domElement); }
catch (e) { glOK = false; view.innerHTML = '<div style="padding:40px;color:#1B1D21">Aquest navegador no té WebGL disponible: el visor 3D no es pot mostrar.</div>'; }
const canvas = renderer ? renderer.domElement : view;
canvas.tabIndex = 0;
const hemi = new THREE.HemisphereLight(0xffffff, 0xb9bec6, 1.15); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(30, -40, 70); scene.add(sun);
const gGround = new THREE.Group(), gAxes = new THREE.Group(), gModel = new THREE.Group(), gAnnot = new THREE.Group(), gSel = new THREE.Group(), gPrev = new THREE.Group();
scene.add(gGround, gAxes, gModel, gAnnot, gSel, gPrev);
(function buildGround() {
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: 0xC7C2B2, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 }));
  pl.position.z = -0.002; gGround.add(pl);
  const pts = [];
  for (let i = -50; i <= 50; i++) { pts.push(i, -50, 0, i, 50, 0, -50, i, 0, 50, i, 0); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  gGround.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xB0AA98, transparent: true, opacity: 0.45 })));
  const ax = (color, d) => {
    const mk = (a, b, dashed) => { const gg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]); const l = new THREE.Line(gg, dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.35 }) : new THREE.LineBasicMaterial({ color })); if (dashed) l.computeLineDistances(); gAxes.add(l); };
    mk([0, 0, 0], V.mul(d, 1000), false); mk([0, 0, 0], V.mul(d, -1000), true);
  };
  ax(0xDB3B3B, [1, 0, 0]); ax(0x3AA23A, [0, 1, 0]); ax(0x3B6FDB, [0, 0, 1]);
})();

/* ---------- càmera i projeccions ---------- */
const CAM = { target: new THREE.Vector3(3, 3, 1.2), theta: -Math.PI / 3, phi: 1.15, dist: 22, proj: 'axo', fov: OPT.fov, cavA: 45, cavR: 0.5, milK: 1 };
const camP = new THREE.PerspectiveCamera(35, 1, 0.05, 5000), camO = new THREE.OrthographicCamera(-1, 1, 1, -1, -3000, 6000);
let cam = camP, needRender = true, camAnim = null;
function camDir() { const st = Math.sin(CAM.phi); return new THREE.Vector3(st * Math.cos(CAM.theta), st * Math.sin(CAM.theta), Math.cos(CAM.phi)); }
function updCam() {
  if (typeof S !== 'undefined' && S.navOpen && typeof syncNav === 'function') { try { syncNav(); } catch (e) { /* encara no inicialitzat */ } }
  const w = view.clientWidth || 1, h = view.clientHeight || 1, asp = w / h;
  const dir = camDir(), flat = new THREE.Vector3(-Math.cos(CAM.theta), -Math.sin(CAM.theta), 0);
  const pole = CAM.phi < 0.02 || CAM.phi > Math.PI - 0.02;
  if (CAM.proj === 'conic') {
    cam = camP; camP.fov = CAM.fov; camP.aspect = asp; camP.near = Math.max(0.05, CAM.dist / 150); camP.far = CAM.dist * 30 + 1500;
    camP.position.copy(CAM.target).addScaledVector(dir, CAM.dist); camP.up.copy(pole ? flat : new THREE.Vector3(0, 0, 1)); camP.lookAt(CAM.target); camP.updateProjectionMatrix();
  } else {
    cam = camO; const hh = CAM.dist * Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2));
    camO.left = -hh * asp; camO.right = hh * asp; camO.top = hh; camO.bottom = -hh;
    let a = 0, b = 0;
    if (CAM.proj === 'mil') { camO.position.copy(CAM.target).add(new THREE.Vector3(0, 0, CAM.dist)); camO.up.copy(flat); b = CAM.milK; }
    else if (CAM.proj === 'cav') {
      const th = Math.round(CAM.theta / (Math.PI / 2)) * Math.PI / 2;
      camO.position.copy(CAM.target).add(new THREE.Vector3(Math.cos(th) * CAM.dist, Math.sin(th) * CAM.dist, 0)); camO.up.set(0, 0, 1);
      const al = THREE.MathUtils.degToRad(CAM.cavA); a = -CAM.cavR * Math.cos(al); b = -CAM.cavR * Math.sin(al);
    } else { camO.position.copy(CAM.target).addScaledVector(dir, CAM.dist); camO.up.copy(pole ? flat : new THREE.Vector3(0, 0, 1)); }
    camO.near = -CAM.dist - 300; camO.far = CAM.dist + 1200;
    camO.lookAt(CAM.target); camO.updateProjectionMatrix();
    if (a || b) { const sh = new THREE.Matrix4().set(1, 0, a, a * CAM.dist, 0, 1, b, b * CAM.dist, 0, 0, 1, 0, 0, 0, 0, 1); camO.projectionMatrix.multiply(sh); }
    camO.projectionMatrixInverse.copy(camO.projectionMatrix).invert();
  }
  cam.updateMatrixWorld(true); needRender = true;
}
function setProj(p) { CAM.proj = p; updCam(); syncUI(); }
function camState() { return { t: CAM.target.toArray(), theta: CAM.theta, phi: CAM.phi, dist: CAM.dist, proj: CAM.proj }; }
const camHist = [];
function pushHist() { const s = camState(); const l = camHist[camHist.length - 1]; if (l && JSON.stringify(l) === JSON.stringify(s)) return; camHist.push(s); if (camHist.length > 40) camHist.shift(); }
function prevView() { const s = camHist.pop(); if (!s) { toast('No hi ha cap vista anterior.'); return; } animateCam({ t: s.t, theta: s.theta, phi: s.phi, dist: s.dist, proj: s.proj }, 220, true); }
function animateCam(to, ms, nohist) {
  if (!nohist) pushHist();
  const from = camState(); if (to.proj && to.proj !== CAM.proj) CAM.proj = to.proj;
  let dth = (to.theta == null ? from.theta : to.theta) - from.theta; while (dth > Math.PI) dth -= 2 * Math.PI; while (dth < -Math.PI) dth += 2 * Math.PI;
  camAnim = { from, to, dth, t0: performance.now(), ms: ms == null ? OPT.anim : ms }; needRender = true;
}
function stepAnim(now) {
  if (!camAnim) return; const a = camAnim; let k = a.ms <= 0 ? 1 : Math.min(1, (now - a.t0) / a.ms); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  CAM.theta = a.from.theta + a.dth * e;
  if (a.to.phi != null) CAM.phi = a.from.phi + (a.to.phi - a.from.phi) * e;
  if (a.to.dist != null) CAM.dist = a.from.dist + (a.to.dist - a.from.dist) * e;
  if (a.to.t) CAM.target.set(a.from.t[0] + (a.to.t[0] - a.from.t[0]) * e, a.from.t[1] + (a.to.t[1] - a.from.t[1]) * e, a.from.t[2] + (a.to.t[2] - a.from.t[2]) * e);
  if (k >= 1) camAnim = null; updCam();
}
function mouseRay(mx, my) {
  const w = view.clientWidth || 1, h = view.clientHeight || 1, nx = mx / w * 2 - 1, ny = -(my / h) * 2 + 1;
  const a = new THREE.Vector3(nx, ny, -1).unproject(cam), b = new THREE.Vector3(nx, ny, 1).unproject(cam);
  return { o: [a.x, a.y, a.z], d: V.norm([b.x - a.x, b.y - a.y, b.z - a.z]) };
}
const _v = new THREE.Vector3();
function toScreen(p) { _v.set(p[0], p[1], p[2]).project(cam); return { x: (_v.x + 1) / 2 * (view.clientWidth || 1), y: (1 - _v.y) / 2 * (view.clientHeight || 1), z: _v.z }; }
function modelBox() {
  const b = K.bbox(S.model.root);
  if (!isFinite(b.min[0])) return { min: [0, 0, 0], max: [6, 6, 3], empty: true };
  return b;
}
function fitView(selOnly) {
  let b = modelBox();
  if (selOnly && selCount()) { const { c, off } = ctxInfo(); const vs = K.vertsOf(c, S.sel); const bb = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const id of vs) { const p = V.add(K.P(c, id), off); for (let i = 0; i < 3; i++) { bb.min[i] = Math.min(bb.min[i], p[i]); bb.max[i] = Math.max(bb.max[i], p[i]); } }
    for (const gid of S.sel.groups) { const g = c.groups.get(gid); if (g) K.bbox(g, V.add(off, g.t), bb); }
    if (isFinite(bb.min[0])) b = bb; }
  const cx = V.mul(V.add(b.min, b.max), 0.5), r = Math.max(V.dist(b.min, b.max) / 2, 1);
  animateCam({ t: cx, dist: r / Math.sin(THREE.MathUtils.degToRad(CAM.fov / 2)) * 1.05 });
}

/* ---------- reconstrucció de malles ---------- */
const matFace = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
const matDim = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.28, depthWrite: false });
/* les arestes s'acosten una mica a la càmera (biaix en profunditat) perquè no desapareguin darrere de les cares coplanàries */
function biasEdge(m) { m.onBeforeCompile = sh => { sh.uniforms.uBias = EDGE_BIAS; sh.vertexShader = 'uniform float uBias;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  gl_Position.z -= uBias * gl_Position.w;'); }; return m; }
const matEdge = biasEdge(new THREE.LineBasicMaterial({ color: 0x1B1D21 })), matEdgeDim = biasEdge(new THREE.LineBasicMaterial({ color: 0x8B939F, transparent: true, opacity: 0.5 }));
const matSelF = new THREE.MeshBasicMaterial({ color: 0xD6FB41, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const matHover = new THREE.MeshBasicMaterial({ color: 0x00E5FF, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const matSelE = new THREE.LineBasicMaterial({ color: 0x86B300, depthTest: false });
let pickMeshes = [], SNAP = { verts: [], edges: [] };
function triangulate(c, f) {
  const o = K.P(c, f.loop[0]), bs = K.basis(f.n);
  const to = id => { const q = K.to2D(K.P(c, id), o, bs); return new THREE.Vector2(q[0], q[1]); };
  const ids = [...f.loop]; f.holes.forEach(h => ids.push(...h));
  let tris = []; try { tris = THREE.ShapeUtils.triangulateShape(f.loop.map(to), f.holes.map(h => h.map(to))); } catch (e) { tris = []; }
  return tris.map(t => t.map(i => ids[i]));
}
const tagVisible = id => { const t = S.model.tags.find(x => x.id === id); return !t || t.visible; };
const _c = new THREE.Color();
function disposeGroup(g) { for (const o of [...g.children]) { g.remove(o); if (o.geometry) o.geometry.dispose(); if (o.children && o.children.length) disposeGroup(o); } }
function faceGeometry(c, off, faces, colorOf, fmap) {
  const pos = [], col = [], nor = [];
  for (const f of faces) {
    if (colorOf) _c.set(colorOf(f));
    for (const t of triangulate(c, f)) { for (const id of t) { const p = K.P(c, id); pos.push(p[0] + off[0], p[1] + off[1], p[2] + off[2]); nor.push(f.n[0], f.n[1], f.n[2]); if (colorOf) col.push(_c.r, _c.g, _c.b); } if (fmap) fmap.push(f.id); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (colorOf) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
function edgeGeometry(c, off, edges) {
  const pos = []; for (const e of edges) { const a = K.P(c, e.a), b = K.P(c, e.b); pos.push(a[0] + off[0], a[1] + off[1], a[2] + off[2], b[0] + off[0], b[1] + off[1], b[2] + off[2]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
}
function buildContainer(c, off, path, st) {
  const sty = S.style, mode = sty.fa.mode, inCtx = S.ctx.every((id, i) => path[i] === id), dim = S.ctx.length > 0 && !inCtx;
  const faces = [...c.faces.values()].filter(f => tagVisible(f.tag)), fmap = [], side = sty.fa.by === 'side' && litMode(mode) && mode !== 'xray' && !dim;
  const colorOf = f => mode === 'hidden' ? styleBgColor() : mode === 'mono' ? sty.fa.mono : side ? sty.fa.front : (st.color || (sty.fa.by === 'mat' || sty.fa.by === 'side' ? (S.model.materials[f.mat] ? S.model.materials[f.mat].color : '#F4F4F0') : '#C9CCD1'));
  const geo = faceGeometry(c, off, faces, colorOf, fmap), mesh = new THREE.Mesh(geo, dim ? matDim : side ? matFront : litMode(mode) ? matFace : matFlat);
  mesh.userData = { c, path, fmap, off }; mesh.visible = mode !== 'wire'; gModel.add(mesh); pickMeshes.push(mesh);
  const shadow = !dim && sun.castShadow && (mode === 'shaded' || mode === 'mono'); mesh.castShadow = mesh.receiveShadow = shadow;
  if (side) { const bk = new THREE.Mesh(geo, matBack); bk.userData = { c, path, fmap, off, back: true }; bk.castShadow = bk.receiveShadow = shadow; gModel.add(bk); pickMeshes.push(bk); }
  const edges = [...c.edges.values()];
  if (dim) { const ln = new THREE.LineSegments(edgeGeometry(c, off, edges), matEdgeDim); ln.visible = sty.edges || sty.wire; gModel.add(ln); }
  else { const adj = styleEdges(c, off, edges, faces, st); styleCaps(geo, faces, adj); }
  for (const v of c.verts.values()) SNAP.verts.push({ p: V.add(v.p, off) });
  for (const e of edges) SNAP.edges.push({ a: V.add(K.P(c, e.a), off), b: V.add(K.P(c, e.b), off), c, id: e.id, path });
  for (const g of c.groups.values()) {
    if (!tagVisible(g.tag) || (g.ifc && S.hiddenIfc.has(g.ifc)) || (!g.ifc && path.length === 0 && S.hiddenIfc.has('-'))) continue;
    buildContainer(g, V.add(off, g.t), [...path, g.id], { color: groupColor(g, st.color), ecol: groupEdgeColor(g, st.ecol) });
  }
}
function rebuild() {
  disposeGroup(gModel); pickMeshes = []; SNAP = { verts: [], edges: [] };
  applyStyleEnv();
  bsecBar();
  buildContainer(S.model.root, [0, 0, 0], [], { color: null, ecol: null });
  styleCapPlanes();
  rebuildSel(); rebuildAnnot(); needRender = true;
}
function rebuildSel() {
  disposeGroup(gSel);
  const { c, off } = ctxInfo();
  const fs = [...S.sel.faces].map(id => c.faces.get(id)).filter(Boolean);
  if (fs.length) gSel.add(new THREE.Mesh(faceGeometry(c, off, fs, null, null), matSelF));
  const es = [...S.sel.edges].map(id => c.edges.get(id)).filter(Boolean);
  if (es.length) { const l = new THREE.LineSegments(edgeGeometry(c, off, es), matSelE); l.renderOrder = 9; gSel.add(l); }
  const addG = (g, o) => { const l = new THREE.LineSegments(edgeGeometry(g, o, [...g.edges.values()]), matSelE); l.renderOrder = 9; gSel.add(l); for (const s of g.groups.values()) addG(s, V.add(o, s.t)); };
  for (const gid of S.sel.groups) { const g = c.groups.get(gid); if (!g) continue; const o = V.add(off, g.t); addG(g, o);
    const b = K.bbox(g, o); if (isFinite(b.min[0])) { const bx = new THREE.Box3(new THREE.Vector3(...b.min), new THREE.Vector3(...b.max)); const h = new THREE.Box3Helper(bx, 0x86B300); h.renderOrder = 9; gSel.add(h); } }
  if (typeof gripsRebuild === 'function') gripsRebuild();
  needRender = true;
}
function setHover(c, off, f) { disposeGroup(gPrevHover); if (f) gPrevHover.add(new THREE.Mesh(faceGeometry(c, off, [f], null, null), matHover)); needRender = true; }
const gPrevHover = new THREE.Group(); scene.add(gPrevHover);

/* ---------- nivells i eixos de pilars en 3D ---------- */
const matLvlLine = new THREE.LineDashedMaterial({ color: 0x0E7C86, dashSize: 0.4, gapSize: 0.2 }), matLvlFill = new THREE.MeshBasicMaterial({ color: 0x0E7C86, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false });
const matLvlAct = new THREE.MeshBasicMaterial({ color: 0x0E7C86, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false });
const matGrdLine = new THREE.LineDashedMaterial({ color: 0xA3157F, dashSize: 0.5, gapSize: 0.18 }), matGrdFill = new THREE.MeshBasicMaterial({ color: 0xA3157F, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false });
let LABELS = [];
function quad(pts, lineMat, fillMat) {
  const g = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]].map(p => new THREE.Vector3(...p)));
  const l = new THREE.Line(g, lineMat); l.computeLineDistances(); gAnnot.add(l);
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute([...pts[0], ...pts[1], ...pts[2], ...pts[0], ...pts[2], ...pts[3]], 3));
  const ms = new THREE.Mesh(m, fillMat); ms.renderOrder = 5; gAnnot.add(ms);
}
function annotExtent() {
  const b = modelBox(), mg = 2;
  const e = { x0: Math.min(b.min[0], 0) - mg, x1: Math.max(b.max[0], 6) + mg, y0: Math.min(b.min[1], 0) - mg, y1: Math.max(b.max[1], 6) + mg, z0: 0, z1: Math.max(b.max[2], 3) };
  for (const g of S.model.grids) for (const p of [g.a, g.b]) { e.x0 = Math.min(e.x0, p[0] - mg); e.x1 = Math.max(e.x1, p[0] + mg); e.y0 = Math.min(e.y0, p[1] - mg); e.y1 = Math.max(e.y1, p[1] + mg); }
  for (const l of S.model.levels) { e.z0 = Math.min(e.z0, l.elev); e.z1 = Math.max(e.z1, l.elev); }
  return e;
}
const guides = () => S.model.grids.concat(S.model.refs || []);
function gridEnds(g) { const d = V.norm([g.b[0] - g.a[0], g.b[1] - g.a[1], 0]), ext = 1.6; return { a: [g.a[0] - d[0] * ext, g.a[1] - d[1] * ext], b: [g.b[0] + d[0] * ext, g.b[1] + d[1] * ext], d }; }
/* cantonada del rectangle de nivell més allunyada de la càmera (vist en planta): índex 0..3 de x0y0, x1y0, x1y1, x0y1 */
let BACK_K = -1;
function backCorner() {
  const e = annotExtent(), f = cam.getWorldDirection(new THREE.Vector3()), fx = f.x, fy = f.y, C = [[e.x0, e.y0], [e.x1, e.y0], [e.x1, e.y1], [e.x0, e.y1]];
  let best = 0, bv = -Infinity; C.forEach((c, i) => { const v = c[0] * fx + c[1] * fy; if (v > bv) { bv = v; best = i; } }); return best;
}
function rebuildAnnot() {
  disposeGroup(gAnnot); $('labels').innerHTML = ''; LABELS = [];
  const e = annotExtent();
  const addLab = (cls, html, p) => { const d = el('div', 'lab ' + cls, html); $('labels').appendChild(d); LABELS.push({ el: d, p }); return d; };
  const vm = k => visMode(k), SA = S.selAnn;
  const seg = (p, q, mat) => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p), new THREE.Vector3(...q)]); const l = new THREE.Line(g, mat); l.computeLineDistances(); gAnnot.add(l); };
  for (const v of bsecs()) seg([v.a[0], v.a[1], levelElev(S.model, S.level)], [v.b[0], v.b[1], levelElev(S.model, S.level)], matBsec);
  if (S.show.levels) for (const l of S.model.levels) {
    if (l.hidden) continue;
    const act = l.id === S.level, full = vm('lvl') === 'full' || act || SA.lvls.has(l.id), P = [[e.x0, e.y0, l.elev], [e.x1, e.y0, l.elev], [e.x1, e.y1, l.elev], [e.x0, e.y1, l.elev]];
    if (full) quad(P, matLvlLine, act ? matLvlAct : matLvlFill); else { const k = backCorner(); const ci = [0, 1, 2, 3].map(i => P[i]); seg(ci[k], ci[(k + 1) % 4], matLvlLine); seg(ci[k], ci[(k + 3) % 4], matLvlLine); }
    const lb = addLab('lv' + (act ? ' act' : '') + (SA.lvls.has(l.id) ? ' sel' : ''), esc(l.name) + '<i>' + fmtElev(l.elev) + '</i>', lvlLabelPt(e, l)); lb.title = 'Clic: nivell de treball · Ctrl/Maj+clic: mostra’l complet';
    lb.ondblclick = ev => { ev.stopPropagation(); annSelectOnly('lvls', l.id); annEditDlg('lvls', l); }; lb.onclick = ev => { if (ev.ctrlKey || ev.metaKey || ev.shiftKey) toggleAnnSel('lvls', l.id); else setLevel(l.id); };
  }
  if (S.show.grids) for (const g of S.model.grids) {
    if (g.hidden) continue;
    const mode = vm('grd'), full = mode === 'full' || SA.grids.has(g.id), q = gridEnds(g), z0 = e.z0, z1 = e.z1 + 0.6;
    let lz = z0;
    if (full) quad([[q.a[0], q.a[1], z0], [q.b[0], q.b[1], z0], [q.b[0], q.b[1], z1], [q.a[0], q.a[1], z1]], matGrdLine, matGrdFill);
    else if (mode === 'compact') { seg([q.a[0], q.a[1], z0], [q.b[0], q.b[1], z0], matGrdLine); seg([q.a[0], q.a[1], z1], [q.b[0], q.b[1], z1], matGrdLine); }
    else { lz = workZ(); seg([q.a[0], q.a[1], lz], [q.b[0], q.b[1], lz], matGrdLine); }
    const gl = addLab('gr' + (SA.grids.has(g.id) ? ' sel' : ''), esc(g.name), [q.a[0] - q.d[0] * 0.5, q.a[1] - q.d[1] * 0.5, lz]); gl.title = 'Clic: mostra l’eix complet'; gl.onclick = () => toggleAnnSel('grids', g.id); gl.ondblclick = ev => { ev.stopPropagation(); annSelectOnly('grids', g.id); annEditDlg('grids', g); };
  }
  if (typeof annotExtra === 'function') annotExtra(e, quad, addLab);
  if (typeof gripsRebuild === 'function' && !(typeof GRIP !== 'undefined' && GRIP.drag)) gripsRebuild();
  needRender = true;
}
/* en mode compacte, les arestes de nivell es recalculen quan la càmera gira */
/* en qualsevol vista 3D (no en planta) les etiquetes de nivell van al cantó de darrera, en un extrem de la línia */
function lvlBackOn() { return Math.sin(CAM.phi) > 0.05; }
function lvlLabelPt(e, l) {
  const C = [[e.x0, e.y0], [e.x1, e.y0], [e.x1, e.y1], [e.x0, e.y1]];
  if (!lvlBackOn()) return [e.x1 + 0.9, e.y0, l.elev];
  /* un vèrtex més a l'esquerra (en pantalla) del vèrtex de darrere, sobre una de les dues arestes de darrere */
  const k = backCorner(), R = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), nb = [(k + 1) % 4, (k + 3) % 4];
  const sx = i => C[i][0] * R.x + C[i][1] * R.y, j = sx(nb[0]) <= sx(nb[1]) ? nb[0] : nb[1];
  const c = C[j], cx = (e.x0 + e.x1) / 2, cy = (e.y0 + e.y1) / 2, ox = c[0] > cx ? 0.6 : -0.6, oy = c[1] > cy ? 0.6 : -0.6;
  return [c[0] + ox, c[1] + oy, l.elev];
}
function updBackCorner() { if (!S.show.levels) return; const k = lvlBackOn() ? backCorner() : -1; if (k !== BACK_K) { BACK_K = k; rebuildAnnot(); } }
function vm_lvl() { return visMode('lvl'); }
function updLabels() {
  for (const L of LABELS) { const s = toScreen(L.p); const vis = s.z > -1 && s.z < 1; L.el.style.display = vis ? '' : 'none'; if (vis) { L.el.style.left = s.x + 'px'; L.el.style.top = s.y + 'px'; } }
}

/* ---------- inferència ---------- */
const AXES = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], AX_NAME = ['Sobre l’eix vermell', 'Sobre l’eix verd', 'Sobre l’eix blau'], AX_COL = ['#DB3B3B', '#3AA23A', '#3B6FDB'];
function closestOnLineToRay(p0, u, ray, clamp) {
  const w = V.sub(p0, ray.o), a = V.dot(u, u), b = V.dot(u, ray.d), c = V.dot(ray.d, ray.d), d = V.dot(u, w), e = V.dot(ray.d, w), den = a * c - b * b;
  if (Math.abs(den) < 1e-12) return null;
  let s = (b * e - c * d) / den; if (clamp) s = Math.max(0, Math.min(1, s));
  return { s, p: V.add(p0, V.mul(u, s)) };
}
function rayPlane(ray, o, n) { const den = V.dot(ray.d, n); if (Math.abs(den) < 1e-9) return null; const t = V.dot(V.sub(o, ray.o), n) / den; if (t < -1e-6 && CAM.proj === 'conic') return null; return V.add(ray.o, V.mul(ray.d, t)); }
const raycaster = new THREE.Raycaster();
function faceHit(ray) {
  raycaster.ray.origin.set(...ray.o); raycaster.ray.direction.set(...ray.d); raycaster.near = 0; raycaster.far = Infinity;
  const hits = raycaster.intersectObjects(pickMeshes, false);
  for (const h of hits) {
    const ud = h.object.userData, fid = ud.fmap[h.faceIndex], f = ud.c.faces.get(fid); if (!f) continue;
    if (renderer && renderer.clippingPlanes && renderer.clippingPlanes.length && renderer.clippingPlanes.some(pl => pl.distanceToPoint(h.point) < 0)) continue;
    return { p: [h.point.x, h.point.y, h.point.z], f, c: ud.c, path: ud.path, off: ud.off };
  }
  return null;
}
/* Retorna el punt 3D sota el cursor amb la inferència aplicada.
   opt.from: punt d'ancoratge (per als eixos) · opt.lock: 0/1/2 eix forçat */

/* distància mínima entre dos segments 3D; retorna el punt mig i els paràmetres */
function segClosest(a, b, c, d) {
  const u = V.sub(b, a), w = V.sub(d, c), r = V.sub(a, c);
  const A = V.dot(u, u), B = V.dot(u, w), C = V.dot(w, w), D = V.dot(u, r), E = V.dot(w, r), den = A * C - B * B;
  let s = den > 1e-12 ? (B * E - C * D) / den : 0, t = C > 1e-12 ? (B * s + E) / C : 0;
  s = Math.max(0, Math.min(1, s)); t = Math.max(0, Math.min(1, t));
  const p = V.add(a, V.mul(u, s)), q = V.add(c, V.mul(w, t));
  return { s, t, p, q, d: V.dist(p, q) };
}
/* creuaments de vores properes amb vores, eixos i pla de treball (estil IngeTrazo: intersection / intersection_edge / intersection_plane) */
function snapCrossings(mx, my, ray, wz) {
  const sd = p => { const s = toScreen(p); return s.z > 1 ? Infinity : Math.hypot(s.x - mx, s.y - my); };
  const L = [];
  for (const e of SNAP.edges) { const q = closestOnLineToRay(e.a, V.sub(e.b, e.a), ray, true); if (q && sd(q.p) < 40) L.push(e); if (L.length >= 60) break; }
  const out = [];
  const tol = 0.002;
  for (let i = 0; i < L.length; i++) {
    const e = L[i];
    for (let j = i + 1; j < L.length; j++) { const f = L[j], c = segClosest(e.a, e.b, f.a, f.b); if (c.d < tol && c.s > 1e-6 && c.s < 1 - 1e-6 && c.t > 1e-6 && c.t < 1 - 1e-6) out.push({ p: V.mul(V.add(c.p, c.q), 0.5), kind: 'inter_edges', label: 'Intersecció de vores', col: '#E8590C' }); }
    for (let k = 0; k < 3; k++) { const c = segClosest(e.a, e.b, [0, 0, 0], V.mul(AXES[k], 1e5)); if (c.d < tol && c.s > 1e-6 && c.s < 1 - 1e-6) out.push({ p: c.p, kind: 'inter_axis', label: AX_NAME[k].replace('Sobre', 'Intersecció amb'), col: AX_COL[k] }); }
    if ((e.a[2] - wz) * (e.b[2] - wz) < 0) { const t = (wz - e.a[2]) / (e.b[2] - e.a[2]); out.push({ p: V.lerp(e.a, e.b, t), kind: 'inter_plane', label: 'Intersecció amb el pla de treball', col: '#7B2CBF' }); }
  }
  let best = null, bd = 12;
  for (const c of out) { const d = sd(c.p); if (d < bd) { bd = d; best = c; } }
  return best;
}
/* punt de l'eix i (0 vermell, 1 verd, 2 blau) més proper al cursor en pantalla, des de 'from'.
   Projecta l'eix a pantalla i mesura la distància del cursor a aquesta recta projectada (no al raig 3D).
   Si l'eix és gairebé paral·lel a la visual (blau vist de dalt), no enganxa. */
function axisScreenPick(from, i, mx, my) {
  const L = Math.max(0.2, CAM.dist * 0.05), a = toScreen(from), b = toScreen(V.add(from, V.mul(AXES[i], L)));
  if (a.z > 1 || b.z > 1) return null;
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy; if (l2 < 9) return null;
  /* estimació lineal i després tres passos de Newton en pantalla (la perspectiva no és lineal) */
  let t = ((mx - a.x) * dx + (my - a.y) * dy) / l2, S = null;
  for (let k = 0; k < 4; k++) {
    S = toScreen(V.add(from, V.mul(AXES[i], t * L))); if (S.z > 1) return null;
    if (k === 3) break;
    const e = 1e-3, S2 = toScreen(V.add(from, V.mul(AXES[i], (t + e) * L))); if (S2.z > 1) return null;
    const ux = (S2.x - S.x) / e, uy = (S2.y - S.y) / e, den = ux * ux + uy * uy; if (den < 1e-6) return null;
    t += ((mx - S.x) * ux + (my - S.y) * uy) / den;
  }
  return { p: V.add(from, V.mul(AXES[i], t * L)), d: Math.hypot(S.x - mx, S.y - my) };
}
/* punt de la quadrícula del nivell actiu (pas OPT.snapStep), només si és a prop del cursor */
function snapGridPt(mx, my, ray, wz) {
  if (!OPT.snapGrid) return null;
  const s = Math.max(0.01, +OPT.snapStep || 0.5), p0 = rayPlane(ray, [0, 0, wz], [0, 0, 1]); if (!p0 || !isFinite(p0[0] + p0[1])) return null;
  const p = [Math.round(p0[0] / s) * s, Math.round(p0[1] / s) * s, wz], sc = toScreen(p);
  if (sc.z > 1 || Math.hypot(sc.x - mx, sc.y - my) > 10) return null;
  return { p, kind: 'sgrid', label: 'Quadrícula ' + fmtM(s), col: '#2E7D32' };
}
/* Tab cicla entre els snaps propers al cursor (només en passos sense eix) */
let SNAP_CYC = 0, SNAP_AT = { x: 0, y: 0 }, AXIS_STICK = -1;
function snapAlts(mx, my, ray) {
  const sd = p => { const s = toScreen(p); return s.z > 1 ? Infinity : Math.hypot(s.x - mx, s.y - my); }, out = [], wz = workZ();
  if (sd([0, 0, 0]) < 10) out.push({ p: [0, 0, 0], kind: 'origin', label: 'Origen', col: '#E0A800' });
  for (const v of SNAP.verts) if (sd(v.p) < 12) { out.push({ p: v.p.slice(), kind: 'end', label: 'Final', col: '#3AA23A' }); break; }
  for (const e of SNAP.edges) { const m = V.lerp(e.a, e.b, 0.5); if (sd(m) < 9) { out.push({ p: m, kind: 'mid', label: 'Punt mig', col: '#00B8D4' }); break; } }
  for (const e of SNAP.edges) { const q = closestOnLineToRay(e.a, V.sub(e.b, e.a), ray, true); if (q && sd(q.p) < 7) { out.push({ p: q.p, kind: 'edge', label: 'Sobre l’aresta', col: '#DB3B3B' }); break; } }
  const cr = snapCrossings(mx, my, ray, wz); if (cr) out.push(cr);
  const sg = snapGridPt(mx, my, ray, wz); if (sg) out.push(sg);
  const hit = faceHit(ray); if (hit) out.push({ p: hit.p, kind: 'face', label: 'Sobre la cara', col: '#3B6FDB' });
  out.push({ p: hit ? hit.p : (rayPlane(ray, [0, 0, wz], [0, 0, 1]) || CAM.target.toArray()), kind: 'plane', label: '', col: '#8B939F' });
  return out;
}
function pick(mx, my, opt) {
  opt = opt || {};
  const r = pickBase(mx, my, opt);
  if (!SNAP_CYC || opt.from) return r;
  const alts = snapAlts(mx, my, r.ray); if (!alts.length) return r;
  const a = alts[SNAP_CYC % alts.length]; a.ray = r.ray; a.hit = r.hit; return a;
}
function pickBase(mx, my, opt) {
  opt = opt || {};
  const ray = mouseRay(mx, my), sd = p => { const s = toScreen(p); return s.z > 1 ? Infinity : Math.hypot(s.x - mx, s.y - my); };
  let res = null, bd = 11;
  const od = sd([0, 0, 0]); if (od < 10) { bd = od; res = { p: [0, 0, 0], kind: 'origin', label: 'Origen', col: '#E0A800' }; }
  for (const v of SNAP.verts) { const d = sd(v.p); if (d < bd) { bd = d; res = { p: v.p.slice(), kind: 'end', label: 'Final', col: '#3AA23A' }; } }
  if (!res) { bd = 9; for (const e of SNAP.edges) { const m = V.lerp(e.a, e.b, 0.5), d = sd(m); if (d < bd) { bd = d; res = { p: m, kind: 'mid', label: 'Punt mig', col: '#00B8D4', edge: e }; } } }
  /* v0.37: amb un primer punt, el pla de treball és l'horitzontal per la cota d'aquest punt (no el del nivell actiu) */
  const wz = (opt.from && isFinite(opt.from[2])) ? opt.from[2] : workZ();
  if (!res) { const cr = snapCrossings(mx, my, ray, wz); if (cr) res = cr; }
  if (!res) { const sg = snapGridPt(mx, my, ray, wz); if (sg) res = sg; }
  if (!res && S.show.grids) {
    bd = 10; const G = guides();
    for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
      const a = G[i], b = G[j], r = [a.b[0] - a.a[0], a.b[1] - a.a[1]], s = [b.b[0] - b.a[0], b.b[1] - b.a[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) continue;
      const t = ((b.a[0] - a.a[0]) * s[1] - (b.a[1] - a.a[1]) * s[0]) / den, p = [a.a[0] + r[0] * t, a.a[1] + r[1] * t, wz], d = sd(p);
      if (d < bd) { bd = d; res = { p, kind: 'gridx', label: 'Intersecció ' + a.name + '–' + b.name, col: '#A3157F' }; }
    }
  }
  if (!res) { bd = 7; for (const e of SNAP.edges) { const q = closestOnLineToRay(e.a, V.sub(e.b, e.a), ray, true); if (!q) continue; const d = sd(q.p); if (d < bd) { bd = d; res = { p: q.p, kind: 'edge', label: 'Sobre l’aresta', col: '#DB3B3B', edge: e }; } } }
  const hit = faceHit(ray);
  if (!res && S.show.grids) {
    bd = 7; for (const g of guides()) { const q = gridEnds(g), a = [q.a[0], q.a[1], wz], b = [q.b[0], q.b[1], wz]; const c = closestOnLineToRay(a, V.sub(b, a), ray, true); if (!c) continue; const d = sd(c.p);
      if (d < bd && (!hit || V.dist(ray.o, c.p) < V.dist(ray.o, hit.p) + 0.01)) { bd = d; res = { p: c.p, kind: 'grid', label: 'Sobre l’eix ' + g.name, col: '#A3157F' }; } }
  }
  if (!res && hit) res = { p: hit.p, kind: 'face', label: 'Sobre la cara', col: '#3B6FDB' };
  if (!res && typeof imgHit === 'function') { const ih = imgHit(ray); if (ih) res = { p: ih.p, kind: 'imgplane', label: 'Sobre la imatge', col: '#C77800', imgN: ih.n }; }
  if (!res) {
    let p = rayPlane(ray, [0, 0, wz], [0, 0, 1]);
    if (!p || V.dist(p, CAM.target.toArray()) > 2000) { const d = camDir(); p = rayPlane(ray, CAM.target.toArray(), [d.x, d.y, d.z]) || CAM.target.toArray(); }
    res = { p, kind: 'plane', label: '', col: '#8B939F' };
  }
  res.hit = hit; res.ray = ray;
  if (opt.from) {
    const strong = res.kind === 'origin' || res.kind === 'sgrid' || res.kind === 'end' || res.kind === 'mid' || res.kind === 'edge' || res.kind === 'gridx' || res.kind === 'grid' || res.kind === 'inter_edges' || res.kind === 'inter_axis' || res.kind === 'inter_plane';
    if (opt.lock != null) {
      const ax = AXES[opt.lock];
      if (strong) res.p = V.add(opt.from, V.mul(ax, V.dot(V.sub(res.p, opt.from), ax)));
      else { const q = closestOnLineToRay(opt.from, ax, ray); if (q) res.p = q.p; }
      res.axis = opt.lock; res.label = AX_NAME[opt.lock] + (strong ? ' · ' + res.label.toLowerCase() : ''); res.col = AX_COL[opt.lock]; res.kind = 'axis';
    } else if (!strong) {
      const zn = [OPT.axisPx || 14, OPT.axisPx || 14, OPT.axisPxZ || 20];
      let ba = Infinity, bi = -1, bp = null;
      for (let i = 0; i < 3; i++) { const q = axisScreenPick(opt.from, i, mx, my); if (q && q.d < zn[i] && q.d < ba) { ba = q.d; bi = i; bp = q.p; } }
      /* histèresi: un eix ja enganxat es manté fins a dues vegades la zona */
      if (bi < 0 && AXIS_STICK >= 0) { const q = axisScreenPick(opt.from, AXIS_STICK, mx, my); if (q && q.d < 2 * zn[AXIS_STICK]) { bi = AXIS_STICK; bp = q.p; } }
      AXIS_STICK = bi;
      if (bi >= 0) { res.p = bp; res.axis = bi; res.label = AX_NAME[bi]; res.col = AX_COL[bi]; res.kind = 'axis'; }
    }
    if (res.axis === 2 && S.show.levels) for (const l of S.model.levels) { const q = [res.p[0], res.p[1], l.elev]; if (sd(q) < 8) { res.p = q; res.label = 'A ' + l.name; res.col = '#0E7C86'; break; } }
  }
  return res;
}
/* pla de dibuix a partir d'una selecció de punt: cara o horitzontal */
function planeOf(pk) {
  if (pk.imgN) return { o: pk.p, n: pk.imgN.slice() };
  if (pk.kind === 'face' && pk.hit) return { o: pk.p, n: pk.hit.f.n.slice() };
  if (pk.hit && Math.abs(V.dot(V.sub(pk.p, pk.hit.p), pk.hit.f.n)) < 1e-4 && pk.kind !== 'plane') return { o: pk.p, n: pk.hit.f.n.slice() };
  return { o: pk.p, n: [0, 0, 1] };
}
function planeAxes(n) { let u = Math.abs(n[2]) > 0.999 ? [1, 0, 0] : V.norm(V.cross([0, 0, 1], n)); const v = V.norm(V.cross(n, u)); return { u, v }; }
function projToPlane(pk, pl) {
  const d = V.dot(V.sub(pk.p, pl.o), pl.n);
  if (Math.abs(d) < 1e-5) return pk.p;
  if (pk.kind === 'end' || pk.kind === 'mid' || pk.kind === 'edge') return V.sub(pk.p, V.mul(pl.n, d));
  return rayPlane(pk.ray, pl.o, pl.n) || V.sub(pk.p, V.mul(pl.n, d));
}

/* ---------- previsualització ---------- */
function clearPrev() { disposeGroup(gPrev); needRender = true; }
function prevLine(pts, color, closed) {
  const arr = (closed ? [...pts, pts[0]] : pts).map(p => new THREE.Vector3(...p));
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arr), new THREE.LineBasicMaterial({ color: color || 0x1B1D21, depthTest: false })); l.renderOrder = 10; gPrev.add(l); needRender = true;
}
function showTip(mx, my, pk, extra) {
  const t = $('tip'); if (!pk || (!pk.label && !extra)) { t.style.display = 'none'; snapDot(null); return; }
  t.style.display = 'flex'; t.style.left = (mx + 16) + 'px'; t.style.top = (my + 14) + 'px';
  t.querySelector('.d').style.background = pk.col || '#8B939F'; t.querySelector('.t').textContent = pk.label || ''; t.querySelector('b').textContent = extra || '';
  snapDot(pk);
}
/* punt de color sobre el punt de snap detectat */
function snapDot(pk) {
  let d = $('snapDot'); if (!d) { d = el('div'); d.id = 'snapDot'; d.style.cssText = 'position:fixed;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;border:2px solid #fff;pointer-events:none;z-index:50;box-shadow:0 0 0 1px rgba(0,0,0,.35)'; document.body.appendChild(d); }
  if (!pk || !pk.p || !pk.kind || pk.kind === 'plane') { d.style.display = 'none'; return; }
  const sc = toScreen(pk.p); if (sc.z > 1) { d.style.display = 'none'; return; }
  const r = view.getBoundingClientRect(); d.style.display = 'block'; d.style.background = pk.col || '#8B939F'; d.style.left = (r.left + sc.x) + 'px'; d.style.top = (r.top + sc.y) + 'px';
}
function toast(msg, actLabel, actFn) {
  const t = $('toast'); t.innerHTML = ''; t.appendChild(document.createTextNode(msg));
  if (actLabel) { const b = el('button', 'btn sm', esc(actLabel)); b.onclick = () => { t.classList.remove('show'); actFn(); }; t.appendChild(b); }
  t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 4500);
}

/* ---------- bucle de render ---------- */
function resize() { if (!renderer) return; const w = view.clientWidth || 1, h = view.clientHeight || 1; renderer.setSize(w, h, false); for (const m of LINE_MATS) m.resolution.set(w, h); updCam(); }
function frame(now) {
  requestAnimationFrame(frame);
  if (camAnim) stepAnim(now);
  if (!needRender) return; needRender = false;
  gGround.visible = S.show.ground; gAxes.visible = S.show.axes;
  updSil(); updBackCorner(); if (renderer) renderer.render(scene, cam);
  updLabels(); gripsUpdate(); drawCube();
}
