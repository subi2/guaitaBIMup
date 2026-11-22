/* ============================================================
   v0.52 · càmera cònica professional
   · lent física: focal equivalent de pas universal (36×24 mm), referida a l’amplada de 36 mm;
     correcció de verticals (2 punts) amb descentrament, desplaçament vertical, retall proper
   · guies de fotograma (3:2, 16:9, 4:3, A), terços i horitzó al visor
   · eines «Posiciona càmera» (ulls a l’alçada indicada) i «Mira al voltant» (gira des de l’ull, fletxes per caminar)
   · la càmera viu a meta.ccam {eye, tgt, lens}: es dibuixa al model amb nanses (posició, mira, obertura)
   · finestra «Càmera cònica» (panell acoblable o flotant)
   ============================================================ */
var CAMV = null;
const CAM_COL = 0x4C6EF5, LENS_PRE = [14, 18, 24, 28, 35, 50, 85, 135], F_MIN = 8, F_MAX = 600;
const camClampF = f => Math.max(F_MIN, Math.min(F_MAX, f));
const f1 = x => (+x).toLocaleString('ca-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const camRad = d => d * Math.PI / 180, camDeg = r => r * 180 / Math.PI;
function camLive() { const e = CAM.target.clone().addScaledVector(camDir(), CAM.dist); return { eye: e.toArray(), tgt: CAM.target.toArray(), lens: { ...CAM.lens } }; }
function camRec() { if (CAM.proj === 'conic') return camLive(); const c = S.model.meta.ccam; return c ? { eye: c.eye.slice(), tgt: c.tgt.slice(), lens: { ...LENS_DEF, ...c.lens } } : camLive(); }
function camFromRec(c) {
  const d = V.sub(c.eye, c.tgt), r = Math.max(V.len(d), 0.05), hz = Math.hypot(d[0], d[1]);
  return { t: c.tgt.slice(), dist: r, theta: hz > 1e-9 ? Math.atan2(d[1], d[0]) : CAM.theta, phi: Math.acos(Math.max(-1, Math.min(1, d[2] / r))), proj: 'conic', lens: { ...LENS_DEF, ...(c.lens || {}) } };
}
/* la vista cònica activa és la càmera: cada canvi es desa a meta.ccam */
function camSync() { if (CAM.proj !== 'conic' || typeof S === 'undefined' || !S.model) return; S.model.meta.ccam = camLive(); }
function camSet(r) {
  r = { eye: r.eye.slice(), tgt: r.tgt.slice(), lens: { ...LENS_DEF, ...r.lens } }; r.lens.f = camClampF(r.lens.f);
  /* «Mantén la mida» (dolly zoom): en canviar la focal, la càmera s'allunya o s'acosta proporcionalment sobre l'eix de visió; el punt de mira i la seva mida a pantalla no canvien, només les fugues */
  { const o = camRec(); if (r.lens.keep && o.lens.f > 0 && Math.abs(o.lens.f - r.lens.f) > 1e-9 && V.dist(o.eye, r.eye) < 1e-9 && V.dist(o.tgt, r.tgt) < 1e-9) { const k = r.lens.f / o.lens.f, d = V.sub(r.eye, r.tgt); r.eye = V.add(r.tgt, V.mul(d, k)); } } if (V.dist(r.eye, r.tgt) < 0.05) return false;
  S.model.meta.ccam = r; S.dirty = true;
  if (CAM.proj === 'conic') { const s = camFromRec(r); camAnim = null; CAM.target.set(s.t[0], s.t[1], s.t[2]); CAM.dist = s.dist; CAM.theta = s.theta; CAM.phi = s.phi; CAM.lens = s.lens; updCam(); }
  if (CAMV) CAMV.key = ''; needRender = true; return true;
}
function camLensSet(patch) { const r = camRec(); r.lens = { ...r.lens, ...patch }; camSet(r); }
function camGo() { const c = S.model.meta.ccam || camRec(); pushHist(); animateCam(camFromRec(c)); syncUI(); }
/* proporció del fotograma que defineix els angles V i D */
function camAr(L) { const ar = FRAME_AR[L.frame]; if (ar) return ar; return CAM.proj === 'conic' ? (view.clientWidth || 1) / (view.clientHeight || 1) : 1.5; }
function camAngles(L) { const tH = 18 / L.f, ar = camAr(L), tV = tH / ar; return { h: camDeg(2 * Math.atan(tH)), v: camDeg(2 * Math.atan(tV)), d: camDeg(2 * Math.atan(Math.hypot(tH, tV))) }; }
function camFfromAngle(kind, deg) { const t = Math.tan(camRad(Math.max(1, Math.min(170, deg))) / 2), ar = camAr(camRec().lens); const tH = kind === 'h' ? t : kind === 'v' ? t * ar : t / Math.hypot(1, 1 / ar); return camClampF(18 / tH); }
/* geometria de la càmera en coordenades del model (mateixa lògica que el visor i els plànols) */
function camGeom(r) {
  const L = { ...LENS_DEF, ...r.lens }, d = V.sub(r.tgt, r.eye), dist = V.len(d) || 1, f0 = V.mul(d, 1 / dist), hz = Math.hypot(f0[0], f0[1]), v2 = L.v2 && hz > 0.12;
  const fwd = v2 ? [f0[0] / hz, f0[1] / hz, 0] : f0, dT = v2 ? dist * hz : dist;
  let u = V.cross(fwd, [0, 0, 1]); u = V.len(u) < 1e-6 ? [1, 0, 0] : V.norm(u); const v = V.cross(u, fwd);
  const ar = FRAME_AR[L.frame] || 1.5, hH = dT * 18 / L.f, hV = hH / ar, sy = (v2 ? r.tgt[2] - r.eye[2] : 0) + (L.shift || 0) * 2 * hV;
  const C = V.add(V.add(r.eye, V.mul(fwd, dT)), V.mul(v, sy)), cr = (a, b) => V.add(V.add(C, V.mul(u, a * hH)), V.mul(v, b * hV));
  return { L, eye: r.eye, tgt: r.tgt, fwd, u, v, C, hH, hV, dT, corners: [cr(-1, -1), cr(1, -1), cr(1, 1), cr(-1, 1)], side: V.add(C, V.mul(u, hH)) };
}
/* ---------- glif al model ---------- */
function camGlyphAdd(g, r, col, op) {
  const G = camGeom(r), m = new THREE.LineBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: op }), P = [], seg = (a, b) => P.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  for (const c of G.corners) seg(G.eye, c); for (let i = 0; i < 4; i++) seg(G.corners[i], G.corners[(i + 1) % 4]);
  const s = Math.max(0.12, Math.min(0.5, G.dT * 0.04)), q = (a, b, c2) => V.add(V.add(V.add(G.eye, V.mul(G.fwd, a)), V.mul(G.u, b)), V.mul(G.v, c2));
  const bk = [q(-s * 2.2, -s, -s * 0.7), q(-s * 2.2, s, -s * 0.7), q(-s * 2.2, s, s * 0.7), q(-s * 2.2, -s, s * 0.7)], fr = [q(-s * 0.6, -s, -s * 0.7), q(-s * 0.6, s, -s * 0.7), q(-s * 0.6, s, s * 0.7), q(-s * 0.6, -s, s * 0.7)];
  for (let i = 0; i < 4; i++) { seg(bk[i], bk[(i + 1) % 4]); seg(fr[i], fr[(i + 1) % 4]); seg(bk[i], fr[i]); seg(fr[i], G.eye); }
  const k = s * 0.8; seg(V.add(G.tgt, [-k, 0, 0]), V.add(G.tgt, [k, 0, 0])); seg(V.add(G.tgt, [0, -k, 0]), V.add(G.tgt, [0, k, 0])); seg(V.add(G.tgt, [0, 0, -k]), V.add(G.tgt, [0, 0, k]));
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); const ls = new THREE.LineSegments(geo, m); ls.renderOrder = 9; g.add(ls);
  const dl = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...G.eye), new THREE.Vector3(...G.tgt)]), new THREE.LineDashedMaterial({ color: col, dashSize: s, gapSize: s * 0.7, depthTest: false, transparent: true, opacity: op })); dl.computeLineDistances(); dl.renderOrder = 9; g.add(dl);
  const tg = new THREE.BufferGeometry(), T = []; for (let i = 0; i < 4; i++) T.push(...G.eye, ...G.corners[i], ...G.corners[(i + 1) % 4]); tg.setAttribute('position', new THREE.Float32BufferAttribute(T, 3));
  const fm = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op * 0.09, side: THREE.DoubleSide, depthWrite: false, depthTest: false })); fm.renderOrder = 8; g.add(fm);
  return G;
}
function camGlyphSync() {
  if (!CAMV) return;
  const c = S.model.meta.ccam, show = S.show.cam !== false && CAM.proj !== 'conic' && !!c;
  const scn = S.show.cam !== false ? S.model.views.filter(v => v.cam && v.cam.proj === 'conic' && 'scene:' + v.id !== S.view).map(v => { const s = Math.sin(v.cam.phi), d = [s * Math.cos(v.cam.theta), s * Math.sin(v.cam.theta), Math.cos(v.cam.phi)]; return { eye: V.add(v.cam.t, V.mul(d, v.cam.dist)), tgt: v.cam.t, lens: v.cam.lens || {} }; }) : [];
  const vw = CAM.proj === 'conic' ? [view.clientWidth, view.clientHeight] : 0, key = JSON.stringify([show, c, scn, CAM.proj, vw]);
  if (key === CAMV.key) return; CAMV.key = key; disposeGroup(CAMV.g); CAMV.geo = null;
  if (CAM.proj !== 'conic') for (const r of scn) if (!c || V.dist(r.eye, c.eye) > 1e-6 || V.dist(r.tgt, c.tgt) > 1e-6) camGlyphAdd(CAMV.g, r, 0x8B939F, 0.55);
  if (show) CAMV.geo = camGlyphAdd(CAMV.g, c, CAM_COL, 1);
  camGripsBuild(); camPanelSync();
}
/* passada pròpia sense plans de retall: la càmera es veu també en plantes i seccions */
function camRenderPass() { if (!CAMV || !CAMV.g.children.length || !renderer) return; const cp = renderer.clippingPlanes, ac = renderer.autoClear; renderer.clippingPlanes = []; renderer.autoClear = false; renderer.render(CAMV.sc, cam); renderer.clippingPlanes = cp; renderer.autoClear = ac; }
/* ---------- nanses de la càmera (posició, mira, obertura) ---------- */
function camGripsBuild() {
  let box = $('camGrips'); if (!box) { box = el('div'); box.id = 'camGrips'; $('viewWrap').appendChild(box); }
  box.innerHTML = ''; if (!CAMV.geo) return;
  const G = CAMV.geo, defs = [['eye', 'Posició de la càmera · arrossega (en planta, horitzontal; en alçat, també l’alçada)', G.eye], ['tgt', 'Punt de mira · arrossega; s’enganxa als vèrtexs i arestes (Ctrl: cota del punt tocat)', G.tgt], ['fov', 'Obertura de la lent · arrossega per canviar la focal', G.side]];
  for (const [k, t, p] of defs) {
    const e = el('div', 'cgrip cg-' + k); e.dataset.cg = k; e.title = t; e.setAttribute('aria-label', t);
    if (k === 'eye') e.appendChild(el('span', 'cg-lb', Math.round(G.L.f) + ' mm'));
    e.onpointerdown = ev => camGripDown(ev, k); box.appendChild(e);
  }
  camGripsPos();
}
function camGripsPos() {
  const box = $('camGrips'); if (!box || !CAMV || !CAMV.geo) return; const G = CAMV.geo, P = { eye: G.eye, tgt: G.tgt, fov: G.side };
  for (const e of box.children) { const s = toScreen(P[e.dataset.cg]), vis = s.z > -1 && s.z < 1; e.style.display = vis ? '' : 'none'; if (vis) { e.style.left = s.x + 'px'; e.style.top = s.y + 'px'; } }
}
function camScreenPlane(mx, my, o) { const n = new THREE.Vector3(); cam.getWorldDirection(n); return rayPlane(mouseRay(mx, my), o, [n.x, n.y, n.z]); }
function camGripDown(ev, k) {
  if (T === TOOLS.camorb && k !== 'fov') { /* v0.57: amb l'eina Òrbita, la nansa tria què orbita i l'arrossegament és esfèric */
    camOrbSel(k); ev.stopPropagation(); ev.preventDefault(); pushHist(); let x0 = ev.clientX, y0 = ev.clientY;
    const mv = me => { camOrbDrag(me.clientX - x0, me.clientY - y0); x0 = me.clientX; y0 = me.clientY; const rc = $('viewWrap').getBoundingClientRect(); camOrbTip(me.clientX - rc.left, me.clientY - rc.top); };
    const fi = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', fi); $('tip').style.display = 'none'; };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', fi); return;
  }
  ev.stopPropagation(); ev.preventDefault(); const e = ev.currentTarget; e.classList.add('drag'); try { e.setPointerCapture(ev.pointerId); } catch (x) { /* */ }
  const move = me => {
    const rc = $('viewWrap').getBoundingClientRect(), mx = me.clientX - rc.left, my = me.clientY - rc.top, r = camRec(), G = camGeom(r);
    if (k === 'eye') { const p = camScreenPlane(mx, my, r.eye); if (p) { r.eye = p; camSet(r); } }
    else if (k === 'tgt') { const pk = pick(mx, my), real = ['end', 'mid', 'origin', 'edge'].includes(pk.kind); let p = real ? pk.p.slice() : camScreenPlane(mx, my, r.tgt); if (p && !real && !me.ctrlKey) p[2] = r.tgt[2]; if (p && me.ctrlKey && pk) p = pk.p.slice(); if (p) { r.tgt = p; camSet(r); } showTip(mx, my, real ? pk : null); }
    else { const p = camScreenPlane(mx, my, G.side); if (p) { const w = V.sub(p, G.eye), a = V.dot(w, G.fwd), b = Math.abs(V.dot(w, G.u)); if (a > 1e-3 && b > 1e-4) { r.lens.f = camClampF(18 * a / b); camSet(r); showTip(mx, my, { label: Math.round(r.lens.f) + ' mm', col: '#4C6EF5' }, f1(camAngles(r.lens).h) + '° H'); } } }
  };
  const up = () => { e.classList.remove('drag'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); $('tip').style.display = 'none'; snapDot(null); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
/* ---------- guies al visor: fotograma, terços, horitzó i lectura de la lent ---------- */
function camOverlay() {
  camGripsPos(); let ov = $('camOv');
  if (CAM.proj !== 'conic') { if (ov) ov.style.display = 'none'; return; }
  if (!ov) { ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ov.id = 'camOv'; $('viewWrap').appendChild(ov); }
  const w = view.clientWidth || 1, h = view.clientHeight || 1, L = CAM.lens, fr = camFrame(w, h), A = camAngles(L); ov.style.display = ''; ov.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  let s = '';
  if (L.frame !== 'none') s += '<path class="co-mask" fill-rule="evenodd" d="M0 0H' + w + 'V' + h + 'H0Z M' + fr.x + ' ' + fr.y + 'h' + fr.w + 'v' + fr.h + 'h' + (-fr.w) + 'Z"/><rect class="co-fr" x="' + fr.x + '" y="' + fr.y + '" width="' + fr.w + '" height="' + fr.h + '"/>';
  if (L.thirds) for (const k of [1, 2]) s += '<line class="co-th" x1="' + (fr.x + fr.w * k / 3) + '" y1="' + fr.y + '" x2="' + (fr.x + fr.w * k / 3) + '" y2="' + (fr.y + fr.h) + '"/><line class="co-th" x1="' + fr.x + '" y1="' + (fr.y + fr.h * k / 3) + '" x2="' + (fr.x + fr.w) + '" y2="' + (fr.y + fr.h * k / 3) + '"/>';
  if (L.hor) { const p = camP.position, d = camDir(), fh = Math.hypot(d.x, d.y); if (fh > 1e-3) { const D = camP.far * 0.5, q = toScreen([p.x - d.x / fh * D, p.y - d.y / fh * D, p.z]); if (q.z < 1 && q.y > fr.y && q.y < fr.y + fr.h) s += '<line class="co-hz" x1="' + fr.x + '" y1="' + q.y + '" x2="' + (fr.x + fr.w) + '" y2="' + q.y + '"/><text class="co-ht" x="' + (fr.x + 8) + '" y="' + (q.y - 5) + '">Horitzó · ulls a ' + fmt(p.z - workZ(), 2) + ' m</text>'; } }
  s += vpSvg(vpGeom());
  s += '<text class="co-hud" x="' + (fr.x + fr.w - 10) + '" y="' + (fr.y + fr.h - 12) + '" text-anchor="end">' + Math.round(L.f) + ' mm  ·  ' + f1(A.h) + '° H' + (L.v2 ? '  ·  verticals' : '') + '</text>';
  ov.innerHTML = s;
}
/* ---------- eines ---------- */
function camTgtOf(pk, ev, eye) { if ((ev && (ev.ctrlKey || ev.metaKey)) || ['end', 'mid', 'origin', 'edge'].includes(pk.kind)) return pk.p.slice(); return [pk.p[0], pk.p[1], eye[2]]; }
function camPrevFan(r) { const G = camGeom(r); for (const c of G.corners) prevLine([G.eye, c], CAM_COL); prevLine(G.corners, CAM_COL, true); prevLine([G.eye, G.tgt], CAM_COL); }
function camPlace(r) {
  S.model.meta.ccam = { eye: r.eye.slice(), tgt: r.tgt.slice(), lens: { ...LENS_DEF, ...r.lens } }; S.dirty = true; if (CAMV) CAMV.key = '';
  if (CAM.proj !== 'conic') setProj('conic'); else { pushHist(); animateCam(camFromRec(r)); }
  setTool('camlook'); toast('Càmera situada. Arrossega per mirar al voltant; ↑↓ camina, ←→ gira, RePàg/AvPàg alçada.');
}
function camLook(dth, dph) {
  const eye = camLive().eye; camAnim = null; CAM.theta -= dth; CAM.phi = Math.max(0.02, Math.min(Math.PI - 0.02, CAM.phi - dph));
  const d = camDir(); CAM.target.set(eye[0] - d.x * CAM.dist, eye[1] - d.y * CAM.dist, eye[2] - d.z * CAM.dist); updCam();
}
function camWalk(dist, dz) { const d = camDir(), h = Math.hypot(d.x, d.y) || 1; camAnim = null; CAM.target.x -= d.x / h * dist; CAM.target.y -= d.y / h * dist; CAM.target.z += dz || 0; updCam(); }
function camVcb(txt) {
  const t = String(txt).trim().replace(',', '.').toLowerCase(); let m;
  if ((m = t.match(/^([\d.]+)\s*mm$/))) { camLensSet({ f: +m[1] }); toast('Focal ' + Math.round(camRec().lens.f) + ' mm'); return true; }
  if ((m = t.match(/^([\d.]+)\s*(°|º|deg|graus)$/))) { camLensSet({ f: camFfromAngle('h', +m[1]) }); toast('Angle horitzontal ' + f1(camAngles(camRec().lens).h) + '°'); return true; }
  if ((m = t.match(/^h?\s*(-?[\d.]+)\s*m?$/)) && isFinite(+m[1])) {
    const h = +m[1]; if (T === TOOLS.campos && !st.eye) { CAM.lens.eye = h; if (S.model.meta.ccam) S.model.meta.ccam.lens.eye = h; toast('Alçada dels ulls ' + fmt(h, 2) + ' m'); return true; }
    const r = camRec(), dz = workZ() + h - r.eye[2]; r.eye[2] += dz; r.tgt[2] += dz; r.lens.eye = h; camSet(r); toast('Ulls a ' + fmt(h, 2) + ' m sobre el nivell'); return true;
  }
  toast('Escriu una focal (35mm), un angle horitzontal (60°) o una alçada d’ulls (h1.6).'); return false;
}
TOOLS.campos = {
  move(ev, mx, my) {
    const pk = pick(mx, my), L = camRec().lens; clearPrev();
    if (!st.eye) showTip(mx, my, pk, 'Càmera · clic a la posició · ulls a ' + fmt(L.eye, 2) + ' m');
    else { const t = camTgtOf(pk, ev, st.eye); if (V.dist(st.eye, t) > 0.05) camPrevFan({ eye: st.eye, tgt: t, lens: L }); showTip(mx, my, pk, 'Punt de mira · ' + fmtM(V.dist(st.eye, t)) + ' · clic'); }
  },
  down(ev, mx, my) {
    const pk = pick(mx, my), L = camRec().lens;
    if (!st.eye) { st.eye = [pk.p[0], pk.p[1], pk.p[2] + L.eye]; return; }
    const t = camTgtOf(pk, ev, st.eye); if (V.dist(st.eye, t) < 0.1) return; const r = { eye: st.eye, tgt: t, lens: L }; delete st.eye; clearPrev(); camPlace(r);
  },
  vcb: camVcb,
  hintExtra: 'Clic a la posició (els ulls queden a l’alçada indicada sobre el punt) i clic al punt de mira. Escriu 35mm, 60° o h1.6.',
};
TOOLS.camlook = {
  onSet() { if (CAM.proj !== 'conic') setProj('conic'); },
  down(ev, mx, my) { st.drag = { x: mx, y: my }; pushHist(); },
  move(ev, mx, my) { if (!st.drag || !(ev.buttons & 1)) { st.drag = null; return; } const k = OPT.orbit * 0.6; camLook((mx - st.drag.x) * k, (my - st.drag.y) * k); st.drag = { x: mx, y: my }; },
  up() { st.drag = null; },
  key(ev) {
    const step = ev.shiftKey ? 2 : 0.5, a = camRad(ev.shiftKey ? 15 : 5), k = ev.key;
    if (k === 'ArrowUp') camWalk(step); else if (k === 'ArrowDown') camWalk(-step); else if (k === 'ArrowLeft') camLook(-a, 0); else if (k === 'ArrowRight') camLook(a, 0);
    else if (k === 'PageUp') camWalk(0, 0.1); else if (k === 'PageDown') camWalk(0, -0.1); else return false;
    ev.preventDefault(); return true;
  },
  vcb: camVcb,
  hintExtra: 'Arrossega per mirar al voltant des de l’ull · ↑↓ camina, ←→ gira (Maj: més), RePàg/AvPàg alçada · escriu 35mm, 60° o h1.6.',
};
/* ---------- finestra «Càmera cònica» ---------- */
const camLogV = f => Math.round(1000 * Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN)), camLogF = v => F_MIN * Math.pow(F_MAX / F_MIN, v / 1000);
function camFanSvg(L) {
  const a = camRad(camAngles(L).h) / 2, R = 46, x = 8, y = 32, ex = x + R * Math.cos(a), ey = R * Math.sin(a);
  return '<svg viewBox="0 0 64 64" class="cp-fan" aria-hidden="true"><path class="cp-fa" d="M' + x + ' ' + y + 'L' + ex + ' ' + (y - ey) + 'A' + R + ' ' + R + ' 0 0 1 ' + ex + ' ' + (y + ey) + 'Z"/><path class="cp-fl" d="M' + x + ' ' + y + 'L' + ex + ' ' + (y - ey) + 'M' + x + ' ' + y + 'L' + ex + ' ' + (y + ey) + '"/><rect class="cp-cb" x="1" y="27" width="8" height="10" rx="1.5"/></svg>';
}
function camPanel(b) {
  const box = el('div', 'cp'); box.id = 'camPan'; b.appendChild(box);
  const top = el('div', 'cp-top'); top.innerHTML = '<span class="cp-st" id="cpSt"></span>'; box.appendChild(top);
  const acts = el('div', 'cp-acts'); for (const [id, t, f, ti] of [['cpGo', 'Mira per la càmera', camGo, 'Passa a la vista cònica des de la càmera'], ['cpPos', 'Situa…', () => setTool('campos'), 'Eina Posiciona càmera: clic a la posició i al punt de mira'], ['cpLook', 'Mira al voltant', () => setTool('camlook'), 'Gira des de l’ull; fletxes per caminar'], ['cpLvl', 'Nivella', camLevel, 'Nivella la càmera: el punt de mira passa a l’alçada de la càmera']]) { const bt = el('button', 'btn sm', t); bt.id = id; bt.title = ti; bt.onclick = f; acts.appendChild(bt); } box.appendChild(acts);
  /* lent: el dibuix de l’obertura i la focal grossa són la lectura principal */
  const lens = el('div', 'cp-lens'); lens.innerHTML = '<div id="cpFan"></div><div class="cp-fv"><b id="cpFbig"></b><span>mm</span></div><div class="cp-ang" id="cpAng"></div>'; box.appendChild(lens);
  const rg = el('input'); rg.type = 'range'; rg.min = 0; rg.max = 1000; rg.id = 'cpFr'; rg.className = 'cp-rg'; rg.setAttribute('aria-label', 'Focal (escala logarítmica)'); rg.oninput = () => camLensSet({ f: Math.round(camLogF(+rg.value) * 10) / 10 }); box.appendChild(rg);
  const pre = el('div', 'cp-pre'); for (const f of LENS_PRE) { const c = el('button', 'cp-chip', String(f)); c.dataset.f = f; c.title = f + ' mm'; c.onclick = () => camLensSet({ f }); pre.appendChild(c); } box.appendChild(pre);
  const R = (par, lab, key, unit, step, ti) => { const r = el('div', 'cp-r'); r.appendChild(el('span', '', lab)); const i = el('input'); i.type = 'number'; i.step = step || 0.01; i.dataset.cp = key; if (ti) i.title = ti; i.onchange = () => { const v = parseFloat(String(i.value).replace(',', '.')); if (isFinite(v)) camPanelSet(key, v); camPanelSync(true); }; r.appendChild(i); r.appendChild(el('i', '', unit || '')); par.appendChild(r); return i; };
  const sec = (t) => { const d = el('details', 'cp-sec'); d.open = true; d.appendChild(el('summary', '', t)); const g = el('div', 'cp-g'); d.appendChild(g); box.appendChild(d); return g; };
  const gl = sec('Lent'); R(gl, 'Focal', 'f', 'mm', 1, 'Equivalent de pas universal (36×24 mm), referit a l’amplada de 36 mm'); R(gl, 'Angle horitzontal', 'ah', '°', 0.1); R(gl, 'Angle vertical', 'av', '°', 0.1); R(gl, 'Angle diagonal', 'ad', '°', 0.1);
  const gp = sec('Posició i mira');
  const xyz = (lab, k) => { const r = el('div', 'cp-xyz'); r.appendChild(el('span', '', lab)); for (const a of ['x', 'y', 'z']) { const i = el('input'); i.type = 'number'; i.step = 0.01; i.dataset.cp = k + a; i.title = lab + ' ' + a.toUpperCase(); i.setAttribute('aria-label', lab + ' ' + a.toUpperCase()); i.onchange = () => { const v = parseFloat(String(i.value).replace(',', '.')); if (isFinite(v)) camPanelSet(k + a, v); camPanelSync(true); }; r.appendChild(i); } gp.appendChild(r); };
  const hx = el('div', 'cp-xyz cp-xh'); hx.innerHTML = '<span></span><i>X</i><i>Y</i><i>Z</i>'; gp.appendChild(hx); xyz('Càmera', 'e'); xyz('Punt de mira', 't');
  R(gp, 'Alçada d’ulls', 'eh', 'm', 0.05, 'Sobre el nivell actiu; mou la càmera i la mira junts'); R(gp, 'Distància', 'dist', 'm', 0.1); R(gp, 'Azimut', 'az', '°', 1, 'Des del nord (+Y), en sentit horari'); R(gp, 'Inclinació', 'el', '°', 0.5, 'Positiu cap amunt');
  const pb = el('div', 'cp-acts'); for (const [t, f, ti] of [['Bescanvia', () => { const r = camRec(); camSet({ ...r, eye: r.tgt, tgt: r.eye }); }, 'Intercanvia la càmera i el punt de mira'], ['Nivella la càmera', camLevel, 'Posa el punt de mira a l’alçada de la càmera']]) { const bt = el('button', 'btn sm', t); bt.title = ti; bt.onclick = f; pb.appendChild(bt); } gp.appendChild(pb);
  const ga = sec('Arquitectura');
  const ck = (par, lab, key, ti) => { const l = el('label', 'cp-ck'); const i = el('input'); i.type = 'checkbox'; i.dataset.cp = key; i.onchange = () => camPanelSet(key, i.checked); l.appendChild(i); l.appendChild(document.createTextNode(' ' + lab)); if (ti) l.title = ti; par.appendChild(l); return i; };
  ck(gl, 'Mantén la mida (dolly zoom)', 'keep', 'En canviar la focal la càmera s’allunya o s’acosta perquè el punt de mira es vegi igual de gran: només canvien les fugues');
  camSlider(gl, 'Distància de zoom', 'dolly', 'm', camLogD, camLogDv, 'Acosta o allunya la càmera del punt de mira sense canviar la focal');
  ck(ga, 'Correcció de verticals (2 punts)', 'v2', 'Manté l’objectiu paral·lel a la façana i descentra la imatge: les verticals queden verticals');
  const sr = el('div', 'cp-r'); sr.appendChild(el('span', '', 'Descentrament')); const sg = el('input'); sg.type = 'range'; sg.min = -50; sg.max = 50; sg.step = 1; sg.dataset.cp = 'shift'; sg.className = 'cp-rg'; sg.oninput = () => camPanelSet('shift', +sg.value / 100); sr.appendChild(sg); sr.appendChild(el('i', '', '<output id="cpShO"></output>')); ga.appendChild(sr);
  camSlider(ga, 'Retall proper', 'near', 'm', v => v <= 0 ? 0 : Math.round(0.05 * Math.pow(1000, v / 1000) * 100) / 100, v => v <= 0 ? 0 : Math.round(1000 * Math.log(v / 0.05) / Math.log(1000)), '0 = automàtic. Amb un valor, s’amaga tot el que hi ha més a prop de la càmera (útil per travessar murs)');
  orbPanel(sec);
  vpPanel(box, sec, ck);
  const gg = sec('Guies');
  const fr = el('div', 'cp-r'); fr.appendChild(el('span', '', 'Fotograma')); const fs = el('select'); fs.dataset.cp = 'frame'; fs.innerHTML = [['none', 'Tot el visor'], ['3:2', '3:2 (35 mm)'], ['16:9', '16:9'], ['4:3', '4:3'], ['A', 'A (√2)']].map(([k, t]) => '<option value="' + k + '">' + t + '</option>').join(''); fs.onchange = () => camPanelSet('frame', fs.value); fr.appendChild(fs); fr.appendChild(el('i')); gg.appendChild(fr);
  ck(gg, 'Terços', 'thirds'); ck(gg, 'Horitzó', 'hor'); ck(gg, 'Mostra la càmera al model', 'show', 'Dibuixa la càmera, el con de visió i les nanses a les altres vistes');
  camPanelSync(true, box);
}
function camPanelSet(key, v) {
  const r = camRec(), L = r.lens;
  if (key === 'vpon') { pushUndo('Fugues'); vpData().on = !!v; vpChanged(); return; }
  if (key === 'show') { S.show.cam = !!v; if (CAMV) CAMV.key = ''; needRender = true; return; }
  if (['v2', 'thirds', 'hor', 'frame', 'shift', 'keep'].includes(key)) { camLensSet({ [key]: v }); return; }
  if (key === 'f') return camLensSet({ f: v });
  if (key === 'ah' || key === 'av' || key === 'ad') return camLensSet({ f: camFfromAngle(key[1], v) });
  if (key === 'near') return camLensSet({ near: Math.max(0, v) });
  if (key === 'dolly') { const d0 = V.sub(r.eye, r.tgt), l0 = V.len(d0) || 1; if (v > 0.05) { r.eye = V.add(r.tgt, V.mul(d0, v / l0)); camSet(r); } return; }
  const ix = { x: 0, y: 1, z: 2 };
  if (/^[et][xyz]$/.test(key)) { (key[0] === 'e' ? r.eye : r.tgt)[ix[key[1]]] = v; camSet(r); return; }
  const d = V.sub(r.tgt, r.eye), dist = V.len(d) || 1;
  if (key === 'eh') { const dz = workZ() + v - r.eye[2]; r.eye[2] += dz; r.tgt[2] += dz; L.eye = v; camSet(r); return; }
  if (key === 'dist') { if (v > 0.05) { r.tgt = V.add(r.eye, V.mul(d, v / dist)); camSet(r); } return; }
  const az = Math.atan2(d[0], d[1]), el2 = Math.asin(Math.max(-1, Math.min(1, d[2] / dist)));
  const A = key === 'az' ? camRad(v) : az, E = key === 'el' ? camRad(Math.max(-89.5, Math.min(89.5, v))) : el2;
  r.tgt = V.add(r.eye, [dist * Math.cos(E) * Math.sin(A), dist * Math.cos(E) * Math.cos(A), dist * Math.sin(E)]); camSet(r);
}
function camPanelSync(force, root) {
  const p = root || $('camPan'); if (!p) return; const r = camRec(), L = r.lens, A = camAngles(L), d = V.sub(r.tgt, r.eye), dist = V.len(d) || 1;
  let az = camDeg(Math.atan2(d[0], d[1])); if (az < 0) az += 360;
  const val = { f: L.f, ah: A.h, av: A.v, ad: A.d, ex: r.eye[0], ey: r.eye[1], ez: r.eye[2], tx: r.tgt[0], ty: r.tgt[1], tz: r.tgt[2], eh: r.eye[2] - workZ(), dist, dolly: dist, az, el: camDeg(Math.asin(Math.max(-1, Math.min(1, d[2] / dist)))), near: L.near, v2: L.v2, keep: L.keep, thirds: L.thirds, hor: L.hor, frame: L.frame, shift: Math.round((L.shift || 0) * 100), show: S.show.cam !== false, vpon: vpOn() };
  const dec = { f: 1, ah: 1, av: 1, ad: 1, az: 1, el: 1 };
  for (const i of p.querySelectorAll('[data-cp]')) { if (!force && document.activeElement === i) continue; const k = i.dataset.cp, v = val[k]; if (v == null) continue; if (i.type === 'checkbox') i.checked = !!v; else if (i.tagName === 'SELECT' || i.type === 'range') i.value = v; else i.value = typeof v === 'number' ? +v.toFixed(dec[k] != null ? dec[k] : 3) : v; }
  const set = (id, h) => { const e = p.querySelector('#' + id); if (e) e.innerHTML = h; };
  set('cpFbig', String(Math.round(L.f * 10) / 10).replace('.', ',')); set('cpAng', 'H ' + f1(A.h) + '°<br>V ' + f1(A.v) + '°<br>D ' + f1(A.d) + '°'); set('cpFan', camFanSvg(L)); set('cpShO', (val.shift > 0 ? '+' : '') + val.shift + ' %'); set('cpVp', vpLegend()); orbSync();
  for (const g of p.querySelectorAll('[data-cps]')) if (force || document.activeElement !== g) g.value = window[g.dataset.inv](val[g.dataset.cps]);
  const rg = p.querySelector('#cpFr'); if (rg && (force || document.activeElement !== rg)) rg.value = camLogV(L.f);
  for (const c of p.querySelectorAll('.cp-chip')) c.classList.toggle('on', Math.abs(+c.dataset.f - L.f) < 0.05);
  const live = CAM.proj === 'conic'; set('cpSt', live ? '<i class="on"></i>Vista cònica activa: els canvis s’apliquen al visor' : S.model.meta.ccam ? '<i></i>Edites la càmera desada; «Mira per la càmera» per veure-la' : '<i></i>Sense càmera: situa-la o passa a la cònica');
}
function camLevel() { const r = camRec(); r.tgt[2] = r.eye[2]; camSet(r); camPanelSync(true); }
const camLogD = v => Math.round(0.5 * Math.pow(1000, v / 1000) * 100) / 100, camLogDv = d => Math.round(1000 * Math.log(Math.max(0.5, d) / 0.5) / Math.log(1000));
/* control lliscant + valor numèric editable */
function camSlider(par, lab, key, unit, toV, toS, ti) { const r = el('div', 'cp-r cp-sl'); r.appendChild(el('span', '', lab)); const g = el('input'); g.type = 'range'; g.min = 0; g.max = 1000; g.className = 'cp-rg'; g.dataset.cps = key; g.dataset.inv = toS.name || ('cpInv_' + key); if (!toS.name || !window[toS.name]) window[g.dataset.inv] = toS; g.setAttribute('aria-label', lab); if (ti) g.title = ti;
  const i = el('input'); i.type = 'number'; i.step = 0.05; i.min = 0; i.dataset.cp = key; if (ti) i.title = ti; g.oninput = () => { camPanelSet(key, toV(+g.value)); camPanelSync(false); };
  i.onchange = () => { const v = parseFloat(String(i.value).replace(',', '.')); if (isFinite(v)) camPanelSet(key, v); camPanelSync(true); }; r.appendChild(g); r.appendChild(i); r.appendChild(el('i', '', unit)); par.appendChild(r); }
/* finestra flotant amb mida pròpia la primera vegada */
function camWin() { const P = LAY.panels.cam || (LAY.panels.cam = {}); if (P.w == null) { const vw = $('viewWrap').getBoundingClientRect(); P.w = 328; P.h = Math.max(320, Math.min(700, vw.height - 60)); P.x = 12; P.y = 48; } setPanelFloat('cam', true); }
(function camInit() {
  CAMV = { g: new THREE.Group(), sc: new THREE.Scene(), key: '', geo: null }; CAMV.sc.add(CAMV.g);
  if (S.show.cam == null) S.show.cam = true;
})();
/* ============================================================
   v0.56 · punts de fuga
   · clic sobre arestes del model: les paral·leles (±1°) formen una família (màxim 3)
   · el punt de fuga és la projecció exacta de la direcció 3D, encara que caigui molt fora de la pantalla
   · «Eixos X·Y·Z» afegeix les tres fugues principals sense arestes
   · meta.cvp = { on, fam: [{ d:[x,y,z], e:[[a,b], …] }] } · entra a desfer i al desat · s'exporta a PNG i SVG
   ============================================================ */
const VP_COL = ['#FF5A36', '#2FBF71', '#B05CFF'], VP_TOL = Math.cos(1 * Math.PI / 180);
function vpData() { const m = S.model.meta; return m.cvp || (m.cvp = { on: true, fam: [] }); }
function vpOn() { const D = S.model.meta.cvp; return !D || D.on !== false; }
function vpFamOf(u) { const D = S.model.meta.cvp; return D ? D.fam.findIndex(f => Math.abs(V.dot(f.d, u)) > VP_TOL) : -1; }
function vpAdd(a, b) {
  const d = V.sub(b, a), l = V.len(d); if (l < 1e-6) return false; const u = V.mul(d, 1 / l), D = vpData(), i = vpFamOf(u), same = (p, q) => V.dist(p, q) < 1e-6;
  if (i >= 0 && D.fam[i].e.some(([p, q]) => (same(p, a) && same(q, b)) || (same(p, b) && same(q, a)))) { toast('Aquesta aresta ja és marcada.'); return false; }
  if (i < 0 && D.fam.length >= 3) { toast('Màxim tres fugues: esborra’n una per afegir una direcció nova.'); return false; }
  pushUndo('Fuga'); const E = vpData(); E.on = true;
  if (i < 0) E.fam.push({ d: u, e: [[a.slice(), b.slice()]] }); else E.fam[i].e.push([a.slice(), b.slice()]);
  vpChanged(); toast('F' + ((i < 0 ? E.fam.length - 1 : i) + 1) + ' · ' + E.fam[i < 0 ? E.fam.length - 1 : i].e.length + ' aresta(es)'); return true;
}
function vpAxes() {
  const D = vpData(), add = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].filter(u => vpFamOf(u) < 0);
  if (!add.length) { toast('Les tres fugues principals ja hi són.'); return; }
  if (D.fam.length + add.length > 3) { toast('No hi caben: esborra alguna fuga abans.'); return; }
  pushUndo('Fugues principals'); const E = vpData(); E.on = true; for (const u of add) E.fam.push({ d: u, e: [] }); vpChanged();
}
function vpDel(i) { const D = S.model.meta.cvp; if (!D || !D.fam.length) return; pushUndo('Esborra fuga'); const E = vpData(); if (i == null) E.fam = []; else E.fam.splice(i, 1); vpChanged(); }
function vpChanged() { S.dirty = true; needRender = true; camPanelSync(true); }
/* retall d'un segment al rectangle [0,w]×[0,h] (Liang–Barsky) */
function vpClip(x1, y1, x2, y2, w, h) {
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  for (const [p, q] of [[-dx, x1], [dx, w - x1], [-dy, y1], [dy, h - y1]]) { if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; } const r = q / p; if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } }
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}
/* geometria a pantalla (px CSS del visor) */
function vpGeom() {
  const D = S.model.meta.cvp; if (!D || D.on === false || !D.fam.length || CAM.proj !== 'conic') return [];
  const w = view.clientWidth || 1, h = view.clientHeight || 1, cx = w / 2, cy = h / 2; cam.updateMatrixWorld();
  return D.fam.map((F, i) => {
    const v = new THREE.Vector4(F.d[0], F.d[1], F.d[2], 0).applyMatrix4(cam.matrixWorldInverse).applyMatrix4(cam.projectionMatrix);
    const vp = Math.abs(v.w) < 1e-9 || Math.hypot(v.x / v.w, v.y / v.w) > 1e5 ? null : { x: (v.x / v.w + 1) / 2 * w, y: (1 - v.y / v.w) / 2 * h }, segs = [];
    for (const [a, b] of F.e) {
      const p = toScreen(a), q = toScreen(b), P = [p, q].filter(s => s.z < 1); if (!P.length) continue; let s;
      if (vp) { let s0 = P[0]; if (P[1] && Math.hypot(P[1].x - vp.x, P[1].y - vp.y) > Math.hypot(s0.x - vp.x, s0.y - vp.y)) s0 = P[1]; s = [s0.x, s0.y, vp.x, vp.y]; }
      else if (P.length === 2) { const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1, K = 4 * (w + h); s = [p.x - dx / l * K, p.y - dy / l * K, p.x + dx / l * K, p.y + dy / l * K]; }
      const c = s && vpClip(...s, w, h); if (c) segs.push(c);
    }
    let mark = null;
    if (vp) { const inside = vp.x >= 0 && vp.x <= w && vp.y >= 0 && vp.y <= h, k = Math.hypot(vp.x - cx, vp.y - cy) / (w / 2);
      if (inside) mark = { x: vp.x, y: vp.y, in: true, k };
      else { const c = vpClip(cx, cy, vp.x, vp.y, w, h), ang = Math.atan2(vp.y - cy, vp.x - cx); if (c) mark = { x: c[2] - Math.cos(ang) * 16, y: c[3] - Math.sin(ang) * 16, in: false, ang, k }; } }
    return { i, col: VP_COL[i], vp, segs, mark, n: F.e.length };
  });
}
/* SVG amb atributs en línia (serveix per al visor i per a l'exportació) */
function vpSvg(G) {
  let s = '';
  for (const g of G) {
    s += '<g stroke="' + g.col + '" stroke-width="1.1" fill="none"' + (g.vp ? '' : ' stroke-dasharray="7 4"') + '>' + g.segs.map(c => '<line x1="' + c[0].toFixed(1) + '" y1="' + c[1].toFixed(1) + '" x2="' + c[2].toFixed(1) + '" y2="' + c[3].toFixed(1) + '"/>').join('') + '</g>';
    const m = g.mark; if (!m) continue; const lab = 'F' + (g.i + 1), tx = 'font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="' + g.col + '" paint-order="stroke" stroke="rgba(0,0,0,.55)" stroke-width="2.5"';
    if (m.in) s += '<circle cx="' + m.x.toFixed(1) + '" cy="' + m.y.toFixed(1) + '" r="5" fill="none" stroke="' + g.col + '" stroke-width="1.6"/><path d="M' + (m.x - 9).toFixed(1) + ' ' + m.y.toFixed(1) + 'h18M' + m.x.toFixed(1) + ' ' + (m.y - 9).toFixed(1) + 'v18" stroke="' + g.col + '" stroke-width="1"/><text x="' + (m.x + 9).toFixed(1) + '" y="' + (m.y - 8).toFixed(1) + '" ' + tx + '>' + lab + '</text>';
    else { const c = Math.cos(m.ang), sn = Math.sin(m.ang), t = (a, r) => (m.x + Math.cos(m.ang + a) * r).toFixed(1) + ' ' + (m.y + Math.sin(m.ang + a) * r).toFixed(1);
      const lt = lab + ' ×' + f1(m.k), lw = lt.length * 6.6 + 10, lx = m.x - c * (lw / 2 + 8), ly = m.y - sn * 18;
      s += '<path d="M' + t(0, 10) + 'L' + t(2.5, 7) + 'L' + t(-2.5, 7) + 'Z" fill="' + g.col + '"/><rect x="' + (lx - lw / 2).toFixed(1) + '" y="' + (ly - 9).toFixed(1) + '" width="' + lw.toFixed(1) + '" height="17" rx="3" fill="rgba(14,17,22,.78)" stroke="' + g.col + '" stroke-width="1"/><text x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="' + g.col + '">' + lt + '</text>'; }
  }
  return s;
}
/* sobre un canvas (PNG): k = px del canvas per px CSS */
function vpCanvas(g2, k) {
  const G = vpGeom(); if (!G.length) return; const img = new Image(), W = view.clientWidth || 1, H = view.clientHeight || 1;
  return new Promise(res => { img.onload = () => { g2.drawImage(img, 0, 0, W * k, H * k); res(); }; img.onerror = () => res(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + vpSvg(G) + '</svg>'); });
}
/* aresta sota el cursor, a pantalla (≤ 8 px) */
function vpEdgeAt(mx, my) {
  let best = null, bd = 8;
  for (const e of SNAP.edges) { const p = toScreen(e.a), q = toScreen(e.b); if (p.z >= 1 || q.z >= 1) continue; const dx = q.x - p.x, dy = q.y - p.y, L2 = dx * dx + dy * dy; if (L2 < 1) continue; const t = Math.max(0, Math.min(1, ((mx - p.x) * dx + (my - p.y) * dy) / L2)), d = Math.hypot(p.x + t * dx - mx, p.y + t * dy - my); if (d < bd) { bd = d; best = e; } }
  return best;
}
TOOLS.camvp = {
  onSet() { if (CAM.proj !== 'conic') setProj('conic'); },
  move(ev, mx, my) {
    const e = vpEdgeAt(mx, my); clearPrev();
    if (!e) { showTip(mx, my, null, 'Apunta una aresta'); return; }
    const u = V.norm(V.sub(e.b, e.a)), i = vpFamOf(u), D = S.model.meta.cvp, n = D ? D.fam.length : 0;
    prevLine([e.a, e.b], parseInt((i >= 0 ? VP_COL[i] : n < 3 ? VP_COL[n] : '#8B939F').slice(1), 16));
    showTip(mx, my, null, i >= 0 ? 'Clic: afegeix a F' + (i + 1) : n < 3 ? 'Clic: nova fuga F' + (n + 1) : 'Ja hi ha tres fugues');
  },
  down(ev, mx, my) { const e = vpEdgeAt(mx, my); if (!e) { toast('Clica sobre una aresta del model.'); return; } vpAdd(e.a, e.b); },
  hintExtra: 'Clic sobre arestes: les paral·leles formen una fuga (fins a tres). Esc per acabar.',
};
/* ---------- dibuixos esquemàtics dels controls de fuga ---------- */
const VP_ICO = {
  hero: '<svg viewBox="0 0 240 70" class="vp-hero" aria-hidden="true"><line class="vp-hz" x1="4" y1="30" x2="236" y2="30"/><g stroke="#FF5A36"><line x1="12" y1="30" x2="104" y2="14"/><line x1="12" y1="30" x2="104" y2="62"/><line x1="12" y1="30" x2="104" y2="46"/></g><g stroke="#2FBF71"><line x1="228" y1="30" x2="104" y2="14"/><line x1="228" y1="30" x2="104" y2="62"/><line x1="228" y1="30" x2="150" y2="54"/></g><path class="vp-box" d="M104 14V62M70 21V53M150 22V54M104 14L70 21M104 14L150 22M104 62L70 53M104 62L150 54"/><circle cx="12" cy="30" r="3.5" fill="#FF5A36"/><circle cx="228" cy="30" r="3.5" fill="#2FBF71"/></svg>',
  pick: '<svg viewBox="0 0 24 24" class="vp-i" aria-hidden="true"><path d="M3 18L15 6" stroke-width="2.2"/><path d="M14 13l6 2-2.5 1.2L16 19z" fill="currentColor" stroke-width="1"/></svg>',
  axes: '<svg viewBox="0 0 24 24" class="vp-i" aria-hidden="true"><path d="M12 13V3M12 13L4 18M12 13l8 5" stroke-width="1.8"/><circle cx="12" cy="3" r="1.6" fill="currentColor"/><circle cx="4" cy="18" r="1.6" fill="currentColor"/><circle cx="20" cy="18" r="1.6" fill="currentColor"/></svg>',
  fam: (col, vp) => '<svg viewBox="0 0 34 20" class="vp-f" aria-hidden="true"><g stroke="' + col + '" stroke-width="1.4"' + (vp ? '>' + '<path d="M2 3L30 10M2 10H30M2 17L30 10"/><circle cx="30" cy="10" r="2.6" fill="' + col + '"/>' : ' stroke-dasharray="3 2"><path d="M2 4H32M2 10H32M2 16H32"/>') + '</g></svg>',
};
function vpLegend() {
  const D = S.model.meta.cvp; if (!D || !D.fam.length) return '<p class="vp-empty">Encara no hi ha fugues. Marca dues arestes paral·leles o afegeix els eixos.</p>';
  const G = CAM.proj === 'conic' && D.on !== false ? vpGeom() : [];
  return D.fam.map((F, i) => { const g = G[i], st = !G.length ? 'es veu a la vista cònica' : !g.vp ? 'sense fuga · paral·lela al quadre' : g.mark && g.mark.in ? 'dins la imatge' : 'fora · a ×' + f1(g.mark ? g.mark.k : 0) + ' del centre';
    return '<div class="vp-row">' + VP_ICO.fam(VP_COL[i], !g || g.vp) + '<b style="color:' + VP_COL[i] + '">F' + (i + 1) + '</b><span>' + F.e.length + ' ar. · ' + st + '</span><button class="vp-x" data-vpdel="' + i + '" title="Esborra la fuga F' + (i + 1) + '" aria-label="Esborra la fuga F' + (i + 1) + '">×</button></div>'; }).join('');
}
function vpPanel(box, sec, ck) {
  const g = sec('Fugues'); const hero = el('div', 'vp-h'); hero.innerHTML = VP_ICO.hero; g.appendChild(hero);
  ck(g, 'Mostra les línies de fuga', 'vpon', 'Dibuixa a la vista cònica les arestes marcades allargades fins al seu punt de fuga');
  const a = el('div', 'cp-acts');
  for (const [id, ico, t, f, ti] of [['cpVpPick', 'pick', 'Marca arestes', () => setTool('camvp'), 'Clic sobre arestes del model: les paral·leles formen una fuga'], ['cpVpAx', 'axes', 'Eixos X·Y·Z', vpAxes, 'Afegeix les tres fugues principals (direccions X, Y i Z)']]) { const b = el('button', 'btn sm vp-b'); b.id = id; b.innerHTML = VP_ICO[ico] + '<span>' + t + '</span>'; b.title = ti; b.onclick = f; a.appendChild(b); }
  const z = el('button', 'btn sm', 'Esborra-les'); z.title = 'Esborra totes les fugues'; z.onclick = () => vpDel(); a.appendChild(z); g.appendChild(a);
  const lg = el('div', 'vp-lg'); lg.id = 'cpVp'; lg.onclick = ev => { const b = ev.target.closest('[data-vpdel]'); if (b) vpDel(+b.dataset.vpdel); }; g.appendChild(lg);
}
/* ============================================================
   v0.57 · òrbita de càmera
   · «càmera»: l'ull es mou sobre una esfera centrada al punt de mira (distància fixa)
   · «mira»: el punt de mira es mou sobre una esfera centrada a l'ull (com «Mira al voltant»)
   · arrossega ↔ azimut, ↕ inclinació (±89°) · fletxes 1°, Maj 5° · una entrada d'historial per arrossegament
   ============================================================ */
let ORB = 'eye';
const ORB_MAX = 89 * Math.PI / 180;
function camOrbit(who, dAz, dEl) {
  const r = camRec(), C = who === 'eye' ? r.tgt : r.eye, P = who === 'eye' ? r.eye : r.tgt, v = V.sub(P, C), R = V.len(v); if (R < 1e-6) return;
  const az = Math.atan2(v[1], v[0]) + dAz, el = Math.max(-ORB_MAX, Math.min(ORB_MAX, Math.asin(Math.max(-1, Math.min(1, v[2] / R))) + dEl));
  const p = [C[0] + R * Math.cos(el) * Math.cos(az), C[1] + R * Math.cos(el) * Math.sin(az), C[2] + R * Math.sin(el)];
  if (who === 'eye') r.eye = p; else r.tgt = p; camSet(r);
}
function camOrbAngles() { const r = camRec(), v = ORB === 'eye' ? V.sub(r.eye, r.tgt) : V.sub(r.tgt, r.eye), R = V.len(v) || 1; return { az: ((Math.atan2(v[1], v[0]) * 180 / Math.PI) + 360) % 360, el: Math.asin(Math.max(-1, Math.min(1, v[2] / R))) * 180 / Math.PI }; }
function camOrbSel(k) { ORB = k === 'tgt' ? 'tgt' : 'eye'; orbSync(); }
/* arrossegament: ↔ gira l'azimut; ↕ puja/baixa (la càmera puja quan arrossegues avall, com l'òrbita; la mira baixa) */
function camOrbDrag(dx, dy) { const k = OPT.orbit * 0.6; camOrbit(ORB, -dx * k, ORB === 'eye' ? dy * k : -dy * k); }
function camOrbTip(mx, my) { const A = camOrbAngles(); showTip(mx, my, null, (ORB === 'eye' ? 'Òrbita de la càmera' : 'Òrbita de la mira') + ' · az ' + f1(A.az) + '° · incl ' + f1(A.el) + '°'); }
TOOLS.camorb = {
  onSet() { if (!S.model.meta.ccam && CAM.proj !== 'conic') setProj('conic'); },
  down(ev, mx, my) {
    /* fora de la càmera, clicar prop de l'ull o del punt de mira del glif el tria */
    if (CAM.proj !== 'conic' && CAMV && CAMV.geo) { let best = null, bd = 24; for (const k of ['eye', 'tgt']) { const s = toScreen(CAMV.geo[k]), d = Math.hypot(s.x - mx, s.y - my); if (s.z < 1 && d < bd) { bd = d; best = k; } } if (best) camOrbSel(best); }
    st.drag = { x: mx, y: my }; pushHist();
  },
  move(ev, mx, my) { if (!st.drag || !(ev.buttons & 1)) { st.drag = null; showTip(mx, my, null, (ORB === 'eye' ? 'Càmera' : 'Punt de mira') + ' · arrossega ↔ ↕ per orbitar'); return; } camOrbDrag(mx - st.drag.x, my - st.drag.y); st.drag = { x: mx, y: my }; camOrbTip(mx, my); },
  up() { st.drag = null; },
  key(ev) {
    const a = camRad(ev.shiftKey ? 5 : 1), k = ev.key, up = ORB === 'eye' ? -1 : 1;
    if (k === 'ArrowLeft') camOrbit(ORB, a, 0); else if (k === 'ArrowRight') camOrbit(ORB, -a, 0); else if (k === 'ArrowUp') camOrbit(ORB, 0, -up * a); else if (k === 'ArrowDown') camOrbit(ORB, 0, up * a);
    else if (k === 'Tab') { camOrbSel(ORB === 'eye' ? 'tgt' : 'eye'); } else return false;
    ev.preventDefault(); return true;
  },
  vcb: camVcb,
  hintExtra: 'Arrossega ↔ ↕: la càmera (o el punt de mira) es mou sobre una esfera · fletxes 1° (Maj 5°) · Tab canvia entre càmera i mira.',
};
/* esquema de l'òrbita, en l'estil de la clau de línies: alçat amb la càmera, el punt de mira i l'esfera */
function camOrbSvg() {
  const E = ORB === 'eye', cx = E ? 176 : 58, cy = E ? 70 : 52, ox = E ? 58 : 176, oy = E ? 52 : 70, R = Math.hypot(ox - cx, oy - cy);
  const cam = '<g class="orb-o' + (E ? ' on' : '') + '" data-orb="eye" tabindex="0" role="button" aria-label="Orbita la càmera al voltant del punt de mira"><title>Càmera: orbita al voltant del punt de mira</title><circle cx="58" cy="52" r="20" class="orb-hit"/><rect x="44" y="44" width="20" height="15" rx="2"/><circle cx="50" cy="41" r="4.5"/><circle cx="59" cy="41" r="4.5"/><path d="M64 48l9-5v17l-9-5z"/></g>';
  const tgt = '<g class="orb-o' + (!E ? ' on' : '') + '" data-orb="tgt" tabindex="0" role="button" aria-label="Orbita el punt de mira al voltant de la càmera"><title>Punt de mira: gira al voltant de la càmera</title><circle cx="176" cy="70" r="20" class="orb-hit"/><circle cx="176" cy="70" r="8"/><path d="M162 70h28M176 56v28"/></g>';
  /* fletxes fora de la icona: ↔ a sota, ↕ al costat de fora (lluny del centre de l'esfera) */
  const arr = (x, y) => { const hy = y + 30, vx = x + (x < cx ? -32 : 32); return '<g class="orb-ar"><path d="M' + (x - 16) + ' ' + hy + 'h32M' + (x - 16) + ' ' + hy + 'l5-4M' + (x - 16) + ' ' + hy + 'l5 4M' + (x + 16) + ' ' + hy + 'l-5-4M' + (x + 16) + ' ' + hy + 'l-5 4"/><path d="M' + vx + ' ' + (y - 16) + 'v32M' + vx + ' ' + (y - 16) + 'l-4 5M' + vx + ' ' + (y - 16) + 'l4 5M' + vx + ' ' + (y + 16) + 'l-4-5M' + vx + ' ' + (y + 16) + 'l4-5"/></g>'; };
  return '<svg viewBox="0 0 240 118" class="orb-svg" role="group" aria-label="Tria què orbita"><line class="orb-gr" x1="6" y1="108" x2="234" y2="108"/><circle class="orb-sph" cx="' + cx + '" cy="' + cy + '" r="' + R.toFixed(1) + '"/><line class="orb-ax" x1="58" y1="52" x2="176" y2="70"/><circle class="orb-c" cx="' + cx + '" cy="' + cy + '" r="2.5"/>' + arr(ox, oy) + cam + tgt + '</svg>';
}
function orbPanel(sec) {
  const g = sec('Òrbita'), d = el('div', 'orb-h'); d.id = 'cpOrb'; d.innerHTML = camOrbSvg(); g.appendChild(d);
  const pick = t => { const o = t.closest('[data-orb]'); if (o) { camOrbSel(o.dataset.orb); if (T !== TOOLS.camorb) setTool('camorb'); } };
  d.onclick = ev => pick(ev.target); d.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(ev.target); } };
  const t = el('p', 'orb-t'); t.id = 'cpOrbT'; g.appendChild(t);
  const a = el('div', 'cp-acts'), b = el('button', 'btn sm', 'Òrbita'); b.id = 'cpOrbGo'; b.title = 'Eina Òrbita de càmera: arrossega al visor'; b.onclick = () => setTool('camorb'); a.appendChild(b); g.appendChild(a);
}
function orbSync() {
  const d = $('cpOrb'); if (d) d.innerHTML = camOrbSvg(); const t = $('cpOrbT'); if (!t) return; const A = camOrbAngles();
  t.textContent = (ORB === 'eye' ? 'La càmera gira al voltant del punt de mira' : 'El punt de mira gira al voltant de la càmera') + ' · az ' + f1(A.az) + '° · incl ' + f1(A.el) + '°';
}
