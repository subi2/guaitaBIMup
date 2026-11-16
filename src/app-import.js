/* ============================================================
   guaitaBIMup 10 — importació: DXF (ASCII) i imatges de calc
   Destí: qualsevol pla existent — nivell, eix de la reixeta estructural
   o pla de referència lliure.
   ============================================================ */
const IMG_DATA = new Map();                     /* id -> dataURL (fora dels snapshots d'undo) */
const gImg = new THREE.Group(); scene.add(gImg);
const imgTex = new Map();

/* ---------- plans de destí ---------- */
function planeList() {
  const L = [];
  S.model.levels.slice().sort((a, b) => b.elev - a.elev).forEach(l => L.push({ k: 'level', id: l.id, name: 'Nivell · ' + l.name + ' (' + fmtElev(l.elev) + ')' }));
  S.model.grids.forEach(g => L.push({ k: 'grid', id: g.id, name: 'Eix · ' + g.name }));
  (S.model.refs || []).forEach(r => L.push({ k: 'ref', id: r.id, name: 'Pla de referència · ' + r.name }));
  return L;
}
function planeFrame(sp) {
  if (!sp) return null;
  if (sp.k === 'level') { const l = S.model.levels.find(x => x.id === sp.id); return l ? { o: [0, 0, l.elev], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], level: l.id, name: l.name } : null; }
  const g = (sp.k === 'grid' ? S.model.grids : S.model.refs || []).find(x => x.id === sp.id); if (!g) return null;
  let u = V.norm([g.b[0] - g.a[0], g.b[1] - g.a[1], 0]); if (V.len(u) < 0.5) u = [1, 0, 0];
  return { o: [g.a[0], g.a[1], 0], u, v: [0, 0, 1], n: V.norm(V.cross(u, [0, 0, 1])), level: null, name: g.name };
}
const planeKey = sp => sp.k + ':' + sp.id;
function planeSelect(id, selKey) {
  return '<select id="' + id + '">' + planeList().map(p => '<option value="' + planeKey(p) + '"' + (planeKey(p) === selKey ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select>';
}
function planeFromKey(key) { const [k, id] = key.split(':'); return { k, id: +id }; }
const defPlaneKey = () => S.level != null ? 'level:' + S.level : (planeList()[0] ? planeKey(planeList()[0]) : '');

/* ---------- lector DXF ---------- */
const INSU = { 1: 0.0254, 2: 0.3048, 3: 1609.344, 4: 0.001, 5: 0.01, 6: 1, 7: 1000, 10: 0.9144, 13: 1e-6, 14: 0.1, 15: 10, 16: 100 };
function aciRGB(n) {
  const B = { 1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF', 5: '#0000FF', 6: '#FF00FF', 7: '#E7EAEE', 8: '#808080', 9: '#C0C0C0' };
  if (B[n]) return B[n]; if (n >= 250 && n <= 255) { const g = Math.round(51 + (n - 250) * 41); return '#' + [g, g, g].map(x => x.toString(16).padStart(2, '0')).join(''); }
  if (n < 10 || n > 249) return '#8B939F';
  const i = n - 10, h = Math.floor(i / 10) * 15, k = i % 10, s = k % 2 ? 0.5 : 1, v = [1, 1, 0.65, 0.65, 0.5, 0.5, 0.3, 0.3, 0.15, 0.15][k];
  const f = x => { const kk = (x + h / 60) % 6, c = v - v * s * Math.max(0, Math.min(kk, 4 - kk, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return '#' + f(5) + f(3) + f(1);
}
function parseDXF(text) {
  if (/^AutoCAD Binary DXF/.test(text)) throw new Error('És un DXF binari: desa’l des del CAD com a DXF ASCII.');
  const L = text.split(/\r\n|\r|\n/), recs = []; let cur = null;
  for (let i = 0; i + 1 < L.length; i += 2) { const c = parseInt(L[i], 10), v = L[i + 1]; if (isNaN(c)) continue; if (c === 0) { cur = { t: v.trim(), g: [] }; recs.push(cur); } else if (cur) cur.g.push([c, v]); }
  const sec = { HEADER: [], TABLES: [], BLOCKS: [], ENTITIES: [] }; let name = null, units = 0;
  for (const r of recs) {
    if (r.t === 'SECTION') { name = (r.g.find(x => x[0] === 2) || [0, ''])[1].trim(); const h = r.g.findIndex(x => x[0] === 9 && x[1].trim() === '$INSUNITS'); if (h >= 0 && r.g[h + 1]) units = parseInt(r.g[h + 1][1], 10) || 0; continue; }
    if (r.t === 'ENDSEC') { name = null; continue; } if (sec[name]) sec[name].push(r);
  }
  const num = (r, c, d) => { const x = r.g.find(q => q[0] === c); return x ? parseFloat(x[1]) : d; };
  const str = (r, c, d) => { const x = r.g.find(q => q[0] === c); return x ? x[1].trim() : d; };
  const layers = new Map(); for (const r of sec.TABLES) if (r.t === 'LAYER') { const nm = str(r, 2, '0'), col = num(r, 62, 7); layers.set(nm, { name: nm, aci: Math.abs(col), off: col < 0 || (num(r, 70, 0) & 1) === 1 }); }
  const joinPoly = list => { const out = []; for (let i = 0; i < list.length; i++) { const r = list[i]; if (r.t === 'POLYLINE') { r.verts = []; let j = i + 1; while (j < list.length && list[j].t === 'VERTEX') { r.verts.push(list[j]); j++; } if (list[j] && list[j].t === 'SEQEND') j++; i = j - 1; out.push(r); } else if (r.t !== 'VERTEX' && r.t !== 'SEQEND') out.push(r); } return out; };
  const blocks = new Map(); let cb = null;
  for (const r of sec.BLOCKS) { if (r.t === 'BLOCK') { cb = { name: str(r, 2, ''), base: [num(r, 10, 0), num(r, 20, 0), num(r, 30, 0)], ents: [] }; blocks.set(cb.name, cb); } else if (r.t === 'ENDBLK') cb = null; else if (cb) cb.ents.push(r); }
  blocks.forEach(b => { b.ents = joinPoly(b.ents); });
  return { ents: joinPoly(sec.ENTITIES), blocks, layers, units, num, str };
}
function arcPts(cx, cy, r, a0, a1) { let sw = a1 - a0; while (sw <= 0) sw += 2 * Math.PI; const n = Math.max(2, Math.ceil(sw / (Math.PI / 32))), o = []; for (let i = 0; i <= n; i++) { const a = a0 + sw * i / n; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; }
function bulgePts(a, b, bu) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < 1e-12) return []; const th = 4 * Math.atan(bu), off = (d / 2) / Math.tan(th / 2), nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, cx = (a[0] + b[0]) / 2 + nx * off, cy = (a[1] + b[1]) / 2 + ny * off, a0 = Math.atan2(a[1] - cy, a[0] - cx), n = Math.max(2, Math.ceil(Math.abs(th) / (Math.PI / 32))), o = [];
  for (let i = 1; i < n; i++) { const an = a0 + th * i / n, r = Math.hypot(a[0] - cx, a[1] - cy); o.push([cx + r * Math.cos(an), cy + r * Math.sin(an)]); } return o;
}
/* expandeix entitats a primitives {k:'poly'|'face'|'text'} amb coordenades del DXF (transformades pels INSERT) */
function dxfPrims(D) {
  const out = [], skipped = new Map(), { num, str } = D, ID = p => p;
  const all = (r, c) => r.g.filter(q => q[0] === c).map(q => parseFloat(q[1]));
  const run = (ents, xf, inhLayer, depth) => {
    for (const r of ents) {
      let ly = str(r, 8, '0'); if (ly === '0' && inhLayer) ly = inhLayer;
      const P3 = (a, b, c) => xf([num(r, a, 0), num(r, b, 0), num(r, c, 0)]);
      switch (r.t) {
        case 'LINE': out.push({ k: 'poly', ly, pts: [P3(10, 20, 30), P3(11, 21, 31)], closed: false }); break;
        case 'LWPOLYLINE': {
          const z = num(r, 38, 0), vs = []; let cv = null;
          for (const [c, v] of r.g) { if (c === 10) { cv = { x: parseFloat(v), y: 0, b: 0 }; vs.push(cv); } else if (c === 20 && cv) cv.y = parseFloat(v); else if (c === 42 && cv) cv.b = parseFloat(v); }
          const closed = (num(r, 70, 0) & 1) === 1, pts = [];
          vs.forEach((q, i) => { pts.push([q.x, q.y]); const nx = vs[(i + 1) % vs.length]; if (q.b && (i < vs.length - 1 || closed)) pts.push(...bulgePts([q.x, q.y], [nx.x, nx.y], q.b)); });
          out.push({ k: 'poly', ly, pts: pts.map(p => xf([p[0], p[1], z])), closed }); break;
        }
        case 'POLYLINE': {
          const fl = num(r, 70, 0); if (fl & 16) { skipped.set('POLYLINE (malla)', (skipped.get('POLYLINE (malla)') || 0) + 1); break; }
          if (fl & 64) { const vv = r.verts.filter(v => (num(v, 70, 0) & 192) === 192 ? false : true).filter(v => (num(v, 70, 0) & 64)), fc = r.verts.filter(v => (num(v, 70, 0) & 128) && !(num(v, 70, 0) & 64));
            const pts = vv.map(v => xf([num(v, 10, 0), num(v, 20, 0), num(v, 30, 0)]));
            for (const f of fc) { const ix = [71, 72, 73, 74].map(c => num(f, c, 0)).filter(x => x).map(x => Math.abs(x) - 1); const fp = ix.map(i => pts[i]).filter(Boolean); if (fp.length >= 3) out.push({ k: 'face', ly, pts: fp }); } break; }
          const vs = r.verts.map(v => ({ p: [num(v, 10, 0), num(v, 20, 0), num(v, 30, 0)], b: num(v, 42, 0) })), closed = (fl & 1) === 1, pts = [];
          vs.forEach((q, i) => { pts.push(q.p); const nx = vs[(i + 1) % vs.length]; if (q.b && (i < vs.length - 1 || closed)) pts.push(...bulgePts(q.p, nx.p, q.b).map(p => [p[0], p[1], q.p[2]])); });
          out.push({ k: 'poly', ly, pts: pts.map(xf), closed }); break;
        }
        case 'CIRCLE': { const c = [num(r, 10, 0), num(r, 20, 0), num(r, 30, 0)], rd = num(r, 40, 0), n = 64, pts = []; for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n; pts.push(xf([c[0] + rd * Math.cos(a), c[1] + rd * Math.sin(a), c[2]])); } out.push({ k: 'poly', ly, pts, closed: true }); break; }
        case 'ARC': { const c = [num(r, 10, 0), num(r, 20, 0), num(r, 30, 0)]; out.push({ k: 'poly', ly, pts: arcPts(c[0], c[1], num(r, 40, 0), num(r, 50, 0) * Math.PI / 180, num(r, 51, 360) * Math.PI / 180).map(p => xf([p[0], p[1], c[2]])), closed: false }); break; }
        case 'ELLIPSE': {
          const c = [num(r, 10, 0), num(r, 20, 0), num(r, 30, 0)], m = [num(r, 11, 1), num(r, 21, 0)], ra = num(r, 40, 1), t0 = num(r, 41, 0), t1 = num(r, 42, 2 * Math.PI), full = Math.abs(t1 - t0 - 2 * Math.PI) < 1e-6, n = 64, pts = [];
          for (let i = 0; i <= (full ? n - 1 : n); i++) { const t = t0 + (t1 - t0) * i / n; pts.push(xf([c[0] + m[0] * Math.cos(t) - m[1] * ra * Math.sin(t), c[1] + m[1] * Math.cos(t) + m[0] * ra * Math.sin(t), c[2]])); }
          out.push({ k: 'poly', ly, pts, closed: full }); break;
        }
        case 'SPLINE': { const f = [], cp = []; let cur = null; for (const [c, v] of r.g) { if (c === 11 || c === 10) { cur = [parseFloat(v), 0, 0]; (c === 11 ? f : cp).push(cur); } else if ((c === 21 || c === 20) && cur) cur[1] = parseFloat(v); else if ((c === 31 || c === 30) && cur) cur[2] = parseFloat(v); } const src = f.length >= 2 ? f : cp; if (src.length >= 2) out.push({ k: 'poly', ly, pts: src.map(xf), closed: (num(r, 70, 0) & 1) === 1 }); break; }
        case '3DFACE': { const p = [P3(10, 20, 30), P3(11, 21, 31), P3(12, 22, 32), P3(13, 23, 33)]; const q = p.filter((x, i) => i < 3 || V.dist(x, p[2]) > 1e-9); out.push({ k: 'face', ly, pts: q }); break; }
        case 'SOLID': { const p = [P3(10, 20, 30), P3(11, 21, 31), P3(13, 23, 33), P3(12, 22, 32)]; out.push({ k: 'face', ly, pts: p.filter((x, i) => i < 3 || V.dist(x, p[2]) > 1e-9), flat: true }); break; }
        case 'TEXT': case 'MTEXT': { let t = r.g.filter(q => q[0] === 3).map(q => q[1]).join('') + (r.g.find(q => q[0] === 1) || [0, ''])[1]; if (r.t === 'MTEXT') t = t.replace(/\\P/g, ' ').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, ''); t = t.trim(); if (t) out.push({ k: 'text', ly, p: P3(10, 20, 30), t, h: num(r, 40, 0.25) }); break; }
        case 'INSERT': {
          const b = D.blocks.get(str(r, 2, '')); if (!b || depth > 8) { skipped.set('INSERT (bloc no trobat)', (skipped.get('INSERT (bloc no trobat)') || 0) + 1); break; }
          const ins = [num(r, 10, 0), num(r, 20, 0), num(r, 30, 0)], sx = num(r, 41, 1), sy = num(r, 42, 1), sz = num(r, 43, 1), a = num(r, 50, 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
          run(b.ents, p => { const x = (p[0] - b.base[0]) * sx, y = (p[1] - b.base[1]) * sy, z = (p[2] - b.base[2]) * sz; return xf([ins[0] + x * ca - y * sa, ins[1] + x * sa + y * ca, ins[2] + z]); }, ly, depth + 1); break;
        }
        case 'POINT': case 'HATCH': case 'DIMENSION': case 'LEADER': case 'IMAGE': case 'VIEWPORT': case 'ATTDEF': case 'ATTRIB': case 'XLINE': case 'RAY': case 'MLINE': case 'SOLID3D': case '3DSOLID': case 'BODY': case 'REGION': case 'WIPEOUT': skipped.set(r.t, (skipped.get(r.t) || 0) + 1); break;
        default: skipped.set(r.t, (skipped.get(r.t) || 0) + 1);
      }
    }
  };
  run(D.ents, ID, null, 0); return { prims: out, skipped };
}

/* ---------- construcció de la geometria al model ---------- */
function importDXFTo(D, P, opt, fname) {
  const fr = planeFrame(opt.plane); if (!fr) { toast('El pla de destí ja no existeix.'); return null; }
  const sc = opt.scale, rot = (opt.rot || 0) * Math.PI / 180, cr = Math.cos(rot), sr = Math.sin(rot);
  const prims = P.prims; let sx = 0, sy = 0, cnt = 0;
  const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const visit = p => { bb.x0 = Math.min(bb.x0, p[0]); bb.x1 = Math.max(bb.x1, p[0]); bb.y0 = Math.min(bb.y0, p[1]); bb.y1 = Math.max(bb.y1, p[1]); };
  for (const q of prims) { if (q.pts) q.pts.forEach(visit); else if (q.p) visit(q.p); }
  const cx = opt.center && isFinite(bb.x0) ? (bb.x0 + bb.x1) / 2 * sc : 0, cy = opt.center && isFinite(bb.y0) ? (bb.y0 + bb.y1) / 2 * sc : 0;
  const { c, off } = ctxInfo(), model = S.model;
  const W = p => { let x = p[0] * sc - cx, y = p[1] * sc - cy, z = (p[2] || 0) * sc; const xr = x * cr - y * sr, yr = x * sr + y * cr; x = xr + (opt.dx || 0); y = yr + (opt.dy || 0); return V.sub(V.add(fr.o, V.add(V.mul(fr.u, x), V.add(V.mul(fr.v, y), V.mul(fr.n, z)))), off); };
  const mk = nm => { const g = K.newContainer(model, 'group'); g.name = nm; g.t = [0, 0, 0]; g.ifc = null; g.level = fr.level; g.tag = 0; return g; };
  const root = mk('DXF · ' + fname.replace(/\.dxf$/i, '')), lg = new Map();
  const layerGrp = nm => {
    let o = lg.get(nm); if (o) return o;
    const info = D.layers.get(nm); let tag = model.tags.find(t => t.name === nm);
    if (!tag) { tag = { id: model.nid++, name: nm, color: aciRGB(info ? info.aci : 7), visible: !(info && info.off) }; model.tags.push(tag); }
    const g = mk(nm); g.tag = tag.id; g.ifc = S.ifcActive || null; root.groups.set(g.id, g); o = { g, vm: new Map(), es: new Set() }; lg.set(nm, o); return o;
  };
  const vtx = (o, p) => { const k = Math.round(p[0] * 1e6) + ',' + Math.round(p[1] * 1e6) + ',' + Math.round(p[2] * 1e6); let id = o.vm.get(k); if (id == null) { id = model.nid++; o.g.verts.set(id, { id, p: p.slice() }); o.vm.set(k, id); } return id; };
  const edge = (o, a, b) => { if (a === b) return; const k = a < b ? a + '_' + b : b + '_' + a; if (o.es.has(k)) return; o.es.add(k); const id = model.nid++; o.g.edges.set(id, { id, a, b }); };
  let nE = 0, nF = 0, nT = 0;
  for (const q of prims) {
    if (q.k === 'text') { if (opt.texts) { model.texts.push({ id: model.nid++, p: V.add(W(q.p), off), t: q.t }); nT++; } continue; }
    const o = layerGrp(q.ly), ids = []; for (const p of q.pts) { const id = vtx(o, W(p)); if (!ids.length || ids[ids.length - 1] !== id) ids.push(id); }
    const closed = q.k === 'face' || q.closed; if (closed) while (ids.length > 1 && ids[0] === ids[ids.length - 1]) ids.pop();
    for (let i = 0; i + 1 < ids.length; i++) { edge(o, ids[i], ids[i + 1]); nE++; } if (closed && ids.length >= 3) edge(o, ids[ids.length - 1], ids[0]);
    if (closed && ids.length >= 3 && (q.k === 'face' || opt.faces)) {
      let n = K.newell(o.g, ids); if (V.len(n) < 1e-9) continue;
      if (q.k === 'poly' && V.dot(n, fr.n) < 0) { ids.reverse(); n = n.map(x => -x); }
      const f = K.addFaceRaw(model, o.g, ids, [], null, n); f.tag = o.g.tag; nF++;
    }
  }
  if (!lg.size && !nT) { toast('El DXF no conté entitats importables.'); return null; }
  root.groups.forEach((g, id) => { if (!g.verts.size) root.groups.delete(id); });
  c.groups.set(root.id, root); return { root, nE, nF, nT, layers: lg.size };
}

/* ---------- diàlegs d'importació ---------- */
function openImportFile(kind) { const i = $(kind === 'dxf' ? 'dxfInput' : 'imgInput'); i.value = ''; i.click(); }
(function () {
  const a = el('input'); a.type = 'file'; a.id = 'dxfInput'; a.accept = '.dxf'; a.style.display = 'none'; document.body.appendChild(a);
  const b = el('input'); b.type = 'file'; b.id = 'imgInput'; b.accept = 'image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg'; b.style.display = 'none'; document.body.appendChild(b);
  a.onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => dxfDlg(f.name, rd.result); rd.readAsText(f); };
  b.onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => imgDlg(f.name, rd.result, f.size); rd.readAsDataURL(f); };
})();
function dxfDlg(name, text) {
  let D, P; try { D = parseDXF(text); P = dxfPrims(D); } catch (e) { dlg('<h3>Importa DXF</h3><p>' + esc(e.message) + '</p>'); return; }
  const bx = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }; for (const q of P.prims) for (const p of (q.pts || (q.p ? [q.p] : []))) { bx.x0 = Math.min(bx.x0, p[0]); bx.x1 = Math.max(bx.x1, p[0]); bx.y0 = Math.min(bx.y0, p[1]); bx.y1 = Math.max(bx.y1, p[1]); }
  const u = INSU[D.units] || 0, far = isFinite(bx.x0) && (Math.abs(bx.x0 + bx.x1) / 2 * (u || 1) > 1e4 || Math.abs(bx.y0 + bx.y1) / 2 * (u || 1) > 1e4);
  const cnt = { poly: 0, face: 0, text: 0 }; P.prims.forEach(q => cnt[q.k]++);
  const sk = [...P.skipped].map(([k, v]) => k + ' ×' + v).join(', ');
  $('dlgBox').innerHTML = '<h3>Importa DXF</h3><p class="dim" style="font-size:12px;margin:0 0 8px">' + esc(name) + ' — ' + cnt.poly + ' línies/polilínies, ' + cnt.face + ' cares, ' + cnt.text + ' textos, ' + D.layers.size + ' capes' + (sk ? '<br>No importat: ' + esc(sk) : '') + '</p>' +
    '<div class="kv" style="margin-bottom:10px"><span>Pla de destí</span>' + planeSelect('iPl', defPlaneKey()) + '<span>Unitats</span><select id="iU"><option value="auto">Auto' + (u ? ' (' + (D.units === 6 ? 'm' : D.units === 4 ? 'mm' : D.units === 5 ? 'cm' : 'INSUNITS ' + D.units) + ')' : ' (sense unitats → mm)') + '</option><option value="1">Metres</option><option value="0.01">Centímetres</option><option value="0.001">Mil·límetres</option><option value="0.0254">Polzades</option><option value="0.3048">Peus</option></select>' +
    '<span>Desplaçament X, Y (m)</span><span style="display:flex;gap:6px"><input type="text" id="iDx" value="0" style="width:80px"><input type="text" id="iDy" value="0" style="width:80px"></span><span>Rotació (°)</span><input type="text" id="iRot" value="0">' +
    '<span>Origen</span><label><input type="checkbox" id="iCen"' + (far ? ' checked' : '') + '> Centra el dibuix al pla' + (far ? ' (coordenades molt llunyanes)' : '') + '</label><span>Cares</span><label><input type="checkbox" id="iFac" checked> Crea cares amb les polilínies tancades</label><span>Textos</span><label><input type="checkbox" id="iTxt" checked> Importa els textos</label></div>' +
    '<div id="iErr" style="color:#ff7a7a;font-size:12px;min-height:16px"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="iX">Cancel·la</button><button class="btn acc" id="iGo">Importa</button></div>';
  $('dlg').classList.add('show'); $('iX').onclick = () => $('dlg').classList.remove('show');
  $('iGo').onclick = () => {
    const f = s => parseFloat(String($(s).value).replace(',', '.')) || 0, uv = $('iU').value, sc = uv === 'auto' ? (u || 0.001) : +uv;
    if (!$('iPl').value) { $('iErr').textContent = 'No hi ha cap pla de destí: crea un nivell, un eix o un pla de referència.'; return; }
    pushUndo(); const r = importDXFTo(D, P, { plane: planeFromKey($('iPl').value), scale: sc, dx: f('iDx'), dy: f('iDy'), rot: f('iRot'), center: $('iCen').checked, faces: $('iFac').checked, texts: $('iTxt').checked }, name);
    $('dlg').classList.remove('show'); if (!r) { S.undo.pop(); return; }
    clearSel(); S.sel.groups.add(r.root.id); refreshAll(); fitView(true);
    toast('DXF importat: ' + r.layers + ' capes → etiquetes, ' + r.nE + ' arestes, ' + r.nF + ' cares, ' + r.nT + ' textos. Un sol grup; desfés (Ctrl+Z) el treu.');
  };
}

/* ---------- imatges de calc ---------- */
function adoptImages() { for (const i of S.model.images || []) if (i.data) { IMG_DATA.set(i.id, i.data); delete i.data; } }
function imgFrame(i) {
  const fr = planeFrame(i.plane); if (!fr) return null; const r = (i.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const ru = V.add(V.mul(fr.u, c), V.mul(fr.v, s)), rv = V.add(V.mul(fr.u, -s), V.mul(fr.v, c));
  return { fr, ru, rv, pos: V.add(fr.o, V.add(V.mul(fr.u, i.cx), V.mul(fr.v, i.cy))) };
}
function rebuildImages() {
  adoptImages(); while (gImg.children.length) { const m = gImg.children[0]; gImg.remove(m); m.geometry.dispose(); m.material.dispose(); }
  for (const i of S.model.images || []) {
    if (i.vis === false) continue; const data = IMG_DATA.get(i.id), f = imgFrame(i); if (!data || !f) continue;
    const key = i.id + ':' + data.length; let tex = imgTex.get(key);
    if (!tex) { tex = new THREE.TextureLoader().load(data, () => { needRender = true; }); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; imgTex.set(key, tex); }
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: i.op == null ? 0.6 : i.op, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2, toneMapped: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(i.wm, i.hm), mat); m.matrixAutoUpdate = false; m.matrix.makeBasis(new THREE.Vector3(...f.ru), new THREE.Vector3(...f.rv), new THREE.Vector3(...f.fr.n)); m.matrix.setPosition(...f.pos); m.renderOrder = -2; gImg.add(m);
  }
  needRender = true;
}
/* tall del raig amb els plans d'imatge (per calcar sobre plans verticals) */
function imgHit(ray) {
  let best = null, bd = Infinity;
  for (const i of S.model.images || []) {
    if (i.vis === false || !IMG_DATA.has(i.id)) continue; const f = imgFrame(i); if (!f) continue;
    const p = rayPlane(ray, f.pos, f.fr.n); if (!p) continue; const d = V.dist(ray.o, p); if (d >= bd) continue;
    const w = V.sub(p, f.pos), x = V.dot(w, f.ru), y = V.dot(w, f.rv); if (Math.abs(x) > i.wm / 2 || Math.abs(y) > i.hm / 2) continue;
    bd = d; best = { p, n: f.fr.n.slice(), img: i };
  }
  return best;
}
function imgDlg(name, data, size) {
  const im = new Image(); im.onload = () => {
    const nw = im.naturalWidth || 1000, nh = im.naturalHeight || 1000, mb = size / 1048576;
    $('dlgBox').innerHTML = '<h3>Importa imatge per calcar</h3><p class="dim" style="font-size:12px;margin:0 0 8px">' + esc(name) + ' — ' + nw + '×' + nh + ' px, ' + mb.toFixed(2) + ' MB' + (mb > 2 ? '<br><b>Atenció:</b> la imatge s’incrusta al fitxer .gbup.json i el farà pesar més; considera reduir-la abans.' : '') + '</p>' +
      '<div class="kv" style="margin-bottom:10px"><span>Pla de destí</span>' + planeSelect('iPl', defPlaneKey()) + '<span>Amplada (m)</span><input type="text" id="iW" value="10"><span>Opacitat</span><input type="range" id="iOp" min="5" max="100" value="60"></div><p class="dim" style="font-size:12px;margin:0 0 8px">Després la pots calibrar amb dos punts de distància coneguda (panell «Imatges de calc»).</p>' +
      '<div id="iErr" style="color:#ff7a7a;font-size:12px;min-height:16px"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="iX">Cancel·la</button><button class="btn acc" id="iGo">Importa</button></div>';
    $('dlg').classList.add('show'); $('iX').onclick = () => $('dlg').classList.remove('show');
    $('iGo').onclick = () => {
      const w = parseFloat(String($('iW').value).replace(',', '.')); if (!(w > 0.01 && w < 100000)) { $('iErr').textContent = 'Amplada no vàlida.'; return; } if (!$('iPl').value) { $('iErr').textContent = 'No hi ha cap pla de destí.'; return; }
      pushUndo(); const id = S.model.nid++; IMG_DATA.set(id, data);
      S.model.images.push({ id, name, plane: planeFromKey($('iPl').value), cx: 0, cy: 0, wm: w, hm: w * nh / nw, rot: 0, op: +$('iOp').value / 100, lock: false, vis: true, nw, nh });
      $('dlg').classList.remove('show'); refreshAll(); toast('Imatge afegida. Calibra-la amb «Calibra» al panell Imatges de calc.');
    };
  }; im.onerror = () => dlg('<h3>Importa imatge</h3><p>No s’ha pogut llegir la imatge.</p>'); im.src = data;
}
function imgPanel(b) {
  const imgs = S.model.images || [];
  if (!imgs.length) { b.appendChild(el('div', 'dim', 'Cap imatge. Fitxer ▸ Importa ▸ Imatge de calc.')); return; }
  imgs.forEach(i => {
    const box = el('div', 'row', ''); box.style.cssText = 'flex-direction:column;align-items:stretch;gap:4px;border-bottom:1px solid var(--line);padding:6px 0';
    const pn = planeList().find(p => p.k === i.plane.k && p.id === i.plane.id);
    box.innerHTML = '<div style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="iv"' + (i.vis !== false ? ' checked' : '') + ' title="Visible"><span class="gw" style="flex:1">' + esc(i.name) + '</span><label title="Bloqueja"><input type="checkbox" class="il"' + (i.lock ? ' checked' : '') + '> 🔒</label><button class="btn sm id" title="Elimina">×</button></div><div class="dim" style="font-size:11px">' + esc(pn ? pn.name : '(pla desaparegut)') + ' · ' + fmt(i.wm, 2) + ' × ' + fmt(i.hm, 2) + ' m</div>' +
      '<div style="display:flex;gap:6px;align-items:center"><span class="dim" style="font-size:11px">Opacitat</span><input type="range" class="io" min="5" max="100" value="' + Math.round((i.op == null ? 0.6 : i.op) * 100) + '" style="flex:1"><span class="dim" style="font-size:11px">Gir°</span><input type="text" class="ir" value="' + fmt(i.rot || 0, 2) + '" style="width:54px"></div><div style="display:flex;gap:6px"><button class="btn sm ic">Calibra</button><button class="btn sm im">Mou</button></div>';
    const q = s => box.querySelector(s); let touched = false; const once = () => { if (!touched) { pushUndo(); touched = true; } };
    q('.iv').onchange = e => { pushUndo(); i.vis = e.target.checked; rebuildImages(); };
    q('.il').onchange = e => { pushUndo(); i.lock = e.target.checked; };
    q('.id').onclick = () => { pushUndo(); S.model.images = S.model.images.filter(x => x !== i); refreshAll(); };
    q('.io').oninput = e => { once(); i.op = e.target.value / 100; rebuildImages(); }; q('.io').onchange = () => { touched = false; };
    q('.ir').onchange = e => { if (i.lock) { toast('La imatge està bloquejada.'); return; } const v = parseFloat(String(e.target.value).replace(',', '.')); if (isNaN(v)) return; pushUndo(); i.rot = v; refreshAll(); };
    q('.ic').onclick = () => { if (i.lock) { toast('La imatge està bloquejada.'); return; } S.imgTarget = i.id; setTool('imgcal'); toast('Calibratge: clica dos punts de la imatge amb distància coneguda.'); };
    q('.im').onclick = () => { if (i.lock) { toast('La imatge està bloquejada.'); return; } S.imgTarget = i.id; setTool('imgmove'); toast('Mou: clica el punt d’origen i el de destí.'); };
    b.appendChild(box);
  });
}
const imgOf = () => (S.model.images || []).find(x => x.id === S.imgTarget);
function imgPt(pk, f) { return projToPlane(pk, { o: f.pos, n: f.fr.n }); }
TOOLS.imgcal = {
  move(ev, mx, my) { const i = imgOf(), f = i && imgFrame(i); if (!f) return; const pk = pick(mx, my); const p = imgPt(pk, f); clearPrev(); if (st.a) { prevLine([st.a, p], 0xC77800); showTip(mx, my, pk, fmtM(V.dist(st.a, p))); } else showTip(mx, my, pk); },
  down(ev, mx, my) {
    const i = imgOf(), f = i && imgFrame(i); if (!f) { cancelTool(); return; } const pk = pick(mx, my), p = imgPt(pk, f);
    if (!st.a) { st.a = p; return; } if (V.dist(st.a, p) < 1e-4) return; const a = st.a, d = V.dist(a, p); cancelTool();
    $('dlgBox').innerHTML = '<h3>Calibra la imatge</h3><div class="kv" style="margin-bottom:10px"><span>Distància mesurada (m)</span><span class="dim">' + fmt(d, 3) + '</span><span>Distància real (m)</span><input type="text" id="cD" value="' + fmt(d, 3).replace(/\./g, '') .replace(',', '.') + '"></div><div id="cE" style="color:#ff7a7a;font-size:12px;min-height:16px"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="cX">Cancel·la</button><button class="btn acc" id="cOk">Aplica</button></div>';
    $('dlg').classList.add('show'); $('cX').onclick = () => $('dlg').classList.remove('show'); setTimeout(() => { $('cD').select(); }, 0);
    $('cOk').onclick = () => {
      const v = parseFloat(String($('cD').value).replace(',', '.')); if (!(v > 0)) { $('cE').textContent = 'Distància no vàlida.'; return; }
      const k = v / d, w = V.sub(a, f.pos), ax = V.dot(w, f.fr.u), ay = V.dot(w, f.fr.v); pushUndo();
      i.cx = ax + (i.cx - ax) * k; i.cy = ay + (i.cy - ay) * k; i.wm *= k; i.hm *= k; $('dlg').classList.remove('show'); refreshAll(); toast('Imatge escalada ×' + fmt(k, 4) + '.');
    };
  },
};
TOOLS.imgmove = {
  move(ev, mx, my) { const i = imgOf(), f = i && imgFrame(i); if (!f) return; const pk = pick(mx, my), p = imgPt(pk, f); clearPrev(); if (st.a) { prevLine([st.a, p], 0xC77800); showTip(mx, my, pk, fmtM(V.dist(st.a, p))); } else showTip(mx, my, pk); },
  down(ev, mx, my) {
    const i = imgOf(), f = i && imgFrame(i); if (!f) { cancelTool(); return; } const pk = pick(mx, my), p = imgPt(pk, f);
    if (!st.a) { st.a = p; return; } const dv = V.sub(p, st.a); pushUndo(); i.cx += V.dot(dv, f.fr.u); i.cy += V.dot(dv, f.fr.v); cancelTool(); refreshAll();
  },
};
