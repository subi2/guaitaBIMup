from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.31.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    chk(ev("VERSION")=='0.31','versió 0.31')
    chk(ev("OPT.snapGrid===true && OPT.snapStep===0.5")==True,'quadrícula activa per defecte, pas 0.5 m')
    # punt de quadrícula a prop del cursor
    ev("OPT.snapStep=1; SNAP={verts:[],edges:[]}; window.GS=toScreen([2,4,0])")
    r=ev("(()=>{const p=snapGridPt(GS.x,GS.y,{o:[2.1,4.1,10],d:[0,0,-1]},0);return p?[p.kind,p.p]:null})()")
    chk(r is not None and r[0]=='sgrid' and r[1][0]==2 and r[1][1]==4,'snap a la quadrícula (2,4) %s'%(r,))
    # lluny de la quadrícula no enganxa
    r=ev("(()=>{return snapGridPt(GS.x+40,GS.y,{o:[2.1,4.1,10],d:[0,0,-1]},0)})()")
    chk(r is None,'fora de la zona no enganxa')
    ev("OPT.snapGrid=false")
    r=ev("(()=>{return snapGridPt(GS.x,GS.y,{o:[2.1,4.1,10],d:[0,0,-1]},0)})()")
    chk(r is None,'desactivada no enganxa')
    ev("OPT.snapGrid=true")
    # eixos equidistants «2x3»
    ev("S.model.grids=[]; window.G0=createGrid([0,0],[10,0]); st.lastGrid=G0.id; TOOLS.grid.vcb('2x3')")
    ys=ev("S.model.grids.map(g=>+g.b[1].toFixed(3))")
    chk(sorted(ys)==[0,2,4,6],'tres eixos equidistants a 2 m %s'%(ys,))
    chk(len(set(ev("S.model.grids.map(g=>g.name)")))==4,'noms d\'eixos únics')
    chk(len(errs)==0,'sense errors de pàgina %s'%errs)
    b.close()
print("RESULTAT", res)
