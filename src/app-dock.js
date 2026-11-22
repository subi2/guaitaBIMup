/* v0.38.1.a · barres d'eines i panells acoblables / desacoblables (proves) */
const BAR_DEFS = [
  ['acc', 'Accions', null, 'top'],
  ['nav', 'Navegació', ['orbit', 'pan', 'zoom', 'zoomwin', 'campos', 'camlook', 'camorb'], 'top'],
  ['sel', 'Selecció', ['select', 'eraser', 'paint'], 'left'],
  ['dib', 'Dibuix', ['line', 'freehand', 'rect', 'rrect', 'circle', 'poly', 'arc'], 'left'],
  ['mod', 'Modificació', ['pushpull', 'move', 'copy', 'rotate', 'scale', 'followme', 'offset'], 'left'],
  ['lin', 'Modificació de línies', ['trim', 'split', 'join', 'mirror', 'align', 'lineoff'], 'left'],
  ['mes', 'Mesura', ['tape', 'dim', 'protr', 'text', 'section'], 'left2'],
  ['bim1', 'BIM · referències', ['level', 'grid', 'refplane'], 'left2'],
  ['bim2', 'BIM · elements', ['wall', 'column', 'slab', 'roof', 'stair', 'opening', 'door', 'win', 'comp', 'bsec'], 'left2'],
  ['bim3', 'BIM · fonaments', ['matf', 'pad', 'strip'], 'left2'],
  ['bim4', 'BIM · classificació', ['ifc'], 'left2'],
];
const BAR_HOSTS = { top: 'toolbar', left: 'rail', left2: 'rail2', right: 'railR', right2: 'railR2' };
const TAB_DEFS = [['info', 'Info', ['info']], ['dir', 'Directrius', ['lvl', 'guides']], ['vis', 'Visual', ['views', 'bsec', 'scenes', 'cam', 'sty', 'lns', 'mat']], ['cls', 'Classificació', ['outl', 'doors', 'wins', 'cmp', 'ifc', 'tags', 'imgs']]];
const TRAY_CLOSED0 = ['mat', 'tags', 'outl', 'guides', 'sty', 'cam'];
const TRAY = { closed: new Set(TRAY_CLOSED0) };
function panelDefs() {
  return {
    info: ['Informació de l’entitat', b => { b.id = 'infoBody'; }], lvl: ['Nivells', levelsPanel], guides: ['Eixos, plans i anotacions', guidesPanel],
    views: ['Navegador del model', viewsPanel], bsec: ['Seccions BIM', bsecPanel], scenes: ['Escenes', scenesPanel], cam: ['Càmera cònica', camPanel], sty: ['Estils de visualització', stylesPanel], lns: ['Línies', linesPanel], mat: ['Materials', matPanel],
    outl: ['Esquema', outlPanel], ifc: ['Classificador IFC', ifcPanel], cmp: ['Components', compsPanel], doors: ['Portes', doorsPanel], wins: ['Finestres', winsPanel], tags: ['Etiquetes', tagsPanel], imgs: ['Imatges de calc', imgPanel],
  };
}
/* ---------- disposició (es desa al navegador) ---------- */
const LAY_KEY = 'guaitabimup.layout';
function layDefault() { const bars = {}; BAR_DEFS.forEach(d => { bars[d[0]] = { dock: d[3] }; }); return { bars, panels: {}, two: true, tabCol: { info: 1, dir: 1, vis: 2, cls: 2 }, act: { 1: 'info', 2: 'vis' } }; }
function layLoad() {
  const d = layDefault();
  try { const j = JSON.parse(localStorage.getItem(LAY_KEY) || 'null'); if (j) { for (const k in j.bars || {}) if (d.bars[k]) Object.assign(d.bars[k], j.bars[k]); d.panels = j.panels || {}; if (typeof j.two === 'boolean') d.two = j.two; if (j.tabCol) Object.assign(d.tabCol, j.tabCol); if (j.act) Object.assign(d.act, j.act); } } catch (e) { }
  return d;
}
let LAY = layLoad(), LAY_T = 0;
function laySave() { clearTimeout(LAY_T); LAY_T = setTimeout(() => { try { localStorage.setItem(LAY_KEY, JSON.stringify(LAY)); } catch (e) { } }, 150); }
function layReset() { LAY = layDefault(); TRAY.closed = new Set(TRAY_CLOSED0); laySave(); buildBars(); renderTray(); buildMenus(); }
/* ---------- barres d'eines ---------- */
function accButtons(g) {
  [['prev', 'Vista anterior', prevView], ['undo', 'Desfés (Ctrl+Z)', undo], ['redo', 'Refés (Ctrl+Y)', redo], ['group', 'Agrupa (Ctrl+G)', doGroup], ['selbar', 'Selecció per propietats (Ctrl+Maj+F)', () => toggleSelBar()], ['fit', 'Ajusta la vista (Maj+Z)', () => fitView()], ['scene', 'Desa escena', saveScene], ['open', 'Obre (Ctrl+O)', openFile], ['save', 'Desa (Ctrl+S)', saveFile]].forEach(([n, t, f]) => {
    const b = el('button', 'tb', ico(n)); b.id = 'tb_' + n; b.title = t; b.setAttribute('aria-label', t); b.onclick = f; g.appendChild(b);
  });
}
function barEl(def, st) {
  const d = el('div', 'bar dk-' + st.dock), h = el('div', 'bar-h', '<span class="dg" title="Arrossega per moure o acoblar"></span><span class="bt">' + esc(def[1]) + '</span>'), g = el('div', 'bar-b');
  if (def[0] === 'acc') accButtons(g); else def[2].forEach(n => g.appendChild(toolBtn(n)));
  d.dataset.bar = def[0]; d.appendChild(h); d.appendChild(g);
  if (st.dock === 'float') { d.style.left = (st.x || 20) + 'px'; d.style.top = (st.y || 20) + 'px'; }
  h.addEventListener('pointerdown', e => barDrag(e, d, def[0]));
  return d;
}
function buildBars() {
  const hosts = {}; for (const k in BAR_HOSTS) hosts[k] = $(BAR_HOSTS[k]); const fl = $('floatLayer');
  Object.values(hosts).forEach(h => { h.innerHTML = ''; }); fl.querySelectorAll('.bar').forEach(b => b.remove());
  for (const def of BAR_DEFS) { const st = LAY.bars[def[0]]; if (st.hidden) continue; (st.dock === 'float' ? fl : hosts[st.dock] || hosts.left).appendChild(barEl(def, st)); }
  if (typeof syncUI === 'function') syncUI();
}
function dropZone(x, y) {
  for (const k in BAR_HOSTS) { const h = $(BAR_HOSTS[k]).getBoundingClientRect(); if (x >= h.left && x <= h.right && y >= h.top && y <= h.bottom && h.width > 0) return k; }
  const m = $('main').getBoundingClientRect();
  if (y < m.top + 20) return 'top'; if (x < m.left + 60) return 'left'; if (x > m.right - 60) return 'right'; return 'float';
}
function barDrag(e, d, id) {
  if (e.button !== 0) return; e.preventDefault();
  const r = d.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top; let moved = false;
  const hosts = BAR_HOSTS;
  const mark = z => { for (const k in hosts) $(hosts[k]).classList.toggle('dz', k === z); };
  const mv = ev => {
    if (!moved) { if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 4) return; moved = true; document.body.classList.add('bardrag'); d.classList.add('dragging'); document.body.appendChild(d); }
    d.style.left = (ev.clientX - dx) + 'px'; d.style.top = (ev.clientY - dy) + 'px'; mark(dropZone(ev.clientX, ev.clientY));
  };
  const up = ev => {
    const z0 = dropZone(ev.clientX, ev.clientY);
    window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); mark(null); document.body.classList.remove('bardrag');
    if (!moved) return; d.remove();
    const z = z0, vw = $('viewWrap').getBoundingClientRect(), st = LAY.bars[id];
    st.dock = z; if (z === 'float') { st.x = Math.max(0, Math.min(vw.width - 80, ev.clientX - dx - vw.left)); st.y = Math.max(0, Math.min(vw.height - 40, ev.clientY - dy - vw.top)); }
    laySave(); buildBars(); buildMenus();
  };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
/* ---------- safata: pestanyes i panells acoblats o flotants ---------- */
function panel(key, title, body, fl) {
  const closed = !fl && TRAY.closed.has(key);
  const p = el('section', 'pn' + (closed ? ' closed' : '')), h = el('h2', '', '<span class="ar">' + (closed ? '▸' : '▾') + '</span><span class="t">' + esc(title) + '</span>');
  const fb = el('button', 'pfb', '⧉'); fb.title = 'Desacobla en una finestra flotant'; fb.onclick = e => { e.stopPropagation(); setPanelFloat(key, true); }; if (!fl) h.appendChild(fb);
  h.onclick = () => { if (TRAY.closed.has(key)) TRAY.closed.delete(key); else TRAY.closed.add(key); renderTray(); };
  const b = el('div', 'pb'); body(b); p.appendChild(h); p.appendChild(b); return p;
}
function setPanelFloat(key, on) {
  const P = LAY.panels[key] || (LAY.panels[key] = {}); P.float = on; P.hidden = false;
  if (on && P.x == null) { const n = Object.values(LAY.panels).filter(q => q.float).length; P.x = 60 + 24 * n; P.y = 60 + 24 * n; }
  laySave(); renderTray(); buildMenus();
}
function togglePanel(key) { const P = LAY.panels[key] || (LAY.panels[key] = {}); P.hidden = !P.hidden; laySave(); renderTray(); buildMenus(); }
function toggleBar(id) { const st = LAY.bars[id]; st.hidden = !st.hidden; laySave(); buildBars(); buildMenus(); }
function floatPanel(key, def, P) {
  const f = el('div', 'fpanel'); f.dataset.key = key; f.style.left = (P.x || 60) + 'px'; f.style.top = (P.y || 60) + 'px'; f.style.width = (P.w || 300) + 'px'; f.style.height = (P.h || 340) + 'px';
  const h = el('div', 'fp-t', '<span class="dg"></span><span class="t">' + esc(def[0]) + '</span>'), x = el('button', 'pfb', '⇲'); x.title = 'Acobla a la safata'; x.onclick = () => setPanelFloat(key, false); h.appendChild(x);
  f.appendChild(h); f.appendChild(panel(key, def[0], def[1], true));
  h.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || e.button !== 0) return; e.preventDefault();
    const vw = $('viewWrap').getBoundingClientRect(), r = f.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    const mv = ev => { P.x = Math.max(0, Math.min(vw.width - 60, ev.clientX - dx - vw.left)); P.y = Math.max(0, Math.min(vw.height - 26, ev.clientY - dy - vw.top)); f.style.left = P.x + 'px'; f.style.top = P.y + 'px'; };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); laySave(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (f.offsetWidth > 20 && (Math.abs((P.w || 0) - f.offsetWidth) > 1 || Math.abs((P.h || 0) - f.offsetHeight) > 1)) { P.w = f.offsetWidth; P.h = f.offsetHeight; laySave(); } }).observe(f);
  return f;
}
function tabFloats(k) { const t = TAB_DEFS.find(x => x[0] === k); return t ? t[2].filter(key => { const P = LAY.panels[key]; return P && P.float && !P.hidden; }) : []; }
function redockTab(k) { tabFloats(k).forEach(key => { LAY.panels[key].float = false; }); const t = TAB_DEFS.find(x => x[0] === k); const col = tabColOf(k); LAY.act[col] = k; laySave(); renderTray(); buildMenus(); resize(); }
const trayN = () => LAY.three ? 3 : LAY.two ? 2 : 1, tabColOf = k => Math.min(trayN(), LAY.tabCol[k] || 1);
function trayTabs(col) { return TAB_DEFS.filter(t => tabColOf(t[0]) === col); }
function toggleTray3() { LAY.three = !LAY.three; if (LAY.three) { LAY.two = true; if (!TAB_DEFS.some(t => LAY.tabCol[t[0]] === 3)) LAY.tabCol.cls = 3; } laySave(); renderTray(); buildMenus(); resize(); }
function toggleTray2() { LAY.two = !LAY.two; if (!LAY.two) LAY.three = false; laySave(); renderTray(); buildMenus(); resize(); }
function moveTab(key) { LAY.tabCol[key] = tabColOf(key) % trayN() + 1; laySave(); renderTray(); resize(); }
function renderTray() {
  const fl = $('floatLayer'), defs = panelDefs(); const TR = c => $(c === 1 ? 'tray' : 'tray' + c), sy = [1, 2, 3].map(c => TR(c) ? TR(c).scrollTop : 0);
  const fs = new Map(); fl.querySelectorAll('.fpanel').forEach(f => { const b = f.querySelector('.pb'); fs.set(f.dataset.key, b ? b.scrollTop : 0); f.remove(); });
  [1, 2, 3].forEach(col => {
    const t = TR(col); if (!t) return; t.innerHTML = ''; const tabs = trayTabs(col); if (!tabs.length) return;
    let act = tabs.find(x => x[0] === LAY.act[col]) || tabs[0]; LAY.act[col] = act[0];
    const ts = el('div', 'tabs2'); tabs.forEach(([k, l]) => { const b = el('button', 'tab2' + (act[0] === k ? ' on' : ''), esc(l)); b.dataset.tab = k; b.onclick = () => { LAY.act[col] = k; laySave(); renderTray(); };
      const nf = tabFloats(k).length; if (nf) { const r = el('span', 'tabre', '⇲'); r.title = 'Reacobla els ' + nf + ' panells flotants d’aquesta pestanya'; r.onclick = e => { e.stopPropagation(); redockTab(k); }; b.appendChild(r); } ts.appendChild(b); });
    if (LAY.two) { const mv = el('button', 'tab2 mv', '⇄'); mv.title = 'Mou aquesta pestanya al panell lateral següent'; mv.onclick = () => moveTab(act[0]); ts.appendChild(mv); }
    t.appendChild(ts); let n = 0;
    for (const key of act[2]) { const P = LAY.panels[key] || {}; if (P.hidden || P.float) continue; t.appendChild(panel(key, defs[key][0], defs[key][1])); n++; }
    if (!n) t.appendChild(el('div', 'empty', 'Cap panell acoblat en aquesta pestanya.'));
    t.scrollTop = sy[col - 1];
  });
  for (const key of Object.keys(defs)) { const P = LAY.panels[key]; if (P && P.float && !P.hidden) { const f = floatPanel(key, defs[key], P); fl.appendChild(f); const b = f.querySelector('.pb'); if (b && fs.has(key)) b.scrollTop = fs.get(key); } }
  renderInfo();
}
