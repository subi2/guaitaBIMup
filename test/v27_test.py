from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2029.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    chk(ev("VERSION")=='29','versió 27')
    chk(ev("OPT.navOrbit")=='alt' and ev("OPT.navPan")=='meta' and ev("OPT.navZoom")=='ctrl','per defecte Opció=òrbita, Cmd=desplaça, Ctrl=zoom')
    chk(ev("modNav({altKey:true,metaKey:false,ctrlKey:false,shiftKey:false})")=='orbit','Opció → òrbita')
    chk(ev("modNav({altKey:false,metaKey:true,ctrlKey:false,shiftKey:false})")=='pan','Cmd → desplaça')
    chk(ev("modNav({altKey:false,metaKey:false,ctrlKey:true,shiftKey:false})")=='zoom','Ctrl → zoom')
    chk(ev("modNav({altKey:false,metaKey:false,ctrlKey:false,shiftKey:false})")=='null' or ev("String(modNav({altKey:false,metaKey:false,ctrlKey:false,shiftKey:false}))")=='null','sense tecla → cap navegació')
    ev("OPT.navZoom='shift'"); chk(ev("modNav({shiftKey:true})")=='zoom','mapeig reassignable')
    ev("OPT.navZoom='ctrl'")
    d0=ev("CAM.dist"); ev("navMove('zoom',0,-50)"); chk(ev("CAM.dist")<d0,'zoom amunt apropa')
    chk(len(errs)==0,'sense errors de pàgina %s'%errs)
    b.close()
print("RESULTAT", res)
