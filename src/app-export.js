/* ============================================================
   guaitaBIMup 10 — exportació: IFC (2X3 · 4 · 4X1 · 4X2 · 4X3),
   DXF (R12 · R2000 · R2013), OBJ+MTL, glTF/GLB, STL, SVG, PNG
   Àmbit: Esbós (no classificat) · BIM (classificat IFC) · Tot
   ============================================================ */

/* ---------- utilitats: CRC32, zip (emmagatzemat), descàrrega ---------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
const enc = new TextEncoder();
function zipStore(files) {
  const parts = [], cen = []; let off = 0; const u16 = v => [v & 255, v >> 8 & 255], u32 = v => [v & 255, v >> 8 & 255, v >> 16 & 255, v >>> 24 & 255];
  for (const f of files) {
    const nm = enc.encode(f.name), d = f.data, crc = crc32(d);
    const lh = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(d.length), ...u32(d.length), ...u16(nm.length), ...u16(0)]);
    parts.push(lh, nm, d);
    cen.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(d.length), ...u32(d.length), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nm);
    off += lh.length + nm.length + d.length;
  }
  let csz = 0; cen.forEach(c => { csz += c.length; });
  const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(csz), ...u32(off), 0, 0]);
  const all = new Uint8Array(off + csz + end.length); let p = 0; for (const a of [...parts, ...cen, end]) { all.set(a, p); p += a.length; } return all;
}
async function deliver(name, data, mime) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
  let dl = null; try { if (window.claude && window.claude.use) dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename: name, data: blob }); toast('Desat ' + name); return true; }
    catch (e) {
      if (e && e.code === 'declined') { toast('Desat cancel·lat.'); return false; }
      if (e && e.code === 'rejected_extension') {
        try { const u8 = new Uint8Array(await blob.arrayBuffer()); await dl.save({ filename: name + '.zip', data: new Blob([zipStore([{ name, data: u8 }])]) }); toast('Aquest visor només deixa desar alguns formats: ' + name + ' va dins d’un ZIP.'); return true; } catch (e2) { toast('No s’ha pogut desar (' + (e2 && e2.code) + ').'); return false; }
      }
      toast('No s’ha pogut desar (' + (e && e.code) + ').'); return false;
    }
  }
  const a = el('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('Desat ' + name); return true;
}
const baseName = () => S.fileName.replace(/\.gbup\.json$|\.g3ds\.json$|\.json$/i, '') || 'model';

/* ---------- recollida de geometria segons l'àmbit ---------- */
const hidG = g => !tagVisible(g.tag) || (g.ifc && S.hiddenIfc.has(g.ifc));
function flatInto(c, off, acc) {
  for (const f of c.faces.values()) { if (!tagVisible(f.tag)) continue; acc.faces.push({ o: f.loop.map(id => V.add(K.P(c, id), off)), h: f.holes.map(h => h.map(id => V.add(K.P(c, id), off))), n: f.n.slice(), mat: f.mat }); }
  for (const e of c.edges.values()) acc.edges.push([V.add(K.P(c, e.a), off), V.add(K.P(c, e.b), off)]);
  for (const g of c.groups.values()) { if (!tagVisible(g.tag)) continue; flatInto(g, V.add(off, g.t), acc); }
}
function collectScene() {
  const els = [];
  (function walk(c, off, name, level, tag) {
    const acc = { faces: [], edges: [] };
    for (const f of c.faces.values()) { if (!tagVisible(f.tag)) continue; acc.faces.push({ o: f.loop.map(id => V.add(K.P(c, id), off)), h: f.holes.map(h => h.map(id => V.add(K.P(c, id), off))), n: f.n.slice(), mat: f.mat }); }
    for (const e of c.edges.values()) acc.edges.push([V.add(K.P(c, e.a), off), V.add(K.P(c, e.b), off)]);
    if (acc.faces.length || acc.edges.length) els.push({ kind: 'sketch', name, ifc: null, level, tag, id: c.id, faces: acc.faces, edges: acc.edges });
    for (const g of c.groups.values()) {
      if (hidG(g)) continue; const go = V.add(off, g.t);
      if (g.ifc) { const a2 = { faces: [], edges: [] }; flatInto(g, go, a2); els.push({ kind: 'bim', name: g.name || ('Grup ' + g.id), ifc: g.ifc, level: g.level, tag: g.tag, id: g.id, faces: a2.faces, edges: a2.edges }); }
      else walk(g, go, g.name || ('Grup ' + g.id), g.level, g.tag);
    }
  })(S.model.root, [0, 0, 0], 'Esbós', null, 0);
  return els;
}
function scopeFilter(els, scope) { return els.filter(e => scope === 'all' || (scope === 'bim' ? e.kind === 'bim' : e.kind === 'sketch')); }
function elLevel(el) {
  const L = S.model.levels.slice().sort((a, b) => a.elev - b.elev); if (!L.length) return null;
  if (el.level != null) { const l = L.find(x => x.id === el.level); if (l) return l; }
  let mz = Infinity; for (const f of el.faces) for (const p of f.o) mz = Math.min(mz, p[2]); for (const e of el.edges) mz = Math.min(mz, e[0][2], e[1][2]); if (!isFinite(mz)) return L[0];
  let best = L[0]; for (const l of L) if (l.elev <= mz + 0.01) best = l; return best;
}
const tagName = id => { const t = S.model.tags.find(x => x.id === id); return t ? t.name : 'Sense etiqueta'; };
const matHex = i => (i != null && S.model.materials[i]) ? S.model.materials[i].color : '#F4F4F0';
const hexRGB = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

/* malla soldada d'un element: punts únics, cares (anell exterior + forats) i orientació coherent */
function weldElement(el) {
  const pts = [], idx = new Map(), qz = 1 / TOLB(), key = p => Math.round(p[0] * qz) + ',' + Math.round(p[1] * qz) + ',' + Math.round(p[2] * qz);
  const vi = p => { const k = key(p); let i = idx.get(k); if (i == null) { i = pts.length; idx.set(k, i); pts.push(p.slice()); } return i; };
  const clean = l => { const o = []; for (const i of l) if (!o.length || o[o.length - 1] !== i) o.push(i); while (o.length > 1 && o[0] === o[o.length - 1]) o.pop(); return o; };
  const faces = [];
  for (const f of el.faces) { const o = clean(f.o.map(vi)), h = f.h.map(l => clean(l.map(vi))).filter(l => l.length >= 3); if (o.length >= 3) faces.push({ o, h, n: f.n, mat: f.mat }); }
  const nrm = l => { let n = [0, 0, 0]; for (let i = 0; i < l.length; i++) { const a = pts[l[i]], b = pts[l[(i + 1) % l.length]]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); } return V.norm(n); };
  const flip = f => { f.o.reverse(); f.h.forEach(l => l.reverse()); };
  /* aresta -> cares */
  const em = new Map(); faces.forEach((f, fi) => { for (const l of [f.o, ...f.h]) for (let i = 0; i < l.length; i++) { const a = l[i], b = l[(i + 1) % l.length], k = a < b ? a + '_' + b : b + '_' + a; if (!em.has(k)) em.set(k, []); em.get(k).push({ fi, fw: a < b }); } });
  let closed = faces.length > 3; for (const v of em.values()) if (v.length !== 2) { closed = false; break; }
  if (closed) {
    const fl = new Array(faces.length).fill(null), adj = faces.map(() => []);
    for (const v of em.values()) { const [a, b] = v; adj[a.fi].push({ to: b.fi, same: a.fw === b.fw }); adj[b.fi].push({ to: a.fi, same: a.fw === b.fw }); }
    for (let s = 0; s < faces.length; s++) { if (fl[s] != null) continue; fl[s] = false; const q = [s]; while (q.length) { const u = q.pop(); for (const { to, same } of adj[u]) { if (fl[to] == null) { fl[to] = same ? !fl[u] : fl[u]; q.push(to); } } } }
    faces.forEach((f, i) => { if (fl[i]) flip(f); });
    /* volum amb signe: negatiu -> tot invertit */
    let vol = 0; for (const f of faces) { const t = triIdx(pts, f); for (const [a, b, c] of t) vol += V.dot(pts[a], V.cross(pts[b], pts[c])) / 6; } if (vol < 0) faces.forEach(flip);
  } else faces.forEach(f => { if (V.dot(nrm(f.o), f.n) < 0) flip(f); });
  return { pts, faces, closed };
}
function triIdx(pts, f) {
  const n = V.norm(f.n && V.len(f.n) > 0.5 ? f.n : [0, 0, 1]), bs = K.basis(n), o = pts[f.o[0]];
  const to = i => { const q = K.to2D(pts[i], o, bs); return new THREE.Vector2(q[0], q[1]); };
  const ids = [...f.o]; f.h.forEach(h => ids.push(...h)); let t = [];
  try { t = THREE.ShapeUtils.triangulateShape(f.o.map(to), f.h.map(h => h.map(to))); } catch (e) { t = []; }
  return t.map(a => a.map(i => ids[i]));
}
function tris(wm) { const out = []; for (const f of wm.faces) for (const t of triIdx(wm.pts, f)) out.push({ t, f }); return out; }

/* ---------- IFC ---------- */
const IFC_SCHEMAS = { IFC2X3: 'IFC2X3', IFC4: 'IFC4', IFC4X1: 'IFC4X1', IFC4X2: 'IFC4X2', IFC4X3: 'IFC4X3_ADD2' };
function ifcMap(cls, v) {
  const v23 = v === 'IFC2X3', x3 = v === 'IFC4X3', x1 = v === 'IFC4X1' || v === 'IFC4X2';
  const p = ['$'], one = a => a ? [a] : [];
  const M = {
    IfcWall: ['IFCWALL', v23 ? [] : p], IfcCurtainWall: ['IFCCURTAINWALL', v23 ? [] : p], IfcSlab: ['IFCSLAB', p], IfcRoof: ['IFCROOF', v23 ? ['.NOTDEFINED.'] : p],
    IfcColumn: ['IFCCOLUMN', v23 ? [] : p], IfcBeam: ['IFCBEAM', v23 ? [] : p], IfcMember: ['IFCMEMBER', v23 ? [] : p], IfcPlate: ['IFCPLATE', v23 ? [] : p],
    IfcFooting: ['IFCFOOTING', v23 ? ['.NOTDEFINED.'] : p], IfcPile: ['IFCPILE', v23 ? ['.NOTDEFINED.', '$'] : ['$', '$']],
    IfcStair: ['IFCSTAIR', v23 ? ['.NOTDEFINED.'] : p], IfcRamp: ['IFCRAMP', v23 ? ['.NOTDEFINED.'] : p], IfcRailing: ['IFCRAILING', p],
    IfcDoor: ['IFCDOOR', v23 ? ['$', '$'] : ['$', '$', '$', '$', '$']], IfcWindow: ['IFCWINDOW', v23 ? ['$', '$'] : ['$', '$', '$', '$', '$']], IfcCovering: ['IFCCOVERING', p],
    IfcFurniture: v23 ? ['IFCFURNISHINGELEMENT', []] : ['IFCFURNITURE', p],
    IfcSanitaryTerminal: v23 ? ['IFCFLOWTERMINAL', []] : ['IFCSANITARYTERMINAL', p],
    IfcFlowSegment: ['IFCFLOWSEGMENT', []],
    IfcTransportElement: ['IFCTRANSPORTELEMENT', v23 ? ['$', '$', '$'] : p],
    IfcOpeningElement: ['IFCOPENINGELEMENT', v23 ? [] : p],
  };
  if (!v23) { M.IfcShadingDevice = ['IFCSHADINGDEVICE', p]; M.IfcGeographicElement = ['IFCGEOGRAPHICELEMENT', p]; M.IfcCivilElement = ['IFCCIVILELEMENT', []]; }
  if (x3) M.IfcChimney = ['IFCCHIMNEY', p];
  return M[cls] || null;
}
const B64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
function ifcGuid(seed) {
  let h = 2166136261; for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let bits = ''; for (let i = 0; i < 16; i++) bits += Math.floor(rnd() * 256).toString(2).padStart(8, '0');
  let s = B64[parseInt(bits.slice(0, 2), 2)]; for (let i = 2; i < 128; i += 6) s += B64[parseInt(bits.slice(i, i + 6), 2)]; return s;
}
const stepStr = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/[^\x20-\x7e]/g, c => { const h = c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'); return '\\X2\\' + h + '\\X0\\'; }) + "'";
const rf = x => { let s = (Math.round(x * 1e6) / 1e6).toString(); if (/e/i.test(s)) s = x.toFixed(6); if (s.indexOf('.') < 0) s += '.'; return s === '-0.' ? '0.' : s; };

function buildIFC(els, opt) {
  const ver = opt.version, schema = IFC_SCHEMAS[ver], v23 = ver === 'IFC2X3', notes = [], L = [];
  let n = 0; const E = s => { n++; L.push('#' + n + '=' + s + ';'); return '#' + n; };
  const seedBase = (S.model.meta.gid || (S.model.meta.gid = Math.random().toString(36).slice(2))) + '|';
  const G = k => stepStr(ifcGuid(seedBase + k)), now = Math.floor(Date.now() / 1000);
  const person = E("IFCPERSON($,'Subirós',$,$,$,$,$,$)".replace(/'Subirós'/, stepStr('Subirós'))), org = E('IFCORGANIZATION($,' + stepStr('SBS BiM Consulting') + ',$,$,$)');
  const po = E('IFCPERSONANDORGANIZATION(' + person + ',' + org + ',$)'), app = E('IFCAPPLICATION(' + org + ",'3','guaitaBIMup','guaitaBIMup')");
  const oh = v23 ? E('IFCOWNERHISTORY(' + po + ',' + app + ',$,.ADDED.,$,' + po + ',' + app + ',' + now + ')') : '$';
  const o3 = E('IFCCARTESIANPOINT((0.,0.,0.))'), wcs = E('IFCAXIS2PLACEMENT3D(' + o3 + ',$,$)');
  const ctx = E('IFCGEOMETRICREPRESENTATIONCONTEXT($,' + stepStr('Model') + ',3,1.E-05,' + wcs + ',$)'), sub = E("IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*," + ctx + ',$,.MODEL_VIEW.,$)');
  const uL = E('IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)'), uA = E('IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)'), uV = E('IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)'), uR = E('IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)');
  const units = E('IFCUNITASSIGNMENT((' + [uL, uA, uV, uR].join(',') + '))');
  const proj = E('IFCPROJECT(' + G('project') + ',' + oh + ',' + stepStr(baseName()) + ',$,$,$,$,(' + ctx + '),' + units + ')');
  const lp = (rel, p) => E('IFCLOCALPLACEMENT(' + (rel || '$') + ',' + (p || wcs) + ')');
  const siteP = lp(null), site = E('IFCSITE(' + G('site') + ',' + oh + ",'Emplaçament',$,$," + siteP + ',$,$,.ELEMENT.,$,$,$,$,$)'.replace("'Emplaçament'", stepStr('Emplaçament')));
  const bldP = lp(siteP), bld = E('IFCBUILDING(' + G('building') + ',' + oh + ',' + stepStr(baseName()) + ',$,$,' + bldP + ',$,$,.ELEMENT.,$,$,$)');
  const levels = S.model.levels.slice().sort((a, b) => a.elev - b.elev); if (!levels.length) levels.push({ id: -1, name: 'Nivell 0', elev: 0 });
  const stor = new Map();
  for (const l of levels) { const pt = E('IFCCARTESIANPOINT((0.,0.,' + rf(l.elev) + '))'), ax = E('IFCAXIS2PLACEMENT3D(' + pt + ',$,$)'), pl = lp(bldP, ax); const s = E('IFCBUILDINGSTOREY(' + G('storey' + l.id) + ',' + oh + ',' + stepStr(l.name) + ',$,$,' + pl + ',$,$,.ELEMENT.,' + rf(l.elev) + ')'); stor.set(l.id, { id: s, pl, elev: l.elev, items: [], agg: [] }); }
  E('IFCRELAGGREGATES(' + G('agg1') + ',' + oh + ',$,$,' + proj + ',(' + site + '))'); E('IFCRELAGGREGATES(' + G('agg2') + ',' + oh + ',$,$,' + site + ',(' + bld + '))');
  E('IFCRELAGGREGATES(' + G('agg3') + ',' + oh + ',$,$,' + bld + ',(' + [...stor.values()].map(s => s.id).join(',') + '))');
  const styles = new Map(); const styleOf = hex => { let s = styles.get(hex); if (!s) { const c = hexRGB(hex), col = E('IFCCOLOURRGB($,' + rf(c[0]) + ',' + rf(c[1]) + ',' + rf(c[2]) + ')'), rd = E('IFCSURFACESTYLERENDERING(' + col + ',$,$,$,$,$,$,$,.NOTDEFINED.)'); s = E('IFCSURFACESTYLE(' + stepStr(hex) + ',.BOTH.,(' + rd + '))'); styles.set(hex, s); } return s; };
  let count = 0, proxies = 0, openShells = 0; const idOf = new Map(), PARS = parById(), have = new Set(els.map(e => e.id));
  const PENDF = []; els = els.concat(openingEls().filter(o => have.has(o.voids) || o.fills));
  for (const el of els) {
    if (el.fills && !idOf.has(el.fills)) continue;
    const lv = elLevel(el), st = stor.get(lv ? lv.id : levels[0].id) || [...stor.values()][0], dz = [0, 0, st.elev];
    const wm = weldElement({ faces: el.faces.map(f => ({ o: f.o.map(p => V.sub(p, dz)), h: f.h.map(l => l.map(p => V.sub(p, dz))), n: f.n, mat: f.mat })), edges: [] });
    if (!wm.faces.length) { notes.push('«' + el.name + '» no té cares: només arestes, no s’exporta a IFC.'); continue; }
    let item;
    if (v23) {
      const pe = wm.pts.map(p => E('IFCCARTESIANPOINT((' + p.map(rf).join(',') + '))')), fs = wm.faces.map(f => { const b = [E('IFCFACEOUTERBOUND(' + E('IFCPOLYLOOP((' + f.o.map(i => pe[i]).join(',') + '))') + ',.T.)'), ...f.h.map(h => E('IFCFACEBOUND(' + E('IFCPOLYLOOP((' + h.map(i => pe[i]).join(',') + '))') + ',.T.)'))]; return E('IFCFACE((' + b.join(',') + '))'); });
      item = wm.closed ? E('IFCFACETEDBREP(' + E('IFCCLOSEDSHELL((' + fs.join(',') + '))') + ')') : E('IFCFACEBASEDSURFACEMODEL((' + E('IFCCONNECTEDFACESET((' + fs.join(',') + '))') + '))');
    } else {
      const cl = E('IFCCARTESIANPOINTLIST3D((' + wm.pts.map(p => '(' + p.map(rf).join(',') + ')').join(',') + '))');
      const fs = wm.faces.map(f => f.h.length ? E('IFCINDEXEDPOLYGONALFACEWITHVOIDS((' + f.o.map(i => i + 1).join(',') + '),(' + f.h.map(h => '(' + h.map(i => i + 1).join(',') + ')').join(',') + '))') : E('IFCINDEXEDPOLYGONALFACE((' + f.o.map(i => i + 1).join(',') + '))'));
      item = E('IFCPOLYGONALFACESET(' + cl + ',' + (wm.closed ? '.T.' : '.F.') + ',(' + fs.join(',') + '),$)');
    }
    if (!wm.closed) openShells++;
    const hex = el.ifc ? (ifcColor(el.ifc) || '#D44BC2') : matHex(el.faces[0] && el.faces[0].mat);
    const ss = styleOf(hex); E('IFCSTYLEDITEM(' + item + ',(' + (v23 ? E('IFCPRESENTATIONSTYLEASSIGNMENT((' + ss + '))') : ss) + '),$)');
    const rep = E('IFCSHAPEREPRESENTATION(' + sub + ",'Body','" + (v23 ? (wm.closed ? 'Brep' : 'SurfaceModel') : 'Tessellation') + "',(" + item + '))'), pds = E('IFCPRODUCTDEFINITIONSHAPE($,$,(' + rep + '))');
    const pl = E('IFCLOCALPLACEMENT(' + st.pl + ',' + wcs + ')');
    let ent = el.ifc ? ifcMap(el.ifc, ver) : null, objType = '$', cls = el.ifc;
    const pdt = ent && parPdt(PARS.get(el.id)); if (pdt && ent[1].length) ent = [ent[0], [...ent[1].slice(0, -1), pdt]];
    if (ent && el.ow) ent = [ent[0], [rf(el.oh), rf(el.ow), ...ent[1].slice(2)]];
    const pre = G('el' + el.id + '_' + count) + ',' + oh + ',' + stepStr(el.name) + ',$,';
    let id;
    if (el.ifc === 'IfcSpace') {
      id = E('IFCSPACE(' + pre + '$,' + pl + ',' + pds + ',$,.ELEMENT.,' + (v23 ? '.NOTDEFINED.,$' : '$,$') + ')'); st.agg.push(id);
    } else {
      if (!ent) { proxies++; objType = stepStr(el.ifc ? el.ifc.replace(/^Ifc/, '') : 'Esbós'); if (el.ifc && el.ifc !== 'IfcBuildingElementProxy' && el.ifc !== 'IfcSite') notes.push('«' + el.name + '»: ' + el.ifc + ' no existeix a ' + schema + ' com a entitat instanciable; s’exporta com a IfcBuildingElementProxy.'); ent = ['IFCBUILDINGELEMENTPROXY', v23 ? ['$'] : ['$']]; }
      id = E(ent[0] + '(' + pre + objType + ',' + pl + ',' + pds + ',$' + (ent[1].length ? ',' + ent[1].join(',') : '') + ')'); if (!el.voids) st.items.push(id);
    }
    const props = [E('IFCPROPERTYSINGLEVALUE(' + stepStr('Nivell') + ',$,IFCLABEL(' + stepStr(lv ? lv.name : '') + '),$)'), E('IFCPROPERTYSINGLEVALUE(' + stepStr('Etiqueta') + ',$,IFCLABEL(' + stepStr(tagName(el.tag)) + '),$)'), E('IFCPROPERTYSINGLEVALUE(' + stepStr('Origen') + ',$,IFCLABEL(' + stepStr(el.kind === 'bim' ? 'BIM (classificat)' : 'Esbós') + '),$)')];
    const ps = E('IFCPROPERTYSET(' + G('ps' + count) + ',' + oh + ',' + stepStr('Pset_guaitaBIMup') + ',$,(' + props.join(',') + '))'); E('IFCRELDEFINESBYPROPERTIES(' + G('rd' + count) + ',' + oh + ',$,$,(' + id + '),' + ps + ')');
    idOf.set(el.id, id);
    if (el.voids && idOf.has(el.voids)) E('IFCRELVOIDSELEMENT(' + G('rv' + el.id) + ',' + oh + ',$,$,' + idOf.get(el.voids) + ',' + id + ')');
    if (el.fills) E('IFCRELFILLSELEMENT(' + G('rfl' + el.id) + ',' + oh + ',$,$,' + idOf.get(el.fills) + ',' + id + ')');
    if (el.filledBy != null) PENDF.push([id, el.filledBy]);
    count++;
  }
  for (const [op, fid] of PENDF) if (idOf.has(fid)) E('IFCRELFILLSELEMENT(' + G('rfc' + fid) + ',' + oh + ',$,$,' + op + ',' + idOf.get(fid) + ')');
  for (const [k, s] of stor) {
    if (s.items.length) E('IFCRELCONTAINEDINSPATIALSTRUCTURE(' + G('ct' + k) + ',' + oh + ',$,$,(' + s.items.join(',') + '),' + s.id + ')');
    if (s.agg.length) E('IFCRELAGGREGATES(' + G('ag' + k) + ',' + oh + ',$,$,' + s.id + ',(' + s.agg.join(',') + '))');
  }
  /* eixos de pilars */
  const gr = S.model.grids, H = g => Math.abs(g.b[0] - g.a[0]) >= Math.abs(g.b[1] - g.a[1]);
  const gu = gr.filter(H), gv = gr.filter(g => !H(g));
  if (gu.length && gv.length) {
    const ax = g => { const pl = E('IFCPOLYLINE((' + E('IFCCARTESIANPOINT((' + rf(g.a[0]) + ',' + rf(g.a[1]) + '))') + ',' + E('IFCCARTESIANPOINT((' + rf(g.b[0]) + ',' + rf(g.b[1]) + '))') + '))'); return E('IFCGRIDAXIS(' + stepStr(g.name) + ',' + pl + ',.T.)'); };
    const gid = E('IFCGRID(' + G('grid') + ',' + oh + ",'Eixos',$,$," + lp(bldP) + ',$,(' + gu.map(ax).join(',') + '),(' + gv.map(ax).join(',') + '),$' + (ver === 'IFC4X3' ? ',$' : '') + ')'.replace("'Eixos'", stepStr('Eixos')));
    E('IFCRELCONTAINEDINSPATIALSTRUCTURE(' + G('gridct') + ',' + oh + ',$,$,(' + gid + '),' + bld + ')');
  } else if (gr.length) notes.push('Eixos de pilars no exportats: IFC exigeix almenys un eix en cada direcció (n’hi ha ' + gu.length + ' horitzontals i ' + gv.length + ' verticals).');
  const hdr = 'ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION((' + stepStr(v23 ? 'ViewDefinition [CoordinationView_V2.0]' : 'ViewDefinition [ReferenceView_V1.2]') + "),'2;1');\nFILE_NAME(" + stepStr(baseName() + '.ifc') + ',' + stepStr(new Date().toISOString().slice(0, 19)) + ',(' + stepStr('Jordi Subirós') + '),(' + stepStr('SBS BiM Consulting') + '),' + stepStr('guaitaBIMup 10') + ',' + stepStr('guaitaBIMup 3') + ",'');\nFILE_SCHEMA((" + stepStr(schema) + '));\nENDSEC;\nDATA;\n';
  if (openShells) notes.push(openShells + ' element(s) amb malla oberta (no és un sòlid tancat); s’exporten com a malla de cares.');
  return { text: hdr + L.join('\n') + '\nENDSEC;\nEND-ISO-10303-21;\n', notes, count, entities: n };
}

/* ---------- DXF ---------- */
const ACI = [[1, [255, 0, 0]], [2, [255, 255, 0]], [3, [0, 255, 0]], [4, [0, 255, 255]], [5, [0, 0, 255]], [6, [255, 0, 255]], [7, [255, 255, 255]], [8, [128, 128, 128]], [9, [192, 192, 192]], [30, [255, 127, 0]], [40, [255, 191, 0]], [94, [127, 255, 0]], [150, [0, 127, 255]], [210, [191, 0, 255]]];
function aci(hex) { const c = hexRGB(hex).map(x => x * 255); let b = 7, bd = 1e9; for (const [i, r] of ACI) { const d = (r[0] - c[0]) ** 2 + (r[1] - c[1]) ** 2 + (r[2] - c[2]) ** 2; if (d < bd) { bd = d; b = i; } } return b; }
const layerName = s => String(s || '0').toUpperCase().replace(/[^A-Z0-9_\-$]/g, '_').slice(0, 60) || '0';
function buildDXF(els, opt) {
  const ver = opt.version, mod = ver !== 'R12', out = [], notes = [];
  const w = (c, v) => { out.push(String(c)); out.push(typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 1e8) / 1e8)) : String(v)); };
  let hseed = 0x30; const H = () => (hseed++).toString(16).toUpperCase();
  const layerOf = el => opt.layers === 'level' ? ((elLevel(el) || { name: 'SENSE_NIVELL' }).name) : opt.layers === 'tag' ? tagName(el.tag) : (el.ifc || 'ESBOS');
  const layers = new Map(); const reg = (name, hex) => { const k = layerName(name); if (!layers.has(k)) layers.set(k, aci(hex || '#C9CCD1')); return k; };
  const items = [];
  for (const el of els) {
    const ln = reg(layerOf(el), el.ifc ? ifcColor(el.ifc) : '#C9CCD1'), wm = weldElement(el);
    for (const { t } of tris(wm)) items.push({ k: 'F', l: ln, p: t.map(i => wm.pts[i]) });
    if (opt.edges) { const seen = new Set(); const add = (a, b) => { const k = [a, b].map(p => p.map(x => Math.round(x * 1e5)).join(',')).sort().join('|'); if (!seen.has(k)) { seen.add(k); items.push({ k: 'L', l: ln, p: [a, b] }); } }; for (const [a, b] of el.edges) add(a, b); }
  }
  if (opt.extras) {
    const gl = reg('EIXOS', '#A3157F'); for (const g of S.model.grids.concat(S.model.refs || [])) { items.push({ k: 'L', l: g.name && S.model.refs.includes(g) ? reg('PLANS_REF', '#86B300') : gl, p: [[g.a[0], g.a[1], 0], [g.b[0], g.b[1], 0]] }); items.push({ k: 'T', l: gl, p: [[g.a[0], g.a[1], 0]], s: g.name, h: 0.3 }); }
    const nl = reg('NIVELLS', '#0E7C86'); const b = modelBox(); for (const l of S.model.levels) { items.push({ k: 'L', l: nl, p: [[b.min[0] - 1, b.min[1] - 1, l.elev], [b.max[0] + 1, b.min[1] - 1, l.elev]] }); items.push({ k: 'T', l: nl, p: [[b.min[0] - 1, b.min[1] - 1, l.elev]], s: l.name + ' ' + fmtElev(l.elev), h: 0.25 }); }
    const dl = reg('ANOTACIONS', '#FFE500'); for (const d of S.model.dims) { const o = d.off || [0, 0, 0], a = V.add(d.a, o), bb = V.add(d.b, o); items.push({ k: 'L', l: dl, p: [d.a, a] }, { k: 'L', l: dl, p: [d.b, bb] }, { k: 'L', l: dl, p: [a, bb] }, { k: 'T', l: dl, p: [V.lerp(a, bb, 0.5)], s: fmt(V.dist(d.a, d.b), 3) + ' m', h: 0.25 }); }
    for (const t of S.model.texts) items.push({ k: 'T', l: dl, p: [t.p], s: t.t, h: 0.25 });
  }
  if (!layers.size) reg('0');
  const bx = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }; for (const it of items) for (const p of it.p) for (let i = 0; i < 3; i++) { bx.min[i] = Math.min(bx.min[i], p[i]); bx.max[i] = Math.max(bx.max[i], p[i]); } if (!isFinite(bx.min[0])) { bx.min = [0, 0, 0]; bx.max = [1, 1, 1]; }
  const txt = s => String(s).replace(/[\r\n]+/g, ' ');
  /* capçalera */
  w(0, 'SECTION'); w(2, 'HEADER'); w(9, '$ACADVER'); w(1, ver === 'R12' ? 'AC1009' : ver === 'R2000' ? 'AC1015' : 'AC1027');
  if (mod) { const hs = out.length; w(9, '$HANDSEED'); w(5, 'HSEED'); w(9, '$INSUNITS'); w(70, 6); w(9, '$MEASUREMENT'); w(70, 1); }
  w(9, '$EXTMIN'); w(10, bx.min[0]); w(20, bx.min[1]); w(30, bx.min[2]); w(9, '$EXTMAX'); w(10, bx.max[0]); w(20, bx.max[1]); w(30, bx.max[2]); w(0, 'ENDSEC');
  let hLtypeT, hLayerT, hStyleT, hAppidT, hBrT, hVportT, hViewT, hUcsT, hDimT, hBrM, hBrP, hLt = [], hMs, hMe, hPs, hPe, hLayerDefault, hDict;
  if (mod) { w(0, 'SECTION'); w(2, 'CLASSES'); w(0, 'ENDSEC'); }
  w(0, 'SECTION'); w(2, 'TABLES');
  const tbl = (name, count, h, body) => { w(0, 'TABLE'); w(2, name); if (mod) { w(5, h); w(330, 0); w(100, 'AcDbSymbolTable'); } w(70, count); body(); w(0, 'ENDTAB'); };
  if (mod) { hVportT = H(); hLtypeT = H(); hLayerT = H(); hStyleT = H(); hViewT = H(); hUcsT = H(); hAppidT = H(); hDimT = H(); hBrT = H(); hBrM = H(); hBrP = H(); hMs = H(); hMe = H(); hPs = H(); hPe = H(); hDict = H(); tbl('VPORT', 0, hVportT, () => { }); }
  tbl('LTYPE', mod ? 3 : 1, hLtypeT, () => {
    const lt = (nm, desc, h) => { w(0, 'LTYPE'); if (mod) { w(5, h); w(330, hLtypeT); w(100, 'AcDbSymbolTableRecord'); w(100, 'AcDbLinetypeTableRecord'); } w(2, nm); w(70, 0); w(3, desc); w(72, 65); w(73, 0); w(40, 0); };
    if (mod) { lt('ByBlock', '', H()); lt('ByLayer', '', H()); } lt('CONTINUOUS', 'Solid line', H());
  });
  tbl('LAYER', layers.size + (layers.has('0') ? 0 : 1), hLayerT, () => {
    const ly = (nm, c) => { w(0, 'LAYER'); if (mod) { w(5, H()); w(330, hLayerT); w(100, 'AcDbSymbolTableRecord'); w(100, 'AcDbLayerTableRecord'); } w(2, nm); w(70, 0); w(62, c); w(6, 'CONTINUOUS'); };
    if (!layers.has('0')) ly('0', 7); for (const [k, c] of layers) ly(k, c);
  });
  tbl('STYLE', 1, hStyleT, () => { w(0, 'STYLE'); if (mod) { w(5, H()); w(330, hStyleT); w(100, 'AcDbSymbolTableRecord'); w(100, 'AcDbTextStyleTableRecord'); } w(2, 'STANDARD'); w(70, 0); w(40, 0); w(41, 1); w(50, 0); w(71, 0); w(42, 0.2); w(3, 'txt'); w(4, ''); });
  if (mod) { tbl('VIEW', 0, hViewT, () => { }); tbl('UCS', 0, hUcsT, () => { }); }
  tbl('APPID', 1, hAppidT, () => { w(0, 'APPID'); if (mod) { w(5, H()); w(330, hAppidT); w(100, 'AcDbSymbolTableRecord'); w(100, 'AcDbRegAppTableRecord'); } w(2, 'ACAD'); w(70, 0); });
  if (mod) {
    tbl('DIMSTYLE', 0, hDimT, () => { });
    tbl('BLOCK_RECORD', 2, hBrT, () => { for (const [nm, h] of [['*Model_Space', hBrM], ['*Paper_Space', hBrP]]) { w(0, 'BLOCK_RECORD'); w(5, h); w(330, hBrT); w(100, 'AcDbSymbolTableRecord'); w(100, 'AcDbBlockTableRecord'); w(2, nm); w(70, 0); w(280, 1); w(281, 0); } });
  }
  w(0, 'ENDSEC');
  if (mod) {
    w(0, 'SECTION'); w(2, 'BLOCKS');
    for (const [nm, hb, he, br] of [['*Model_Space', hMs, hMe, hBrM], ['*Paper_Space', hPs, hPe, hBrP]]) {
      w(0, 'BLOCK'); w(5, hb); w(330, br); w(100, 'AcDbEntity'); if (nm === '*Paper_Space') w(67, 1); w(8, '0'); w(100, 'AcDbBlockBegin'); w(2, nm); w(70, 0); w(10, 0); w(20, 0); w(30, 0); w(3, nm); w(1, '');
      w(0, 'ENDBLK'); w(5, he); w(330, br); w(100, 'AcDbEntity'); if (nm === '*Paper_Space') w(67, 1); w(8, '0'); w(100, 'AcDbBlockEnd');
    }
    w(0, 'ENDSEC');
  }
  w(0, 'SECTION'); w(2, 'ENTITIES');
  const head = (type, layer, sub) => { w(0, type); if (mod) { w(5, H()); w(330, hBrM); w(100, 'AcDbEntity'); } w(8, layer); if (mod && sub) w(100, sub); };
  for (const it of items) {
    if (it.k === 'F') { head('3DFACE', it.l, 'AcDbFace'); const q = it.p.length === 3 ? [...it.p, it.p[2]] : it.p; q.forEach((p, i) => { w(10 + i, p[0]); w(20 + i, p[1]); w(30 + i, p[2]); }); if (mod) w(70, 0); }
    else if (it.k === 'L') { head('LINE', it.l, 'AcDbLine'); w(10, it.p[0][0]); w(20, it.p[0][1]); w(30, it.p[0][2]); w(11, it.p[1][0]); w(21, it.p[1][1]); w(31, it.p[1][2]); }
    else { head('TEXT', it.l, 'AcDbText'); w(10, it.p[0][0]); w(20, it.p[0][1]); w(30, it.p[0][2]); w(40, it.h); w(1, txt(it.s)); if (mod) w(100, 'AcDbText'); }
  }
  w(0, 'ENDSEC');
  if (mod) { w(0, 'SECTION'); w(2, 'OBJECTS'); const hg = H(); w(0, 'DICTIONARY'); w(5, hDict); w(330, 0); w(100, 'AcDbDictionary'); w(281, 1); w(3, 'ACAD_GROUP'); w(350, hg); w(0, 'DICTIONARY'); w(5, hg); w(330, hDict); w(100, 'AcDbDictionary'); w(281, 1); w(0, 'ENDSEC'); }
  w(0, 'EOF');
  let s = out.join('\n') + '\n'; if (mod) s = s.replace('\nHSEED\n', '\n' + (hseed + 16).toString(16).toUpperCase() + '\n');
  return { text: s, notes, count: items.length, layers: layers.size };
}

/* ---------- OBJ + MTL, STL, glTF/GLB ---------- */
function buildOBJ(els, mtlName) {
  const o = ['# guaitaBIMup 10', 'mtllib ' + mtlName], mats = new Map(); let base = 1;
  for (const el of els) {
    const wm = weldElement(el); o.push('g ' + (el.name || 'element').replace(/\s+/g, '_') + (el.ifc ? '_' + el.ifc : ''));
    for (const p of wm.pts) o.push('v ' + rf(p[0]) + ' ' + rf(p[2]) + ' ' + rf(-p[1]));
    let last = null; for (const { t, f } of tris(wm)) { const hex = el.ifc ? (ifcColor(el.ifc) || '#D44BC2') : matHex(f.mat), nm = 'm_' + hex.slice(1); mats.set(nm, hex); if (nm !== last) { o.push('usemtl ' + nm); last = nm; } o.push('f ' + t.map(i => i + base).join(' ')); }
    base += wm.pts.length;
  }
  const m = ['# guaitaBIMup 10']; for (const [nm, hex] of mats) { const c = hexRGB(hex); m.push('newmtl ' + nm, 'Kd ' + c.map(x => x.toFixed(4)).join(' '), 'Ka 0 0 0', 'd 1', ''); }
  return { obj: o.join('\n') + '\n', mtl: m.join('\n') + '\n' };
}
function buildSTL(els, k) {
  const T = []; for (const el of els) { const wm = weldElement(el); for (const { t } of tris(wm)) T.push(t.map(i => wm.pts[i].map(x => x * k))); }
  const buf = new ArrayBuffer(84 + T.length * 50), dv = new DataView(buf); enc.encode('guaitaBIMup 10').forEach((b, i) => dv.setUint8(i, b)); dv.setUint32(80, T.length, true);
  T.forEach((t, i) => { const nn = V.norm(V.cross(V.sub(t[1], t[0]), V.sub(t[2], t[0]))); let o = 84 + i * 50; [nn, ...t].forEach(v => v.forEach(x => { dv.setFloat32(o, x, true); o += 4; })); dv.setUint16(o, 0, true); });
  return { buf, count: T.length };
}
function buildGLB(els) {
  const nodes = [], meshes = [], mats = [], matIdx = new Map(), bins = []; let off = 0; const acc = [], views = [];
  const mi = hex => { let i = matIdx.get(hex); if (i == null) { i = mats.length; matIdx.set(hex, i); mats.push({ name: hex, pbrMetallicRoughness: { baseColorFactor: [...hexRGB(hex), 1], metallicFactor: 0, roughnessFactor: 0.9 }, doubleSided: true }); } return i; };
  for (const el of els) {
    const wm = weldElement(el), by = new Map();
    for (const { t, f } of tris(wm)) { const hex = el.ifc ? (ifcColor(el.ifc) || '#D44BC2') : matHex(f.mat); if (!by.has(hex)) by.set(hex, []); by.get(hex).push([t, f.n]); }
    const prims = [];
    for (const [hex, list] of by) {
      const pos = new Float32Array(list.length * 9), nor = new Float32Array(list.length * 9); let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      list.forEach(([t, n], i) => { const nn = V.norm(V.cross(V.sub(wm.pts[t[1]], wm.pts[t[0]]), V.sub(wm.pts[t[2]], wm.pts[t[0]]))); t.forEach((id, j) => { const p = wm.pts[id], q = [p[0], p[2], -p[1]], nq = [nn[0], nn[2], -nn[1]]; for (let a = 0; a < 3; a++) { pos[i * 9 + j * 3 + a] = q[a]; nor[i * 9 + j * 3 + a] = nq[a]; mn[a] = Math.min(mn[a], q[a]); mx[a] = Math.max(mx[a], q[a]); } }); });
      const pv = views.length; views.push({ buffer: 0, byteOffset: off, byteLength: pos.byteLength, target: 34962 }); bins.push(new Uint8Array(pos.buffer)); off += pos.byteLength;
      const nv = views.length; views.push({ buffer: 0, byteOffset: off, byteLength: nor.byteLength, target: 34962 }); bins.push(new Uint8Array(nor.buffer)); off += nor.byteLength;
      const pa = acc.length; acc.push({ bufferView: pv, componentType: 5126, count: list.length * 3, type: 'VEC3', min: mn, max: mx }); const na = acc.length; acc.push({ bufferView: nv, componentType: 5126, count: list.length * 3, type: 'VEC3' });
      prims.push({ attributes: { POSITION: pa, NORMAL: na }, material: mi(hex), mode: 4 });
    }
    if (!prims.length) continue; meshes.push({ name: el.name, primitives: prims }); nodes.push({ name: el.name, mesh: meshes.length - 1, extras: { ifcClass: el.ifc || null, kind: el.kind } });
  }
  const json = { asset: { version: '2.0', generator: 'guaitaBIMup 10' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, materials: mats, accessors: acc, bufferViews: views, buffers: [{ byteLength: off }] };
  let js = enc.encode(JSON.stringify(json)); const jl = Math.ceil(js.length / 4) * 4, jb = new Uint8Array(jl).fill(0x20); jb.set(js);
  const bl = Math.ceil(off / 4) * 4, bb = new Uint8Array(bl); let p = 0; for (const b of bins) { bb.set(b, p); p += b.length; }
  const out = new Uint8Array(12 + 8 + jl + 8 + bl), dv = new DataView(out.buffer); dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true); out.set(jb, 20); dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004E4942, true); out.set(bb, 28 + jl);
  return { glb: out, count: meshes.length };
}

/* ---------- SVG i PNG de la vista activa ---------- */
function buildSVG(opt) {
  const W = view.clientWidth || 1000, Hh = view.clientHeight || 700, polys = [], lines = [];
  const els = scopeFilter(collectScene(), opt.scope);
  const sun = V.norm([0.4, -0.5, 0.8]);
  for (const el of els) {
    const wm = weldElement(el);
    for (const f of wm.faces) {
      const sp = [f.o, ...f.h].map(l => l.map(i => toScreen(wm.pts[i]))); if (sp[0].some(q => q.z > 1)) continue;
      const hex = el.ifc ? (ifcColor(el.ifc) || '#D44BC2') : matHex(f.mat), c = hexRGB(hex), sh = 0.55 + 0.45 * Math.abs(V.dot(f.n, sun));
      const col = '#' + c.map(x => Math.round(Math.min(1, x * sh) * 255).toString(16).padStart(2, '0')).join('');
      const d = sp.map(l => 'M' + l.map(q => q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join('L') + 'Z').join(' ');
      const z = sp[0].reduce((s, q) => s + q.z, 0) / sp[0].length; polys.push({ z, d, col });
    }
    if (opt.edges) for (const [a, b] of el.edges) { const p = toScreen(a), q = toScreen(b); if (p.z < 1 && q.z < 1) lines.push(`<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}"/>`); }
  }
  polys.sort((a, b) => b.z - a.z);
  const bg = opt.bg === 'none' ? '' : `<rect width="${W}" height="${Hh}" fill="${opt.bg === 'white' ? '#ffffff' : '#23272E'}"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">\n${bg}\n<g fill-rule="evenodd" stroke="none">${polys.map(p => `<path d="${p.d}" fill="${p.col}"/>`).join('')}</g>\n<g stroke="${opt.bg === 'dark' ? '#E7EAEE' : '#1B1D21'}" stroke-width="0.8" stroke-linecap="round">${lines.join('')}</g>\n</svg>\n`;
}
function buildPNG(opt) {
  return new Promise(res => {
    renderer.render(scene, cam); const W = canvas.width, Hh = canvas.height, c2 = document.createElement('canvas'); c2.width = W; c2.height = Hh; const g = c2.getContext('2d');
    if (opt.bg === 'white') { g.fillStyle = '#fff'; g.fillRect(0, 0, W, Hh); } else if (opt.bg === 'dark') { g.fillStyle = '#23272E'; g.fillRect(0, 0, W, Hh); } else if (opt.bg === 'sky') { const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#7FB0E8'); gr.addColorStop(0.55, '#F2F5F8'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh); }
    g.drawImage(canvas, 0, 0); c2.toBlob(b => res(b), 'image/png');
  });
}

/* ---------- diàleg d'exportació ---------- */
function sceneStats() {
  const all = collectScene(), bim = all.filter(e => e.kind === 'bim'), sk = all.filter(e => e.kind === 'sketch');
  const cnt = a => a.reduce((s, e) => s + e.faces.length, 0); return { all, bim, sk, txt: { bim: bim.length + ' elements BIM · ' + cnt(bim) + ' cares', sketch: sk.length + ' blocs d’esbós · ' + cnt(sk) + ' cares', all: all.length + ' elements · ' + cnt(all) + ' cares' } };
}
const EXP = {
  ifc: { title: 'Exporta IFC', scopes: ['bim', 'all'], ext: 'ifc' }, dxf: { title: 'Exporta DXF', scopes: ['all', 'bim', 'sketch'], ext: 'dxf' }, obj: { title: 'Exporta OBJ + MTL', scopes: ['all', 'bim', 'sketch'], ext: 'obj' },
  skp: { title: 'Exporta SKP (experimental)', scopes: ['all', 'bim', 'sketch'], ext: 'skp' }, glb: { title: 'Exporta glTF / GLB', scopes: ['all', 'bim', 'sketch'], ext: 'glb' }, stl: { title: 'Exporta STL', scopes: ['all', 'bim', 'sketch'], ext: 'stl' }, svg: { title: 'Exporta SVG de la vista', scopes: ['all', 'bim', 'sketch'], ext: 'svg' }, png: { title: 'Exporta PNG de la vista', scopes: [], ext: 'png' },
};
function exportDlg(fmt) {
  const X = EXP[fmt], sc = sceneStats(), SL = { bim: 'BIM (classificat)', sketch: 'Esbós (no classificat)', all: fmt === 'ifc' ? 'BIM + esbós com a elements genèrics' : 'Tot' };
  const sel = (id, opts) => '<select id="' + id + '">' + opts.map(([v, l]) => '<option value="' + v + '">' + esc(l) + '</option>').join('') + '</select>';
  let h = '<h3>' + X.title + '</h3><div class="kv" style="margin-bottom:10px"><span>Nom del fitxer</span><input type="text" id="xName" value="' + esc(baseName()) + '">';
  if (X.scopes.length) h += '<span>Àmbit</span>' + sel('xScope', X.scopes.map(s => [s, SL[s] + ' — ' + (s === 'all' && fmt === 'ifc' ? sc.txt.all : sc.txt[s])]));
  if (fmt === 'ifc') h += '<span>Versió</span>' + sel('xVer', [['IFC4', 'IFC4 (ReferenceView 1.2)'], ['IFC2X3', 'IFC2X3 (CoordinationView 2.0)'], ['IFC4X1', 'IFC4X1'], ['IFC4X2', 'IFC4X2'], ['IFC4X3', 'IFC4X3 ADD2']]) + '<span>Format</span>' + sel('xZip', [['ifc', '.ifc (text STEP)'], ['zip', '.ifczip (comprimit)']]);
  if (fmt === 'dxf') h += '<span>Versió</span>' + sel('xVer', [['R12', 'R12 (AC1009) — màxima compatibilitat'], ['R2000', 'R2000 (AC1015)'], ['R2013', 'R2013 (AC1027)']]) + '<span>Capes per</span>' + sel('xLay', [['class', 'Classe IFC (esbós = ESBOS)'], ['level', 'Nivell'], ['tag', 'Etiqueta']]) + '<span>Arestes</span><label><input type="checkbox" id="xEdg" checked> Inclou LINE per a les arestes</label><span>Guies</span><label><input type="checkbox" id="xExt" checked> Eixos, nivells, cotes i textos</label>';
  if (fmt === 'skp') h += '<span>Format</span><span class="dim" style="font-size:12px">SKP v17 (SketchUp 2013–2020; versions posteriors també l’obren). Experimental: no verificat amb SketchUp real.</span>';
  if (fmt === 'stl') h += '<span>Unitats</span>' + sel('xUnit', [['1000', 'Mil·límetres (impressió 3D)'], ['1', 'Metres']]);
  if (fmt === 'svg') h += '<span>Fons</span>' + sel('xBg', [['white', 'Blanc'], ['none', 'Transparent'], ['dark', 'Gris fosc']]) + '<span>Arestes</span><label><input type="checkbox" id="xEdg" checked> Dibuixa les arestes</label>';
  if (fmt === 'png') h += '<span>Fons</span>' + sel('xBg', [['sky', 'Cel (com al visor)'], ['white', 'Blanc'], ['none', 'Transparent'], ['dark', 'Gris fosc']]);
  h += '</div><div id="xNotes" class="dim" style="font-size:12px;margin-bottom:10px"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="xX">Cancel·la</button><button class="btn" id="xCopy">Copia</button><button class="btn acc" id="xGo">Exporta</button></div>';
  $('dlgBox').innerHTML = h; $('dlg').classList.add('show');
  if (fmt === 'ifc' || fmt === 'dxf') { const d = $('xVer'); if (fmt === 'ifc') d.value = 'IFC4'; }
  const isText = ['ifc', 'dxf', 'svg'].includes(fmt); if (!isText) $('xCopy').style.display = 'none'; $('xX').onclick = () => $('dlg').classList.remove('show');
  const run = async copy => {
    const g = id => $(id), name = g('xName').value.trim() || baseName(), scope = g('xScope') ? g('xScope').value : 'all';
    const els = fmt === 'ifc' ? (scope === 'all' ? sc.all : sc.bim) : scopeFilter(sc.all, scope);
    if (!els.length && fmt !== 'png') { g('xNotes').textContent = 'No hi ha geometria en aquest àmbit.'; return; }
    let data, fname, mime, notes = [];
    try {
      if (fmt === 'ifc') { const r = buildIFC(els, { version: g('xVer').value }); notes = r.notes; data = r.text; fname = name + '.ifc'; mime = 'application/x-step'; if (g('xZip').value === 'zip' && !copy) { data = zipStore([{ name: fname, data: enc.encode(r.text) }]); fname = name + '.ifczip'; mime = 'application/zip'; } }
      else if (fmt === 'dxf') { const r = buildDXF(els, { version: g('xVer').value, layers: g('xLay').value, edges: g('xEdg').checked, extras: g('xExt').checked }); data = r.text; fname = name + '.dxf'; mime = 'application/dxf'; notes = r.notes; }
      else if (fmt === 'obj') { const r = buildOBJ(els, name + '.mtl'); await deliver(name + '.mtl', r.mtl, 'text/plain'); data = r.obj; fname = name + '.obj'; mime = 'text/plain'; }
      else if (fmt === 'skp') { const r = buildSKP(els, {}); data = r.bytes; fname = name + '.skp'; mime = 'application/octet-stream'; notes = r.notes.slice(); const v = r.ver; notes.unshift('Escrit: ' + r.groups + ' grups, ' + r.faces + ' cares, ' + r.layers + ' capes, ' + r.materials + ' materials.' + (v && !v.err ? ' Rellegit amb OpenSKP: ' + v.tri + ' triangles, àrea ' + fmtN(v.area, 2) + ' m² (model ' + fmtN(v.ref, 2) + ' m²) ' + (v.ok ? '✔' : '✘ NO coincideix') : ' Verificació no disponible: ' + (v && v.err))); }
      else if (fmt === 'glb') { const r = buildGLB(els); data = r.glb; fname = name + '.glb'; mime = 'model/gltf-binary'; }
      else if (fmt === 'stl') { const r = buildSTL(els, +g('xUnit').value); data = r.buf; fname = name + '.stl'; mime = 'model/stl'; }
      else if (fmt === 'svg') { data = buildSVG({ scope, bg: g('xBg').value, edges: g('xEdg').checked }); fname = name + '.svg'; mime = 'image/svg+xml'; }
      else if (fmt === 'png') { data = await buildPNG({ bg: g('xBg').value }); fname = name + '.png'; mime = 'image/png'; }
    } catch (e) { g('xNotes').textContent = 'Error en generar el fitxer: ' + e.message; console.error(e); return; }
    if (copy) { try { await navigator.clipboard.writeText(data); toast('Contingut copiat (' + Math.round(data.length / 1024) + ' kB).'); } catch (e) { toast('No s’ha pogut copiar.'); } return; }
    const ok = await deliver(fname, data, mime); if (ok) { $('dlg').classList.remove('show'); if (notes.length) setTimeout(() => dlg('<h3>Avisos de l’exportació</h3><p>' + notes.slice(0, 12).map(esc).join('<br>') + (notes.length > 12 ? '<br>… i ' + (notes.length - 12) + ' més.' : '') + '</p>'), 200); }
  };
  $('xGo').onclick = () => run(false); $('xCopy').onclick = () => run(true);
}
