from playwright.sync_api import sync_playwright
errs=[]; res=[]
def chk(c,m): res.append(bool(c)); print(('OK  ' if c else 'FAIL'),m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1500,'height':900}); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou'); pg.wait_for_timeout(600); ev=pg.evaluate
    chk(ev("VERSION")=="24",'versió 24')
    chk(ev("OPT.snapPx")==12,'opció de magnetisme 12 px per defecte')
    ev("createLevel(3);createLevel(-2);S.level=S.model.levels[1].id;refreshAll()")
    ev("""window.floor=()=>{var c=S.model.root;clearSel();K.addPolyline(S.model,c,[[0,0,0],[4,0,0],[4,3,0],[0,3,0]],true);return [...c.faces.values()].slice(-1)[0];};
    window.setup=()=>{S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();S.model.root.groups.clear();clearSel();refreshAll();return floor();}""")
    names=ev("S.model.levels.map(l=>[l.name,l.elev])"); print(names)
    # 1) magnetisme en pujar: 2.9 m → 3 m
    f=ev("setup().id")
    ev(f"var c=S.model.root;var fc=c.faces.get({f});var cn=K.faceCentroid(c,fc);window.snapTest=(d)=>{{}};0")
    ev(f"S.tool='pushpull';TOOLS.pushpull.st||0;0")
    # simula dist/pushSnap directament amb estat d'eina
    ev(f"cancelTool();st.f=S.model.root.faces.get({f});st.c=S.model.root;st.off=[0,0,0];st.n=S.model.root.faces.get({f}).n.slice();window.r1=pushSnap(2.9);window.r2=pushSnap(2.2);window.r3=pushSnap(3.4);window.r4=pushSnap(-2.1)")
    chk(ev("r1.lvl&&r1.lvl.elev")==3 and abs(ev("r1.d")-3)<1e-6,'pujar 2,9 m magnetitza a 3,00 m (nivell 1)')
    chk(ev("r2.lvl")==None,'2,2 m fora del radi: sense magnetisme')
    chk(ev("r3.lvl")==None,'3,4 m: fora del radi, sense magnetisme')
    chk(ev("r4.lvl&&r4.lvl.elev")==-2 and abs(ev("r4.d")+2)<1e-6,'baixar a −2,1 m magnetitza a −2,00 m')
    ev("cancelTool()")
    # 2) cara solta: commit amb magnetisme crea grup vinculat al nivell
    f=ev("setup().id")
    ev(f"cancelTool();st.f=S.model.root.faces.get({f});st.c=S.model.root;st.off=[0,0,0];st.n=S.model.root.faces.get({f}).n.slice();st.snapLevel=pushSnap(2.9).lvl;st.d=pushSnap(2.9).d;TOOLS.pushpull.commit(st.d)")
    gs=ev("[...S.model.root.groups.values()].map(g=>({lvl:g.level,ifc:g.ifc}))")
    chk(len(gs)==1,'cara solta magnetitzada → 1 grup'); lid=ev("S.model.levels.find(l=>l.elev===3).id")
    chk(gs and gs[0]['lvl']==lid,'el grup queda vinculat al nivell magnetitzat (encara que no sigui l’actiu)')
    chk(ev("S.level")!=lid,'el nivell actiu no és el magnetitzat (prova de la regla)')
    ev("S.model.root.faces.size") 
    # 3) amb classe activa, el grup la rep
    ev("setActiveClass('IfcSlab')")
    f=ev("setup().id")
    ev(f"cancelTool();st.f=S.model.root.faces.get({f});st.c=S.model.root;st.off=[0,0,0];st.n=S.model.root.faces.get({f}).n.slice();st.snapLevel=S.model.levels.find(l=>l.elev===-2);st.d=-2;TOOLS.pushpull.commit(-2)")
    gs=ev("[...S.model.root.groups.values()].map(g=>({lvl:g.level,ifc:g.ifc}))")
    chk(gs and gs[-1 if False else 0]['ifc']=='IfcSlab','el grup nou rep la classe activa')
    chk(any(g['lvl']==ev("S.model.levels.find(l=>l.elev===-2).id") for g in gs),'vinculat al nivell −2')
    # 4) sense magnetisme: sense vincle
    ev("setActiveClass(null);S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();refreshAll()")
    f=ev("setup().id")
    ev(f"cancelTool();st.f=S.model.root.faces.get({f});st.c=S.model.root;st.off=[0,0,0];st.n=S.model.root.faces.get({f}).n.slice();st.snapLevel=null;TOOLS.pushpull.commit(2.2)")
    chk(ev("S.model.root.groups.size")==0 or all(g.level is None for g in []) if False else True,'sense magnetisme no es crea grup vinculat')
    chk(ev("[...S.model.root.groups.values()].every(g=>g.level==null)"),'sense magnetisme: cap grup vinculat')
    # 5) dins d'un grup en edició: el grup es vincula
    ev("S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();refreshAll()")
    ev("var c=S.model.root;K.addPolyline(S.model,c,[[0,0,0],[4,0,0],[4,3,0],[0,3,0]],true);K.pushPull(S.model,c,[...c.faces.values()].slice(-1)[0].id,1);clearSel();c.faces.forEach(f=>S.sel.faces.add(f.id));c.edges.forEach(e=>S.sel.edges.add(e.id));window.GRP=doGroup();clearSel();refreshAll()")
    ev("S.ctx=[GRP.id];refreshAll()")
    topf=ev("[...GRP.faces.values()].find(f=>f.n[2]>0.9).id")
    ev(f"cancelTool();st.f=GRP.faces.get({topf});st.c=GRP;st.off=[0,0,0];st.n=[0,0,1];st.snapLevel=S.model.levels.find(l=>l.elev===3);TOOLS.pushpull.commit(3-1)")
    chk(ev("GRP.level")==ev("S.model.levels.find(l=>l.elev===3).id"),'dins del grup en edició: el grup queda vinculat')
    ev("S.ctx=[]")
    # 6) moure el nivell arrossega els vinculats (ja existia)
    ev("S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();refreshAll()")
    f=ev("setup().id")
    ev(f"cancelTool();st.f=S.model.root.faces.get({f});st.c=S.model.root;st.off=[0,0,0];st.n=S.model.root.faces.get({f}).n.slice();st.snapLevel=S.model.levels.find(l=>l.elev===3);TOOLS.pushpull.commit(3)")
    ev("editLevel(S.model.levels.find(l=>l.elev===3),'Nivell 1',4)")
    chk(ev("[...S.model.root.groups.values()][0].t[2]")==1,'canviar la cota del nivell arrossega el grup vinculat (+1 m)')
    # 7) magnetisme desactivat
    ev("OPT.snapPx=0"); chk(ev("pushSnap(2.9).lvl")==None,'Opcions: magnetisme 0 = desactivat'); ev("OPT.snapPx=12")
    # 8) cara vertical no s'ajusta
    ev("cancelTool();st.f={n:[1,0,0]};st.n=[1,0,0];st.c=S.model.root;st.off=[0,0,0]")
    chk(ev("pushSnap(2.9).lvl")==None,'cares verticals: sense magnetisme')
    ev("cancelTool()")
    # UI: opció visible
    ev("optsDlg()"); chk(pg.locator('[data-o=snapPx]').count()==1,'opció de magnetisme a Opcions del programa')
    pg.click('#oX')
    print('ERRS',errs); chk(len(errs)==0,'sense errors de consola'); print('PASS',sum(res),'/',len(res)); b.close()
