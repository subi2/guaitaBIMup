/* ============================================================
   v0.42 · sistema de línies per geometria i projecció:
   A secció · B projectada · C oculta · D reflexada · S símbol
   + graus de llunyania (E1–E3) i unió / retall de seccions entre
   cossos. Pantalla (GPU) i dibuix 2D comparteixen el motor.
   ============================================================ */
const LN_PX = 4, LN_TONE = [1, 0.72, 0.5, 0.32], LN_EPS = 2e-4;
const LN_PRESETS = [
  ['ISO', { A: 0.5, B: 0.25, C: 0.18, D: 0.18, S: 0.13 }, [1, 0.8, 0.6, 0.4]],
  ['Esbós', { A: 0.7, B: 0.35, C: 0.25, D: 0.25, S: 0.18 }, [1, 0.9, 0.75, 0.6]],
  ['Tècnic', { A: 0.35, B: 0.35, C: 0.35, D: 0.35, S: 0.25 }, [1, 1, 0.8, 0.6]],
  ['Contrast', { A: 0.8, B: 0.35, C: 0.25, D: 0.25, S: 0.13 }, [1, 0.7, 0.5, 0.3]],
];
const LN_NAMES = { A: 'Secció', B: 'Projectada', C: 'Oculta', D: 'Reflexada', S: 'Símbol' };
const LN_DESC = { A: 'Tallada pel pla del quadre', B: 'Darrere el pla, visible', C: 'Tapada per un altre cos', D: 'Darrere l’observador', S: 'Trencaments, eixos: no és aresta' };
const lnPx = mm => Math.max(0.7, mm * LN_PX);
const lnProf = () => { const e = S.style.ed; return e.wp > e.w ? e.wp / e.w : 1; };
function lnMix(c1, c2, k) { const a = new THREE.Color(c1), b = new THREE.Color(c2); return '#' + a.lerp(b, 1 - k).getHexString(); }
function lnBandRGB(base, bd) { const t = LN_TONE[bd], g = new THREE.Color(styleBgColor()); return [base[0] * t + g.r * (1 - t), base[1] * t + g.g * (1 - t), base[2] * t + g.b * (1 - t)]; }
function lnSets() { const m = S.model.meta; if (!Array.isArray(m.lineSets)) m.lineSets = []; return m.lineSets; }
function lnAllSets() { return [...LN_PRESETS.map(p => ({ name: p[0], w: p[1], mult: p[2] })), ...lnSets()]; }

/* ---------- pool de materials per grau ---------- */
const LN_MATS = new Map(); let LN_CTX, LN_J, LN_CONT = [], LN_ADJ = new Map();
const matLineCutB = lineMat({ color: 0x1B1D21, linewidth: 1 });
const sceneR = new THREE.Scene(), gRef = new THREE.Group(); sceneR.add(gRef);
const matRef = lineMat({ color: 0x5B6068, linewidth: 1, dashed: true, dashSize: 0.35, gapSize: 0.12, depthTest: false, depthWrite: false });
function lnPoolReset() {
  for (const m of LN_MATS.values()) { const i = LINE_MATS.indexOf(m); if (i >= 0) LINE_MATS.splice(i, 1); m.dispose(); } LN_MATS.clear(); LN_CTX = undefined; LN_J = undefined; LN_CONT = []; LN_ADJ = new Map();
  const ln = S.style.ln; matRef.linewidth = lnPx(ln.w.D); matRef.color.set(lnMix('#4A4F57', styleBgColor(), 0.9));
}
function lnMat(kind, bd) {
  const k = kind + bd; let m = LN_MATS.get(k); if (m) return m;
  const s = S.style, ln = s.ln, mult = ln.mult[bd] == null ? 1 : ln.mult[bd], w = lnPx(ln.w[kind === 'h' ? 'C' : 'B'] * mult) * (kind === 'p' ? lnProf() : 1);
  if (kind === 'h') m = lineMat({ color: lnMix('#7A8089', styleBgColor(), LN_TONE[bd]), linewidth: w, dashed: s.ed.hid !== 'grey', dashSize: 0.12, gapSize: 0.08, depthFunc: THREE.GreaterDepth, depthWrite: false });
  else m = lineMat({ vertexColors: true, linewidth: w });
  m.resolution.set(view.clientWidth || 1, view.clientHeight || 1); LN_MATS.set(k, m); return m;
}

/* ---------- referència de distància (graus de llunyania) ---------- */
function lnRef() {
  const k = S.view || '';
  if (viewClipsEff().length && /^(plan|sec|bsec):/.test(k)) { const p = viewClipsEff()[0]; return { n: [p.normal.x, p.normal.y, p.normal.z], c: p.constant }; }
  if (k.startsWith('elev:')) {
    const e = ELEVS.find(x => x[0] === k.slice(5)); if (!e) return null; const n = [-Math.cos(e[2]), -Math.sin(e[2]), 0], b = modelBox(); let mn = Infinity;
    for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) mn = Math.min(mn, n[0] * x + n[1] * y); return { n, c: -mn };
  }
  return null;
}
function lnT(ln) { const T = [ln.d0, ln.d[0], ln.d[1], ln.d[2]]; for (let i = 1; i < 4; i++) if (T[i] < T[i - 1]) T[i] = T[i - 1]; return T; }
function lnCtx() {
  if (LN_CTX !== undefined) return LN_CTX; const ln = S.style.ln, R = lnRef();
  if (!R) return (LN_CTX = null);
  return (LN_CTX = { R, ln, T: lnT(ln) });
}
function lnBandOf(dist, LB) { let b = 3; for (let i = 0; i < 4; i++) if (dist <= LB.T[i]) { b = i; break; } while (b > 0 && !LB.ln.eOn[b - 1]) b--; return b; }
/* parteix un segment per les franges de llunyania: [[a, b, grau], …] */
function lnSplit(A, B, LB) {
  if (!LB) return [[A, B, 0]];
  const R = LB.R, da = R.n[0] * A[0] + R.n[1] * A[1] + R.n[2] * A[2] + R.c, db = R.n[0] * B[0] + R.n[1] * B[1] + R.n[2] * B[2] + R.c, ts = [0, 1];
  for (const th of LB.T) if ((da - th) * (db - th) < 0) ts.push((da - th) / (da - db));
  ts.sort((x, y) => x - y); const out = [], L = t => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
  for (let i = 0; i + 1 < ts.length; i++) { if (ts[i + 1] - ts[i] < 1e-9) continue; out.push([L(ts[i]), L(ts[i + 1]), lnBandOf(da + (db - da) * (ts[i] + ts[i + 1]) / 2, LB)]); }
  return out.length ? out : [[A, B, 0]];
}

/* ---------- propietats d'element (heretades pels fills) ---------- */
function lnFlags(path) {
  let c = S.model.root, cut = null, thru = false, prio = 0, nj = false, comp = false;
  for (const id of path) { c = c.groups.get(id); if (!c) break; if (c.cut != null) cut = c.cut; if (c.thru) thru = true; if (c.prio) prio = c.prio; if (c.nojoin) nj = true; if (c.par && c.par.type === 'comp') comp = true; }
  return { cut: cut != null ? cut : !comp, thru, prio, nj };
}
function lnMatOf(c) { const cnt = new Map(); for (const f of c.faces.values()) cnt.set(f.mat, (cnt.get(f.mat) || 0) + 1); let best = null, bn = -1; for (const [k, n] of cnt) if (n > bn) { best = k; bn = n; } return best == null ? -1 : best; }
function lnWatertight(c) {
  const cnt = new Map(); let nf = 0;
  for (const f of c.faces.values()) { nf++; for (const lp of [f.loop, ...f.holes]) for (let i = 0; i < lp.length; i++) { const a = lp[i], b = lp[(i + 1) % lp.length], k = a < b ? a + '_' + b : b + '_' + a; cnt.set(k, (cnt.get(k) || 0) + 1); } }
  if (nf < 4) return false; for (const n of cnt.values()) if (n !== 2) return false; return true;
}

/* ---------- motor 2D: contorns, orientació, unió i retall ---------- */
const lnBasis = n => { const u = Math.abs(n[2]) > 0.99 ? [1, 0, 0] : V.norm(V.cross(n, [0, 0, 1])); return [u, V.cross(n, u)]; };
function lnChain(segs) {
  const rk = q => Math.round(q[0] * 1e4) + ',' + Math.round(q[1] * 1e4), adj = new Map(), used = new Array(segs.length).fill(false), loops = [], open = [];
  const add = (k, i) => { let l = adj.get(k); if (!l) adj.set(k, l = []); l.push(i); }, P = (s, e) => e ? [s[2], s[3]] : [s[0], s[1]];
  segs.forEach((s, i) => { if (rk(P(s, 0)) === rk(P(s, 1))) { used[i] = true; return; } add(rk(P(s, 0)), i); add(rk(P(s, 1)), i); });
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue; used[i] = true; const pts = [P(segs[i], 0), P(segs[i], 1)], k0 = rk(pts[0]); let closed = false;
    for (;;) { const kc = rk(pts[pts.length - 1]); if (kc === k0 && pts.length > 2) { pts.pop(); closed = true; break; } const nx = (adj.get(kc) || []).find(j => !used[j]); if (nx == null) break; used[nx] = true; pts.push(rk(P(segs[nx], 0)) === kc ? P(segs[nx], 1) : P(segs[nx], 0)); }
    if (closed && pts.length >= 3) loops.push(pts); else for (let k = 0; k + 1 < pts.length; k++) open.push([pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]]);
  }
  return { loops, open };
}
function lnPip(p, polys) { let c = false; for (const l of polys) for (let i = 0, j = l.length - 1; i < l.length; j = i++) { const a = l[i], b = l[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
/* exteriors en sentit antihorari i forats en horari: l'interior queda sempre a l'esquerra */
function lnOrient(loops) {
  const area = l => { let a = 0; for (let i = 0; i < l.length; i++) { const p = l[i], q = l[(i + 1) % l.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
  return loops.map((l, i) => { let d = 0; for (let j = 0; j < loops.length; j++) if (j !== i && lnPip(l[0], [loops[j]])) d++; return (area(l) > 0) === (d % 2 === 0) ? l : l.slice().reverse(); });
}
const lnLoopSegs = loops => { const o = []; for (const l of loops) for (let i = 0; i < l.length; i++) { const a = l[i], b = l[(i + 1) % l.length]; o.push([a[0], a[1], b[0], b[1]]); } return o; };
function lnSplitSeg(s, polys) {
  const x1 = s[0], y1 = s[1], dx = s[2] - x1, dy = s[3] - y1, L2 = dx * dx + dy * dy, ts = [0, 1]; if (L2 < 1e-12) return [s];
  for (const l of polys) for (let i = 0; i < l.length; i++) {
    const a = l[i], b = l[(i + 1) % l.length], ex = b[0] - a[0], ey = b[1] - a[1], den = dx * ey - dy * ex;
    if (Math.abs(den) > 1e-12) { const t = ((a[0] - x1) * ey - (a[1] - y1) * ex) / den, u = ((a[0] - x1) * dy - (a[1] - y1) * dx) / den; if (t > 1e-9 && t < 1 - 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) ts.push(t); }
    const t = ((a[0] - x1) * dx + (a[1] - y1) * dy) / L2; if (t > 1e-9 && t < 1 - 1e-9) { const px = x1 + dx * t - a[0], py = y1 + dy * t - a[1]; if (px * px + py * py < LN_EPS * LN_EPS) ts.push(t); }
  }
  ts.sort((p, q) => p - q); const out = []; for (let i = 0; i + 1 < ts.length; i++) if (ts[i + 1] - ts[i] > 1e-9) out.push([x1 + dx * ts[i], y1 + dy * ts[i], x1 + dx * ts[i + 1], y1 + dy * ts[i + 1]]);
  return out.length ? out : [s];
}
/* 0 fora · 1 dins · 2 sobre el contorn, mateix sentit · 3 sobre el contorn, sentit contrari */
function lnClass(pc, loops) {
  const mx = (pc[0] + pc[2]) / 2, my = (pc[1] + pc[3]) / 2, dx = pc[2] - pc[0], dy = pc[3] - pc[1], dl = Math.hypot(dx, dy) || 1;
  for (const l of loops) for (let i = 0; i < l.length; i++) {
    const a = l[i], b = l[(i + 1) % l.length], ex = b[0] - a[0], ey = b[1] - a[1], el2 = ex * ex + ey * ey || 1, t = Math.max(0, Math.min(1, ((mx - a[0]) * ex + (my - a[1]) * ey) / el2)), qx = a[0] + ex * t - mx, qy = a[1] + ey * t - my;
    if (qx * qx + qy * qy < LN_EPS * LN_EPS && Math.abs(dx * ey - dy * ex) / (dl * Math.sqrt(el2)) < 1e-3) return dx * ex + dy * ey > 0 ? 2 : 3;
  }
  return lnPip([mx, my], loops) ? 1 : 0;
}
const lnBBox = loops => { const b = { u0: Infinity, v0: Infinity, u1: -Infinity, v1: -Infinity }; for (const l of loops) for (const q of l) { b.u0 = Math.min(b.u0, q[0]); b.u1 = Math.max(b.u1, q[0]); b.v0 = Math.min(b.v0, q[1]); b.v1 = Math.max(b.v1, q[1]); } return b; };
const lnBBo = (a, b) => a.u0 <= b.u1 + 1e-6 && b.u0 <= a.u1 + 1e-6 && a.v0 <= b.v1 + 1e-6 && b.v0 <= a.v1 + 1e-6;
/* E: [{loops, solid, mat, prio, nj}] amb loops orientats. Omple e.edges (contorn visible) i e.clip (regions que ratllen altres). */
function lnResolve(E) {
  E.forEach(e => { e.bb = lnBBox(e.loops); e.edges = lnLoopSegs(e.loops); e.clip = []; });
  const dom = (j, i) => E[j].mat === E[i].mat ? j < i : (E[j].prio > E[i].prio || (E[j].prio === E[i].prio && j < i));
  E.forEach((e, i) => {
    let pcs = e.edges;
    for (let j = 0; j < E.length; j++) {
      const o = E[j]; if (j === i || e.nj || o.nj || !e.solid || !o.solid || !lnBBo(e.bb, o.bb)) continue;
      const same = o.mat === e.mat, d = dom(j, i); if (d) e.clip.push(o.loops);
      const out = []; for (const pc of pcs) for (const sp of lnSplitSeg(pc, o.loops)) { const c = lnClass(sp, o.loops); if (c === 0 || (c === 2 ? !d : !same && !d)) out.push(sp); }
      pcs = out;
    }
    e.edges = pcs;
  });
  return E;
}
/* retalla segments (p. ex. ratllat) per les regions que els dominen */
function lnClipSegs(segs, regions) {
  let cur = segs;
  for (const loops of regions) { const out = []; for (const s of cur) for (const sp of lnSplitSeg(s, loops)) if (!lnPip([(sp[0] + sp[2]) / 2, (sp[1] + sp[3]) / 2], loops)) out.push(sp); cur = out; }
  return cur;
}

/* ---------- línies de tall a pantalla ---------- */
function lnCutLines(pls) {
  const A = [], B = [], eps = 0.0008;
  for (const pl of pls) {
    const nrm = [pl.normal.x, pl.normal.y, pl.normal.z], [u, v] = lnBasis(nrm), o = V.mul(nrm, -pl.constant), groups = new Map();
    const to2 = p => [p[0] * u[0] + p[1] * u[1] + p[2] * u[2], p[0] * v[0] + p[1] * v[1] + p[2] * v[2]], to3 = (x, y) => [o[0] + u[0] * x + v[0] * y + nrm[0] * eps, o[1] + u[1] * x + v[1] * y + nrm[1] * eps, o[2] + u[2] * x + v[2] * y + nrm[2] * eps];
    for (const m of pickMeshes) {
      if (m.userData.back) continue; const p = m.geometry.attributes.position.array, key = m.userData.path.join('/'); let g = groups.get(key); if (!g) groups.set(key, g = { m, segs: [] });
      for (let i = 0; i < p.length; i += 9) {
        const d0 = nrm[0] * p[i] + nrm[1] * p[i + 1] + nrm[2] * p[i + 2] + pl.constant, d1 = nrm[0] * p[i + 3] + nrm[1] * p[i + 4] + nrm[2] * p[i + 5] + pl.constant, d2 = nrm[0] * p[i + 6] + nrm[1] * p[i + 7] + nrm[2] * p[i + 8] + pl.constant;
        if ((d0 > 0) === (d1 > 0) && (d1 > 0) === (d2 > 0)) continue; const q = [];
        for (const [a, b, da, db] of [[i, i + 3, d0, d1], [i + 3, i + 6, d1, d2], [i + 6, i, d2, d0]]) if ((da > 0) !== (db > 0)) { const t = da / (da - db); q.push(to2([p[a] + (p[b] - p[a]) * t, p[a + 1] + (p[b + 1] - p[a + 1]) * t, p[a + 2] + (p[b + 2] - p[a + 2]) * t])); }
        if (q.length === 2) g.segs.push([q[0][0], q[0][1], q[1][0], q[1][1]]);
      }
    }
    const E = [], put = (arr, s) => arr.push(...to3(s[0], s[1]), ...to3(s[2], s[3]));
    for (const g of groups.values()) {
      if (!g.segs.length) continue; const fl = lnFlags(g.m.userData.path);
      if (!fl.cut) { for (const s of g.segs) put(B, s); continue; }
      const ch = lnChain(g.segs);
      if (ch.loops.length && !ch.open.length && lnWatertight(g.m.userData.c)) E.push({ loops: lnOrient(ch.loops), solid: true, mat: lnMatOf(g.m.userData.c), prio: fl.prio, nj: fl.nj });
      else { for (const s of lnLoopSegs(ch.loops)) put(A, s); for (const s of ch.open) put(A, s); }
    }
    lnResolve(E); for (const e of E) for (const s of e.edges) put(A, s);
  }
  return { A, B };
}

/* ---------- reflexades (D): arestes darrere l'observador d'una planta ---------- */
function lnRefBuild() {
  disposeGroup(gRef); const k = S.view || ''; if (!k.startsWith('plan:') || !planCutOn()) return;
  const l = S.model.levels.find(x => String(x.id) === k.slice(5)); if (!l) return; const ln = S.style.ln, pv = vrOf(l); if (!(pv.rear > 0) || !ln.vis.D) return;
  const z0 = l.elev + pv.cut, z1 = z0 + pv.rear, pos = [];
  for (const e of SNAP.edges) {
    let a = e.a, b = e.b; if (Math.max(a[2], b[2]) < z0 || Math.min(a[2], b[2]) > z1) continue;
    for (const [z, up] of [[z0, 1], [z1, -1]]) { const da = (a[2] - z) * up, db = (b[2] - z) * up; if (da < 0 && db < 0) { a = null; break; } if (da < 0) { const t = da / (da - db); a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; } else if (db < 0) { const t = da / (da - db); b = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; } }
    if (a) pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
  if (pos.length) { const o = lineObj(pos, null, matRef); o.renderOrder = 5; gRef.add(o); }
}
function lnRenderRef() {
  if (!renderer || !gRef.children.length) return; const cp = renderer.clippingPlanes; renderer.clippingPlanes = []; renderer.autoClear = false;
  renderer.render(sceneR, cam); renderer.autoClear = true; renderer.clippingPlanes = cp;
}

/* ---------- solapaments entre cossos tancats ---------- */
function lnTris(m) { const p = m.geometry.attributes.position.array, t = []; for (let i = 0; i < p.length; i += 9) t.push([[p[i], p[i + 1], p[i + 2]], [p[i + 3], p[i + 4], p[i + 5]], [p[i + 6], p[i + 7], p[i + 8]]]); return t; }
/* intersecció de dos triangles: segment [p, q] o null (coplanars: null) */
function lnTriTri(T, U) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cr = V.cross;
  const n = cr(sub(T[1], T[0]), sub(T[2], T[0])), nl = Math.hypot(n[0], n[1], n[2]); if (nl < 1e-12) return null;
  const d = U.map(q => dot(n, sub(q, T[0])) / nl); if ((d[0] > LN_EPS && d[1] > LN_EPS && d[2] > LN_EPS) || (d[0] < -LN_EPS && d[1] < -LN_EPS && d[2] < -LN_EPS)) return null;
  if (Math.abs(d[0]) < LN_EPS && Math.abs(d[1]) < LN_EPS && Math.abs(d[2]) < LN_EPS) return null;
  const pts = []; for (let i = 0; i < 3; i++) { const j = (i + 1) % 3, a = d[i], b = d[j]; if ((a > 0) !== (b > 0) && a !== b) { const t = a / (a - b); pts.push([U[i][0] + (U[j][0] - U[i][0]) * t, U[i][1] + (U[j][1] - U[i][1]) * t, U[i][2] + (U[j][2] - U[i][2]) * t]); } else if (Math.abs(a) < LN_EPS) pts.push(U[i].slice()); }
  if (pts.length < 2) return null; let p = pts[0], q = pts[1]; if (pts.length > 2) { let best = -1; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const L = Math.hypot(...sub(pts[i], pts[j])); if (L > best) { best = L; p = pts[i]; q = pts[j]; } } }
  let t0 = 0, t1 = 1; const dq = sub(q, p);
  for (let e = 0; e < 3; e++) { const a = T[e], b = T[(e + 1) % 3], m = cr(n, sub(b, a)), f0 = dot(m, sub(p, a)), df = dot(m, dq); if (Math.abs(df) < 1e-14) { if (f0 < -1e-9) return null; continue; } const t = -f0 / df; if (df > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); }
  if (t1 - t0 < 1e-9) return null; return [[p[0] + dq[0] * t0, p[1] + dq[1] * t0, p[2] + dq[2] * t0], [p[0] + dq[0] * t1, p[1] + dq[1] * t1, p[2] + dq[2] * t1]];
}
/* punt dins d'un sòlid (raig amb paritat) */
function lnInSolid(pt, tris) {
  const d = [1, 0.01234, 0.00713]; let hits = 0;
  for (const T of tris) {
    const e1 = [T[1][0] - T[0][0], T[1][1] - T[0][1], T[1][2] - T[0][2]], e2 = [T[2][0] - T[0][0], T[2][1] - T[0][1], T[2][2] - T[0][2]], h = V.cross(d, e2), a = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2]; if (Math.abs(a) < 1e-14) continue;
    const f = 1 / a, s = [pt[0] - T[0][0], pt[1] - T[0][1], pt[2] - T[0][2]], u = f * (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]); if (u < 0 || u > 1) continue;
    const q = V.cross(s, e1), v = f * (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]); if (v < 0 || u + v > 1) continue; if (f * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) > 1e-9) hits++;
  }
  return hits % 2 === 1;
}
function lnSolids() {
  const out = [];
  for (const m of pickMeshes) {
    if (m.userData.back || !m.userData.c || !lnWatertight(m.userData.c)) continue; const tris = lnTris(m); if (tris.length < 4) continue;
    const bb = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }; for (const T of tris) for (const q of T) for (let i = 0; i < 3; i++) { bb.min[i] = Math.min(bb.min[i], q[i]); bb.max[i] = Math.max(bb.max[i], q[i]); }
    out.push({ path: m.userData.path, c: m.userData.c, tris, bb, fl: lnFlags(m.userData.path), mat: lnMatOf(m.userData.c) });
  }
  return out;
}
const lnBBox3 = (a, b) => { for (let i = 0; i < 3; i++) if (a.min[i] > b.max[i] - 1e-6 || b.min[i] > a.max[i] - 1e-6) return false; return true; };
function lnOverlaps() {
  const S2 = lnSolids(), res = []; const t0 = performance.now();
  for (let i = 0; i < S2.length && res.length < 200; i++) for (let j = i + 1; j < S2.length && res.length < 200; j++) {
    const a = S2[i], b = S2[j]; if (!lnBBox3(a.bb, b.bb)) continue; let hit = false;
    outer: for (const T of a.tris) { for (const U of b.tris) { const s = lnTriTri(T, U); if (s && Math.hypot(s[0][0] - s[1][0], s[0][1] - s[1][1], s[0][2] - s[1][2]) > 1e-4) { hit = true; break outer; } } }
    if (!hit && (lnInSolid(a.tris[0][0], b.tris) || lnInSolid(b.tris[0][0], a.tris))) hit = true;
    if (hit) res.push({ a, b });
    if (performance.now() - t0 > 4000) return res;
  }
  return res;
}

/* ---------- panell «Línies» ---------- */
function lnKeyHTML() {
  const ln = S.style.ln, W = k => Math.max(0.5, ln.w[k] * 3.4), F = S.style.sec.fill, tone = S.style.sec.tone, dim = (k, o) => ln.vis[k] ? o : 0.1;
  const da = { C: '3.5 2.6', D: '10 4' }, st = (k, w, lvl) => 'fill:none;stroke:#15171C;stroke-width:' + (w * (lvl ? ln.mult[lvl] : 1)).toFixed(2) + ';stroke-opacity:' + (LN_TONE[lvl || 0]) + (da[k] ? ';stroke-dasharray:' + da[k] : '');
  const E = i => ln.eOn[i - 1] ? 1 : 0.12, fillA = F === 'none' ? 'none' : F === 'grey' ? '#15171C" fill-opacity="' + (tone * 0.6).toFixed(2) : F === 'solid' ? '#15171C' : '#15171C" fill-opacity="0.18';
  const o = n => 'class="lk" data-k="' + n + '"';
  return '<svg viewBox="0 0 300 250" style="width:100%;height:auto;display:block;background:#F3F4EE;border-radius:6px" role="img" aria-label="Clau de les línies">'
    + '<line x1="4" y1="96" x2="296" y2="96" stroke="#15171C"/><path d="' + Array.from({ length: 24 }, (_, i) => 'M' + (4 + i * 12) + ' 96l6 5').join('') + '" stroke="#8A8E86" stroke-width=".6"/>'
    + '<rect x="8" y="76" width="16" height="20" fill="none" stroke="#15171C"/>'
    + '<path d="M30 96V8M28 96h4M28 52h4M28 31h4M28 8h4" stroke="#8A8E86" stroke-width=".6"/><ellipse cx="44.5" cy="27.5" rx="3.6" ry="4.4" fill="#3A3F47"/>'
    + '<path d="M37 34.5C39 32.6 42 32.4 44.5 33 47.5 32.4 50.5 32.8 52.5 34.5L57.5 41 56 43.2 51.5 39.6 50.2 46C49.8 49 48.6 51 48.8 53.5L51 74 55 95.5 50.4 96 46.6 76 45.2 62 43.2 76 40.6 96 36 95.5 39.6 74 40.6 53.5C40.6 51 39.4 49 38.6 46L37.4 39.5 36.6 22 37 9.5 35.6 8 37.2 6.4 39.4 7.6 39.8 22 40.2 34.2Z" fill="#3A3F47"/>'
    + '<path d="M58 40.5h4.2l1.2-2.2h4.6v16h-10z" fill="#F3F4EE" stroke="#15171C" stroke-linejoin="round"/><rect x="68" y="41" width="7" height="10" fill="#F3F4EE" stroke="#15171C"/><path d="M70 41v10M72 41v10M74 41v10" stroke="#15171C" stroke-width=".6"/><path d="M75 41L83 37V55L75 51Z" fill="#F3F4EE" stroke="#15171C" stroke-linejoin="round"/>'
    + '<line x1="83" y1="4" x2="83" y2="100" stroke="#15171C" stroke-width="1.3"/><path d="M79 4h8M79 100h8" stroke="#15171C" stroke-width="2"/><path d="M83 46L156 82" stroke="#8A8E86" stroke-width=".6" stroke-dasharray="2 2"/>'
    + '<rect x="70" y="62" width="40" height="34" fill="#15171C" fill-opacity=".12" stroke="#15171C"/>'
    + ['100,14,16,16', '150,76,16,20', '196,14,14,14', '232,14,14,14', '268,14,14,14'].map(r => { const q = r.split(','); return '<rect x="' + q[0] + '" y="' + q[1] + '" width="' + q[2] + '" height="' + q[3] + '" fill="none" stroke="#15171C"/>'; }).join('')
    + '<g font-family="IBM Plex Mono,monospace" font-size="8" fill="#5B6068"><text x="12" y="72">D</text><text x="96" y="74">A</text><text x="104" y="11">B</text><text x="154" y="72">C</text><text x="197" y="11">E1</text><text x="233" y="11">E2</text><text x="269" y="11">E3</text>'
    + '<text x="30" y="113" font-size="7.5" text-anchor="middle">observador</text><text x="88" y="113" font-size="7.5">pla del quadre = càmera</text><text x="230" y="113" font-size="7.5">mirada →</text></g>'
    + '<rect x="8" y="122" width="284" height="122" fill="none" stroke="#B9BCB4"/><text x="14" y="134" font-family="IBM Plex Mono,monospace" font-size="7.5" fill="#5B6068">resultat</text>'
    + '<rect ' + o('A') + ' x="118" y="150" width="64" height="60" fill="' + fillA + '" stroke="#15171C" stroke-width="' + W('A').toFixed(2) + '" opacity="' + dim('A', 1) + '"/>'
    + '<rect ' + o('B') + ' x="88" y="132" width="22" height="22" style="' + st('B', W('B')) + '" opacity="' + dim('B', 1) + '"/>'
    + '<rect ' + o('C') + ' x="140" y="160" width="22" height="22" style="' + st('C', W('C')) + '" opacity="' + dim('C', 1) + '"/>'
    + '<rect ' + o('D') + ' x="192" y="198" width="28" height="26" style="' + st('D', W('D')) + '" opacity="' + dim('D', 1) + '"/>'
    + [[224, 1], [248, 2], [272, 3]].map(p => '<rect ' + o('E') + ' x="' + p[0] + '" y="136" width="' + (p[1] === 3 ? 14 : 18) + '" height="18" style="' + st('B', W('B'), p[1]) + '" opacity="' + (ln.vis.B ? E(p[1]) : 0.1) + '"/>').join('')
    + '<g font-family="IBM Plex Mono,monospace" font-size="8" fill="#5B6068" text-anchor="middle"><text x="150" y="224">A</text><text x="99" y="128">B</text><text x="151" y="190">C</text><text x="206" y="236">D</text><text x="233" y="164">E1</text><text x="257" y="164">E2</text><text x="279" y="164">E3</text></g></svg>';
}
function lnKeyHover(root, k) { root.querySelectorAll('.lk').forEach(n => { n.style.opacity = !k || n.dataset.k === k ? '' : '0.15'; }); }
function linesPanel(b) {
  const s = S.style, ln = s.ln, set = (fn) => { pushUndo('estil de línies'); fn(); ln.set = 'personalitzat'; refreshAll(); const k = b.querySelector('#lnKey'); if (k) k.innerHTML = lnKeyHTML(); };
  const key = el('div'); key.id = 'lnKey'; key.innerHTML = lnKeyHTML(); b.appendChild(key);
  const hint = el('div', 'dim', 'La clau canvia amb els estils. Passa el cursor per una fila per ressaltar-la.'); hint.style.cssText = 'margin:4px 0 8px;font-size:11px'; b.appendChild(hint);
  const sets = lnAllSets(), sel = el('select', '', sets.map(x => '<option value="' + esc(x.name) + '"' + (x.name === ln.set ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + (sets.some(x => x.name === ln.set) ? '' : '<option selected>' + esc(ln.set) + '</option>')); sel.style.width = '100%'; sel.id = 'lnSet';
  sel.onchange = () => { const x = sets.find(y => y.name === sel.value); if (!x) return; pushUndo('joc de línies'); Object.assign(ln.w, x.w); ln.mult = x.mult.slice(); ln.set = x.name; refreshAll(); renderTray(); };
  b.appendChild(el('div', 'row hd', 'Joc de línies')); b.appendChild(sel);
  const nm = el('input'); nm.type = 'text'; nm.id = 'lnName'; nm.placeholder = 'Nom per desar el joc'; nm.style.cssText = 'width:100%;margin:6px 0 4px';
  const bs = el('div'); bs.style.cssText = 'display:flex;gap:4px;margin-bottom:6px'; const sv = el('button', 'btn sm', 'Desa joc al model'); sv.id = 'lnSave'; const dl = el('button', 'btn sm', 'Esborra'); dl.id = 'lnDel';
  sv.onclick = () => { const n = nm.value.trim() || ln.set; if (LN_PRESETS.some(p => p[0] === n)) { toast('Posa un nom propi: els jocs predefinits no es poden sobreescriure.'); return; } pushUndo('joc de línies'); const a = lnSets(), i = a.findIndex(x => x.name === n), o = { name: n, w: { ...ln.w }, mult: ln.mult.slice() }; if (i >= 0) a[i] = o; else a.push(o); ln.set = n; renderTray(); toast('Joc «' + n + '» desat al model.'); };
  dl.onclick = () => { const a = lnSets(), i = a.findIndex(x => x.name === ln.set); if (i < 0) { toast('Només es poden esborrar els jocs propis del model.'); return; } pushUndo('joc de línies'); a.splice(i, 1); renderTray(); };
  bs.append(sv, dl); b.append(nm, bs);
  b.appendChild(el('div', 'row hd', 'Representació'));
  const num = (v, mn, mx, st, on, w) => { const i = el('input'); i.type = 'number'; i.min = mn; i.max = mx; i.step = st; i.value = v; i.style.width = (w || 64) + 'px'; i.onchange = () => { const x = parseFloat(i.value); if (isFinite(x)) on(Math.min(mx, Math.max(mn, x))); }; return i; };
  for (const k of ['A', 'B', 'C', 'D', 'S']) {
    const r = el('div', 'kv'); r.style.cssText = 'margin:3px 0;align-items:center'; r.dataset.ln = k;
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = ln.vis[k]; cb.title = (ln.vis[k] ? 'Amaga ' : 'Mostra ') + LN_NAMES[k].toLowerCase(); cb.setAttribute('aria-label', cb.title); cb.onchange = () => set(() => { ln.vis[k] = cb.checked; });
    const lab = el('span', '', '<b>' + k + '</b> ' + esc(LN_NAMES[k]) + '<br><span class="dim" style="font-size:11px">' + esc(LN_DESC[k]) + '</span>'); const w = el('span'); w.style.cssText = 'display:flex;gap:6px;align-items:center'; w.appendChild(cb);
    const mmI = num(ln.w[k], 0.05, 2, 0.05, x => set(() => { ln.w[k] = x; }), 60); mmI.setAttribute('aria-label', 'Gruix ' + LN_NAMES[k] + ' en mm'); w.appendChild(mmI); w.appendChild(el('span', 'dim', 'mm'));
    r.append(lab, w); r.onmouseenter = () => lnKeyHover(b, k); r.onmouseleave = () => lnKeyHover(b, null); b.appendChild(r);
  }
  b.appendChild(el('div', 'row hd', 'Llunyanes (E) · graus'));
  const r0 = el('div', 'kv'); r0.style.margin = '3px 0'; r0.appendChild(el('span', '', 'Primer pla fins a (m)')); const w0 = el('span'); w0.appendChild(num(ln.d0, 0.1, 50, 0.1, x => set(() => { ln.d0 = x; }), 64)); r0.appendChild(w0); b.appendChild(r0);
  ['Enllà', 'Lluny', 'Molt lluny'].forEach((nme, i) => {
    const r = el('div', 'kv'); r.style.cssText = 'margin:3px 0;align-items:center'; r.dataset.ln = 'E' + (i + 1);
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = ln.eOn[i]; cb.title = (ln.eOn[i] ? 'Desactiva el grau ' : 'Activa el grau ') + nme.toLowerCase(); cb.setAttribute('aria-label', cb.title); cb.onchange = () => set(() => { ln.eOn[i] = cb.checked; });
    const w = el('span'); w.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap'; w.appendChild(cb);
    w.appendChild(num(ln.mult[i + 1], 0.2, 1, 0.05, x => set(() => { ln.mult[i + 1] = x; }), 52)); w.appendChild(el('span', 'dim', '×'));
    w.appendChild(num(ln.d[i], 0.2, 100, 0.1, x => set(() => { ln.d[i] = x; }), 56)); w.appendChild(el('span', 'dim', 'm'));
    r.append(el('span', '', '<b>E' + (i + 1) + '</b> ' + nme), w); r.onmouseenter = () => lnKeyHover(b, 'E'); r.onmouseleave = () => lnKeyHover(b, null); b.appendChild(r);
  });
  const nE = ln.eOn.filter(Boolean).length; b.appendChild(el('div', 'dim', (nE ? nE + (nE === 1 ? ' grau actiu' : ' graus actius') : 'Cap grau actiu: tot es dibuixa amb el gruix ple') + '. Només a plantes, seccions i alçats.')).style.cssText = 'font-size:11px;margin:2px 0 6px';
  b.appendChild(el('div', 'row hd', 'Aquesta vista'));
  const l = (S.view || '').startsWith('plan:') ? S.model.levels.find(x => String(x.id) === S.view.slice(5)) : null, rr = el('div', 'kv'); rr.style.margin = '3px 0'; rr.appendChild(el('span', '', 'Darrere l’observador, D (m)'));
  const rw = el('span'); const ri = num(l ? vrOf(l).rear : 0, 0, 20, 0.1, x => { pushUndo('rang de vista'); pvSet(l, { rear: x }); refreshAll(); }, 64); ri.disabled = !l; ri.id = 'lnRear'; rw.appendChild(ri); rr.appendChild(rw); b.appendChild(rr);
  b.appendChild(el('div', 'dim', l ? '0 desactiva les reflexades (valor per defecte).' : 'Només disponible a les vistes de planta.')).style.cssText = 'font-size:11px';
  const hr = el('div', 'kv'); hr.style.margin = '6px 0'; hr.appendChild(el('span', '', 'Ocultes, C')); const hs = el('select', '', [['off', 'Cap'], ['mark', 'Només marcats'], ['dash', 'Totes a traços'], ['grey', 'Totes contínues']].map(([k2, t]) => '<option value="' + k2 + '"' + (s.ed.hid === k2 ? ' selected' : '') + '>' + t + '</option>').join('')); hs.id = 'lnHid'; hs.onchange = () => { s.ed.hid = hs.value; refreshAll(); }; const hw = el('span'); hw.appendChild(hs); hr.appendChild(hw); b.appendChild(hr);
  const fr = el('div', 'kv'); fr.style.margin = '3px 0'; fr.appendChild(el('span', '', 'Farciment de secció')); const fs = el('select', '', [['grey', 'Gris'], ['hatch', 'Ratllat'], ['cross', 'Ratllat creuat'], ['solid', 'Sòlid'], ['none', 'Cap']].map(([k2, t]) => '<option value="' + k2 + '"' + (s.sec.fill === k2 ? ' selected' : '') + '>' + t + '</option>').join('')); fs.id = 'lnFill'; fs.onchange = () => { s.sec.fill = fs.value; refreshAll(); const k = b.querySelector('#lnKey'); if (k) k.innerHTML = lnKeyHTML(); }; const fw = el('span'); fw.appendChild(fs); fr.appendChild(fw); b.appendChild(fr);
  const tr = el('div', 'kv'); tr.style.margin = '3px 0'; tr.appendChild(el('span', '', 'To del gris')); const tw = el('span'); tw.appendChild(num(s.sec.tone, 0.05, 1, 0.05, x => { s.sec.tone = x; refreshAll(); const k = b.querySelector('#lnKey'); if (k) k.innerHTML = lnKeyHTML(); }, 64)); tr.appendChild(tw); b.appendChild(tr);
  b.appendChild(el('div', 'row hd', 'Solapaments entre cossos'));
  const ol = el('div'); ol.id = 'lnOv'; const bo = el('button', 'btn sm', 'Cerca solapaments'); bo.id = 'lnFind';
  bo.onclick = () => { const res = lnOverlaps(); ol.innerHTML = ''; if (!res.length) { ol.appendChild(el('div', 'dim', 'Cap solapament entre cossos tancats.')); return; }
    ol.appendChild(el('div', 'dim', res.length + (res.length === 1 ? ' solapament' : ' solapaments') + '. Els del mateix material s’uneixen; els de materials diferents es retallen per prioritat.')).style.cssText = 'font-size:11px;margin:4px 0';
    res.forEach(p => { const r = el('div', 'row it'); r.dataset.ov = '1'; r.innerHTML = '<span class="gw">' + esc(p.a.c.name || 'Grup') + ' ∩ ' + esc(p.b.c.name || 'Grup') + '</span>';
      r.onclick = () => { S.ctx = p.a.path.slice(0, -1); clearSel(); S.sel.groups.add(p.a.path[p.a.path.length - 1]); refreshAll(); }; ol.appendChild(r); }); };
  b.append(bo, ol);
}
/* propietats d'element a Info */
function lnElemHTML(g) {
  const fl = lnFlags([...S.ctx, g.id]);
  return '<div class="row hd">Línies i secció</div>' + kv([['Talla (secció)', '<select id="gCut"><option value="">Automàtic (' + (g.par && g.par.type === 'comp' ? 'no' : 'sí') + ')</option><option value="1"' + (g.cut === true ? ' selected' : '') + '>Sí</option><option value="0"' + (g.cut === false ? ' selected' : '') + '>No</option></select>'],
    ['Es mostra a través', '<input type="checkbox" id="gThru"' + (g.thru ? ' checked' : '') + '>'], ['Prioritat de tall', '<input type="number" id="gPrio" step="1" style="width:64px" value="' + (g.prio || 0) + '">'],
    ['No s’uneix ni es retalla', '<input type="checkbox" id="gNj"' + (g.nojoin ? ' checked' : '') + '>']]);
}
function lnElemBind(b, g) {
  const q = id => b.querySelector('#' + id);
  q('gCut').onchange = e => { pushUndo('talla'); g.cut = e.target.value === '' ? null : e.target.value === '1'; refreshAll(); };
  q('gThru').onchange = e => { pushUndo('es mostra a través'); g.thru = e.target.checked; refreshAll(); };
  q('gPrio').onchange = e => { const x = parseInt(e.target.value, 10); pushUndo('prioritat'); g.prio = isFinite(x) ? x : 0; refreshAll(); };
  q('gNj').onchange = e => { pushUndo('unió'); g.nojoin = e.target.checked; refreshAll(); };
}

/* ============================================================
   v0.42.1 · unió de cossos en 3D: arestes dins d'un altre cos
   (mateix material, o cos dominat), arestes d'intersecció i
   creació de les línies per graus de llunyania.
   ============================================================ */
function lnJoinCtx() {
  if (LN_J !== undefined) return LN_J; const ss = lnSolids(), byKey = new Map(); ss.forEach((o, i) => { o.idx = i; byKey.set(o.path.join('/'), o); });
  return (LN_J = { ss, byKey, inter: null });
}
const lnDom = (o, i) => o.mat === i.mat ? o.idx < i.idx : (o.fl.prio > i.fl.prio || (o.fl.prio === i.fl.prio && o.idx < i.idx));
/* 0 fora · 1 dins · 2 sobre la superfície */
function lnClassPt(pt, tris) {
  const d = [1, 0.01234, 0.00713]; let hits = 0;
  for (const T of tris) {
    const e1 = [T[1][0] - T[0][0], T[1][1] - T[0][1], T[1][2] - T[0][2]], e2 = [T[2][0] - T[0][0], T[2][1] - T[0][1], T[2][2] - T[0][2]], w = [pt[0] - T[0][0], pt[1] - T[0][1], pt[2] - T[0][2]], n = V.cross(e1, e2), nl = Math.hypot(n[0], n[1], n[2]); if (nl < 1e-14) continue;
    if (Math.abs((n[0] * w[0] + n[1] * w[1] + n[2] * w[2]) / nl) < 1e-4) { const d00 = e1[0] * e1[0] + e1[1] * e1[1] + e1[2] * e1[2], d01 = e1[0] * e2[0] + e1[1] * e2[1] + e1[2] * e2[2], d11 = e2[0] * e2[0] + e2[1] * e2[1] + e2[2] * e2[2], d20 = w[0] * e1[0] + w[1] * e1[1] + w[2] * e1[2], d21 = w[0] * e2[0] + w[1] * e2[1] + w[2] * e2[2], den = d00 * d11 - d01 * d01, bv = (d11 * d20 - d01 * d21) / den, bw = (d00 * d21 - d01 * d20) / den; if (bv >= -1e-6 && bw >= -1e-6 && bv + bw <= 1 + 1e-6) return 2; }
    const h = V.cross(d, e2), a = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2]; if (Math.abs(a) < 1e-14) continue;
    const f = 1 / a, u = f * (w[0] * h[0] + w[1] * h[1] + w[2] * h[2]); if (u < 0 || u > 1) continue; const q = V.cross(w, e1), v = f * (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]); if (v < 0 || u + v > 1) continue;
    if (f * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) > 1e-9) hits++;
  }
  return hits % 2 === 1 ? 1 : 0;
}
/* paràmetre t (0,1) on el segment A + t·dv travessa el triangle T */
function lnSegTri(A, dv, T) {
  const e1 = [T[1][0] - T[0][0], T[1][1] - T[0][1], T[1][2] - T[0][2]], e2 = [T[2][0] - T[0][0], T[2][1] - T[0][1], T[2][2] - T[0][2]], h = V.cross(dv, e2), a = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2]; if (Math.abs(a) < 1e-14) return -1;
  const f = 1 / a, w = [A[0] - T[0][0], A[1] - T[0][1], A[2] - T[0][2]], u = f * (w[0] * h[0] + w[1] * h[1] + w[2] * h[2]); if (u < 0 || u > 1) return -1;
  const q = V.cross(w, e1), v = f * (dv[0] * q[0] + dv[1] * q[1] + dv[2] * q[2]); if (v < 0 || u + v > 1) return -1; const t = f * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]); return t > 1e-9 && t < 1 - 1e-9 ? t : -1;
}
function lnFaceCens(c, a, b) {
  let m = LN_ADJ.get(c); if (!m) { m = new Map(); for (const f of c.faces.values()) { const cen = K.faceCentroid(c, f); for (const lp of [f.loop, ...f.holes]) for (let i = 0; i < lp.length; i++) { const x = lp[i], y = lp[(i + 1) % lp.length], k = x < y ? x + '_' + y : y + '_' + x; let l = m.get(k); if (!l) m.set(k, l = []); l.push(cen); } } LN_ADJ.set(c, m); }
  return m.get(a < b ? a + '_' + b : b + '_' + a) || [];
}
const lnBoxOv = (o, a, b, pad) => { for (let i = 0; i < 3; i++) if (Math.max(a[i], b[i]) < o.bb.min[i] - pad || Math.min(a[i], b[i]) > o.bb.max[i] + pad) return false; return true; };
/* talla les arestes pels cossos que les tapen i hi afegeix les arestes d'intersecció entre cossos */
function lnTrimEdges(items) {
  const J = lnJoinCtx(), out = [], t0 = performance.now(); if (!J.ss.length) return items;
  for (const it of items) {
    const own = it.path ? J.byKey.get(it.path.join('/')) : null;
    if (!own || own.fl.nj || performance.now() - t0 > 3500) { out.push(it); continue; }
    let pcs = [[it.a, it.b]];
    for (const o of J.ss) {
      if (o === own || o.fl.nj) continue; const same = o.mat === own.mat, drop = same || lnDom(o, own); if (!drop) continue;
      const nx = []; let any = false;
      for (const [A, B] of pcs) {
        if (!lnBoxOv(o, A, B, 1e-4)) { nx.push([A, B]); continue; } any = true;
        const dv = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], ts = [0, 1]; for (const T of o.tris) { const t = lnSegTri(A, dv, T); if (t > 0) ts.push(t); }
        ts.sort((x, y) => x - y);
        for (let i = 0; i + 1 < ts.length; i++) {
          if (ts[i + 1] - ts[i] < 1e-7) continue; const p = [A[0] + dv[0] * ts[i], A[1] + dv[1] * ts[i], A[2] + dv[2] * ts[i]], q = [A[0] + dv[0] * ts[i + 1], A[1] + dv[1] * ts[i + 1], A[2] + dv[2] * ts[i + 1]], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], cl = lnClassPt(m, o.tris);
          let hide = cl === 1;
          if (cl === 2 && it.c && it.ed) for (const cen of lnFaceCens(it.c, it.ed.a, it.ed.b)) { const w = [cen[0] + it.off[0] - m[0], cen[1] + it.off[1] - m[1], cen[2] + it.off[2] - m[2]], L = Math.hypot(w[0], w[1], w[2]) || 1, k = Math.min(0.03, L * 0.2) / L; if (lnClassPt([m[0] + w[0] * k, m[1] + w[1] * k, m[2] + w[2] * k], o.tris) === 1) { hide = true; break; } }
          if (!hide) nx.push([p, q]);
        }
      }
      if (any) pcs = nx;
    }
    for (const [A, B] of pcs) out.push({ ...it, a: A, b: B });
  }
  for (const s of lnInterSegs(J)) out.push(s);
  return out;
}
/* arestes d'intersecció entre superfícies de cossos (només si les dues cares queden a l'exterior de la unió) */
function lnInterSegs(J) {
  if (J.inter) return J.inter; const res = [], t0 = performance.now(); J.inter = res;
  const side = (seg, T, other) => {
    const m = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2, (seg[0][2] + seg[1][2]) / 2], dv = [seg[1][0] - seg[0][0], seg[1][1] - seg[0][1], seg[1][2] - seg[0][2]], n = V.cross([T[1][0] - T[0][0], T[1][1] - T[0][1], T[1][2] - T[0][2]], [T[2][0] - T[0][0], T[2][1] - T[0][1], T[2][2] - T[0][2]]), pe = V.norm(V.cross(n, dv)); let outside = false, exists = false;
    for (const sg of [1, -1]) { const q = [m[0] + pe[0] * 0.02 * sg, m[1] + pe[1] * 0.02 * sg, m[2] + pe[2] * 0.02 * sg];
      const nn = V.cross([T[1][0] - T[0][0], T[1][1] - T[0][1], T[1][2] - T[0][2]], [T[2][0] - T[0][0], T[2][1] - T[0][1], T[2][2] - T[0][2]]); let ok = true;
      for (let e = 0; e < 3; e++) { const a = T[e], b = T[(e + 1) % 3], mm = V.cross(nn, [b[0] - a[0], b[1] - a[1], b[2] - a[2]]); if (mm[0] * (q[0] - a[0]) + mm[1] * (q[1] - a[1]) + mm[2] * (q[2] - a[2]) < -1e-9) { ok = false; break; } }
      if (!ok) continue; exists = true; if (lnClassPt(q, other.tris) !== 1) outside = true; }
    return exists && outside;
  };
  for (let i = 0; i < J.ss.length; i++) for (let j = i + 1; j < J.ss.length; j++) {
    const a = J.ss[i], b = J.ss[j]; if (a.fl.nj || b.fl.nj || !lnBBox3(a.bb, b.bb)) continue;
    for (const T of a.tris) for (const U of b.tris) { const s = lnTriTri(T, U); if (!s || Math.hypot(s[0][0] - s[1][0], s[0][1] - s[1][1], s[0][2] - s[1][2]) < 1e-4) continue; if (side(s, T, b) && side(s, U, a)) res.push({ a: s[0], b: s[1], inter: true, thru: a.fl.thru || b.fl.thru, path: null }); }
    if (performance.now() - t0 > 3500) return res;
  }
  return res;
}
/* llista d'arestes (món) amb unió 3D, per al dibuix 2D */
function lnEdgeList() {
  const L0 = SNAP.edges.map(e => { const ed = e.c.edges.get(e.id); return { a: e.a, b: e.b, c: e.c, id: e.id, path: e.path, ed, off: ed ? V.sub(e.a, K.P(e.c, ed.a)) : [0, 0, 0] }; });
  return S.style.ln.j3 !== false ? lnTrimEdges(L0) : L0;
}
/* crea els objectes de línia: arestes B (per graus), perfils i ocultes C */
function lnFinishEdges() {
  const s = S.style, ln = s.ln, LB = lnCtx(); if (!LN_CONT.length) return;
  const items = []; for (const ct of LN_CONT) for (const sg of ct.segs) items.push({ ...sg, ct });
  const all = ln.j3 !== false ? lnTrimEdges(items) : items, groups = new Map(); _c.set(s.ed.color);
  const ICT = { base: [_c.r, _c.g, _c.b], hidOn: s.ed.hid !== 'off' && s.ed.hid !== 'mark' && ln.vis.C && s.fa.mode !== 'wire' && s.fa.mode !== 'xray' };
  for (const it of all) { const ct = it.inter ? ICT : it.ct; let g = groups.get(ct); if (!g) groups.set(ct, g = { bN: [[], [], [], []], bP: [[], [], [], []], bH: [[], [], [], []] }); 
    for (const [p, q, bd] of lnSplit(it.a, it.b, LB)) { if (ln.vis.B) (it.isP ? g.bP : g.bN)[bd].push(p[0], p[1], p[2], q[0], q[1], q[2]); if (ct.hidOn) g.bH[bd].push(p[0], p[1], p[2], q[0], q[1], q[2]); } }
  for (const [ct, g] of groups) for (let bd = 0; bd < 4; bd++) {
    for (const [arr, kind] of [[g.bN[bd], 'e'], [g.bP[bd], 'p']]) if (arr.length) { const col = lnBandRGB(ct.base, bd), cs = []; for (let i = 0; i < arr.length; i += 3) cs.push(col[0], col[1], col[2]); gModel.add(lineObj(arr, cs, lnMat(kind, bd))); }
    if (g.bH[bd].length) { const l = lineObj(g.bH[bd], null, lnMat('h', bd)); l.renderOrder = 1; gModel.add(l); }
  }
}
