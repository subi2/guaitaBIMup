from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.40.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate
    chk(ev("VERSION")=='0.40.0','versió')
    chk(ev("document.querySelectorAll('#navBtn .cells span').length")==19,'icona caseta: 19 quadradets')
    # reacoblar
    ev("setPanelFloat('lvl',true);setPanelFloat('guides',true);setPanelFloat('mat',true)"); pg.wait_for_timeout(200)
    ev("LAY.panels.guides.x=-500;LAY.panels.guides.y=4000;renderTray()"); pg.wait_for_timeout(200)
    chk(ev("document.querySelectorAll('#floatLayer .fpanel').length")==3,'3 panells flotants')
    n=ev("[...document.querySelectorAll('.tab2 .tabre')].length"); chk(n==2,'botó reacoblar a 2 pestanyes (%s)'%n)
    pg.click(".tab2[data-tab=dir] .tabre"); pg.wait_for_timeout(250)
    chk(ev("document.querySelectorAll('#floatLayer .fpanel').length")==1,'queda només el flotant d\'una altra pestanya')
    chk(ev("!LAY.panels.lvl.float && !LAY.panels.guides.float"),'lvl i guides acoblats (també el fora de pantalla)')
    chk(ev("document.querySelector('.tab2[data-tab=dir]').classList.contains('on')"),'pestanya activa Directrius')
    chk(ev("document.querySelectorAll('.tab2 .tabre').length")==1,'botó només on hi ha flotants')
    # elements editables: nivell
    ev("createLevel(3)"); pg.wait_for_timeout(100)
    l=ev("S.model.levels.find(x=>x.elev===3).id")
    ev("S.tool='select';S.selAnn.lvls.clear();S.selAnn.lvls.add(%d);rebuildAnnot()"%l); pg.wait_for_timeout(200)
    chk(ev("GRIP.list.length")==1 and ev("GRIP.list[0].d.key")=='lz','grip de nivell')
    ev("GRIP.list[0].d.setZ(4.5)"); chk(ev("S.model.levels.find(x=>x.id==%d).elev"%l)==4.5,'elevació canviada pel grip')
    ev("S.model.levels.find(x=>x.id==%d).elev=3"%l)
    # diàleg nivell + rang de vista
    ev("annEditDlg('lvls',S.model.levels.find(x=>x.id==%d))"%l); pg.fill("#aeN","Planta 1"); pg.fill("#aeZ","3.2"); pg.fill("#aeC","1.5"); pg.fill("#aeB","0.2"); pg.fill("#aeD","0.5"); pg.click("#aeOk"); pg.wait_for_timeout(200)
    L=ev("S.model.levels.find(x=>x.id==%d)"%l)
    chk(L['name']=='Planta 1' and L['elev']==3.2 and L['vr']=={'cut':1.5,'bot':0.2,'depth':0.5},'diàleg nivell %s'%L)
    chk(abs(ev("vrFar(S.model.levels.find(x=>x.id==%d))"%l)-1.8)<1e-9,'far = cut-bot+depth')
    chk(ev("docView('plan:%d').o[2]"%l)==3.2+1.5 and abs(ev("docView('plan:%d').far"%l)-1.8)<1e-9,'docView usa el rang')
    d=ev("vrFar(S.model.levels[0])"); chk(abs(d-1.3)<1e-9,'rang per defecte = 1.3 (compatible)')
    chk(ev("JSON.stringify(K.toJSON(S.model)).includes('\"vr\"')"),'rang desat al JSON')
    # eix editable
    ev("createGrid([0,0,0],[10,0,0])"); g=ev("S.model.grids[0].id")
    ev("S.selAnn.lvls.clear();S.selAnn.grids.clear();S.selAnn.grids.add(%d);rebuildAnnot()"%g); pg.wait_for_timeout(200)
    chk(ev("GRIP.list.map(x=>x.d.key).join()")=='ga,gb,gm','grips d\'eix %s'%ev("GRIP.list.map(x=>x.d.key).join()"))
    ev("GRIP.list[2].d.set([5,3])"); chk(ev("S.model.grids[0].a")==[0,3] or ev("S.model.grids[0].a")==[0.0,3.0],'moure eix pel grip central %s'%ev("S.model.grids[0].a"))
    ev("annEditDlg('grids',S.model.grids[0])"); pg.fill("#aeBx","12"); pg.fill("#aeN","Z"); pg.click("#aeOk"); pg.wait_for_timeout(100)
    chk(ev("S.model.grids[0].b[0]")==12 and ev("S.model.grids[0].name")=='Z','diàleg eix')
    ev("annSelectOnly('grids',%d)"%g); chk(ev("S.selAnn.grids.size")==1,'annSelectOnly')
    # ctrl+z
    ev("undo()"); chk(True,'undo sense error')
    chk(errs==[],'sense errors de pàgina %s'%errs)
    b.close()
print(res)
