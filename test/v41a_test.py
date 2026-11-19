from playwright.sync_api import sync_playwright
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.41.a.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}, device_scale_factor=3); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate
    chk(ev("VERSION")=='0.41.a','versió 0.41.a')
    chk(ev("document.querySelectorAll('.brand svg.ico-house').length")==1,'caseta a la capçalera (esquerra)')
    chk(ev("document.querySelectorAll('#navBtn svg.ico-house').length")==1,'caseta al botó de navegació')
    chk(ev("document.querySelectorAll('.brand .cells, #navBtn .cells').length")==0,'sense quadrats antics')
    chk(ev("!!document.querySelector('link[rel=icon][type=\"image/svg+xml\"]')"),'favicon SVG')
    chk(errs==[],'sense errors %s'%errs)
    pg.locator(".brand").screenshot(path="/tmp/brand_a.png"); pg.locator("#navBtn").screenshot(path="/tmp/nav_a.png")
    b.close()
print(res)
