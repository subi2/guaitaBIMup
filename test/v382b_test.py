from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.38.2.b.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=pg.evaluate
    chk(ev("VERSION")=='0.38.2.b','versió')
    off=ev("(()=>{const r=document.getElementById('view').getBoundingClientRect();return [r.left,r.top]})()")
    def setup():
        ev("S.model.dims.length=0;S.model.texts.length=0;S.model.dims.push({id:S.model.nid++,a:[0,0,0],b:[4,0,0],off:[0,-1,0]},{id:S.model.nid++,a:[0,3,0],b:[4,3,0],off:[0,1,0]});S.model.texts.push({id:S.model.nid++,p:[5,0,1],t:'Hola'});refreshAll();needRender=true")
        ev("CAM.proj='axo';CAM.theta=-1.57;CAM.phi=1.2;CAM.target.set(2,0,0);CAM.dist=14;updCam();needRender=true"); pg.wait_for_timeout(400)
    def scr(p): return ev("(()=>{const s=toScreen(%s);return [s.x,s.y]})()"%p)
    def click(p,mod=None):
        x,y=off[0]+p[0],off[1]+p[1]; pg.mouse.move(x,y)
        if mod: pg.keyboard.down(mod)
        pg.mouse.down(); pg.mouse.up()
        if mod: pg.keyboard.up(mod)
    setup(); ev("setTool('select')")
    mid=scr("V.add(V.lerp([0,0,0],[4,0,0],0.5),[0,-1,0])")
    click(scr("[1,-1,0]")); chk(ev("S.selAnn.dims.size")==1,'clic a la línia de cota la selecciona')
    chk(ev("document.querySelectorAll('.lab.dimtxt.sel').length")==1,'text de la cota ressaltat')
    pg.keyboard.press("Delete"); pg.wait_for_timeout(100)
    chk(ev("S.model.dims.length")==1 and ev("S.selAnn.dims.size")==0,'Supr esborra la cota seleccionada')
    chk(ev("S.undoL[S.undoL.length-1]")=='esborrar','undo etiquetat «esborrar»')
    ev("undo()"); chk(ev("S.model.dims.length")==2,'desfer recupera la cota')
    setup(); click(scr("[1,-1,0]")); click(scr("[1,4,0]"),'Shift'); chk(ev("S.selAnn.dims.size")==2,'Maj+clic afegeix una segona cota')
    click(scr("[1,4,0]"),'Shift'); chk(ev("S.selAnn.dims.size")==1,'Maj+clic la treu')
    click(scr("[5,0,1]")); chk(ev("S.selAnn.texts.size")==1 and ev("S.selAnn.dims.size")==0,'clic al text el selecciona (substitueix)')
    click([50,50]); chk(ev("S.selAnn.texts.size+S.selAnn.dims.size")==0,'clic al buit deselecciona')
    # rectangle
    x0,y0=off[0]+10,off[1]+10; W,H=ev('[view.clientWidth-20,view.clientHeight-20]'); pg.mouse.move(x0+W,y0+H); pg.mouse.down(); pg.mouse.move(x0,y0,steps=5); pg.mouse.up(); pg.wait_for_timeout(100)
    chk(ev("S.selAnn.dims.size")==2 and ev("S.selAnn.texts.size")==1,'rectangle de selecció agafa cotes i text (%d,%d)'%(ev("S.selAnn.dims.size"),ev("S.selAnn.texts.size")))
    pg.keyboard.press("Delete"); chk(ev("S.model.dims.length+S.model.texts.length")==0,'Supr esborra selecció múltiple')
    ev("undo()"); chk(ev("S.model.dims.length")==2 and ev("S.model.texts.length")==1,'desfer recupera tot')
    # goma
    ev("setTool('eraser')"); pg.mouse.move(off[0]+scr("[1,-1,0]")[0],off[1]+scr("[1,-1,0]")[1]); pg.mouse.down(); pg.mouse.up()
    chk(ev("S.model.dims.length")==1,'la goma esborra una cota')
    pg.mouse.move(off[0]+scr("[5,0,1]")[0],off[1]+scr("[5,0,1]")[1]); pg.mouse.down(); pg.mouse.up()
    chk(ev("S.model.texts.length")==0,'la goma esborra un text')
    # geometria segueix funcionant
    ev("setTool('select')"); chk(ev("typeof selCount")=='function','geometria intacta')
    chk(not errs,'sense errors %s'%errs)
    b.close()
print("RESULTAT",res)
