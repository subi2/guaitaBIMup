/* =====================================================================
   guaitaBIMup 10 — representació de nivells i eixos, opcions del programa
   ===================================================================== */
const VIS_DEF = { lvl: 'full', grd: 'full' };
const visMode = k => (S.model.meta && S.model.meta.vis && S.model.meta.vis[k]) || VIS_DEF[k];
function setVisMode(k, v) {
  S.model.meta = S.model.meta || {}; S.model.meta.vis = { ...(S.model.meta.vis || {}), [k]: v };
  markDirty(); rebuildAnnot(); renderTray(); buildMenus();
}
function visModeRow(k, label, opts) {
  const r = el('div', 'row', '<span class="gw">' + esc(label) + '</span>'), s = el('select'); s.style.maxWidth = '150px';
  s.innerHTML = opts.map(([v, l]) => '<option value="' + v + '"' + (visMode(k) === v ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
  s.onchange = () => setVisMode(k, s.value); r.appendChild(s); return r;
}
function eyeBox(o) {
  const ck = el('input'); ck.type = 'checkbox'; ck.checked = !o.hidden; ck.title = 'Visible'; ck.onclick = e => e.stopPropagation();
  ck.onchange = () => { o.hidden = !ck.checked; markDirty(); rebuildAnnot(); }; return ck;
}
function toggleAnnSel(kind, id) { const s = S.selAnn[kind]; if (s.has(id)) s.delete(id); else s.add(id); rebuildAnnot(); }
function clearAnnSel() { const A = S.selAnn; if (A.lvls.size || A.grids.size || A.dims.size || A.texts.size) { A.lvls.clear(); A.grids.clear(); A.dims.clear(); A.texts.clear(); rebuildAnnot(); } }

/* ---------- opcions del programa (desades al navegador, no al model) ---------- */
function saveOpts() { try { localStorage.setItem('guaitabimup.opts', JSON.stringify(OPT)); } catch (e) { /* */ } applyOpts(); }
function applyOpts() { EDGE_BIAS.value = OPT.edgeBias * 1e-5; CAM.fov = OPT.fov; updCam(); needRender = true; }
const OPT_UI = [
  ['Mur', [
    ['wallT', 'Gruix predeterminat del mur (m)', 'n', 0.05, 2, 0.01],
    ['wallH', 'Alçada del mur en mode fix o sense nivell superior (m)', 'n', 0.5, 20, 0.05],
    ['wallJust', 'Justificació del mur', 's', [['c', 'Centre'], ['l', 'Esquerra'], ['r', 'Dreta']]],
    ['wallHm', 'Alçada per defecte', 's', [['next', 'Nivell immediatament superior'], ['fix', 'Alçada fixa']]]]],
  ['Selecció', [
    ['pick', 'Radi de captura (píxels)', 'n', 2, 20, 1],
    ['crossRL', 'Caixa de creuament de dreta a esquerra (si no, d’esquerra a dreta)', 'b'],
    ['chainSameClass', 'Tab: la cadena de grups només inclou la mateixa classe IFC', 'b']]],
  ['Òrbita i zoom', [
    ['orbit', 'Velocitat d’òrbita', 'n', 0.001, 0.03, 0.001],
    ['orbitInvY', 'Inverteix l’òrbita vertical', 'b'],
    ['wheel', 'Velocitat de la roda (zoom)', 'n', 0.0002, 0.006, 0.0002],
    ['wheelInv', 'Inverteix la roda', 'b'],
    ['zoomCursor', 'Zoom cap al punter (si no, cap al centre)', 'b'],
    ['fov', 'Camp de visió (°)', 'n', 10, 90, 1],
    ['anim', 'Durada de l’animació de vistes (ms)', 'n', 0, 2000, 20]]],
  ['Navegació', [
    ['navOrbit', 'Tecla + arrossegar per orbitar (ratolí d’un botó o Magic Mouse)', 's', [['alt', 'Opció (Alt)'], ['meta', 'Command'], ['ctrl', 'Control'], ['shift', 'Majúscules'], ['none', 'Cap']]],
    ['navPan', 'Tecla + arrossegar per desplaçar', 's', [['meta', 'Command'], ['alt', 'Opció (Alt)'], ['ctrl', 'Control'], ['shift', 'Majúscules'], ['none', 'Cap']]],
    ['navZoom', 'Tecla + arrossegar per fer zoom (amunt = apropar)', 's', [['ctrl', 'Control'], ['alt', 'Opció (Alt)'], ['meta', 'Command'], ['shift', 'Majúscules'], ['none', 'Cap']]]]],
  ['Pantalla', [['edgeBias', 'Biaix de profunditat de les arestes (0–10)', 'n', 0, 10, 0.5]]],
  ['Magnetisme', [['axisPx', 'Zona d’atracció dels eixos vermell i verd (píxels)', 'n', 4, 30, 1], ['axisPxZ', 'Zona d’atracció de l’eix blau (píxels)', 'n', 4, 40, 1], ['snapGrid', 'Magnetisme a la quadrícula del nivell actiu', 'b'], ['snapStep', 'Pas de la quadrícula (m)', 'n', 0.05, 10, 0.05]]],
  ['Nivells', [['snapPx', 'Magnetisme als nivells en Empeny (píxels, 0 = desactivat)', 'n', 0, 40, 1]]],
];
function optsDlg() {
  const box = $('dlgBox');
  box.innerHTML = '<h3>Opcions del programa</h3><p class="dim" style="font-size:12.5px">Es desen en aquest navegador i no formen part del model.</p>'
    + OPT_UI.map(([sec, rows]) => '<div class="row hd" style="margin-top:8px">' + esc(sec) + '</div>' + rows.map(([k, l, t, mn, mx, st]) => '<div class="kv" style="margin:3px 0"><span>' + esc(l) + '</span>'
      + (t === 's' ? '<select data-o="' + k + '">' + mn.map(([v, lb]) => '<option value="' + v + '"' + (OPT[k] === v ? ' selected' : '') + '>' + esc(lb) + '</option>').join('') + '</select>' : t === 'b' ? '<input type="checkbox" data-o="' + k + '"' + (OPT[k] ? ' checked' : '') + '>' : '<input type="number" data-o="' + k + '" min="' + mn + '" max="' + mx + '" step="' + st + '" value="' + OPT[k] + '" style="font-family:var(--mono);width:90px">') + '</div>').join('')).join('')
    + '<div style="text-align:right;margin-top:12px"><button class="btn" id="oDef">Valors per defecte</button> <button class="btn acc" id="oX">Tanca</button></div>';
  box.querySelectorAll('[data-o]').forEach(e => e.onchange = () => {
    const k = e.dataset.o; if (e.type === 'checkbox') OPT[k] = e.checked; else if (e.tagName === 'SELECT') OPT[k] = e.value; else { const v = parseFloat(e.value); if (isFinite(v)) OPT[k] = Math.min(+e.max, Math.max(+e.min, v)); }
    saveOpts();
  });
  $('oDef').onclick = () => { Object.assign(OPT, OPT_DEF); saveOpts(); optsDlg(); };
  $('oX').onclick = () => $('dlg').classList.remove('show');
  $('dlg').classList.add('show');
}
applyOpts();
