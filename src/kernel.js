/* ============================================================
   guaitaBIMup — KERNEL geomètric (sense dependències)
   Món en metres, Z amunt (com SketchUp).
   Contenidor = { verts, edges, faces, groups }.  L'arrel i cada
   grup són contenidors; la geometria d'un grup no interactua amb
   la de fora.
   ============================================================ */
const K = (() => {
  const EPS = 1e-6, TOL = 1e-5;
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]); return l < 1e-12 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  };

  /* ---------- model ---------- */
  function newContainer(model, kind) {
    return { id: model.nid++, kind: kind || 'root', name: '', verts: new Map(), edges: new Map(), faces: new Map(), groups: new Map() };
  }
  function newModel() {
    const m = { format: 'guaitabimup', v: 1, units: 'm', nid: 1, root: null,
      tags: [{ id: 0, name: 'Sense etiqueta', color: '#8B939F', visible: true }],
      materials: [], levels: [], grids: [], views: [], refs: [], sections: [], dims: [], texts: [], images: [], meta: {} };
    m.root = newContainer(m, 'root');
    return m;
  }

  /* ---------- vèrtexs i arestes ---------- */
  function findVertex(c, p, tol) {
    tol = tol || TOL;
    for (const v of c.verts.values()) if (Math.abs(v.p[0] - p[0]) < tol && Math.abs(v.p[1] - p[1]) < tol && Math.abs(v.p[2] - p[2]) < tol) return v;
    return null;
  }
  function addVertexRaw(model, c, p) {
    const f = findVertex(c, p); if (f) return f;
    const v = { id: model.nid++, p: [p[0], p[1], p[2]] }; c.verts.set(v.id, v); return v;
  }
  function edgeBetween(c, a, b) {
    for (const e of c.edges.values()) if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) return e;
    return null;
  }
  function addEdgeRaw(model, c, a, b) {
    if (a === b) return null;
    const f = edgeBetween(c, a, b); if (f) return f;
    const e = { id: model.nid++, a, b }; c.edges.set(e.id, e); return e;
  }
  function edgesAt(c, vid) { const o = []; for (const e of c.edges.values()) if (e.a === vid || e.b === vid) o.push(e); return o; }
  const P = (c, vid) => c.verts.get(vid).p;

  /* paràmetre t del punt p sobre el segment a-b (null si no hi és) */
  function paramOnSeg(p, a, b, tol) {
    const ab = V.sub(b, a), L2 = V.dot(ab, ab); if (L2 < 1e-18) return null;
    const t = V.dot(V.sub(p, a), ab) / L2;
    const q = V.add(a, V.mul(ab, t));
    if (V.dist(p, q) > (tol || TOL)) return null;
    return t;
  }
  /* intersecció de dos segments 3D: retorna {t,u,p} o null */
  function segSeg(a, b, c, d) {
    const r = V.sub(b, a), s = V.sub(d, c), w = V.sub(c, a);
    const rs = V.cross(r, s), den = V.dot(rs, rs);
    if (den < 1e-16) return null; /* paral·lels */
    if (Math.abs(V.dot(w, rs)) > TOL * Math.sqrt(den)) return null; /* no coplanars */
    const t = V.dot(V.cross(w, s), rs) / den, u = V.dot(V.cross(w, r), rs) / den;
    if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null;
    return { t, u, p: V.add(a, V.mul(r, t)) };
  }

  /* ---------- cares: utilitats ---------- */
  function newell(c, loop) {
    let n = [0, 0, 0];
    for (let i = 0; i < loop.length; i++) {
      const a = P(c, loop[i]), b = P(c, loop[(i + 1) % loop.length]);
      n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return V.norm(n);
  }
  function basis(n) {
    const ref = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const u = V.norm(V.cross(ref, n)), v = V.cross(n, u);
    return { u, v };
  }
  function to2D(p, o, bs) { const d = V.sub(p, o); return [V.dot(d, bs.u), V.dot(d, bs.v)]; }
  function area2D(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
  function pointInPoly2D(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  function onPolyBoundary2D(p, poly, tol) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const abx = b[0] - a[0], aby = b[1] - a[1], L2 = abx * abx + aby * aby; if (L2 < 1e-18) continue;
      let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / L2; t = Math.max(0, Math.min(1, t));
      if (Math.hypot(p[0] - a[0] - abx * t, p[1] - a[1] - aby * t) < tol) return true;
    }
    return false;
  }
  function facePlaneDist(c, f, p) { return V.dot(V.sub(p, P(c, f.loop[0])), f.n); }
  function loopHasEdge(loop, a, b) {
    for (let i = 0; i < loop.length; i++) { const x = loop[i], y = loop[(i + 1) % loop.length]; if ((x === a && y === b) || (x === b && y === a)) return true; }
    return false;
  }
  function facesUsingEdge(c, a, b) {
    const o = [];
    for (const f of c.faces.values()) {
      if (loopHasEdge(f.loop, a, b)) { o.push({ f, hole: -1 }); continue; }
      for (let h = 0; h < f.holes.length; h++) if (loopHasEdge(f.holes[h], a, b)) { o.push({ f, hole: h }); break; }
    }
    return o;
  }
  function addFaceRaw(model, c, loop, holes, mat, n) {
    const f = { id: model.nid++, loop: loop.slice(), holes: (holes || []).map(h => h.slice()), n: n || [0, 0, 1], mat: mat == null ? null : mat, tag: 0 };
    if (!n) f.n = newell(c, f.loop);
    c.faces.set(f.id, f); return f;
  }
  function sameLoopSet(l1, l2) { if (l1.length !== l2.length) return false; const s = new Set(l1); for (const x of l2) if (!s.has(x)) return false; return true; }
  function faceCentroid(c, f) { let s = [0, 0, 0]; for (const id of f.loop) s = V.add(s, P(c, id)); return V.mul(s, 1 / f.loop.length); }
  function faceArea(c, f) {
    const o = P(c, f.loop[0]), bs = basis(f.n);
    let A = Math.abs(area2D(f.loop.map(id => to2D(P(c, id), o, bs))));
    for (const h of f.holes) A -= Math.abs(area2D(h.map(id => to2D(P(c, id), o, bs))));
    return A;
  }
  /* punt (3D, ja al pla) dins la cara, tenint en compte forats */
  function pointInFace(c, f, p, strict) {
    const o = P(c, f.loop[0]), bs = basis(f.n), q = to2D(p, o, bs);
    const outer = f.loop.map(id => to2D(P(c, id), o, bs));
    const onB = onPolyBoundary2D(q, outer, 1e-5);
    if (onB) return !strict;
    if (!pointInPoly2D(q, outer)) return false;
    for (const h of f.holes) { const hp = h.map(id => to2D(P(c, id), o, bs)); if (pointInPoly2D(q, hp) && !onPolyBoundary2D(q, hp, 1e-5)) return false; }
    return true;
  }

  /* ---------- divisió d'arestes ---------- */
  function splitEdge(model, c, e, v) {
    if (v.id === e.a || v.id === e.b) return;
    const a = e.a, b = e.b;
    c.edges.delete(e.id);
    addEdgeRaw(model, c, a, v.id); addEdgeRaw(model, c, v.id, b);
    const ins = loop => {
      for (let i = 0; i < loop.length; i++) {
        const x = loop[i], y = loop[(i + 1) % loop.length];
        if ((x === a && y === b) || (x === b && y === a)) { loop.splice(i + 1, 0, v.id); return; }
      }
    };
    for (const f of c.faces.values()) { ins(f.loop); f.holes.forEach(ins); }
  }
  /* vèrtex a p; si p cau a l'interior d'una aresta, la divideix */
  function vertexAt(model, c, p) {
    const f = findVertex(c, p); if (f) return f;
    const v = { id: model.nid++, p: [p[0], p[1], p[2]] }; c.verts.set(v.id, v);
    for (const e of [...c.edges.values()]) {
      const t = paramOnSeg(p, P(c, e.a), P(c, e.b));
      if (t != null && t > 1e-7 && t < 1 - 1e-7) { splitEdge(model, c, e, v); break; }
    }
    return v;
  }

  /* ---------- cerca automàtica de cares ---------- */
  function planarGraph(c, o, n) {
    const inPl = id => Math.abs(V.dot(V.sub(P(c, id), o), n)) < TOL * 4;
    const adj = new Map();
    for (const e of c.edges.values()) {
      if (!inPl(e.a) || !inPl(e.b)) continue;
      if (!adj.has(e.a)) adj.set(e.a, new Set()); if (!adj.has(e.b)) adj.set(e.b, new Set());
      adj.get(e.a).add(e.b); adj.get(e.b).add(e.a);
    }
    /* poda d'arestes penjants */
    let ch = true;
    while (ch) { ch = false; for (const [v, s] of adj) if (s.size === 1) { const w = [...s][0]; adj.get(w).delete(v); adj.delete(v); ch = true; } else if (s.size === 0) { adj.delete(v); ch = true; } }
    return adj;
  }
  function traceCycle(c, adj, o, bs, a, b) {
    if (!adj.has(a) || !adj.has(b) || !adj.get(a).has(b)) return null;
    const p2 = id => to2D(P(c, id), o, bs);
    const loop = [a]; let prev = a, cur = b, guard = 0;
    while (guard++ < 5000) {
      if (cur === a) break;
      loop.push(cur);
      const pc = p2(cur), pp = p2(prev), back = Math.atan2(pp[1] - pc[1], pp[0] - pc[0]);
      let best = null, bd = Infinity;
      for (const w of adj.get(cur)) {
        if (w === prev) continue;
        const pw = p2(w); let d = back - Math.atan2(pw[1] - pc[1], pw[0] - pc[0]);
        while (d <= 1e-9) d += Math.PI * 2; while (d > Math.PI * 2 + 1e-9) d -= Math.PI * 2;
        if (d < bd) { bd = d; best = w; }
      }
      if (best == null) return null;
      prev = cur; cur = best;
    }
    if (cur !== a) return null;
    if (new Set(loop).size !== loop.length) return null;
    if (area2D(loop.map(p2)) <= 1e-10) return null; /* cicle exterior o degenerat */
    return loop;
  }
  function findFaces(model, c, e) {
    if (!c.edges.has(e.id)) return [];
    const pa = P(c, e.a), pb = P(c, e.b), de = V.norm(V.sub(pb, pa));
    const normals = [];
    const pushN = n => {
      n = V.norm(n); if (V.len(n) < 0.5) return;
      if (Math.abs(V.dot(n, de)) > 1e-4) return;
      for (const m of normals) if (Math.abs(Math.abs(V.dot(m, n)) - 1) < 1e-6) return;
      normals.push(n);
    };
    for (const vid of [e.a, e.b]) for (const f of edgesAt(c, vid)) {
      if (f.id === e.id) continue;
      const other = f.a === vid ? f.b : f.a;
      pushN(V.cross(de, V.sub(P(c, other), P(c, vid))));
    }
    for (const f of c.faces.values()) if (Math.abs(facePlaneDist(c, f, pa)) < TOL * 4 && Math.abs(facePlaneDist(c, f, pb)) < TOL * 4) pushN(f.n);
    const made = [];
    for (const n of normals) {
      const bs = basis(n), adj = planarGraph(c, pa, n);
      const cycles = [];
      for (const [x, y] of [[e.a, e.b], [e.b, e.a]]) { const l = traceCycle(c, adj, pa, bs, x, y); if (l && !cycles.some(q => sameLoopSet(q, l))) cycles.push(l); }
      if (!cycles.length) continue;
      const coplanar = [...c.faces.values()].filter(f => Math.abs(Math.abs(V.dot(f.n, n)) - 1) < 1e-6 && Math.abs(facePlaneDist(c, f, pa)) < TOL * 4);
      /* cas corda: la nova aresta parteix una cara existent */
      const mid = V.lerp(pa, pb, 0.5); let inherit = null; const orphanHoles = [];
      for (const g of coplanar) {
        if (!c.faces.has(g.id)) continue;
        const onLoop = g.loop.includes(e.a) && g.loop.includes(e.b) && !loopHasEdge(g.loop, e.a, e.b);
        const bridge = !onLoop && pointInFace(c, g, mid, true) && cycles.some(l => l.some(id => g.loop.includes(id) || g.holes.some(h => h.includes(id))));
        if ((onLoop && pointInFace(c, g, mid, true)) || bridge) {
          inherit = { mat: g.mat, tag: g.tag, n: g.n }; orphanHoles.push(...g.holes); c.faces.delete(g.id);
        }
      }
      const fresh = [];
      for (const l of cycles) {
        if ([...c.faces.values()].some(f => sameLoopSet(f.loop, l))) continue;
        const f = addFaceRaw(model, c, l, [], inherit ? inherit.mat : null, n);
        if (inherit) { f.tag = inherit.tag; if (V.dot(inherit.n, n) < 0) { f.loop.reverse(); f.n = inherit.n.slice(); } }
        else if (n[2] < -0.999) { f.loop.reverse(); f.n = [0, 0, 1]; }
        fresh.push(f); made.push(f);
      }
      /* forats orfes d'una cara partida */
      for (const h of orphanHoles) { const hp = P(c, h[0]); const t = fresh.find(f => pointInFace(c, f, hp, true)); if (t && !t.loop.includes(h[0])) t.holes.push(h); }
      for (const f of fresh) {
        /* illa: la nova cara és dins d'una cara coplanar existent -> forat */
        for (const g of c.faces.values()) {
          if (g.id === f.id || fresh.includes(g)) continue;
          if (Math.abs(Math.abs(V.dot(g.n, n)) - 1) > 1e-6 || Math.abs(facePlaneDist(c, g, pa)) > TOL * 4) continue;
          if (f.loop.every(id => !g.loop.includes(id) && pointInFace(c, g, P(c, id), true))) {
            if (!g.holes.some(h => sameLoopSet(h, f.loop))) g.holes.push(f.loop.slice());
            if (f.mat == null) f.mat = g.mat;
            if (V.dot(g.n, f.n) < 0) { f.loop.reverse(); f.n = g.n.slice(); }
          } else if (g.loop.every(id => !f.loop.includes(id) && pointInFace(c, f, P(c, id), true))) {
            if (!f.holes.some(h => sameLoopSet(h, g.loop))) f.holes.push(g.loop.slice());
          }
        }
      }
    }
    return made;
  }

  /* ---------- API d'edició ---------- */
  /* Afegeix el segment p1-p2: fusiona vèrtexs, parteix arestes que
     creua i crea les cares que es tanquin. Retorna {edges, faces}. */
  function addEdge(model, c, p1, p2) {
    if (V.dist(p1, p2) < TOL) return { edges: [], faces: [] };
    const v1 = vertexAt(model, c, p1), v2 = vertexAt(model, c, p2);
    const stops = [{ t: 0, v: v1 }, { t: 1, v: v2 }];
    for (const v of c.verts.values()) {
      if (v === v1 || v === v2) continue;
      const t = paramOnSeg(v.p, v1.p, v2.p); if (t != null && t > 1e-7 && t < 1 - 1e-7) stops.push({ t, v });
    }
    for (const e of [...c.edges.values()]) {
      if (!c.edges.has(e.id)) continue;
      const x = segSeg(v1.p, v2.p, P(c, e.a), P(c, e.b)); if (!x) continue;
      if (x.t < 1e-7 || x.t > 1 - 1e-7) continue;
      if (x.u < 1e-7 || x.u > 1 - 1e-7) continue;
      if (stops.some(s => Math.abs(s.t - x.t) < 1e-7)) continue;
      const nv = { id: model.nid++, p: x.p }; c.verts.set(nv.id, nv);
      splitEdge(model, c, e, nv); stops.push({ t: x.t, v: nv });
    }
    stops.sort((a, b) => a.t - b.t);
    const edges = [], faces = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i].v.id, b = stops[i + 1].v.id; if (a === b) continue;
      const existed = edgeBetween(c, a, b);
      const e = existed || addEdgeRaw(model, c, a, b);
      edges.push(e);
      if (!existed) faces.push(...findFaces(model, c, e));
    }
    return { edges, faces };
  }
  function addPolyline(model, c, pts, closed) {
    const out = { edges: [], faces: [] };
    const n = pts.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) { const r = addEdge(model, c, pts[i], pts[(i + 1) % n]); out.edges.push(...r.edges); out.faces.push(...r.faces); }
    return out;
  }
  function cleanupVerts(c) {
    const used = new Set(); for (const e of c.edges.values()) { used.add(e.a); used.add(e.b); }
    for (const id of [...c.verts.keys()]) if (!used.has(id)) c.verts.delete(id);
  }
  function removeFace(c, fid) { c.faces.delete(fid); }
  function removeEdge(model, c, eid) {
    const e = c.edges.get(eid); if (!e) return;
    const users = facesUsingEdge(c, e.a, e.b);
    const outer = users.filter(u => u.hole < 0).map(u => u.f);
    let heal = null;
    if (outer.length === 2 && Math.abs(Math.abs(V.dot(outer[0].n, outer[1].n)) - 1) < 1e-6) {
      const l = outer[0].loop; let k = null;
      for (let i = 0; i < l.length; i++) { const x = l[i], y = l[(i + 1) % l.length]; if (!((x === e.a && y === e.b) || (x === e.b && y === e.a))) { k = [x, y]; break; } }
      heal = { k, mat: outer[0].mat, tag: outer[0].tag, n: outer[0].n.slice(), holes: [...outer[0].holes, ...outer[1].holes] };
    }
    for (const u of users) {
      if (u.hole < 0) c.faces.delete(u.f.id);
      else { const h = u.f.holes[u.hole]; u.f.holes.splice(u.hole, 1); for (const g of [...c.faces.values()]) if (sameLoopSet(g.loop, h)) c.faces.delete(g.id); }
    }
    c.edges.delete(eid);
    if (heal && heal.k) {
      const ke = edgeBetween(c, heal.k[0], heal.k[1]);
      if (ke) for (const f of findFaces(model, c, ke)) {
        f.mat = heal.mat; f.tag = heal.tag; if (V.dot(f.n, heal.n) < 0) { f.loop.reverse(); f.n = heal.n.slice(); }
        for (const h of heal.holes) if (h.every(id => c.verts.has(id)) && pointInFace(c, f, P(c, h[0]), true) && !f.holes.some(q => sameLoopSet(q, h))) f.holes.push(h);
      }
    }
    cleanupVerts(c);
  }

  /* Empeny/estira la cara fid una distància d al llarg de la normal */
  function pushPull(model, c, fid, d) {
    const F = c.faces.get(fid); if (!F || Math.abs(d) < TOL) return null;
    const n = F.n, loops = [F.loop, ...F.holes];
    const vset = new Set(); loops.forEach(l => l.forEach(id => vset.add(id)));
    const isB = (a, b) => loops.some(l => loopHasEdge(l, a, b));
    /* cas lliscament: totes les arestes veïnes són paral·leles a la normal */
    let slide = true;
    for (const vid of vset) {
      const others = edgesAt(c, vid).filter(e => !isB(e.a, e.b));
      if (!others.length) { slide = false; break; }
      for (const e of others) {
        const o = e.a === vid ? e.b : e.a, dir = V.norm(V.sub(P(c, o), P(c, vid)));
        if (Math.abs(Math.abs(V.dot(dir, n)) - 1) > 1e-6) { slide = false; break; }
        /* no deixis col·lapsar ni invertir el volum */
        const L = V.dot(V.sub(P(c, o), P(c, vid)), n); if (L * d > 0 && Math.abs(d) >= Math.abs(L) - TOL) { slide = false; break; }
      }
      if (!slide) break;
    }
    if (slide) { for (const vid of vset) { const v = c.verts.get(vid); v.p = V.add(v.p, V.mul(n, d)); } return { face: F, slid: true }; }
    let free = true;
    for (let i = 0; i < F.loop.length && free; i++) { const a = F.loop[i], b = F.loop[(i + 1) % F.loop.length]; if (facesUsingEdge(c, a, b).some(u => u.f !== F)) free = false; }
    const map = new Map();
    for (const vid of vset) map.set(vid, addVertexRaw(model, c, V.add(P(c, vid), V.mul(n, d))).id);
    for (const l of loops) for (let i = 0; i < l.length; i++) {
      const a = l[i], b = l[(i + 1) % l.length], a2 = map.get(a), b2 = map.get(b);
      addEdgeRaw(model, c, a, a2); addEdgeRaw(model, c, b, b2); addEdgeRaw(model, c, a2, b2);
      const side = d > 0 ? [a, b, b2, a2] : [b, a, a2, b2];
      if (![...c.faces.values()].some(f => sameLoopSet(f.loop, side))) { const sf = addFaceRaw(model, c, side, [], F.mat); sf.tag = F.tag; }
    }
    const top = addFaceRaw(model, c, F.loop.map(id => map.get(id)), F.holes.map(h => h.map(id => map.get(id))), F.mat, n.slice());
    top.tag = F.tag;
    if (free) { if (d > 0) { F.loop.reverse(); F.holes.forEach(h => h.reverse()); F.n = V.mul(n, -1); } else { top.loop.reverse(); top.holes.forEach(h => h.reverse()); top.n = V.mul(n, -1); } }
    else c.faces.delete(F.id);
    return { face: top, slid: false };
  }

  function moveVerts(c, vids, delta) {
    for (const id of vids) { const v = c.verts.get(id); if (v) v.p = V.add(v.p, delta); }
    for (const f of c.faces.values()) if (f.loop.some(id => vids.has ? vids.has(id) : vids.includes(id))) { const nn = newell(c, f.loop); if (V.len(nn) > 0.5) f.n = V.dot(nn, f.n) < 0 ? V.mul(nn, -1) : nn; }
  }
  /* vèrtexs implicats en una selecció {faces:Set, edges:Set} */
  function vertsOf(c, sel) {
    const s = new Set();
    for (const fid of sel.faces || []) { const f = c.faces.get(fid); if (f) { f.loop.forEach(x => s.add(x)); f.holes.forEach(h => h.forEach(x => s.add(x))); } }
    for (const eid of sel.edges || []) { const e = c.edges.get(eid); if (e) { s.add(e.a); s.add(e.b); } }
    return s;
  }
  /* contorn desfasat d'una cara (d>0 cap endins). Retorna punts 3D */
  function offsetLoop(c, f, d) {
    const o = P(c, f.loop[0]), bs = basis(f.n);
    let pts = f.loop.map(id => to2D(P(c, id), o, bs));
    if (area2D(pts) < 0) pts = pts.slice().reverse();
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const d1 = [p1[0] - p0[0], p1[1] - p0[1]], d2 = [p2[0] - p1[0], p2[1] - p1[1]];
      const l1 = Math.hypot(d1[0], d1[1]) || 1, l2 = Math.hypot(d2[0], d2[1]) || 1;
      const n1 = [-d1[1] / l1, d1[0] / l1], n2 = [-d2[1] / l2, d2[0] / l2];
      const a1 = [p0[0] + n1[0] * d, p0[1] + n1[1] * d], a2 = [p1[0] + n2[0] * d, p1[1] + n2[1] * d];
      const den = d1[0] * d2[1] - d1[1] * d2[0];
      let q;
      if (Math.abs(den) < 1e-10) q = [p1[0] + n1[0] * d, p1[1] + n1[1] * d];
      else { const t = ((a2[0] - a1[0]) * d2[1] - (a2[1] - a1[1]) * d2[0]) / den; q = [a1[0] + d1[0] * t, a1[1] + d1[1] * t]; }
      out.push(V.add(o, V.add(V.mul(bs.u, q[0]), V.mul(bs.v, q[1]))));
    }
    return out;
  }

  /* ---------- grups ---------- */
  function makeGroup(model, c, sel) {
    const g = newContainer(model, 'group');
    g.name = 'Grup ' + g.id; g.t = [0, 0, 0]; g.ifc = null; g.level = null; g.tag = 0;
    const vm = new Map();
    const cv = id => { if (!vm.has(id)) { const v = { id: model.nid++, p: P(c, id).slice() }; g.verts.set(v.id, v); vm.set(id, v.id); } return vm.get(id); };
    const eids = new Set(sel.edges || []);
    for (const fid of sel.faces || []) {
      const f = c.faces.get(fid); if (!f) continue;
      for (const l of [f.loop, ...f.holes]) for (let i = 0; i < l.length; i++) { const e = edgeBetween(c, l[i], l[(i + 1) % l.length]); if (e) eids.add(e.id); }
    }
    for (const eid of eids) { const e = c.edges.get(eid); if (e) addEdgeRaw(model, g, cv(e.a), cv(e.b)); }
    for (const fid of sel.faces || []) { const f = c.faces.get(fid); if (!f) continue; const nf = addFaceRaw(model, g, f.loop.map(cv), f.holes.map(h => h.map(cv)), f.mat, f.n.slice()); nf.tag = f.tag; }
    for (const gid of sel.groups || []) { const sg = c.groups.get(gid); if (sg) { g.groups.set(gid, sg); c.groups.delete(gid); } }
    for (const fid of sel.faces || []) c.faces.delete(fid);
    for (const eid of eids) { const e = c.edges.get(eid); if (e && !facesUsingEdge(c, e.a, e.b).length) c.edges.delete(eid); }
    cleanupVerts(c);
    c.groups.set(g.id, g);
    return g;
  }
  function explodeGroup(model, c, gid) {
    const g = c.groups.get(gid); if (!g) return;
    const vm = new Map();
    for (const v of g.verts.values()) vm.set(v.id, addVertexRaw(model, c, V.add(v.p, g.t)).id);
    for (const e of g.edges.values()) addEdgeRaw(model, c, vm.get(e.a), vm.get(e.b));
    for (const f of g.faces.values()) { const nf = addFaceRaw(model, c, f.loop.map(x => vm.get(x)), f.holes.map(h => h.map(x => vm.get(x))), f.mat, f.n.slice()); nf.tag = f.tag; }
    for (const sg of g.groups.values()) { sg.t = V.add(sg.t, g.t); c.groups.set(sg.id, sg); }
    c.groups.delete(gid);
  }
  function cloneGroup(model, g) {
    const j = containerToJSON(g); const map = new Map();
    const re = o => { const nc = containerFromJSON(model, o, true); return nc; };
    return re(j);
  }

  /* ---------- capsa englobant ---------- */
  function bbox(c, off, box) {
    off = off || [0, 0, 0]; box = box || { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const v of c.verts.values()) for (let i = 0; i < 3; i++) { const x = v.p[i] + off[i]; if (x < box.min[i]) box.min[i] = x; if (x > box.max[i]) box.max[i] = x; }
    for (const g of c.groups.values()) bbox(g, V.add(off, g.t), box);
    return box;
  }
  function countAll(c) {
    let v = c.verts.size, e = c.edges.size, f = c.faces.size, g = c.groups.size;
    for (const s of c.groups.values()) { const r = countAll(s); v += r.v; e += r.e; f += r.f; g += r.g; }
    return { v, e, f, g };
  }

  /* ---------- serialització ---------- */
  const r6 = x => Math.round(x * 1e6) / 1e6;
  function containerToJSON(c) {
    const o = { id: c.id, kind: c.kind, name: c.name,
      verts: [...c.verts.values()].map(v => [v.id, r6(v.p[0]), r6(v.p[1]), r6(v.p[2])]),
      edges: [...c.edges.values()].map(e => [e.id, e.a, e.b]),
      faces: [...c.faces.values()].map(f => ({ id: f.id, loop: f.loop, holes: f.holes, n: f.n.map(r6), mat: f.mat, tag: f.tag })),
      groups: [...c.groups.values()].map(containerToJSON) };
    if (c.kind === 'group') { o.t = c.t.map(r6); o.ifc = c.ifc; o.level = c.level; o.tag = c.tag; if (c.par) o.par = JSON.parse(JSON.stringify(c.par)); }
    return o;
  }
  function containerFromJSON(model, o, renumber) {
    const c = { id: renumber ? model.nid++ : o.id, kind: o.kind, name: o.name || '', verts: new Map(), edges: new Map(), faces: new Map(), groups: new Map() };
    const vm = new Map(), nid = id => { if (!renumber) return id; if (!vm.has(id)) vm.set(id, model.nid++); return vm.get(id); };
    for (const v of o.verts) { const id = nid(v[0]); c.verts.set(id, { id, p: [v[1], v[2], v[3]] }); }
    for (const e of o.edges) { const id = renumber ? model.nid++ : e[0]; c.edges.set(id, { id, a: nid(e[1]), b: nid(e[2]) }); }
    for (const f of o.faces) { const id = renumber ? model.nid++ : f.id; c.faces.set(id, { id, loop: f.loop.map(nid), holes: (f.holes || []).map(h => h.map(nid)), n: f.n.slice(), mat: f.mat == null ? null : f.mat, tag: f.tag || 0 }); }
    for (const g of o.groups || []) { const s = containerFromJSON(model, g, renumber); c.groups.set(s.id, s); }
    if (o.kind === 'group') { c.t = (o.t || [0, 0, 0]).slice(); c.ifc = o.ifc || null; c.level = o.level == null ? null : o.level; c.tag = o.tag || 0; c.par = o.par ? JSON.parse(JSON.stringify(o.par)) : null; }
    return c;
  }
  function toJSON(m) {
    return { format: 'guaitabimup', v: 1, units: m.units, nid: m.nid, meta: m.meta, tags: m.tags, materials: m.materials,
      levels: m.levels, grids: m.grids, views: m.views, refs: m.refs, sections: m.sections, dims: m.dims, texts: m.texts, images: m.images || [], root: containerToJSON(m.root) };
  }
  function fromJSON(o) {
    if (!o || (o.format !== 'guaitabimup' && o.format !== 'guaita3dsketch')) throw new Error('Format desconegut');
    const m = newModel();
    m.units = o.units || 'm'; m.nid = o.nid || 1; m.meta = o.meta || {};
    m.tags = o.tags && o.tags.length ? o.tags : m.tags; m.materials = o.materials || [];
    m.levels = o.levels || []; m.grids = o.grids || []; m.views = o.views || [];
    m.refs = o.refs || []; m.images = o.images || []; m.sections = o.sections || []; m.dims = o.dims || []; m.texts = o.texts || [];
    m.root = containerFromJSON(m, o.root, false);
    return m;
  }
  /* OBJ (Z amunt -> Y amunt) ; tri = funció de triangulació externa */
  function toOBJ(m, tri) {
    const out = ['# guaitaBIMup', 'o model']; let base = 1;
    const walk = (c, off) => {
      if (c.kind === 'group') out.push('g ' + (c.name || 'grup').replace(/\s+/g, '_'));
      const idx = new Map(); let k = 0;
      for (const v of c.verts.values()) { const p = V.add(v.p, off); out.push('v ' + r6(p[0]) + ' ' + r6(p[2]) + ' ' + r6(-p[1])); idx.set(v.id, base + k++); }
      for (const f of c.faces.values()) for (const t of tri(c, f)) out.push('f ' + t.map(id => idx.get(id)).join(' '));
      base += k;
      for (const g of c.groups.values()) walk(g, V.add(off, g.t));
    };
    walk(m.root, [0, 0, 0]);
    return out.join('\n') + '\n';
  }

  return { V, EPS, TOL, newModel, newContainer, findVertex, addVertexRaw, addEdgeRaw, edgeBetween, edgesAt, P, addEdge, addPolyline,
    removeEdge, removeFace, cleanupVerts, pushPull, moveVerts, vertsOf, offsetLoop, makeGroup, explodeGroup, cloneGroup, bbox, countAll,
    newell, basis, to2D, area2D, pointInPoly2D, pointInFace, faceCentroid, faceArea, facesUsingEdge, addFaceRaw, loopHasEdge, paramOnSeg,
    toJSON, fromJSON, toOBJ, containerToJSON, containerFromJSON };
})();
if (typeof module !== 'undefined') module.exports = K;
