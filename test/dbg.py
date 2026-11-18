from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(); pg.on("pageerror",lambda e:print("ERR",e)); pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    ev("window.R=makeRoof([[0,0],[10,0],[10,6],[0,6]]);0"); pg.wait_for_timeout(300)
    ev("GRIP.sel='s1'"); pg.fill('#vcb','20°'); pg.press('#vcb','Enter')
    print(ev("[R.par.sl[1].on, S.undo? S.undo.length : (typeof UNDO!=='undefined'?UNDO.length:'?')]"))
    ev("document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(200)
    print(ev("[...S.model.root.groups.values()].map(g=>g.par&&JSON.stringify(g.par.sl))"))
    b.close()
