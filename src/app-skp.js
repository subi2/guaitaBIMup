/* ============================================================
   guaitaBIMup 10 — exportació SKP experimental
   Escriptor: OpenSKP 1.3.0 (MIT), format MFC «legacy» v17 (SketchUp 2013–2020,
   que SketchUp més nou també obre). Avisos de tercers a la capçalera del bundle.
   Cada element (grup BIM o bloc d'esbós) → un grup de SketchUp amb la seva etiqueta
   com a capa, i la classe IFC / nivell com a atributs ('guaitaBIMup').
   ============================================================ */
function buildSKP(els, opt) {
  const IN = 39.37007874015748, notes = [], b = OpenSKP.create(), mats = new Map(), lays = new Map();
  const rgb = hex => hexRGB(hex).map(x => Math.round(x * 255));
  const matH = id => { if (id == null || !S.model.materials[id]) return undefined; if (!mats.has(id)) mats.set(id, b.addMaterial((S.model.materials[id].name || 'Material ' + id).slice(0, 60), rgb(S.model.materials[id].color))); return mats.get(id); };
  const layH = id => { if (!id) return undefined; const t = S.model.tags.find(x => x.id === id); if (!t) return undefined; if (!lays.has(id)) lays.set(id, b.addLayer(t.name.slice(0, 60), { color: rgb(t.color), hidden: !t.visible })); return lays.get(id); };
  /* materials i capes primer (l'escriptor ho exigeix abans de qualsevol geometria) */
  for (const el of els) { layH(el.tag); for (const f of el.faces) matH(f.mat); }
  const P = p => [p[0] * IN, p[1] * IN, p[2] * IN];
  const clean = l => { const o = []; for (const p of l.map(P)) { const q = o[o.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-6) o.push(p); } while (o.length > 1 && Math.hypot(o[0][0] - o[o.length - 1][0], o[0][1] - o[o.length - 1][1], o[0][2] - o[o.length - 1][2]) <= 1e-6) o.pop(); return o; };
  const newell = l => { let n = [0, 0, 0]; for (let i = 0; i < l.length; i++) { const a = l[i], c = l[(i + 1) % l.length]; n[0] += (a[1] - c[1]) * (a[2] + c[2]); n[1] += (a[2] - c[2]) * (a[0] + c[0]); n[2] += (a[0] - c[0]) * (a[1] + c[1]); } return n; };
  let nf = 0, ne = 0, bad = 0;
  const fill = (def, el) => {
    const seg = new Set(), key = (a, c) => [a, c].map(p => p.map(x => Math.round(x * 1e4)).join(',')).sort().join('|');
    for (const f of el.faces) {
      const o = clean(f.o); if (o.length < 3) { bad++; continue; }
      let n = newell(o); if (V.dot(n, f.n) < 0) o.reverse();
      const nn = V.norm(V.dot(n, f.n) < 0 ? n.map(x => -x) : n);
      const holes = f.h.map(clean).filter(h => h.length >= 3).map(h => (V.dot(newell(h), nn) > 0 ? h.slice().reverse() : h));
      for (const l of [o, ...holes]) for (let i = 0; i < l.length; i++) seg.add(key(l[i], l[(i + 1) % l.length]));
      try { def.addFace(o, { material: matH(f.mat), layer: layH(el.tag), holes: holes.length ? holes : undefined, autoTriangulate: true }); nf++; } catch (e) { bad++; if (bad < 4) notes.push('Cara no escrita en «' + el.name + '»: ' + e.message); }
    }
    for (const [a, c] of el.edges) { const pa = P(a), pc = P(c); if (Math.hypot(pa[0] - pc[0], pa[1] - pc[1], pa[2] - pc[2]) < 1e-6 || seg.has(key(pa, pc))) continue; try { def.addPolyline([pa, pc]); ne++; } catch (e) { /* aresta solta no escrita */ } }
  };
  const loose = els.filter(e => e.id === S.model.root.id), groups = els.filter(e => e.id !== S.model.root.id);
  for (const el of groups) {
    const lv = elLevel(el), at = { ifc_class: el.ifc || '', nivell: lv ? lv.name : '', origen: el.kind === 'bim' ? 'BIM' : 'Esbos' };
    b.addGroup(def => fill(def, el), { name: String(el.name || 'Grup').slice(0, 80), layer: layH(el.tag), attributes: at, attributeDictName: 'guaitaBIMup' });
  }
  for (const el of loose) {   /* geometria solta de l'esbós: al model arrel, després dels grups */
    for (const f of el.faces) {
      const o = clean(f.o); if (o.length < 3) { bad++; continue; } const n = newell(o); if (V.dot(n, f.n) < 0) o.reverse();
      const nn = V.norm(V.dot(n, f.n) < 0 ? n.map(x => -x) : n), holes = f.h.map(clean).filter(h => h.length >= 3).map(h => (V.dot(newell(h), nn) > 0 ? h.slice().reverse() : h));
      try { b.addFace(o, { material: matH(f.mat), layer: layH(el.tag), holes: holes.length ? holes : undefined, autoTriangulate: true }); nf++; } catch (e) { bad++; if (bad < 4) notes.push('Cara no escrita a l’esbós: ' + e.message); }
    }
  }
  const bytes = b.toBytes();
  if (bad) notes.push(bad + ' cara/es no escrites (degenerades o no planes).');
  /* verificació: es torna a llegir amb OpenSKP i es compara amb el model */
  let ver = null;
  try {
    const sc = OpenSKP.SkpFile.fromBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).buildScene();
    let area = 0, tri = 0; for (const pr of sc.glbPrimitives) { const p = pr.positions, ix = pr.indices; const T = ix ? ix.length / 3 : p.length / 9; tri += T; for (let t = 0; t < T; t++) { const i = ix ? [ix[3 * t], ix[3 * t + 1], ix[3 * t + 2]] : [3 * t, 3 * t + 1, 3 * t + 2], A = [p[3 * i[0]], p[3 * i[0] + 1], p[3 * i[0] + 2]], B = [p[3 * i[1]], p[3 * i[1] + 1], p[3 * i[1] + 2]], C = [p[3 * i[2]], p[3 * i[2] + 1], p[3 * i[2] + 2]]; area += V.len(V.cross(V.sub(B, A), V.sub(C, A))) / 2; } }
    let ref = 0; const all = els; for (const el of all) for (const f of el.faces) { const o = f.o; let n = [0, 0, 0]; for (let i = 0; i < o.length; i++) { const a = o[i], c = o[(i + 1) % o.length]; n[0] += (a[1] - c[1]) * (a[2] + c[2]); n[1] += (a[2] - c[2]) * (a[0] + c[0]); n[2] += (a[0] - c[0]) * (a[1] + c[1]); } let a2 = V.len(n) / 2; for (const h of f.h) { let m = [0, 0, 0]; for (let i = 0; i < h.length; i++) { const a = h[i], c = h[(i + 1) % h.length]; m[0] += (a[1] - c[1]) * (a[2] + c[2]); m[1] += (a[2] - c[2]) * (a[0] + c[0]); m[2] += (a[0] - c[0]) * (a[1] + c[1]); } a2 -= V.len(m) / 2; } ref += a2; }
    ver = { tri, area, ref, ok: ref > 0 ? Math.abs(area - ref) / ref < 0.02 : true };
  } catch (e) { ver = { err: e.message }; }
  return { bytes, notes, groups: groups.length, faces: nf, edges: ne, layers: lays.size, materials: mats.size, ver };
}
