/* ---------- modificació de línies (v0.33): TR, SP, MM, AL, JO, OF ---------- */
/* Les línies lliures són les arestes que no formen part de cap cara. Les cares no es toquen aquí. */
function freeEdges(c) {
  const inF = new Set();
  for (const f of c.faces.values()) for (const l of [f.loop, ...f.holes]) for (let i = 0; i < l.length; i++) { const e = K.edgeBetween(c, l[i], l[(i + 1) % l.length]); if (e) inF.add(e.id); }
  return [...c.edges.values()].filter(e => !inF.has(e.id));
}
function vInFace(c, vid) { for (const f of c.faces.values()) if (f.loop.includes(vid) || f.holes.some(h => h.includes(vid))) return true; return false; }
function eDel(c, e) { c.edges.delete(e.id); }
function eAdd(c, a, b, newIds) { if (a === b) return null; const e = K.addEdgeRaw(S.model, c, a, b); if (e && newIds) newIds.add(e.id); return e; }
/* esborra vèrtexs que ja no són usats per cap aresta ni cara */
function vcleanup(c, ids) {
  for (const vid of ids) { if (!c.verts.has(vid)) continue; if (K.edgesAt(c, vid).length === 0 && !vInFace(c, vid)) c.verts.delete(vid); }
}
/* intersecció de dos segments interiors (sense extrems), coplanars */
function segX(a, b, c0, d) {
  const r = V.sub(b, a), s = V.sub(d, c0), w = V.sub(c0, a), rs = V.cross(r, s), den = V.dot(rs, rs);
  if (den < 1e-12) return null;
  if (Math.abs(V.dot(w, rs)) > 1e-4 * Math.sqrt(den)) return null;
  const t = V.dot(V.cross(w, s), rs) / den, u = V.dot(V.cross(w, r), rs) / den;
  if (t <= 1e-6 || t >= 1 - 1e-6 || u <= 1e-6 || u >= 1 - 1e-6) return null;
  return V.add(a, V.mul(r, t));
}
/* intersecció de les rectes infinites (a-b) i (c-d); null si són paral·leles o no es creuen */
function infX(a, b, c0, d) {
  const u = V.sub(b, a), w = V.sub(d, c0), r = V.sub(a, c0);
  const A = V.dot(u, u), B = V.dot(u, w), C = V.dot(w, w), D = V.dot(u, r), E = V.dot(w, r), den = A * C - B * B;
  if (Math.abs(den) < 1e-12 * A * C) return null;
  const s = (B * E - C * D) / den, t = (E + B * s) / C;
  const p = V.add(a, V.mul(u, s)), q = V.add(c0, V.mul(w, t));
  if (V.dist(p, q) > 1e-3) return null;
  return V.mul(V.add(p, q), 0.5);
}
/* talla l'aresta e pel punt p (interior): retorna les dues arestes resultants */
function splitAt(c, e, p, newIds) {
  const a = e.a, b = e.b, pa = K.P(c, a), pb = K.P(c, b), t = V.dot(V.sub(p, pa), V.sub(pb, pa)) / V.dot(V.sub(pb, pa), V.sub(pb, pa));
  if (!(t > 1e-4 && t < 1 - 1e-4)) return null;
  const v = K.addVertexRaw(S.model, c, p), keep = newIds && newIds.has(e.id);
  eDel(c, e);
  const e1 = eAdd(c, a, v.id, keep ? newIds : null), e2 = eAdd(c, v.id, b, keep ? newIds : null);
  if (keep) newIds.delete(e.id);
  return [e1, e2, v.id];
}
/* uneix dues arestes lliures contigües i col·lineals a través del vèrtex vid */
function joinAt(c, vid, dry) {
  if (!c.verts.has(vid) || vInFace(c, vid)) return false;
  const es = K.edgesAt(c, vid); if (es.length !== 2) return false;
  const o = es.map(e => (e.a === vid ? e.b : e.a)), P0 = K.P(c, vid), A = V.sub(K.P(c, o[0]), P0), B = V.sub(K.P(c, o[1]), P0);
  const cr = V.len(V.cross(A, B)), sc = V.len(A) * V.len(B);
  if (sc < 1e-12 || cr > 1e-4 * sc || V.dot(A, B) >= 0) return false;
  if (dry) return true;
  for (const e of es) eDel(c, e);
  eAdd(c, o[0], o[1]); c.verts.delete(vid);
  return true;
}
/* automatismes després de dibuixar: talls creuats i unions contigües */
function lineAuto(c, newIds) {
  let guard = 0, changed = true;
  while (changed && guard++ < 400) {
    changed = false;
    const fr = freeEdges(c);
    outer: for (const n of fr) { if (!newIds.has(n.id)) continue; for (const f of fr) {
      if (f.id === n.id) continue;
      const X = segX(K.P(c, n.a), K.P(c, n.b), K.P(c, f.a), K.P(c, f.b)); if (!X) continue;
      splitAt(c, n, X, newIds); splitAt(c, f, X, null); changed = true; break outer;
    } }
  }
  const touched = new Set(); for (const e of c.edges.values()) if (newIds.has(e.id)) { touched.add(e.a); touched.add(e.b); }
  for (const vid of touched) joinAt(c, vid);
}
/* aresta lliure més propera al cursor (en pantalla) */
function nearestFreeEdge(c, mx, my, maxPx) {
  let best = null, bd = maxPx || 10;
  for (const e of freeEdges(c)) {
    const A = toScreen(K.P(c, e.a)), B = toScreen(K.P(c, e.b)); if (A.z > 1 || B.z > 1) continue;
    const dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((mx - A.x) * dx + (my - A.y) * dy) / L2));
    const d = Math.hypot(A.x + dx * t - mx, A.y + dy * t - my);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
/* extrem de l'aresta e més proper al cursor en pantalla: 'a' o 'b' */
function nearEnd(c, e, mx, my) {
  const A = toScreen(K.P(c, e.a)), B = toScreen(K.P(c, e.b));
  return Math.hypot(A.x - mx, A.y - my) <= Math.hypot(B.x - mx, B.y - my) ? 'a' : 'b';
}
/* mou un extrem de l'aresta e fins al punt X (retallar o estendre) */
function moveEnd(c, e, end, X, label) {
  const keepV = end === 'a' ? e.b : e.a;
  if (V.dist(X, K.P(c, keepV)) < 1e-6) return false;
  pushUndo(label);
  const old = [e.a, e.b], nv = K.addVertexRaw(S.model, c, X);
  eDel(c, e); eAdd(c, nv.id, keepV); vcleanup(c, old);
  return true;
}
/* TR: retalla o estén l'extrem de l'aresta e més proper al cursor fins a la recta de la línia límit b */
function trimTo(c, bId, eId, mx, my) {
  const b = c.edges.get(bId), e = c.edges.get(eId); if (!b || !e || b.id === e.id) return false;
  const X = infX(K.P(c, b.a), K.P(c, b.b), K.P(c, e.a), K.P(c, e.b)); if (!X) return false;
  return moveEnd(c, e, nearEnd(c, e, mx, my), X, 'retallar');
}
/* on cau el clic sobre la recta de l'aresta (3D, sobre qualsevol pla) */
function clickOn(c, e, mx, my) {
  const A = K.P(c, e.a), B = K.P(c, e.b), q = closestOnLineToRay(A, V.sub(B, A), mouseRay(mx, my), false);
  return q ? q.p : null;
}
/* quin extrem mou-se a la intersecció X: el que queda al costat oposat al clic, perquè la part clicada es conservi */
function endToMove(c, e, X, cp) {
  const A = K.P(c, e.a), B = K.P(c, e.b), u = V.norm(V.sub(B, A));
  const sA = V.dot(V.sub(A, X), u), sB = V.dot(V.sub(B, X), u), sC = V.dot(V.sub(cp, X), u);
  if (Math.abs(sC) < 1e-9) return null;
  return sC > 0 ? (sA < sB ? 'a' : 'b') : (sA > sB ? 'a' : 'b');
}
/* TR (Revit, Trim/Extend to Corner): retalla o estén les dues línies fins a la seva intersecció, en qualsevol pla */
function cornerTrim(c, id1, id2, p1, p2) {
  const a = c.edges.get(id1), b = c.edges.get(id2); if (!a || !b || a.id === b.id) return false;
  const X = infX(K.P(c, a.a), K.P(c, a.b), K.P(c, b.a), K.P(c, b.b)); if (!X) return false;
  const ea = endToMove(c, a, X, p1), eb = endToMove(c, b, X, p2); if (!ea || !eb) return false;
  const ka = ea === 'a' ? a.b : a.a, kb = eb === 'a' ? b.b : b.a;
  if (V.dist(X, K.P(c, ka)) < 1e-6 || V.dist(X, K.P(c, kb)) < 1e-6) return false;
  pushUndo('retallar');
  const old = [a.a, a.b, b.a, b.b], vX = K.addVertexRaw(S.model, c, X);
  eDel(c, a); eDel(c, b); eAdd(c, vX.id, ka); eAdd(c, vX.id, kb); vcleanup(c, old);
  return true;
}
/* JO: fusiona dues línies contigües i col·lineals que comparteixen un vèrtex */
function joinPair(c, id1, id2) {
  const a = c.edges.get(id1), b = c.edges.get(id2); if (!a || !b || a.id === b.id) return false;
  const shared = [a.a, a.b].find(v => v === b.a || v === b.b); if (shared === undefined) return false;
  if (!joinAt(c, shared, true)) return false;
  pushUndo('unir'); return joinAt(c, shared, false);
}
/* SP: divideix l'aresta més propera pel punt del cursor */
function splitNear(c, e, mx, my) {
  const ray = mouseRay(mx, my), A = K.P(c, e.a), B = K.P(c, e.b), q = closestOnLineToRay(A, V.sub(B, A), ray, true);
  if (!q) return false;
  pushUndo('dividir'); const r = splitAt(c, e, q.p, null); if (!r) return false; vcleanup(c, [e.a, e.b]); return true;
}
/* reflexió respecte al pla vertical que conté l'eix A-B */
function mirrorP(p, A, B) {
  const d = V.norm(V.sub(B, A)), n = V.norm(V.cross(d, [0, 0, 1])), dist = V.dot(V.sub(p, A), n);
  return V.sub(p, V.mul(n, 2 * dist));
}
/* MM: copia les arestes lliures seleccionades reflectides respecte l'eix */
function mirrorSel(c, axId, edgeIds) {
  const ax = c.edges.get(axId); if (!ax) return 0;
  const A = K.P(c, ax.a), B = K.P(c, ax.b), vmap = new Map(); let n = 0;
  pushUndo('emmiralla');
  const mv = vid => { if (!vmap.has(vid)) vmap.set(vid, K.addVertexRaw(S.model, c, mirrorP(K.P(c, vid), A, B)).id); return vmap.get(vid); };
  for (const id of edgeIds) { const e = c.edges.get(id); if (!e || e.id === axId) continue; eAdd(c, mv(e.a), mv(e.b)); n++; }
  return n;
}
/* AL: mou l'aresta t perquè el seu punt mig caigui sobre la recta de la referència r */
function alignTo(c, rId, tId) {
  const r = c.edges.get(rId), t = c.edges.get(tId); if (!r || !t || r.id === t.id) return false;
  const A = K.P(c, r.a), B = K.P(c, r.b), M = V.lerp(K.P(c, t.a), K.P(c, t.b), 0.5), d = V.norm(V.sub(B, A));
  const Q = V.add(A, V.mul(d, V.dot(V.sub(M, A), d))), delta = V.sub(Q, M);
  if (V.len(delta) < 1e-6) return false;
  pushUndo('alinear'); K.moveVerts(c, [t.a, t.b], delta); return true;
}
/* OF per a línies: crea una còpia paral·lela de l'aresta e a la distància dist, al costat del cursor */
function offsetLine(c, eId, side, dist) {
  const e = c.edges.get(eId); if (!e || !(dist > 1e-6)) return false;
  const A = K.P(c, e.a), B = K.P(c, e.b), d = V.norm(V.sub(B, A)), n = V.mul(V.norm(V.cross(d, [0, 0, 1])), side * dist);
  pushUndo('desfasar'); const a2 = K.addVertexRaw(S.model, c, V.add(A, n)), b2 = K.addVertexRaw(S.model, c, V.add(B, n));
  eAdd(c, a2.id, b2.id); return true;
}
/* costat i distància del cursor respecte a la línia e (en pla) */
function offsetFromCursor(c, e, mx, my) {
  const ray = mouseRay(mx, my), A = K.P(c, e.a), B = K.P(c, e.b), d = V.norm(V.sub(B, A)), nn = V.norm(V.cross(d, [0, 0, 1]));
  const pl = rayPlane(ray, A, [0, 0, 1]); if (!pl) return null;
  const s = V.dot(V.sub(pl, A), nn); return { side: s < 0 ? -1 : 1, dist: Math.abs(s) };
}

/* registre d'eines */
TOOLS.trimm = {
  move(ev, mx, my) {
    clearPrev(); const { c } = ctxInfo();
    if (!st.b) { const h = nearestFreeEdge(c, mx, my); if (h) prevLine([K.P(c, h.a), K.P(c, h.b)], 0x3B6FDB); showTip(mx, my, { label: 'Retallar · clica la línia límit' }); return; }
    const h = nearestFreeEdge(c, mx, my); if (h && h.id !== st.b) prevLine([K.P(c, h.a), K.P(c, h.b)], 0xD6FB41);
    showTip(mx, my, { label: 'Retallar · clica l’extrem a retallar' });
  },
  down(ev, mx, my) {
    const { c } = ctxInfo(), h = nearestFreeEdge(c, mx, my); if (!h) return;
    if (!st.b) { st.b = h.id; toast('Línia límit seleccionada'); return; }
    if (!trimTo(c, st.b, h.id, mx, my)) toast('Aquestes línies no es creuen.');
    st.b = null; refreshAll();
  },
};
TOOLS.split = {
  move(ev, mx, my) { clearPrev(); const { c } = ctxInfo(), h = nearestFreeEdge(c, mx, my); if (h) prevLine([K.P(c, h.a), K.P(c, h.b)], 0x3B6FDB); showTip(mx, my, { label: 'Divideix · clica la línia' }); },
  down(ev, mx, my) { const { c } = ctxInfo(), h = nearestFreeEdge(c, mx, my); if (!h) return; if (splitNear(c, h, mx, my)) refreshAll(); },
};
/* ---------- TR entre línies, murs i plans de referència (v0.35) ---------- */
/* element: {kind:'edge'|'wall'|'ref', id}. Els murs i els plans de referència es tallen en planta (2D). */
function elemSeg(c, el) {
  if (el.kind === 'edge') { const e = c.edges.get(el.id); if (!e) return null; const A = K.P(c, e.a), B = K.P(c, e.b); return { A: [A[0], A[1]], B: [B[0], B[1]], z: A[2] }; }
  if (el.kind === 'wall') { const g = c.groups.get(el.id); if (!g || !g.par) return null; const p = g.par; return { A: [p.a[0], p.a[1]], B: [p.b[0], p.b[1]], z: levelElev(S.model, p.lv) }; }
  if (el.kind === 'pside') { const g = c.groups.get(el.id); if (!g || !g.par || !g.par.pts) return null; const P = g.par.pts, j = (el.i + 1) % P.length; return { A: [P[el.i][0], P[el.i][1]], B: [P[j][0], P[j][1]], z: levelElev(S.model, g.par.lv) }; }
  const r = (S.model.refs || []).find(x => x.id === el.id); if (!r) return null; return { A: [r.a[0], r.a[1]], B: [r.b[0], r.b[1]], z: 0 };
}
/* punt de clic 3D sobre l'element (per a línies 3D) */
function elemClick3(c, el, mx, my) {
  if (el.kind === 'edge') { const e = c.edges.get(el.id); return e ? clickOn(c, e, mx, my) : null; }
  const sg = elemSeg(c, el); if (!sg) return null;
  const d = [sg.B[0] - sg.A[0], sg.B[1] - sg.A[1], 0], q = closestOnLineToRay([sg.A[0], sg.A[1], sg.z], d, mouseRay(mx, my), false);
  return q ? q.p : null;
}
/* element més proper al cursor en pantalla (línies lliures, murs i plans de referència) */
function nearestElem(c, mx, my) {
  let best = null, bd = 10;
  const consider = (el, A, B) => {
    const a = toScreen(A), b = toScreen(B); if (a.z > 1 || b.z > 1) return;
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((mx - a.x) * dx + (my - a.y) * dy) / L2));
    const d = Math.hypot(a.x + dx * t - mx, a.y + dy * t - my); if (d < bd) { bd = d; best = el; }
  };
  for (const e of freeEdges(c)) consider({ kind: 'edge', id: e.id }, K.P(c, e.a), K.P(c, e.b));
  for (const g of c.groups.values()) if (g.par && g.par.type === 'wall') { const z = levelElev(S.model, g.par.lv); consider({ kind: 'wall', id: g.id }, [g.par.a[0], g.par.a[1], z], [g.par.b[0], g.par.b[1], z]); }
  for (const g of c.groups.values()) if (g.par && g.par.type === 'slab' && g.par.pts && g.par.pts.length >= 3) { const P = g.par.pts, z = levelElev(S.model, g.par.lv); P.forEach((q, i) => { const j = (i + 1) % P.length; consider({ kind: 'pside', id: g.id, i }, [q[0], q[1], z], [P[j][0], P[j][1], z]); }); }
  for (const r of S.model.refs || []) consider({ kind: 'ref', id: r.id }, [r.a[0], r.a[1], 0], [r.b[0], r.b[1], 0]);
  return best;
}
/* extrem de l'element que cal moure: el que queda al costat oposat del clic respecte a X (en planta) */
function endToMove2(sg, X, cp) {
  const u = [sg.B[0] - sg.A[0], sg.B[1] - sg.A[1]], L = Math.hypot(u[0], u[1]); if (L < 1e-12) return null;
  const d = [u[0] / L, u[1] / L], dot = (p) => (p[0] - X[0]) * d[0] + (p[1] - X[1]) * d[1];
  const sA = dot(sg.A), sB = dot(sg.B), sC = dot(cp); if (Math.abs(sC) < 1e-9) return null;
  return sC > 0 ? (sA < sB ? 'a' : 'b') : (sA > sB ? 'a' : 'b');
}
/* intersecció de les rectes en planta (2D) */
function infX2(a, b, c0, d) {
  const u = [b[0] - a[0], b[1] - a[1]], w = [d[0] - c0[0], d[1] - c0[1]], den = u[0] * w[1] - u[1] * w[0];
  if (Math.abs(den) < 1e-12 * Math.hypot(...u) * Math.hypot(...w)) return null;
  const t = ((c0[0] - a[0]) * w[1] - (c0[1] - a[1]) * w[0]) / den;
  return [a[0] + u[0] * t, a[1] + u[1] * t];
}
/* mou un extrem de l'element; els murs i plans es modifiquen en la seva geometria, les línies 3D mantenen l'alçada */
function setEnd2(c, el, end, X) {
  if (el.kind === 'wall') { const g = c.groups.get(el.id); g.par[end] = [X[0], X[1]]; return; }
  if (el.kind === 'ref') { const r = S.model.refs.find(x => x.id === el.id); r[end] = [X[0], X[1]]; return; }
  if (el.kind === 'pside') { const P = c.groups.get(el.id).par.pts, idx = end === 'a' ? el.i : (el.i + 1) % P.length; P[idx] = [X[0], X[1]]; return; }
  const e = c.edges.get(el.id); if (!e) return;
  const keepV = end === 'a' ? e.b : e.a, z = K.P(c, e.a)[2], old = [e.a, e.b], nv = K.addVertexRaw(S.model, c, [X[0], X[1], z]);
  eDel(c, e); eAdd(c, nv.id, keepV); vcleanup(c, old);
}
/* TR general en planta (murs, plans de referència i línies): intersecció i cantonada */
function cornerAny(c, e1, e2, p1, p2) {
  const s1 = elemSeg(c, e1), s2 = elemSeg(c, e2); if (!s1 || !s2) return false;
  const X = infX2(s1.A, s1.B, s2.A, s2.B); if (!X) return false;
  const k1 = endToMove2(s1, X, p1), k2 = endToMove2(s2, X, p2); if (!k1 || !k2) return false;
  const keep1 = k1 === 'a' ? s1.B : s1.A, keep2 = k2 === 'a' ? s2.B : s2.A;
  if (Math.hypot(X[0] - keep1[0], X[1] - keep1[1]) < 1e-6 || Math.hypot(X[0] - keep2[0], X[1] - keep2[1]) < 1e-6) return false;
  pushUndo('retallar'); setEnd2(c, e1, k1, X); setEnd2(c, e2, k2, X); return true;
}
TOOLS.trim = {
  move(ev, mx, my) {
    clearPrev(); const { c } = ctxInfo(), el = nearestElem(c, mx, my);
    if (el) { const sg = elemSeg(c, el); if (sg) prevLine([[sg.A[0], sg.A[1], sg.z], [sg.B[0], sg.B[1], sg.z]], st.a ? 0xD6FB41 : 0x3B6FDB); }
    showTip(mx, my, { label: st.a ? 'Retalla/estén · clica el segon element' : 'Retalla/estén · clica el primer element' });
  },
  down(ev, mx, my) {
    const { c } = ctxInfo(), el = nearestElem(c, mx, my); if (!el) return;
    if (!st.a) { st.a = { el, p3: elemClick3(c, el, mx, my) }; toast('Primer element seleccionat'); return; }
    const a = st.a; st.a = null;
    const p3 = elemClick3(c, el, mx, my); let ok;
    if (a.el.kind === 'edge' && el.kind === 'edge') ok = cornerTrim(c, a.el.id, el.id, a.p3, p3);
    else ok = cornerAny(c, a.el, el, [a.p3[0], a.p3[1]], [p3[0], p3[1]]);
    if (!ok) toast('Aquests elements no es creuen en un punt.');
    refreshAll();
  },
};
TOOLS.join = {
  move(ev, mx, my) { clearPrev(); const { c } = ctxInfo(), h = nearestFreeEdge(c, mx, my); if (h) prevLine([K.P(c, h.a), K.P(c, h.b)], st.b ? 0xD6FB41 : 0x3B6FDB); showTip(mx, my, { label: st.b ? 'Uneix · clica la segona línia' : 'Uneix · clica la primera línia' }); },
  down(ev, mx, my) {
    const { c } = ctxInfo(), h = nearestFreeEdge(c, mx, my); if (!h) return;
    if (!st.b) { st.b = h.id; return; }
    const a = st.b; st.b = null;
    if (!joinPair(c, a, h.id)) toast('Aquestes línies no són contigües i col·lineals.');
    refreshAll();
  },
};
TOOLS.mirror = {
  move(ev, mx, my) { clearPrev(); const { c } = ctxInfo(), h = nearestFreeEdge(c, mx, my); if (h) prevLine([K.P(c, h.a), K.P(c, h.b)], 0x3B6FDB); showTip(mx, my, { label: st.ax ? 'Emmiralla · clica per copiar la selecció' : 'Emmiralla · clica l’eix' }); },
  down(ev, mx, my) {
    const { c } = ctxInfo();
    if (!st.ax) { const h = nearestFreeEdge(c, mx, my); if (!h) return; st.ax = h.id; toast('Eix d’emmirallament seleccionat. Clica per copiar la selecció.'); return; }
    const ids = [...S.sel.edges].filter(id => c.edges.has(id) && id !== st.ax);
    if (!ids.length) { toast('Selecciona primer les línies a emmiralla.'); return; }
    mirrorSel(c, st.ax, ids); st.ax = null; refreshAll();
  },
};
TOOLS.align = {
  move(ev, mx, my) { clearPrev(); const { c } = ctxInfo(), h = nearestFreeEdge(c, mx, my); if (h) prevLine([K.P(c, h.a), K.P(c, h.b)], st.r ? 0xD6FB41 : 0x3B6FDB); showTip(mx, my, { label: st.r ? 'Alinear · clica la línia a moure' : 'Alinear · clica la línia de referència' }); },
  down(ev, mx, my) {
    const { c } = ctxInfo(), h = nearestFreeEdge(c, mx, my); if (!h) return;
    if (!st.r) { st.r = h.id; return; }
    if (!alignTo(c, st.r, h.id)) toast('La línia ja és sobre la referència.');
    st.r = null; refreshAll();
  },
};
TOOLS.lineoff = {
  move(ev, mx, my) {
    clearPrev(); const { c } = ctxInfo();
    if (!st.e) { const h = nearestFreeEdge(c, mx, my); if (h) prevLine([K.P(c, h.a), K.P(c, h.b)], 0x3B6FDB); showTip(mx, my, { label: 'Desfasa · clica la línia' }); return; }
    const e = c.edges.get(st.e); if (!e) { st.e = null; return; }
    const o = offsetFromCursor(c, e, mx, my); if (!o) return; st.o = o;
    const A = K.P(c, e.a), B = K.P(c, e.b), n = V.mul(V.norm(V.cross(V.sub(B, A), [0, 0, 1])), o.side * o.dist);
    prevLine([V.add(A, n), V.add(B, n)], 0x1B1D21); showTip(mx, my, { label: 'Desfasa · distància' }, fmtM(o.dist)); $('vcb').value = fmt(o.dist);
  },
  down(ev, mx, my) {
    const { c } = ctxInfo();
    if (!st.e) { const h = nearestFreeEdge(c, mx, my); if (h) st.e = h.id; return; }
    const e = c.edges.get(st.e); if (!e) { st.e = null; return; }
    const o = offsetFromCursor(c, e, mx, my); if (o && offsetLine(c, e.id, o.side, o.dist)) refreshAll();
  },
  vcb(txt) {
    const v = parseNum(txt); const { c } = ctxInfo(); if (v == null || !st.e || !st.o) return;
    const e = c.edges.get(st.e); if (e && offsetLine(c, e.id, st.o.side, Math.abs(v))) refreshAll();
  },
};

