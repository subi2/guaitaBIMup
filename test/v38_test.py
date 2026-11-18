from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("file:///home/claude/g3d/out/guaitaBIMup_v0.38.1.html?nou"); pg.wait_for_timeout(800); ev=pg.evaluate
    r=[]
    ev("setTool('line')"); pg.keyboard.press("Escape"); r.append(ev("S.tool")=='select')
    ev("setTool('line'); st.from=[0,0,0]"); pg.keyboard.press("Escape"); r.append(ev("S.tool")=='line' and ev("Object.keys(st).length")==0)
    pg.keyboard.press("Escape"); r.append(ev("S.tool")=='select')
    ev("setTool('move')"); pg.keyboard.press("Escape"); r.append(ev("S.tool")=='select')
    pg.keyboard.press("Escape"); r.append(ev("S.tool")=='select')
    print(r, errs); b.close()
