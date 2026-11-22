const K = require('../src/kernel.js');
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('FAIL: ' + msg); } };
const eq = (a, b, msg) => ok(a === b, msg + ' (esperat ' + b + ', obtingut ' + a + ')');
const rect = (m, c, x0, y0, x1, y1, z) => K.addPolyline(m, c, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], true);
const topFace = (c, z) => [...c.faces.values()].find(f => f.n[2] > 0.99 && Math.abs(c.verts.get(f.loop[0]).p[2] - z) < 1e-6 && f.loop.length >= 4);

/* 1. rectangle -> 1 cara */
let m = K.newModel(), c = m.root;
let r = rect(m, c, 0, 0, 4, 3, 0);
eq(c.faces.size, 1, 'rectangle crea 1 cara'); eq(c.edges.size, 4, '4 arestes'); eq(c.verts.size, 4, '4 vèrtexs');
ok(Math.abs(K.faceArea(c, [...c.faces.values()][0]) - 12) < 1e-9, 'àrea 12');
ok([...c.faces.values()][0].n[2] > 0.99, 'normal amunt');

/* 2. empeny/estira -> caixa */
let f0 = [...c.faces.values()][0];
K.pushPull(m, c, f0.id, 3);
eq(c.faces.size, 6, 'caixa: 6 cares'); eq(c.edges.size, 12, 'caixa: 12 arestes'); eq(c.verts.size, 8, 'caixa: 8 vèrtexs');
for (const e of c.edges.values()) eq(K.facesUsingEdge(c, e.a, e.b).length, 2, 'cada aresta 2 cares');

/* 3. lliscament: re-estirar la tapa no crea geometria */
let top = topFace(c, 3);
ok(!!top, 'tapa trobada');
let rr = K.pushPull(m, c, top.id, 1);
ok(rr.slid, 'la tapa llisca'); eq(c.faces.size, 6, 'segueix 6 cares'); eq(K.bbox(c).max[2], 4, 'alçada 4');

/* 4. rectangle sobre la tapa -> illa amb forat */
rect(m, c, 1, 1, 2, 2, 4);
eq(c.faces.size, 7, 'illa: 7 cares');
top = [...c.faces.values()].find(f => f.holes.length === 1);
ok(!!top, 'la tapa té 1 forat'); ok(Math.abs(K.faceArea(c, top) - 11) < 1e-9, 'àrea tapa 11');
let isl = [...c.faces.values()].find(f => f.loop.length === 4 && Math.abs(K.faceArea(c, f) - 1) < 1e-9 && f.n[2] > 0.99);
ok(!!isl, 'illa trobada');

/* 5. estirar l'illa -> 11 cares */
K.pushPull(m, c, isl.id, 2);
eq(c.faces.size, 11, 'torre: 11 cares'); eq(K.bbox(c).max[2], 6, 'alçada 6');

/* 6. empènyer una illa cap endins (rebaix) */
let m2 = K.newModel(), c2 = m2.root; rect(m2, c2, 0, 0, 4, 4, 0); K.pushPull(m2, c2, [...c2.faces.values()][0].id, 2);
rect(m2, c2, 1, 1, 3, 3, 2);
let isl2 = [...c2.faces.values()].find(f => Math.abs(K.faceArea(c2, f) - 4) < 1e-9 && f.n[2] > 0.99 && !f.holes.length);
K.pushPull(m2, c2, isl2.id, -1);
eq(c2.faces.size, 11, 'rebaix: 11 cares'); ok([...c2.faces.values()].some(f => Math.abs(c2.verts.get(f.loop[0]).p[2] - 1) < 1e-9 && Math.abs(Math.abs(f.n[2]) - 1) < 1e-6), 'fons del rebaix a z=1');

/* 7. diagonal parteix una cara; esborrar-la la cura */
let m3 = K.newModel(), c3 = m3.root; rect(m3, c3, 0, 0, 2, 2, 0);
let d = K.addEdge(m3, c3, [0, 0, 0], [2, 2, 0]);
eq(c3.faces.size, 2, 'diagonal: 2 cares'); eq(c3.edges.size, 5, '5 arestes');
K.removeEdge(m3, c3, d.edges[0].id);
eq(c3.faces.size, 1, 'curació: 1 cara'); eq(c3.edges.size, 4, '4 arestes');

/* 8. creuament: dues línies que es tallen es parteixen */
let m4 = K.newModel(), c4 = m4.root;
K.addEdge(m4, c4, [0, 0, 0], [2, 0, 0]); K.addEdge(m4, c4, [1, -1, 0], [1, 1, 0]);
eq(c4.edges.size, 4, 'creu: 4 arestes'); eq(c4.verts.size, 5, 'creu: 5 vèrtexs');

/* 9. línia de vora a vora per punts mitjos parteix arestes i cara */
let m5 = K.newModel(), c5 = m5.root; rect(m5, c5, 0, 0, 4, 2, 0);
K.addEdge(m5, c5, [2, 0, 0], [2, 2, 0]);
eq(c5.faces.size, 2, 'partició pel mig: 2 cares'); eq(c5.edges.size, 7, '7 arestes'); eq(c5.verts.size, 6, '6 vèrtexs');

/* 10. esborrar aresta d'una caixa elimina 2 cares */
let m6 = K.newModel(), c6 = m6.root; rect(m6, c6, 0, 0, 1, 1, 0); K.pushPull(m6, c6, [...c6.faces.values()][0].id, 1);
K.removeEdge(m6, c6, [...c6.edges.values()][0].id);
eq(c6.faces.size, 4, 'caixa sense aresta: 4 cares');

/* 11. rectangle vertical (pla XZ) */
let m7 = K.newModel(), c7 = m7.root;
K.addPolyline(m7, c7, [[0, 0, 0], [3, 0, 0], [3, 0, 2], [0, 0, 2]], true);
eq(c7.faces.size, 1, 'rectangle vertical: 1 cara'); ok(Math.abs(Math.abs([...c7.faces.values()][0].n[1]) - 1) < 1e-9, 'normal ±Y');

/* 12. cercle de 24 costats + extrusió */
let m8 = K.newModel(), c8 = m8.root; const pts = [];
for (let i = 0; i < 24; i++) pts.push([Math.cos(i / 24 * 2 * Math.PI), Math.sin(i / 24 * 2 * Math.PI), 0]);
K.addPolyline(m8, c8, pts, true);
eq(c8.faces.size, 1, 'cercle: 1 cara'); K.pushPull(m8, c8, [...c8.faces.values()][0].id, 2); eq(c8.faces.size, 26, 'cilindre: 26 cares');

/* 13. desfasament crea illa */
let m9 = K.newModel(), c9 = m9.root; rect(m9, c9, 0, 0, 4, 4, 0);
let off = K.offsetLoop(c9, [...c9.faces.values()][0], 1);
K.addPolyline(m9, c9, off, true);
eq(c9.faces.size, 2, 'offset: 2 cares'); ok([...c9.faces.values()].some(f => f.holes.length === 1 && Math.abs(K.faceArea(c9, f) - 12) < 1e-9), 'anell d’àrea 12');

/* 14. grups i JSON */
let g = K.makeGroup(m, c, { faces: new Set(c.faces.keys()), edges: new Set() });
eq(c.faces.size, 0, 'arrel buida després d’agrupar'); eq(c.edges.size, 0, 'sense arestes a l’arrel'); eq(g.faces.size, 11, 'grup amb 11 cares');
g.ifc = 'IfcWall'; m.levels.push({ id: m.nid++, name: 'Nivell 1', elev: 3 }); m.grids.push({ id: m.nid++, name: 'A', a: [0, 0], b: [5, 0] });
const js = JSON.stringify(K.toJSON(m)), mb = K.fromJSON(JSON.parse(js));
eq(JSON.stringify(K.toJSON(mb)), js, 'JSON ida i tornada idèntic');
eq(K.countAll(mb.root).f, 11, 'cares conservades'); eq([...mb.root.groups.values()][0].ifc, 'IfcWall', 'classe IFC conservada');
K.explodeGroup(mb, mb.root, [...mb.root.groups.keys()][0]);
eq(mb.root.faces.size, 11, 'explotar: 11 cares a l’arrel');
const cl = K.cloneGroup(m, g); ok(cl.id !== g.id && cl.faces.size === 11, 'clonar grup');

/* 15. rectangle gran al voltant d'un de petit -> el petit esdevé forat */
let m10 = K.newModel(), c10 = m10.root; rect(m10, c10, 1, 1, 2, 2, 0); rect(m10, c10, 0, 0, 3, 3, 0);
eq(c10.faces.size, 2, 'envoltant: 2 cares'); ok([...c10.faces.values()].some(f => f.holes.length === 1 && Math.abs(K.faceArea(c10, f) - 8) < 1e-9), 'cara exterior amb forat, àrea 8');

/* 16. OBJ */
const obj = K.toOBJ(m6, (cc, f) => { const o = []; for (let i = 1; i < f.loop.length - 1; i++) o.push([f.loop[0], f.loop[i], f.loop[i + 1]]); return o; });
ok(/^v /m.test(obj) && /^f /m.test(obj), 'OBJ amb vèrtexs i cares');

console.log(`\n${pass} proves superades, ${fail} fallades`);
process.exit(fail ? 1 : 0);
