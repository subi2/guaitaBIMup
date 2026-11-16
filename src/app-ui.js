/* ============================================================
   guaitaBIMup 10 — interfície: ideogrames, menús, safata,
   fitxers (JSON / OBJ), dreceres i arrencada
   ============================================================ */
/* ---------- ideogrames: [gris, lime, farciment, punts] ---------- */
const G = {
  select: ['M5 3v15l4-4 3 6 2-1-3-6h6z', '', '', []],
  eraser: ['M3 20h18', 'M7 15l7-9 5 4-6 9H8z M10 12l5 4', '', []],
  paint: ['M4 20h6', 'M6 14l8-8 4 4-8 8H6z M16 4l4 4', '', []],
  line: ['M4 20L20 4', 'M4 20L20 4', '', [[4, 20], [20, 4]]],
  wall: ['', 'M4 9h16v6H4z', 'M4 9h16v6H4z', [[4, 9], [20, 15]]],
  slab: ['', 'M3 14h18v4H3z', 'M3 14h18v4H3z', [[3, 14], [21, 18]]],
  comp: ['M12 3v18M3 12h18', 'M5 5h14v14H5z', 'M5 5h14v14H5z', [[5, 5], [19, 19]]],
  roof: ['M3 13L12 5l9 8', 'M3 13L12 5l9 8v3L12 8l-9 8z', 'M3 13L12 5l9 8v3L12 8l-9 8z', [[3, 13], [12, 5], [21, 13]]],
  roofpt: ['M12 8v8M8 12h8', '', '', [[12, 12]]],
  matf: ['M3 20h18', 'M3 15h18v5H3z', 'M3 15h18v5H3z', [[3, 15], [21, 20]]],
  pad: ['', 'M10 4h4v10h-4zM5 14h14v6H5z', 'M5 14h14v6H5z', [[5, 14], [19, 20]]],
  strip: ['', 'M9 4h6v10H9zM3 14h18v6H3z', 'M3 14h18v6H3z', [[3, 14], [21, 20]]],
  bsec: ['', 'M4 12h16', 'M4 12h16', [[4, 12], [20, 12]]],
  stair: ['', 'M4 20h4v-4h4v-4h4V8h4v12z', 'M4 20h4v-4h4v-4h4V8h4v12z', [[4, 20], [20, 8]]],
  column: ['', 'M9 4h6v16H9z', 'M9 4h6v16H9z', [[9, 4], [15, 20]]],
  opening: ['', 'M4 4h16v16H4zM9 10h6v10H9z', 'M4 4h16v16H4z', [[4, 4], [20, 20]]],
  rect: ['', 'M4 7h16v10H4z', 'M4 7h16v10H4z', [[4, 7], [20, 17]]],
  circle: ['', 'M12 4a8 8 0 1 0 0.01 0', 'M12 4a8 8 0 1 0 0.01 0', [[12, 12]]],
  poly: ['', 'M12 3l8 6-3 10H7L4 9z', 'M12 3l8 6-3 10H7L4 9z', []],
  arc: ['M4 18h16', 'M4 18Q12 2 20 18', '', [[4, 18], [20, 18]]],
  pushpull: ['M4 18l8-3 8 3-8 3zM4 18v-6M20 18v-6M12 21v-6', 'M4 12l8-3 8 3-8 3zM12 7V1.5M9.5 4L12 1.5 14.5 4', 'M4 12l8-3 8 3-8 3z', []],
  move: ['M12 3v18M3 12h18', 'M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3', '', []],
  offset: ['M5 6h14v12H5z', 'M9 10h6v4H9z', '', []],
  tape: ['M3 17l12-12 4 4L7 21z', 'M6 14l2 2M9 11l2 2M12 8l2 2', '', []],
  orbit: ['M12 3a9 9 0 1 0 9 9', 'M12 8l4 4-4 4-4-4z', '', []],
  pan: ['M12 3v18M3 12h18', 'M9 9l3-3 3 3M9 15l3 3 3-3', '', []],
  zoom: ['M10 4a6 6 0 1 0 0.01 0', 'M15 15l5 5', '', []],
  level: ['M3 19h18M7 19V11M5 13l2-2 2 2', 'M3 9h13.5M16.5 9a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0', '', []],
  grid: ['M4 12v10M20 12v10', 'M12 8.5V22M8.5 5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0', '', []],
  ifc: ['M4 8l8-4 8 4v9l-8 4-8-4z', 'M4 8l8 4 8-4M12 12v9', '', []],
  group: ['M4 4h16v16H4z', 'M8 8h8v8H8z', '', []],
  undo: ['', 'M9 7L4 12l5 5M4 12h10a6 6 0 0 1 0 8', '', []],
  redo: ['', 'M15 7l5 5-5 5M20 12H10a6 6 0 0 0 0 8', '', []],
  selbar: ['M4 5h16l-6 7v6l-4 2v-8z', '', '', []],
  fit: ['M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5', 'M9 9h6v6H9z', '', []],
  save: ['M5 4h11l3 3v13H5z', 'M8 4v5h7V4M8 20v-6h8v6', '', []],
  open: ['M3 7h7l2 2h9v10H3z', '', '', []],
  scene: ['M3 6h18v12H3z', 'M8 12l2.5 3L14 10l4 6', '', []],
  rotate: ['M5 17a8 8 0 0 1 14 0', 'M5 17a8 8 0 0 1 14 0M19 17l-3-1M19 17l1-3', '', [[12, 17]]],
  scale: ['M4 20h9v-9H4z', 'M13 11l7-7M14 4h6v6', '', []],
  followme: ['M4 20h16', 'M6 17a2 2 0 1 0 0.01 0M8 16l8-8M16 8a2 2 0 1 0 0.01 0M18 6l2-2', '', []],
  dimension: ['M4 18v-8M20 18v-8', 'M4 14h16M4 14l3-2M4 14l3 2M20 14l-3-2M20 14l-3 2', '', []],
  protractor: ['M3 19h18', 'M3 19a9 9 0 0 1 18 0M12 19l6-6', '', []],
  text: ['', 'M5 6h14M12 6v13M9 19h6', '', []],
  section: ['M4 7l8-3 8 3v10l-8 3-8-3z', 'M3 12h18', '', []],
  zoomwin: ['M4 4h10v10H4z M20 20l-5-5', 'M7 7h4v4H7z', '', []],
  prev: ['', 'M8 5L3 10l5 5M3 10h11a6 6 0 0 1 0 9', '', []],
  rrect: ['', 'M5 15l5-9 10 5-5 9z', 'M5 15l5-9 10 5-5 9z', [[5, 15], [10, 6]]],
  freehand: ['', 'M3 16c3-8 5 4 8-2s5-6 10-2', '', []],
  refplane: ['M4 19h16', 'M5 5l14 0M5 5v10M19 5v10M5 15h14', '', []],
  pconic: ['M3 17l9-12 9 12', 'M7 17l5-7 5 7', '', []],
  paxo: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M12 12l8-4.5M12 12v9M12 12L4 7.5', '', []],
  pcav: ['M5 9h10v10H5z', 'M5 9l5-4h10v10l-5 4M15 9l5-4', '', []],
  pmil: ['M5 12h10v8H5z', 'M5 12l5-6h10l-5 6M15 12l5-6', '', []],
};
function ico(name, cls) {
  const g = G[name]; if (!g) return '';
  let s = '<svg viewBox="0 0 24 24" aria-hidden="true">';
  if (g[2]) s += '<path class="f" d="' + g[2] + '"/>';
  if (g[0]) s += '<path class="g" d="' + g[0] + '"/>';
  if (g[1]) s += '<path class="a" d="' + g[1] + '"/>';
  for (const p of g[3]) s += '<circle class="p" cx="' + p[0] + '" cy="' + p[1] + '" r="2"/>';
  return s + '</svg>';
}

/* ---------- eines: nom, etiqueta, drecera, ajuda ---------- */
const TOOLINFO = {
  select: ['Selecciona', 'Espai', 'Clic · Ctrl afegeix · Maj alterna · Ctrl+Maj treu · doble clic: entra al grup · triple clic: tot el connectat · Tab: cadena adjacent · caixa (dreta→esq. creuada).'],
  eraser: ['Esborra', 'E', 'Clic o arrossega sobre arestes i grups per esborrar-los.'],
  paint: ['Pinta', 'B', 'Clic en una cara o grup per aplicar el material actiu · Alt: recull el material.'],
  rotate: ['Gira', 'Q', 'Clic al centre, clic a l’origen de l’angle i clic a l’angle · fletxes: eix de gir · Ctrl: copia · escriu graus i Intro.'],
  scale: ['Escala', 'S', 'Selecciona, clic al punt fix, clic al punt de referència i clic al nou punt · o escriu el factor (p. ex. 2 o 0,5).'],
  followme: ['Follow Me', 'W', 'Selecciona les arestes del camí i fes clic a la cara del perfil.'],
  dim: ['Cota', 'D', 'Clic a dos punts i un tercer per situar la línia de cota.'],
  protr: ['Transportador', 'J', 'Clic al vèrtex, clic al primer costat i clic al segon: mostra l’angle.'],
  text: ['Text', 'X', 'Clic al punt i escriu el text.'],
  section: ['Pla de secció', 'N', 'Clic en una cara: crea un pla de secció que talla el model (activa/inverteix a la safata).'],
  zoomwin: ['Zoom finestra', 'Y', 'Arrossega una finestra per acostar-hi la vista.'],
  rrect: ['Rectangle girat', 'V', 'Dos clics per a un costat i un tercer per a l’amplada.'],
  freehand: ['A mà alçada', 'K', 'Arrossega per dibuixar una polilínia lliure.'],
  refplane: ['Pla de referència', 'RP', 'Clic al punt inicial i al final: pla vertical d’ajuda que també atrau la inferència.'],
  slab: ['Forjat', 'Maj+F', 'Dos clics: rectangle · Maj+clic: contorn punt a punt · gruix al VCB · el forjat es vincula al nivell actiu (cara superior).'],
  matf: ['Llosa de fonamentació', '', 'Dos clics: rectangle · Maj+clic: contorn punt a punt · gruix al VCB · cara superior al nivell actiu.'],
  pad: ['Sabata aïllada', '', 'Clic sobre un pilar: sabata centrada a sota · clic en un punt: sabata lliure · «amplada;llargada;cantell» al VCB.'],
  strip: ['Sabata correguda', '', 'Clic sobre un mur: sabata sota tot el mur · dos clics: tram lliure · «amplada;cantell» al VCB.'],
  roof: ['Coberta', 'Maj+C', 'Clic sobre un mur d’un recinte, un forjat o un grup · o dos clics (rectangle) · Maj+clic: contorn. Neix plana; el pendent de cada aresta es defineix al panell.'],
  roofpt: ['Punt de cota de coberta', '', 'Clic dins de la coberta seleccionada.'],
  comp: ['Component', '', 'Portes i finestres: clic sobre un mur · components lliures: clic al punt d’inserció. Tria’l al panell «Components».'],
  compax: ['Eixos del component', '', 'Dos clics sobre una instància: origen i direcció X (l’amplada de la porta o finestra).'],
  bsec: ['Secció BIM', '', 'Dos clics en planta: el traç és el pla de tall i la mirada va cap a l’esquerra del traç. Commutador i profunditat a la vista.'],
  stair: ['Escala', 'Maj+E', 'Clic al peu del primer graó i clic en la direcció de pujada · arriba al nivell de sobre · «I», «L» o «U» al VCB.'],
  column: ['Pilar', 'Maj+P', 'Clic a la posició · secció «amplada;fondària» al VCB · alçada fins al nivell superior.'],
  opening: ['Obertura', 'Maj+O', 'Clic sobre un mur · «amplada;alçada;ampit» al VCB · el forat es resta dinàmicament.'],
  wall: ['Mur', 'U', 'Clic inici i final de l’eix · gruix al VCB · alçada i justificació segons Opcions · els murs s’uneixen sols.'],
  line: ['Línia', 'L', 'Clic al punt inicial i al final · fletxes: bloqueja eix · escriu una longitud i Intro.'],
  rect: ['Rectangle', 'R', 'Clic a la primera cantonada i a l’oposada · escriu «amplada;fondària».'],
  circle: ['Cercle', 'C', 'Clic al centre i al radi · escriu el radi, o «12s» per canviar els segments.'],
  poly: ['Polígon', 'G', 'Clic al centre i al radi · escriu «6s» per canviar els costats.'],
  arc: ['Arc', 'A', 'Dos punts de la corda i un tercer pel bombament.'],
  pushpull: ['Empeny/Estira', 'P', 'Clic a una cara, mou i clic · escriu la distància i Intro.'],
  move: ['Mou/Copia', 'M', 'Selecciona, clic al punt base i al destí · Ctrl: copia · escriu distància o «x3».'],
  offset: ['Equidistància', 'F', 'Clic a una cara i arrossega per crear el contorn paral·lel.'],
  tape: ['Cinta mètrica', 'T', 'Clic a dos punts per mesurar la distància.'],
  imgcal: ['Calibra imatge', '', 'Clica dos punts de la imatge amb distància coneguda.'], imgmove: ['Mou imatge', '', 'Clica el punt d’origen i el de destí.'],
  orbit: ['Òrbita', 'O', 'Arrossega per girar la vista (roda central també).'],
  pan: ['Desplaça', 'H', 'Arrossega per desplaçar la vista (Maj + roda central també).'],
  zoom: ['Zoom', 'Z', 'Arrossega amunt o avall (la roda també fa zoom).'],
  level: ['Nivell', 'LL', 'Clic a una cota o escriu l’elevació (m) i Intro: crea el nivell i la seva planta.'],
  grid: ['Eix de pilars', 'GR', 'Clic al punt inicial i al final · escriu una distància per crear-ne un de paral·lel.'],
  ifc: ['Classifica IFC', 'I', 'Clic a un grup o cara per assignar-hi la classe IFC activa · Alt: recull la classe.'],
};
const KEYMAP = { u: 'wall', q: 'rotate', s: 'scale', w: 'followme', d: 'dim', j: 'protr', x: 'text', n: 'section', y: 'zoomwin', v: 'rrect', k: 'freehand', ' ': 'select', e: 'eraser', b: 'paint', l: 'line', r: 'rect', c: 'circle', g: 'poly', a: 'arc', p: 'pushpull', m: 'move', f: 'offset', t: 'tape', o: 'orbit', h: 'pan', z: 'zoom', i: 'ifc' };
const TOOLBAR = [['select', 'eraser', 'paint'], ['line', 'freehand', 'rect', 'rrect', 'circle', 'poly', 'arc'], ['pushpull', 'move', 'rotate', 'scale', 'followme', 'offset'], ['tape', 'dim', 'protr', 'text', 'section'], ['orbit', 'pan', 'zoom', 'zoomwin'], ['level', 'grid', 'refplane', 'wall', 'column', 'slab', 'roof', 'stair', 'opening', 'comp', 'bsec', 'matf', 'pad', 'strip', 'ifc']];
const RAIL = [['Selecció', ['select', 'eraser', 'paint']], ['Dibuix', ['line', 'freehand', 'rect', 'rrect', 'circle', 'poly', 'arc']], ['Modificació', ['pushpull', 'move', 'rotate', 'scale', 'followme', 'offset']], ['Mesura', ['tape', 'dim', 'protr', 'text', 'section']], ['Navegació', ['orbit', 'pan', 'zoom', 'zoomwin']], ['BIM · referències', ['level', 'grid', 'refplane']], ['BIM · elements', ['wall', 'column', 'slab', 'roof', 'stair', 'opening', 'comp', 'bsec']], ['BIM · fonaments', ['matf', 'pad', 'strip']], ['BIM · classificació', ['ifc']]];

function toolBtn(name) {
  const b = el('button', 'tb', ico(name)); b.dataset.tool = name; const i = TOOLINFO[name]; b.title = i[0] + ' (' + i[1] + ')'; b.setAttribute('aria-label', i[0]);
  b.onclick = () => setTool(name); return b;
}
function buildBars() {
  const tb = $('toolbar'); tb.innerHTML = '';
  TOOLBAR.forEach(grp => { const g = el('div', 'tgrp'); grp.forEach(n => g.appendChild(toolBtn(n))); tb.appendChild(g); });
  const ga = el('div', 'tgrp');
  [['prev', 'Vista anterior', prevView], ['undo', 'Desfés (Ctrl+Z)', undo], ['redo', 'Refés (Ctrl+Y)', redo], ['group', 'Agrupa (Ctrl+G)', doGroup], ['selbar', 'Selecció per propietats (Ctrl+Maj+F)', () => toggleSelBar()], ['fit', 'Ajusta la vista (Maj+Z)', () => fitView()], ['scene', 'Desa escena', saveScene], ['open', 'Obre (Ctrl+O)', openFile], ['save', 'Desa (Ctrl+S)', saveFile]].forEach(([n, t, f]) => {
    const b = el('button', 'tb', ico(n)); b.title = t; b.setAttribute('aria-label', t); b.onclick = f; ga.appendChild(b);
  });
  tb.appendChild(ga);
  const rail = $('rail'); rail.innerHTML = '';
  RAIL.forEach(([t, ns]) => { rail.appendChild(el('div', 'rg-t', t)); const g = el('div', 'rg'); ns.forEach(n => g.appendChild(toolBtn(n))); rail.appendChild(g); });
}

/* ---------- menús en cascada ---------- */
const P_ = { conic: 'Cònica', axo: 'Axonomètrica', cav: 'Cavallera', mil: 'Militar' };
function menuDefs() {
  const tools = ns => ns.map(n => ({ l: TOOLINFO[n][0], sc: TOOLINFO[n][1], f: () => setTool(n), ck: () => S.tool === n }));
  return [
    ['Fitxer', [
      { l: 'Nou', f: () => newDoc() }, { l: 'Obre…', sc: 'Ctrl+O', f: openFile }, { sep: 1 }, { l: 'Desa', sc: 'Ctrl+S', f: saveFile }, { l: 'Desa com a…', f: () => saveFile() }, { sep: 1 },
      { l: 'Importa', sub: [{ l: 'DXF (ASCII)…', f: () => openImportFile('dxf') }, { l: 'Imatge de calc (PNG · JPG · SVG)…', f: () => openImportFile('img') }] }, { l: 'Document 2D (planta, alçat, secció)…', f: () => docDlg() }, { l: 'Exporta', sub: [{ l: 'IFC (2x3 · 4 · 4x1 · 4x2 · 4x3)…', f: () => exportDlg('ifc') }, { l: 'DXF (R12 · 2000 · 2013)…', f: () => exportDlg('dxf') }, { sep: 1 }, { l: 'OBJ + MTL…', f: () => exportDlg('obj') }, { l: 'glTF binari (GLB)…', f: () => exportDlg('glb') }, { l: 'STL…', f: () => exportDlg('stl') }, { sep: 1 }, { l: 'SVG de la vista…', f: () => exportDlg('svg') }, { l: 'PNG de la vista…', f: () => exportDlg('png') }, { sep: 1 }, { l: 'JSON guaitaBIMup', f: () => saveFile(true) }, { l: 'SKP (experimental)…', f: () => exportDlg('skp') }] }, { sep: 1 },
      { l: 'Configuració…', f: configDlg }, { l: 'Opcions del programa…', f: optsDlg }, { sep: 1 }, { l: 'Quant a guaitaBIMup', f: aboutDlg }]],
    ['Edita', [
      { l: 'Desfés', sc: 'Ctrl+Z', f: undo }, { l: 'Refés', sc: 'Ctrl+Y', f: redo }, { sep: 1 }, { l: 'Inverteix la selecció', sc: 'Ctrl+I', f: invertSel }, { l: 'Selecció per propietats…', f: () => toggleSelBar() }, { sep: 1 }, { l: 'Esborra', sc: 'Supr', f: doDelete }, { l: 'Selecciona-ho tot', sc: 'Ctrl+A', f: selectAll }, { l: 'Deselecciona', sc: 'Ctrl+Maj+A', f: () => { clearSel(); refreshSel(); } }, { sep: 1 },
      { l: 'Crea grup', sc: 'Ctrl+G', f: doGroup }, { l: 'Explota el grup', f: doExplode }, { l: 'Surt del grup', sc: 'Esc', f: exitCtx }]],
    ['Visualitza', [
      { l: 'Projecció', sub: Object.keys(P_).map(k => ({ l: P_[k], f: () => setProj(k), ck: () => CAM.proj === k })) },
      { l: 'Vistes', sub: [['Dalt', [0, 0, 1]], ['Davant', [0, -1, 0]], ['Darrere', [0, 1, 0]], ['Dreta', [1, 0, 0]], ['Esquerra', [-1, 0, 0]], ['Baix', [0, 0, -1]], ['Isomètrica', [1, -1, 1]]].map(([l, d]) => ({ l, f: () => goDir(d) })) }, { sep: 1 },
      { l: 'Estils', sub: STYLES_BUILTIN.map(b => ({ l: b.name, f: () => useStyle(b), ck: () => S.style.name === b.name })) }, { l: 'Estil', sub: [{ l: 'Arestes', f: () => { S.style.edges = !S.style.edges; refreshAll(); }, ck: () => S.style.edges }, { l: 'Filferro', f: () => { S.style.wire = !S.style.wire; refreshAll(); }, ck: () => S.style.wire }, { l: 'Raigs X', f: () => { S.style.xray = !S.style.xray; refreshAll(); }, ck: () => S.style.xray }, { sep: 1 },
        { l: 'Color per material', f: () => { S.style.colorBy = 'mat'; refreshAll(); }, ck: () => S.style.colorBy === 'mat' }, { l: 'Color per classe IFC', f: () => { S.style.colorBy = 'ifc'; refreshAll(); }, ck: () => S.style.colorBy === 'ifc' }] },
      { l: 'Mostra', sub: [['ground', 'Terra'], ['axes', 'Eixos'], ['levels', 'Nivells'], ['grids', 'Eixos de pilars'], ['cube', 'ViewCube']].map(([k, l]) => ({ l, f: () => { S.show[k] = !S.show[k]; if (k === 'cube') $('cubeBox').style.display = S.show[k] ? '' : 'none'; refreshAll(); }, ck: () => S.show[k] })) },
      { l: 'Representació dels nivells', sub: [['full', 'Complet'], ['compact', 'Compacte']].map(([k, l]) => ({ l, f: () => setVisMode('lvl', k), ck: () => visMode('lvl') === k })) },
      { l: 'Representació dels eixos', sub: [['full', 'Complet'], ['compact', 'Compacte'], ['plan', '1 línia en planta']].map(([k, l]) => ({ l, f: () => setVisMode('grd', k), ck: () => visMode('grd') === k })) },
      { l: 'Fons', sub: [['sky', 'Cel'], ['white', 'Blanc'], ['grey', 'Gris fosc'], ['black', 'Negre']].map(([k, l]) => ({ l, f: () => setBg(k), ck: () => S.bg === k })) }, { sep: 1 },
      { l: 'Ajusta a la selecció', sc: 'Ctrl+Maj+Z', f: () => fitView(true) }, { l: 'Ajusta el model', sc: 'Maj+Z', f: () => fitView() }]],
    ['Càmera', [{ l: 'Òrbita', sc: 'O', f: () => setTool('orbit') }, { l: 'Desplaça', sc: 'H', f: () => setTool('pan') }, { l: 'Zoom', sc: 'Z', f: () => setTool('zoom') }, { l: 'Zoom finestra', sc: 'Y', f: () => setTool('zoomwin') }, { l: 'Vista anterior', f: prevView }, { sep: 1 }, { l: 'Caixa de secció…', f: sectionBoxPanel }, { l: 'Desa escena', f: saveScene }]],
    ['Dibuixa', tools(['line', 'freehand', 'rect', 'rrect', 'circle', 'poly', 'arc'])],
    ['Eines', [...tools(['select', 'eraser', 'paint', 'pushpull', 'move', 'rotate', 'scale', 'followme', 'offset']), { sep: 1 }, ...tools(['tape', 'dim', 'protr', 'text', 'section']), { sep: 1 }, { l: 'Sòlids (booleanes)', sub: BOOL_ITEMS() }]],
    ['BIM', [...tools(['level', 'grid', 'refplane']), { sep: 1 }, ...tools(['wall', 'column', 'slab', 'roof', 'stair', 'opening', 'comp', 'bsec']), { sep: 1 }, ...tools(['matf', 'pad', 'strip']), { sep: 1 }, ...tools(['ifc']), { l: 'Classificació assistida…', f: () => classDlg() }, { l: 'Selecciona grups sense classificar', f: () => selectPending() }, { sep: 1 }, { l: 'Mou la selecció al nivell actiu', f: () => toLevel('move') }, { l: 'Copia la selecció al nivell actiu', f: () => toLevel('copy') }, { l: 'Assigna la selecció al nivell actiu', f: () => toLevel('assign') }, { sep: 1 }, { l: 'Nivell de treball', sub: S.model.levels.slice().reverse().map(l => ({ l: l.name + '  ' + fmtElev(l.elev), f: () => setLevel(l.id), ck: () => S.level === l.id })) }]],
    ['Finestra', [{ l: 'Restableix la safata', f: () => { TRAY.closed.clear(); ['mat', 'tags', 'outl', 'scenes'].forEach(k => TRAY.closed.add(k)); renderTray(); } }]],
    ['Ajuda', [{ l: 'Dreceres de teclat', f: keysDlg }, { l: 'Quant a…', f: aboutDlg }]],
  ];
}
function mkItems(items, root, after) {
  for (const it of items) {
    if (it.sep) { root.appendChild(el('div', 'msep')); continue; }
    if (it.sub) { const w = el('div', 'mi-wrap'); const b = el('button', 'mi', '<span class="ck"></span><span class="lb">' + esc(it.l) + '</span><span class="ar">▸</span>'); w.appendChild(b); const sub = el('div', 'sub'); mkItems(it.sub, sub, after); w.appendChild(sub); root.appendChild(w); continue; }
    const b = el('button', 'mi', '<span class="ck">' + (it.ck && it.ck() ? '✓' : '') + '</span><span class="lb">' + esc(it.l) + '</span><span class="sc">' + esc(it.sc || '') + '</span>');
    if (it.off) b.style.opacity = '.7';
    b.onclick = () => { (after || (() => { closeMenus(); setTimeout(buildMenus, 0); }))(); it.f(); }; root.appendChild(b);
  }
}
function buildMenus() {
  const bar = $('menubar'); bar.innerHTML = '';
  for (const [name, items] of menuDefs()) {
    const m = el('div', 'menu'), b = el('button', '', esc(name)), d = el('div', 'drop');
    b.onclick = e => { e.stopPropagation(); const was = m.classList.contains('open'); closeMenus(); if (!was) m.classList.add('open'); };
    b.onmouseenter = () => { if (document.querySelector('.menu.open') && !m.classList.contains('open')) { closeMenus(); m.classList.add('open'); } };
    mkItems(items, d); m.appendChild(b); m.appendChild(d); bar.appendChild(m);
  }
}
function closeMenus() { document.querySelectorAll('.menu.open').forEach(m => m.classList.remove('open')); }
document.addEventListener('click', closeMenus);

/* ---------- safata ---------- */
const TRAY = { closed: new Set(['mat', 'tags', 'outl', 'scenes', 'guides', 'sty']) };
function panel(key, title, body) {
  const p = el('section', 'pn' + (TRAY.closed.has(key) ? ' closed' : '')), h = el('h2', '', '<span class="ar">' + (TRAY.closed.has(key) ? '▸' : '▾') + '</span><span class="t">' + esc(title) + '</span>');
  h.onclick = () => { if (TRAY.closed.has(key)) TRAY.closed.delete(key); else TRAY.closed.add(key); renderTray(); };
  const b = el('div', 'pb'); body(b); p.appendChild(h); p.appendChild(b); return p;
}
function renderTray() {
  const t = $('tray'); const sy = t.scrollTop; t.innerHTML = '';
  t.appendChild(panel('info', 'Informació de l’entitat', b => { b.id = 'infoBody'; }));
  t.appendChild(panel('lvl', 'Nivells', levelsPanel));
  t.appendChild(panel('views', 'Navegador de vistes', viewsPanel));
  t.appendChild(panel('cmp', 'Components', compsPanel));
  t.appendChild(panel('sty', 'Estils de visualització', stylesPanel));
  t.appendChild(panel('bsec', 'Seccions BIM', bsecPanel));
  t.appendChild(panel('ifc', 'Classificador IFC', ifcPanel));
  t.appendChild(panel('guides', 'Eixos, plans i anotacions', guidesPanel));
  t.appendChild(panel('imgs', 'Imatges de calc', imgPanel));
  t.appendChild(panel('mat', 'Materials', matPanel));
  t.appendChild(panel('tags', 'Etiquetes', tagsPanel));
  t.appendChild(panel('outl', 'Esquema', outlPanel));
  t.appendChild(panel('scenes', 'Escenes', scenesPanel));
  renderInfo(); t.scrollTop = sy;
}
function kv(rows) { return '<div class="kv">' + rows.map(([k, v]) => '<span>' + esc(k) + '</span><span>' + v + '</span>').join('') + '</div>'; }
function renderInfo() {
  const b = $('infoBody'); if (!b) return; const { c } = ctxInfo(), n = selCount();
  if (!n) { const cnt = K.countAll(S.model.root); b.innerHTML = '<div class="empty">Cap entitat seleccionada.</div>' + kv([['Cares', cnt.f], ['Arestes', cnt.e], ['Grups', cnt.g], ['Context', S.ctx.length ? 'Dins d’un grup' : 'Model']]); return; }
  if (S.sel.groups.size === 1 && n === 1) {
    const g = c.groups.get([...S.sel.groups][0]); if (!g) return;
    b.innerHTML = kv([['Tipus', 'Grup'], ['Nom', '<input type="text" id="gName" value="' + esc(g.name) + '">'], ['Classe IFC', '<select id="gIfc"><option value="">— Esbós (sense classe) —</option>' + IFC.map(r => '<option value="' + r[0] + '"' + (g.ifc === r[0] ? ' selected' : '') + '>' + esc(r[1]) + ' · ' + r[0] + '</option>').join('') + '</select>'],
      ['Nivell', '<select id="gLvl"><option value="">—</option>' + S.model.levels.map(l => '<option value="' + l.id + '"' + (g.level === l.id ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('') + '</select>'], ['Naturalesa', g.ifc ? 'BIM' : 'Esbós']]);
    $('gName').onchange = e => { pushUndo(); g.name = e.target.value; renderTray(); };
    $('gIfc').onchange = e => { pushUndo(); g.ifc = e.target.value || null; refreshAll(); };
    $('gLvl').onchange = e => { pushUndo(); g.level = e.target.value ? +e.target.value : null; if (g.par && g.level != null) { g.par.lv = g.level; refreshAll(); } else renderInfo(); };
    if (g.par) parPanel(b, g); else { const cv = el('button', 'btn sm', 'Converteix en coberta paramètrica'); cv.id = 'toRoof'; cv.title = 'Pren el perímetre de la cara inferior, el gruix i la cota del grup'; cv.onclick = () => roofAdopt(ctxInfo().c, g); b.appendChild(cv); }
    return;
  }
  let a = 0; for (const id of S.sel.faces) { const f = c.faces.get(id); if (f) a += K.faceArea(c, f); }
  let len = 0; for (const id of S.sel.edges) { const e = c.edges.get(id); if (e) len += V.dist(K.P(c, e.a), K.P(c, e.b)); }
  b.innerHTML = kv([['Cares', S.sel.faces.size], ['Arestes', S.sel.edges.size], ['Grups', S.sel.groups.size], ['Àrea', a ? fmt(a) + ' m²' : '—'], ['Longitud', len ? fmtM(len) : '—']]);
}
function viewsPanel(b) {
  const row = (key, label, sub) => { const r = el('div', 'row it' + (S.view === key ? ' on' : ''), '<span class="gw">' + esc(label) + '</span>' + (sub ? '<span class="mono dim">' + esc(sub) + '</span>' : '')); r.onclick = () => openView(key); return r; };
  const hd = t => b.appendChild(el('div', 'row hd', esc(t)));
  hd('Escenes'); S.model.views.forEach(v => b.appendChild(row('scene:' + v.id, v.name)));
  hd('Plantes'); if (!S.model.levels.length) b.appendChild(el('div', 'empty', 'Crea un nivell (LL).')); S.model.levels.slice().reverse().forEach(l => b.appendChild(row('plan:' + l.id, l.name, fmtElev(l.elev))));
  hd('Alçats'); ELEVS.forEach(e => b.appendChild(row('elev:' + e[0], e[1])));
  hd('Seccions'); if (!S.model.grids.length) b.appendChild(el('div', 'empty', 'Crea un eix de pilars (GR).')); S.model.grids.forEach(g => b.appendChild(row('sec:' + g.id, 'Eix ' + g.name)));
  const a = el('div', 'row', ''); const nb = el('button', 'btn sm', 'Desa escena'); nb.onclick = saveScene; a.appendChild(nb); const db = el('button', 'btn sm', 'Document 2D…'); db.id = 'docBtn'; db.onclick = () => docDlg(); a.appendChild(db); b.appendChild(a);
}
function ifcPanel(b) {
  const vis = el('div', 'row', ''); const ch = (lab, key, isIfc) => { const l = el('label', 'gw', '<input type="checkbox"' + (!S.hiddenIfc.has(key) ? ' checked' : '') + '> ' + lab); l.querySelector('input').onchange = e => { if (e.target.checked) S.hiddenIfc.delete(key); else S.hiddenIfc.add(key); refreshAll(); }; return l; };
  vis.appendChild(ch('Mostra esbós', '-')); b.appendChild(vis);
  const cb = el('div', 'row', '<span class="gw">Color per classe</span>'); const ck = el('input'); ck.type = 'checkbox'; ck.checked = S.style.colorBy === 'ifc'; ck.onchange = () => { S.style.colorBy = ck.checked ? 'ifc' : 'mat'; refreshAll(); buildMenus(); }; cb.appendChild(ck); b.appendChild(cb);
  const cnt = {}; (function w(c, top) { for (const g of c.groups.values()) { if (g.ifc) cnt[g.ifc] = (cnt[g.ifc] || 0) + 1; w(g); } })(S.model.root);
  { const nb = el('div', 'row it' + (!S.ifcActive ? ' on' : ''), '<span class="sw" style="background:transparent;border:1px dashed #888"></span><span class="gw">— No BIM (esbós) —</span>'); nb.onclick = () => { setActiveClass(null); if (S.sel.groups.size) { pushUndo(); const { c: cc } = ctxInfo(); S.sel.groups.forEach(id => { const g = cc.groups.get(id); if (g) g.ifc = null; }); refreshAll(); } }; b.appendChild(nb); }
  IFC.forEach(r => {
    const row = el('div', 'row it' + (S.ifcActive === r[0] ? ' on' : ''), '<input type="checkbox"' + (!S.hiddenIfc.has(r[0]) ? ' checked' : '') + ' title="Visible"><span class="sw" style="background:' + r[2] + '"></span><span class="gw" title="' + r[0] + '">' + esc(r[1]) + '</span><span class="mono dim">' + (cnt[r[0]] || '') + '</span>');
    const c = row.querySelector('input'); c.onclick = e => e.stopPropagation(); c.onchange = e => { if (e.target.checked) S.hiddenIfc.delete(r[0]); else S.hiddenIfc.add(r[0]); refreshAll(); };
    row.onclick = () => { setActiveClass(r[0], true); if (selCount() && S.sel.groups.size) { pushUndo(); const { c: cc } = ctxInfo(); S.sel.groups.forEach(id => { const g = cc.groups.get(id); if (g) g.ifc = r[0]; }); refreshAll(); } else renderTray(); };
    b.appendChild(row);
  });
  b.appendChild(el('div', 'empty', 'Clic en una classe: l’activa i l’assigna als grups seleccionats. Eina Classifica (I): cubell en sèrie; Alt+clic recull la classe d’un grup.'));
  const ab = el('button', 'btn sm', 'Classificació assistida…'); ab.style.marginTop = '6px'; ab.onclick = classDlg; b.appendChild(ab);
}
function matPanel(b) {
  const g = el('div', 'swg'); S.model.materials.forEach((m, i) => { const x = el('button', S.mat === i ? 'on' : ''); x.style.background = m.color; x.title = m.name; x.onclick = () => { S.mat = i; setTool('paint'); renderTray(); }; g.appendChild(x); }); b.appendChild(g);
  const d = el('button', 'btn sm', 'Sense material (per defecte)'); d.style.marginTop = '6px'; d.onclick = () => { S.mat = null; renderTray(); }; b.appendChild(d);
}
function tagsPanel(b) {
  S.model.tags.forEach(t => { const r = el('div', 'row', '<input type="checkbox"' + (t.visible ? ' checked' : '') + '><span class="sw" style="background:' + t.color + '"></span><span class="gw">' + esc(t.name) + '</span>'); r.querySelector('input').onchange = e => { t.visible = e.target.checked; refreshAll(); }; b.appendChild(r); });
  const a = el('button', 'btn sm', 'Afegeix etiqueta'); a.onclick = () => { pushUndo(); const n = S.model.tags.length; S.model.tags.push({ id: S.model.nid++, name: 'Etiqueta ' + n, color: PALETTE[n % PALETTE.length][1], visible: true }); renderTray(); }; b.appendChild(a);
}
function outlPanel(b) {
  const w = (c, d) => { for (const g of c.groups.values()) { const r = el('div', 'row it' + (S.sel.groups.has(g.id) ? ' on' : ''), '<span class="gw" style="padding-left:' + d * 12 + 'px">' + esc(g.name || 'Grup ' + g.id) + '</span><span class="mono dim">' + (g.ifc ? g.ifc.replace('Ifc', '') : 'esbós') + '</span>'); r.onclick = () => { if (d === 0 && !S.ctx.length) { clearSel(); S.sel.groups.add(g.id); refreshSel(); } }; b.appendChild(r); w(g, d + 1); } };
  const { c } = ctxInfo(); if (!c.groups.size) b.appendChild(el('div', 'empty', 'Sense grups.')); w(c, 0);
}
function scenesPanel(b) { S.model.views.forEach(v => { const r = el('div', 'row', '<span class="gw">' + esc(v.name) + '</span>'); const o = el('button', 'btn sm', 'Obre'); o.onclick = () => openView('scene:' + v.id); const x = el('button', 'x', '✕'); x.onclick = () => { pushUndo(); S.model.views = S.model.views.filter(y => y !== v); closeTab('scene:' + v.id); refreshAll(); }; r.appendChild(o); r.appendChild(x); b.appendChild(r); }); }

/* ---------- estat, pestanyes i sincronització ---------- */
function updFileInfo() { $('fileName').textContent = S.fileName; $('fileState').textContent = S.dirty ? 'sense desar' : ''; $('fileInfo').classList.toggle('dirty', S.dirty); document.title = (S.dirty ? '• ' : '') + S.fileName + ' — guaitaBIMup ' + VERSION; }
function syncUI() {
  document.querySelectorAll('.tb[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === S.tool));
  const i = TOOLINFO[S.tool]; $('stTool').textContent = S.boolPend ? 'BOOLEANA · ' + BOOL_NAMES[S.boolPend] : (i ? i[0] : S.tool); $('stHint').textContent = S.boolPend ? 'Selecciona A i B, després Enter · Esc cancel·la' : (i ? i[2] : '');
  $('vcbLabel').textContent = S.tool === 'slab' || S.tool === 'matf' ? 'Gruix' : S.tool === 'pad' || S.tool === 'strip' ? 'Secció' : S.tool === 'column' ? 'Secció' : S.tool === 'opening' ? 'Obertura' : S.tool === 'wall' ? 'Gruix' : S.tool === 'stair' ? 'Tipus o amplada' : S.tool === 'rect' ? 'Dimensions' : S.tool === 'level' ? 'Elevació' : S.tool === 'ifc' ? 'Classe' : S.tool === 'circle' || S.tool === 'poly' ? 'Radi' : S.tool === 'arc' ? 'Bombament' : 'Mesures';
  syncNav();
  const ls = $('lvlSel'); ls.innerHTML = S.model.levels.slice().reverse().map(l => '<option value="' + l.id + '"' + (l.id === S.level ? ' selected' : '') + '>' + esc(l.name) + '  ' + fmtElev(l.elev) + '</option>').join('');
  syncClass(); updCursor();
  const tabs = $('tabs'); tabs.innerHTML = '';
  S.tabs.forEach(k => { const nm = viewName(k); if (nm == null) return; const b = el('button', S.view === k ? 'on' : '', esc(nm) + '<i title="Tanca">✕</i>'); b.onclick = e => { if (e.target.tagName === 'I') closeTab(k); else openView(k, true); }; tabs.appendChild(b); });
  const cb = $('ctxBar'); cb.classList.toggle('show', S.ctx.length > 0);
  if (S.ctx.length) { const g = ctxInfo(); const gr = (function f(c, ids) { for (const id of ids) c = c.groups.get(id); return c; })(S.model.root, S.ctx); $('ctxName').textContent = 'Editant: ' + (gr && (gr.name || 'Grup ' + gr.id)); }
  const cnt = K.countAll(S.model.root); $('stInfo').textContent = cnt.f + ' cares · ' + cnt.e + ' arestes · ' + (S.model.levels.find(l => l.id === S.level) || { name: '—' }).name;
  updFileInfo(); if (!document.querySelector('.menu.open')) buildMenus();
}
$('lvlSel').onchange = e => setLevel(+e.target.value);
$('clsSel').onchange = e => setActiveClass(e.target.value || null, true);
$('autoG').onchange = e => { S.autoGroup = e.target.checked; if (S.autoGroup && !S.ifcActive) toast('Auto-agrupa actiu: tria una classe activa perquè s’apliqui.'); };
$('stPend').onclick = selectPending;
$('navBtn').onclick = e => { e.stopPropagation(); toggleNav(); };
$('navPanel').onclick = e => e.stopPropagation();
document.addEventListener('click', () => { if (S.navOpen) toggleNav(false); });
$('ctxExit').onclick = exitCtx;

/* ---------- VCB ---------- */
$('vcb').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') {
    const txt = $('vcb').value; $('vcb').value = ''; if (gripVcb(txt)) return;
    if (S.tool === 'ifc') { const q = txt.trim().toLowerCase(); const r = IFC.find(x => x[0].toLowerCase() === q || x[0].toLowerCase() === 'ifc' + q || x[1].toLowerCase().startsWith(q)); if (r) { setActiveClass(r[0]); toast('Classe activa: ' + r[1]); } else toast('Classe no trobada.'); }
    else if (T && T.vcb) T.vcb(txt);
    canvas.focus();
  } else if (e.key === 'Escape') { $('vcb').value = ''; canvas.focus(); }
});

/* ---------- fitxers ---------- */
function download(name, data, type) { deliver(name, data, type); }
function download_old(name, data, type) { const a = el('a'); a.href = URL.createObjectURL(new Blob([data], { type: type || 'application/octet-stream' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function jsonText() { const o = K.toJSON(S.model); o.images = (o.images || []).map(i => ({ ...i, data: IMG_DATA.get(i.id) || null })); return JSON.stringify(o); }
function outDlg(title, name, getText, type, done) {
  $('dlgBox').innerHTML = '<h3>' + esc(title) + '</h3><div class="kv" style="margin-bottom:12px"><span>Nom del fitxer</span><input type="text" id="oName" value="' + esc(name) + '"></div><p class="dim">Si el navegador bloqueja la descàrrega (per exemple dins d’un visor incrustat), copia el contingut i desa’l tu mateix.</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="oCopy">Copia al porta-retalls</button><button class="btn acc" id="oGo">Descarrega</button><button class="btn" id="oX">Cancel·la</button></div>';
  $('dlg').classList.add('show');
  $('oX').onclick = () => $('dlg').classList.remove('show');
  $('oGo').onclick = () => { download($('oName').value || name, getText(), type); $('dlg').classList.remove('show'); if (done) done($('oName').value || name); };
  $('oCopy').onclick = () => { const t = getText(); const ok = () => toast('Contingut copiat (' + Math.round(t.length / 1024) + ' kB).'); try { navigator.clipboard.writeText(t).then(ok, () => toast('No s’ha pogut copiar.')); } catch (e) { toast('No s’ha pogut copiar.'); } };
}
function saveFile(as) {
  outDlg('Desa el model (JSON guaitaBIMup)', baseName() + '.gbup.json', jsonText, 'application/json', n => { S.fileName = n; S.dirty = false; updFileInfo(); toast('Desat ' + n); });
}
function exportOBJ() { outDlg('Exporta OBJ (Y amunt)', baseName() + '.obj', () => K.toOBJ(S.model, (c, f) => triangulate(c, f)), 'text/plain'); }
function openFile() { $('fileInput').click(); }
$('fileInput').onchange = e => {
  const f = e.target.files[0]; if (!f) return; const rd = new FileReader();
  rd.onload = () => { try { const m = K.fromJSON(JSON.parse(rd.result)); cancelTool(); S.model = m; S.ctx = []; clearSel(); S.undo = []; S.redo = []; S.level = m.levels.length ? m.levels[0].id : null; S.tabs = []; S.view = null; S.fileName = f.name; S.dirty = false; S.viewClips = []; applyClips(); adoptStyle(); refreshAll(); fitView(); toast('Obert ' + f.name); } catch (err) { toast('No s’ha pogut obrir: ' + err.message); } };
  rd.readAsText(f); e.target.value = '';
};
function newDoc(ok) { if (S.dirty && ok !== true) { $('dlgBox').innerHTML = '<h3>Model nou</h3><p>Hi ha canvis sense desar. Vols descartar-los?</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="nX">Cancel·la</button><button class="btn acc" id="nOk">Descarta i crea\'n un de nou</button></div>'; $('dlg').classList.add('show'); $('nX').onclick = () => $('dlg').classList.remove('show'); $('nOk').onclick = () => { $('dlg').classList.remove('show'); newDoc(true); }; return; } cancelTool(); S.model = newModel(); S.ctx = []; clearSel(); S.undo = []; S.redo = []; S.level = S.model.levels[0].id; S.tabs = []; S.view = null; S.fileName = 'sense-títol.gbup.json'; S.dirty = false; S.viewClips = []; applyClips(); adoptStyle(); refreshAll(); }
$('verTag').textContent = 'v' + VERSION; $('verTag').onclick = aboutDlg; $('sbsSig').onclick = aboutDlg;
$('btnSave').onclick = () => saveFile(); $('btnExport').onclick = () => exportDlg('ifc');
window.addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- diàlegs ---------- */
function dlg(html) { $('dlgBox').innerHTML = html + '<div style="text-align:right"><button class="btn acc" id="dlgOk">Tanca</button></div>'; $('dlg').classList.add('show'); $('dlgOk').onclick = () => $('dlg').classList.remove('show'); }
$('dlg').onclick = e => { if (e.target === $('dlg')) $('dlg').classList.remove('show'); };
function aboutDlg() { dlg('<h3>guaitaBIMup ' + VERSION + '</h3><p>Modelador 3D tipus SketchUp de la suite Guaita Apps, amb nivells, eixos de pilars, classificació IFC i projeccions cònica, axonomètrica, cavallera i militar.</p><p>© SBS BiM Consulting, Jordi Subirós · Llicència AGPL-3.0-only.<br>Inclou Three.js (MIT) © 2010–2023 three.js authors.</p>'); }
function keysDlg() { dlg('<h3>Dreceres de teclat</h3><table>' + Object.entries(TOOLINFO).map(([k, v]) => '<tr><td>' + esc(v[0]) + '</td><td><kbd>' + esc(v[1]) + '</kbd></td></tr>').join('') + '<tr><td>Desfés / Refés</td><td><kbd>Ctrl+Z</kbd> <kbd>Ctrl+Y</kbd></td></tr><tr><td>Obre / Desa</td><td><kbd>Ctrl+O</kbd> <kbd>Ctrl+S</kbd></td></tr><tr><td>Ajusta el model</td><td><kbd>Maj+Z</kbd></td></tr><tr><td>Bloqueja eix</td><td><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd></td></tr></table><p>Mesures: escriu el valor amb el teclat i prem Intro.</p>'); }

/* ---------- teclat ---------- */
let seq = '', seqT = null;
window.addEventListener('keydown', ev => {
  const tg = ev.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'SELECT' || tg.tagName === 'TEXTAREA')) return;
  const k = ev.key, ctl = ev.ctrlKey || ev.metaKey;
  if (ctl) {
    const kl = k.toLowerCase();
    if (kl === 'z' && ev.shiftKey) { fitView(true); ev.preventDefault(); } else if (kl === 'z') { undo(); ev.preventDefault(); } else if (kl === 'y') { redo(); ev.preventDefault(); }
    else if (kl === 's') { saveFile(); ev.preventDefault(); } else if (kl === 'o') { openFile(); ev.preventDefault(); } else if (kl === 'g') { doGroup(); ev.preventDefault(); }
    else if (kl === 'a') { ev.shiftKey ? (clearSel(), refreshSel()) : selectAll(); ev.preventDefault(); }
    else if (kl === 'i') { invertSel(); ev.preventDefault(); }
    else if (kl === 'f' && ev.shiftKey) { toggleSelBar(); ev.preventDefault(); }
    return;
  }
  if (k === 'Enter' && S.boolPend) { boolConfirm(); ev.preventDefault(); return; }
  if (k === 'Escape' && S.boolPend) { boolCancel(); return; }
  if (T && T.key && T.key(ev)) return;
  if (k === 'Tab' && T === TOOLS.select) { tabCycle(ev.shiftKey ? -1 : 1); ev.preventDefault(); return; }
  if (k === 'Tab' && T && T !== TOOLS.select && !ev.shiftKey) { SNAP_CYC++; SNAP_AT = { x: lastMouse.mx, y: lastMouse.my }; ev.preventDefault(); needRender = true; return; }
  if (k === 'Enter' && TABST && TABST.cur) { confirmTab('replace'); ev.preventDefault(); return; }
  if (k === 'Escape' && TABST) { tabReset(); syncUI(); return; }
  if (k === 'Escape') { if (Object.keys(st).length) cancelTool(); else if (!exitCtx()) { clearSel(); refreshSel(); clearAnnSel(); } $('dlg').classList.remove('show'); return; }
  if (k === 'Delete' || k === 'Backspace') { doDelete(); ev.preventDefault(); return; }
  if (k === 'ArrowRight') { LOCK = LOCK === 0 ? null : 0; ev.preventDefault(); return; } if (k === 'ArrowLeft') { LOCK = LOCK === 1 ? null : 1; ev.preventDefault(); return; } if (k === 'ArrowUp') { LOCK = LOCK === 2 ? null : 2; ev.preventDefault(); return; }
  if (ev.shiftKey && { F: 'slab', P: 'column', O: 'opening', C: 'roof', E: 'stair' }[k]) { setTool({ F: 'slab', P: 'column', O: 'opening', C: 'roof', E: 'stair' }[k]); ev.preventDefault(); return; }
  if (k === 'Z' && ev.shiftKey) { fitView(); return; }
  if (k.length === 1 && /[a-z ]/i.test(k)) {
    const kl = k.toLowerCase(); clearTimeout(seqT); seq += kl; seqT = setTimeout(() => { seq = ''; }, 600);
    if (seq === 'll') { setTool('level'); seq = ''; return; } if (seq === 'gr') { setTool('grid'); seq = ''; return; }
    if (seq === 'rp') { setTool('refplane'); seq = ''; return; }
    if (kl === 'g' || kl === 'l' || kl === 'r') { seqT && 0; setTimeout(() => { if (seq === kl) { seq = ''; if (KEYMAP[kl]) setTool(KEYMAP[kl]); } }, 320); return; }
    if (KEYMAP[kl]) { setTool(KEYMAP[kl]); seq = ''; ev.preventDefault(); }
    return;
  }
  if (/^[0-9.,\-]$/.test(k)) { $('vcb').value = ''; $('vcb').focus(); }
});
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(view);

/* ---------- arrencada ---------- */
(function boot() {
  S.model = newModel(); S.level = S.model.levels[0].id;
  try { const a = (localStorage.getItem('guaitabimup.autosave') || localStorage.getItem('guaita3dsketch.autosave')); if (a && !/[?&]nou/.test(location.search)) { const m = K.fromJSON(JSON.parse(a)); if (K.countAll(m.root).e) { S.model = m; S.level = m.levels.length ? m.levels[0].id : null; toast('S’ha recuperat l’últim treball desat automàticament.'); } } } catch (e) { /* sense autodesat */ }
  adoptStyle(); buildBars(); buildMenus(); buildNav(); renderTray(); resize(); rebuild(); syncUI(); setTool('select');
  fitView(); requestAnimationFrame(frame);
})();
