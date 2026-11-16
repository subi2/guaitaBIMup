/* =====================================================================
   guaitaBIMup 10 — classificació IFC assistida
   Classe activa, auto-agrupa, grups pendents, regles per nom i
   suggeriment per geometria.
   ===================================================================== */
const className = k => { if (!k) return 'No BIM (esbós)'; const r = IFC.find(x => x[0] === k); return r ? r[1] : k; };
function setActiveClass(k) { S.ifcActive = k || null; syncClass(); renderTray(); }
function applyActive(g) {
  if (!S.ifcActive || g.ifc) return g;
  g.ifc = S.ifcActive; if (/^Grup \d+$/.test(g.name || '')) g.name = className(g.ifc) + ' ' + g.id; return g;
}
function autoGroupAfter(c, face) {
  if (!S.autoGroup || !S.ifcActive || !face) return false;
  const g = K.makeGroup(S.model, c, connectedSel(c, face)); g.level = S.level; applyActive(g);
  clearSel(); S.sel.groups.add(g.id); return true;
}
function syncClass() {
  const s = $('clsSel'); if (!s) return;
  s.innerHTML = '<option value="">— No BIM (esbós) —</option>' + IFC.map(r => '<option value="' + r[0] + '"' + (r[0] === S.ifcActive ? ' selected' : '') + '>' + esc(r[1]) + '</option>').join('');
  $('autoG').checked = !!S.autoGroup;
  const n = pendingList().length, b = $('stPend'); b.textContent = n + ' sense classificar'; b.classList.toggle('zero', n === 0);
}

/* ---------- grups sense classificar ---------- */
/* Un grup compta com a pendent si té geometria pròpia i ni ell ni cap pare tenen classe. */
function pendingList() {
  const out = [];
  (function w(c, top, par) { for (const g of c.groups.values()) { const t = top || g.id; if (g.ifc) continue; if (g.faces.size > 0) out.push({ g, top: t, parent: par }); w(g, t, g); } })(S.model.root, null, null);
  return out;
}
function selectPending() {
  const L = pendingList(); if (!L.length) { toast('Tots els grups estan classificats.'); return; }
  S.ctx = []; clearSel(); L.forEach(x => S.sel.groups.add(x.top)); refreshAll();
  toast(L.length + ' grups sense classificar' + (L.length > S.sel.groups.size ? ' (seleccionats ' + S.sel.groups.size + ' grups de nivell superior)' : '') + '.');
}

/* ---------- regles per nom ---------- */
const RULES_KEY = 'guaitabimup.rules';
const RULES_DEF = [['Mur*', 'IfcWall'], ['Paret*', 'IfcWall'], ['Pilar*', 'IfcColumn'], ['Biga*', 'IfcBeam'], ['Llosa*', 'IfcSlab'], ['Forjat*', 'IfcSlab'], ['Coberta*', 'IfcRoof'],
  ['Escala*', 'IfcStair'], ['Porta*', 'IfcDoor'], ['Finestra*', 'IfcWindow'], ['Barana*', 'IfcRailing'], ['Fonament*', 'IfcFooting'], ['Espai*', 'IfcSpace']];
function loadRules() { try { const r = JSON.parse(localStorage.getItem(RULES_KEY)); if (Array.isArray(r)) return r.filter(x => Array.isArray(x) && x.length === 2); } catch (e) { } return RULES_DEF.map(x => x.slice()); }
function saveRules(r) { try { localStorage.setItem(RULES_KEY, JSON.stringify(r)); } catch (e) { } }
const normTxt = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function globRe(p) { return new RegExp('^' + normTxt(p).trim().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'); }
function ruleFor(name, rules) {
  const n = normTxt(name).trim();
  for (const [p, k] of rules) { if (!p || !k) continue; try { if (globRe(p).test(n)) return k; } catch (e) { } }
  return null;
}

/* ---------- suggeriment per geometria ---------- */
function groupDims(g) {
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], n = 0;
  (function w(c, o) { for (const v of c.verts.values()) { const p = V.add(v.p, o); for (let i = 0; i < 3; i++) { if (p[i] < lo[i]) lo[i] = p[i]; if (p[i] > hi[i]) hi[i] = p[i]; } n++; } for (const s of c.groups.values()) w(s, V.add(o, s.t)); })(g, [0, 0, 0]);
  return n ? [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] : null;
}
function suggestByShape(g) {
  const d = groupDims(g); if (!d) return null;
  const dz = d[2], a = Math.min(d[0], d[1]), b = Math.max(d[0], d[1]);
  if (dz >= 1.5 && b <= 1.0 && dz >= 2 * b) return 'IfcColumn';
  if (dz >= 1.5 && a <= 0.6 && b >= 1.0 && b >= 2 * a) return 'IfcWall';
  if (dz <= 1.0 && a <= 0.8 && b >= 4 * Math.max(a, dz) && b >= 1.5) return 'IfcBeam';
  if (dz <= 0.6 && a >= 1.0) return 'IfcSlab';
  return null;
}
function buildProposals(rules) {
  return pendingList().map(x => {
    const nm = x.g.name || 'Grup ' + x.g.id, r = ruleFor(nm, rules);
    if (r) return { g: x.g, nm, k: r, src: 'nom' };
    const s = suggestByShape(x.g); return { g: x.g, nm, k: s, src: s ? 'forma' : '' };
  });
}

/* ---------- diàleg ---------- */
function classDlg() {
  const rules = loadRules(); let props = null;
  const opts = sel => '<option value="">—</option>' + IFC.map(r => '<option value="' + r[0] + '"' + (r[0] === sel ? ' selected' : '') + '>' + esc(r[1]) + '</option>').join('');
  const box = $('dlgBox');
  const draw = () => {
    box.innerHTML = '<h3>Classificació assistida</h3><p class="dim" style="font-size:12.5px">Regles per nom (amb <b>*</b> i <b>?</b>) i, si cap no coincideix, suggeriment per forma. Res no s’aplica fins que ho confirmes.</p>'
      + '<div id="cRules">' + rules.map((r, i) => '<div class="rl"><input type="text" data-i="' + i + '" data-f="0" value="' + esc(r[0]) + '"><select data-i="' + i + '" data-f="1">' + opts(r[1]) + '</select><button class="btn sm" data-del="' + i + '" title="Elimina">✕</button></div>').join('') + '</div>'
      + '<div style="margin:6px 0 12px"><button class="btn sm" id="cAddR">Afegeix regla</button> <button class="btn sm" id="cDefR">Regles per defecte</button></div>'
      + '<div style="margin-bottom:8px"><button class="btn sm acc" id="cCalc">Calcula proposta (' + pendingList().length + ' pendents)</button></div>'
      + '<div id="cProp">' + (props ? (props.length ? props.map((p, i) => '<div class="pr"><input type="checkbox" data-p="' + i + '"' + (p.on ? ' checked' : '') + '><span title="' + esc(p.nm) + '" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.nm) + '</span><select data-pk="' + i + '">' + opts(p.k) + '</select><span class="dim">' + p.src + '</span></div>').join('') : '<p class="dim">No hi ha grups pendents.</p>') : '') + '</div>'
      + '<div style="text-align:right;margin-top:10px"><button class="btn" id="cX">Tanca</button> <button class="btn acc" id="cApply"' + (props && props.some(p => p.on) ? '' : ' disabled') + '>Aplica les marcades</button></div>';
    box.querySelectorAll('#cRules input,#cRules select').forEach(e => e.onchange = () => { rules[+e.dataset.i][+e.dataset.f] = e.value; saveRules(rules); });
    box.querySelectorAll('[data-del]').forEach(e => e.onclick = () => { rules.splice(+e.dataset.del, 1); saveRules(rules); draw(); });
    $('cAddR').onclick = () => { rules.push(['', '']); draw(); };
    $('cDefR').onclick = () => { rules.length = 0; RULES_DEF.forEach(x => rules.push(x.slice())); saveRules(rules); draw(); };
    $('cCalc').onclick = () => { props = buildProposals(rules).map(p => ({ ...p, on: !!p.k })); draw(); };
    box.querySelectorAll('[data-p]').forEach(e => e.onchange = () => { props[+e.dataset.p].on = e.checked; $('cApply').disabled = !props.some(p => p.on && p.k); });
    box.querySelectorAll('[data-pk]').forEach(e => e.onchange = () => { const p = props[+e.dataset.pk]; p.k = e.value || null; p.src = p.k ? 'manual' : ''; });
    $('cX').onclick = () => $('dlg').classList.remove('show');
    const ap = $('cApply'); if (ap) ap.onclick = () => {
      const todo = props.filter(p => p.on && p.k); if (!todo.length) return;
      pushUndo(); todo.forEach(p => { p.g.ifc = p.k; }); $('dlg').classList.remove('show'); refreshAll(); toast(todo.length + ' grups classificats.');
    };
  };
  draw(); $('dlg').classList.add('show');
}

/* ---------- guaitaBIMup 10: magnetisme als nivells en Empeny ---------- */
/* Només per a cares horitzontals: si el pla quedaria a prop d'una cota de nivell (radi en píxels), l'alçada s'hi ajusta. */
function pushSnap(d) {
  const none = { d, lvl: null };
  if (!OPT.snapPx || !st.f || !st.n || Math.abs(st.n[2]) < 0.999) return none;
  const cen = V.add(K.faceCentroid(st.c, st.f), st.off), nz = st.n[2];
  const mpp = 2 * CAM.dist * Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2)) / ((view && view.clientHeight) || 1);
  const tol = OPT.snapPx * mpp; let best = null;
  for (const L of S.model.levels) {
    if (L.hidden) continue;
    const zNew = cen[2] + nz * d; if (Math.abs(zNew - L.elev) > tol) continue;
    const dl = (L.elev - cen[2]) / nz;
    if (!best || Math.abs(dl - d) < Math.abs(best.d - d)) best = { d: Math.round(dl * 1000) / 1000, lvl: L };
  }
  return best || none;
}
/* Vincula l'element al nivell magnetitzat: dins d'un grup en edició, el grup; si és solt, es crea un grup amb la classe activa. */
function linkToLevel(c, face, lvl) {
  if (S.ctx.length) { c.level = lvl.id; return; }
  const g = K.makeGroup(S.model, c, connectedSel(c, face)); g.level = lvl.id; applyActive(g);
  clearSel(); S.sel.groups.add(g.id);
}
