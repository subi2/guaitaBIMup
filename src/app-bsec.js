/* ============================================================
   v25 · secció BIM: una línia en planta defineix un pla vertical
   i una vista «Secció N» amb càmera ortogonal al pla.
   · el segon clic fixa la línia; la mirada és la normal esquerra
     de A→B (cap a l’esquerra del traç). Commutador «Mira a l’altra cara».
   · profunditat: tot el model per defecte, o un límit definible.
   Les dades viuen a meta.bsecs {id, name, a, b, flip, depth}.
   ============================================================ */
const matBsec = lineMat({ color: 0xD2412F, linewidth: 2, dashed: true, dashSize: 0.3, gapSize: 0.15 });
function bsecs() { const m = S.model.meta; if (!Array.isArray(m.bsecs)) m.bsecs = []; return m.bsecs; }
function bsecOf(id) { return bsecs().find(v => String(v.id) === String(id)) || null; }
/* normal de mirada (n) i pla de tall: el model es talla a la línia i es mira des de −n */
function bsecFrame(v) { const d = V.norm([v.b[0] - v.a[0], v.b[1] - v.a[1], 0]); let n = [-d[1], d[0], 0]; if (v.flip) n = [-n[0], -n[1], 0]; return { d, n }; }
function bsecClips(v) {
  const F = bsecFrame(v), k = F.n[0] * v.a[0] + F.n[1] * v.a[1], cl = [];
  cl.push(new THREE.Plane(new THREE.Vector3(F.n[0], F.n[1], 0), -k));                       /* conserva (p−a)·n ≥ 0: la cara allunyada */
  if (v.depth > 0) cl.push(new THREE.Plane(new THREE.Vector3(-F.n[0], -F.n[1], 0), k + v.depth)); /* límit de profunditat */
  return { clips: cl, theta: Math.atan2(-F.n[1], -F.n[0]) };
}
function createBsec(a, b) {
  pushUndo(); const list = bsecs(), n = list.length + 1, v = { id: S.model.nid++, name: 'Secció ' + n, a: [a[0], a[1]], b: [b[0], b[1]], flip: false, depth: 0 };
  list.push(v); S.view = 'bsec:' + v.id; if (!S.tabs.includes(S.view)) S.tabs.push(S.view); openView(S.view); toast(v.name + ' creada. Commuta la cara amb el botó de la vista.');
}
function bsecBar() {
  let bar = $('bsecBar'); const v = S.view && String(S.view).startsWith('bsec:') ? bsecOf(String(S.view).slice(5)) : null;
  if (!v) { if (bar) bar.style.display = 'none'; return; }
  if (!bar) { bar = el('div'); bar.id = 'bsecBar'; bar.style.cssText = 'position:absolute;left:12px;top:96px;display:flex;gap:6px;align-items:center;background:rgba(20,22,26,.82);color:#fff;padding:6px 8px;border-radius:6px;font-size:12px;z-index:5'; $('viewWrap').appendChild(bar); }
  bar.style.display = 'flex'; bar.innerHTML = '';
  const f = el('button', 'btn sm', 'Mira a l’altra cara'); f.id = 'bsecFlip'; f.title = 'Commuta la cara de mirada de la secció'; f.onclick = () => { pushUndo(); v.flip = !v.flip; openView(S.view); }; bar.appendChild(f);
  const lab = el('span', '', 'Profunditat (m)'); bar.appendChild(lab);
  const dep = el('input'); dep.type = 'number'; dep.min = 0; dep.step = 0.5; dep.value = v.depth > 0 ? v.depth : ''; dep.placeholder = 'tot el model'; dep.id = 'bsecDepth'; dep.style.width = '90px';
  dep.onchange = () => { const x = parseFloat(dep.value); pushUndo(); v.depth = isFinite(x) && x > 0 ? x : 0; openView(S.view); }; bar.appendChild(dep);
}
function bsecPanel(b) {
  const list = bsecs();
  if (!list.length) { b.appendChild(el('div', 'empty', 'Cap secció. Usa l’eina Secció BIM i fes dos clics en planta.')); return; }
  for (const v of list) {
    const r = el('div', 'row' + (S.view === 'bsec:' + v.id ? ' on' : '')); r.style.flexWrap = 'wrap'; r.style.gap = '4px';
    r.appendChild(el('span', '', esc(v.name) + (v.flip ? ' · cara inversa' : '') + (v.depth > 0 ? ' · ' + fmt(v.depth) + ' m' : '')));
    const o = el('button', 'btn sm', 'Obre'); o.dataset.bsecOpen = v.id; o.onclick = () => openView('bsec:' + v.id); r.appendChild(o);
    const x = el('button', 'btn sm', '✕'); x.title = 'Esborra la secció'; x.onclick = () => { pushUndo(); bsecs().splice(bsecs().indexOf(v), 1); if (S.view === 'bsec:' + v.id) { S.tabs = S.tabs.filter(k => k !== 'bsec:' + v.id); S.view = null; S.viewClips = []; } refreshAll(); };
    r.appendChild(x); b.appendChild(r);
  }
}
TOOLS.bsec = {
  move(ev, mx, my) { const pk = pick(mx, my, { from: st.from, lock: LOCK }); st.pk = pk; clearPrev();
    if (st.from) { prevLine([[st.from[0], st.from[1], 0], [pk.p[0], pk.p[1], 0]], 0xD2412F); showTip(mx, my, pk, 'Secció · ' + fmtM(V.dist(st.from, pk.p)) + ' · clic final'); }
    else showTip(mx, my, pk, 'Secció BIM · clic inici del traç en planta'); },
  down(ev, mx, my) { const pk = pick(mx, my, { from: st.from, lock: LOCK }); if (!st.from) { st.from = [pk.p[0], pk.p[1]]; return; }
    if (V.dist(st.from, pk.p) < 0.05) return; createBsec(st.from, pk.p); st.from = null; LOCK = null; clearPrev(); },
  hintExtra: 'Dos clics en planta: el traç és el pla de tall · la mirada va cap a l’esquerra del traç · el commutador de la vista la inverteix.',
};
