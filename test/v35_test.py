from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.35.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
RESET = "S.model=K.newModel(); S.ctx=[]; S.undo=[]; S.undoL=[]; S.sel.edges.clear(); S.sel.faces.clear(); S.sel.groups.clear(); S.show.levels=false; S.tool='select'"
NEAR=lambda a,b: abs(a-b)<1e-6
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    chk(ev("VERSION")=='0.35','versió 0.35')
    # --- murs: TR entre dos murs ---
    ev(RESET)
    ev("window.W1=makeWall([0,0],[4,0]); window.W2=makeWall([6,-2],[6,3]);")
    ok=ev("cornerAny(ctxInfo().c, {kind:'wall',id:W1.id}, {kind:'wall',id:W2.id}, [3,0,0], [6,1,0])")
    p1=ev("W1.par.b"); p2=ev("W2.par.a")
    chk(ok==True and NEAR(p1[0],6) and NEAR(p1[1],0),'mur 1 s’estén fins a la cantonada %s'%p1)
    chk(ok==True and NEAR(p2[0],6) and NEAR(p2[1],0),'mur 2 es retalla a la cantonada %s'%p2)
    chk(ev("S.undoL[S.undoL.length-1]")=='retallar','desfer etiquetat «retallar»')
    # --- murs: el clic decideix quin extrem es mou ---
    ev(RESET)
    ev("window.W3=makeWall([0,0],[4,0]); window.W4=makeWall([6,-2],[6,3]);")
    ev("cornerAny(ctxInfo().c, {kind:'wall',id:W3.id}, {kind:'wall',id:W4.id}, [1,0,0], [6,-1,0])")
    chk(NEAR(ev("W3.par.b[0]"),6) and NEAR(ev("W3.par.a[0]"),0),'clic al costat de l’origen → es mou l’extrem b')
    # --- plans de referència: TR entre pla i mur ---
    ev(RESET)
    ev("S.model.refs=[{id:S.model.nid++, name:'PR1', a:[0,5], b:[4,5]}]; window.R1=S.model.refs[0]; window.W5=makeWall([6,-2],[6,3]);")
    ok=ev("cornerAny(ctxInfo().c, {kind:'ref',id:R1.id}, {kind:'wall',id:W5.id}, [3,5,0], [6,1,0])")
    chk(ok==True and NEAR(ev("R1.b[0]"),6) and NEAR(ev("R1.b[1]"),5),'pla de referència s’estén fins al mur %s'%ev("R1.b"))
    chk(ev("W5.par.b[1]")==5 or NEAR(ev("W5.par.b[1]"),5),'mur s’estén fins al pla de referència')
    # --- paral·leles: no es poden tallar ---
    ev(RESET)
    ev("window.W6=makeWall([0,0],[4,0]); window.W7=makeWall([0,2],[4,2]);")
    ok=ev("cornerAny(ctxInfo().c, {kind:'wall',id:W6.id}, {kind:'wall',id:W7.id}, [1,0,0], [1,2,0])")
    chk(ok==False,'murs paral·lels no es tallen')
    # --- regressió: TR entre línies 3D en pla vertical (v0.34) ---
    ev(RESET)
    ev("const c=ctxInfo().c; const v0=K.addVertexRaw(S.model,c,[0,0,2]), v1=K.addVertexRaw(S.model,c,[4,0,2]), v2=K.addVertexRaw(S.model,c,[6,0,-1]), v3=K.addVertexRaw(S.model,c,[6,0,3]); window.LA=K.addEdgeRaw(S.model,c,v0.id,v1.id); window.LB=K.addEdgeRaw(S.model,c,v2.id,v3.id)")
    ok=ev("cornerTrim(ctxInfo().c, LA.id, LB.id, [3,0,2], [6,0,2.5])")
    chk(ok==True,'TR línies en pla vertical (regressió v0.34)')
    # --- eina TR: clics amb ratolí ---
    ev(RESET)
    ev("window.W8=makeWall([0,0],[4,0]); window.W9=makeWall([6,-2],[6,3]); setTool('trim');")
    cx=ev("(()=>{const r=view.getBoundingClientRect(); const a=toScreen([3,0,0]), b=toScreen([6,1,0]); return [a.x+r.left,a.y+r.top,b.x+r.left,b.y+r.top]})()")
    pg.mouse.move(cx[0],cx[1]); pg.wait_for_timeout(100); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(100)
    pg.mouse.move(cx[2],cx[3]); pg.wait_for_timeout(100); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(200)
    chk(NEAR(ev("W8.par.b[0]"),6) and NEAR(ev("W9.par.a[1]"),0),'eina TR amb ratolí aplica la cantonada a murs')
    chk(len(errs)==0,'sense errors de pàgina %s'%errs)
    b.close()
print("RESULTAT", res)
