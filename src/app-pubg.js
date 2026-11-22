/* ============================================================
   v0.47.0 · Compositor de representació (llenç de nodes de «Plànols»)
   El graf (model.meta.pub.g) és la font de veritat; pubCompile() en
   deriva pubs / sheets / exps, que són els objectes que ja saben
   renderitzar i exportar app-pub.js i app-doc.js.
   Ports tipats: model · view · pub · title · sheet.
   ============================================================ */
const NT = {
  model: { cat: 'src', name: 'Model', ico: '◆', ins: [], out: 'model' },
  branch: { cat: 'src', name: 'Branca del model', ico: '⑂', ins: [['m', 'Model', ['model']]], out: 'model' },
  base: { cat: 'src', name: 'Vista de treball', ico: '▢', ins: [['m', 'Model', ['model']]], out: 'view' },
  filter: { cat: 'mod', name: 'Filtre', ico: '⊘', ins: [['v', 'Vista', ['view']], ['e', 'Selecció (Dades)', ['els']]], out: 'view' },
  lim: { cat: 'mod', name: 'Límits', ico: '⌗', ins: [['v', 'Vista', ['view']]], out: 'view' },
  style: { cat: 'mod', name: 'Estil de visualització', ico: '◐', ins: [['v', 'Vista', ['view']]], out: 'view' },
  lines: { cat: 'mod', name: 'Joc de línies', ico: '≡', ins: [['v', 'Vista', ['view']]], out: 'view' },
  scale: { cat: 'mod', name: 'Escala', ico: '⇲', ins: [['v', 'Vista', ['view']]], out: 'view' },
  ann: { cat: 'mod', name: 'Anotació', ico: '✎', ins: [['v', 'Vista', ['view']]], out: 'view' },
  pub: { cat: 'pub', name: 'Vista publicable', ico: '▣', ins: [['v', 'Vista', ['view']]], out: 'pub' },
  paper: { cat: 'pub', name: 'Full', ico: '▯', ins: [], out: 'paper' },
  proj: { cat: 'dat', name: 'Dades del projecte', ico: 'ⓘ', ins: [['e', 'Tècnics', ['team']]], out: 'proj' },
  title: { cat: 'pub', name: 'Caràtula', ico: '▤', ins: [['d', 'Projecte', ['proj']]], out: 'title' },
  sheet: { cat: 'pub', name: 'Plànol', ico: '▭', ins: [['f', 'Full', ['paper']], ['p', 'Vistes', ['pub'], 1], ['t', 'Caràtula', ['title']], ['l', 'Llistats', ['list'], 1]], out: 'sheet' },
  exp2d: { cat: 'out', name: 'Exporta 2D', ico: '⤓', ins: [['s', 'Plànol o vista', ['sheet', 'pub']], ['f', 'Full (vista solta)', ['paper']]], out: null },
  expm: { cat: 'out', name: 'Exporta model', ico: '⤓', ins: [['s', 'Model o vista', ['model', 'view']]], out: null },
  exp3d: { cat: 'out', name: '3D interactiu', ico: '⬡', ins: [['s', 'Model o vista', ['model', 'view']]], out: null },
};
const NCAT = { dat: ['Dades', '#4C6EF5'], src: ['Fonts', '#9AA3AF'], mod: ['Modificadors', '#5FD3E0'], pub: ['Composició', '#B6A8FF'], lst: ['Llistats', '#E0A43B'], out: ['Exportacions', '#FF9A7A'] };
const PTC = { model: '#9AA3AF', view: '#5FD3E0', pub: '#D6FB41', title: '#B6A8FF', sheet: '#F2C14E', paper: '#E7EAEE', proj: '#FF9AD5', els: '#7D97FF', team: '#A9B9FF', list: '#E0A43B' };
const SCALES = [20, 25, 50, 75, 100, 150, 200, 250, 500, 1000, 2000];
const SECF = [['', '— hereta —'], ['none', 'Sense emplenat'], ['grey', 'Gris'], ['solid', 'Sòlid'], ['hatch', 'Ratllat'], ['cross', 'Ratllat creuat']];
const HIDM = [['', '— hereta —'], ['off', 'No es mostren'], ['dash', 'Discontínues'], ['mark', 'Marcades']];
const NDEF = {
  model: () => ({ by: 'ifc', tree: false }), branch: () => ({ dim: 'ifc', val: '-', key: '', fold: false }), ann: () => ({ dims: true, north: true, label: '', note: '' }), base: () => ({ src: (pubViewChoices()[0] || [''])[0] }), filter: () => ({ hidTags: [], hidIfc: [] }), lim: () => ({ cut: null, rear: null, box: null }),
  style: () => ({ base: 'Paper', sec: '', hid: '' }), lines: () => ({ set: 'ISO', k: 1, snap: null }), scale: () => ({ n: 100 }), pub: () => ({ name: 'Vista publicable' }),
  paper: () => ({ fmt: 'A3', orient: 'land', w: 420, h: 297, mg: 10, bind: 0, frame: 0.5 }),
  proj: () => ({ roles: {}, expedient: '', fase: '', projecte: baseName(), client: '', emplacament: '', promotor: '', autor: '', estudi: 'SBS BIM Consulting', collegiat: '', escola: '', curs: '', logo: null, extra: [] }),
  title: () => ({ tpl: 'guaita', ...tbTemplate('guaita') }),
  sheet: () => ({ name: 'Plànol', numero: 'A-01', titol: '', revisio: '0', data: '', dibuixat: '', revisat: '', fase: '' }),
  exp2d: () => ({ name: 'PDF', fmt: 'pdf' }), expm: () => ({ name: 'IFC', fmt: 'ifc' }), exp3d: () => ({ name: '3D', fmt: 'html3d' }),
};
/* camps: [clau, etiqueta, tipus, opcions, principal (es veu al node)] */
const GBY = [['ifc', 'Classe IFC'], ['level', 'Nivell'], ['tag', 'Etiqueta'], ['mat', 'Material'], ['level>ifc', 'Nivell › Classe'], ['ifc>level', 'Classe › Nivell'], ['level>tag', 'Nivell › Etiqueta'], ['tag>ifc', 'Etiqueta › Classe'], ['level>mat', 'Nivell › Material']];
const NF = {
  model: [['by', 'Arbre per', 'sel', () => GBY, 1]],
  ann: [['dims', 'Cotes generals', 'chk', null, 1], ['north', 'Fletxa de nord', 'chk', null, 1], ['label', 'Rètol de la vista', 'text', null, 0], ['note', 'Nota', 'text', null, 0]],
  base: [['src', 'Origen', 'sel', () => pubViewChoices(), 1]],
  lim: [['cut', 'Alçada de tall (m)', 'num', null, 1], ['rear', 'Fons reflexades (m)', 'num', null, 1]],
  style: [['base', 'Estil', 'sel', () => [['Paper', 'Paper (línia oculta)'], ...STYLES_BUILTIN.filter(s => s.name !== 'Treball').map(s => [s.name, s.name])], 1], ['sec', 'Seccions', 'sel', () => SECF, 1], ['hid', 'Línies ocultes', 'sel', () => HIDM, 0]],
  lines: [['set', 'Joc', 'sel', () => [...LN_PRESETS.map(p => [p[0], p[0]]), ['Personalitzat', 'Personalitzat (capturat)']], 1], ['k', 'Factor de gruix', 'num', null, 1]],
  scale: [['n', 'Escala 1:', 'sel', () => SCALES.map(n => [n, '1:' + n]), 1]],
  pub: [['name', 'Nom', 'text', null, 1]],
  paper: [['fmt', 'Mida', 'sel', () => [...PAPERS.map(p => [p[0], p[0] + ' · ' + p[1] + '×' + p[2]]), ['custom', 'Personalitzada'], ['auto', 'Automàtica (s’ajusta)']], 1], ['orient', 'Orientació', 'sel', () => [['land', 'Horitzontal'], ['port', 'Vertical']], 1], ['w', 'Amplada (mm)', 'num', null, 0], ['h', 'Alçada (mm)', 'num', null, 0], ['mg', 'Marge (mm)', 'num', null, 0], ['bind', 'Enquadernació (mm)', 'num', null, 0], ['frame', 'Gruix del marc (mm)', 'num', null, 0]],
  proj: [['projecte', 'Projecte', 'text', null, 1], ['expedient', 'Expedient', 'text', null, 0], ['fase', 'Fase', 'text', null, 0], ['client', 'Client', 'text', null, 1], ['emplacament', 'Emplaçament', 'text', null, 0], ['promotor', 'Promotor', 'text', null, 0], ['autor', 'Autor', 'text', null, 1], ['estudi', 'Estudi', 'text', null, 0], ['collegiat', 'Núm. col·legiat', 'text', null, 0], ['escola', 'Escola', 'text', null, 0], ['curs', 'Curs / assignatura', 'text', null, 0]],
  title: [['anchor', 'Posició', 'sel', () => [['br', 'Inferior dreta'], ['bl', 'Inferior esquerra'], ['tr', 'Superior dreta'], ['tl', 'Superior esquerra'], ['r', 'Franja dreta'], ['l', 'Franja esquerra']], 1], ['w', 'Amplada (mm)', 'num', null, 0], ['h', 'Alçada (mm)', 'num', null, 0]],
  sheet: [['name', 'Nom', 'text', null, 1], ['numero', 'Número', 'text', null, 1], ['titol', 'Títol', 'text', null, 1], ['revisio', 'Revisió', 'text', null, 0], ['data', 'Data (buit = avui)', 'text', null, 0], ['dibuixat', 'Dibuixat', 'text', null, 0], ['revisat', 'Revisat', 'text', null, 0], ['fase', 'Fase', 'text', null, 0]],
  exp2d: [['fmt', 'Format', 'sel', () => PUB_FMTS.sheet, 1], ['name', 'Nom del fitxer', 'text', null, 0]],
  expm: [['fmt', 'Format', 'sel', () => PUB_FMTS.model, 1], ['name', 'Nom del fitxer', 'text', null, 0]],
  exp3d: [['fmt', 'Format', 'sel', () => [['html3d', 'HTML (visor web)'], ['glb3d', 'GLB']], 1], ['name', 'Nom del fitxer', 'text', null, 0]],
};
const GG = () => { const P = pubData(); if (!P.g) pubMigrate(P); if ((P.g.v || 0) < 49 && !P.g._mig) gUp49(P.g); return P.g; };
const gN = id => GG().nodes.find(n => n.id === id);
const gIn = (id, port) => GG().wires.filter(w => w.b === id && w.bp === port).map(w => gN(w.a)).filter(Boolean);
function gAdd(t, x, y, p) { if (!x && !y && t !== 'model' && !GG()._mig) { const ns = GG().nodes.filter(n => n.t === t || NT[n.t].cat === NT[t].cat); x = { dat: 300, src: 300, mod: 900, pub: 1500, lst: 1500, out: 1900 }[NT[t].cat]; y = ns.length ? Math.max(...ns.map(n => n.y)) + 260 : 0; } const n = { id: pubNext(), t, x: x || 0, y: y || 0, p: { ...NDEF[t](), ...(p || {}) } }; GG().nodes.push(n); return n; }
function gLink(a, b, bp) {
  const g = GG(), A = gN(a), B = gN(b); if (!A || !B) return false; const port = NT[B.t].ins.find(q => q[0] === bp); if (!port || !port[2].includes(NT[A.t].out)) return false;
  if (gUp(a).has(b) || a === b) return false; if (g.wires.some(w => w.a === a && w.b === b && w.bp === bp)) return false;
  if (!port[3]) g.wires = g.wires.filter(w => !(w.b === b && w.bp === bp)); g.wires.push({ a, b, bp }); return true;
}
/* tots els nodes aigües amunt (per evitar cicles) */
function gUp(id, acc) { acc = acc || new Set(); for (const w of GG().wires) if (w.b === id && !acc.has(w.a)) { acc.add(w.a); gUp(w.a, acc); } return acc; }
/* cadena de vista: [base, mod1, mod2, …] des de la font fins al node donat */
function gChain(id) { const ch = []; let n = gN(id), guard = 0; while (n && guard++ < 200) { ch.unshift(n); if (n.t === 'base' || n.t === 'model') break; const up = gIn(n.id, n.t === 'pub' || NT[n.t].cat === 'mod' ? 'v' : n.t === 'base' ? 'm' : 's')[0]; n = up; } return ch; }
/* resol la pila de representació amb l'origen de cada valor */
function gResolve(id) {
  const ch = gChain(id), R = { only: null, annx: null, src: null, filter: { hidTags: [], hidIfc: [] }, lim: { cut: null, rear: null, box: null }, vis: { base: 'Paper', sec: '', hid: '' }, rep: 'ISO', snap: null, lk: 1, scale: 100, org: {} };
  const set = (k, v, n) => { R.org[k] = n; return v; };
  for (const n of ch) {
    const p = n.p;
    if (n.t === 'base') R.src = set('src', p.src, n);
    else if (n.t === 'filter') { const se = gIn(n.id, 'e')[0]; if (se) { const ids = gEls(se.id).map(g => g.id); R.only = R.only ? R.only.filter(i => ids.includes(i)) : ids; R.org.only = se; }
      R.filter.hidTags = [...new Set([...R.filter.hidTags, ...p.hidTags])]; R.filter.hidIfc = [...new Set([...R.filter.hidIfc, ...p.hidIfc])]; set('filter', 0, n); }
    else if (n.t === 'lim') { if (p.cut != null) R.lim.cut = set('cut', p.cut, n); if (p.rear != null) R.lim.rear = set('rear', p.rear, n); if (p.box) R.lim.box = set('box', p.box, n); }
    else if (n.t === 'style') { R.vis.base = set('vis', p.base, n); if (p.sec) R.vis.sec = set('sec', p.sec, n); if (p.hid) R.vis.hid = set('hid', p.hid, n); }
    else if (n.t === 'lines') { R.rep = set('rep', p.set, n); R.snap = p.snap; R.lk = +p.k || 1; }
    else if (n.t === 'scale') R.scale = set('scale', +p.n || 100, n);
    else if (n.t === 'ann') R.annx = set('ann', { ...p }, n);
  }
  const mi = ch[0] && ch[0].t === 'base' ? gIn(ch[0].id, 'm')[0] : null; if (mi && mi.t === 'branch') { const b = gBranchEls(mi.id).map(g => g.id); R.only = R.only ? R.only.filter(i => b.includes(i)) : b; R.org.only = mi; }
  R.ok = !!(ch[0] && ch[0].t === 'base' && R.src); return R;
}
/* graf → objectes pubs / sheets / exps */
function pubCompile() {
  const P = pubData(), g = GG(); P.pubs = []; P.sheets = []; P.exps = [];
  for (const n of g.nodes) if (n.t === 'pub') { const R = gResolve(n.id); if (R.ok) P.pubs.push({ id: n.id, name: n.p.name, src: R.src, rep: R.rep, snap: R.snap, lk: R.lk, vis: R.vis, scale: R.scale, filter: { ...R.filter, only: R.only }, lim: R.lim, annx: R.annx }); }
  for (const n of g.nodes) if (n.t === 'sheet') { const t = gIn(n.id, 't')[0], f = gIn(n.id, 'f')[0], pj = t && gIn(t.id, 'd')[0];
    P.sheets.push({ id: n.id, name: n.p.name, fmt: 'auto', items: gIn(n.id, 'p').filter(x => P.pubs.some(p => p.id === x.id)).map(x => x.id), paper: f ? gPaper(f) : null, block: t ? gBlock(t, pj, n) : null, pos: n.p.pos || null, lists: [...gIn(n.id, 'l').map(l => gListData(l)), ...(n.p.vtab ? [gListData({ t: 'lviews', p: { scope: n.id, name: 'Vistes del plànol' } })] : [])] }); }
  for (const n of g.nodes) if (NT[n.t].cat === 'out') {
    const s = gIn(n.id, 's')[0]; let src = '', filter = { hidTags: [], hidIfc: [] };
    if (s) { if (s.t === 'model') src = 'model'; else if (s.t === 'branch') { src = 'model'; filter = { hidTags: [], hidIfc: [], only: gBranchEls(s.id).map(g => g.id) }; } else if (s.t === 'sheet') src = 'sheet:' + s.id; else if (s.t === 'pub') src = 'pub:' + s.id; else { src = 'model'; const R = gResolve(s.id); filter = { ...R.filter, only: R.only }; } }
    const pf = n.t === 'exp2d' && gIn(n.id, 'f')[0]; P.exps.push({ id: n.id, name: n.p.name, src, fmt: n.p.fmt, filter, paper: pf ? gPaper(pf) : null });
  }
}
/* estat d'error / avís de cada node */
function gIssue(n) {
  const t = n.t;
  if (t === 'base' && !(n.p.src && viewName(n.p.src))) return 'L’origen ja no existeix.';
  if ((NT[t].cat === 'mod' || t === 'pub') && !gIn(n.id, 'v').length) return 'Connecta una vista a l’entrada.';
  if (t === 'pub' && !gResolve(n.id).ok) return 'La cadena no arriba a cap vista de treball.';
  if (t === 'sheet' && !gIn(n.id, 'f').length) return 'Connecta-hi un Full.';
  if (t === 'sheet' && !gIn(n.id, 'p').length) return 'Connecta-hi vistes publicables.';
  if (NT[t].cat === 'out') { const s = gIn(n.id, 's')[0]; if (!s) return 'Sense origen.'; if (t === 'exp2d' && s.t === 'sheet' && !gIn(s.id, 'f').length) return 'El plànol no té Full.'; if (t === 'exp2d' && s.t === 'sheet' && n.p.fmt !== 'svg' && !gIn(s.id, 't').length) return 'El plànol necessita caràtula per a ' + n.p.fmt.toUpperCase() + '.'; }
  return null;
}
function pubMigrate(P) {
  P.g = { nodes: [], wires: [], _mig: 1 }; const old = { pubs: P.pubs || [], sheets: P.sheets || [], exps: P.exps || [] }, m = gAdd('model', 0, 0), map = {};
  old.pubs.forEach((p, i) => {
    const y = i * 230; let prev = gAdd('base', 300, y, { src: p.src }); gLink(m.id, prev.id, 'm'); let x = 600;
    const step = (t, pp) => { const n = gAdd(t, x, y, pp); gLink(prev.id, n.id, 'v'); prev = n; x += 300; };
    if (p.filter && (p.filter.hidTags.length || p.filter.hidIfc.length)) step('filter', { hidTags: p.filter.hidTags.slice(), hidIfc: p.filter.hidIfc.slice() });
    if (p.lim && (p.lim.cut != null || p.lim.rear != null || p.lim.box)) step('lim', { ...p.lim });
    step('lines', { set: p.rep, snap: p.snap || null }); step('scale', { n: p.scale }); step('pub', { name: p.name }); map[p.id] = prev.id;
  });
  for (const s of old.sheets) { const n = gAdd('sheet', 0, 0, { name: s.name, fmt: s.fmt }); map['s' + s.id] = n.id; for (const i of s.items) if (map[i]) gLink(map[i], n.id, 'p'); }
  for (const e of old.exps) { const n = gAdd(e.src === 'model' ? 'expm' : 'exp2d', 0, 0, { name: e.name, fmt: e.fmt }); const a = e.src === 'model' ? m.id : map['s' + (e.src || '').slice(6)]; if (a) gLink(a, n.id, 's'); }
  delete P.g._mig; gLayout(true); pubCompile();
}
/* API conservada: crea una vista publicable a partir d'una vista de treball */
function pubCreate(key) {
  const name = viewName(key); if (name == null) return null; const g = GG(), m = g.nodes.find(n => n.t === 'model') || gAdd('model', 0, 0);
  const y = Math.max(-230, ...g.nodes.filter(n => n.t !== 'model').map(n => n.y)) + 230;
  const b = gAdd('base', 300, y, { src: key }), l = gAdd('lines', 600, y), s = gAdd('scale', 900, y), p = gAdd('pub', 1200, y, { name: name.replace(/^(Planta|Secció|Escena) · /, '$1 ') + ' - Publicació' });
  gLink(m.id, b.id, 'm'); gLink(b.id, l.id, 'v'); gLink(l.id, s.id, 'v'); gLink(s.id, p.id, 'v'); pubCompile(); return pubData().pubs.find(x => x.id === p.id);
}
/* disposició automàtica per profunditat */
function gLayout(force) {
  const g = GG(), dep = {}, d = id => { if (dep[id] != null) return dep[id]; dep[id] = 0; const ins = g.wires.filter(w => w.b === id); return (dep[id] = ins.length ? 1 + Math.max(...ins.map(w => d(w.a))) : (gN(id).t === 'title' ? 5 : 0)); };
  const col = {}; for (const n of g.nodes) { if (!force && n.placed) continue; const c = d(n.id); (col[c] = col[c] || []).push(n); }
  const H = { pub: 300, sheet: 300, title: 190, model: 110 }, hh = n => H[n.t] || (NT[n.t].cat === 'out' ? 150 : 140);
  for (const c of Object.keys(col)) { let y = 0; col[c].sort((a, b) => a.y - b.y || a.id - b.id).forEach(n => { n.x = +c * 320; n.y = y; y += hh(n) + 28; n.placed = 1; }); }
}

/* ---------------- miniatures (vista publicable i plànol) ---------------- */
const GTH = { cache: new Map(), q: [], busy: false };
function gThumbKey(n) { const P = pubData(); const o = n.t === 'pub' ? P.pubs.find(p => p.id === n.id) : P.sheets.find(s => s.id === n.id); if (!o) return null; return n.t + JSON.stringify(o) + (n.t === 'sheet' ? JSON.stringify(o.items.map(i => P.pubs.find(p => p.id === i))) : '') + '|' + S.undo.length; }
function gThumb(n, img) {
  const k = gThumbKey(n); if (!k) return; if (GTH.cache.has(k)) { img.src = GTH.cache.get(k); img.classList.add('on'); return; }
  GTH.q.push([n, img, k]); if (!GTH.busy) { GTH.busy = true; setTimeout(gThumbRun, 30); }
}
function gThumbRun() {
  const it = GTH.q.shift(); if (!it) { GTH.busy = false; return; } const [n, img, k] = it;
  try { const P = pubData(), d = n.t === 'pub' ? (() => { const p = P.pubs.find(x => x.id === n.id); return p && docSheet([p], { scale: p.scale, hidden: true, fmt: null, title: p.name }); })() : pubSheetBuild(P.sheets.find(s => s.id === n.id));
    if (d) { let sv = sheetSVG(d); if (n.t === 'pub') { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of d.prims) { if (q.layer === 'G-MARC' || q.layer === 'G-CARATULA') continue; const pts = q.t === 'l' ? [[q.x1, q.y1], [q.x2, q.y2]] : q.t === 'p' ? q.loops.flat() : [[q.x, q.y]]; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
        if (x1 > x0) { const m = Math.max(x1 - x0, y1 - y0) * 0.08; sv = sv.replace(/viewBox="[^"]*"/, 'viewBox="' + (x0 - m) + ' ' + (d.H - y1 - m) + ' ' + (x1 - x0 + 2 * m) + ' ' + (y1 - y0 + 2 * m) + '"').replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="400" height="300"'); } }
      const u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sv); GTH.cache.set(k, u); if (img.isConnected) { img.src = u; img.classList.add('on'); } } } catch (e) { console.warn('miniatura', e); }
  setTimeout(gThumbRun, 0);
}

/* ---------------- UI ---------------- */
const GV = { view: { x: 40, y: 40, z: 0.8 }, sel: new Set(), wire: null, fitted: false, menu: null, sp: 'vistes', views: {} };
/* v0.54 · Taller: tres espais de nodes */
const GSP = { dades: ['DADES', '#4C6EF5', 'Què és cada element?'], vistes: ['VISTES', '#2BB3A3', 'Com es veu?'], planols: ['PLÀNOLS', '#E0A43B', 'Com es publica?'] };
const GSPT = { dades: ['sel', 'pset', 'assign', 'table', 'req', 'expd', 'team', 'proj'], planols: ['paper', 'title', 'sheet', 'exp2d', 'lsheets', 'lviews'] };
const gSp = t => GSPT.dades.includes(t) ? 'dades' : GSPT.planols.includes(t) ? 'planols' : 'vistes';
const gSpOk = t => GV.sp === 'tot' || gSp(t) === GV.sp;
function gSpGo(sp) { GV.views[GV.sp] = GV.view; GV.sp = sp; GV.view = GV.views[sp] || (GV.views[sp] = { x: 40, y: 40, z: 0.8 }); GV.fitted = !!GV.view.f; GV.sel.clear(); GV.wire = null; const o = $('gcTb') || $('gcSheet'); if (o) o.remove(); pubDraw(); }
const PUBW = { mode: 'canvas', sel: {} };
const GCSS = `
#pubWin{font-family:var(--sans)}
.gc-top{display:flex;align-items:center;gap:10px;height:44px;padding:0 12px;border-bottom:1px solid var(--line);background:var(--panel)}
.gc-top h2{font-size:15px;font-weight:600;margin:0}.gc-top .crumb{color:var(--dim);font-size:12.5px}.gc-top .sp{flex:1}
.gc-body{flex:1;display:grid;grid-template-columns:232px 1fr 340px;min-height:0}
.gc-pal{border-right:1px solid var(--line);background:var(--panel);overflow:auto;padding:12px 10px}
.gc-pal h4{font-size:12px;font-weight:600;color:var(--dim);margin:14px 4px 6px}.gc-pal h4:first-child{margin-top:2px}
.gc-it{display:flex;align-items:center;gap:9px;padding:6px 8px;border-radius:6px;cursor:grab;font-size:13px;color:var(--txt);border:1px solid transparent}
.gc-it:hover{background:var(--panel-2);border-color:var(--line)}.gc-it i{font-style:normal;width:20px;height:20px;border-radius:5px;display:grid;place-items:center;font-size:12px;background:var(--panel-3);color:var(--c)}
.gc-cv{position:relative;overflow:hidden;background-color:var(--ink);background-image:radial-gradient(circle,#2A313B 1px,transparent 1.3px);cursor:default;outline:none}
.gc-cv.pan{cursor:grabbing}.gc-world{position:absolute;left:0;top:0;transform-origin:0 0}
.gc-wires{position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none}
.gc-w{fill:none;stroke:var(--accent);stroke-width:2.2;opacity:.78;pointer-events:stroke;cursor:pointer}.gc-w.hit{stroke:transparent;stroke-width:12;opacity:1}
.gc-w.cfg{stroke:#5B6470;stroke-dasharray:5 4;opacity:.9}.gc-w.sel{stroke-width:3.6;opacity:1;filter:drop-shadow(0 0 4px rgba(214,251,65,.55))}.gc-w.tmp{stroke-dasharray:6 5;opacity:1;pointer-events:none}
.gc-n{position:absolute;width:264px;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.35);font-size:12.5px}
.gc-n.sel{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),0 12px 30px rgba(0,0,0,.45)}
.gc-n.err .gc-h{box-shadow:inset 0 -2px 0 var(--danger)}
.gc-h{display:flex;align-items:center;gap:8px;padding:8px 10px 7px;cursor:move;border-bottom:1px solid var(--line);border-radius:10px 10px 0 0;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 16%,transparent),transparent 70%)}
.gc-h i{font-style:normal;color:var(--c);font-size:13px}.gc-h b{flex:1;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gc-h code{font-family:var(--mono);font-size:10.5px;color:var(--dim)}
.gc-b{padding:8px 10px 10px;display:grid;gap:6px}
.gc-f{display:grid;grid-template-columns:92px 1fr;align-items:center;gap:6px}.gc-f label{color:var(--dim);font-size:11.5px}
.gc-f input,.gc-f select{width:100%;min-width:0;background:var(--ink);border:1px solid var(--line);color:var(--txt);border-radius:5px;padding:3px 6px;font:inherit;font-size:12px}
.gc-f input:focus,.gc-f select:focus{outline:none;border-color:var(--accent)}
.gc-sum{color:var(--dim);font-size:11.5px;line-height:1.45}.gc-sum em{font-style:normal;color:var(--accent)}
.gc-err{color:#FF8A8A;font-size:11.5px}
.gc-th{background:#fff;border-radius:4px;height:132px;display:grid;place-items:center;overflow:hidden;position:relative}
.gc-th img{max-width:100%;max-height:100%;opacity:0;transition:opacity .25s}.gc-th img.on{opacity:1}.gc-th span{position:absolute;color:#8B939F;font-size:11px}.gc-th img.on+span{display:none}
.gc-chips{display:flex;flex-wrap:wrap;gap:4px}.gc-chips span{font-size:10.5px;padding:1px 6px;border-radius:9px;background:var(--panel-3);color:var(--txt)}
.gc-go{background:var(--accent);color:var(--accent-ink);border:0;border-radius:6px;padding:5px 10px;font:inherit;font-weight:600;font-size:12px;cursor:pointer}.gc-go:disabled{opacity:.35;cursor:not-allowed}
.gc-p{position:absolute;display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--dim);pointer-events:none;white-space:nowrap}
.gc-p.in{left:-7px}.gc-p span{background:var(--panel-2);padding:1px 5px;border-radius:4px;opacity:0;transition:opacity .12s}.gc-n:hover .gc-p span,.gc-n.sel .gc-p span{opacity:1}.gc-p.out{right:-7px;flex-direction:row-reverse}
.cmp .gc-b>*{display:none}.cmp .gc-n{min-height:84px}.cmp .gc-h{padding:10px 12px}.cmp .gc-h b{font-size:19px}.cmp .gc-h code{font-size:14px}.cmp .gc-p span{display:none}
.gc-p u::after{content:'';position:absolute;inset:-6px;border-radius:50%}.gc-p u{position:relative;pointer-events:auto;width:13px;height:13px;border-radius:50%;background:var(--ink);border:2.5px solid var(--pc);cursor:crosshair;text-decoration:none;flex:none}
.gc-p.out u{background:var(--pc)}.gc-p u:hover,.gc-p u.ok{transform:scale(1.35);box-shadow:0 0 0 4px rgba(214,251,65,.22)}.gc-p u.no{opacity:.2}
.gc-bar{position:absolute;right:12px;top:12px;display:flex;gap:4px;z-index:3}
.gc-mm{position:absolute;left:12px;bottom:12px;width:190px;height:116px;background:rgba(23,27,33,.92);border:1px solid var(--line);border-radius:8px;z-index:3;cursor:pointer}
.gc-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);color:var(--dim);font-size:12px;z-index:2;pointer-events:none}
.gc-menu{position:absolute;z-index:9;width:236px;background:var(--panel-2);border:1px solid var(--line);border-radius:8px;box-shadow:0 14px 34px rgba(0,0,0,.5);padding:6px}
.gc-menu input{width:100%;background:var(--ink);border:1px solid var(--line);color:var(--txt);border-radius:5px;padding:5px 7px;font:inherit;margin-bottom:4px}
.gc-menu div{padding:5px 8px;border-radius:5px;cursor:pointer;display:flex;gap:8px;font-size:12.5px}.gc-menu div:hover,.gc-menu div.k{background:var(--sel)}.gc-menu div i{font-style:normal;color:var(--c);width:14px}
.gc-ins{border-left:1px solid var(--line);background:var(--panel);overflow:auto}
.gc-ins header{padding:14px 14px 10px;border-bottom:1px solid var(--line)}.gc-ins header small{display:block;color:var(--dim);font-size:11.5px}.gc-ins header h3{margin:2px 0 0;font-size:15px;display:flex;gap:8px;align-items:center}
.gc-ins section{padding:10px 14px;border-bottom:1px solid var(--line)}.gc-ins h5{margin:0 0 8px;font-size:12px;font-weight:600;color:var(--dim)}
.gc-ins .gc-f{grid-template-columns:120px 1fr}
.gc-stk{display:grid;grid-template-columns:auto 1fr auto;gap:4px 10px;font-size:12px;align-items:baseline}.gc-stk span{color:var(--dim)}.gc-stk a{color:var(--accent);cursor:pointer;font-size:11px;text-decoration:none}.gc-stk a:hover{text-decoration:underline}.gc-stk i{font-style:normal;color:#5B6470;font-size:11px}
.gc-cat{display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:12px}.gc-cat label{display:flex;gap:5px;align-items:center}
.gc-ins .row2{display:flex;gap:6px;flex-wrap:wrap}
`;
function pubOpen(selId) {
  let w = $('pubWin'); if (!w) { w = el('div'); w.id = 'pubWin'; document.body.appendChild(w); GV.fitted = false; }
  if (!$('gcCss')) { const st = el('style'); st.id = 'gcCss'; st.textContent = GCSS; document.head.appendChild(st); }
  w.style.cssText = 'position:fixed;inset:42px 0 0 0;z-index:60;background:var(--ink);display:flex;flex-direction:column';
  GG(); if (selId != null) { const sn = gN(selId); if (sn && GV.sp !== 'tot' && gSp(sn.t) !== GV.sp) { GV.views[GV.sp] = GV.view; GV.sp = gSp(sn.t); GV.view = GV.views[GV.sp] || (GV.views[GV.sp] = { x: 40, y: 40, z: 0.8 }); } GV.sel = new Set([selId]); GV.focus = selId; } pubDraw();
}
function pubClose() { const w = $('pubWin'); if (w) w.remove(); GV.fitted = false; GV.menu = null; }
const gFieldEl = (n, f, onChange) => {
  const [k, lab, kind, opts] = f, row = el('div', 'gc-f'), l = el('label', '', lab); row.appendChild(l); let i;
  if (kind === 'chk') { i = el('input'); i.type = 'checkbox'; i.checked = !!n.p[k]; i.dataset.f = k; i.onmousedown = e => e.stopPropagation(); i.onchange = () => { pushUndo('Propietat de node'); n.p[k] = i.checked; onChange(); }; row.appendChild(i); return row; }
  if (kind === 'sel') { i = el('select'); for (const o of opts()) { const [v, t] = Array.isArray(o) ? o : [o, o]; const op = el('option'); op.value = v; op.textContent = t; if (String(n.p[k] ?? '') === String(v)) op.selected = true; i.appendChild(op); } }
  else { i = el('input'); i.type = kind === 'num' ? 'number' : 'text'; if (kind === 'num') i.step = 'any'; i.value = n.p[k] ?? ''; if (kind === 'num' && k !== 'k') i.placeholder = 'hereta'; }
  i.dataset.f = k; i.onmousedown = e => e.stopPropagation();
  i.onchange = () => { pushUndo('Propietat de node'); let v = i.value; if (kind === 'num') v = v === '' ? null : +v; if (k === 'n') v = +v; n.p[k] = v; onChange(); };
  row.appendChild(i); return row;
};
function gSummary(n) {
  const P = pubData(), d = el('div', 'gc-sum');
  if (n.t === 'model') { const els = collectScene(); d.innerHTML = '<em>' + els.length + '</em> elements · ' + els.filter(e => e.kind === 'bim').length + ' BIM<br>' + esc(baseName()); }
  else if (n.t === 'filter') { const c = n.p.hidIfc.length + n.p.hidTags.length; d.innerHTML = c ? '<em>' + c + '</em> categories ocultes' : 'Tot visible · edita les categories a l’inspector'; }
  else if (n.t === 'lim' && n.p.box) d.innerHTML = 'Caixa de secció <em>activa</em>';
  else if (n.t === 'sheet') { const s = P.sheets.find(x => x.id === n.id), t = gIn(n.id, 't')[0]; d.innerHTML = (s ? s.items.length : 0) + ' vistes · ' + (t ? 'caràtula <em>' + esc(t.p.num || '') + '</em>' : 'sense caràtula'); }
  else return null; return d;
}
function gNodeEl(n, P) {
  const T = NT[n.t], c = NCAT[T.cat][1], iss = gIssue(n), d = el('div', 'gc-n' + (GV.sel.has(n.id) ? ' sel' : '') + (iss ? ' err' : ''));
  d.dataset.node = n.id; d.dataset.t = n.t; d.style.cssText = 'left:' + n.x + 'px;top:' + n.y + 'px;--c:' + c;
  const ttl = n.p.name && (n.t === 'pub' || n.t === 'sheet') ? n.p.name : n.t === 'title' ? (n.p.num || 'Caràtula') + ' · ' + (n.p.title || 'sense títol') : T.name;
  d.innerHTML = '<div class="gc-h"><i>' + T.ico + '</i><b>' + esc(ttl) + '</b><code>' + ({ dat: 'D', src: 'F', mod: 'M', pub: 'C', lst: 'L', out: 'E' })[T.cat] + '-' + n.id + '</code></div>';
  const b = el('div', 'gc-b'); d.appendChild(b); const re = () => { pubCompile(); pubDraw(); };
  if (n.t === 'pub' || n.t === 'sheet') { const th = el('div', 'gc-th'), im = el('img'); th.appendChild(im); th.appendChild(el('span', '', 'Generant…')); b.appendChild(th); setTimeout(() => gThumb(n, im), 0); }
  const sm = gSummary(n); if (sm) b.appendChild(sm); if (GX[n.t]) GX[n.t](n, b, d);
  for (const f of NF[n.t] || []) if (f[4]) b.appendChild(gFieldEl(n, f, re));
  if (n.t === 'pub') { const R = gResolve(n.id), ch = el('div', 'gc-chips'); for (const s of [R.vis.base, R.rep + (R.lk !== 1 ? ' ×' + R.lk : ''), '1:' + R.scale, R.filter.hidIfc.length + R.filter.hidTags.length ? 'filtrat' : null, R.lim.box ? 'caixa' : null, R.annx ? 'anotada' : null, R.only ? R.only.length + ' el.' : null].filter(Boolean)) ch.appendChild(el('span', '', s)); b.appendChild(ch); }
  if (T.cat === 'out') { const go = el('button', 'gc-go', 'Exporta ' + (((NF[n.t][0][3]()).find(o => o[0] === n.p.fmt) || [0, n.p.fmt])[1])); go.dataset.go = n.id; go.disabled = !!iss; go.onmousedown = e => e.stopPropagation(); go.onclick = () => gExport(n); b.appendChild(go); }
  if (iss) b.appendChild(el('div', 'gc-err', iss));
  /* ports */
  T.ins.forEach((q, i) => { const p = el('div', 'gc-p in'); p.style.top = (44 + i * 22) + 'px'; p.style.setProperty('--pc', PTC[q[2][0]]); const u = el('u'); u.dataset.in = n.id; u.dataset.port = q[0]; u.title = q[1] + ' (' + q[2].join(' / ') + ')'; p.appendChild(u); p.appendChild(el('span', '', q[1] + (q[3] ? ' ⁺' : ''))); d.appendChild(p); });
  if (T.out) { const p = el('div', 'gc-p out'); p.style.top = '44px'; p.style.setProperty('--pc', PTC[T.out]); const u = el('u'); u.dataset.out = n.id; u.title = 'Sortida: ' + T.out; p.appendChild(u); d.appendChild(p); }
  return d;
}
async function gExport(n) { pubCompile(); const ex = pubData().exps.find(e => e.id === n.id); if (!ex) return; const ok = await pubRunExport(ex); if (ok) toast('Exportat: ' + ex.name + '.'); return ok; }
function gInspector(ins, P) {
  ins.innerHTML = ''; const ids = [...GV.sel], n = ids.length === 1 ? gN(ids[0]) : null, re = () => { pubCompile(); pubDraw(); };
  if (!n) { const h = el('header'); h.innerHTML = '<small>Compositor</small><h3>' + (ids.length ? ids.length + ' nodes seleccionats' : 'Res seleccionat') + '</h3>'; ins.appendChild(h);
    const s = el('section'); s.innerHTML = '<h5>Com funciona</h5><div class="gc-sum">Una <em>vista de treball</em> passa per <em>modificadors</em> (filtre, límits, estil, línies, escala) fins a una <em>vista publicable</em>. Les vistes publicables es componen en un <em>plànol</em> amb una <em>caràtula</em>, i els plànols, les vistes o el model s’<em>exporten</em>. Un mateix modificador pot alimentar diverses vistes.<br><br>Arrossega un port de sortida fins a una entrada compatible; deixa’l anar al buit per afegir un node ja connectat. Clic dret per afegir. Supr esborra, Ctrl+D duplica, F ajusta.</div>'; ins.appendChild(s); return; }
  const T = NT[n.t], h = el('header'); h.innerHTML = '<small>' + NCAT[T.cat][0] + ' · ' + ({ dat: 'D', src: 'F', mod: 'M', pub: 'C', lst: 'L', out: 'E' })[T.cat] + '-' + n.id + '</small><h3><span style="color:' + NCAT[T.cat][1] + '">' + T.ico + '</span>' + esc(T.name) + '</h3>'; ins.appendChild(h);
  const iss = gIssue(n); if (iss) { const s = el('section'); s.appendChild(el('div', 'gc-err', iss)); ins.appendChild(s); }
  if (GI[n.t]) GI[n.t](n, ins, re);
  if ((NF[n.t] || []).length) { const s = el('section'); s.appendChild(el('h5', '', 'Propietats')); for (const f of NF[n.t]) { s.appendChild(gFieldEl(n, f, re)); } ins.appendChild(s); }
  if (n.t === 'filter') {
    for (const [lab, key, list] of [['Classes IFC ocultes', 'hidIfc', IFC.map(c => [c[0], c[1]]).concat([['-', 'Esbós (no BIM)']])], ['Etiquetes ocultes', 'hidTags', S.model.tags.map(t => [t.id, t.name])]]) {
      const s = el('section'), g = el('div', 'gc-cat'); s.appendChild(el('h5', '', lab));
      for (const [v, t] of list) { const L = el('label'), c = el('input'); c.type = 'checkbox'; c.checked = n.p[key].includes(v); c.dataset.hid = key + ':' + v; c.onchange = () => { pushUndo('Filtre'); n.p[key] = c.checked ? [...n.p[key], v] : n.p[key].filter(x => x !== v); re(); }; L.appendChild(c); L.appendChild(document.createTextNode(t)); g.appendChild(L); }
      s.appendChild(g); ins.appendChild(s);
    }
  }
  if (n.t === 'lim') { const s = el('section'), r = el('div', 'row2'); s.appendChild(el('h5', '', 'Caixa de secció')); s.appendChild(el('div', 'gc-sum', n.p.box ? 'Capturada.' : 'Sense caixa: es dibuixa tot el rang.'));
    const b1 = el('button', 'btn sm', 'Captura la caixa actual'); b1.onclick = () => { if (!S.clipBox) { toast('Activa primer una caixa de secció al model.'); return; } pushUndo('Límits'); n.p.box = { ...S.clipBox }; delete n.p.box.on; re(); }; r.appendChild(b1);
    if (n.p.box) { const b2 = el('button', 'btn sm', 'Treu-la'); b2.onclick = () => { pushUndo('Límits'); n.p.box = null; re(); }; r.appendChild(b2); } s.appendChild(r); ins.appendChild(s); }
  if (n.t === 'lines') { const s = el('section'); s.appendChild(el('h5', '', 'Personalitzat')); s.appendChild(el('div', 'gc-sum', n.p.snap ? 'Joc capturat de l’estil de pantalla.' : 'Captura els gruixos i classes de línia de l’estil actual de pantalla.')); const b1 = el('button', 'btn sm', 'Captura l’estil actual'); b1.onclick = () => { pushUndo('Joc de línies'); n.p.snap = stylePlain(S.style); n.p.set = 'Personalitzat'; re(); }; s.appendChild(b1); ins.appendChild(s); }
  if (n.t === 'pub' || n.t === 'sheet') { const s = el('section'), th = el('div', 'gc-th'), im = el('img'); th.style.height = '220px'; th.appendChild(im); th.appendChild(el('span', '', 'Generant…')); s.appendChild(el('h5', '', 'Previsualització')); s.appendChild(th); ins.appendChild(s); setTimeout(() => gThumb(n, im), 0); }
  if (n.t === 'pub') {
    const R = gResolve(n.id), s = el('section'), g = el('div', 'gc-stk'); s.appendChild(el('h5', '', 'Pila de representació resolta'));
    const row = (lab, val, k) => { g.appendChild(el('span', '', lab)); g.appendChild(el('b', '', val)); const o = R.org[k]; if (o) { const a = el('a', '', NT[o.t].name + ' ' + o.id); a.dataset.goto = o.id; a.onclick = () => { GV.sel = new Set([o.id]); GV.focus = o.id; pubDraw(); }; g.appendChild(a); } else g.appendChild(el('i', '', 'per defecte')); };
    row('Origen', (R.src && viewName(R.src)) || '—', 'src'); row('Filtre', R.filter.hidIfc.length + R.filter.hidTags.length ? (R.filter.hidIfc.length + R.filter.hidTags.length) + ' ocults' : 'tot', 'filter');
    row('Tall', R.lim.cut != null ? fmt(R.lim.cut) + ' m' : 'del nivell', 'cut'); row('Fons', R.lim.rear != null ? fmt(R.lim.rear) + ' m' : 'del nivell', 'rear'); row('Caixa', R.lim.box ? 'sí' : 'no', 'box');
    row('Estil', R.vis.base, 'vis'); row('Seccions', R.vis.sec ? SECF.find(x => x[0] === R.vis.sec)[1] : 'de l’estil', 'sec'); row('Ocultes', R.vis.hid ? HIDM.find(x => x[0] === R.vis.hid)[1] : 'de l’estil', 'hid');
    row('Línies', R.rep + (R.lk !== 1 ? ' × ' + R.lk : ''), 'rep'); row('Escala', '1:' + R.scale, 'scale'); s.appendChild(g); ins.appendChild(s);
    const s2 = el('section'), r2 = el('div', 'row2'); s2.appendChild(el('h5', '', 'Sortida directa'));
    for (const f of ['pdf', 'svg', 'dxf']) { const b = el('button', 'btn sm', f.toUpperCase()); b.dataset.pubx = f; b.onclick = () => { pubCompile(); const p = pubData().pubs.find(x => x.id === n.id); if (p) pubExportPub(p, f); }; r2.appendChild(b); } s2.appendChild(r2); ins.appendChild(s2);
  }
  const s = el('section'), r = el('div', 'row2'); s.appendChild(el('h5', '', 'Node'));
  if (n.t !== 'model') { const b = el('button', 'btn sm', 'Duplica'); b.onclick = () => gDup(); r.appendChild(b); const d = el('button', 'btn sm', 'Esborra'); d.onclick = () => gDel(); r.appendChild(d); }
  s.appendChild(r); ins.appendChild(s);
}
function gDel() {
  const g = GG(); let ids = [...GV.sel].filter(id => gN(id) && gN(id).t !== 'model');
  if (GV.wire != null && !ids.length) { pushUndo('Esborra cable'); g.wires.splice(GV.wire, 1); GV.wire = null; pubCompile(); pubDraw(); return true; }
  if (!ids.length) return false; pushUndo('Esborra node'); g.nodes = g.nodes.filter(n => !ids.includes(n.id)); g.wires = g.wires.filter(w => !ids.includes(w.a) && !ids.includes(w.b)); GV.sel.clear(); pubCompile(); pubDraw(); return true;
}
function gDup() {
  const g = GG(), ids = [...GV.sel].filter(id => gN(id) && gN(id).t !== 'model'); if (!ids.length) return; pushUndo('Duplica'); const map = {};
  for (const id of ids) { const n = gN(id), c = gAdd(n.t, n.x + 40, n.y + 40, JSON.parse(JSON.stringify(n.p))); if (c.p.name) c.p.name += ' (còpia)'; map[id] = c.id; }
  for (const w of g.wires.slice()) if (map[w.b]) g.wires.push({ a: map[w.a] || w.a, b: map[w.b], bp: w.bp });
  GV.sel = new Set(Object.values(map)); pubCompile(); pubDraw();
}
/* menú d'afegir (clic dret / cable deixat al buit) */
function gMenu(cv, sx, sy, wx, wy, fromOut) {
  const old = cv.querySelector('.gc-menu'); if (old) old.remove(); const m = el('div', 'gc-menu'); m.style.left = sx + 'px'; m.style.top = sy + 'px'; m.onmousedown = e => e.stopPropagation();
  const ot = fromOut ? NT[gN(fromOut).t].out : null, inp = el('input'); inp.placeholder = ot ? 'Afegeix node que accepti «' + ot + '»' : 'Afegeix node…'; m.appendChild(inp); const list = el('div'); list.style.cssText = 'padding:0;display:block;max-height:280px;overflow:auto'; m.appendChild(list);
  const types = Object.keys(NT).filter(t => t !== 'model' && gSpOk(t) && (!ot || NT[t].ins.some(q => q[2].includes(ot))));
  const add = t => { pushUndo('Afegeix node'); const n = gAdd(t, Math.round(wx / 8) * 8, Math.round(wy / 8) * 8); if (t === 'base' || t === 'branch') { const mm = GG().nodes.find(x => x.t === 'model'); if (mm && !fromOut) gLink(mm.id, n.id, 'm'); }
    if (fromOut) { const q = NT[t].ins.find(q => q[2].includes(ot)); gLink(fromOut, n.id, q[0]); } m.remove(); GV.sel = new Set([n.id]); pubCompile(); pubDraw(); };
  const fill = () => { list.innerHTML = ''; const q = inp.value.toLowerCase(); types.filter(t => NT[t].name.toLowerCase().includes(q)).forEach((t, i) => { const r = el('div', i ? '' : 'k'); r.style.setProperty('--c', NCAT[NT[t].cat][1]); r.innerHTML = '<i>' + NT[t].ico + '</i>' + esc(NT[t].name); r.dataset.add = t; r.onclick = () => add(t); list.appendChild(r); }); };
  inp.oninput = fill; inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { const f = list.querySelector('[data-add]'); if (f) add(f.dataset.add); } if (e.key === 'Escape') m.remove(); }; fill(); cv.appendChild(m); setTimeout(() => inp.focus(), 0);
}
function pubDraw() {
  const w = $('pubWin'); if (!w) return; const P = pubData(), g = GG(); pubCompile(); w.innerHTML = ''; const V = GV.view;
  const top = el('div', 'gc-top'); top.innerHTML = '<h2>Taller</h2>'; w.appendChild(top);
  const tabs = el('nav', 'gc-tabs'); tabs.setAttribute('aria-label', 'Espais del Taller'); for (const [k, [lab, col]] of Object.entries(GSP)) { const b = el('button', 'gc-tab' + (GV.sp === k ? ' on' : ''), ''); b.dataset.sp = k; b.style.setProperty('--c', col); b.setAttribute('aria-current', GV.sp === k ? 'page' : 'false'); b.innerHTML = '<i></i>' + lab + '<small>' + g.nodes.filter(n => gSp(n.t) === k && n.t !== 'model' && n.t !== 'branch').length + '</small>'; b.onclick = () => gSpGo(k); tabs.appendChild(b); } top.appendChild(tabs); top.appendChild(el('span', 'sp'));
  const cl = el('button', 'btn sm', 'Tanca'); cl.id = 'pubClose'; cl.onclick = pubClose; top.appendChild(cl);
  const body = el('div', 'gc-body'); w.appendChild(body);
  /* paleta */
  const pal = el('div', 'gc-pal'); body.appendChild(pal); if (GSP[GV.sp]) { const q = el('p', 'gc-q', GSP[GV.sp][2]); q.style.setProperty('--c', GSP[GV.sp][1]); pal.appendChild(q); }
  for (const cat of Object.keys(NCAT)) { const ts = Object.keys(NT).filter(t => NT[t].cat === cat && t !== 'model' && gSpOk(t)); if (!ts.length) continue; pal.appendChild(el('h4', '', NCAT[cat][0])); for (const t of ts) { const it = el('div', 'gc-it'); it.style.setProperty('--c', NCAT[cat][1]); it.innerHTML = '<i>' + NT[t].ico + '</i>' + esc(NT[t].name); it.dataset.pal = t; it.draggable = true; it.ondragstart = e => e.dataTransfer.setData('text/gc', t);
    it.onclick = () => { const cvr = cv.getBoundingClientRect(); pushUndo('Afegeix node'); const n = gAdd(t, Math.round(((cvr.width / 2 - V.x) / V.z - 132) / 8) * 8, Math.round(((cvr.height / 2 - V.y) / V.z - 60) / 8) * 8); if (t === 'base' || t === 'branch') { const mm = g.nodes.find(x => x.t === 'model'); if (mm) gLink(mm.id, n.id, 'm'); } GV.sel = new Set([n.id]); pubDraw(); }; pal.appendChild(it); } }
  const lay = el('button', 'btn sm', 'Ordena el graf'); lay.id = 'gcLay'; lay.style.cssText = 'width:100%;margin-top:16px'; lay.onclick = () => { pushUndo('Ordena'); gLayout(true); GV.fitted = false; pubDraw(); }; pal.appendChild(lay);
  /* llenç */
  const cv = el('div', 'gc-cv'); cv.id = 'gcCv'; cv.tabIndex = 0; body.appendChild(cv); const world = el('div', 'gc-world'); cv.appendChild(world);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'gc-wires'); world.appendChild(svg);
  const vis = g.nodes.filter(n => gSpOk(n.t) && gVis(n)), nodeEls = {}; for (const n of vis) { const d = gNodeEl(n, P); nodeEls[n.id] = d; world.appendChild(d); }
  const portPt = (id, port) => { const n = gN(id), d = nodeEls[id]; if (port == null) return { x: n.x + ((d && d.offsetWidth) || 264) + 1, y: n.y + 44 + 6.5 }; const i = NT[n.t].ins.findIndex(q => q[0] === port); return { x: n.x - 1, y: n.y + 44 + i * 22 + 6.5 }; };
  const path = (a, b) => { const dx = Math.max(50, Math.abs(b.x - a.x) * 0.45); return 'M' + a.x + ' ' + a.y + 'C' + (a.x + dx) + ' ' + a.y + ' ' + (b.x - dx) + ' ' + b.y + ' ' + b.x + ' ' + b.y; };
  const drawW = () => { svg.innerHTML = ''; g.wires.forEach((wr, i) => { const A = gN(wr.a); if (!A || !nodeEls[wr.a] || !nodeEls[wr.b]) return; const d = path(portPt(wr.a), portPt(wr.b, wr.bp)), cfg = NT[A.t].out === 'title' || NT[A.t].out === 'model';
    for (const hit of [1, 0]) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); p.setAttribute('class', 'gc-w' + (hit ? ' hit' : '') + (cfg && !hit ? ' cfg' : '') + (GV.wire === i && !hit ? ' sel' : '')); if (hit) p.dataset.wire = i; svg.appendChild(p); } }); };
  drawW();
  const bar = el('div', 'gc-bar'); cv.appendChild(bar); const zl = el('button', 'btn sm');
  const apply = () => { world.style.transform = 'translate(' + V.x + 'px,' + V.y + 'px) scale(' + V.z + ')'; cv.style.backgroundSize = 24 * V.z + 'px ' + 24 * V.z + 'px'; cv.style.backgroundPosition = V.x + 'px ' + V.y + 'px'; zl.textContent = Math.round(V.z * 100) + '%'; world.classList.toggle('cmp', V.z < 0.55); mmDraw(); };
  const zoomTo = (z, cx, cy) => { z = Math.max(0.2, Math.min(2, z)); cx = cx ?? cv.clientWidth / 2; cy = cy ?? cv.clientHeight / 2; V.x = cx - (cx - V.x) * z / V.z; V.y = cy - (cy - V.y) * z / V.z; V.z = z; apply(); };
  const bbox = () => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const n of vis) { const h = nodeEls[n.id].offsetHeight || 160; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + 264); y1 = Math.max(y1, n.y + h); } return [x0, y0, x1, y1]; };
  const fit = () => { if (!vis.length || !cv.clientWidth) return; const [x0, y0, x1, y1] = bbox(), z = Math.max(0.2, Math.min(1, Math.min((cv.clientWidth - 80) / (x1 - x0), (cv.clientHeight - 80) / (y1 - y0)))); V.z = z; V.x = 40 - x0 * z + Math.max(0, (cv.clientWidth - 80 - (x1 - x0) * z) / 2); V.y = 40 - y0 * z; apply(); };
  const mkb = (t, f, ti, b) => { b = b || el('button', 'btn sm'); b.textContent = t; b.title = ti; b.onmousedown = e => e.stopPropagation(); b.onclick = f; bar.appendChild(b); return b; };
  mkb('−', () => zoomTo(V.z / 1.2), 'Allunya'); mkb('100%', () => zoomTo(1), 'Zoom 100 %', zl); mkb('+', () => zoomTo(V.z * 1.2), 'Acosta'); mkb('Ajusta', fit, 'Ajusta (F)');
  const mm = el('canvas', 'gc-mm'); mm.width = 380; mm.height = 232; cv.appendChild(mm);
  function mmDraw() { const c = mm.getContext('2d'); c.clearRect(0, 0, 380, 232); if (!vis.length) return; const [x0, y0, x1, y1] = bbox(), k = Math.min(340 / (x1 - x0 || 1), 200 / (y1 - y0 || 1)), ox = 20 - x0 * k, oy = 16 - y0 * k; mm._t = [k, ox, oy];
    for (const n of vis) { c.fillStyle = GV.sel.has(n.id) ? '#D6FB41' : NCAT[NT[n.t].cat][1]; c.globalAlpha = GV.sel.has(n.id) ? 1 : 0.55; c.fillRect(ox + n.x * k, oy + n.y * k, 264 * k, (nodeEls[n.id].offsetHeight || 160) * k); }
    c.globalAlpha = 1; c.strokeStyle = '#E7EAEE'; c.lineWidth = 2; c.strokeRect(ox + (-V.x / V.z) * k, oy + (-V.y / V.z) * k, cv.clientWidth / V.z * k, cv.clientHeight / V.z * k); }
  mm.onmousedown = e => { e.stopPropagation(); const r = mm.getBoundingClientRect(), [k, ox, oy] = mm._t || [1, 0, 0], wx = ((e.clientX - r.left) * 2 - ox) / k, wy = ((e.clientY - r.top) * 2 - oy) / k; V.x = cv.clientWidth / 2 - wx * V.z; V.y = cv.clientHeight / 2 - wy * V.z; apply(); };
  if (!vis.some(n => n.t !== 'model')) { const h = el('div', 'gc-hint', { dades: 'Comença: afegeix un Selector per triar elements, o les Dades del projecte i els Tècnics.', planols: 'Comença: afegeix un Plànol i un Full; tria les vistes a l’inspector del plànol.', vistes: 'Comença: afegeix una Vista de treball des de la paleta, o fes ⧉ sobre una vista al Navegador del model.' }[GV.sp] || ''); cv.appendChild(h); }
  gXSpace(world, vis, nodeEls);
  /* inspector */
  const ins = el('div', 'gc-ins'); ins.id = 'gcIns'; body.appendChild(ins); gInspector(ins, P);
  apply();
  const doFit = () => { if (GV.focus != null && gN(GV.focus)) { const n = gN(GV.focus); V.z = Math.max(V.z, 0.7); V.x = cv.clientWidth / 2 - (n.x + 132) * V.z; V.y = cv.clientHeight / 2 - (n.y + 90) * V.z; apply(); GV.focus = null; GV.fitted = true; } else if (!GV.fitted) { GV.fitted = true; V.f = 1; fit(); if (V.z < 0.62) { const [x0, y0] = bbox(); V.z = 0.62; V.x = 40 - x0 * V.z; V.y = 40 - y0 * V.z; apply(); } } };
  if (cv.clientWidth) doFit(); else requestAnimationFrame(doFit);
  /* interacció */
  const wpt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - V.x) / V.z, y: (e.clientY - r.top - V.y) / V.z }; };
  let drag = null;
  const compat = outId => { const ot = NT[gN(outId).t].out; for (const u of world.querySelectorAll('u[data-in]')) { const n = gN(+u.dataset.in), q = NT[n.t].ins.find(q => q[0] === u.dataset.port); const ok = q[2].includes(ot) && n.id !== outId && !gUp(outId).has(n.id); u.classList.toggle('ok', ok); u.classList.toggle('no', !ok); } };
  const move = e => {
    if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.k === 'pan') { V.x = drag.ox + dx; V.y = drag.oy + dy; apply(); }
    else if (drag.k === 'node') { for (const [id, o] of drag.start) { const n = gN(id); n.x = Math.round((o[0] + dx / V.z) / 8) * 8; n.y = Math.round((o[1] + dy / V.z) / 8) * 8; nodeEls[id].style.left = n.x + 'px'; nodeEls[id].style.top = n.y + 'px'; } drawW(); }
    else if (drag.k === 'wire') drag.tmp.setAttribute('d', path(drag.a, wpt(e)));
  };
  const up = e => {
    document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); cv.classList.remove('pan'); const d = drag; drag = null; if (!d) return;
    if (d.k === 'wire') { d.tmp.remove(); const t = document.elementFromPoint(e.clientX, e.clientY), u = t && t.closest && t.closest('u[data-in]');
      if (u) { const b = +u.dataset.in; if (!(gN(b) && NT[gN(b).t].ins.find(q => q[0] === u.dataset.port)[2].includes(NT[gN(d.out).t].out))) { toast('Tipus incompatibles: ' + NT[gN(d.out).t].out + ' no entra a «' + u.title + '».'); pubDraw(); return; } pushUndo('Connecta'); if (!gLink(d.out, b, u.dataset.port)) { S.undo.pop(); toast('Aquesta connexió crearia un cicle o ja existeix.'); } pubCompile(); pubDraw(); }
      else if (t && t.closest && t.closest('.gc-cv') && !t.closest('.gc-n')) { const r = cv.getBoundingClientRect(), p = wpt(e); for (const q of world.querySelectorAll('u.ok,u.no')) q.classList.remove('ok', 'no'); gMenu(cv, e.clientX - r.left, e.clientY - r.top, p.x, p.y - 44, d.out); }
      else for (const q of world.querySelectorAll('u.ok,u.no')) q.classList.remove('ok', 'no');
      return; }
    if (d.k === 'node' && !d.moved) { if (!d.add) GV.sel = new Set([d.id]); GV.wire = null; pubDraw(); return; }
    if (d.k === 'node' && d.moved) { mmDraw(); return; }
    if (d.k === 'pan' && !d.moved) { GV.sel.clear(); GV.wire = null; pubDraw(); }
  };
  cv.addEventListener('mousedown', e => {
    const mnu = cv.querySelector('.gc-menu'); if (mnu) mnu.remove(); if (e.button !== 0) return; if (e.target.closest('.gc-bar,.gc-mm')) return; cv.focus();
    const uo = e.target.closest('u[data-out]'), ui = e.target.closest('u[data-in]'), nd = e.target.closest('.gc-n'), wr = e.target.closest('[data-wire]');
    if (uo) { e.preventDefault(); const id = +uo.dataset.out, tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmp.setAttribute('class', 'gc-w tmp'); svg.appendChild(tmp); const a = portPt(id); tmp.setAttribute('d', path(a, wpt(e))); compat(id); drag = { k: 'wire', out: id, a, tmp, sx: e.clientX, sy: e.clientY }; }
    else if (ui) { /* arrossegar des d'una entrada connectada: desconnecta i torna a portar el cable */ const b = +ui.dataset.in, idx = g.wires.findIndex(w => w.b === b && w.bp === ui.dataset.port && !NT[gN(b).t].ins.find(q => q[0] === w.bp)[3]); if (idx < 0) return; e.preventDefault(); pushUndo('Desconnecta'); const wr2 = g.wires.splice(idx, 1)[0]; drawW(); const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmp.setAttribute('class', 'gc-w tmp'); svg.appendChild(tmp); const a = portPt(wr2.a); tmp.setAttribute('d', path(a, wpt(e))); compat(wr2.a); drag = { k: 'wire', out: wr2.a, a, tmp, sx: e.clientX, sy: e.clientY }; }
    else if (nd) { if (e.target.closest('input,select,button,textarea')) return; const id = +nd.dataset.node; e.preventDefault(); if (e.shiftKey) { GV.sel.has(id) ? GV.sel.delete(id) : GV.sel.add(id); nd.classList.toggle('sel'); } else if (!GV.sel.has(id)) { GV.sel = new Set([id]); for (const q of world.querySelectorAll('.gc-n.sel')) q.classList.remove('sel'); nd.classList.add('sel'); }
      drag = { k: 'node', id, add: e.shiftKey, start: [...GV.sel].map(i => [i, [gN(i).x, gN(i).y]]), sx: e.clientX, sy: e.clientY }; if (!e.shiftKey && GV.sel.size === 1) gInspector(ins, P); }
    else if (wr) { GV.wire = +wr.dataset.wire; GV.sel.clear(); drawW(); gInspector(ins, P); return; }
    else { drag = { k: 'pan', sx: e.clientX, sy: e.clientY, ox: V.x, oy: V.y }; cv.classList.add('pan'); }
    if (drag) { document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }
  });
  cv.addEventListener('wheel', e => { if (e.target.closest('.gc-menu')) return; e.preventDefault(); const r = cv.getBoundingClientRect(); zoomTo(V.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  cv.addEventListener('contextmenu', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), p = wpt(e); gMenu(cv, e.clientX - r.left, e.clientY - r.top, p.x, p.y, null); });
  cv.addEventListener('dragover', e => e.preventDefault());
  cv.addEventListener('drop', e => { const t = e.dataTransfer.getData('text/gc'); if (!NT[t]) return; e.preventDefault(); const p = wpt(e); pushUndo('Afegeix node'); const n = gAdd(t, Math.round((p.x - 132) / 8) * 8, Math.round((p.y - 20) / 8) * 8); if (t === 'base' || t === 'branch') { const mm2 = g.nodes.find(x => x.t === 'model'); if (mm2) gLink(mm2.id, n.id, 'm'); } GV.sel = new Set([n.id]); pubDraw(); });
  GV.fitFn = fit;
}
document.addEventListener('keydown', e => {
  if (!$('pubWin') || $('gcTb') || $('gcSheet')) return; if (/INPUT|SELECT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { if (gDel()) { e.preventDefault(); e.stopImmediatePropagation(); } }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); e.stopImmediatePropagation(); gDup(); }
  else if (e.key === 'f' || e.key === 'F') { if (GV.fitFn) { e.preventDefault(); e.stopImmediatePropagation(); GV.fitFn(); } }
  else if (e.key === 'Escape') { if (GV.sel.size || GV.wire != null) { GV.sel.clear(); GV.wire = null; pubDraw(); } else pubClose(); e.stopImmediatePropagation(); }
}, true);
document.addEventListener('keydown', e => { if ($('pubWin') && (e.ctrlKey || e.metaKey) && /^[zy]$/i.test(e.key)) setTimeout(() => { if ($('pubWin')) pubDraw(); }, 0); });

/* ============================================================
   v0.48.0 · arbre del model en nodes (branques = submodels),
   edició per arrossegament, Psets, editor de làmina, caràtula amb logo
   ============================================================ */
const topGroups = () => [...S.model.root.groups.values()];
function gMat(g) { for (const f of g.faces.values()) if (f.mat != null) return f.mat; for (const s of g.groups.values()) { const m = gMat(s); if (m != null) return m; } return null; }
function gSetMat(g, m) { for (const f of g.faces.values()) f.mat = m; for (const s of g.groups.values()) gSetMat(s, m); }
const GDIM = {
  ifc: ['Classe IFC', g => g.ifc || '-', v => v === '-' ? 'Esbós (sense classe)' : (IFC.find(c => c[0] === v) || [0, v])[1], () => [['-', 'Esbós (sense classe)'], ...IFC.map(c => [c[0], c[1]])]],
  level: ['Nivell', g => g.level == null ? '-' : String(g.level), v => v === '-' ? 'Sense nivell' : (S.model.levels.find(l => String(l.id) === v) || { name: 'Nivell ' + v }).name, () => [['-', 'Sense nivell'], ...S.model.levels.map(l => [String(l.id), l.name])]],
  tag: ['Etiqueta', g => String(g.tag || 0), v => tagName(+v), () => S.model.tags.map(t => [String(t.id), t.name])],
  mat: ['Material', g => { const m = gMat(g); return m == null ? '-' : String(m); }, v => v === '-' ? 'Sense material' : ((S.model.materials[+v] || {}).name || 'Material ' + v), () => [['-', 'Sense material'], ...S.model.materials.map((m, i) => [String(i), m.name || 'Material ' + i])]],
};
function gPreds(id) { const pr = []; let n = gN(id), k = 0; while (n && n.t === 'branch' && k++ < 20) { pr.unshift([n.p.dim, n.p.val]); n = gIn(n.id, 'm')[0]; } return pr; }
function gBranchEls(id) { const pr = gPreds(id); return topGroups().filter(g => pr.every(([d, v]) => GDIM[d] && GDIM[d][1](g) === v)); }
const GAREA = { k: -1, m: new Map() };
function gArea(id) {
  if (GAREA.k !== S.undo.length) { GAREA.k = S.undo.length; GAREA.m.clear(); const sv = S.pubOnly; S.pubOnly = null; let els; try { els = collectScene(); } finally { S.pubOnly = sv; }
    for (const e of els) { let a = 0; for (const f of e.faces) { const o = f.o; let x = 0, y = 0, z = 0; for (let i = 0; i < o.length; i++) { const p = o[i], q = o[(i + 1) % o.length]; x += (p[1] - q[1]) * (p[2] + q[2]); y += (p[2] - q[2]) * (p[0] + q[0]); z += (p[0] - q[0]) * (p[1] + q[1]); } a += Math.hypot(x, y, z) / 2; } GAREA.m.set(e.id, (GAREA.m.get(e.id) || 0) + a); } }
  return GAREA.m.get(id) || 0;
}
/* visibilitat de les branques al llenç */
function gUsed(n) { return GG().wires.some(w => w.a === n.id && (gN(w.b) && (gN(w.b).t !== 'branch' || gUsed(gN(w.b))))); }
function gVis(n) {
  if (n.t !== 'branch') return true; let p = gIn(n.id, 'm')[0], k = 0;
  while (p && p.t === 'branch' && k++ < 20) { if (p.p.fold) return gUsed(n); p = gIn(p.id, 'm')[0]; }
  return !p || p.p.tree || gUsed(n);
}
/* (re)construeix l'arbre a partir del criteri del node Model */
function gTreeBuild(m) {
  const g = GG(), dims = (m.p.by || 'ifc').split('>'), groups = topGroups(), want = [];
  const rec = (pre, lvl, els, parentKey) => { if (lvl >= dims.length) return; const d = dims[lvl], vals = [...new Set(els.map(GDIM[d][1]))].sort((a, b) => GDIM[d][2](a).localeCompare(GDIM[d][2](b)));
    for (const v of vals) { const key = parentKey + '/' + d + '=' + v; want.push({ key, parentKey, d, v, depth: lvl + 1 }); rec(pre, lvl + 1, els.filter(e => GDIM[d][1](e) === v), key); } };
  rec([], 0, groups, '#' + m.id);
  const old = new Map(g.nodes.filter(n => n.t === 'branch' && (n.p.key || '').startsWith('#' + m.id + '/')).map(n => [n.p.key, n])), keep = new Set(want.map(w => w.key));
  for (const [k, n] of old) if (!keep.has(k)) { g.nodes = g.nodes.filter(x => x !== n); g.wires = g.wires.filter(w => w.a !== n.id && w.b !== n.id); }
  const maxY = Math.max(0, ...g.nodes.filter(n => n.t !== 'branch' && n !== m).map(n => n.y + 300)), byKey = {};
  let row = 0; const y0 = Math.max(maxY, m.y + 180);
  for (const w of want) { let n = old.get(w.key); if (!n) n = gAdd('branch', 0, 0, { dim: w.d, val: w.v, key: w.key }); byKey[w.key] = n; n.x = m.x + w.depth * 300; n.y = y0 + row * 170; n.placed = 1; if (w.depth === dims.length) row++; else if (want.find(x => x.parentKey === w.key)) { /* el primer fill comparteix fila */ } else row++;
    const par = w.parentKey === '#' + m.id ? m : byKey[w.parentKey]; g.wires = g.wires.filter(x => !(x.b === n.id && x.bp === 'm')); g.wires.push({ a: par.id, b: n.id, bp: 'm' }); }
  m.p.tree = true;
}
/* assigna (o copia) elements a una branca: aplica tots els predicats del camí */
function gAssign(ids, branchId, copy) {
  const pr = gPreds(branchId), root = S.model.root; let made = 0;
  for (const id of ids) {
    let g = root.groups.get(id); if (!g) continue;
    if (copy) { const lv = pr.find(p => p[0] === 'level'), ol = S.model.levels.find(l => l.id === g.level), nl = lv && lv[1] !== '-' ? S.model.levels.find(l => String(l.id) === lv[1]) : null, dz = ol && nl ? nl.elev - ol.elev : 0;
      const c = K.cloneGroup(S.model, g); c.t = V.add(g.t, [0, 0, dz]); c.name = g.name; root.groups.set(c.id, c); g = c; made++; }
    for (const [d, v] of pr) { if (d === 'ifc') g.ifc = v === '-' ? null : v; else if (d === 'level') g.level = v === '-' ? null : +v; else if (d === 'tag') g.tag = +v; else if (d === 'mat') gSetMat(g, v === '-' ? null : +v); }
  }
  return made;
}
const gVal = s => { const t = String(s).trim(); if (t === 'true' || t === 'cert') return true; if (t === 'false' || t === 'fals') return false; if (t !== '' && !isNaN(+t.replace(',', '.'))) return +t.replace(',', '.'); return t; };
const gPeek = (c, id) => c.groups.get(id);
function gDropZone(d, n) {
  d.addEventListener('dragover', e => { if ([...e.dataTransfer.types].some(t => t === 'text/gel' || t === 'text/gbr')) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = e.altKey || e.ctrlKey ? 'copy' : 'move'; d.classList.add('drop'); } });
  d.addEventListener('dragleave', () => d.classList.remove('drop'));
  d.addEventListener('drop', e => { d.classList.remove('drop'); const el1 = e.dataTransfer.getData('text/gel'), br = e.dataTransfer.getData('text/gbr'); if (!el1 && !br) return; e.preventDefault(); e.stopPropagation();
    const ids = el1 ? el1.split(',').map(Number) : gBranchEls(+br).map(g => g.id); if (br && +br === n.id) return; const copy = e.altKey || e.ctrlKey;
    pushUndo(copy ? 'Copia elements' : 'Reassigna elements'); const k = gAssign(ids, n.id, copy); regenPar(); refreshAll(); toast((copy ? k + ' element(s) copiats a ' : ids.length + ' element(s) passen a ') + gLabel(n) + '.'); pubDraw(); });
}
const gLabel = n => gPreds(n.id).map(([d, v]) => GDIM[d][2](v)).join(' › ');
const GX = {
  model(n, b) {
    const r = el('div', 'row2'); r.style.cssText = 'display:flex;gap:6px';
    const t = el('button', 'btn sm', n.p.tree ? 'Plega l’arbre' : 'Desplega l’arbre'); t.dataset.tree = n.id; t.onmousedown = e => e.stopPropagation();
    t.onclick = () => { pushUndo('Arbre del model'); if (n.p.tree) n.p.tree = false; else gTreeBuild(n); GV.fitted = false; pubDraw(); }; r.appendChild(t);
    if (n.p.tree) { const u = el('button', 'btn sm', 'Actualitza'); u.onmousedown = e => e.stopPropagation(); u.onclick = () => { pushUndo('Arbre del model'); gTreeBuild(n); pubDraw(); }; r.appendChild(u); } b.appendChild(r);
  },
  branch(n, b, d) {
    const els = gBranchEls(n.id), a = els.reduce((s, g) => s + gArea(g.id), 0), kids = GG().wires.filter(w => w.a === n.id && gN(w.b) && gN(w.b).t === 'branch').length;
    d.querySelector('.gc-h b').textContent = GDIM[n.p.dim][2](n.p.val);
    const h = d.querySelector('.gc-h'), hd = el('span', 'gc-grip', '⠿'); hd.title = 'Arrossega la branca sobre una altra per reassignar-ne els elements (Alt/Ctrl: copia)'; hd.draggable = true; hd.onmousedown = e => e.stopPropagation(); hd.ondragstart = e => { e.dataTransfer.setData('text/gbr', String(n.id)); e.dataTransfer.effectAllowed = 'copyMove'; }; h.insertBefore(hd, h.firstChild);
    if (kids) { const f = el('span', 'gc-fold', n.p.fold ? '▸' : '▾'); f.title = n.p.fold ? 'Desplega' : 'Plega'; f.onmousedown = e => e.stopPropagation(); f.onclick = () => { n.p.fold = !n.p.fold; pubDraw(); }; h.appendChild(f); }
    const s = el('div', 'gc-sum'); s.innerHTML = '<em>' + els.length + '</em> elements · ' + fmt(a) + ' m² de cares · ' + esc(GDIM[n.p.dim][0]); b.appendChild(s);
    const ul = el('div', 'gc-els'); for (const g of els.slice(0, 6)) { const r = el('div', 'gc-el' + (GV.elem === g.id ? ' on' : '')); r.draggable = true; r.dataset.gel = g.id; r.innerHTML = '<span>' + esc(g.name || 'Grup ' + g.id) + '</span><small>' + esc((g.ifc || 'esbós').replace(/^Ifc/, '')) + '</small>';
      r.onmousedown = e => e.stopPropagation(); r.ondragstart = e => { e.dataTransfer.setData('text/gel', String(g.id)); e.dataTransfer.effectAllowed = 'copyMove'; }; r.onclick = () => { GV.sel = new Set([n.id]); GV.elem = g.id; pubDraw(); }; ul.appendChild(r); }
    if (els.length > 6) ul.appendChild(el('div', 'gc-more', '+ ' + (els.length - 6) + ' més a l’inspector')); b.appendChild(ul); gDropZone(d, n);
  },
  sheet(n, b) { const e = el('button', 'btn sm', 'Edita la làmina'); e.dataset.shedit = n.id; e.onmousedown = ev => ev.stopPropagation(); e.onclick = () => gSheetEdit(n.id); b.appendChild(e); },
};
function gPsetEditor(sec, g) {
  const ps = g.psets || {}, wrap = el('div', 'gc-ps');
  for (const pn of Object.keys(ps)) {
    const box = el('div', 'gc-psb'), hd = el('div', 'gc-psh'); hd.innerHTML = '<b>' + esc(pn) + '</b>'; const dl = el('button', 'btn sm', '✕'); dl.title = 'Esborra el Pset'; dl.onclick = () => { pushUndo('Pset'); delete g.psets[pn]; pubDraw(); }; hd.appendChild(dl); box.appendChild(hd);
    for (const k of Object.keys(ps[pn])) { const r = el('div', 'gc-psr'), kk = el('input'), vv = el('input'), x = el('button', 'btn sm', '✕'); kk.value = k; vv.value = String(ps[pn][k]); vv.dataset.psv = pn + '.' + k;
      kk.onchange = () => { pushUndo('Pset'); const v = ps[pn][k]; delete ps[pn][k]; if (kk.value.trim()) ps[pn][kk.value.trim()] = v; pubDraw(); }; vv.onchange = () => { pushUndo('Pset'); ps[pn][k] = gVal(vv.value); }; x.onclick = () => { pushUndo('Pset'); delete ps[pn][k]; pubDraw(); };
      r.appendChild(kk); r.appendChild(vv); r.appendChild(x); box.appendChild(r); }
    const ad = el('button', 'btn sm', '+ Propietat'); ad.onclick = () => { pushUndo('Pset'); let k = 'Propietat', i = 2; while (k in ps[pn]) k = 'Propietat ' + i++; ps[pn][k] = ''; pubDraw(); }; box.appendChild(ad); wrap.appendChild(box);
  }
  const nr = el('div', 'gc-psr'), ni = el('input'), nb = el('button', 'btn sm', '+ Pset'); ni.placeholder = 'Pset_WallCommon, Pset_Projecte…'; ni.id = 'gcNewPset';
  nb.onclick = () => { const v = ni.value.trim(); if (!v) return; pushUndo('Pset'); g.psets = g.psets || {}; g.psets[v] = g.psets[v] || {}; pubDraw(); }; nr.appendChild(ni); nr.appendChild(nb); wrap.appendChild(nr); sec.appendChild(wrap);
}
const GI = {
  branch(n, ins, re) {
    const els = gBranchEls(n.id), g = els.find(x => x.id === GV.elem);
    const s0 = el('section'); s0.appendChild(el('h5', '', gLabel(n))); s0.appendChild(el('div', 'gc-sum', 'Aquesta branca és un submodel: connecta’n la sortida a una Vista de treball o a una exportació. Arrossega-hi elements (⠿ o files) per reassignar-los; amb Alt o Ctrl, es copien' + (gPreds(n.id).some(p => p[0] === 'level') ? ' al nivell (es desplacen a la seva cota).' : '.')));
    const sb = el('button', 'btn sm', 'Selecciona al model'); sb.onclick = () => { S.ctx = []; clearSel(); for (const x of els) S.sel.groups.add(x.id); refreshSel(); toast(els.length + ' element(s) seleccionats.'); }; s0.appendChild(sb); ins.appendChild(s0);
    if (g) {
      const s = el('section'); s.appendChild(el('h5', '', 'Element · ' + (g.name || 'Grup ' + g.id)));
      const nm = el('div', 'gc-f'), ni = el('input'); nm.appendChild(el('label', '', 'Nom')); ni.value = g.name || ''; ni.dataset.ef = 'name'; ni.onchange = () => { pushUndo('Nom'); g.name = ni.value; refreshAll(); pubDraw(); }; nm.appendChild(ni); s.appendChild(nm);
      for (const d of Object.keys(GDIM)) { const r = el('div', 'gc-f'), sl = el('select'); r.appendChild(el('label', '', GDIM[d][0])); sl.dataset.ef = d; for (const [v, t] of GDIM[d][3]()) { const o = el('option'); o.value = v; o.textContent = t; if (GDIM[d][1](g) === v) o.selected = true; sl.appendChild(o); }
        sl.onchange = () => { pushUndo('Propietat d’element'); const v = sl.value; if (d === 'ifc') g.ifc = v === '-' ? null : v; else if (d === 'level') g.level = v === '-' ? null : +v; else if (d === 'tag') g.tag = +v; else gSetMat(g, v === '-' ? null : +v); refreshAll(); pubDraw(); }; r.appendChild(sl); s.appendChild(r); }
      s.appendChild(el('h5', '', 'Psets')); gPsetEditor(s, g); ins.appendChild(s);
    }
    /* Pset massiu */
    const sp = el('section'); sp.appendChild(el('h5', '', 'Afegeix una propietat a tots (' + els.length + ')'));
    const f = el('div', 'gc-psr'), a = el('input'), k = el('input'), v = el('input'), go = el('button', 'btn sm acc', 'Aplica'); a.placeholder = 'Pset'; a.value = 'Pset_Projecte'; k.placeholder = 'Propietat'; v.placeholder = 'Valor'; a.id = 'gcBP'; k.id = 'gcBK'; v.id = 'gcBV'; go.id = 'gcBGo';
    go.onclick = () => { if (!a.value.trim() || !k.value.trim()) { toast('Cal el nom del Pset i de la propietat.'); return; } pushUndo('Pset massiu'); for (const x of els) { x.psets = x.psets || {}; const P2 = x.psets[a.value.trim()] = x.psets[a.value.trim()] || {}; P2[k.value.trim()] = gVal(v.value); } toast('Propietat aplicada a ' + els.length + ' element(s).'); pubDraw(); };
    f.appendChild(a); f.appendChild(k); f.appendChild(v); sp.appendChild(f); sp.appendChild(go);
    const cnt = {}; for (const x of els) for (const [pn, pv] of Object.entries(x.psets || {})) for (const kk of Object.keys(pv)) { const key = pn + ' · ' + kk; cnt[key] = (cnt[key] || 0) + 1; }
    if (Object.keys(cnt).length) { const t = el('div', 'gc-stk'); for (const [kk, c] of Object.entries(cnt)) { t.appendChild(el('span', '', kk)); t.appendChild(el('b', '', c + '/' + els.length)); t.appendChild(el('i', '', c === els.length ? 'tots' : 'parcial')); } sp.appendChild(t); }
    ins.appendChild(sp);
    const sl = el('section'); sl.appendChild(el('h5', '', 'Elements')); const ul = el('div', 'gc-els big');
    for (const x of els) { const r = el('div', 'gc-el' + (GV.elem === x.id ? ' on' : '')); r.draggable = true; r.dataset.iel = x.id; r.innerHTML = '<span>' + esc(x.name || 'Grup ' + x.id) + '</span><small>' + fmt(gArea(x.id)) + ' m²' + (x.psets ? ' · ' + Object.keys(x.psets).length + ' Pset' : '') + '</small>'; r.ondragstart = e => e.dataTransfer.setData('text/gel', String(x.id)); r.onclick = () => { GV.elem = x.id; pubDraw(); }; ul.appendChild(r); }
    sl.appendChild(ul); ins.appendChild(sl);
  },
  title(n, ins, re) {
    const s = el('section'); s.appendChild(el('h5', '', 'Logo')); if (n.p.logo) { const im = el('img'); im.src = n.p.logo.src; im.style.cssText = 'max-width:160px;max-height:60px;background:#fff;padding:4px;border-radius:4px;display:block;margin-bottom:6px'; s.appendChild(im); }
    const fi = el('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.id = 'gcLogo'; fi.onchange = () => { const f = fi.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); pushUndo('Logo'); n.p.logo = { src: c.toDataURL('image/jpeg', 0.88), w: c.width, h: c.height }; re(); }; im.src = rd.result; }; rd.readAsDataURL(f); };
    s.appendChild(fi); if (n.p.logo) { const x = el('button', 'btn sm', 'Treu el logo'); x.onclick = () => { pushUndo('Logo'); n.p.logo = null; re(); }; s.appendChild(x); } ins.appendChild(s);
  },
  sheet(n, ins) { const s = el('section'), b = el('button', 'btn sm acc', 'Edita la làmina…'); s.appendChild(el('h5', '', 'Composició')); s.appendChild(el('div', 'gc-sum', n.p.pos && Object.keys(n.p.pos).length ? 'Disposició manual de ' + Object.keys(n.p.pos).length + ' vista(es).' : 'Disposició automàtica en dues columnes.')); b.onclick = () => gSheetEdit(n.id); s.appendChild(b); ins.appendChild(s); },
};
/* ---------------- editor de làmina ---------------- */
function gSheetEdit(id) {
  pubCompile(); const n = gN(id), P = pubData(), sh = P.sheets.find(s => s.id === id); if (!sh || !sh.items.length) { toast('Connecta primer vistes publicables al plànol.'); return; }
  const d = pubSheetBuild(sh); if (!d) return; const cv = $('gcCv'); if (!cv) return; const old = $('gcSheet'); if (old) old.remove();
  const ov = el('div', 'gc-sheet'); ov.id = 'gcSheet'; cv.appendChild(ov); ov.onmousedown = e => e.stopPropagation(); ov.onwheel = e => e.stopPropagation();
  const bar = el('div', 'gc-shbar'); bar.innerHTML = '<b>' + esc(sh.name) + '</b><span>' + d.fmt + ' · ' + d.W + '×' + d.H + ' mm · arrossega les vistes; s’ajusten a 1 mm i s’alineen amb les altres</span>'; ov.appendChild(bar);
  const rs = el('button', 'btn sm', 'Disposició automàtica'); rs.id = 'gcShReset'; rs.onclick = () => { pushUndo('Làmina'); n.p.pos = null; pubCompile(); gSheetEdit(id); }; bar.appendChild(rs);
  const ok = el('button', 'btn sm acc', 'Fet'); ok.id = 'gcShDone'; ok.onclick = () => { ov.remove(); pubDraw(); }; bar.appendChild(ok);
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', (-8) + ' ' + (-8) + ' ' + (d.W + 16) + ' ' + (d.H + 16)); svg.setAttribute('class', 'gc-paper'); ov.appendChild(svg);
  const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; }, Y = (y, h) => d.H - y - (h || 0);
  const PA = sh.paper || { mg: 10, bind: 0 }, L0 = PA.mg + (PA.bind || 0); mk('rect', { x: 0, y: 0, width: d.W, height: d.H, fill: '#fff' }); mk('rect', { x: L0, y: PA.mg, width: d.W - PA.mg - L0, height: d.H - 2 * PA.mg, fill: 'none', stroke: '#000', 'stroke-width': 0.35 });
  let BR = null; if (sh.block) { BR = tbRect(sh.block, d.W, d.H, PA.mg, PA.bind); const g0 = mk('g', { transform: 'translate(' + BR.x + ',' + (d.H - BR.y - BR.h) + ') scale(1,' + BR.sy + ')' }); const Bs = { ...sh.block, h: sh.block.h }; g0.innerHTML = gBlockSVG(Bs, sh.block.data).replace(/^<svg[^>]*>|<\/svg>$/g, ''); }
  if (false) { const w = sh.tb.tpl === 'minim' ? 90 : 130; mk('rect', { x: d.W - 10 - w, y: d.H - 46, width: w, height: 36, fill: '#F4F6F8', stroke: '#000', 'stroke-width': 0.25 }); const t = mk('text', { x: d.W - 10 - w + 3, y: d.H - 26, 'font-size': 4, fill: '#333' }); t.textContent = (sh.tb.num || '') + '  ' + (sh.tb.title || sh.name); }
  const guides = mk('g', {}), items = d.place.map(pl => ({ ...pl }));
  for (const it of items) {
    const p = P.pubs.find(x => x.id === it.pid), one = docSheet([p], { scale: p.scale, hidden: true, fmt: null, title: p.name }), q = one.place[0];
    let sv = sheetSVG(one).replace(/viewBox="[^"]*"/, 'viewBox="' + q.x + ' ' + (one.H - q.y - q.h) + ' ' + q.w + ' ' + q.h + '" preserveAspectRatio="none"');
    const g = mk('g', { 'data-item': it.pid, style: 'cursor:move' }); it.g = g;
    const im = document.createElementNS(NS, 'image'); im.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sv)); im.setAttribute('width', it.w); im.setAttribute('height', it.h); g.appendChild(im);
    const fr = document.createElementNS(NS, 'rect'); fr.setAttribute('width', it.w); fr.setAttribute('height', it.h); fr.setAttribute('fill', 'transparent'); fr.setAttribute('stroke', '#7BA20F'); fr.setAttribute('stroke-width', 0.4); fr.setAttribute('stroke-dasharray', '2 1.4'); g.appendChild(fr);
    const tx = document.createElementNS(NS, 'text'); tx.setAttribute('y', it.h + 6.5); tx.setAttribute('font-size', 3.2); tx.textContent = (p.annx && p.annx.label ? p.annx.label : p.name) + '   E 1:' + p.scale; g.appendChild(tx);
    it.place = () => g.setAttribute('transform', 'translate(' + it.x + ',' + Y(it.y, it.h) + ')'); it.place();
  }
  let dr = null; const pt = e => { const m = svg.getScreenCTM().inverse(), q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m); return { x: q.x, y: d.H - q.y }; };
  svg.addEventListener('mousedown', e => { const g = e.target.closest('[data-item]'); if (!g) return; e.preventDefault(); const it = items.find(x => String(x.pid) === g.dataset.item), p0 = pt(e); pushUndo('Làmina'); dr = { it, p0, x0: it.x, y0: it.y }; });
  const mv = e => { if (!dr) return; const p = pt(e), it = dr.it; let x = Math.round(dr.x0 + p.x - dr.p0.x), y = Math.round(dr.y0 + p.y - dr.p0.y); guides.innerHTML = '';
    const tx = [L0 + 5, d.W - PA.mg - 5 - it.w], ty = [PA.mg + 5, d.H - PA.mg - 5 - it.h]; if (BR) { tx.push(BR.x - 5 - it.w, BR.x + BR.w + 5); ty.push(BR.y + BR.h + 5); }
    for (const o of items) if (o !== it) { tx.push(o.x, o.x + o.w - it.w, o.x + (o.w - it.w) / 2); ty.push(o.y, o.y + o.h - it.h, o.y + (o.h - it.h) / 2); }
    const sn = (v, arr) => { let best = null; for (const a of arr) if (Math.abs(a - v) <= 2.5 && (best == null || Math.abs(a - v) < Math.abs(best - v))) best = a; return best; };
    const sx = sn(x, tx), sy = sn(y, ty); if (sx != null) { x = sx; const l = document.createElementNS(NS, 'line'); for (const [k, v] of Object.entries({ x1: x, y1: 0, x2: x, y2: d.H, stroke: '#9BC21A', 'stroke-width': 0.35 })) l.setAttribute(k, v); guides.appendChild(l); }
    if (sy != null) { y = sy; const l = document.createElementNS(NS, 'line'); for (const [k, v] of Object.entries({ x1: 0, y1: Y(y), x2: d.W, y2: Y(y), stroke: '#9BC21A', 'stroke-width': 0.35 })) l.setAttribute(k, v); guides.appendChild(l); }
    it.x = x; it.y = y; it.place(); };
  const upf = () => { if (!dr) return; const it = dr.it; dr = null; guides.innerHTML = '';
    if (BR && it.x < BR.x + BR.w && it.x + it.w > BR.x && it.y < BR.y + BR.h && it.y + it.h > BR.y) { const up = BR.y + BR.h + 10; if (up + it.h <= d.H - PA.mg) it.y = up; else it.x = /l/.test(sh.block.anchor) ? BR.x + BR.w + 5 : BR.x - it.w - 5; it.place(); toast('La vista no pot quedar sobre la caràtula: s’ha desplaçat.'); } n.p.pos = n.p.pos || {}; for (const it of items) n.p.pos[it.pid] = [it.x, it.y]; pubCompile(); };
  ov.addEventListener('mousemove', mv); ov.addEventListener('mouseup', upf); ov.addEventListener('mouseleave', upf);
}
(function () { const st = document.createElement('style'); st.textContent = `
.gc-n.drop{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}.gc-grip{cursor:grab;color:var(--dim);font-size:13px}.gc-fold{cursor:pointer;color:var(--accent);padding:0 2px}
.gc-els{display:grid;gap:2px}.gc-els.big{max-height:300px;overflow:auto}.gc-el{display:flex;justify-content:space-between;gap:8px;padding:3px 6px;border-radius:4px;background:var(--panel-2);cursor:grab;font-size:11.5px}.gc-el:hover{background:var(--panel-3)}.gc-el.on{outline:1px solid var(--accent)}
.gc-el span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gc-el small{color:var(--dim);white-space:nowrap}.gc-more{color:var(--dim);font-size:11px;padding:2px 6px}
.gc-ps{display:grid;gap:8px}.gc-psb{border:1px solid var(--line);border-radius:6px;padding:6px;display:grid;gap:4px}.gc-psh{display:flex;justify-content:space-between;align-items:center;color:var(--accent)}
.gc-psr{display:flex;gap:4px}.gc-psr input{flex:1;min-width:0;background:var(--ink);border:1px solid var(--line);color:var(--txt);border-radius:5px;padding:3px 6px;font:inherit;font-size:12px}
.gc-sheet{position:absolute;inset:0;z-index:8;background:rgba(14,17,22,.94);display:flex;flex-direction:column}
.gc-shbar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line)}.gc-shbar span{flex:1;color:var(--dim);font-size:12px}
.gc-paper{flex:1;min-height:0;width:100%;filter:drop-shadow(0 10px 30px rgba(0,0,0,.5))}.gc-paper text{font-family:Helvetica,Arial,sans-serif}
`; document.head.appendChild(st); })();

/* ============================================================
   v0.49.0 · Full, Dades del projecte i Caràtula com a nodes independents
   ============================================================ */
const PAPERS = [['A4', 297, 210], ['A3', 420, 297], ['A2', 594, 420], ['A1', 841, 594], ['A0', 1189, 841], ['A0+', 1682, 841]];
function gPaper(n) {
  const p = n.p; if (p.fmt === 'auto') return null; let W, H, nm = p.fmt;
  if (p.fmt === 'custom') { W = +p.w || 420; H = +p.h || 297; nm = 'a mida'; } else { const f = PAPERS.find(x => x[0] === p.fmt) || PAPERS[1]; W = f[1]; H = f[2]; }
  if ((p.orient === 'port') !== (H > W)) [W, H] = [H, W]; return { name: nm, W, H, mg: p.mg == null ? 10 : +p.mg, bind: +p.bind || 0, frame: p.frame == null ? 0.5 : +p.frame };
}
function gBlock(t, pj, sh) { return { w: +t.p.w || 180, h: +t.p.h || 40, anchor: t.p.anchor || 'br', fill: !!t.p.fill, items: t.p.items || [], data: { proj: pj ? pj.p : {}, sheet: sh ? { nom: sh.p.name, ...Object.fromEntries(Object.entries(sh.p).filter(([k, v]) => typeof v !== 'object')) } : {} } }; }
/* migració dels grafs v0.47–0.48: format del plànol → Full; caràtula antiga → Caràtula + Dades del projecte */
function gUp49(g) {
  const add = (t, x, y, p) => { const n = { id: pubNext(), t, x, y, p: { ...NDEF[t](), ...(p || {}) }, placed: 1 }; g.nodes.push(n); return n; };
  for (const n of g.nodes.slice()) {
    if (n.t === 'title' && !n.p.items) { const o = n.p, pj = add('proj', n.x - 300, n.y, { projecte: o.project || baseName(), autor: o.author || '', estudi: o.firm || '', escola: o.school || '', curs: o.course || '', logo: o.logo || null });
      n.p = { tpl: o.tpl || 'guaita', ...tbTemplate(o.tpl === 'etsab' ? 'etsab' : o.tpl === 'minim' ? 'minim' : 'guaita'), _old: { num: o.num, title: o.title, date: o.date } }; g.wires.push({ a: pj.id, b: n.id, bp: 'd' }); }
  }
  for (const n of g.nodes.slice()) if (n.t === 'sheet') {
    const o = n.p; if (!g.wires.some(w => w.b === n.id && w.bp === 'f')) { const pa = add('paper', n.x - 300, n.y - 200, { fmt: o.fmt && o.fmt !== 'auto' ? o.fmt : 'A3' }); g.wires.push({ a: pa.id, b: n.id, bp: 'f' }); }
    const tw = g.wires.find(w => w.b === n.id && w.bp === 't'), t = tw && g.nodes.find(x => x.id === tw.a), old = t && t.p._old || {};
    n.p = { ...NDEF.sheet(), name: o.name, numero: old.num || o.numero || 'A-01', titol: old.title || o.titol || '', data: old.date || o.data || '', pos: o.pos || null, ...Object.fromEntries(Object.entries(o).filter(([k]) => ['revisio', 'dibuixat', 'revisat', 'fase'].includes(k))) };
  }
  for (const n of g.nodes) if (n.t === 'title') delete n.p._old; g.v = 49;
}
/* miniatura vectorial del bloc de caràtula */
function gBlockSVG(B, D, px) {
  const P = []; tbPrims(B, 0, 0, 1, tbData(D, null, null, 0, 0), P); const f = x => +x.toFixed(3), o = [];
  for (const q of P) { if (q.t === 'l') o.push('<line x1="' + f(q.x1) + '" y1="' + f(B.h - q.y1) + '" x2="' + f(q.x2) + '" y2="' + f(B.h - q.y2) + '" stroke="#000" stroke-width="' + f(q.w) + '"/>'); else if (q.t === 't') o.push('<text x="' + f(q.x) + '" y="' + f(B.h - q.y) + '" font-size="' + f(q.h * 1.35) + '" font-family="Helvetica,Arial,sans-serif">' + esc(q.s) + '</text>'); else if (q.t === 'i') o.push('<image x="' + f(q.x) + '" y="' + f(B.h - q.y - q.h) + '" width="' + f(q.w) + '" height="' + f(q.h) + '" href="' + q.src + '"/>'); else if (q.t === 'p') o.push('<polygon points="' + q.loops[0].map(p => f(p[0]) + ',' + f(B.h - p[1])).join(' ') + '"/>'); }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ' + (B.w + 2) + ' ' + (B.h + 2) + '"' + (px ? ' width="' + px + '"' : '') + ' style="background:#fff">' + o.join('') + '</svg>';
}
const gTitleData = t => { const pj = gIn(t.id, 'd')[0], sh = GG().wires.filter(w => w.a === t.id).map(w => gN(w.b)).find(n => n && n.t === 'sheet'); return gBlock(t, pj, sh).data; };
GX.title = (n, b) => { const th = el('div', 'gc-th'); th.style.height = Math.max(60, Math.min(150, 240 * n.p.h / n.p.w)) + 'px'; th.innerHTML = gBlockSVG(gBlock(n, null, null), gTitleData(n)); th.firstChild.style.cssText = 'max-width:100%;max-height:100%'; b.insertBefore(th, b.firstChild);
  const e = el('button', 'btn sm', 'Edita la caràtula'); e.dataset.tbedit = n.id; e.onmousedown = ev => ev.stopPropagation(); e.onclick = () => gTitleEdit(n.id); b.appendChild(e); };
GX.paper = (n, b) => { const pa = gPaper(n), s = el('div', 'gc-sum'); if (!pa) { s.textContent = 'Mida automàtica segons les vistes.'; b.appendChild(s); return; } const k = 220 / Math.max(pa.W, pa.H), r = el('div'); r.style.cssText = 'display:flex;align-items:center;gap:10px';
  r.innerHTML = '<div style="width:' + pa.W * k * 0.35 + 'px;height:' + pa.H * k * 0.35 + 'px;background:#fff;border-radius:1px;box-shadow:inset 0 0 0 ' + Math.max(1, pa.mg * k * 0.35) + 'px #E7EAEE,inset 0 0 0 ' + (Math.max(1, pa.mg * k * 0.35) + 1) + 'px #000"></div><span class="gc-sum"><em>' + pa.W + ' × ' + pa.H + '</em> mm<br>marge ' + pa.mg + (pa.bind ? ' + ' + pa.bind + ' enq.' : '') + ' mm</span>'; b.insertBefore(r, b.firstChild); };
GX.proj = (n, b) => { if (n.p.logo) { const im = el('img'); im.src = n.p.logo.src; im.style.cssText = 'max-height:36px;max-width:120px;background:#fff;padding:3px;border-radius:3px'; b.insertBefore(im, b.firstChild); } };
GI.proj = (n, ins, re) => { const s = el('section'); s.appendChild(el('h5', '', 'Logo')); GI._logo(n, s, re); ins.appendChild(s);
  const s2 = el('section'); s2.appendChild(el('h5', '', 'Camps lliures')); s2.appendChild(el('div', 'gc-sum', 'Es poden posar a la caràtula com a {projecte.clau}.'));
  (n.p.extra = n.p.extra || []).forEach((kv, i) => { const r = el('div', 'gc-psr'), k = el('input'), v = el('input'), x = el('button', 'btn sm', '✕'); k.value = kv[0]; v.value = kv[1]; k.onchange = () => { pushUndo('Dades'); kv[0] = k.value.trim().replace(/\s+/g, '_'); re(); }; v.onchange = () => { pushUndo('Dades'); kv[1] = v.value; re(); }; x.onclick = () => { pushUndo('Dades'); n.p.extra.splice(i, 1); re(); }; r.appendChild(k); r.appendChild(v); r.appendChild(x); s2.appendChild(r); });
  const a = el('button', 'btn sm', '+ Camp'); a.onclick = () => { pushUndo('Dades'); n.p.extra.push(['camp' + (n.p.extra.length + 1), '']); re(); }; s2.appendChild(a); ins.appendChild(s2); };
GI._logo = (n, s, re) => { if (n.p.logo) { const im = el('img'); im.src = n.p.logo.src; im.style.cssText = 'max-width:160px;max-height:60px;background:#fff;padding:4px;border-radius:4px;display:block;margin-bottom:6px'; s.appendChild(im); }
  const fi = el('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.id = 'gcLogo'; fi.onchange = () => { const f = fi.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); pushUndo('Logo'); n.p.logo = { src: c.toDataURL('image/jpeg', 0.88), w: c.width, h: c.height }; re(); }; im.src = rd.result; }; rd.readAsDataURL(f); };
  s.appendChild(fi); if (n.p.logo) { const x = el('button', 'btn sm', 'Treu el logo'); x.onclick = () => { pushUndo('Logo'); n.p.logo = null; re(); }; s.appendChild(x); } };
GI.title = (n, ins, re) => { const s = el('section'), r = el('div', 'row2'); s.appendChild(el('h5', '', 'Disseny')); s.appendChild(el('div', 'gc-sum', 'La caràtula és un bloc de línies, símbols i camps. No fixa la mida del paper: la dona el node Full. Les dades venen de Dades del projecte i del Plànol que la fa servir.'));
  const e = el('button', 'btn sm acc', 'Edita la caràtula…'); e.onclick = () => gTitleEdit(n.id); r.appendChild(e);
  for (const [k, l] of [['guaita', 'Guaita'], ['etsab', 'Escola'], ['minim', 'Mínima'], ['franja', 'Franja vertical']]) { const b = el('button', 'btn sm', l); b.dataset.tpl = k; b.onclick = () => { pushUndo('Plantilla de caràtula'); Object.assign(n.p, { tpl: k, ...tbTemplate(k) }); re(); }; r.appendChild(b); }
  s.appendChild(r); ins.appendChild(s); };
/* ---------------- editor gràfic de la caràtula ---------------- */
const TBF = () => [['{projecte.projecte}', 'Projecte'], ['{projecte.client}', 'Client'], ['{projecte.emplacament}', 'Emplaçament'], ['{projecte.promotor}', 'Promotor'], ['{projecte.autor}', 'Autor'], ['{projecte.estudi}', 'Estudi'], ['{projecte.collegiat}', 'Núm. col·legiat'], ['{projecte.escola}', 'Escola'], ['{projecte.curs}', 'Curs'], ['{projecte.expedient}', 'Expedient'], ['{projecte.fase}', 'Fase del projecte'], ...GROLES.flatMap(([r, l]) => [['{' + r + '.nom}', l + ' · nom'], ['{' + r + '.titulacio}', l + ' · titulació'], ['{' + r + '.collegiat}', l + ' · col·legiat']]),
  ['{planol.numero}', 'Núm. de plànol'], ['{planol.titol}', 'Títol del plànol'], ['{planol.nom}', 'Nom del plànol'], ['{planol.revisio}', 'Revisió'], ['{planol.data}', 'Data'], ['{planol.dibuixat}', 'Dibuixat'], ['{planol.revisat}', 'Revisat'], ['{planol.fase}', 'Fase'], ['{planol.escala}', 'Escala (auto)'], ['{planol.full}', 'Full (auto)'], ['{planol.vistes}', 'Vistes del plànol'], ['{planol.escales}', 'Escales de les vistes'], ['{app}', 'Aplicació']];
function gTitleEdit(id) {
  const n = gN(id), cv = $('gcCv'); if (!n || !cv) return; const old = $('gcTb'); if (old) old.remove(); const TE = gTitleEdit, D = tbData(gTitleData(n), null, null, 0, 0);
  if (TE.sel == null || TE.id !== id) { TE.sel = null; TE.id = id; }
  const ov = el('div', 'gc-sheet'); ov.id = 'gcTb'; cv.appendChild(ov); ov.onmousedown = e => e.stopPropagation(); ov.onwheel = e => e.stopPropagation();
  const bar = el('div', 'gc-shbar'); bar.innerHTML = '<b>Caràtula</b><span>' + n.p.w + ' × ' + n.p.h + ' mm · arrossega els elements; s’ajusten a 0,5 mm. Els camps {…} s’omplen amb les dades del projecte i del plànol.</span>'; ov.appendChild(bar);
  const add = (t, o) => { pushUndo('Caràtula'); n.p.items.push({ t, ...o }); TE.sel = n.p.items.length - 1; gTitleEdit(id); };
  const cx = n.p.w / 2, cy = n.p.h / 2;
  for (const [l, f] of [['Línia', () => add('line', { x: cx - 20, y: cy, x2: cx + 20, y2: cy, lw: 0.18 })], ['Rectangle', () => add('rect', { x: cx - 15, y: cy - 6, w: 30, h: 12, lw: 0.25 })], ['Text', () => add('text', { x: cx - 10, y: cy, s: 'Text', fs: 2.5 })], ['Camp', () => add('text', { x: cx - 10, y: cy, s: '{planol.titol}', fs: 3 })], ['Logo', () => add('logo', { x: cx - 15, y: cy - 7, w: 30, h: 14 })], ['Nord', () => add('north', { x: cx - 6, y: cy - 6, w: 12 })], ['Escala gràfica', () => add('scalebar', { x: cx - 20, y: cy, w: 40 })]]) { const b = el('button', 'btn sm', '+ ' + l); b.dataset.tbadd = l; b.onclick = f; bar.appendChild(b); }
  const ok = el('button', 'btn sm acc', 'Fet'); ok.id = 'gcTbDone'; ok.onclick = () => { ov.remove(); pubDraw(); }; bar.appendChild(ok);
  const main = el('div'); main.style.cssText = 'flex:1;display:grid;grid-template-columns:1fr 280px;min-height:0'; ov.appendChild(main);
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), B = gBlock(n, null, null), H = B.h; svg.setAttribute('viewBox', '-6 -6 ' + (B.w + 12) + ' ' + (B.h + 12)); svg.setAttribute('class', 'gc-paper'); svg.style.background = 'transparent'; main.appendChild(svg);
  const mk = (t, a, par) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); (par || svg).appendChild(e); return e; };
  mk('rect', { x: 0, y: 0, width: B.w, height: B.h, fill: '#fff' }); const grid = mk('g', { stroke: '#E8ECEF', 'stroke-width': 0.08 }); for (let x = 0; x <= B.w; x += 5) mk('line', { x1: x, y1: 0, x2: x, y2: B.h }, grid); for (let y = 0; y <= B.h; y += 5) mk('line', { x1: 0, y1: H - y, x2: B.w, y2: H - y }, grid);
  const art = mk('g', {}); art.innerHTML = gBlockSVG(B, gTitleData(n)).replace(/^<svg[^>]*>|<\/svg>$/g, '');
  const bbox = it => it.t === 'line' ? [Math.min(it.x, it.x2), Math.min(it.y, it.y2), Math.abs(it.x2 - it.x) || 0.6, Math.abs(it.y2 - it.y) || 0.6] : it.t === 'text' ? [it.x, it.y - 0.3, Math.max(4, tbText(it.s, D).length * (it.fs || 2.5) * 0.62 || it.s.length * (it.fs || 2.5) * 0.55), (it.fs || 2.5) * 1.3] : it.t === 'north' ? [it.x, it.y, it.w, it.w + 4] : it.t === 'scalebar' ? [it.x, it.y, it.w, 4] : [it.x, it.y, it.w, it.h];
  const hits = mk('g', {}); n.p.items.forEach((it, i) => { const [x, y, w, h] = bbox(it); mk('rect', { x: x - 0.4, y: H - y - h - 0.4, width: w + 0.8, height: h + 0.8, fill: 'rgba(214,251,65,0.001)', stroke: TE.sel === i ? '#7BA20F' : 'transparent', 'stroke-width': 0.3, 'stroke-dasharray': '1 0.6', 'data-tbi': i, style: 'cursor:move' }, hits);
    if (TE.sel === i && it.t !== 'text') mk('rect', { x: x + w - 0.9, y: H - y - h - 0.9, width: 1.8, height: 1.8, fill: '#D6FB41', stroke: '#000', 'stroke-width': 0.15, 'data-tbh': i, style: 'cursor:nesw-resize' }, hits); });
  const pt = e => { const m = svg.getScreenCTM().inverse(), q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m); return { x: q.x, y: H - q.y }; }, sn = v => Math.round(v * 2) / 2;
  let dr = null; svg.addEventListener('mousedown', e => { const h = e.target.closest('[data-tbh]'), r = e.target.closest('[data-tbi]'); if (!h && !r) { TE.sel = null; gTitleEdit(id); return; } e.preventDefault(); const i = +(h || r).getAttribute(h ? 'data-tbh' : 'data-tbi'), it = n.p.items[i]; pushUndo('Caràtula'); TE.sel = i; dr = { i, rs: !!h, p0: pt(e), o: JSON.parse(JSON.stringify(it)) }; });
  const mv = e => { if (!dr) return; const p = pt(e), dx = sn(p.x - dr.p0.x), dy = sn(p.y - dr.p0.y), it = n.p.items[dr.i], o = dr.o;
    if (dr.rs) { if (it.t === 'line') { it.x2 = o.x2 + dx; it.y2 = o.y2 + dy; } else if (it.t === 'north') it.w = Math.max(3, o.w + dx); else if (it.t === 'scalebar') it.w = Math.max(10, o.w + dx); else { it.w = Math.max(1, o.w + dx); it.h = Math.max(1, o.h - dy); it.y = o.y + dy; if (it.h === 1) it.y = o.y + o.h - 1; } }
    else { it.x = o.x + dx; it.y = o.y + dy; if (it.t === 'line') { it.x2 = o.x2 + dx; it.y2 = o.y2 + dy; } }
    art.innerHTML = gBlockSVG(gBlock(n, null, null), gTitleData(n)).replace(/^<svg[^>]*>|<\/svg>$/g, ''); const [x, y, w, h] = bbox(it), hr = hits.querySelector('[data-tbi="' + dr.i + '"]'); hr.setAttribute('x', x - 0.4); hr.setAttribute('y', H - y - h - 0.4); hr.setAttribute('width', w + 0.8); hr.setAttribute('height', h + 0.8); const hh = hits.querySelector('[data-tbh="' + dr.i + '"]'); if (hh) { hh.setAttribute('x', x + w - 0.9); hh.setAttribute('y', H - y - h - 0.9); } };
  const upf = () => { if (!dr) return; dr = null; gTitleEdit(id); }; ov.addEventListener('mousemove', mv); ov.addEventListener('mouseup', upf);
  /* propietats */
  const side = el('div', 'gc-ins'); side.style.borderLeft = '1px solid var(--line)'; main.appendChild(side); const sec = el('section'); side.appendChild(sec);
  const num = (lab, o, k, step) => { const r = el('div', 'gc-f'), i = el('input'); r.appendChild(el('label', '', lab)); i.type = 'number'; i.step = step || 0.5; i.value = o[k]; i.dataset.tbp = k; i.onchange = () => { pushUndo('Caràtula'); o[k] = +i.value; gTitleEdit(id); }; r.appendChild(i); sec.appendChild(r); };
  if (TE.sel == null || !n.p.items[TE.sel]) { sec.appendChild(el('h5', '', 'Bloc')); num('Amplada (mm)', n.p, 'w', 1); num('Alçada (mm)', n.p, 'h', 1);
    const r = el('div', 'gc-f'), c = el('input'); r.appendChild(el('label', '', 'Estira a l’alçada del full')); c.type = 'checkbox'; c.checked = !!n.p.fill; c.onchange = () => { pushUndo('Caràtula'); n.p.fill = c.checked; if (c.checked && !/^[lr]$/.test(n.p.anchor)) n.p.anchor = 'r'; gTitleEdit(id); }; r.appendChild(c); sec.appendChild(r);
    sec.appendChild(el('div', 'gc-sum', n.p.items.length + ' elements. Selecciona’n un per editar-lo.')); return; }
  const it = n.p.items[TE.sel]; sec.appendChild(el('h5', '', { line: 'Línia', rect: 'Rectangle', text: 'Text / camp', logo: 'Logo', north: 'Nord', scalebar: 'Escala gràfica' }[it.t]));
  num('X (mm)', it, 'x'); num('Y (mm)', it, 'y'); if (it.t === 'line') { num('X2 (mm)', it, 'x2'); num('Y2 (mm)', it, 'y2'); } if ('w' in it) num('Amplada (mm)', it, 'w'); if ('h' in it) num('Alçada (mm)', it, 'h'); if ('lw' in it) num('Gruix (mm)', it, 'lw', 0.05);
  if (it.t === 'text') { const r = el('div', 'gc-f'), i = el('input'); r.appendChild(el('label', '', 'Text')); i.value = it.s; i.dataset.tbp = 's'; i.onchange = () => { pushUndo('Caràtula'); it.s = i.value; gTitleEdit(id); }; r.appendChild(i); sec.appendChild(r); num('Mida (mm)', it, 'fs', 0.1);
    const r2 = el('div', 'gc-f'), sl = el('select'); r2.appendChild(el('label', '', 'Insereix camp')); sl.dataset.tbfield = 1; const o0 = el('option'); o0.textContent = '—'; o0.value = ''; sl.appendChild(o0); for (const [v, t] of TBF()) { const o = el('option'); o.value = v; o.textContent = t; sl.appendChild(o); } sl.onchange = () => { if (!sl.value) return; pushUndo('Caràtula'); it.s = it.s === 'Text' ? sl.value : (it.s + ' ' + sl.value).trim(); gTitleEdit(id); }; r2.appendChild(sl); sec.appendChild(r2);
    sec.appendChild(el('div', tbText(it.s, D).trim() ? 'gc-sum' : 'gc-err', 'Valor ara: ' + (tbText(it.s, D) || 'falta (camp buit)'))); }
  const rr = el('div', 'row2'); const du = el('button', 'btn sm', 'Duplica'); du.onclick = () => { pushUndo('Caràtula'); const c = JSON.parse(JSON.stringify(it)); c.x += 2; c.y -= 2; if (c.t === 'line') { c.x2 += 2; c.y2 -= 2; } n.p.items.push(c); TE.sel = n.p.items.length - 1; gTitleEdit(id); };
  const de = el('button', 'btn sm', 'Esborra'); de.id = 'gcTbDel'; de.onclick = () => { pushUndo('Caràtula'); n.p.items.splice(TE.sel, 1); TE.sel = null; gTitleEdit(id); }; rr.appendChild(du); rr.appendChild(de); sec.appendChild(rr);
}
document.addEventListener('keydown', e => { const ov = $('gcTb'); if (!ov || /INPUT|SELECT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return; const TE = gTitleEdit, n = gN(TE.id); if (!n || TE.sel == null) return; const it = n.p.items[TE.sel]; if (!it) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { pushUndo('Caràtula'); n.p.items.splice(TE.sel, 1); TE.sel = null; }
  else if (/^Arrow/.test(e.key)) { const s = e.shiftKey ? 5 : 0.5, dx = e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0, dy = e.key === 'ArrowUp' ? s : e.key === 'ArrowDown' ? -s : 0; pushUndo('Caràtula'); it.x += dx; it.y += dy; if (it.t === 'line') { it.x2 += dx; it.y2 += dy; } } else return;
  e.preventDefault(); e.stopImmediatePropagation(); gTitleEdit(TE.id); }, true);
