from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.34.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
FE = """window.FE=(p,q)=>{const c=ctxInfo().c; for(const e of c.edges.values()){const a=K.P(c,e.a),b=K.P(c,e.b); if((V.dist(a,p)<1e-6&&V.dist(b,q)<1e-6)||(V.dist(a,q)<1e-6&&V.dist(b,p)<1e-6)) return e;} return null;};"""
RESET = "S.model=K.newModel(); S.ctx=[]; S.undo=[]; S.undoL=[]; S.sel.edges.clear(); S.sel.faces.clear(); S.sel.groups.clear(); S.show.levels=false; S.tool='select'"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    ev(FE)
    chk(ev("VERSION")=='0.34','versió 0.34')
    r=ev("(()=>{const ks=CMDS.map(c=>KEYS[c[0]]).filter(Boolean); return [ks.length===new Set(ks).size, ks.every(k=>/^[A-Z]{2}$/.test(k))]})()")
    chk(r==[True,True],'dreceres úniques i de dues lletres %s'%r)
    r=ev("CMDS.filter(c=>c[2]==='tool' && !TOOLS[c[3]]).map(c=>c[0])")
    chk(r==[],'totes les eines de dreceres existeixen %s'%r)
    # teclat: dues lletres activen; una lletra sola no
    ev(RESET)
    pg.keyboard.press("t"); pg.keyboard.press("r")
    chk(ev("S.tool")=='trim','TR activa Retalla/estén a cantonada')
    pg.keyboard.press("m"); pg.keyboard.press("v")
    chk(ev("S.tool")=='move','MV activa Mou')
    pg.keyboard.press("l"); pg.wait_for_timeout(1000)
    chk(ev("S.tool")=='move','una lletra sola no activa res')
    # editor: canvia una drecera i provoca conflicte
    ev("setKey('rect','XY')")
    pg.keyboard.press("x"); pg.keyboard.press("y")
    chk(ev("S.tool")=='rect','drecera nova XY activa Rectangle')
    ev("setKey('circle','XY')")
    chk(ev("KEYS.rect")=='' and ev("KEYS.circle")=='XY','conflicte: l’anterior queda sense drecera')
    ev("KEYS.rect='RC'; rebuildKeys()")
    # TR en un pla vertical (no és el pla de treball)
    ev(RESET)
    ev("st.from=[0,0,2]; TOOLS.line.seg([4,0,2]); st.from=null; st.from=[6,0,-1]; TOOLS.line.seg([6,0,3]); st.from=null")
    ev("window.LA=FE([0,0,2],[4,0,2]); window.LB=FE([6,0,-1],[6,0,3])")
    ok=ev("cornerTrim(ctxInfo().c, LA.id, LB.id, [3,0,2], [6,0,2.5])")
    chk(ok==True and ev("!!FE([0,0,2],[6,0,2])") and ev("!!FE([6,0,2],[6,0,3])") and ev("!FE([0,0,2],[4,0,2])"),'TR en pla vertical: les dues línies s’estenen i es tallen a la cantonada')
    # JO: dues línies contigües i col·lineals es fonen
    ev(RESET)
    ev("const c=ctxInfo().c; const v0=K.addVertexRaw(S.model,c,[0,0,0]), v1=K.addVertexRaw(S.model,c,[2,0,0]), v2=K.addVertexRaw(S.model,c,[4,0,0]); window.J1=K.addEdgeRaw(S.model,c,v0.id,v1.id); window.J2=K.addEdgeRaw(S.model,c,v1.id,v2.id)")
    ok=ev("joinPair(ctxInfo().c, J1.id, J2.id)")
    chk(ok==True and ev("!!FE([0,0,0],[4,0,0])"),'JO fusiona contigües col·lineals')
    chk(len(errs)==0,'sense errors de pàgina %s'%errs)
    b.close()
print("RESULTAT", res)
