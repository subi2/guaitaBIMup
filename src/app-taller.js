/* ============================================================
   v0.54.0 · Taller: espai DADES (Psets en taula, requisits, tècnics,
   dades del projecte) i llistats de plànols i de vistes a PLÀNOLS.
   ============================================================ */
const GROLES = [['autor', 'Autor'], ['director', 'Director d’obra'], ['calculista', 'Calculista'], ['coordinador', 'Coordinador de seguretat']];
const GPF = [['nom', 'Nom'], ['titulacio', 'Titulació'], ['collegiat', 'Núm. col·legiat'], ['carrec', 'Càrrec'], ['email', 'Correu']];
const PSETS = {
  Pset_WallCommon: 'Reference, FireRating, AcousticRating, IsExternal:bool, LoadBearing:bool, ThermalTransmittance:num',
  Pset_SlabCommon: 'Reference, FireRating, IsExternal:bool, LoadBearing:bool, ThermalTransmittance:num',
  Pset_RoofCommon: 'Reference, FireRating, IsExternal:bool, ThermalTransmittance:num',
  Pset_DoorCommon: 'Reference, FireRating, AcousticRating, IsExternal:bool, SecurityRating',
  Pset_WindowCommon: 'Reference, FireRating, IsExternal:bool, ThermalTransmittance:num, GlazingAreaFraction:num',
  Pset_BeamCommon: 'Reference, FireRating, LoadBearing:bool, Span:num',
  Pset_ColumnCommon: 'Reference, FireRating, LoadBearing:bool',
  Pset_StairCommon: 'Reference, FireRating, NumberOfRiser:num, RiserHeight:num, TreadLength:num',
  Pset_CoveringCommon: 'Reference, FireRating, IsExternal:bool, ThermalTransmittance:num',
  Pset_SpaceCommon: 'Reference, IsExternal:bool, GrossPlannedArea:num, NetPlannedArea:num',
};
const GREQ = [['ple', 'ha d’estar plena'], ['igual', 'ha de ser igual a'], ['conte', 'ha de contenir'], ['ge', 'ha de ser ≥'], ['le', 'ha de ser ≤']];
const gAll = o => [['', '— tots —'], ...o];
Object.assign(NT, {
  sel: { cat: 'dat', name: 'Selector', ico: '⌕', ins: [], out: 'els' },
  pset: { cat: 'dat', name: 'Plantilla de Pset', ico: '▦', ins: [['e', 'Elements', ['els']]], out: 'els' },
  assign: { cat: 'dat', name: 'Assigna valor', ico: '≔', ins: [['e', 'Elements', ['els']]], out: 'els' },
  req: { cat: 'dat', name: 'Requisit', ico: '✓', ins: [['e', 'Elements', ['els']]], out: 'els' },
  table: { cat: 'dat', name: 'Taula', ico: '▤', ins: [['e', 'Elements', ['els']]], out: 'els' },
  expd: { cat: 'dat', name: 'Exporta dades', ico: '⤓', ins: [['e', 'Elements', ['els']]], out: null },
  team: { cat: 'dat', name: 'Tècnics', ico: '☺', ins: [], out: 'team' },
  lsheets: { cat: 'lst', name: 'Llistat de plànols', ico: '☰', ins: [], out: 'list' },
  lviews: { cat: 'lst', name: 'Llistat de vistes', ico: '☷', ins: [], out: 'list' },
});
/* reordena perquè els nodes de Dades surtin primer a la paleta */
Object.assign(NDEF, {
  sel: () => ({ ifc: '', level: '', tag: '', mat: '', txt: '' }),
  pset: () => ({ tpl: 'Pset_WallCommon', pset: 'Pset_Projecte', props: 'Codi, Observacions' }),
  assign: () => ({ pset: 'Pset_Projecte', prop: '', val: '' }),
  req: () => ({ pset: 'Pset_WallCommon', prop: 'FireRating', rule: 'ple', val: '' }),
  table: () => ({ name: 'Taula' }),
  expd: () => ({ name: 'Dades', sep: ';' }),
  team: () => ({ people: [] }),
  lsheets: () => ({ name: 'Llistat de plànols' }),
  lviews: () => ({ name: 'Llistat de vistes', scope: '' }),
});
Object.assign(NF, {
  sel: [['ifc', 'Classe IFC', 'sel', () => gAll(GDIM.ifc[3]()), 1], ['level', 'Nivell', 'sel', () => gAll(GDIM.level[3]()), 1], ['tag', 'Etiqueta', 'sel', () => gAll(GDIM.tag[3]()), 0], ['mat', 'Material', 'sel', () => gAll(GDIM.mat[3]()), 0], ['txt', 'Nom conté', 'text', null, 0]],
  pset: [['tpl', 'Plantilla', 'sel', () => [...Object.keys(PSETS).map(k => [k, k]), ['custom', 'Personalitzada…']], 1], ['pset', 'Nom del Pset', 'text', null, 0], ['props', 'Propietats (a, b:num, c:bool)', 'text', null, 0]],
  assign: [['pset', 'Pset', 'text', null, 1], ['prop', 'Propietat', 'text', null, 1], ['val', 'Valor', 'text', null, 1]],
  req: [['pset', 'Pset', 'text', null, 0], ['prop', 'Propietat', 'text', null, 1], ['rule', 'Condició', 'sel', () => GREQ, 1], ['val', 'Valor', 'text', null, 0]],
  table: [['name', 'Nom', 'text', null, 0]],
  expd: [['name', 'Nom del fitxer', 'text', null, 0], ['sep', 'Separador', 'sel', () => [[';', 'Punt i coma (Excel)'], [',', 'Coma']], 0]],
  lsheets: [['name', 'Títol', 'text', null, 0]],
  lviews: [['scope', 'Àmbit', 'sel', () => [['', 'Tot el lot'], ...GG().nodes.filter(n => n.t === 'sheet').map(n => [String(n.id), 'Full ' + (n.p.numero || n.p.name)])], 1], ['name', 'Títol', 'text', null, 0]],
});
/* ---------- elements i columnes ---------- */
function gSelEls(n) { const p = n.p, txt = (p.txt || '').toLowerCase(); return topGroups().filter(g => ['ifc', 'level', 'tag', 'mat'].every(d => (p[d] ?? '') === '' || GDIM[d][1](g) === String(p[d])) && (!txt || (g.name || '').toLowerCase().includes(txt))); }
const gPv = (g, ps, k) => g.psets && g.psets[ps] ? g.psets[ps][k] : undefined;
const gEmpty = v => v == null || v === '';
function gReqOk(n, g) { const v = gPv(g, n.p.pset, n.p.prop), w = n.p.val; switch (n.p.rule) { case 'igual': return String(v ?? '') === String(w); case 'conte': return String(v ?? '').toLowerCase().includes(String(w).toLowerCase()); case 'ge': return !gEmpty(v) && +String(v).replace(',', '.') >= +String(w).replace(',', '.'); case 'le': return !gEmpty(v) && +String(v).replace(',', '.') <= +String(w).replace(',', '.'); default: return !gEmpty(v); } }
function gEls(id, d) { const n = gN(id); if (!n || (d || 0) > 40) return []; if (n.t === 'sel') return gSelEls(n); const up = gIn(id, 'e')[0], a = up ? gEls(up.id, (d || 0) + 1) : []; return n.t === 'req' ? a.filter(g => !gReqOk(n, g)) : a; }
function gPsetCols(n) { const spec = n.p.tpl && n.p.tpl !== 'custom' ? PSETS[n.p.tpl] : n.p.props, ps = n.p.tpl && n.p.tpl !== 'custom' ? n.p.tpl : (n.p.pset || 'Pset_Projecte'); return String(spec || '').split(',').map(x => x.trim()).filter(Boolean).map(x => { const [k, ty] = x.split(':'); return { ps, k: k.trim(), ty: (ty || 'text').trim() }; }); }
function gCols(id) {
  const out = [], seen = new Set(), add = c => { const key = c.ps + '.' + c.k; if (c.k && !seen.has(key)) { seen.add(key); out.unshift(c); } }; let n = gN(id), k = 0;
  while (n && k++ < 40) { if (n.t === 'pset') gPsetCols(n).slice().reverse().forEach(add); else if (n.t === 'assign' || n.t === 'req') add({ ps: n.p.pset, k: n.p.prop, ty: 'text' }); if (n.t === 'sel') break; n = gIn(n.id, 'e')[0]; }
  if (!out.length) for (const g of gEls(id)) for (const [ps, pv] of Object.entries(g.psets || {})) for (const kk of Object.keys(pv)) add({ ps, k: kk, ty: 'text' });
  return out;
}
const gLvName = g => { const l = S.model.levels.find(x => x.id === g.level); return l ? l.name : '—'; };
/* ---------- taula editable ---------- */
function gTable(rows, cols, opt) {
  const t = el('table', 'gc-tbl'), hd = el('tr'); t.appendChild(hd); for (const h of ['Element', 'Classe', 'Nivell', ...cols.map(c => c.k)]) { const th = el('th', '', esc(h)); th.scope = 'col'; hd.appendChild(th); }
  for (const g of rows.slice(0, opt.max || 500)) {
    const tr = el('tr'); tr.dataset.row = g.id; const nm = el('td', 'nm', esc(g.name || 'Grup ' + g.id)); nm.title = 'Selecciona al model'; nm.onmousedown = e => e.stopPropagation(); nm.onclick = () => { S.ctx = []; clearSel(); S.sel.groups.add(g.id); refreshSel(); }; tr.appendChild(nm);
    tr.appendChild(el('td', 'dim', (g.ifc || 'esbós').replace(/^Ifc/, ''))); tr.appendChild(el('td', 'dim', gLvName(g)));
    for (const c of cols) { const v = gPv(g, c.ps, c.k), td = el('td', gEmpty(v) ? 'miss' : ''), i = el('input'); i.value = gEmpty(v) ? '' : String(v); i.placeholder = 'falta'; i.title = c.ps + ' · ' + c.k; i.dataset.cell = g.id + '|' + c.ps + '|' + c.k; i.onmousedown = e => e.stopPropagation(); i.onkeydown = e => e.stopPropagation();
      i.onchange = () => { pushUndo('Dades BIM'); g.psets = g.psets || {}; const P2 = g.psets[c.ps] = g.psets[c.ps] || {}; P2[c.k] = i.value === '' ? '' : c.ty === 'bool' ? /^(true|cert|sí|si|1)$/i.test(i.value.trim()) : gVal(i.value); opt.re(); }; td.appendChild(i); tr.appendChild(td); }
    t.appendChild(tr);
  }
  return t;
}
const gMissCount = (rows, cols) => rows.reduce((s, g) => s + cols.filter(c => gEmpty(gPv(g, c.ps, c.k))).length, 0);
/* ---------- CSV ---------- */
const csvQ = (v, sep) => { const s = v == null ? '' : String(v); return /["\n\r]/.test(s) || s.includes(sep) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csvOut = (rows, sep) => '﻿' + rows.map(r => r.map(v => csvQ(v, sep)).join(sep)).join('\r\n');
function csvParse(txt) { txt = txt.replace(/^﻿/, ''); const first = txt.split(/\r?\n/)[0] || '', sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ','; const R = []; let row = [], f = '', q = false;
  for (let i = 0; i < txt.length; i++) { const c = txt[i]; if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === sep) { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(f); R.push(row); row = []; f = ''; } else f += c; }
  if (f !== '' || row.length) { row.push(f); R.push(row); } return R.filter(r => r.some(x => x !== '')); }
function gDataCSV(n) { const els = gEls(n.id), cols = gCols(n.id), sep = n.p.sep || ';'; return csvOut([['Id', 'Element', 'Classe', 'Nivell', ...cols.map(c => c.ps + '.' + c.k)], ...els.map(g => [g.id, g.name || 'Grup ' + g.id, g.ifc || '', gLvName(g), ...cols.map(c => { const v = gPv(g, c.ps, c.k); return gEmpty(v) ? '' : typeof v === 'number' ? String(v).replace('.', sep === ';' ? ',' : '.') : String(v); })])], sep); }
function gDataImport(txt) {
  const R = csvParse(txt); if (R.length < 2) return 0; const h = R[0].map(x => x.trim()), ic = h.findIndex(x => /^id$/i.test(x)); if (ic < 0) { toast('El CSV necessita una columna «Id».'); return 0; }
  const pc = h.map((x, i) => { const k = x.indexOf('.'); return k > 0 ? [i, x.slice(0, k), x.slice(k + 1)] : null; }).filter(Boolean); let n = 0; pushUndo('Importa dades');
  for (const r of R.slice(1)) { const g = S.model.root.groups.get(+r[ic]); if (!g) continue; g.psets = g.psets || {}; for (const [i, ps, k] of pc) { const v = (r[i] ?? '').trim(); (g.psets[ps] = g.psets[ps] || {})[k] = v === '' ? '' : gVal(v); } n++; }
  return n;
}
const gPick = (accept, cb) => { const f = el('input'); f.type = 'file'; f.accept = accept; f.onchange = () => { const x = f.files[0]; if (!x) return; const rd = new FileReader(); rd.onload = () => cb(String(rd.result), x.name); rd.readAsText(x); }; f.click(); };
const gStop = b => { b.onmousedown = e => e.stopPropagation(); return b; };
/* ---------- tècnics i rols ---------- */
const gTeam = pj => { const t = pj && gIn(pj.id, 'e')[0]; return t ? t.p.people || [] : []; };
function gRoles(pj) { const pe = gTeam(pj), o = {}; for (const [r] of GROLES) { const id = pj && pj.p.roles && pj.p.roles[r], q = id && pe.find(x => x.id === id); if (q) o[r] = { ...q }; } return o; }
function gSheetViews(sid) { return gIn(sid, 'p').filter(x => x.t === 'pub').map(x => { const R = gResolve(x.id); return { id: x.id, name: x.p.name, scale: R.scale, src: R.src }; }); }
{ const _gb = gBlock; gBlock = function (t, pj, sh) { const B = _gb(t, pj, sh); B.data.roles = pj ? gRoles(pj) : {}; B.data.views = sh ? gSheetViews(sh.id) : []; return B; }; }
{ const _tb = tbData; tbData = function (D, items, fmtP, W, H) { const o = _tb(D, items, fmtP, W, H);
  for (const [r, q] of Object.entries((D && D.roles) || {})) for (const [k, v] of Object.entries(q)) if (k !== 'id') o[r + '.' + k] = v;
  const R = (D && D.roles) || {}; if (!o['projecte.autor'] && R.autor) o['projecte.autor'] = R.autor.nom; if (!o['projecte.collegiat'] && R.autor) o['projecte.collegiat'] = R.autor.collegiat;
  const vs = (D && D.views) || []; o['planol.vistes'] = vs.map(v => v.name).join(' · '); const sc = [...new Set(vs.map(v => v.scale))]; o['planol.escales'] = sc.map(n => '1:' + n).join(' · '); if (!o['planol.escala'] && sc.length) o['planol.escala'] = sc.length === 1 ? '1:' + sc[0] : 'indicada';
  return o; }; }
function gProjPset() { const pj = GG().nodes.find(n => n.t === 'proj'); if (!pj) return null; const p = pj.p, o = {};
  for (const [k, v] of Object.entries(p)) if (!['logo', 'extra', 'roles'].includes(k) && typeof v !== 'object' && v !== '' && v != null) o[k] = v; for (const [k, v] of p.extra || []) if (k && v !== '') o[k] = v;
  const R = gRoles(pj), pr = {}; for (const [r, l] of GROLES) if (R[r]) { pr[l] = R[r].nom; if (R[r].collegiat) pr[l + ' (col·legiat)'] = R[r].collegiat; }
  return { Pset_ProjectCommon: o, ...(Object.keys(pr).length ? { Pset_ProjectTeam: pr } : {}) }; }
/* camps {…} de la caràtula i quins són buits */
function gTbFields(t) { const D = tbData(gTitleData(t), null, null, 0, 0), sh = GG().wires.some(w => w.a === t.id && gN(w.b) && gN(w.b).t === 'sheet'), seen = new Map();
  for (const it of t.p.items || []) if (it.t === 'text') for (const m of String(it.s).matchAll(/\{([\w.]+)\}/g)) { const k = m[1]; if (seen.has(k) || ['planol.full', 'planol.format', 'app'].includes(k) || (!sh && k.startsWith('planol.'))) continue; seen.set(k, D[k] == null ? '' : String(D[k])); }
  return [...seen]; }
/* ---------- llistats ---------- */
const gSheets = () => GG().nodes.filter(n => n.t === 'sheet').sort((a, b) => String(a.p.numero || '').localeCompare(String(b.p.numero || ''), 'ca', { numeric: true }));
function gListData(l) {
  if (l.t === 'lsheets') return { title: l.p.name || 'Llistat de plànols', head: ['Núm.', 'Títol', 'Format', 'Escala', 'Rev.', 'Vistes'], rows: gSheets().map(s => { const f = gIn(s.id, 'f')[0], vs = gSheetViews(s.id), sc = [...new Set(vs.map(v => v.scale))]; return [s.p.numero || '', s.p.titol || s.p.name || '', f ? (f.p.fmt === 'custom' ? 'a mida' : f.p.fmt === 'auto' ? 'auto' : f.p.fmt) : '', sc.length === 1 ? '1:' + sc[0] : sc.length ? 'indicada' : '', s.p.revisio || '', String(vs.length)]; }) };
  const sh = gSheets(), pubs = GG().nodes.filter(n => n.t === 'pub' && (!l.p.scope || gIn(+l.p.scope, 'p').some(x => x.id === n.id)));
  return { title: l.p.name || 'Llistat de vistes', head: ['Vista', 'Escala', 'Origen', 'Full'], rows: pubs.map(n => { const R = gResolve(n.id), on = sh.filter(s => gIn(s.id, 'p').some(x => x.id === n.id)).map(s => s.p.numero || s.p.name); return [n.p.name, '1:' + R.scale, (R.src && viewName(R.src)) || '', on.join(', ') || '!sense col·locar']; }) };
}
function gListTable(L, max) { const t = el('table', 'gc-tbl'), hd = el('tr'); t.appendChild(hd); for (const h of L.head) { const th = el('th', '', esc(h)); th.scope = 'col'; hd.appendChild(th); }
  for (const r of L.rows.slice(0, max || 500)) { const tr = el('tr'); for (const v of r) { const bad = String(v).startsWith('!'); tr.appendChild(el('td', bad || v === '' ? 'miss txt' : '', esc(bad ? v.slice(1) : v === '' ? 'falta' : String(v)))); } t.appendChild(tr); }
  if (!L.rows.length) { const tr = el('tr'), td = el('td', 'dim', 'Cap fila'); td.colSpan = L.head.length; tr.appendChild(td); t.appendChild(tr); } return t; }
const gListCSV = L => csvOut([L.head, ...L.rows.map(r => r.map(v => String(v).replace(/^!/, '')))], ';');
/* taules de llistats dibuixades al plànol, damunt de la caràtula */
function docLists(lists, r, Wp, Hp, mg, P) {
  const h = 2.2, rh = 4.4, right = r ? r.x + r.w : Wp - mg - 5; let yb = r ? r.y + r.h + 4 : mg + 5;
  const ln = (a, b, c, d, w) => P.push({ t: 'l', x1: a, y1: b, x2: c, y2: d, w: w || 0.13, col: '#000000', layer: 'G-ANOT', dash: 0 }), tx = (x, y, s, hh) => P.push({ t: 't', x, y, s: String(s), h: hh || h, col: '#000000', layer: 'G-ANOT' });
  for (const L of lists) { if (!L) continue; const rows = L.rows.map(x => x.map(v => String(v).replace(/^!/, ''))), cw = L.head.map((hh, i) => Math.max(hh.length, ...rows.map(x => x[i].length)) * h * 0.62 + 3), W = cw.reduce((a, b) => a + b, 0), x0 = right - W, n = rows.length + 1, top = yb + (n + 1) * rh;
    if (top > Hp - mg) break; tx(x0, top - rh + 1.2, L.title, 2.6); for (let i = 0; i <= n; i++) ln(x0, yb + i * rh, right, yb + i * rh, i === n || i === n - 1 ? 0.25 : 0.13);
    let x = x0; for (let c = 0; c <= cw.length; c++) { ln(x, yb, x, yb + n * rh); x += cw[c] || 0; }
    x = x0; L.head.forEach((hh, c) => { tx(x + 1.5, yb + (n - 1) * rh + 1.2, hh); x += cw[c]; });
    rows.forEach((row, i) => { let xx = x0; row.forEach((v, c) => { tx(xx + 1.5, yb + (n - 2 - i) * rh + 1.2, v); xx += cw[c]; }); });
    yb = top + 4; }
}
/* ---------- nodes al llenç ---------- */
const gWide = (d, w) => { d.style.width = w + 'px'; };
Object.assign(GX, {
  sel(n, b) { const k = gEls(n.id).length, s = el('div', 'gc-sum'); s.innerHTML = '<em>' + k + '</em> elements'; b.appendChild(s); },
  pset(n, b) { const els = gEls(n.id), cols = gPsetCols(n), s = el('div', 'gc-sum'), ps = cols[0] ? cols[0].ps : ''; const has = els.filter(g => g.psets && g.psets[ps]).length;
    s.innerHTML = '<b>' + esc(ps) + '</b><br>' + esc(cols.map(c => c.k).join(' · ')) + '<br><em>' + has + '</em> de ' + els.length + ' elements el tenen'; b.appendChild(s);
    const go = gStop(el('button', 'btn sm', 'Crea les propietats buides')); go.dataset.psfill = n.id; go.onclick = () => { pushUndo('Plantilla de Pset'); let c = 0; for (const g of els) { g.psets = g.psets || {}; const P2 = g.psets[ps] = g.psets[ps] || {}; for (const cc of cols) if (!(cc.k in P2)) { P2[cc.k] = ''; c++; } } toast(c + ' propietat(s) creades a ' + els.length + ' element(s).'); pubDraw(); }; b.appendChild(go); },
  assign(n, b) { const els = gEls(n.id), go = gStop(el('button', 'gc-go', 'Aplica a ' + els.length)); go.dataset.asgo = n.id; go.disabled = !n.p.pset || !n.p.prop || !els.length;
    go.onclick = () => { pushUndo('Assigna valor'); for (const g of els) { g.psets = g.psets || {}; (g.psets[n.p.pset] = g.psets[n.p.pset] || {})[n.p.prop] = gVal(n.p.val); } toast(n.p.pset + '.' + n.p.prop + ' assignat a ' + els.length + ' element(s).'); pubDraw(); }; b.appendChild(go); },
  req(n, b, d) { const up = gIn(n.id, 'e')[0], all = up ? gEls(up.id) : [], bad = gEls(n.id).length, s = el('div', bad ? 'gc-err' : 'gc-sum'); s.innerHTML = bad ? bad + ' de ' + all.length + ' no compleixen' : 'Tots ' + all.length + ' compleixen'; s.dataset.reqn = bad; b.appendChild(s); b.appendChild(el('div', 'gc-sum', 'La sortida són els elements que no compleixen.')); d.style.setProperty('--c', '#F05252'); },
  table(n, b, d) { gWide(d, 560); const els = gEls(n.id), cols = gCols(n.id), m = gMissCount(els, cols), s = el('div', 'gc-sum'); s.innerHTML = '<em>' + els.length + '</em> files · ' + cols.length + ' propietats' + (m ? ' · <span style="color:#FF8A8A">' + m + ' buides</span>' : ''); b.appendChild(s);
    const w = el('div', 'gc-tw'); w.onwheel = e => e.stopPropagation(); w.appendChild(gTable(els, cols, { max: 8, re: () => { pubDraw(); } })); b.appendChild(w); if (els.length > 8) b.appendChild(el('div', 'gc-more', '+ ' + (els.length - 8) + ' files a l’inspector')); },
  expd(n, b) { const els = gEls(n.id), r = el('div', 'row2'); r.style.cssText = 'display:flex;gap:6px'; { const sm = el('div', 'gc-sum'); sm.innerHTML = '<em>' + els.length + '</em> files · ' + gCols(n.id).length + ' propietats'; b.appendChild(sm); }
    const ex = gStop(el('button', 'gc-go', 'Exporta CSV')); ex.dataset.csv = n.id; ex.disabled = !els.length; ex.onclick = () => download(baseName() + '-' + pubSafe(n.p.name || 'dades') + '.csv', gDataCSV(n), 'text/csv'); r.appendChild(ex);
    const im = gStop(el('button', 'btn sm', 'Importa CSV')); im.onclick = () => gPick('.csv,text/csv', t => { const k = gDataImport(t); toast(k + ' element(s) actualitzats des del CSV.'); pubDraw(); }); r.appendChild(im); b.appendChild(r); },
  team(n, b, d) { gWide(d, 360); const pe = n.p.people || []; if (!pe.length) { b.appendChild(el('div', 'gc-sum', 'Cap fitxa. Afegeix tècnics a l’inspector.')); return; } b.appendChild(gListTable({ head: ['Nom', 'Titulació', 'Col·legiat'], rows: pe.map(p => [p.nom || '', p.titulacio || '', p.collegiat || '']) }, 6)); },
  lsheets(n, b, d) { gWide(d, 470); const L = gListData(n), w = el('div', 'gc-tw'); w.onwheel = e => e.stopPropagation(); { const sm = el('div', 'gc-sum'); sm.innerHTML = 'Àmbit: <em>tot el lot</em> · ' + L.rows.length + ' fulls'; b.appendChild(sm); } w.appendChild(gListTable(L, 10)); b.appendChild(w); gListBtn(n, b, L); },
  lviews(n, b, d) { gWide(d, 470); const L = gListData(n), w = el('div', 'gc-tw'), sh = n.p.scope && gN(+n.p.scope); w.onwheel = e => e.stopPropagation(); { const sm = el('div', 'gc-sum'); sm.innerHTML = 'Àmbit: <em>' + (sh ? 'full ' + esc(sh.p.numero || sh.p.name) : 'tot el lot') + '</em> · ' + L.rows.length + ' vistes'; b.appendChild(sm); } w.appendChild(gListTable(L, 10)); b.appendChild(w); gListBtn(n, b, L); },
});
function gListBtn(n, b, L) { const x = gStop(el('button', 'btn sm', 'Exporta CSV')); x.dataset.lcsv = n.id; x.onclick = () => download(baseName() + '-' + pubSafe(L.title) + '.csv', gListCSV(L), 'text/csv'); b.appendChild(x); }
{ const _gx = GX.proj; GX.proj = (n, b, d) => { if (_gx) _gx(n, b, d); const R = gRoles(n), s = el('div', 'gc-sum'); s.innerHTML = '<b>Pset_ProjectCommon</b><br>' + GROLES.map(([r, l]) => esc(l) + ': ' + (R[r] ? '<em>' + esc(R[r].nom) + '</em>' : '<span style="color:#FF8A8A">falta</span>')).slice(0, 2).join('<br>'); b.appendChild(s); }; }
/* ---------- inspectors ---------- */
Object.assign(GI, {
  table(n, ins) { const els = gEls(n.id), cols = gCols(n.id), s = el('section'); s.appendChild(el('h5', '', 'Taula · ' + els.length + ' files'));
    s.appendChild(el('div', 'gc-sum', 'Edita les cel·les; les buides surten en vermell. Clic al nom per seleccionar l’element al model.'));
    const w = el('div', 'gc-tw big'); w.appendChild(gTable(els, cols, { re: () => pubDraw() })); s.appendChild(w); ins.appendChild(s); },
  team(n, ins, re) { const s = el('section'), pe = n.p.people = n.p.people || []; s.appendChild(el('h5', '', 'Fitxes (Pset_Person)')); s.appendChild(el('div', 'gc-sum', 'Les fitxes es poden reaprofitar entre projectes: exporta-les i importa-les.'));
    pe.forEach((p, i) => { const box = el('div', 'gc-psb'); for (const [k, l] of GPF) { const r = el('div', 'gc-f'), inp = el('input'); r.appendChild(el('label', '', l)); inp.value = p[k] || ''; inp.dataset.pf = i + '.' + k; if (!inp.value && k !== 'email' && k !== 'carrec') inp.classList.add('miss'); inp.placeholder = 'falta'; inp.onchange = () => { pushUndo('Tècnics'); p[k] = inp.value; re(); }; r.appendChild(inp); box.appendChild(r); }
      const x = el('button', 'btn sm', 'Esborra la fitxa'); x.onclick = () => { pushUndo('Tècnics'); pe.splice(i, 1); for (const pj of GG().nodes.filter(q => q.t === 'proj')) for (const r of Object.keys(pj.p.roles || {})) if (pj.p.roles[r] === p.id) delete pj.p.roles[r]; re(); }; box.appendChild(x); s.appendChild(box); });
    const r = el('div', 'row2'), a = el('button', 'btn sm acc', '+ Tècnic'); a.id = 'gcAddTec'; a.onclick = () => { pushUndo('Tècnics'); pe.push({ id: 'p' + Date.now().toString(36) + pe.length, nom: '', titulacio: '', collegiat: '', carrec: '', email: '' }); re(); }; r.appendChild(a);
    const ex = el('button', 'btn sm', 'Exporta fitxes'); ex.onclick = () => download('tecnics.gbup-tecnics.json', JSON.stringify({ guaita: 'tecnics', v: 1, people: pe }, null, 1), 'application/json'); r.appendChild(ex);
    const im = el('button', 'btn sm', 'Importa fitxes'); im.onclick = () => gPick('.json,application/json', t => { try { const J = JSON.parse(t), L = J.people || J; if (!Array.isArray(L)) throw 0; pushUndo('Importa tècnics'); let k = 0; for (const q of L) { const o = pe.find(x => x.id === q.id || (q.nom && x.nom === q.nom)); if (o) Object.assign(o, q, { id: o.id }); else pe.push({ ...q, id: q.id || 'p' + Date.now().toString(36) + pe.length }); k++; } toast(k + ' fitxa(es) importades.'); re(); } catch (e) { toast('El fitxer no conté fitxes de tècnics.'); } }); r.appendChild(im);
    s.appendChild(r); ins.appendChild(s); },
  lsheets(n, ins) { const s = el('section'), L = gListData(n); s.appendChild(el('h5', '', L.title)); s.appendChild(gListTable(L)); s.appendChild(el('div', 'gc-sum', 'Connecta’l a l’entrada «Llistats» d’un plànol per dibuixar-lo al full.')); ins.appendChild(s); },
  lviews(n, ins) { const s = el('section'), L = gListData(n); s.appendChild(el('h5', '', L.title)); s.appendChild(gListTable(L)); s.appendChild(el('div', 'gc-sum', 'Tria l’àmbit: tot el lot o un sol full. Connecta’l a «Llistats» d’un plànol per dibuixar-lo.')); ins.appendChild(s); },
});
{ const _gp = GI.proj; GI.proj = (n, ins, re) => { const s = el('section'), te = gIn(n.id, 'e')[0], pe = gTeam(n); s.appendChild(el('h5', '', 'Rols (de les fitxes de Tècnics)'));
  if (!te) { const ts = GG().nodes.filter(x => x.t === 'team'); s.appendChild(el('div', 'gc-sum', 'Connecta un node Tècnics a l’entrada.')); const b = el('button', 'btn sm acc', ts.length ? 'Connecta Tècnics' : 'Crea Tècnics'); b.id = 'gcTeamLink'; b.onclick = () => { pushUndo('Tècnics'); const t = ts[0] || gAdd('team', n.x - 420, n.y); gLink(t.id, n.id, 'e'); re(); }; s.appendChild(b); }
  else for (const [r, l] of GROLES) { const row = el('div', 'gc-f'), sl = el('select'); row.appendChild(el('label', '', l)); sl.dataset.role = r; for (const [v, t] of [['', '—'], ...pe.map(p => [p.id, p.nom || '(sense nom)'])]) { const o = el('option'); o.value = v; o.textContent = t; if ((n.p.roles || {})[r] === v) o.selected = true; sl.appendChild(o); } sl.onchange = () => { pushUndo('Rol'); n.p.roles = n.p.roles || {}; if (sl.value) n.p.roles[r] = sl.value; else delete n.p.roles[r]; re(); }; row.appendChild(sl); s.appendChild(row); }
  s.appendChild(el('div', 'gc-sum', 'A la caràtula: {autor.nom}, {autor.collegiat}, {director.nom}…')); ins.appendChild(s); if (_gp) _gp(n, ins, re); }; }
{ const _gt = GI.title; GI.title = (n, ins, re) => { if (_gt) _gt(n, ins, re); const F = gTbFields(n), s = el('section'); s.appendChild(el('h5', '', 'Camps de la caràtula'));
  if (!F.length) s.appendChild(el('div', 'gc-sum', 'La caràtula no té camps {…}.')); else { const g = el('div', 'gc-stk'); for (const [k, v] of F) { g.appendChild(el('span', '', '{' + k + '}')); const b = el('b', v ? '' : 'miss', esc(v || 'falta')); g.appendChild(b); g.appendChild(el('i', '', k.startsWith('planol.') ? 'Plànol' : k.startsWith('projecte.') ? 'Dades · Projecte' : 'Dades · Tècnics')); } s.appendChild(g); }
  ins.appendChild(s); }; }
{ const _gs = GI.sheet; GI.sheet = (n, ins, re) => { if (_gs) _gs(n, ins, re); const s = el('section'), vs = gSheetViews(n.id); s.appendChild(el('h5', '', 'Vistes d’aquest full'));
  s.appendChild(gListTable({ head: ['Vista', 'Escala'], rows: vs.map(v => [v.name, '1:' + v.scale]) })); const L = el('label', 'gc-ck'), c = el('input'); c.type = 'checkbox'; c.checked = !!n.p.vtab; c.dataset.vtab = n.id; c.onchange = () => { pushUndo('Plànol'); n.p.vtab = c.checked; re(); }; L.appendChild(c); L.appendChild(document.createTextNode(' Mostra aquesta taula al plànol')); s.appendChild(L);
  s.appendChild(el('div', 'gc-sum', 'Les dades del plànol (número, títol, revisió…) formen el Pset_SheetCommon; l’escala de la caràtula surt d’aquestes vistes.')); ins.appendChild(s); }; }
/* avisos */
{ const _gi = gIssue; gIssue = function (n) { const r = _gi(n); if (r) return r; const t = n.t;
  if (['pset', 'assign', 'req', 'table', 'expd'].includes(t) && !gIn(n.id, 'e').length) return 'Connecta-hi elements (Selector).';
  if (t === 'req' && gEls(n.id).length) return null;
  if (t === 'title') { const m = gTbFields(n).filter(x => !x[1]).map(x => x[0]); if (m.length) return 'Camps buits: ' + m.slice(0, 4).join(', ') + (m.length > 4 ? '…' : '') + '.'; }
  if (t === 'proj' && !gIn(n.id, 'e').length) return null; return null; }; }
/* inspector: connexions des d'altres espais (sense cables visibles) */
{ const _ins = gInspector; gInspector = function (ins, P) { _ins(ins, P); const ids = [...GV.sel], n = ids.length === 1 ? gN(ids[0]) : null;
  if (!n && !ids.length && GSP[GV.sp]) { const sm = ins.querySelector('section .gc-sum'); if (sm) sm.innerHTML = { dades: 'Un <em>Selector</em> tria elements del model; una <em>Plantilla de Pset</em> hi crea les propietats; la <em>Taula</em> les edita i un <em>Requisit</em> marca les que falten. <em>Exporta dades</em> treu i torna a llegir un CSV. Les <em>Dades del projecte</em> i els <em>Tècnics</em> alimenten la caràtula.<br><br>Arrossega un port de sortida fins a una entrada. Clic dret per afegir.', vistes: 'Una <em>vista de treball</em> passa per <em>modificadors</em> (filtre, límits, estil, línies, escala) fins a una <em>vista publicable</em>. Un filtre pot rebre una selecció de l’espai Dades.<br><br>Arrossega un port de sortida fins a una entrada. Clic dret per afegir.', planols: 'Un <em>Plànol</em> combina un <em>Full</em>, una <em>Caràtula</em> i les vistes publicables, que tries a l’inspector del plànol. Els <em>Llistats</em> de plànols i de vistes es poden dibuixar al full o exportar en CSV.<br><br>Les connexions amb altres espais es fan a l’inspector.' }[GV.sp]; }
  if (!n || GV.sp === 'tot') return; const me = gSp(n.t), re = () => { pubCompile(); pubDraw(); };
  for (const q of NT[n.t].ins) { const cand = GG().nodes.filter(c => NT[c.t].out && q[2].includes(NT[c.t].out) && gSp(c.t) !== me && c.id !== n.id && !gUp(c.id).has(n.id)); if (!cand.length) continue;
    const s = el('section'), cur = gIn(n.id, q[0]); s.appendChild(el('h5', '', q[1] + ' · des de ' + GSP[gSp(cand[0].t)][0].toLowerCase().replace(/^./, c => c.toUpperCase())));
    const nm = c => c.p.name || (c.t === 'proj' ? c.p.projecte || 'Dades del projecte' : NT[c.t].name + ' ' + c.id);
    if (q[3]) { const box = el('div', 'gc-xl'); for (const c of cand) { const L = el('label'), k = el('input'); k.type = 'checkbox'; k.checked = cur.some(x => x.id === c.id); k.dataset.xin = n.id + ':' + q[0] + ':' + c.id; k.onchange = () => { pushUndo('Connecta'); if (k.checked) gLink(c.id, n.id, q[0]); else GG().wires = GG().wires.filter(w => !(w.a === c.id && w.b === n.id && w.bp === q[0])); re(); }; L.appendChild(k); L.appendChild(document.createTextNode(' ' + nm(c))); box.appendChild(L); } s.appendChild(box); }
    else { const sl = el('select'); sl.dataset.xin = n.id + ':' + q[0]; for (const [v, t] of [['', '—'], ...cand.map(c => [c.id, nm(c)])]) { const o = el('option'); o.value = v; o.textContent = t; if (cur[0] && cur[0].id === v) o.selected = true; sl.appendChild(o); }
      sl.onchange = () => { pushUndo('Connecta'); if (sl.value) gLink(+sl.value, n.id, q[0]); else GG().wires = GG().wires.filter(w => !(w.b === n.id && w.bp === q[0])); re(); }; const r = el('div', 'gc-f'); r.appendChild(el('label', '', 'Origen')); r.appendChild(sl); s.appendChild(r); }
    const last = ins.lastElementChild; ins.insertBefore(s, last); } }; }
/* etiquetes als ports connectats des d'un altre espai */
function gXSpace(world, vis, nodeEls) { if (GV.sp === 'tot') return; for (const w of GG().wires) { const B = nodeEls[w.b], A = gN(w.a); if (!B || nodeEls[w.a] || !A || gSp(A.t) === GV.sp) continue; const i = NT[gN(w.b).t].ins.findIndex(q => q[0] === w.bp), p = B.querySelectorAll('.gc-p.in')[i]; if (!p) continue;
  const prev = p.querySelector('.gc-x'), t = (A.p.name || (A.t === 'proj' ? A.p.projecte : NT[A.t].name)) || ''; if (prev) { if (!prev.textContent.endsWith(' …')) prev.textContent += ' …'; continue; } const x = el('em', 'gc-x', esc('⇠ ' + GSP[gSp(A.t)][0] + ' · ' + t)); x.style.setProperty('--c', GSP[gSp(A.t)][1]); p.appendChild(x); p.querySelector('u').classList.add('lk'); } }
(function () { const st = document.createElement('style'); st.textContent = `
.gc-tabs{display:flex;gap:2px;align-self:stretch;align-items:flex-end;margin-left:10px}
.gc-tab{display:flex;align-items:center;gap:8px;height:38px;padding:0 14px;border:0;border-radius:8px 8px 0 0;background:transparent;color:var(--dim);font:600 12.5px var(--sans);letter-spacing:.06em;cursor:pointer;box-shadow:inset 0 -3px 0 transparent}
.gc-tab i{width:8px;height:8px;border-radius:2px;background:var(--c)}.gc-tab small{font-weight:500;letter-spacing:0;color:var(--dim);font-size:11px}
.gc-tab:hover{color:var(--txt)}.gc-tab.on{background:var(--panel-2);color:var(--txt);box-shadow:inset 0 -3px 0 var(--c)}.gc-tab:focus-visible{outline:2px solid var(--accent)}
.gc-q{margin:0 2px 8px;font-size:17px;line-height:1.25;font-weight:600;color:var(--txt);border-left:3px solid var(--c);padding-left:8px}
.gc-x{position:absolute;right:calc(100% + 4px);top:-1px;font-style:normal;font-size:10px;color:var(--c);background:var(--panel-2);padding:0 5px;border-radius:4px;white-space:nowrap;opacity:1!important}
.gc-p u.lk{background:var(--pc)}
.gc-tw{max-height:230px;overflow:auto;border:1px solid var(--line);border-radius:6px}.gc-tw.big{max-height:60vh}
.gc-tbl{border-collapse:collapse;width:100%;font-size:11.5px;font-variant-numeric:tabular-nums}
.gc-tbl th{position:sticky;top:0;background:var(--panel-2);color:var(--dim);font-weight:500;text-align:left;padding:4px 6px;white-space:nowrap}
.gc-tbl td{border-top:1px solid var(--line);padding:2px 6px;white-space:nowrap}.gc-tbl td.nm{cursor:pointer;color:var(--txt)}.gc-tbl td.nm:hover{color:var(--accent)}.gc-tbl td.dim{color:var(--dim)}
.gc-tbl td input{width:100%;min-width:70px;background:transparent;border:1px solid transparent;color:var(--txt);border-radius:4px;padding:2px 4px;font:inherit}
.gc-tbl td input:focus{outline:none;border-color:var(--accent);background:var(--ink)}
.gc-tbl td.miss{background:rgba(240,82,82,.14)}.gc-tbl td.miss input::placeholder{color:#FF8A8A}.gc-tbl td.miss.txt{color:#FF8A8A}
.gc-ins input.miss{border-color:rgba(240,82,82,.6)}.gc-ins input.miss::placeholder,.gc-stk b.miss{color:#FF8A8A}
.gc-xl{display:grid;gap:4px;font-size:12px}.gc-xl label,.gc-ck{display:flex;gap:6px;align-items:center;font-size:12px}
`; document.head.appendChild(st); })();
