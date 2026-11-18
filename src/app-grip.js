/* ============================================================
   v21 · edició directa en pantalla dels elements BIM (agafadors)
   · mur: extrems · forjat / llosa / coberta: vèrtexs i arestes
   · coberta per pendents: xip de pendent a cada aresta
   · coberta per cotes: cota de vèrtexs, arestes i punts interiors
   ============================================================ */
const GRIP = { list: [], drag: null, sel: null, raf: 0 };
function gripTarget() { if (S.tool === 'select' && !S.sel.groups.size && !S.sel.faces.size && !S.sel.edges.size && typeof annGripTarget === 'function') { const a = annGripTarget(); if (a) return a; } if (S.tool !== 'select' || S.sel.groups.size !== 1 || S.sel.faces.size || S.sel.edges.size) return null; const { c, off } = ctxInfo(), g = c.groups.get([...S.sel.groups][0]); return g && g.par && ['wall', 'slab', 'roof', 'strip', 'stair'].includes(g.par.type) ? { g, c, off } : null; }
function gripDefs(g, off) {
  const par = g.par, out = [], W = (q, z) => [q[0] + off[0], q[1] + off[1], z + off[2]], lvz = levelElev(S.model, par.lv);
  if (par.type === 'wall' || par.type === 'strip') { const z = par.type === 'wall' ? parZ(S.model, par).base : lvz + (par.off || 0); for (const k of ['a', 'b']) out.push({ key: 'w' + k, cls: 'v', p: W(par[k], z), mode: 'xy', z, title: 'Arrossega l’extrem (s’enganxa a punts del model)', set: q => { par[k] = q; } }); return out; }
  if (par.type === 'stair') { const z = parZ(S.model, par).base, a = (par.rot || 0) * Math.PI / 180, u = [Math.cos(a), Math.sin(a)], I = stairCalc(S.model, par), L = Math.max(0.5, (I.n1 - 1) * par.g), q = [par.p[0] + u[0] * L, par.p[1] + u[1] * L];
    out.push({ key: 'sp', cls: 'v', p: W(par.p, z), mode: 'xy', z, title: 'Arrossega el peu de l’escala (s’enganxa a punts del model)', set: r => { par.p = r; } });
    out.push({ key: 'sd', cls: 'e', p: W(q, z + I.n1 * I.R), mode: 'xy', z, title: 'Arrossega per girar la direcció de pujada', set: r => { par.rot = +(Math.atan2(r[1] - par.p[1], r[0] - par.p[0]) * 180 / Math.PI).toFixed(3); } }); return out; }
  const n = par.pts.length, roof = par.type === 'roof'; if (roof) roofFix(par);
  const zb = lvz + (par.off || 0), ptsMode = roof && par.mode === 'pts', zt = i => ptsMode ? zb + par.t + (par.dz[i] || 0) : zb;
  const delV = i => { if (par.pts.length <= 3) { toast('Un perímetre necessita almenys tres vèrtexs.'); return; } pushUndo(); par.pts.splice(i, 1); if (roof) { par.sl.splice(i, 1); par.dz.splice(i, 1); } refreshAll(); };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = par.pts[i], b = par.pts[j], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (ptsMode) {
      out.push({ key: 'z' + i, cls: 'z', p: W(a, zt(i)), mode: 'z', alt: 'xy', z: zt(i), label: () => fmtSigned(par.dz[i] || 0), get: () => par.dz[i] || 0, setZ: v => { par.dz[i] = v; }, set: q => { par.pts[i] = q; }, del: () => delV(i), title: 'Arrossega: cota del vèrtex · Maj+arrossega: posició · clic al valor: escriu la cota · Alt+clic: esborra' });
      out.push({ key: 'ze' + i, cls: 'ze', p: W(m, (zt(i) + zt(j)) / 2), mode: 'z', z: (zt(i) + zt(j)) / 2, label: () => fmtSigned(((par.dz[i] || 0) + (par.dz[j] || 0)) / 2), get: () => ((par.dz[i] || 0) + (par.dz[j] || 0)) / 2, setZ: v => { par.dz[i] = v; par.dz[j] = v; }, split: () => splitE(i), title: 'Arrossega: cota de l’aresta (els dos extrems) · doble clic: afegeix un vèrtex' });
    } else {
      out.push({ key: 'v' + i, cls: 'v', p: W(a, zb), mode: 'xy', z: zb, set: q => { par.pts[i] = q; }, del: () => delV(i), title: 'Arrossega el vèrtex · Alt+clic: esborra' });
      const e = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(e[0], e[1]) || 1, nn = [e[1] / l, -e[0] / l], a0 = a.slice(), b0 = b.slice();
      out.push({ key: 'e' + i, cls: 'e', p: W(m, zb), mode: 'xy', z: zb, set: q => { const d = (q[0] - m[0]) * nn[0] + (q[1] - m[1]) * nn[1]; par.pts[i] = [a0[0] + nn[0] * d, a0[1] + nn[1] * d]; par.pts[j] = [b0[0] + nn[0] * d, b0[1] + nn[1] * d]; }, split: () => splitE(i), title: 'Arrossega l’aresta en paral·lel · doble clic: afegeix un vèrtex' });
      if (roof) { const s = par.sl[i]; out.push({ key: 's' + i, cls: 'chip' + (s.on ? ' on' : ''), p: W(m, zb), slope: s, label: () => (s.on ? slopeFmt(s.v, OPT.slopeUnit || 'pct') : 'pla'), title: 'Clic al triangle: activa o desactiva el pendent d’aquesta aresta · clic al valor: escriu-lo (30 · 30% · 16.7° · 1/3)' }); }
    }
  }
  function splitE(i) { pushUndo(); const j = (i + 1) % par.pts.length, a = par.pts[i], b = par.pts[j]; par.pts.splice(i + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); if (roof) { par.sl.splice(i + 1, 0, { ...par.sl[i] }); par.dz.splice(i + 1, 0, ((par.dz[i] || 0) + (par.dz[j] || 0)) / 2); } refreshAll(); }
  if (ptsMode) par.extra.forEach((e, i) => out.push({ key: 'x' + i, cls: 'z x', p: W(e.p, zb + par.t + (e.z || 0)), mode: 'z', alt: 'xy', z: zb + par.t + (e.z || 0), label: () => fmtSigned(e.z || 0), get: () => e.z || 0, setZ: v => { e.z = v; }, set: q => { e.p = q; }, del: () => { pushUndo(); par.extra.splice(i, 1); refreshAll(); }, title: 'Punt de cota · arrossega: cota · Maj+arrossega: posició · Alt+clic: esborra' }));
  return out;
}
function fmtSigned(v) { return (v > 0 ? '+' : v < 0 ? '−' : '±') + fmt(Math.abs(v)); }
function gripsRebuild() {
  let box = $('grips'); if (!box) { box = el('div'); box.id = 'grips'; $('viewWrap').appendChild(box); }
  box.innerHTML = ''; GRIP.list = []; const t = gripTarget(); if (!t) { GRIP.sel = null; return; }
  for (const d of (t.ann ? annGripDefs(t) : gripDefs(t.g, t.off))) {
    const e = el('div', 'grip ' + d.cls + (GRIP.sel === d.key ? ' sel' : '') + (GRIP.drag && GRIP.drag.key === d.key ? ' drag' : '')); e.dataset.grip = d.key; e.title = d.title || '';
    if (d.slope) { const tg = el('button', 'tg', '◣'); tg.dataset.gtoggle = d.key; tg.onpointerdown = ev => ev.stopPropagation(); tg.onclick = ev => { ev.stopPropagation(); pushUndo(); d.slope.on = !d.slope.on; if (d.slope.on && !(d.slope.v > 0)) d.slope.v = OPT.roofSlope; GRIP.sel = d.key; refreshAll(); }; e.appendChild(tg); }
    if (d.label) { const lb = el('span', 'gv', esc(d.label())); lb.dataset.gval = d.key; lb.onpointerdown = ev => ev.stopPropagation(); lb.onclick = ev => { ev.stopPropagation(); gripEdit(d, lb); }; e.appendChild(lb); }
    if (d.mode) { e.onpointerdown = ev => gripDown(ev, d); e.ondblclick = ev => { ev.stopPropagation(); if (d.split) d.split(); }; } else e.onpointerdown = ev => { ev.stopPropagation(); GRIP.sel = d.key; };
    box.appendChild(e); GRIP.list.push({ el: e, d });
  }
  gripsUpdate();
}
function gripsUpdate() { if (GRIP.tool !== S.tool) { GRIP.tool = S.tool; gripsRebuild(); return; } for (const G of GRIP.list) { const s = toScreen(G.d.p), vis = s.z > -1 && s.z < 1; G.el.style.display = vis ? '' : 'none'; if (vis) { G.el.style.left = s.x + 'px'; G.el.style.top = s.y + 'px'; } } }
function gripApplyValue(d, txt) {
  if (d.slope) { const v = slopeParse(txt, OPT.slopeUnit || 'pct'); if (v == null || v > 1000) { toast('Pendent no vàlid. Exemples: 30 · 30% · 16.7° · 1/3'); return false; } pushUndo(); d.slope.v = +v.toFixed(4); d.slope.on = v > 0; refreshAll(); return true; }
  if (d.setZ) { const s = String(txt).trim().replace('−', '-'), v = parseNum(s.replace(/^\+/, '')); if (v == null) { toast('Cota no vàlida.'); return false; } pushUndo(); d.setZ(v); refreshAll(); return true; }
  return false;
}
function gripEdit(d, lb) {
  GRIP.sel = d.key; const i = el('input'); i.type = 'text'; i.className = 'gin'; i.value = lb.textContent.replace('pla', String(OPT.roofSlope)); lb.replaceWith(i); i.focus(); i.select(); let done = false;
  const end = ok => { if (done) return; done = true; if (!ok || !gripApplyValue(d, i.value)) gripsRebuild(); };
  i.onpointerdown = ev => ev.stopPropagation(); i.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') end(true); else if (ev.key === 'Escape') end(false); }; i.onblur = () => end(true);
}
function gripVcb(txt) { if (S.tool !== 'select' || !GRIP.sel) return false; const G = GRIP.list.find(x => x.d.key === GRIP.sel); if (!G || !(G.d.slope || G.d.setZ)) return false; gripApplyValue(G.d, txt); return true; }
function gripDown(ev, d) {
  if (ev.button !== 0) return; ev.stopPropagation(); ev.preventDefault(); GRIP.sel = d.key;
  if (ev.altKey && d.del) { d.del(); return; }
  const r = view.getBoundingClientRect(), mode = ev.shiftKey && d.alt ? d.alt : d.mode, t = gripTarget(); if (!t) return;
  const s0 = toScreen(d.p), s1 = toScreen([d.p[0], d.p[1], d.p[2] + 1]), u = [s1.x - s0.x, s1.y - s0.y], uu = u[0] * u[0] + u[1] * u[1];
  if (mode === 'z' && uu < 4) { toast('En aquesta vista la vertical no es pot arrossegar: gira la vista o escriu la cota.'); return; }
  GRIP.drag = { key: d.key, mode, d, off: t.off, m0: [ev.clientX - r.left, ev.clientY - r.top], v0: d.get ? d.get() : 0, moved: false, undo: false, last: null };
  document.addEventListener('pointermove', gripMove); document.addEventListener('pointerup', gripUp, { once: true });
}
function gripMove(ev) {
  const D = GRIP.drag; if (!D) return; const r = view.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top; if (!D.moved && Math.hypot(mx - D.m0[0], my - D.m0[1]) < 3) return;
  if (!D.undo) { pushUndo(); D.undo = true; } D.moved = true; let tip = '';
  if (D.mode === 'z') { const s0 = toScreen(D.d.p), s1 = toScreen([D.d.p[0], D.d.p[1], D.d.p[2] + 1]), u = [s1.x - s0.x, s1.y - s0.y], uu = u[0] * u[0] + u[1] * u[1] || 1; let v = D.v0 + ((mx - D.m0[0]) * u[0] + (my - D.m0[1]) * u[1]) / uu; if (!ev.ctrlKey) v = Math.round(v * 100) / 100; D.d.setZ(v); D.last = v; tip = 'Cota ' + fmtSigned(v) + ' m'; }
  else { const ray = mouseRay(mx, my), z = D.d.z + D.off[2]; let q = null; if (Math.abs(ray.d[2]) > 1e-6) { const k = (z - ray.o[2]) / ray.d[2]; q = [ray.o[0] + ray.d[0] * k, ray.o[1] + ray.d[1] * k]; }
    const pk = ev.ctrlKey ? null : gripSnap(mx, my, D.d); if (pk) { q = [pk.p[0], pk.p[1]]; tip = pk.label; } if (!q) return; if (!pk) q = [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000];
    D.d.set([q[0] - D.off[0], q[1] - D.off[1]]); D.last = q; }
  if (!GRIP.raf) GRIP.raf = requestAnimationFrame(() => { GRIP.raf = 0; refreshAll(); if (tip) { const G = GRIP.list.find(x => x.d.key === D.key); if (G) { const tp = el('span', 'gtip', esc(tip)); G.el.appendChild(tp); } } });
}
/* enganxament a extrems i punts mitjos del model que no siguin de l'element que s'edita */
function gripSnap(mx, my, d) { const t = gripTarget(), own = t ? t.g : null; let best = null, bd = 11; const sd = p => { const s = toScreen(p); return s.z > 1 ? Infinity : Math.hypot(s.x - mx, s.y - my); };
  for (const e of SNAP.edges) { if (e.c === own) continue; for (const [p, lab] of [[e.a, 'Final'], [e.b, 'Final'], [V.lerp(e.a, e.b, 0.5), 'Punt mig']]) { const dd = sd(p); if (dd < bd) { bd = dd; best = { p, label: lab }; } } }
  if (S.show.grids) { const G = guides(); for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) { const a = G[i], b = G[j], x = lineX(a.a, [a.b[0] - a.a[0], a.b[1] - a.a[1]], b.a, [b.b[0] - b.a[0], b.b[1] - b.a[1]]); if (!x) continue; const dd = sd([x[0], x[1], d.z]); if (dd < bd) { bd = dd; best = { p: x, label: 'Intersecció ' + a.name + '–' + b.name }; } } }
  return best; }
function gripUp() { document.removeEventListener('pointermove', gripMove); const D = GRIP.drag; GRIP.drag = null; if (GRIP.raf) { cancelAnimationFrame(GRIP.raf); GRIP.raf = 0; } if (D && D.moved) refreshAll(); else for (const G of GRIP.list) G.el.classList.toggle('sel', G.d.key === GRIP.sel); }
