from playwright.sync_api import sync_playwright
import math
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.38.1.d.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate
    chk(ev("VERSION")=='0.38.1.d','versió 0.38.1.d')
    chk(ev("typeof GizmoLib")=='undefined','sense gizmo extern')
    box=lambda: ev("(()=>{const r=$('vcube').getBoundingClientRect(); return [r.left,r.top,r.width,r.height]})()")
    def shot(n,th,ph):
        ev("CAM.theta=%f; CAM.phi=%f; updCam(); needRender=true"%(th,ph)); pg.wait_for_timeout(300)
        r=box(); pg.screenshot(path="/tmp/%s.png"%n,clip={"x":r[0]-8,"y":r[1]-8,"width":r[2]+16,"height":r[3]+16})
    shot("h1",-math.pi/3,1.15); shot("h2",2.2,1.4); shot("h3",0.5,2.3)
    # clics: troba la cara visible i comprova la vista
    def clickFace(name):
        c=ev("""(()=>{const b=cubeBasis(), r=$('vcube').getBoundingClientRect(); const f=houseFaces(b).find(f=>f.t==='%s'); if(!f) return null; const c=HC(f), q=cubeProj(c,b); return [r.left+q[0]/120*r.width, r.top+q[1]/120*r.height]})()"""%name)
        if not c: return False
        pg.mouse.move(c[0],c[1]); pg.wait_for_timeout(100); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(1500); return True
    ev("CAM.theta=-Math.PI/3; CAM.phi=1.15; updCam()"); pg.wait_for_timeout(200)
    chk(clickFace('Davant') and abs(ev("CAM.theta")+math.pi/2)<0.1 and abs(ev("CAM.phi")-math.pi/2)<0.1,'clic a Davant → alçat sud (θ=%.2f φ=%.2f)'%(ev("CAM.theta"),ev("CAM.phi")))
    ev("CAM.theta=-Math.PI/3; CAM.phi=1.15; updCam()"); pg.wait_for_timeout(200)
    chk(clickFace('Dalt') and ev("CAM.phi")<0.1,'clic a la teulada → planta (φ=%.3f)'%ev("CAM.phi"))
    ev("CAM.theta=-Math.PI/3; CAM.phi=1.15; updCam()"); pg.wait_for_timeout(200)
    chk(clickFace('Dreta') and abs(ev("CAM.theta"))<0.1,'clic a Dreta → vista +X (θ=%.2f)'%ev("CAM.theta"))
    # arrossegar gira
    t0=ev("CAM.theta"); r=box(); cx=r[0]+r[2]/2; cy=r[1]+r[3]/2
    pg.mouse.move(cx+45,cy+45); pg.mouse.down(); pg.mouse.move(cx+80,cy+50,steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
    chk(abs(ev("CAM.theta")-t0)>0.02,'arrossegar gira la càmera')
    chk(len(errs)==0,'sense errors %s'%errs)
    b.close()
print("RESULTAT", res)
