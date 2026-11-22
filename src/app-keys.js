/* ---------- dreceres de teclat de dues lletres, editables (v0.34) ---------- */
/* [id, nom, tipus, destí, drecera per defecte]. Tipus 'tool': destí = nom d'eina; 'act': destí = funció.
   Les dreceres per defecte segueixen Revit quan les conec; les marcades amb «?» són a verificar (es poden canviar a l'editor). */
const CMDS = [
  ['move', 'Mou', 'tool', 'move', 'MV'], ['copy', 'Copia', 'tool', 'copy', 'CO'], ['rotate', 'Gira', 'tool', 'rotate', 'RO'],
  ['scale', 'Escala', 'tool', 'scale', 'RE'], ['mirror', 'Emmiralla', 'tool', 'mirror', 'MM'], ['align', 'Alinea', 'tool', 'align', 'AL'],
  ['trim', 'Retalla/estén a cantonada', 'tool', 'trim', 'TR'], ['trimm', 'Retalla/estén múltiple', 'tool', 'trimm', 'TM'],
  ['split', 'Divideix', 'tool', 'split', 'SP'], ['join', 'Uneix línies', 'tool', 'join', 'JO'], ['lineoff', 'Desfasa línia', 'tool', 'lineoff', 'OF'],
  ['delete', 'Esborra', 'act', () => doDelete(), 'DE'], ['pushpull', 'Empeny/tira', 'tool', 'pushpull', 'PP'],
  ['offset', 'Desfasa cara', 'tool', 'offset', 'OC'], ['followme', 'Segueix el perfil', 'tool', 'followme', 'FM'],
  ['line', 'Línia', 'tool', 'line', 'LI'], ['rect', 'Rectangle', 'tool', 'rect', 'RC'], ['rrect', 'Rectangle arrodonit', 'tool', 'rrect', 'RR'],
  ['circle', 'Cercle', 'tool', 'circle', 'CI'], ['arc', 'Arc', 'tool', 'arc', 'AR'], ['poly', 'Polígon', 'tool', 'poly', 'PG'],
  ['freehand', 'Dibuix a mà', 'tool', 'freehand', 'FH'],
  ['wall', 'Mur', 'tool', 'wall', 'WA'], ['column', 'Pilar', 'tool', 'column', 'CL'], ['slab', 'Llosa', 'tool', 'slab', 'FL'],
  ['roof', 'Coberta', 'tool', 'roof', 'RF'], ['stair', 'Escala', 'tool', 'stair', 'ST'], ['opening', 'Obertura (porta/finestra)', 'tool', 'opening', 'DR'],
  ['door', 'Porta (catàleg)', 'tool', 'door', 'PR'], ['win', 'Finestra (catàleg)', 'tool', 'win', 'FN'], ['comp', 'Component', 'tool', 'comp', 'CM'], ['level', 'Nivell', 'tool', 'level', 'LL'], ['grid', 'Eix', 'tool', 'grid', 'GR'],
  ['refplane', 'Pla de referència', 'tool', 'refplane', 'RP'], ['matf', 'Fonament de matriu', 'tool', 'matf', 'MF'], ['pad', 'Pad', 'tool', 'pad', 'PD'],
  ['strip', 'Sabata corrida', 'tool', 'strip', 'SB'], ['bsec', 'Línia de secció', 'tool', 'bsec', 'BS'],
  ['dim', 'Cota', 'tool', 'dim', 'DI'], ['tape', 'Mesura', 'tool', 'tape', 'MT'], ['protr', 'Transportador', 'tool', 'protr', 'AN'],
  ['text', 'Text', 'tool', 'text', 'TX'], ['section', 'Secció', 'tool', 'section', 'SC'],
  ['select', 'Selecció', 'tool', 'select', 'SL'], ['eraser', 'Esborrador', 'tool', 'eraser', 'ER'], ['paint', 'Pintura', 'tool', 'paint', 'PT'],
  ['orbit', 'Òrbita', 'tool', 'orbit', 'OR'], ['pan', 'Desplaça la vista', 'tool', 'pan', 'PN'], ['zoom', 'Zoom', 'tool', 'zoom', 'ZM'],
  ['zoomwin', 'Zoom a finestra', 'tool', 'zoomwin', 'ZR'], ['campos', 'Posiciona càmera', 'tool', 'campos', 'PC'], ['camlook', 'Mira al voltant', 'tool', 'camlook', 'LA'], ['camorb', 'Òrbita de càmera', 'tool', 'camorb', 'OK'], ['fit', 'Ajusta la vista', 'act', () => fitView(), 'ZF'],
  ['ifc', 'Classificació IFC', 'tool', 'ifc', 'IF'], ['prev', 'Vista anterior', 'act', () => prevView(), 'VP'],
];
const KEY_DEF = Object.fromEntries(CMDS.map(c => [c[0], c[4]]));
let KEYS = { ...KEY_DEF }, KEY2CMD = {};
try { Object.assign(KEYS, JSON.parse(localStorage.getItem('guaitabimup.keys')) || {}); } catch (e) { /* */ }
function keyCmdMap() {
  const m = {}, seen = {};
  for (const [id] of CMDS) { const k = (KEYS[id] || '').toUpperCase(); if (!/^[A-Z]{2}$/.test(k)) continue; if (m[k]) { seen[k] = true; continue; } m[k] = id; }
  return m;
}
function rebuildKeys() { KEY2CMD = keyCmdMap(); try { localStorage.setItem('guaitabimup.keys', JSON.stringify(KEYS)); } catch (e) { /* */ } }
rebuildKeys();
/* drecera de l'eina (per a botons i menús) */
function keyOfTool(name) { const c = CMDS.find(x => x[2] === 'tool' && x[3] === name); return c ? (KEYS[c[0]] || '') : ''; }
function keyOfCmd(id) { return KEYS[id] || ''; }
function runCmd(id) {
  const c = CMDS.find(x => x[0] === id); if (!c) return false;
  if (c[2] === 'act') { c[3](); return true; }
  if (!TOOLS[c[3]]) return false;
  setTool(c[3]); return true;
}
/* assigna una drecera; si ja la té una altra comanda, aquesta la perd */
function setKey(id, k) {
  k = String(k || '').toUpperCase();
  if (k && !/^[A-Z]{2}$/.test(k)) return false;
  let taken = null;
  if (k) for (const [cid] of CMDS) if (cid !== id && KEYS[cid] === k) taken = cid;
  if (taken) KEYS[taken] = '';
  KEYS[id] = k; rebuildKeys(); return taken;
}
/* editor de dreceres (Eines › Dreceres de teclat…) */
let KEY_LISTEN = null;
function keysDlg() {
  const rows = CMDS.map(([id, name]) => '<tr><td>' + esc(name) + '</td><td><kbd id="kk_' + id + '">' + esc(KEYS[id] || '—') + '</kbd></td>'
    + '<td><button class="btn sm" data-kc="' + id + '">Canvia</button> <button class="btn sm" data-kd="' + id + '">Elimina</button></td></tr>').join('');
  dlg('<h3>Dreceres de teclat</h3><p class="dim" style="font-size:12.5px">Dues lletres. Clica «Canvia» i prem les dues lletres (Esc cancel·la). Si una drecera ja és usada, passa a la nova comanda i l’anterior queda sense drecera.</p>'
    + '<div style="max-height:52vh;overflow:auto"><table style="width:100%">' + rows + '</table></div>'
    + '<div style="margin-top:8px"><button class="btn sm" id="kReset">Restaura per defecte</button> <span id="kMsg" class="dim" style="font-size:12.5px"></span></div>');
  const box = $('dlgBox');
  box.querySelectorAll('[data-kc]').forEach(b => b.onclick = () => { KEY_LISTEN = { id: b.dataset.kc, buf: '' }; $('kMsg').textContent = 'Prem dues lletres per a «' + CMDS.find(c => c[0] === b.dataset.kc)[1] + '»…'; });
  box.querySelectorAll('[data-kd]').forEach(b => b.onclick = () => { setKey(b.dataset.kd, ''); keysDlg(); });
  $('kReset').onclick = () => { KEYS = { ...KEY_DEF }; rebuildKeys(); keysDlg(); };
}
/* captura de les dues lletres per a l'editor */
window.addEventListener('keydown', ev => {
  if (!KEY_LISTEN) return;
  ev.preventDefault(); ev.stopPropagation();
  if (ev.key === 'Escape') { KEY_LISTEN = null; $('kMsg').textContent = 'Cancel·lat.'; return; }
  if (!/^[a-z]$/i.test(ev.key)) return;
  KEY_LISTEN.buf += ev.key.toUpperCase();
  if (KEY_LISTEN.buf.length < 2) { $('kMsg').textContent = 'Falta una lletra…'; return; }
  const id = KEY_LISTEN.id, k = KEY_LISTEN.buf, name = CMDS.find(c => c[0] === id)[1];
  KEY_LISTEN = null;
  const took = setKey(id, k);
  keysDlg(); $('kMsg').textContent = 'Assignada ' + k + ' a «' + name + '»' + (took ? '. «' + CMDS.find(c => c[0] === took)[1] + '» ha perdut la drecera.' : '.');
}, true);
