from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.32.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    chk(ev("VERSION")=='0.32','versió 0.32')
    chk(ev("OPT.axisPxZ")==20,'zona de l’eix blau per defecte 20 px')
    # cursor exactament sobre l'eix blau a 3 m
    ev("window.ZS=toScreen([0,0,3]); window.ZS2=toScreen([0,0,0.0])")
    r=ev("(()=>{const q=axisScreenPick([0,0,0],2,ZS.x+3,ZS.y);return q?[q.p[2],q.d]:null})()")
    chk(r is not None and abs(r[0]-3)<0.1 and r[1]<4,'eix blau: punt a 3 m amb cursor a 3 px %s'%(r,))
    # cursor lluny de l'eix no enganxa al blau
    r=ev("(()=>{return pickBase(ZS.x+60,ZS.y,{from:[0,0,0]}).axis})()")
    chk(r!=2,'a 60 px de l’eix blau no enganxa al blau %s'%r)
    # enganxament al blau a prop
    r=ev("(()=>{const x=pickBase(ZS.x+4,ZS.y,{from:[0,0,0]});return [x.axis,x.kind]})()")
    chk(r[0]==2 and r[1]=='axis','enganxa al blau amb cursor a 4 px %s'%(r,))
    # color de la línia de traçat = color de l'eix
    ev("T=TOOLS.line; S.tool='line'; st.from=[0,0,0]")
    ev("TOOLS.line.move({}, ZS.x+3, ZS.y)")
    col=ev("(()=>{const ls=gPrev.children; return ls.length?ls[ls.length-1].material.color.getHex():null})()")
    chk(col==0x3B6FDB,'línia de traçat pintada del blau de l’eix %s'%(col,))
    ev("st.from=[0,0,0]; S.tool='line'")
    ev("TOOLS.line.move({}, ZS.x+60, ZS.y+60)")
    col=ev("(()=>{const ls=gPrev.children; return ls.length?ls[ls.length-1].material.color.getHex():null})()")
    chk(col==0x1B1D21,'línia lliure en color neutre %s'%(col,))
    chk(len(errs)==0,'sense errors de pàgina %s'%errs)
    b.close()
print("RESULTAT", res)
