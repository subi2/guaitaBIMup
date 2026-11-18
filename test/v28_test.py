from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2029.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
TEST_D = "(()=>{const f=cam.getWorldDirection(new THREE.Vector3());const e=annotExtent();const p=lvlLabelPt(e,S.model.levels[0]);return [p[0]*f.x+p[1]*f.y, e.x0*f.x+e.y0*f.y, e.x1*f.x+e.y1*f.y, e.x0*f.x+e.y1*f.y, e.x1*f.x+e.y0*f.y]})()"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    chk(ev("VERSION")=='29','versió 28')
    ev("createLevel(3.0); refreshAll()")
    for th in (0.7, 3.9):
        ev(f"CAM.proj='axo'; CAM.theta={th}; CAM.phi=1.0; updCam(); updBackCorner()")
        d=ev(TEST_D)
        chk(d[0] >= max(d[1:]) - 1e-6 or d[0] <= min(d[1:])+1e-6, f'etiqueta de nivell en el cantó de darrera (axo, theta={th})')
    ev("CAM.phi=0.01; updCam(); updBackCorner()")
    chk(ev("lvlLabelPt(annotExtent(),S.model.levels[0])")[0] > ev("annotExtent().x1"),'en planta, etiqueta a la dreta')
    ev("CAM.phi=1.0; updCam(); updBackCorner()")
    chk(ev("typeof snapDot")=='function' and ev("typeof snapAlts")=='function','funcions de snap i punt de color presents')
    ev("setTool('line')")
    chk(ev("(SNAP_CYC=0, pick(300,300).kind)") is not None,'pick sense Tab')
    chk(ev("(SNAP_CYC=2, pick(300,300).kind)") is not None,'pick amb Tab ciclat sense errors')
    ev("SNAP_CYC=0; setTool('select')")
    chk(len(errs)==0,'sense errors de pàgina %s'%errs)
    b.close()
print("RESULTAT", res)
