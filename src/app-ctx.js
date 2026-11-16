/* ============================================================
   guaitaBIMup 10 — menú contextual (clic dret curt)
   ============================================================ */
(function () { const d = el('div'); d.id = 'ctx'; document.body.appendChild(d); })();
function closeCtx() { const d = $('ctx'); if (d) d.classList.remove('show'); }
document.addEventListener('pointerdown', ev => { if (!ev.target.closest('#ctx')) closeCtx(); }, true);
window.addEventListener('blur', closeCtx);
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeCtx(); });
function flipSel() {
  const { c } = ctxInfo(); if (!S.sel.faces.size) return; pushUndo();
  for (const id of S.sel.faces) { const f = c.faces.get(id); if (!f) continue; f.loop.reverse(); f.holes.forEach(h => h.reverse()); f.n = f.n.map(x => -x); }
  refreshAll(); toast('Normal invertida.');
}
function selectedGroups() { const { c } = ctxInfo(); return [...S.sel.groups].map(id => c.groups.get(id)).filter(Boolean); }
function openCtx(ev, mx, my) {
  let en = null; try { en = pickEntity(mx, my); } catch (e) { en = null; }
  if (en && en.type !== 'outside') { const set = S.sel[en.type + 's']; if (!set.has(en.id)) { clearSel(); set.add(en.id); refreshSel(); } }
  else if (!en || en.type === 'outside') { /* buit: manté la selecció */ }
  const items = []; const P = en && en.type !== 'outside' ? en.type : null;
  const gs = selectedGroups(), L = S.model.levels.slice().sort((a, b) => b.elev - a.elev);
  const lvSub = fn => L.map(l => ({ l: l.name + '  ' + fmtElev(l.elev), f: () => fn(l) }));
  if (P === 'group' || (gs.length && P !== 'face' && P !== 'edge')) {
    items.push({ l: 'Edita el grup', sc: 'Intro', f: () => { if (gs[0]) { S.ctx.push(gs[0].id); clearSel(); refreshAll(); } } }, { l: 'Explota el grup', f: doExplode }, { sep: 1 });
    items.push({ l: 'Classe IFC', sub: [{ l: '— sense classificar (esbós)', f: () => { pushUndo(); gs.forEach(g => g.ifc = null); refreshAll(); } }, ...IFC.map(r => ({ l: r[1] + '  ·  ' + r[0], f: () => { pushUndo(); gs.forEach(g => g.ifc = r[0]); refreshAll(); }, ck: () => gs.length && gs.every(g => g.ifc === r[0]) }))] });
    items.push({ l: 'Assigna al nivell', sub: lvSub(l => { pushUndo(); gs.forEach(g => g.level = l.id); refreshAll(); toast('Assignat a ' + l.name + '.'); }) });
    items.push({ l: 'Etiqueta', sub: S.model.tags.map(t => ({ l: t.name, f: () => { pushUndo(); gs.forEach(g => g.tag = t.id); refreshAll(); }, ck: () => gs.length && gs.every(g => g.tag === t.id) })) }, { sep: 1 });
    if (gs.length >= 2) items.push({ l: 'Sòlids (booleanes)', sub: BOOL_ITEMS() });
    items.push({ l: 'Mou al nivell actiu', f: () => toLevel('move') }, { l: 'Copia al nivell actiu', f: () => toLevel('copy') }, { sep: 1 });
    items.push({ l: 'Mou', sc: 'M', f: () => setTool('move') }, { l: 'Gira', sc: 'Q', f: () => setTool('rotate') }, { l: 'Escala', sc: 'S', f: () => setTool('scale') }, { sep: 1 });
    items.push({ l: 'Esborra', sc: 'Supr', f: doDelete });
  } else if (P === 'face') {
    items.push({ l: 'Empeny/tira', sc: 'P', f: () => setTool('pushpull') }, { l: 'Desfasament', sc: 'F', f: () => setTool('offset') }, { l: 'Follow Me', sc: 'W', f: () => setTool('followme') }, { l: 'Pinta', sc: 'B', f: () => setTool('paint') }, { sep: 1 });
    items.push({ l: 'Selecciona les cares connectades', f: () => { const { c } = ctxInfo(); const f0 = c.faces.get(en.id); if (f0) { S.sel = connectedSel(c, f0); refreshSel(); } } });
    items.push({ l: 'Inverteix la normal', f: flipSel }, { l: 'Crea grup', sc: 'Ctrl+G', f: doGroup });
    items.push({ l: 'Pla de secció aquí', f: () => { const { c, off } = ctxInfo(); const f = c.faces.get(en.id); if (!f) return; pushUndo(); const o = en.hit ? en.hit.p : V.add(K.P(c, f.loop[0]), off); S.model.sections.push({ id: S.model.nid++, name: 'Secció ' + (S.model.sections.length + 1), o: o.slice(), n: f.n.slice(), on: true, flip: false }); applyClips(); refreshAll(); } }, { sep: 1 });
    items.push({ l: 'Esborra', sc: 'Supr', f: doDelete });
  } else if (P === 'edge') {
    items.push({ l: 'Mou', sc: 'M', f: () => setTool('move') }, { l: 'Cinta mètrica', sc: 'T', f: () => setTool('tape') }, { l: 'Crea grup', sc: 'Ctrl+G', f: doGroup }, { sep: 1 }, { l: 'Esborra', sc: 'Supr', f: doDelete });
  } else {
    items.push({ l: 'Projecció', sub: Object.keys(P_).map(k => ({ l: P_[k], f: () => setProj(k), ck: () => CAM.proj === k })) });
    items.push({ l: 'Vistes', sub: [['Dalt', [0, 0, 1]], ['Davant', [0, -1, 0]], ['Darrere', [0, 1, 0]], ['Dreta', [1, 0, 0]], ['Esquerra', [-1, 0, 0]], ['Baix', [0, 0, -1]], ['Isomètrica', [1, -1, 1]]].map(([l, dd]) => ({ l, f: () => goDir(dd) })) });
    items.push({ l: 'Ajusta el model', sc: 'Maj+Z', f: () => fitView() }, { sep: 1 });
    items.push({ l: 'Desfés', sc: 'Ctrl+Z', f: undo }, { l: 'Refés', sc: 'Ctrl+Y', f: redo }, { l: 'Selecciona-ho tot', sc: 'Ctrl+A', f: selectAll }, { sep: 1 });
    items.push({ l: 'Nou nivell aquí', f: () => { createLevel(Math.round(((S.model.levels.find(l => l.id === S.level) || { elev: 0 }).elev + 3) * 1000) / 1000); } });
    items.push({ l: 'Nivell de treball', sub: lvSub(l => setLevel(l.id)).map(i => { const l = L.find(x => i.l.startsWith(x.name + '  ')); return { ...i, ck: () => l && l.id === S.level }; }) });
    if (S.ctx.length) items.push({ sep: 1 }, { l: 'Surt del grup', sc: 'Esc', f: exitCtx });
  }
  const d = $('ctx'); d.innerHTML = ''; d.classList.remove('flip'); mkItems(items, d, closeCtx);
  d.classList.add('show'); const r = d.getBoundingClientRect();
  let x = ev.clientX, y = ev.clientY; if (x + r.width > innerWidth - 4) x = innerWidth - r.width - 4; if (y + r.height > innerHeight - 4) y = Math.max(4, innerHeight - r.height - 4);
  d.style.left = x + 'px'; d.style.top = y + 'px'; if (x + r.width + 220 > innerWidth) d.classList.add('flip');
}
