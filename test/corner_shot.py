from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1100,"height":700}); pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    ev("createLevel(3.0); S.level=S.model.levels.slice().sort((a,b)=>a.elev-b.elev)[0].id; setLevel(S.level)")
    ev("makeWall([0,0,0],[6,0,0]); makeWall([6,0,0],[6,4,0]); makeWall([6,4,0],[0,4,0]); makeWall([0,4,0],[0,0,0]); clearSel(); refreshAll(); animateCam({proj:'axo',theta:-0.8,phi:0.95,t:[3,2,1.5],dist:16}); 0")
    pg.wait_for_timeout(900); pg.locator("#viewWrap").screenshot(path="/home/claude/g3d/out/corner1.png")
    ev("animateCam({theta:-2.4}); 0"); pg.wait_for_timeout(900); pg.locator("#viewWrap").screenshot(path="/home/claude/g3d/out/corner2.png")
    b.close()
