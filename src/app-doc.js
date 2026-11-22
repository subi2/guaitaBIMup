/* ============================================================
   v16 · documentació 2D vectorial: planta, alçat i secció amb
   eliminació de línies ocultes, ratllat del tall i làmina
   multivista. Sortida SVG, PDF i DXF.
   ============================================================ */
function docViews() {
  const L = S.model.levels.slice().sort((a, b) => b.elev - a.elev), out = [['multi', 'Làmina multivista (planta, alçats i secció)']];
  for (const l of L) out.push(['plan:' + l.id, 'Planta · ' + l.name]);
  for (const e of ELEVS) out.push(['elev:' + e[0], e[1]]);
  for (const g of S.model.grids) out.push(['sec:' + g.id, 'Secció · eix ' + g.name]);
  for (const s of S.model.sections || []) out.push(['cut:' + s.id, 'Secció · ' + s.name]);
  return out;
}
function docView(key) {
  const [t, id] = key.split(':'), mk = (name, o, dir, cut, far, kind) => { const u = Math.abs(dir[2]) > 0.99 ? [1, 0, 0] : V.norm(V.cross(dir, [0, 0, 1])); return { key, name, o, dir, u, v: V.cross(u, dir), cut, far, kind }; };
  if (t === 'scene') { const v = S.model.views.find(x => String(x.id) === id); if (!v) return null; if (v.vk && !v.vk.startsWith('scene:')) { const r = docView(v.vk); if (r) { r.key = key; r.name = v.name; return r; } }
    if (!v.cam) return null; if (v.cam.proj === 'conic') { const r = docPersp(v.cam, mk, v.name); if (r) return r; } const st = Math.sin(v.cam.phi), cd = [st * Math.cos(v.cam.theta), st * Math.sin(v.cam.theta), Math.cos(v.cam.phi)]; return mk(v.name, [0, 0, 0], V.mul(cd, -1), false, Infinity, '3d'); }
  if (t === 'plan') { const l = S.model.levels.find(x => String(x.id) === id); return l ? mk('Planta · ' + l.name, [0, 0, l.elev + vrOf(l).cut], [0, 0, -1], true, vrFar(l), 'plan') : null; }
  if (t === 'elev') { const e = ELEVS.find(x => x[0] === id), d = { S: [0, 1, 0], N: [0, -1, 0], E: [-1, 0, 0], O: [1, 0, 0] }[id]; return e ? mk(e[1], [0, 0, 0], d, false, Infinity, 'elev') : null; }
  if (t === 'sec') { const g = S.model.grids.find(x => String(x.id) === id); if (!g) return null; const d = V.norm([g.b[0] - g.a[0], g.b[1] - g.a[1], 0]); return mk('Secció · eix ' + g.name, [g.a[0], g.a[1], 0], [-d[1], d[0], 0], true, Infinity, 'sec'); }
  if (t === 'cut') { const s = (S.model.sections || []).find(x => String(x.id) === id); if (!s) return null; const n = V.norm(s.flip ? V.mul(s.n, -1) : s.n), hz = Math.abs(n[2]) > 0.99; return mk('Secció · ' + s.name, hz ? s.o.slice() : [s.o[0], s.o[1], 0], V.mul(n, -1), true, Infinity, hz ? 'plan' : 'sec'); }
  return null;
}
/* v0.52 · vista cònica per als plànols: mateixa lent, verticals i fotograma que el visor; el pla del dibuix és el del punt de mira (escala real allà) */
function docPersp(c, mk, name) {
  const L = { ...LENS_DEF, ...(c.lens || {}) }, sp = Math.sin(c.phi), cd = [sp * Math.cos(c.theta), sp * Math.sin(c.theta), Math.cos(c.phi)], eye = V.add(c.t, V.mul(cd, c.dist));
  const hz = Math.hypot(cd[0], cd[1]), v2 = L.v2 && c.phi > 0.12 && c.phi < Math.PI - 0.12 && hz > 1e-6, fwd = v2 ? [-cd[0] / hz, -cd[1] / hz, 0] : V.mul(cd, -1);
  const dT = v2 ? c.dist * hz : c.dist; if (!(dT > 1e-6)) return null;
  const r = mk(name, eye, fwd, false, Infinity, '3d'), ar = FRAME_AR[L.frame] || 1.5, hH = dT * 18 / L.f, hV = hH / ar, sy = (v2 ? c.t[2] - eye[2] : 0) + (L.shift || 0) * 2 * hV;
  r.persp = { dT, hH, hV, sy, near: L.near > 0 ? L.near : 0.05, f: L.f }; return r;
}
/* genera el dibuix 2D d'una vista: tall, arestes vistes i ocultes */
function drawing2D(vw, opt) {
  opt = opt || {}; const o = vw.o, D = vw.dir, U = vw.u, W = vw.v, pr = p => { const x = p[0] - o[0], y = p[1] - o[1], z = p[2] - o[2]; return [x * U[0] + y * U[1] + z * U[2], x * W[0] + y * W[1] + z * W[2], x * D[0] + y * D[1] + z * D[2]]; };
  const lo = vw.cut ? 0 : -Infinity, hi = vw.cut ? vw.far : Infinity, tris = [], cutSeg = new Map();
  /* cònica: retall pel pla proper i pel fotograma (piràmide de visió) i projecció central sobre el pla del punt de mira; la 3a coordenada (−dT/z) és afí a la pantalla */
  const PS = vw.persp, pz = PS ? (c => [PS.dT * c[0] / c[2], PS.dT * c[1] / c[2], -PS.dT / c[2]]) : null;
  const pclip = PS ? [a => a[2] - PS.near, a => a[2] * PS.hH / PS.dT - a[0], a => a[2] * PS.hH / PS.dT + a[0], a => a[2] * (PS.sy + PS.hV) / PS.dT - a[1], a => a[1] - a[2] * (PS.sy - PS.hV) / PS.dT] : null;
  const zdist = q => PS ? -PS.dT / q : q;
  const clipPoly = (pts, f) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], da = f(a), db = f(b); if (da >= 0) out.push(a); if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); } } return out; };
  for (const m of pickMeshes) {
    if (m.userData.back) continue; const p = m.geometry.attributes.position.array, key = m.userData.path.join('/');
    for (let i = 0; i < p.length; i += 9) {
      let wp = [[p[i], p[i + 1], p[i + 2]], [p[i + 3], p[i + 4], p[i + 5]], [p[i + 6], p[i + 7], p[i + 8]]];
      for (const pl of opt.boxP || []) { wp = clipPoly(wp, a => pl.normal.x * a[0] + pl.normal.y * a[1] + pl.normal.z * a[2] + pl.constant); if (!wp.length) break; }
      for (let wq = 1; wq + 1 < wp.length; wq++) {
      const T = [pr(wp[0]), pr(wp[wq]), pr(wp[wq + 1])];
      if (vw.cut) { const q = []; for (let k = 0; k < 3; k++) { const a = T[k], b = T[(k + 1) % 3]; if ((a[2] > 0) !== (b[2] > 0)) { const t = a[2] / (a[2] - b[2]); q.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } if (q.length === 2) { let l = cutSeg.get(key); if (!l) cutSeg.set(key, l = { m, l: [] }); l.l.push(q); } }
      let poly = T; if (vw.cut) { poly = clipPoly(poly, a => a[2]); if (isFinite(hi) && poly.length) poly = clipPoly(poly, a => hi - a[2]); }
      if (PS) { for (const f of pclip) { poly = clipPoly(poly, f); if (!poly.length) break; } poly = poly.map(pz); }
      for (let k = 1; k + 1 < poly.length; k++) { const a = poly[0], b = poly[k], c = poly[k + 1], ar = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); if (Math.abs(ar) > 1e-9) tris.push([a, b, c, ar]); }
      }
    }
  }
  /* contorns del tall: cada cos tancat que talla, amb unió (mateix material) o retall per prioritat */
  const cut = [], cutOpen = [], cutB = [], E = [];
  for (const [, g] of cutSeg) {
    const fl = lnFlags(g.m.userData.path), segs = g.l.map(q => [q[0][0], q[0][1], q[1][0], q[1][1]]);
    if (!fl.cut) { for (const s2 of segs) cutB.push(s2); continue; }
    const ch = lnChain(segs);
    if (ch.loops.length && !ch.open.length && lnWatertight(g.m.userData.c)) E.push({ loops: lnOrient(ch.loops), solid: true, mat: lnMatOf(g.m.userData.c), prio: fl.prio, nj: fl.nj });
    else { if (ch.loops.length) cut.push({ loops: ch.loops, edges: lnLoopSegs(ch.loops), clip: [] }); for (const s2 of ch.open) cutOpen.push(s2); }
  }
  lnResolve(E); for (const e of E) cut.push({ loops: e.loops, edges: e.edges, clip: e.clip });
  /* graella d'acceleració per a les línies ocultes */
  let bb = { u0: Infinity, v0: Infinity, u1: -Infinity, v1: -Infinity }; const ext = (x, y) => { if (x < bb.u0) bb.u0 = x; if (x > bb.u1) bb.u1 = x; if (y < bb.v0) bb.v0 = y; if (y > bb.v1) bb.v1 = y; };
  for (const t of tris) for (let k = 0; k < 3; k++) ext(t[k][0], t[k][1]);
  const Gn = Math.max(8, Math.min(220, Math.ceil(Math.sqrt(tris.length)) * 2)), cw = Math.max(bb.u1 - bb.u0, 1e-6) / Gn, ch = Math.max(bb.v1 - bb.v0, 1e-6) / Gn, grid = new Map();
  tris.forEach((t, i) => { const x0 = Math.floor((Math.min(t[0][0], t[1][0], t[2][0]) - bb.u0) / cw), x1 = Math.floor((Math.max(t[0][0], t[1][0], t[2][0]) - bb.u0) / cw), y0 = Math.floor((Math.min(t[0][1], t[1][1], t[2][1]) - bb.v0) / ch), y1 = Math.floor((Math.max(t[0][1], t[1][1], t[2][1]) - bb.v0) / ch);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x * 4096 + y; let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); } });
  const hiddenAt = (x, y, d) => { const l = grid.get(Math.floor((x - bb.u0) / cw) * 4096 + Math.floor((y - bb.v0) / ch)); if (!l) return false;
    for (const i of l) { const [a, b, c, ar] = tris[i], w0 = ((b[0] - x) * (c[1] - y) - (b[1] - y) * (c[0] - x)) / ar, w1 = ((c[0] - x) * (a[1] - y) - (c[1] - y) * (a[0] - x)) / ar, w2 = 1 - w0 - w1; if (w0 > 1e-5 && w1 > 1e-5 && w2 > 1e-5 && w0 * a[2] + w1 * b[2] + w2 * c[2] < d - (PS ? 2e-3 * d * d / PS.dT : 2e-3)) return true; } return false; };
  /* arestes: retall en profunditat, filtre de corbes suaus i visibilitat per mostreig */
  const hmk = new Map(), hmark = e => { if (opt.hmode !== 'mark') return true; if (!e.path) return !!e.thru; const k = e.path.join('/'); let v = hmk.get(k); if (v == null) hmk.set(k, v = lnFlags(e.path).thru); return v; };
  const vis = [], hid = [], adjC = new Map(), step = Math.max(Math.hypot(bb.u1 - bb.u0, bb.v1 - bb.v0) / 1500, 0.01);
  const adjOf = c => { let m = adjC.get(c); if (!m) { m = new Map(); for (const f of c.faces.values()) for (const lp of [f.loop, ...f.holes]) for (let i = 0; i < lp.length; i++) { const a = lp[i], b = lp[(i + 1) % lp.length], k = a < b ? a + '_' + b : b + '_' + a; let l = m.get(k); if (!l) m.set(k, l = []); l.push(f.n); } adjC.set(c, m); } return m; };
  const zmin = vw.cut ? 0 : zdist(tris.reduce((m, t) => Math.min(m, t[0][2], t[1][2], t[2][2]), Infinity)), rear = [];
  for (const e of lnEdgeList()) {
    let n = []; if (!e.inter) { const ed = e.c.edges.get(e.id); if (!ed) continue; n = adjOf(e.c).get(ed.a < ed.b ? ed.a + '_' + ed.b : ed.b + '_' + ed.a) || []; }
    const DD = PS ? V.sub(V.lerp(e.a, e.b, 0.5), o) : D; if (n.length === 2 && V.dot(n[0], n[1]) > 0.9 && V.dot(n[0], DD) * V.dot(n[1], DD) >= 0) continue;
    let ea = e.a, eb = e.b; for (const pl of opt.boxP || []) { const f = q => pl.normal.x * q[0] + pl.normal.y * q[1] + pl.normal.z * q[2] + pl.constant, da = f(ea), db = f(eb); if (da < 0 && db < 0) { ea = null; break; } const L = t => [ea[0] + (eb[0] - ea[0]) * t, ea[1] + (eb[1] - ea[1]) * t, ea[2] + (eb[2] - ea[2]) * t]; if (da < 0) ea = L(da / (da - db)); else if (db < 0) eb = L(da / (da - db)); } if (!ea) continue;
    let a = pr(ea), b = pr(eb);
    if (PS) { let ok = true; for (const f of pclip) { const da = f(a), db = f(b); if (da < 0 && db < 0) { ok = false; break; } const L2 = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; if (da < 0) a = L2(da / (da - db)); else if (db < 0) b = L2(da / (da - db)); } if (!ok) continue; a = pz(a); b = pz(b); }
    if (vw.cut) { if (a[2] < lo && b[2] < lo || a[2] > hi && b[2] > hi) continue; const cl = (f) => { const da = f(a), db = f(b); if (da < 0 && db < 0) return false; if (da < 0) { const t = da / (da - db); a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; } else if (db < 0) { const t = da / (da - db); b = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; } return true; }; if (!cl(q => q[2]) || (isFinite(hi) && !cl(q => hi - q[2]))) continue; }
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 1e-5) continue; const ns = Math.max(1, Math.min(240, Math.ceil(len / step))); let s0 = 0, cur = null;
    for (let i = 0; i <= ns; i++) {
      const stt = i === ns ? null : (() => { const t = (i + 0.5) / ns; return hiddenAt(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); })();
      if (stt !== cur) { if (cur !== null) { const t0 = s0 / ns, t1 = i / ns; const sg = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, zdist(a[2] + (b[2] - a[2]) * t0) - zmin, zdist(a[2] + (b[2] - a[2]) * t1) - zmin]; if (!cur) vis.push(sg); else if (hmark(e)) hid.push(sg); } s0 = i; cur = stt; }
    }
  }
  for (const s of cutB) vis.push(s.concat([0, 0]));
  /* franges de llunyania: es parteix cada línia vista per les distàncies del joc */
  const LBd = { ln: S.style.ln, T: lnT(S.style.ln) }, vb = [[], [], [], []];
  for (const s of vis) { const da = s[4], db = s[5], ts = [0, 1]; for (const th of LBd.T) if ((da - th) * (db - th) < 0) ts.push((da - th) / (da - db)); ts.sort((x, y) => x - y);
    for (let i = 0; i + 1 < ts.length; i++) { if (ts[i + 1] - ts[i] < 1e-9) continue; const L = t => [s[0] + (s[2] - s[0]) * t, s[1] + (s[3] - s[1]) * t]; const p0 = L(ts[i]), p1 = L(ts[i + 1]); vb[lnBandOf(da + (db - da) * (ts[i] + ts[i + 1]) / 2, LBd)].push([p0[0], p0[1], p1[0], p1[1]]); } }
  /* reflexades: arestes entre el pla de tall i el fons indicat a la vista */
  if (vw.key.startsWith('plan') && S.style.ln.vis.D) { const lv = S.model.levels.find(x => String(x.id) === vw.key.split(':')[1]); const pv = lv ? vrOf(lv) : null;
    if (pv && pv.rear > 0) { const z0 = lv.elev + pv.cut, z1 = z0 + pv.rear;
      for (const e of lnEdgeList()) { let a = e.a, b = e.b; if (Math.max(a[2], b[2]) < z0 || Math.min(a[2], b[2]) > z1) continue; for (const [z, up] of [[z0, 1], [z1, -1]]) { const da = (a[2] - z) * up, db = (b[2] - z) * up; if (da < 0 && db < 0) { a = null; break; } if (da < 0) { const t = da / (da - db); a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; } else if (db < 0) { const t = da / (da - db); b = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; } }
        if (a) { const pa = pr(a), pb = pr(b); rear.push([pa[0], pa[1], pb[0], pb[1]]); } } } }
  for (const s of rear) { ext(s[0], s[1]); ext(s[2], s[3]); }
  for (const s of [...vis, ...cutOpen]) { ext(s[0], s[1]); ext(s[2], s[3]); } for (const c of cut) for (const l of c.loops) for (const q of l) ext(q[0], q[1]);
  if (!isFinite(bb.u0)) bb = { u0: 0, v0: 0, u1: 1, v1: 1 };
  /* anotacions: nivells en alçats i seccions, eixos de pilars en planta */
  const ann = { lines: [], texts: [] };
  if (vw.kind !== 'plan' && vw.kind !== '3d') for (const l of S.model.levels) { if (l.elev < bb.v0 - 3 || l.elev > bb.v1 + 3) continue; ann.lines.push([bb.u0 - 0.6, l.elev, bb.u1 + 0.6, l.elev]); ann.texts.push([bb.u1 + 0.7, l.elev, l.name + '  ' + fmtElev(l.elev)]); }
  else if (vw.key.startsWith('plan')) for (const g of S.model.grids) { const e = gridEnds(g), a = pr([e.a[0], e.a[1], o[2]]), b = pr([e.b[0], e.b[1], o[2]]); ann.lines.push([a[0], a[1], b[0], b[1]]); ann.texts.push([a[0] - e.d[0] * 0.35 - 0.1, a[1] - e.d[1] * 0.35 - 0.1, g.name]); }
  for (const s of ann.lines) { ext(s[0], s[1]); ext(s[2], s[3]); } for (const t of ann.texts) { ext(t[0], t[1]); ext(t[0] + 0.25 * t[2].length * (opt.scale || 100) / 100, t[1] + 0.3); }
  if (PS) bb = { u0: -PS.hH, v0: PS.sy - PS.hV, u1: PS.hH, v1: PS.sy + PS.hV };
  return { name: vw.name, cut, cutOpen, vis, vb, rear, hid: opt.hidden ? hid : [], ann, bb, persp: !!PS };
}
/* línies de ratllat dins d'uns contorns (regla parell-senar) */
function hatchLines(loops, sp, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), R = q => [q[0] * c + q[1] * s, -q[0] * s + q[1] * c], L = loops.map(l => l.map(R)), out = []; let y0 = Infinity, y1 = -Infinity;
  for (const l of L) for (const q of l) { if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
  for (let y = Math.ceil(y0 / sp) * sp + 1e-7; y < y1; y += sp) {
    const xs = []; for (const l of L) for (let i = 0; i < l.length; i++) { const a = l[i], b = l[(i + 1) % l.length]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])); }
    xs.sort((p, q) => p - q); for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i] * c - y * s, xs[i] * s + y * c, xs[i + 1] * c - y * s, xs[i + 1] * s + y * c]);
  }
  return out;
}
/* làmina: llista de primitives en mil·límetres de paper (Y amunt) */
function docSheet(keys, opt) {
  const N = opt.scale || 100, items = keys.map(k => { if (typeof k !== 'string') return pubDrawing(k); const v = docView(k); if (!v) return null; const d = drawing2D(v, { hidden: opt.hidden, scale: N, hmode: S.style.ed.hid }); d.sty = S.style; d.N = N; return d; }).filter(Boolean);
  if (!items.length) return null; for (const d of items) d.k = 1000 / d.N; const gap = 14, cap = 8, sz = d => [(d.bb.u1 - d.bb.u0) * d.k, (d.bb.v1 - d.bb.v0) * d.k];
  /* disposició en dues columnes */
  const cols = items.length > 1 ? 2 : 1, rows = Math.ceil(items.length / cols), cwid = [0, 0], rhei = new Array(rows).fill(0);
  items.forEach((d, i) => { const [w, h] = sz(d); cwid[i % cols] = Math.max(cwid[i % cols], w); rhei[Math.floor(i / cols)] = Math.max(rhei[Math.floor(i / cols)], h + cap); });
  const BK = opt.block, PA = opt.paper, mg = PA ? PA.mg : 10, bind = PA ? PA.bind || 0 : 0, strip = BK && BK.fill, tb = BK ? (strip ? 0 : BK.h + 4) : opt.tb ? 36 : 12, rw = strip ? BK.w + 4 : 0, needW = cwid[0] + (cols > 1 ? cwid[1] + gap : 0) + 2 * mg + 10 + bind + rw, needH = rhei.reduce((a, b) => a + b, 0) + gap * (rows - 1) + 2 * mg + tb + 10;
  const FMTS = [['A4', 297, 210], ['A3', 420, 297], ['A2', 594, 420], ['A1', 841, 594], ['A0', 1189, 841]], fmtP = (PA && [PA.name, PA.W, PA.H]) || (opt.fmt && FMTS.find(f => f[0] === opt.fmt)) || FMTS.find(f => f[1] >= needW && f[2] >= needH) || ['a mida', Math.ceil(needW), Math.ceil(needH)];
  const Wp = fmtP[1], Hp = fmtP[2], P = [], line = (x1, y1, x2, y2, w, col, layer, dash) => P.push({ t: 'l', x1, y1, x2, y2, w, col, layer, dash: dash || 0 });
  let yTop = Hp - mg - 5; const place = [];
  for (let r = 0; r < rows; r++) {
    let x = mg + bind + 5; const y = yTop - rhei[r];
    for (let cI = 0; cI < cols; cI++) {
      const d = items[r * cols + cI]; if (!d) continue; const [dw, dh] = sz(d), ps = opt.pos && d.pid != null && opt.pos[d.pid], ox = ps ? ps[0] : x, oy = ps ? ps[1] : y + cap, X = u => ox + (u - d.bb.u0) * d.k, Y = v => oy + (v - d.bb.v0) * d.k;
      const sty = d.sty || S.style, ln = sty.ln;
      if (ln.vis.A) for (const c of d.cut) {
        const loops = c.loops.map(l => l.map(q => [X(q[0]), Y(q[1])]));
        if (sty.sec.fill === 'solid') P.push({ t: 'p', loops, fill: sty.sec.color, layer: 'G-TALL-RATLLAT' });
        else if (sty.sec.fill === 'grey') P.push({ t: 'p', loops, fill: lnMix(sty.sec.color, sty.sec.bgc, sty.sec.tone), layer: 'G-TALL-RATLLAT' });
        else if (sty.sec.fill !== 'none') { const clip = c.clip.map(ls => ls.map(l => l.map(q => [X(q[0]), Y(q[1])]))); P.push({ t: 'p', loops, fill: sty.sec.bgc, layer: 'G-TALL-RATLLAT', nodxf: 1 }); for (const a of sty.sec.fill === 'cross' ? [Math.PI / 4, -Math.PI / 4] : [Math.PI / 4]) for (const h of lnClipSegs(hatchLines(loops, 1.6, a), clip)) line(h[0], h[1], h[2], h[3], 0.1, sty.sec.color, 'G-TALL-RATLLAT'); }
      }
      if (ln.vis.C) for (const s of d.hid) line(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), Math.max(0.05, ln.w.C), '#7A8089', 'G-OCULTA', 1);
      if (ln.vis.D) for (const s of d.rear) line(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), Math.max(0.05, ln.w.D), '#8A9099', 'G-REFLEX', 2);
      if (ln.vis.B) for (let bd = 0; bd < 4; bd++) for (const s of d.vb[bd]) line(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), Math.max(0.05, ln.w.B * ln.mult[bd]), bd ? lnMix(sty.ed.color, '#ffffff', LN_TONE[bd]) : sty.ed.color, bd ? 'G-LLUNY' + bd : 'G-VISTA');
      if (ln.vis.A) { for (const c of d.cut) for (const s of c.edges) line(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), Math.max(0.05, ln.w.A), sty.sec.lc, 'G-TALL'); for (const s of d.cutOpen) line(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), Math.max(0.05, ln.w.A), sty.sec.lc, 'G-TALL'); }
      if (ln.vis.S) for (const s of d.ann.lines) line(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), Math.max(0.05, ln.w.S), '#0E7C86', 'G-ANOT', 2);
      for (const t of d.ann.texts) P.push({ t: 't', x: X(t[0]), y: Y(t[1]) - 0.9, s: t[2], h: 2.5, col: '#0E7C86', layer: 'G-ANOT' });
      P.push({ t: 't', x: ox, y: oy - cap + 1.5, s: (d.annx && d.annx.label ? d.annx.label : d.name) + '   E 1:' + d.N, h: 3.2, col: '#000000', layer: 'G-MARC' }); place.push({ pid: d.pid, x: ox, y: oy, w: dw, h: dh - cap });
      const A = d.annx; if (A) {
        const x1 = ox + (d.bb.u1 - d.bb.u0) * d.k, y1 = oy + (d.bb.v1 - d.bb.v0) * d.k, ac = '#0E7C86', al = (a, b, c2, e) => line(a, b, c2, e, 0.18, ac, 'G-COTA');
        if (A.dims) { const yy = y1 + 5; al(ox, yy, x1, yy); for (const xx of [ox, x1]) { al(xx, yy - 1.5, xx, yy + 1.5); al(xx - 0.9, yy - 0.9, xx + 0.9, yy + 0.9); } P.push({ t: 't', x: (ox + x1) / 2 - 4, y: yy + 1, s: fmt(d.bb.u1 - d.bb.u0) + ' m', h: 2.5, col: ac, layer: 'G-COTA' });
          const xx = x1 + 5; al(xx, oy, xx, y1); for (const q of [oy, y1]) { al(xx - 1.5, q, xx + 1.5, q); al(xx - 0.9, q - 0.9, xx + 0.9, q + 0.9); } P.push({ t: 't', x: xx + 1.5, y: (oy + y1) / 2, s: fmt(d.bb.v1 - d.bb.v0) + ' m', h: 2.5, col: ac, layer: 'G-COTA' }); }
        if (A.north) { const cx = x1 - 6, cy = y1 - 8; line(cx, cy - 5, cx, cy + 5, 0.25, '#000000', 'G-ANOT'); line(cx - 2.5, cy - 2, cx, cy + 5, 0.25, '#000000', 'G-ANOT'); line(cx + 2.5, cy - 2, cx, cy + 5, 0.25, '#000000', 'G-ANOT'); P.push({ t: 't', x: cx - 1.1, y: cy + 6.5, s: 'N', h: 3, col: '#000000', layer: 'G-ANOT' }); }
        if (A.note) P.push({ t: 't', x: ox, y: oy - cap - 2.2, s: A.note, h: 2.3, col: '#333333', layer: 'G-ANOT' });
      }
      x += cwid[cI] + gap;
    }
    yTop = y - gap;
  }
  /* marc i caixetí */
  if (BK || PA) {
    const fw = PA ? PA.frame : 0.35, L = mg + bind; for (const [a, b, c, d2] of [[L, mg, Wp - mg, mg], [Wp - mg, mg, Wp - mg, Hp - mg], [Wp - mg, Hp - mg, L, Hp - mg], [L, Hp - mg, L, mg]]) line(a, b, c, d2, fw, '#000000', 'G-MARC');
    if (BK) { const r = tbRect(BK, Wp, Hp, mg, bind); tbPrims(BK, r.x, r.y, r.sy, tbData(BK.data, items, fmtP, Wp, Hp), P); }
    if (opt.lists && opt.lists.length && typeof docLists === 'function') docLists(opt.lists, BK ? tbRect(BK, Wp, Hp, mg, bind) : null, Wp, Hp, mg, P);
    else P.push({ t: 't', x: L + 3, y: mg + 3, s: baseName() + '  ·  ' + (opt.title || items[0].name), h: 2.6, col: '#000000', layer: 'G-MARC' });
  } else if (opt.tb) {
    const T = opt.tb, tpl = T.tpl || 'guaita', w = tpl === 'minim' ? 90 : 130, x0 = Wp - mg - w, y0 = mg, h = tb, txt = (x, y, s, hh, col) => P.push({ t: 't', x, y, s: String(s || ''), h: hh, col: col || '#000000', layer: 'G-CARATULA' });
    for (const [a, b, c, d2] of [[mg, mg, Wp - mg, mg], [Wp - mg, mg, Wp - mg, Hp - mg], [Wp - mg, Hp - mg, mg, Hp - mg], [mg, Hp - mg, mg, mg], [x0, y0, x0, y0 + h], [x0, y0 + h, Wp - mg, y0 + h]]) line(a, b, c, d2, 0.35, '#000000', 'G-MARC');
    const sc = 'Escala ' + (new Set(items.map(d => d.N)).size === 1 ? '1:' + items[0].N : 'indicada'), dt = T.date || new Date().toISOString().slice(0, 10);
    if (T.logo && T.logo.src) { const lh = 14, lw = Math.min(40, lh * T.logo.w / T.logo.h); P.push({ t: 'i', x: x0 - lw - 4, y: y0 + h - lh - 2, w: lw, h: lh, src: T.logo.src, pw: T.logo.w, ph: T.logo.h, layer: 'G-CARATULA' }); }
    if (tpl === 'minim') { line(x0, y0 + 14, Wp - mg, y0 + 14, 0.13, '#000000', 'G-CARATULA'); txt(x0 + 2, y0 + 22, T.title || opt.title || '', 4.2); txt(x0 + 2, y0 + 16.5, T.project || baseName(), 2.4); txt(x0 + 2, y0 + 3.5, sc + '   ·   ' + fmtP[0] + '   ·   ' + dt, 2.2); txt(x0 + 66, y0 + 3, T.num || '—', 6); }
    else if (tpl === 'etsab') { for (const yy of [y0 + 7, y0 + 14, y0 + 21, y0 + 28]) line(x0, yy, Wp - mg, yy, 0.13, '#000000', 'G-CARATULA'); line(x0 + 95, y0, x0 + 95, y0 + 14, 0.13, '#000000', 'G-CARATULA');
      txt(x0 + 2, y0 + 30.5, (T.school || 'ETSAB · UPC') + (T.course ? '   ·   ' + T.course : ''), 2.6); txt(x0 + 2, y0 + 23.5, T.project || baseName(), 3); txt(x0 + 2, y0 + 16, T.title || opt.title || '', 3.4); txt(x0 + 2, y0 + 9, (T.author || '') + '   ·   ' + dt, 2.3); txt(x0 + 2, y0 + 2.2, sc + '   ·   ' + fmtP[0], 2.3); txt(x0 + 98, y0 + 9, 'Làmina', 2); txt(x0 + 98, y0 + 2.2, T.num || '—', 4.4); }
    else {
    for (const yy of [y0 + 9, y0 + 18, y0 + 27]) line(x0, yy, Wp - mg, yy, 0.13, '#000000', 'G-CARATULA'); line(x0 + 95, y0, x0 + 95, y0 + 18, 0.13, '#000000', 'G-CARATULA');
    txt(x0 + 2, y0 + 29.5, T.project || baseName(), 3.2); txt(x0 + 2, y0 + 20.5, T.title || opt.title || '', 3.6);
    txt(x0 + 2, y0 + 11.5, 'Escala ' + (new Set(items.map(d => d.N)).size === 1 ? '1:' + items[0].N : 'indicada') + '   ·   ' + fmtP[0] + '   ·   ' + (T.date || new Date().toISOString().slice(0, 10)), 2.4);
    txt(x0 + 2, y0 + 2.5, (T.author || '') + (T.firm ? '   ·   ' + T.firm : ''), 2.2); txt(x0 + 98, y0 + 11.5, 'Núm.', 2); txt(x0 + 98, y0 + 3, T.num || '—', 5); }
    txt(mg + 3, mg + 2.5, 'guaitaBIMup ' + VERSION, 1.8, '#666666');
  } else {
  for (const [a, b, c, d2] of [[mg, mg, Wp - mg, mg], [Wp - mg, mg, Wp - mg, Hp - mg], [Wp - mg, Hp - mg, mg, Hp - mg], [mg, Hp - mg, mg, mg], [mg, mg + tb, Wp - mg, mg + tb]]) line(a, b, c, d2, 0.35, '#000000', 'G-MARC');
  P.push({ t: 't', x: mg + 3, y: mg + 4, s: baseName() + '  ·  ' + (opt.title || (items.length > 1 ? 'Làmina multivista' : items[0].name)) + '  ·  Escala ' + (new Set(items.map(d => d.N)).size === 1 ? '1:' + items[0].N : 'a cada vista') + '  ·  ' + fmtP[0] + '  ·  ' + new Date().toISOString().slice(0, 10) + '  ·  guaitaBIMup ' + VERSION + ' · SBS BIM Consulting', h: 3, col: '#000000', layer: 'G-MARC' });
  }
  return { W: Wp, H: Hp, fmt: fmtP[0], N, prims: P, items, place };
}
const DOC_DASH = [null, [1.2, 0.8], [3, 0.8, 0.5, 0.8]];
function sheetSVG(sh) {
  const f = x => +x.toFixed(3), H = sh.H, o = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + sh.W + 'mm" height="' + H + 'mm" viewBox="0 0 ' + sh.W + ' ' + H + '" stroke-linecap="round" font-family="Helvetica,Arial,sans-serif"><rect width="' + sh.W + '" height="' + H + '" fill="#fff"/>'];
  let key = '', buf = []; const flush = () => { if (buf.length) { const [w, col, dash] = key.split('|'); o.push('<path fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (+dash ? ' stroke-dasharray="' + DOC_DASH[+dash].join(' ') + '"' : '') + ' d="' + buf.join('') + '"/>'); buf = []; } };
  for (const p of sh.prims) {
    if (p.t === 'l') { const k = f(p.w) + '|' + p.col + '|' + p.dash; if (k !== key) { flush(); key = k; } buf.push('M' + f(p.x1) + ' ' + f(H - p.y1) + 'L' + f(p.x2) + ' ' + f(H - p.y2)); }
    else { flush(); key = ''; if (p.t === 'p') o.push('<path fill="' + p.fill + '" fill-rule="evenodd" stroke="none" d="' + p.loops.map(l => 'M' + l.map(q => f(q[0]) + ' ' + f(H - q[1])).join('L') + 'Z').join('') + '"/>'); else if (p.t === 'i') o.push('<image x="' + f(p.x) + '" y="' + f(H - p.y - p.h) + '" width="' + f(p.w) + '" height="' + f(p.h) + '" href="' + p.src + '" preserveAspectRatio="xMidYMid meet"/>'); else o.push('<text x="' + f(p.x) + '" y="' + f(H - p.y) + '" font-size="' + p.h + '" fill="' + p.col + '">' + esc(p.s) + '</text>'); }
  }
  flush(); o.push('</svg>'); return o.join('\n');
}
function sheetPDF(sh) {
  const K2 = 72 / 25.4, f = x => (+(x * K2).toFixed(2)).toString(), rgb = h => hexRGB(h).map(x => +x.toFixed(3)).join(' '), c = [], imgs = [];
  const wa = { 0x2019: 0x92, 0x2018: 0x91, 0x201C: 0x93, 0x201D: 0x94, 0x2013: 0x96, 0x2014: 0x97, 0x20AC: 0x80 }, txt = s => { let r = ''; for (const ch of s) { let n = ch.codePointAt(0); if (n > 255) n = wa[n] || 63; const cc = String.fromCharCode(n); r += cc === '(' || cc === ')' || cc === '\\' ? '\\' + cc : cc; } return r; };
  c.push('1 J 1 j');
  for (const p of sh.prims) {
    if (p.t === 'l') c.push(rgb(p.col) + ' RG ' + f(p.w) + ' w ' + (p.dash ? '[' + DOC_DASH[p.dash].map(f).join(' ') + '] 0 d ' : '[] 0 d ') + f(p.x1) + ' ' + f(p.y1) + ' m ' + f(p.x2) + ' ' + f(p.y2) + ' l S');
    else if (p.t === 'p') c.push(rgb(p.fill) + ' rg ' + p.loops.map(l => l.map((q, i) => f(q[0]) + ' ' + f(q[1]) + (i ? ' l' : ' m')).join(' ') + ' h').join(' ') + ' f*');
    else if (p.t === 'i') { if (/^data:image\/jpeg;base64,/.test(p.src)) { c.push('q ' + f(p.w) + ' 0 0 ' + f(p.h) + ' ' + f(p.x) + ' ' + f(p.y) + ' cm /Im' + imgs.length + ' Do Q'); imgs.push(p); } }
    else c.push('BT ' + rgb(p.col) + ' rg /F1 ' + f(p.h) + ' Tf ' + f(p.x) + ' ' + f(p.y) + ' Td (' + txt(p.s) + ') Tj ET');
  }
  const stream = c.join('\n'), objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f(sh.W) + ' ' + f(sh.H) + '] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >>' + (imgs.length ? ' /XObject << ' + imgs.map((q, i) => '/Im' + i + ' ' + (6 + i) + ' 0 R').join(' ') + ' >>' : '') + ' >> >>', '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  for (const q of imgs) { const bin = atob(q.src.split(',')[1]); objs.push('<< /Type /XObject /Subtype /Image /Width ' + q.pw + ' /Height ' + q.ph + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + bin.length + ' >>\nstream\n' + bin + '\nendstream'); }
  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offs = []; objs.forEach((b, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + b + '\nendobj\n'; });
  const xr = out.length; out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF\n';
  const u8 = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) u8[i] = out.charCodeAt(i) & 255; return u8;
}
function sheetDXF(sh) {
  const m = sh.N / 1000, f = x => (+(x * m).toFixed(5)).toString(), LY = [['G-TALL', 7, 'CONTINUOUS'], ['G-TALL-RATLLAT', 8, 'CONTINUOUS'], ['G-VISTA', 7, 'CONTINUOUS'], ['G-LLUNY1', 8, 'CONTINUOUS'], ['G-LLUNY2', 9, 'CONTINUOUS'], ['G-LLUNY3', 252, 'CONTINUOUS'], ['G-REFLEX', 8, 'DASHDOT'], ['G-OCULTA', 8, 'DASHED'], ['G-ANOT', 4, 'DASHDOT'], ['G-MARC', 7, 'CONTINUOUS'], ['G-COTA', 4, 'CONTINUOUS'], ['G-CARATULA', 7, 'CONTINUOUS']];
  const u = s => String(s).replace(/[^\x20-\x7e]/g, ch => '\\U+' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')), o = ['0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LTYPE', '70', '3',
    '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0',
    '0', 'LTYPE', '2', 'DASHED', '70', '0', '3', 'Dashed', '72', '65', '73', '2', '40', '0.15', '49', '0.1', '49', '-0.05',
    '0', 'LTYPE', '2', 'DASHDOT', '70', '0', '3', 'Dash dot', '72', '65', '73', '4', '40', '0.4', '49', '0.25', '49', '-0.06', '49', '0.0', '49', '-0.06', '0', 'ENDTAB', '0', 'TABLE', '2', 'LAYER', '70', String(LY.length)];
  for (const [n, c, lt] of LY) o.push('0', 'LAYER', '2', n, '70', '0', '62', String(c), '6', lt);
  o.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
  for (const p of sh.prims) {
    if (p.t === 'l') o.push('0', 'LINE', '8', p.layer, '10', f(p.x1), '20', f(p.y1), '30', '0.0', '11', f(p.x2), '21', f(p.y2), '31', '0.0');
    else if (p.t === 't') o.push('0', 'TEXT', '8', p.layer, '10', f(p.x), '20', f(p.y), '30', '0.0', '40', f(p.h), '1', u(p.s));
    else if (p.t === 'p' && !p.nodxf) for (const l of p.loops) { o.push('0', 'POLYLINE', '8', p.layer, '66', '1', '70', '1'); for (const q of l) o.push('0', 'VERTEX', '8', p.layer, '10', f(q[0]), '20', f(q[1]), '30', '0.0'); o.push('0', 'SEQEND'); }
  }
  o.push('0', 'ENDSEC', '0', 'EOF'); return o.join('\n') + '\n';
}
function docDlg(key0) {
  const views = docViews(), st0 = { key: key0 && views.some(v => v[0] === key0) ? key0 : (S.view && views.some(v => v[0] === S.view) ? S.view : 'multi'), scale: 100, hidden: S.style.ed.hid !== 'off' };
  $('dlgBox').innerHTML = '<h3>Document 2D</h3><div class="kv"><span>Vista</span><select id="dcV">' + views.map(v => '<option value="' + v[0] + '"' + (v[0] === st0.key ? ' selected' : '') + '>' + esc(v[1]) + '</option>').join('') + '</select>'
    + '<span>Escala</span><select id="dcS">' + [20, 50, 100, 200, 500].map(n => '<option value="' + n + '"' + (n === 100 ? ' selected' : '') + '>1:' + n + '</option>').join('') + '</select>'
    + '<span>Arestes ocultes a traços</span><input type="checkbox" id="dcH"' + (st0.hidden ? ' checked' : '') + '></div>'
    + '<p class="dim" id="dcInfo" style="margin:8px 0"></p><div id="dcPrev" style="border:1px solid var(--line);background:#fff;height:300px;overflow:hidden;display:grid;place-items:center"></div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn" id="dcX">Tanca</button><button class="btn" id="dcDXF">DXF</button><button class="btn" id="dcSVG">SVG</button><button class="btn acc" id="dcPDF">PDF</button></div>';
  $('dlg').classList.add('show'); let sh = null;
  const keys = () => { const k = $('dcV').value; if (k !== 'multi') return [k]; const L = S.model.levels.find(l => l.id === S.level) || S.model.levels[0], a = []; if (L) a.push('plan:' + L.id); const sc = views.find(v => v[0].startsWith('cut:') || v[0].startsWith('sec:')); a.push(sc ? sc[0] : 'elev:N'); a.push('elev:S', 'elev:E'); return a; };
  const upd = () => { sh = docSheet(keys(), { scale: +$('dcS').value, hidden: $('dcH').checked }); if (!sh) { $('dcInfo').textContent = 'No hi ha res per dibuixar.'; return; }
    $('dcInfo').textContent = 'Full ' + sh.fmt + ' (' + sh.W + ' × ' + sh.H + ' mm) · ' + sh.prims.filter(p => p.t === 'l').length + ' línies · gruixos, colors i ratllat segons l’estil «' + S.style.name + '».';
    $('dcPrev').innerHTML = sheetSVG(sh).replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'style="max-width:100%;max-height:300px"'); };
  $('dcV').onchange = $('dcS').onchange = $('dcH').onchange = upd; upd();
  const nm = () => baseName() + '-' + ($('dcV').value === 'multi' ? 'lamina' : $('dcV').selectedOptions[0].textContent.replace(/[^\wÀ-ÿ]+/g, '_'));
  $('dcX').onclick = () => $('dlg').classList.remove('show');
  $('dcSVG').onclick = () => sh && deliver(nm() + '.svg', sheetSVG(sh), 'image/svg+xml'); $('dcPDF').onclick = () => sh && deliver(nm() + '.pdf', sheetPDF(sh), 'application/pdf'); $('dcDXF').onclick = () => sh && deliver(nm() + '.dxf', sheetDXF(sh), 'application/dxf');
}

/* ============ v0.49 · caràtula com a bloc de dibuix independent del full ============ */
/* posició del bloc dins el full: ancoratge + franja estirada */
function tbRect(B, W, H, mg, bind) {
  const L = mg + (bind || 0), R = W - mg, T = H - mg, Bt = mg, a = B.anchor || 'br';
  if (B.fill) { const h = T - Bt; return { x: a === 'l' ? L : R - B.w, y: Bt, w: B.w, h, sy: h / B.h }; }
  return { x: a[1] === 'l' ? L : R - B.w, y: a[0] === 't' ? T - B.h : Bt, w: B.w, h: B.h, sy: 1 };
}
function tbData(D, items, fmtP, W, H) {
  const sc = items && items.length ? (new Set(items.map(d => d.N)).size === 1 ? '1:' + items[0].N : 'indicada') : '', P = (D && D.proj) || {}, Sh = (D && D.sheet) || {}, o = {};
  for (const [k, v] of Object.entries(P)) if (k !== 'logo' && k !== 'extra') o['projecte.' + k] = v; for (const [k, v] of (P.extra || [])) if (k) o['projecte.' + k] = v;
  for (const [k, v] of Object.entries(Sh)) if (typeof v !== 'object') o['planol.' + k] = v;
  o['planol.escala'] = sc; o['planol.full'] = fmtP ? fmtP[0] + ' (' + Math.round(W) + '×' + Math.round(H) + ')' : ''; o['planol.format'] = fmtP ? fmtP[0] : '';
  if (!o['planol.data']) o['planol.data'] = new Date().toISOString().slice(0, 10); o['app'] = 'guaitaBIMup ' + VERSION; o._logo = P.logo || null; o._N = items && items.length ? items[0].N : 100; return o;
}
const tbText = (s, D) => String(s || '').replace(/\{([\w.]+)\}/g, (m, k) => D[k] != null && D[k] !== '' ? String(D[k]) : '');
/* items en mm locals (origen a baix a l'esquerra del bloc) → primitives */
function tbPrims(B, ox, oy, sy, D, P) {
  const X = x => ox + x, Y = y => oy + y * sy, L = (a, b, c, d, w) => P.push({ t: 'l', x1: X(a), y1: Y(b), x2: X(c), y2: Y(d), w: w || 0.18, col: '#000000', layer: 'G-CARATULA', dash: 0 });
  for (const it of B.items || []) {
    if (it.t === 'line') L(it.x, it.y, it.x2, it.y2, it.lw);
    else if (it.t === 'rect') { L(it.x, it.y, it.x + it.w, it.y, it.lw); L(it.x + it.w, it.y, it.x + it.w, it.y + it.h, it.lw); L(it.x + it.w, it.y + it.h, it.x, it.y + it.h, it.lw); L(it.x, it.y + it.h, it.x, it.y, it.lw); }
    else if (it.t === 'text') { const s = tbText(it.s, D); if (s) P.push({ t: 't', x: X(it.x), y: Y(it.y), s, h: it.fs || 2.5, col: it.col || '#000000', layer: 'G-CARATULA' }); }
    else if (it.t === 'logo') { const lg = D._logo; if (lg && lg.src) { const k = Math.min(it.w / lg.w, it.h * sy / lg.h), w = lg.w * k, h = lg.h * k; P.push({ t: 'i', x: X(it.x) + (it.w - w) / 2, y: Y(it.y) + (it.h * sy - h) / 2, w, h, src: lg.src, pw: lg.w, ph: lg.h, layer: 'G-CARATULA' }); } }
    else if (it.t === 'north') { const r = (it.w || 10) / 2, cx = X(it.x) + r, cy = Y(it.y) + r; for (let i = 0; i < 24; i++) { const a0 = i / 24 * 2 * Math.PI, a1 = (i + 1) / 24 * 2 * Math.PI; P.push({ t: 'l', x1: cx + r * Math.cos(a0), y1: cy + r * Math.sin(a0), x2: cx + r * Math.cos(a1), y2: cy + r * Math.sin(a1), w: 0.18, col: '#000000', layer: 'G-CARATULA', dash: 0 }); }
      for (const [a, b, c, d] of [[cx, cy - r * 0.8, cx, cy + r * 0.8], [cx - r * 0.45, cy - r * 0.3, cx, cy + r * 0.8], [cx + r * 0.45, cy - r * 0.3, cx, cy + r * 0.8]]) P.push({ t: 'l', x1: a, y1: b, x2: c, y2: d, w: 0.3, col: '#000000', layer: 'G-CARATULA', dash: 0 }); P.push({ t: 't', x: cx - r * 0.22, y: cy + r + 0.8, s: 'N', h: r * 0.6, col: '#000000', layer: 'G-CARATULA' }); }
    else if (it.t === 'scalebar') { const N = D._N || 100, mmPerM = 1000 / N, nice = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500]; let step = nice.find(s => s * mmPerM * 4 <= it.w && s * mmPerM * 5 > it.w / 2) || nice.filter(s => s * mmPerM * 4 <= it.w).pop() || 0.5; const seg = step * mmPerM, x0 = X(it.x), y0 = Y(it.y), h = 1.6;
      for (let i = 0; i < 4; i++) { const a = x0 + i * seg; P.push({ t: 'l', x1: a, y1: y0, x2: a + seg, y2: y0, w: 0.25, col: '#000000', layer: 'G-CARATULA', dash: 0 }, { t: 'l', x1: a, y1: y0 + h, x2: a + seg, y2: y0 + h, w: 0.25, col: '#000000', layer: 'G-CARATULA', dash: 0 }); if (i % 2 === 0) P.push({ t: 'p', loops: [[[a, y0], [a + seg, y0], [a + seg, y0 + h], [a, y0 + h]]], fill: '#000000', layer: 'G-CARATULA' }); }
      for (let i = 0; i <= 4; i++) { const a = x0 + i * seg; P.push({ t: 'l', x1: a, y1: y0, x2: a, y2: y0 + h, w: 0.2, col: '#000000', layer: 'G-CARATULA', dash: 0 }); P.push({ t: 't', x: a - 0.8, y: y0 + h + 1, s: String(+(i * step).toFixed(2)), h: 1.8, col: '#000000', layer: 'G-CARATULA' }); }
      P.push({ t: 't', x: x0 + 4 * seg + 2, y: y0 + h + 1, s: 'm', h: 1.8, col: '#000000', layer: 'G-CARATULA' }); }
  }
}
/* plantilles (mm locals) */
function tbTemplate(k) {
  const T = (x, y, s, fs) => ({ t: 'text', x, y, s, fs }), Ln = (x, y, x2, y2, lw) => ({ t: 'line', x, y, x2, y2, lw: lw || 0.18 }), R = (x, y, w, h, lw) => ({ t: 'rect', x, y, w, h, lw: lw || 0.35 });
  if (k === 'minim') return { w: 100, h: 24, anchor: 'br', fill: false, items: [R(0, 0, 100, 24), Ln(0, 12, 100, 12), Ln(70, 0, 70, 12), T(2, 16, '{planol.titol}', 4), T(2, 13.5, '{projecte.projecte}', 1.9), T(2, 7, 'Escala {planol.escala}  ·  {planol.format}', 2.2), T(2, 2.5, '{planol.data}', 2), T(72, 3.5, '{planol.numero}', 6)] };
  if (k === 'etsab') return { w: 180, h: 45, anchor: 'br', fill: false, items: [R(0, 0, 180, 45), Ln(0, 36, 180, 36), Ln(0, 27, 135, 27), Ln(0, 18, 135, 18), Ln(0, 9, 180, 9), Ln(135, 9, 135, 36), { t: 'logo', x: 137, y: 11, w: 41, h: 23 },
    T(2, 39, '{projecte.escola}   ·   {projecte.curs}', 2.8), T(2, 30, '{projecte.projecte}', 3.2), T(2, 21, '{planol.titol}', 3.6), T(2, 12, '{projecte.autor}   ·   {planol.data}', 2.4), T(2, 3, 'Escala {planol.escala}   ·   {planol.full}', 2.4), T(137, 3, 'Làmina {planol.numero}', 3.6), { t: 'scalebar', x: 80, y: 2.5, w: 50 }] };
  if (k === 'franja') return { w: 45, h: 277, anchor: 'r', fill: true, items: [R(0, 0, 45, 277, 0.35), Ln(0, 60, 45, 60), Ln(0, 40, 45, 40), Ln(0, 20, 45, 20), Ln(0, 250, 45, 250), { t: 'logo', x: 3, y: 253, w: 39, h: 21 }, T(2, 243, '{projecte.projecte}', 3.2), T(2, 238, '{projecte.emplacament}', 2.2), T(2, 232, '{projecte.client}', 2.2),
    { t: 'north', x: 15, y: 205, w: 14 }, T(2, 52, '{planol.titol}', 3), T(2, 45, 'Rev. {planol.revisio}  ·  {planol.fase}', 2.2), T(2, 33, 'Escala {planol.escala}', 2.4), { t: 'scalebar', x: 2, y: 24, w: 40 }, T(2, 13, '{projecte.estudi}', 2.2), T(2, 9, '{projecte.autor}', 2), T(2, 3, '{planol.data}', 2), T(28, 3, '{planol.numero}', 5)] };
  return { w: 180, h: 40, anchor: 'br', fill: false, items: [R(0, 0, 180, 40), Ln(0, 31, 180, 31), Ln(0, 22, 140, 22), Ln(0, 13, 180, 13), Ln(0, 6, 140, 6), Ln(140, 0, 140, 31), { t: 'logo', x: 142, y: 15, w: 36, h: 14 },
    T(2, 34, '{projecte.projecte}  ·  {projecte.emplacament}', 3.2), T(2, 25, '{planol.titol}', 3.8), T(2, 16, 'Client: {projecte.client}', 2.4), T(2, 8.5, 'Escala {planol.escala}   ·   {planol.full}   ·   Rev. {planol.revisio}', 2.2), T(2, 2, '{projecte.autor}  ·  {projecte.estudi}  ·  {planol.data}', 2), T(142, 8, 'Núm.', 2), T(142, 2, '{planol.numero}', 5), T(142, 34, '{app}', 1.8)] };
}
