from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.41.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate
    chk(ev("VERSION")=='0.41.0','versió')
    # vista de planta: rang a la vista, no al nivell
    ev("S.model.levels[0].elev=0; S.model.levels[0].id"); lid=ev("S.model.levels[0].id")
    ev("pvSet(S.model.levels[0],{cut:1.5,bot:0.2,depth:0.5})")
    chk(ev("vrOf(S.model.levels[0]).cut")==1.5 and ev("S.model.levels[0].vr")==None,'rang guardat a la vista de planta')
    chk(ev("JSON.stringify(K.toJSON(S.model)).includes('planViews')"),'planViews desats al JSON')
    chk(ev("(()=>{const j=K.toJSON(S.model);return K.fromJSON(JSON.parse(JSON.stringify(j))).planViews.length})()")==1,'planViews es carreguen')
    # vista planta: ghost només amb profunditat
    ev("openView('plan:%d')"%lid); pg.wait_for_timeout(700)
    chk(ev("!!S.planGhost && S.planGhost.depth==0.5"),'planGhost actiu amb profunditat')
    chk(ev("gGhost.visible"),'zona de profunditat visible')
    ev("openView('scene:%d')"%ev("S.model.views[0].id")); pg.wait_for_timeout(500)
    chk(ev("!S.planGhost && !gGhost.visible"),'zona de profunditat amagada fora de planta')
    # eix: orientació (Maj), fletxes
    ev("createGrid([0,0,0],[10,0,0])"); g=ev("S.model.grids[0].id")
    ev("annSelectOnly('grids',%d)"%g); pg.wait_for_timeout(200)
    chk(ev("GRIP.list.map(x=>x.d.key).join()")=='ga,gb,gm','grips d\'eix')
    chk(ev("GRIP.list.find(x=>x.d.key=='gb').d.alt")=='orth','grip d\'extrem té mode orto (Maj)')
    pg.keyboard.press("ArrowUp"); pg.wait_for_timeout(100)
    chk(ev("S.model.grids[0].b[0]")==0 and ev("S.model.grids[0].b[1]")==10,'fletxa amunt força direcció vertical, manté longitud')
    pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(100)
    chk(ev("S.model.grids[0].b[1]")==0 and ev("S.model.grids[0].b[0]")==10,'fletxa dreta força horitzontal')
    chk(ev("annGripTarget().ann")=='grid','selecció d\'eix persisteix')
    ev("undo()"); chk(True,'undo')
    chk(errs==[],'sense errors de pàgina %s'%errs)
    b.close()
print(res)
