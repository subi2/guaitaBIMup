from playwright.sync_api import sync_playwright
errs=[]; res=[]
def chk(c,m): res.append(bool(c)); print(('OK  ' if c else 'FAIL'),m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1500,'height':900})
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou'); pg.wait_for_timeout(600)
    ev=pg.evaluate
    chk(ev("VERSION")=="24",'versió 24')
    chk(ev("S.ifcActive")is None,'classe activa per defecte = No BIM')
    chk(ev("$('clsSel').options.length")==len(ev("IFC"))+1,'selector de classe: No BIM + classes')
    ev("""window.mkBox=(x,y,z,w,d,h,name)=>{const c=S.model.root;const before=new Set(c.faces.keys());K.addPolyline(S.model,c,[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],true);
      const f=[...c.faces.values()].find(f=>!before.has(f.id));K.pushPull(S.model,c,f.id,h);
      clearSel();c.faces.forEach(f=>S.sel.faces.add(f.id));c.edges.forEach(e=>S.sel.edges.add(e.id));const g=doGroup();if(name)g.name=name;
      c.faces.forEach(f=>{});clearSel();return g.id;};0""")
    ev("mkBox(0,0,0,0.3,5,3,'Mur nord')"); ev("mkBox(10,0,0,0.3,0.3,3,'Element 1')"); ev("mkBox(20,0,0,5,4,0.2,'Cosa')"); ev("mkBox(30,0,0,0.3,5,0.4,'Peça')"); ev("mkBox(40,0,0,2,2,2,'Cub')")
    ev("refreshAll()")
    chk(ev("pendingList().length")==5,'5 grups pendents')
    chk('5 sense' in ev("$('stPend').textContent"),'comptador a la barra: '+ev("$('stPend').textContent"))
    ev("$('stPend').click()"); chk(ev("S.sel.groups.size")==5,'clic al comptador selecciona els pendents')
    pr=ev("buildProposals(loadRules()).map(p=>[p.nm,p.k,p.src])"); print(pr)
    d={x[0]:(x[1],x[2]) for x in pr}
    chk(list(d['Mur nord'])==['IfcWall','nom'],'regla per nom Mur* → mur')
    chk(d['Element 1'][0]=='IfcColumn' and d['Element 1'][1]=='forma','forma: pilar')
    chk(d['Cosa'][0]=='IfcSlab','forma: llosa'); chk(d['Peça'][0]=='IfcBeam','forma: biga'); chk(d['Cub'][0] is None,'cub: sense suggeriment')
    # diàleg
    ev("classDlg()"); pg.click('#cCalc'); chk(pg.locator('#cProp .pr').count()==5,'diàleg: 5 propostes')
    chk(pg.locator('#cProp input[type=checkbox]:checked').count()==4,'4 marcades (el cub no)')
    n0=len(ev("S.undo")); pg.click('#cApply'); pg.wait_for_timeout(200)
    chk(ev("pendingList().length")==1,'després d’aplicar, 1 pendent')
    chk(ev("[...S.model.root.groups.values()].filter(g=>g.ifc).length")==4,'4 grups classificats')
    ev("undo()"); chk(ev("pendingList().length")==5,'desfer restaura els pendents')
    # classe activa
    pg.select_option('#clsSel','IfcColumn'); chk(ev("S.ifcActive")=='IfcColumn','selector assigna classe activa')
    ev("clearSel();var c=S.model.root;K.addPolyline(S.model,c,[[50,0,0],[51,0,0],[51,1,0],[50,1,0]],true);c.faces.forEach(f=>{if(!f.mat)S.sel.faces.add(f.id)});S.sel.faces.clear();[...c.faces.values()].slice(-1).forEach(f=>S.sel.faces.add(f.id));window.g1=doGroup()")
    chk(ev("g1.ifc")=='IfcColumn','Ctrl+G hereta la classe activa')
    # booleana hereta classe activa si l'origen no en té
    ev("S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();setActiveClass(null)")
    a=ev("mkBox(0,0,0,4,3,2)"); bb=ev("mkBox(3,1,0,3,1,2)"); ev(f"setActiveClass('IfcSlab');clearSel();S.sel.groups.add({a});S.sel.groups.add({bb});boolOp('union')")
    chk(ev("[...S.model.root.groups.values()].some(g=>g.ifc==='IfcSlab')"),'booleana: resultat amb classe activa')
    # auto-agrupa
    ev("S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();S.autoGroup=true;setActiveClass('IfcWall')")
    ev("""var c=S.model.root;K.addPolyline(S.model,c,[[0,0,0],[4,0,0],[4,0.3,0],[0,0.3,0]],true);var f=[...c.faces.values()][0];var r=K.pushPull(S.model,c,f.id,3);window.ag=autoGroupAfter(c,r.face)""")
    chk(ev("ag")==True and ev("S.model.root.groups.size")==1,'auto-agrupa crea grup')
    chk(ev("[...S.model.root.groups.values()][0].ifc")=='IfcWall' and ev("S.model.root.faces.size")==0,'grup classificat i sense cares soltes')
    ev("S.autoGroup=false;S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear()")
    ev("""var c=S.model.root;K.addPolyline(S.model,c,[[0,0,0],[4,0,0],[4,0.3,0],[0,0.3,0]],true);var f=[...c.faces.values()][0];var r=K.pushPull(S.model,c,f.id,3);window.ag=autoGroupAfter(c,r.face)""")
    chk(ev("ag")==False,'auto-agrupa desactivat: no agrupa')
    # comptagotes (Alt) amb la UI real
    ev("S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();setActiveClass(null);refreshAll()")
    chk(ev("pendingList().length")==0 and 'zero' in ev("$('stPend').className"),'sense pendents: comptador amagat')
    print('ERRS',errs); ok=sum(res); print('PASS',ok,'/',len(res)); b.close()
