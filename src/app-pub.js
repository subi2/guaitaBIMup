/* ============================================================
   v0.44.0 · vistes publicables, plànols i exportacions
   (model de dades a model.meta.pub; el llenç de nodes vindrà
   a la v0.45 sobre aquests mateixos objectes)
   ============================================================ */
function pubData() { const m = S.model.meta; if (!m.pub) m.pub = { pubs: [], sheets: [], exps: [], seq: 1 }; return m.pub; }
const pubNext = () => pubData().seq++;
const PUB_REPS = [...LN_PRESETS.map(p => p[0]), 'Personalitzat'];
const PUB_FMTS = { model: [['ifc', 'IFC'], ['dxf', 'DXF 3D'], ['obj', 'OBJ'], ['glb', 'glTF / GLB'], ['stl', 'STL'], ['skp', 'SKP (experimental)']], sheet: [['pdf', 'PDF'], ['svg', 'SVG'], ['dxf', 'DXF (mm de paper)']] };
function pubViewChoices() {
  const out = docViews().filter(v => v[0] !== 'multi').map(v => [v[0], v[1]]); for (const v of S.model.views) out.push(['scene:' + v.id, 'Escena · ' + v.name]); return out;
}
function pubStyle(p) {
  const v = p.vis || {}, bi = v.base && v.base !== 'Paper' ? STYLES_BUILTIN.find(x => x.name === v.base) : null;
  const src = bi ? { ...JSON.parse(JSON.stringify(bi)), ...PAPER, name: p.name } : { name: p.name, ...PAPER, fa: { mode: 'hidden' }, ed: { hid: 'mark' }, sec: { fill: 'grey' } };
  if (p.rep === 'Personalitzat' && p.snap) src.ln = JSON.parse(JSON.stringify(p.snap.ln || {}));
  else { const pr = LN_PRESETS.find(x => x[0] === p.rep) || LN_PRESETS[0]; src.ln = { set: pr[0], w: { ...pr[1] }, mult: pr[2].slice() }; }
  const s = mkStyle(src); if (v.sec) s.sec.fill = v.sec; if (v.hid) s.ed.hid = v.hid; if (p.lk && p.lk !== 1) for (const k of Object.keys(s.ln.w)) s.ln.w[k] *= p.lk; return s;
}
/* aplica temporalment estil, filtre i límits d'una vista publicable, executa fn i ho restaura */
function pubRender(p, fn) {
  const sv = { only: S.pubOnly, style: S.style, hid: S.hiddenIfc, tags: S.model.tags.map(t => t.visible), box: S.clipBox, planViews: S.model.planViews }, lv = p.src.startsWith('plan:') ? S.model.levels.find(l => String(l.id) === p.src.slice(5)) : null;
  const old = lv ? pvOf(lv) : null, oldCopy = old ? { ...old } : null;
  try {
    S.pubOnly = p.filter.only ? new Set(p.filter.only) : null; S.style = pubStyle(p); S.hiddenIfc = new Set(p.filter.hidIfc); S.model.tags.forEach(t => { t.visible = !p.filter.hidTags.includes(t.id); });
    S.clipBox = p.lim.box ? { ...p.lim.box, on: true } : { ...sv.box, on: false };
    if (lv) { const o = {}; if (p.lim.cut != null) o.cut = p.lim.cut; if (p.lim.rear != null) o.rear = p.lim.rear; if (Object.keys(o).length) pvSet(lv, o); }
    regenPar(); rebuild(); return fn();
  } finally {
    S.pubOnly = sv.only; S.style = sv.style; S.hiddenIfc = sv.hid; S.model.tags.forEach((t, i) => { t.visible = sv.tags[i]; }); S.clipBox = sv.box;
    if (lv) { const arr = S.model.planViews; const cur = pvOf(lv); if (oldCopy) { for (const k of Object.keys(cur)) delete cur[k]; Object.assign(cur, oldCopy); } else if (cur) arr.splice(arr.indexOf(cur), 1); }
    regenPar(); rebuild();
  }
}
function pubDrawing(p) {
  return pubRender(p, () => { const v = docView(p.src); if (!v) return null; const d = drawing2D(v, { hidden: S.style.ed.hid !== 'off', scale: p.scale, hmode: S.style.ed.hid, boxP: p.lim.box ? boxPlanes() : [] }); d.sty = S.style; d.N = p.scale; d.name = p.name; d.pid = p.id; d.annx = p.annx || null; return d; });
}
function pubSheetBuild(sh) {
  const P = pubData(), ps = sh.items.map(id => P.pubs.find(x => x.id === id)).filter(Boolean); if (!ps.length) return null;
  return docSheet(ps, { scale: ps[0].scale, hidden: true, fmt: sh.fmt === 'auto' ? null : sh.fmt, title: sh.name, tb: sh.tb || null, pos: sh.pos || null, paper: sh.paper || null, block: sh.block || null, lists: sh.lists || null });
}
const pubSafe = s => String(s).replace(/[^\wÀ-ÿ]+/g, '_');
async function pubExportSheet(sh, fmt) {
  const d = pubSheetBuild(sh); if (!d) { toast('El plànol no té cap vista assignada.'); return false; }
  const name = baseName() + '-' + pubSafe(sh.name);
  if (fmt === 'svg') return deliver(name + '.svg', sheetSVG(d), 'image/svg+xml');
  if (fmt === 'pdf') return deliver(name + '.pdf', sheetPDF(d), 'application/pdf');
  return deliver(name + '.dxf', sheetDXF({ ...d, N: 1000 }), 'application/dxf');
}
function pubFilterEls(els, f) { return els.filter(e => !f.hidTags.includes(e.tag) && !(e.ifc ? f.hidIfc.includes(e.ifc) : f.hidIfc.includes('-'))); }
function pubScene(f) { const sv = S.pubOnly; S.pubOnly = f && f.only ? new Set(f.only) : null; try { return collectScene(); } finally { S.pubOnly = sv; } }
async function pubExportModel(ex) {
  const all = pubFilterEls(pubScene(ex.filter), ex.filter), bim = all.filter(e => e.kind === 'bim'), name = baseName() + '-' + pubSafe(ex.name); let els = ex.fmt === 'ifc' ? bim : all;
  if (!els.length) { toast('No hi ha geometria amb aquest filtre.'); return false; }
  const f = ex.fmt;
  if (f === 'ifc') return deliver(name + '.ifc', buildIFC(els, { version: 'IFC4' }).text, 'application/x-step');
  if (f === 'dxf') return deliver(name + '.dxf', buildDXF(els, { version: 'R2000', layers: 'class', edges: true, extras: false }).text, 'application/dxf');
  if (f === 'obj') { const r = buildOBJ(els, name + '.mtl'); await deliver(name + '.mtl', r.mtl, 'text/plain'); return deliver(name + '.obj', r.obj, 'text/plain'); }
  if (f === 'glb') return deliver(name + '.glb', buildGLB(els).glb, 'model/gltf-binary');
  if (f === 'stl') return deliver(name + '.stl', buildSTL(els, 1).buf, 'model/stl');
  if (f === 'skp') return deliver(name + '.skp', buildSKP(els, {}).bytes, 'application/octet-stream');
  return false;
}
async function pubRunExport(ex) {
  const P = pubData(); if (ex.fmt === 'html3d' || ex.fmt === 'glb3d') return pubExport3D(ex); if (ex.src === 'model') return pubExportModel(ex);
  if (ex.src && ex.src.startsWith('pub:')) { const p = P.pubs.find(x => x.id === +ex.src.slice(4)); if (!p) { toast('La vista d’aquesta exportació ja no existeix.'); return false; } return pubExportPub(p, ex.fmt, ex.paper); } if (!ex.src) { toast('L’exportació no té origen: connecta-la a un plànol o al model.'); return false; }
  const sh = P.sheets.find(s => s.id === +ex.src.slice(6)); if (!sh) { toast('El plànol d’aquesta exportació ja no existeix.'); return false; }
  if (!sh.paper) { toast('El plànol «' + sh.name + '» necessita un Full.'); return false; } if (ex.fmt !== 'svg' && !sh.block) { toast('El plànol «' + sh.name + '» necessita una caràtula per exportar a ' + ex.fmt.toUpperCase() + '.'); return false; } return pubExportSheet(sh, ex.fmt);
}

async function pubExportPub(p, fmt, paper) { return pubExportSheet({ name: p.name, fmt: 'auto', items: [p.id], paper: paper || null }, fmt); }
/* 3D interactiu: GLB pur o HTML amb el GLB incrustat (visor <model-viewer>, cal connexió per carregar-lo) */
async function pubExport3D(ex) {
  const els = pubFilterEls(pubScene(ex.filter), ex.filter); if (!els.length) { toast('No hi ha geometria amb aquest filtre.'); return false; }
  const glb = buildGLB(els).glb, name = baseName() + '-' + pubSafe(ex.name); if (ex.fmt === 'glb3d') return deliver(name + '.glb', glb, 'model/gltf-binary');
  const u8 = glb instanceof Uint8Array ? glb : new Uint8Array(glb.buffer || glb); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  const html = '<!DOCTYPE html><html lang="ca"><head><meta charset="utf-8"><title>' + esc(ex.name) + '</title><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></'+'script><style>html,body{margin:0;height:100%;background:#0E1116;color:#E7EAEE;font-family:system-ui}model-viewer{width:100%;height:calc(100% - 34px)}p{margin:0;padding:8px 12px;font-size:13px}</style></head><body><p>' + esc(baseName() + ' · ' + ex.name) + ' — guaitaBIMup ' + VERSION + '</p><model-viewer camera-controls shadow-intensity="0.6" src="data:model/gltf-binary;base64,' + btoa(bin) + '"></model-viewer></body></html>';
  return deliver(name + '.html', html, 'text/html');
}
