from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1300,"height":800}); pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    ev("createLevel(3.0); S.show.levels=false; window.R=makeRoof([[0,0],[10,0],[10,6],[0,6]]); R.par.sl[0].on=R.par.sl[2].on=true; R.par.sl[2].v=50; refreshAll(); animateCam({proj:'axo',theta:-1.0,phi:1.0,t:[5,3,0.5],dist:24}); 0"); pg.wait_for_timeout(900)
    pg.screenshot(path="/home/claude/g3d/out/v21a.png")
    ev("R.par.mode='pts'; R.par.dz=[0.2,0.2,0.2,0.2]; R.par.extra=[{p:[5,3],z:0}]; refreshAll()"); pg.wait_for_timeout(400); pg.locator("#viewWrap").screenshot(path="/home/claude/g3d/out/v21b.png"); b.close()
