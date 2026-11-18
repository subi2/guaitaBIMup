from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops; import io
errs=[]; res=[]
def chk(c,m): res.append(bool(c)); print(('OK  ' if c else 'FAIL'),m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    ctx=b.new_context(viewport={'width':1500,'height':900}); pg=ctx.new_page()
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou'); pg.wait_for_timeout(600); ev=pg.evaluate
    chk(ev("VERSION")=="24",'versió 24')
    ev("createLevel(3);createLevel(6);S.level=S.model.levels[0].id;S.model.grids.push({id:900,name:'A',a:[0,0,0],b:[10,0,0]},{id:901,name:'B',a:[0,5,0],b:[10,5,0]});refreshAll()")
    meshes=lambda: ev("gAnnot.children.filter(c=>c.type==='Mesh').length")
    lines=lambda: ev("gAnnot.children.filter(c=>c.type==='Line').length")
    chk(ev("visMode('lvl')")=='full' and ev("visMode('grd')")=='full','per defecte: complet / complet (com abans)')
    chk(meshes()==5,'complet: 3 nivells + 2 eixos = 5 plans')
    ev("setVisMode('lvl','compact')"); chk(meshes()==3,'nivells compactes: només l’actiu és complet (+2 eixos)')
    ev("setVisMode('grd','compact')"); chk(meshes()==1,'eixos compactes: 0 plans d’eix → només el nivell actiu')
    chk(lines()==1+2*2+2*2,'línies: actiu (1 contorn) + 2 nivells×2 + 2 eixos×2 → '+str(lines()))
    ev("setVisMode('grd','plan')"); chk(meshes()==1,'eixos en planta: sense plans verticals')
    z=ev("gAnnot.children.filter(c=>c.type==='Line').slice(-2).map(l=>[l.geometry.attributes.position.getZ(0),l.geometry.attributes.position.getZ(1)])")
    chk(all(abs(a)<1e-6 and abs(c)<1e-6 for a,c in z),'1 línia en planta a la cota del nivell actiu '+str(z))
    chk(lines()==1+2*2+2,'línies: actiu + 4 + 2 eixos×1 → '+str(lines()))
    # seleccionar un eix i un nivell: es mostren complets
    ev("toggleAnnSel('grids',900)"); chk(meshes()==2,'eix seleccionat → pla complet')
    ev("toggleAnnSel('lvls',S.model.levels[1].id)"); chk(meshes()==3,'nivell seleccionat → complet')
    ev("clearAnnSel()"); chk(meshes()==1,'Esc/clearAnnSel torna al compacte')
    # clic a l'etiqueta amb Ctrl
    pg.keyboard.down('Control'); pg.locator('.lab.gr').first.click(force=True); pg.keyboard.up('Control'); pg.wait_for_timeout(100)
    chk(ev("S.selAnn.grids.size")==1,'clic a l’etiqueta d’eix el selecciona')
    ev("clearAnnSel()")
    # visibilitat per element
    ev("S.model.levels[2].hidden=true;S.model.grids[1].hidden=true;rebuildAnnot()")
    chk(ev("LABELS.filter(l=>l.el.classList.contains('lv')).length")==2 and ev("LABELS.filter(l=>l.el.classList.contains('gr')).length")==1,'nivells i eixos ocults per separat')
    ev("S.show.levels=false;rebuildAnnot()"); chk(ev("LABELS.filter(l=>l.el.classList.contains('lv')).length")==0 and ev("LABELS.filter(l=>l.el.classList.contains('gr')).length")==1,'interruptor global de nivells independent dels eixos')
    ev("S.show.levels=true;S.model.levels[2].hidden=false;S.model.grids[1].hidden=false;rebuildAnnot()")
    # persistència
    js=ev("JSON.stringify(K.toJSON(S.model))"); ev("window.rt=K.fromJSON(JSON.parse(%s))"%repr(js).replace("'",'"') if False else "0")
    ok=ev("(()=>{const m=K.fromJSON(JSON.parse(JSON.stringify(K.toJSON(S.model))));return [m.meta.vis.lvl,m.meta.vis.grd]})()"); chk(ok==['compact','plan'],'modes desats al model '+str(ok))
    ev("S.model.levels[0].hidden=true"); ok=ev("K.fromJSON(JSON.parse(JSON.stringify(K.toJSON(S.model)))).levels[0].hidden"); chk(ok==True,'visibilitat per element desada'); ev("S.model.levels[0].hidden=false")
    # panells i menú
    chk(pg.locator('#tray select').count()>=2,'selectors de representació a la safata')
    chk(pg.locator('#tray input.eye').count()==3,'ulls per nivell a la safata')
    # barra d'eines i drecera
    ev("toggleSelBar(false)"); pg.keyboard.press('Control+Shift+F'); chk(ev("SB.open"),'Ctrl+Maj+F obre la barra de propietats'); ev("toggleSelBar(false)")
    chk(pg.locator('.tb[aria-label*="propietats"]').count()==1,'botó a la barra d’eines')
    # opcions
    ev("optsDlg()"); pg.fill('[data-o=pick]','12'); pg.dispatch_event('[data-o=pick]','change'); chk(ev("OPT.pick")==12 and '12' in ev("localStorage.getItem('guaitabimup.opts')"),'opció radi de captura desada')
    pg.click('[data-o=crossRL]'); chk(ev("OPT.crossRL")==False,'opció caixa de creuament')
    pg.click('#oDef'); chk(ev("OPT.pick")==6 and ev("OPT.crossRL")==True,'valors per defecte')
    pg.click('#oX')
    ev("OPT.fov=50;saveOpts()"); chk(ev("CAM.fov")==50,'FOV aplicat'); ev("OPT.fov=35;saveOpts()")
    # zoom cap al punter
    ev("S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();K.addPolyline(S.model,S.model.root,[[0,0,0],[4,0,0],[4,3,0],[0,3,0]],true);refreshAll();fitView()"); pg.wait_for_timeout(300)
    t0=ev("[CAM.target.x,CAM.target.y,CAM.target.z]"); pg.mouse.move(300,300); pg.mouse.wheel(0,-300); pg.wait_for_timeout(200)
    t1=ev("[CAM.target.x,CAM.target.y,CAM.target.z]"); chk(t0==t1,'zoom centrat: el centre no es mou')
    ev("OPT.zoomCursor=true"); pg.mouse.wheel(0,-300); pg.wait_for_timeout(200); t2=ev("[CAM.target.x,CAM.target.y,CAM.target.z]"); chk(t2!=t1,'zoom cap al punter: el centre es desplaça'); ev("OPT.zoomCursor=false")
    d0=ev("CAM.dist"); ev("OPT.wheelInv=true"); pg.mouse.wheel(0,-300); pg.wait_for_timeout(200); chk(ev("CAM.dist")>d0,'roda invertida allunya'); ev("OPT.wheelInv=false")
    # arestes visibles a diverses projeccions i distàncies
    ev("var c=S.model.root;c.faces.clear();c.edges.clear();c.verts.clear();K.addPolyline(S.model,c,[[0,0,0],[4,0,0],[4,3,0],[0,3,0]],true);K.pushPull(S.model,c,[...c.faces.values()][0].id,2);refreshAll()")
    def shot(): pg.wait_for_timeout(250); return Image.open(io.BytesIO(pg.screenshot(clip={'x':300,'y':200,'width':800,'height':500}))).convert('L')
    def diff():
        ev("S.style.edges=true;refreshAll()"); a=shot(); ev("S.style.edges=false;refreshAll()"); c=shot(); ev("S.style.edges=true;refreshAll()")
        return sum(1 for v in ImageChops.difference(a,c).getdata() if v>40)
    for proj in ['conic','axo','cav','mil']:
        ev(f"CAM.proj='{proj}';updCam();fitView()"); d1=diff(); ev("CAM.dist*=6;updCam()"); d2=diff()
        chk(d1>500 and d2>50,f'arestes visibles en {proj}: {d1} / {d2} px')
    print('ERRS',errs); chk(len(errs)==0,'sense errors de consola'); print('PASS',sum(res),'/',len(res)); b.close()
