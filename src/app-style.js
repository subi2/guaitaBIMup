/* ============================================================
   v14 · estils de visualització tècnics (arestes, cares, secció,
   fons, sol i ombres). Un estil és un objecte pla serialitzable.
   ============================================================ */
const STYLE_BASE = {
  name: 'Treball',
  ed: { show: 'all', w: 1, wp: 1, wc: 3, color: '#1B1D21', by: 'fix', hid: 'mark', soft: 20, sm: true },
  fa: { mode: 'shaded', by: 'mat', op: 0.45, mono: '#FFFFFF', front: '#FFFFFF', back: '#5B9BD5' },
  sec: { fill: 'grey', tone: 0.3, color: '#2A2E35', bgc: '#FFFFFF', lc: '#000000' },
  bg: { mode: 'grad', top: '#7FB0E8', bot: '#F2F5F8' },
  sun: { on: false, sh: false, date: '06-21', hour: 12, lat: 41.4, north: 0, li: 1.3, amb: 1.15, dark: 0.45 },
  ann: { ground: true, axes: true, levels: true, grids: true },
  ln: { set: 'ISO', w: { A: 0.5, B: 0.25, C: 0.18, D: 0.18, S: 0.13 }, vis: { A: true, B: true, C: true, D: true, S: true }, mult: [1, 0.8, 0.6, 0.4], eOn: [true, true, true], d0: 1.2, d: [2.4, 3.6, 4.8], j3: true },
};
const PAPER = { bg: { mode: 'solid', top: '#FFFFFF', bot: '#FFFFFF' }, ann: { ground: false, axes: false, levels: true, grids: true } };
const STYLES_BUILTIN = [
  { name: 'Treball' },
  { name: 'Línia oculta', ...PAPER, fa: { mode: 'hidden' }, ed: { wp: 2, hid: 'dash' } },
  { name: 'Tècnic amb seccions', ...PAPER, fa: { mode: 'hidden' }, ed: { wp: 2.5, wc: 4, hid: 'dash' }, sec: { fill: 'hatch' } },
  { name: 'Per classes IFC', bg: { mode: 'solid', top: '#F2F4F1', bot: '#F2F4F1' }, fa: { by: 'ifc' }, ann: { ground: false } },
  { name: 'Per nivells', bg: { mode: 'solid', top: '#F2F4F1', bot: '#F2F4F1' }, fa: { by: 'level' }, ann: { ground: false } },
  { name: 'Raigs X', fa: { mode: 'xray' } },
  { name: 'Assolellament', fa: { mode: 'mono' }, sun: { on: true, sh: true }, ed: { color: '#4A4F57' } },
  { name: 'Revisió de cares', fa: { by: 'side' }, bg: { mode: 'solid', top: '#F2F4F1', bot: '#F2F4F1' }, ann: { ground: false } },
];
const LVL_PAL = ['#4E79A7', '#F28E2B', '#59A14F', '#E15759', '#76B7B2', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'];
function lnMerge(src) { const b = JSON.parse(JSON.stringify(STYLE_BASE.ln)); if (src) for (const k of Object.keys(src)) { if (k === 'w' || k === 'vis') Object.assign(b[k], src[k]); else if (Array.isArray(src[k])) b[k] = src[k].slice(); else b[k] = src[k]; } return b; }
function stylePlain(s) { const o = { name: s.name }; for (const k of ['ed', 'fa', 'sec', 'bg', 'sun', 'ann']) o[k] = { ...s[k] }; o.ln = lnMerge(s.ln); return o; }
function mkStyle(src) {
  const s = { name: (src && src.name) || STYLE_BASE.name };
  for (const k of ['ed', 'fa', 'sec', 'bg', 'sun', 'ann']) s[k] = { ...STYLE_BASE[k], ...((src && src[k]) || {}) };
  s.ln = lnMerge(src && src.ln);
  /* compatibilitat amb les versions anteriors (no enumerables: no es desen) */
  Object.defineProperties(s, {
    wire: { get() { return s.fa.mode === 'wire'; }, set(v) { s.fa.mode = v ? 'wire' : 'shaded'; } },
    xray: { get() { return s.fa.mode === 'xray'; }, set(v) { s.fa.mode = v ? 'xray' : 'shaded'; } },
    edges: { get() { return s.ed.show !== 'none'; }, set(v) { s.ed.show = v ? 'all' : 'none'; } },
    colorBy: { get() { return s.fa.by; }, set(v) { s.fa.by = v; } },
  });
  return s;
}
S.style = mkStyle(STYLES_BUILTIN[0]);
function libStyles() { try { const a = JSON.parse(localStorage.getItem('guaitabimup.styles')); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function saveLib(a) { try { localStorage.setItem('guaitabimup.styles', JSON.stringify(a)); } catch (e) { /* */ } }
function modelStyles() { const m = S.model.meta; if (!Array.isArray(m.styles)) m.styles = []; return m.styles; }
function useStyle(src, quiet) {
  S.style = mkStyle(src); Object.assign(S.show, { ground: S.style.ann.ground, axes: S.style.ann.axes, levels: S.style.ann.levels, grids: S.style.ann.grids });
  if (!quiet) { refreshAll(); if (typeof buildMenus === 'function') buildMenus(); }
}
function adoptStyle() { useStyle(S.model.meta && S.model.meta.style ? S.model.meta.style : STYLES_BUILTIN[0], true); }
function styleSnapshot() { const p = stylePlain(S.style); p.ann = { ground: S.show.ground, axes: S.show.axes, levels: S.show.levels, grids: S.show.grids }; return p; }
function setBg(k) {
  S.bg = k; const m = { sky: ['grad', '#7FB0E8', '#F2F5F8'], white: ['solid', '#FFFFFF', '#FFFFFF'], grey: ['solid', '#23272E', '#23272E'], black: ['solid', '#0B0D10', '#0B0D10'] }[k];
  S.style.bg = { mode: m[0], top: m[1], bot: m[2] }; refreshAll();
}
function saveStyleTo(where) {
  const p = styleSnapshot(); if (!p.name.trim() || STYLES_BUILTIN.some(b => b.name === p.name)) { toast('Posa un nom propi a l’estil (els predefinits no es poden sobreescriure).'); return false; }
  if (where === 'lib') { const a = libStyles().filter(x => x.name !== p.name); a.push(p); saveLib(a); toast('Estil «' + p.name + '» desat a la biblioteca del navegador.'); }
  else { pushUndo(); const a = modelStyles(), i = a.findIndex(x => x.name === p.name); if (i >= 0) a[i] = p; else a.push(p); toast('Estil «' + p.name + '» desat al model.'); }
  renderTray(); return true;
}
function delStyle(name) { const a = modelStyles(), i = a.findIndex(x => x.name === name); if (i >= 0) { pushUndo(); a.splice(i, 1); } saveLib(libStyles().filter(x => x.name !== name)); renderTray(); }
function stylesJSON() { const seen = new Set(), out = []; for (const s of [...modelStyles(), ...libStyles()]) if (!seen.has(s.name)) { seen.add(s.name); out.push(s); } return JSON.stringify({ format: 'guaitabimup-styles', v: 1, styles: out }, null, 1); }
function importStyles(txt, toModel) {
  const o = JSON.parse(txt); if (!o || o.format !== 'guaitabimup-styles' || !Array.isArray(o.styles)) throw new Error('No és un fitxer d’estils de guaitaBIMup');
  const inc = o.styles.map(s => stylePlain(mkStyle(s))).filter(s => !STYLES_BUILTIN.some(b => b.name === s.name));
  const lib = libStyles().filter(x => !inc.some(s => s.name === x.name)); saveLib(lib.concat(inc));
  if (toModel) { const a = modelStyles(); for (const s of inc) { const i = a.findIndex(x => x.name === s.name); if (i >= 0) a[i] = s; else a.push(s); } }
  return inc.length;
}

/* ---------- sol ---------- */
function sunDir(su) {
  const [mm, dd] = String(su.date).split('-').map(Number), dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let N = dd || 1; for (let i = 0; i < (mm || 1) - 1; i++) N += dim[i];
  const R = Math.PI / 180, dec = 23.44 * R * Math.sin(2 * Math.PI * (284 + N) / 365), lat = su.lat * R, H = 15 * (su.hour - 12) * R;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)); /* des del sud, positiu a l'oest */
  let x = -Math.sin(az) * Math.cos(alt), y = -Math.cos(az) * Math.cos(alt); const z = Math.sin(alt), nr = -su.north * R;
  return { d: [x * Math.cos(nr) - y * Math.sin(nr), x * Math.sin(nr) + y * Math.cos(nr), z], alt: alt / R, az: az / R };
}

/* ---------- materials ---------- */
const matFlat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
const matFront = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
const matBack = new THREE.MeshLambertMaterial({ color: 0x5B9BD5, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
const LINE_MATS = [];
function lineMat(o) {
  const m = new THREE.LineMaterial(o); LINE_MATS.push(m);
  m.onBeforeCompile = sh => { sh.uniforms.uBias = EDGE_BIAS; sh.vertexShader = 'uniform float uBias;\n' + sh.vertexShader.replace('gl_Position = clip;', 'gl_Position = clip; gl_Position.z -= uBias * gl_Position.w;'); };
  return m;
}
const matLine = lineMat({ vertexColors: true, linewidth: 1 }), matLineP = lineMat({ vertexColors: true, linewidth: 2 });
const matLineSil = lineMat({ color: 0x1B1D21, linewidth: 2 }), matLineCut = lineMat({ color: 0x000000, linewidth: 3 });
const matLineHid = lineMat({ color: 0x9AA1AB, linewidth: 1, dashed: true, dashSize: 0.12, gapSize: 0.08, depthFunc: THREE.GreaterDepth, depthWrite: false });
const stencilBase = { colorWrite: false, depthWrite: false, depthTest: false, stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc };
const matStB = new THREE.MeshBasicMaterial({ ...stencilBase, side: THREE.BackSide, stencilFail: THREE.IncrementWrapStencilOp, stencilZFail: THREE.IncrementWrapStencilOp, stencilZPass: THREE.IncrementWrapStencilOp });
const matStF = new THREE.MeshBasicMaterial({ ...stencilBase, side: THREE.FrontSide, stencilFail: THREE.DecrementWrapStencilOp, stencilZFail: THREE.DecrementWrapStencilOp, stencilZPass: THREE.DecrementWrapStencilOp });
const matCap = new THREE.ShaderMaterial({
  clipping: true, side: THREE.DoubleSide, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
  uniforms: { c1: { value: new THREE.Color(0x2A2E35) }, c2: { value: new THREE.Color(0xffffff) }, mode: { value: 1 }, px: { value: 1 } },
  vertexShader: '#include <clipping_planes_pars_vertex>\nvoid main(){ vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mvPosition;\n#include <clipping_planes_vertex>\n}',
  fragmentShader: 'uniform vec3 c1; uniform vec3 c2; uniform float mode; uniform float px;\n#include <clipping_planes_pars_fragment>\nvoid main(){\n#include <clipping_planes_fragment>\n float s = 7.0 * px, w = 1.1 * px; float l = step(mod(gl_FragCoord.x + gl_FragCoord.y, s), w);\n if (mode > 1.5) l = max(l, step(mod(gl_FragCoord.x - gl_FragCoord.y + 4096.0, s), w));\n if (mode < 0.5) l = 1.0;\n gl_FragColor = vec4(mix(c2, c1, l), 1.0); }',
});
const gCaps = new THREE.Group(), gSil = new THREE.Group(); scene.add(gCaps, gSil);
const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: 0.45 })); shadowCatcher.position.z = -0.001; shadowCatcher.receiveShadow = true; shadowCatcher.visible = false; scene.add(shadowCatcher);
scene.add(sun.target);
if (renderer) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
let SIL = [], SILKEY = '', CAPS_ON = false, SUN_INFO = null;
const litMode = m => m === 'shaded' || m === 'mono' || m === 'xray';
function styleBgColor() { return S.style.bg.mode === 'grad' ? S.style.bg.bot : S.style.bg.top; }
function levelColor(id) { const ls = S.model.levels, i = ls.findIndex(l => l.id === id); return i < 0 ? null : LVL_PAL[i % LVL_PAL.length]; }
function tagColor(id) { return id ? LVL_PAL[(id * 7) % LVL_PAL.length] : null; }
function groupColor(g, inh) { const by = S.style.fa.by; return by === 'ifc' ? (ifcColor(g.ifc) || inh || '#5C6470') : by === 'level' ? (levelColor(g.level) || inh || '#8A9099') : by === 'tag' ? (tagColor(g.tag) || inh || '#8A9099') : null; }
function groupEdgeColor(g, inh) { const by = S.style.ed.by; const c = by === 'ifc' ? ifcColor(g.ifc) : by === 'level' ? levelColor(g.level) : null; return c || inh || null; }
function clipList() { return renderer && renderer.clippingPlanes ? renderer.clippingPlanes : []; }

/* aplica tot el que no depèn de la geometria */
function applyStyleEnv() {
  const s = S.style, vw = $('viewWrap'); vw.className = ''; vw.style.background = s.bg.mode === 'grad' ? 'linear-gradient(' + s.bg.top + ' 0%,' + s.bg.bot + ' 55%)' : s.bg.top;
  const x = s.fa.mode === 'xray'; matFace.transparent = x; matFace.opacity = x ? s.fa.op : 1; matFace.depthWrite = !x; matFace.needsUpdate = true;
  matBack.color.set(s.fa.back);
  const w = view.clientWidth || 1, h = view.clientHeight || 1; for (const m of LINE_MATS) m.resolution.set(w, h);
  lnPoolReset(); matLineSil.linewidth = lnPx(s.ln.w.B) * lnProf(); matLineSil.color.set(s.ed.color);
  matLineCut.linewidth = lnPx(s.ln.w.A); matLineCut.color.set(s.sec.lc); matLineCutB.linewidth = lnPx(s.ln.w.B); matLineCutB.color.set(s.ed.color);
  matCap.uniforms.c1.value.set(s.sec.fill === 'grey' ? lnMix(s.sec.color, s.sec.bgc, s.sec.tone) : s.sec.color); matCap.uniforms.c2.value.set(s.sec.bgc); matCap.uniforms.mode.value = s.sec.fill === 'solid' || s.sec.fill === 'grey' ? 0 : s.sec.fill === 'cross' ? 2 : 1; matCap.uniforms.px.value = renderer ? renderer.getPixelRatio() : 1;
  /* llum */
  hemi.intensity = s.sun.on ? s.sun.amb : 1.15; SUN_INFO = null;
  if (s.sun.on) {
    const sd = sunDir(s.sun), b = modelBox(), cx = V.mul(V.add(b.min, b.max), 0.5), R = Math.max(V.dist(b.min, b.max) / 2, 5) * 1.6; SUN_INFO = sd;
    const up = sd.alt > 0.5; sun.intensity = up ? s.sun.li : 0; sun.target.position.set(cx[0], cx[1], cx[2]); sun.position.set(cx[0] + sd.d[0] * R * 2, cx[1] + sd.d[1] * R * 2, cx[2] + Math.max(sd.d[2], 0.01) * R * 2);
    sun.castShadow = up && s.sun.sh; const sc = sun.shadow.camera; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 0.1; sc.far = R * 4.5; sc.updateProjectionMatrix();
    sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    shadowCatcher.material.opacity = s.sun.dark; shadowCatcher.visible = sun.castShadow && S.show.ground;
  } else { sun.intensity = 1.3; sun.position.set(30, -40, 70); sun.target.position.set(0, 0, 0); sun.castShadow = false; shadowCatcher.visible = false; }
  CAPS_ON = s.ln.vis.A && s.sec.fill !== 'none' && s.fa.mode !== 'wire' && s.fa.mode !== 'xray' && clipList().length > 0;
  SIL = []; SILKEY = ''; SOFTC = new WeakMap(); SMOC = new WeakMap(); disposeGroup(gSil); disposeGroup(gCaps); styleLegend();
}
function lineObj(pos, col, mat) {
  const g = new THREE.LineSegmentsGeometry(); g.setPositions(pos); if (col) g.setColors(col);
  const l = new THREE.LineSegments2(g, mat); if (mat.dashed) l.computeLineDistances(); return l;
}
/* arestes d'un contenidor: normals, de contorn (gruix de perfil), ocultes i candidates a silueta */
function styleEdges(c, off, edges, faces, st, path) {
  const s = S.style, mode = s.fa.mode, show = s.ed.show === 'none' && mode === 'wire' ? 'all' : s.ed.show; if (show === 'none') return null;
  const ln = s.ln, adj = new Map(), key = (a, b) => a < b ? a + '_' + b : b + '_' + a;
  for (const f of faces) for (const lp of [f.loop, ...f.holes]) for (let i = 0; i < lp.length; i++) { const k = key(lp[i], lp[(i + 1) % lp.length]); let l = adj.get(k); if (!l) adj.set(k, l = []); l.push(f.n); }
  const soft = mode === 'wire' ? new Set() : softEdges(c), prof = mode !== 'wire' && lnProf() > 1, dyn = mode !== 'wire' && (prof || show === 'crease' || soft.size > 0);
  const hidOn = s.ed.hid !== 'off' && (s.ed.hid !== 'mark' || st.thru) && ln.vis.C && mode !== 'wire' && mode !== 'xray', segs = [];
  for (const e of edges) {
    const a = K.P(c, e.a), b = K.P(c, e.b), A = [a[0] + off[0], a[1] + off[1], a[2] + off[2]], B = [b[0] + off[0], b[1] + off[1], b[2] + off[2]], n = adj.get(key(e.a, e.b)) || [];
    if (n.length === 2 && dyn) SIL.push(A, B, n[0], n[1]);
    if (soft.has(e.id)) continue;
    if (show === 'crease' && n.length === 2 && V.dot(n[0], n[1]) > 0.9) continue;
    segs.push({ a: A, b: B, isP: n.length === 1 && prof, c, ed: e, off, path });
  }
  _c.set(st.ecol || s.ed.color); LN_CONT.push({ segs, base: [_c.r, _c.g, _c.b], hidOn, path });
  return adj;
}
/* tapes de secció: comptatge amb stencil dels sòlids tancats */
function styleCaps(geo, faces, adj, path) {
  if (!CAPS_ON || (path && !lnFlags(path).cut) || faces.length < 4 || !adj) return; for (const l of adj.values()) if (l.length !== 2) return;
  const p = geo.attributes.position.array; let vol = 0;
  /* només els sòlids que travessen un pla de tall real (no el pla inferior d’una planta) generen farcit: un forjat sota el nivell compta zero i no s’ha de ratllar */
  { const cps = clipList().filter(q => !q.floor); let cross = !cps.length; for (const q of cps) { let lo = Infinity, hi = -Infinity; for (let i = 0; i < p.length; i += 3) { const d = q.normal.x * p[i] + q.normal.y * p[i + 1] + q.normal.z * p[i + 2] + q.constant; if (d < lo) lo = d; if (d > hi) hi = d; } if (lo < 0 && hi > 0) { cross = true; break; } } if (!cross) return; }
  for (let i = 0; i < p.length; i += 9) vol += p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7]) - p[i + 1] * (p[i + 3] * p[i + 8] - p[i + 5] * p[i + 6]) + p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6]);
  const mb = new THREE.Mesh(geo, vol < 0 ? matStF : matStB), mf = new THREE.Mesh(geo, vol < 0 ? matStB : matStF); mb.renderOrder = mf.renderOrder = 2; mb.userData.st = mf.userData.st = 1; gCaps.add(mb, mf);
}
function styleCapPlanes() {
  const pls = clipList(); if (!pls.length || S.style.fa.mode === 'wire') return;
  /* línia de tall: A per als elements que tallen (amb unió i retall entre cossos), B per als que no tallen */
  const cl = lnCutLines(pls);
  if (cl.A.length && S.style.ln.vis.A) { const l = lineObj(cl.A, null, matLineCut); l.renderOrder = 4; gCaps.add(l); }
  if (cl.B.length && S.style.ln.vis.B) { const l = lineObj(cl.B, null, matLineCutB); l.renderOrder = 4; gCaps.add(l); }
  if (!CAPS_ON || !gCaps.children.some(o => o.userData.st)) return;
  const b = modelBox(), cx = new THREE.Vector3(...V.mul(V.add(b.min, b.max), 0.5)), R = Math.max(V.dist(b.min, b.max), 10) * 2; let last = null;
  for (const pl of pls) {
    if (pl.floor) continue;
    const q = new THREE.Mesh(new THREE.PlaneGeometry(R, R), matCap), o = pl.projectPoint(cx, new THREE.Vector3()).addScaledVector(pl.normal, 0.0004);
    q.position.copy(o); q.lookAt(o.clone().add(pl.normal)); q.renderOrder = 3; q.userData.cap = 1; gCaps.add(q); last = q;
  }
  if (last) last.onAfterRender = r => r.clearStencil();
}
/* siluetes: depenen de la càmera, es recalculen quan canvia */
function updSil() {
  if (!S.style.ln.vis.B) { if (gSil.children.length) disposeGroup(gSil); return; }
  if (!SIL.length) { if (gSil.children.length) disposeGroup(gSil); return; }
  const k = cam.matrixWorld.elements.join(',') + '|' + cam.projectionMatrix.elements.join(','); if (k === SILKEY) return; SILKEY = k; disposeGroup(gSil);
  if (SIL.length > 4 * 80000) return;
  const persp = cam.isPerspectiveCamera, cp = cam.position; let od = null;
  if (!persp) { const a = new THREE.Vector3(0, 0, -1).unproject(cam), b = new THREE.Vector3(0, 0, 1).unproject(cam); od = [b.x - a.x, b.y - a.y, b.z - a.z]; }
  const pos = [];
  for (let i = 0; i < SIL.length; i += 4) {
    const A = SIL[i], B = SIL[i + 1], n1 = SIL[i + 2], n2 = SIL[i + 3];
    const d = persp ? [(A[0] + B[0]) / 2 - cp.x, (A[1] + B[1]) / 2 - cp.y, (A[2] + B[2]) / 2 - cp.z] : od;
    if (V.dot(n1, d) * V.dot(n2, d) < 0) pos.push(A[0], A[1], A[2], B[0], B[1], B[2]);
  }
  if (pos.length) gSil.add(lineObj(pos, null, matLineSil));
}
function styleLegend() {
  let d = $('styLegend'); if (!d) { d = el('div'); d.id = 'styLegend'; $('viewWrap').appendChild(d); }
  const by = S.style.fa.by, m = S.style.fa.mode, rows = [];
  if (m !== 'wire' && m !== 'hidden' && m !== 'mono') {
    if (by === 'ifc') { const used = new Set(); eachContainer(S.model.root, [0, 0, 0], c => { if (c.ifc) used.add(c.ifc); }); for (const r of IFC) if (used.has(r[0])) rows.push([r[2], r[1]]); }
    else if (by === 'level') S.model.levels.slice().reverse().forEach(l => rows.push([levelColor(l.id), l.name]));
    else if (by === 'tag') S.model.tags.forEach(t => { if (t.id) rows.push([tagColor(t.id), t.name]); });
    else if (by === 'side') rows.push([S.style.fa.front, 'Anvers'], [S.style.fa.back, 'Revers']);
  }
  if (SUN_INFO) rows.push([null, 'Sol: altura ' + SUN_INFO.alt.toFixed(1) + '° · azimut ' + ((SUN_INFO.az + 180 + 360) % 360).toFixed(0) + '°' + (SUN_INFO.alt <= 0.5 ? ' (sota l’horitzó)' : '')]);
  d.style.display = rows.length ? 'block' : 'none'; d.innerHTML = rows.map(([c, l]) => '<div>' + (c ? '<i style="background:' + c + '"></i>' : '') + esc(l) + '</div>').join('');
}

/* ---------- panell ---------- */
const STYLE_UI = [
  ['Arestes', [['ed.show', 'Visibles', [['all', 'Totes'], ['crease', 'Contorn i plecs'], ['none', 'Cap']]], ['ed.color', 'Color', 'c'],
    ['ed.by', 'Color per', [['fix', 'Color únic'], ['ifc', 'Classe IFC'], ['level', 'Nivell']]], ['ed.soft', 'Suavitza arestes per sota de (°)', 0, 90, 1], ['ed.sm', 'Ombreig suau', 'b'], ['ed.hid', 'Ocultes (C)', [['off', 'Cap'], ['mark', 'Només elements marcats'], ['dash', 'Totes a traços'], ['grey', 'Totes contínues grises']]]]],
  ['Cares', [['fa.mode', 'Mode', [['shaded', 'Ombrejat'], ['flat', 'Color pla'], ['mono', 'Monocrom'], ['hidden', 'Línies ocultes'], ['xray', 'Raigs X'], ['wire', 'Filferro']]],
    ['fa.by', 'Color per', [['mat', 'Material'], ['ifc', 'Classe IFC'], ['level', 'Nivell'], ['tag', 'Etiqueta'], ['side', 'Anvers / revers']]], ['fa.op', 'Opacitat raigs X', 0.1, 0.9, 0.05], ['fa.mono', 'Color monocrom', 'c'], ['fa.front', 'Anvers', 'c'], ['fa.back', 'Revers', 'c']]],
  ['Secció', [['sec.fill', 'Farciment del tall', [['grey', 'Gris'], ['hatch', 'Ratllat 45°'], ['cross', 'Ratllat creuat'], ['solid', 'Sòlid'], ['none', 'Cap']]], ['sec.tone', 'To del gris', 0.05, 1, 0.05], ['sec.color', 'Color', 'c'], ['sec.bgc', 'Fons del ratllat', 'c'], ['sec.lc', 'Color de la línia de tall', 'c']]],
  ['Fons', [['bg.mode', 'Tipus', [['grad', 'Degradat'], ['solid', 'Color únic']]], ['bg.top', 'Color / cel', 'c'], ['bg.bot', 'Horitzó', 'c']]],
  ['Sol i ombres', [['sun.on', 'Sol per data i hora', 'b'], ['sun.sh', 'Ombres projectades', 'b'], ['sun.date', 'Data', 'd'], ['sun.hour', 'Hora solar', 0, 24, 0.25], ['sun.lat', 'Latitud (°)', -66, 66, 0.1], ['sun.north', 'Nord del projecte (°)', -180, 180, 1],
    ['sun.li', 'Intensitat del sol', 0, 3, 0.1], ['sun.amb', 'Llum ambient', 0, 3, 0.05], ['sun.dark', 'Foscor de l’ombra a terra', 0, 1, 0.05]]],
];
function stylesPanel(b) {
  const s = S.style, lib = libStyles(), mod = modelStyles(), opt = (a, pre) => a.map((x, i) => '<option value="' + pre + i + '"' + (x.name === s.name ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('');
  const top = el('div', '', '<select id="stySel" style="width:100%"><optgroup label="Predefinits">' + opt(STYLES_BUILTIN, 'b') + '</optgroup>' + (mod.length ? '<optgroup label="Del model">' + opt(mod, 'm') + '</optgroup>' : '') + (lib.length ? '<optgroup label="Biblioteca del navegador">' + opt(lib, 'l') + '</optgroup>' : '') + '</select>'
    + '<div class="kv" style="margin:6px 0"><span>Nom</span><span><input type="text" id="styName" value="' + esc(s.name) + '"></span></div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px"><button class="btn sm" id="stySaveM" title="Desa l’estil actual dins del model">Desa al model</button><button class="btn sm" id="stySaveL" title="Desa l’estil actual a la biblioteca compartida del navegador">A la biblioteca</button><button class="btn sm" id="styDel">Esborra</button><button class="btn sm" id="styExp">Exporta…</button><button class="btn sm" id="styImp">Importa…</button></div>');
  b.appendChild(top);
  const get = p => { const [g, k] = p.split('.'); return s[g][k]; }, set = (p, v) => { const [g, k] = p.split('.'); s[g][k] = v; refreshAll(); };
  for (const [sec, rows] of STYLE_UI) {
    b.appendChild(el('div', 'row hd', esc(sec)));
    for (const [p, lab, a, mx, stp] of rows) {
      const r = el('div', 'kv'); r.style.margin = '3px 0'; r.appendChild(el('span', '', esc(lab))); const v = get(p); let i;
      if (Array.isArray(a)) { i = el('select', '', a.map(([k, l]) => '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(l) + '</option>').join('')); i.onchange = () => set(p, i.value); }
      else if (a === 'c') { i = el('input'); i.type = 'color'; i.value = v; i.onchange = () => set(p, i.value); }
      else if (a === 'b') { i = el('input'); i.type = 'checkbox'; i.checked = !!v; i.onchange = () => set(p, i.checked); }
      else if (a === 'd') { i = el('input'); i.type = 'date'; i.value = '2026-' + v; i.onchange = () => { if (i.value) set(p, i.value.slice(5)); }; }
      else { i = el('input'); i.type = 'number'; i.min = a; i.max = mx; i.step = stp; i.value = v; i.style.width = '70px'; i.onchange = () => { const n = parseFloat(i.value); if (isFinite(n)) set(p, Math.min(mx, Math.max(a, n))); }; }
      i.dataset.sty = p; const w = el('span'); w.appendChild(i); r.appendChild(w); b.appendChild(r);
    }
  }
  const q = id => b.querySelector('#' + id);
  q('stySel').onchange = e => { const v = e.target.value, a = v[0] === 'b' ? STYLES_BUILTIN : v[0] === 'm' ? mod : lib; useStyle(a[+v.slice(1)]); };
  q('styName').onchange = e => { s.name = e.target.value.trim() || s.name; };
  q('stySaveM').onclick = () => saveStyleTo('model'); q('stySaveL').onclick = () => saveStyleTo('lib');
  q('styDel').onclick = () => { if (STYLES_BUILTIN.some(x => x.name === s.name)) { toast('Els estils predefinits no es poden esborrar.'); return; } delStyle(s.name); toast('Estil esborrat del model i de la biblioteca.'); };
  q('styExp').onclick = () => outDlg('Exporta estils (JSON)', 'estils.gbstyle.json', stylesJSON(), 'application/json');
  q('styImp').onclick = () => { const f = el('input'); f.type = 'file'; f.accept = '.json,application/json'; f.onchange = () => { const rd = new FileReader(); rd.onload = () => { try { const n = importStyles(rd.result, true); renderTray(); toast(n + ' estils importats al model i a la biblioteca.'); } catch (e) { toast('No s’ha pogut importar: ' + e.message); } }; if (f.files[0]) rd.readAsText(f.files[0]); }; f.click(); };
}
/* ============================================================
   v0.57 · arestes suaus i ombreig suau
   · una aresta és suau si les dues cares que la comparteixen formen un angle (no nul) menor que ed.soft (20° per defecte)
   · les arestes coplanàries no es tracten: són divisions volgudes · marques manuals: e.sf = 1 suau, 2 dura
   · les suaus no es dibuixen (visor, exportacions, plànols) ni s'hi enganxa el cursor; el contorn surt com a silueta
   · ombreig suau: normals per vèrtex fent la mitjana de les cares veïnes dins del mateix angle
   ============================================================ */
let SOFTC = new WeakMap(), SMOC = new WeakMap();
function softAng() { const a = +((S.style && S.style.ed && S.style.ed.soft)); return isFinite(a) ? Math.max(0, Math.min(90, a)) : 20; }
function softEdges(c) {
  let r = SOFTC.get(c); if (r) return r; r = new Set(); const A = softAng(), cs = Math.cos(A * Math.PI / 180), adj = new Map(), key = (a, b) => a < b ? a + '_' + b : b + '_' + a;
  let man = false; for (const e of c.edges.values()) if (e.sf) { man = true; break; }
  if (A > 0 || man) {
    if (A > 0) for (const f of c.faces.values()) for (const lp of [f.loop, ...f.holes]) for (let i = 0; i < lp.length; i++) { const k = key(lp[i], lp[(i + 1) % lp.length]); let l = adj.get(k); if (!l) adj.set(k, l = []); l.push(f.n); }
    for (const e of c.edges.values()) {
      if (e.sf === 1) { r.add(e.id); continue; } if (e.sf === 2 || A <= 0) continue;
      const n = adj.get(key(e.a, e.b)); if (n && n.length === 2) { const d = V.dot(n[0], n[1]); if (d < 1 - 1e-7 && d > cs) r.add(e.id); }
    }
  }
  SOFTC.set(c, r); return r;
}
function smoothN(c, f, vid) {
  if (!S.style.ed.sm || softAng() <= 0) return f.n;
  let m = SMOC.get(c); if (!m) { m = new Map(); for (const g of c.faces.values()) for (const lp of [g.loop, ...g.holes]) for (const v of lp) { let l = m.get(v); if (!l) m.set(v, l = []); if (!l.includes(g)) l.push(g); } SMOC.set(c, m); }
  const l = m.get(vid); if (!l || l.length < 2) return f.n; const cs = Math.cos(softAng() * Math.PI / 180); let x = 0, y = 0, z = 0, k = 0;
  for (const g of l) { const d = V.dot(g.n, f.n); if (g === f || (d > cs && d < 1 - 1e-7) || d >= 1 - 1e-7) { x += g.n[0]; y += g.n[1]; z += g.n[2]; k++; } }
  if (k < 2) return f.n; const L = Math.hypot(x, y, z) || 1; return [x / L, y / L, z / L];
}
/* marques manuals sobre la selecció (arestes, o totes les dels grups seleccionats) */
function edgeSoftSet(v) {
  const { c } = ctxInfo(), ids = [...S.sel.edges].filter(id => c.edges.has(id)), gs = [...S.sel.groups].map(id => c.groups.get(id)).filter(Boolean);
  if (!ids.length && !gs.length) { toast('Selecciona primer arestes o grups.'); return; }
  pushUndo(v === 1 ? 'Suavitza arestes' : v === 2 ? 'Endureix arestes' : 'Arestes per angle'); let n = 0;
  const put = e => { if (v) e.sf = v; else delete e.sf; n++; };
  for (const id of ids) put(c.edges.get(id));
  (function walk(list) { for (const g of list) { for (const e of g.edges.values()) put(e); walk([...g.groups.values()]); } })(gs);
  refreshAll(); toast(n + ' aresta(es) ' + (v === 1 ? 'suaus' : v === 2 ? 'dures' : 'segons l’angle de l’estil (' + softAng() + '°)'));
}
