from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2029.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    chk(ev("VERSION")=='29','versió 29')
    chk(ev("OPT.axisPx")==14,'zona d’eixos per defecte 14 px')
    # creuament de dues vores al pla XY, vist des de dalt
    ev("SNAP={verts:[],edges:[{a:[0,0,0],b:[2,0,0]},{a:[1,-1,0],b:[1,1,0]}]}")
    ev("window.RAY={o:[1,0,10],d:[0,0,-1]}")
    ev("window.SP=toScreen([1,0,0])")
    r=ev("(()=>{const c=snapCrossings(SP.x,SP.y,RAY,0);return c?[c.kind,c.p]:null})()")
    chk(r is not None and r[0]=='inter_edges' and abs(r[1][0]-1)<1e-6 and abs(r[1][1])<1e-6,'intersecció vora–vora detectada %s'%(r,))
    # vora que travessa el pla de treball
    ev("SNAP={verts:[],edges:[{a:[2,5,-1],b:[2,5,1]}]}")
    ev("window.SP2=toScreen([2,5,0])")
    r=ev("(()=>{const c=snapCrossings(SP2.x,SP2.y,{o:[10,5,0],d:[-1,0,0]},0);return c?[c.kind,c.p]:null})()")
    chk(r is not None and r[0]=='inter_plane','intersecció vora–pla de treball %s'%(r,))
    # vora que travessa l'eix Z
    ev("SNAP={verts:[],edges:[{a:[1,0,-1],b:[-1,0,3]}]}")
    ev("window.SP3=toScreen([0,0,1])")
    r=ev("(()=>{const c=snapCrossings(SP3.x,SP3.y,{o:[10,0,1],d:[-1,0,0]},5);return c?[c.kind,c.p]:null})()")
    chk(r is not None and r[0]=='inter_axis','intersecció vora–eix %s'%(r,))
    chk(len(errs)==0,'sense errors de pàgina %s'%errs)
    b.close()
print("RESULTAT", res)
