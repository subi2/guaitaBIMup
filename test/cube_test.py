from playwright.sync_api import sync_playwright
import math
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800)
    th=lambda: pg.evaluate("CAM.theta"); ph=lambda: pg.evaluate("CAM.phi")
    t0=th(); pg.click("#vcR"); pg.wait_for_timeout(700); d=(th()-t0+math.pi)%(2*math.pi)-math.pi
    chk(abs(abs(d)-math.pi/2)<1e-3, "fletxa dreta gira 90° (%.4f)" % d)
    t1=th(); pg.click("#vcL"); pg.wait_for_timeout(700); d=(th()-t1+math.pi)%(2*math.pi)-math.pi
    chk(abs(d+math.pi/2)<1e-3, "fletxa esquerra gira -90° (%.4f)" % d)
    p0=ph(); pg.click("#vcU"); pg.wait_for_timeout(700)
    chk(abs(ph()-max(0.05,p0-math.pi/2))<1e-3, "fletxa amunt canvia la inclinació (%.4f -> %.4f)" % (p0,ph()))
    chk(pg.evaluate("VERSION")=="24", "versió 24")
    chk(not errs, "sense errors %s" % errs)
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
