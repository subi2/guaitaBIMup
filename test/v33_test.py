from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.33.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
FE = """window.FE=(p,q)=>{const c=ctxInfo().c; for(const e of c.edges.values()){const a=K.P(c,e.a),b=K.P(c,e.b); if((V.dist(a,p)<1e-6&&V.dist(b,q)<1e-6)||(V.dist(a,q)<1e-6&&V.dist(b,p)<1e-6)) return e;} return null;};"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    ev(FE)
    chk(ev("VERSION")=='0.33','versió 0.33')
    ev("S.model=K.newModel(); S.ctx=[]; S.undo=[]; S.undoL=[]; S.sel.edges.clear(); S.sel.faces.clear(); S.sel.groups.clear(); S.show.levels=false")
    # creuament automàtic: les dues línies es tallen al centre
    ev("S.tool='line'; st.from=[-2,0,0]; TOOLS.line.seg([2,0,0]); st.from=[0,-2,0]; TOOLS.line.seg([0,2,0]); st.from=null")
    r=ev("(()=>{const c=ctxInfo().c; const v=[...c.verts.values()].find(x=>V.dist(x.p,[0,0,0])<1e-6); return v?K.edgesAt(c,v.id).length:-1})()")
    chk(r==4,'creuament: vèrtex al centre amb 4 arestes %s'%r)
    # contigües: es fonen
    ev("st.from=[2,0,0]; TOOLS.line.seg([4,0,0]); st.from=null")
    r=ev("!!FE([0,0,0],[4,0,0]) && !FE([2,0,0],[4,0,0]) && !FE([0,0,0],[2,0,0])")
    chk(r==True,'contigües col·lineals es fonen en una sola aresta')
    # retallar: línia límit x=0; l'aresta (1,1)-(5,1) s'estén fins a x=0
    ev("S.model=K.newModel(); S.ctx=[]; S.undo=[]; S.undoL=[]; S.show.levels=false")
    ev("S.tool='line'; st.from=[0,-5,0]; TOOLS.line.seg([0,5,0]); st.from=[1,1,0]; TOOLS.line.seg([5,1,0]); st.from=null")
    ev("window.LB=FE([0,-5,0],[0,5,0]); window.LA=FE([1,1,0],[5,1,0])")
    r=ev("(()=>{const c=ctxInfo().c; const ok=trimTo(c, LB.id, LA.id, toScreen([1,1,0]).x, toScreen([1,1,0]).y); return ok && !!FE([0,1,0],[5,1,0]) && !FE([1,1,0],[5,1,0])})()")
    chk(r==True,'retallar/estendre l\'extrem fins a la línia límit')
    # dividir
    ev("S.model=K.newModel(); S.ctx=[]; S.show.levels=false")
    ev("S.tool='line'; st.from=[0,0,0]; TOOLS.line.seg([4,0,0]); st.from=null")
    r=ev("(()=>{const c=ctxInfo().c; const e=FE([0,0,0],[4,0,0]); const x=splitAt(c,e,[2,0,0],null); return !!x && !!FE([0,0,0],[2,0,0]) && !!FE([2,0,0],[4,0,0]) && !FE([0,0,0],[4,0,0])})()")
    chk(r==True,'dividir una línia en un punt')
    # mirall
    r=ev("(()=>{const q=mirrorP([3,2,0],[0,0,0],[0,1,0]); return Math.abs(q[0]+3)<1e-9 && Math.abs(q[1]-2)<1e-9})()")
    chk(r==True,'emmiralla respecte a l\'eix Y')
    # alinear: punt mig de la línia (2,3)-(6,3) sobre la referència y=0
    ev("S.model=K.newModel(); S.ctx=[]; S.undo=[]; S.undoL=[]; S.show.levels=false")
    ev("S.tool='line'; st.from=[0,0,0]; TOOLS.line.seg([10,0,0]); st.from=[20,20,0]; TOOLS.line.seg([24,20,0]); st.from=null")
    ev("window.RF=FE([0,0,0],[10,0,0]); window.TG=FE([20,20,0],[24,20,0])")
    r=ev("(()=>{const c=ctxInfo().c; alignTo(c,RF.id,TG.id); return Math.abs(K.P(c,TG.a)[1])<1e-6 && Math.abs(K.P(c,TG.b)[1])<1e-6})()")
    chk(r==True,'alinea la línia a la referència')
    # desfasar 2 m cap a y negatiu
    r=ev("(()=>{const c=ctxInfo().c; const e=FE([0,0,0],[10,0,0]); offsetLine(c,e.id,1,2); return !!FE([0,-2,0],[10,-2,0])})()")
    chk(r==True,'desfasa una línia 2 m')
    # teclat: dues lletres
    ev("S.tool='select'; S.ctx=[]")
    pg.keyboard.press("t"); pg.keyboard.press("r")
    chk(ev("S.tool")=='trim','tecla TR activa Retallar')
    pg.wait_for_timeout(450)
    pg.keyboard.press("l")
    pg.wait_for_timeout(450)
    chk(ev("S.tool")=='line','tecla L sola continua activant Línia')
    chk(len(errs)==0,'sense errors de pàgina %s'%errs)
    b.close()
print("RESULTAT", res)
