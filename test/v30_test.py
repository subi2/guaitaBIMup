from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.30.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    chk(ev("VERSION")=='0.30','versió 0.30')
    # etiqueta de nivell: veí de l'esquerra de la cantonada de darrere
    ev("CAM.phi=1.0; CAM.theta=0.7; updBackCorner(); rebuildAnnot()")
    r=ev("(()=>{const e=annotExtent(),k=backCorner(); const R=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0); const C=[[e.x0,e.y0],[e.x1,e.y0],[e.x1,e.y1],[e.x0,e.y1]]; const nb=[(k+1)%4,(k+3)%4]; const sx=i=>C[i][0]*R.x+C[i][1]*R.y; const j=sx(nb[0])<=sx(nb[1])?nb[0]:nb[1]; const p=lvlLabelPt(e,{elev:0}); return {k,j,ok:Math.abs(p[0]-C[j][0])<=0.7&&Math.abs(p[1]-C[j][1])<=0.7&&j!==k}})()")
    chk(r and r['ok'],'etiqueta al vèrtex veí esquerre, no al de darrere %s'%(r,))
    # origen com a snap
    ev("SNAP={verts:[],edges:[]}")
    ev("window.OS=toScreen([0,0,0])")
    r=ev("(()=>{const a=snapAlts(OS.x,OS.y,mouseRay(OS.x,OS.y));return a.map(x=>x.kind)})()")
    chk('origin' in r,'snap a l\'origen detectat %s'%(r,))
    # eina Copiar i etiqueta de desfer
    chk(ev("typeof TOOLS.copy==='object' && typeof TOOLS.copy.commit==='function'"),'eina Copiar registrada')
    ev("S.tool='move'; SNAP={verts:[],edges:[]}")
    ev("S.undo=[]; S.undoL=[]; pushUndo()")
    chk(ev("S.undoL[0]")=='moure','etiqueta d\'undo «moure» %s'%ev("S.undoL"))
    ev("S.tool='copy'; pushUndo()")
    chk(ev("S.undoL[S.undoL.length-1]")=='copiar','etiqueta d\'undo «copiar» per l\'eina Copiar')
    chk('copiar' in ev("document.getElementById('tb_undo').title"),'títol del botó Desfer diu «copiar» %s'%ev("document.getElementById('tb_undo').title"))
    ev("undo()")
    chk(ev("S.undoL.length")==1,'desfer treu l\'etiqueta de la pila')
    chk(len(errs)==0,'sense errors de pàgina %s'%errs)
    b.close()
print("RESULTAT", res)
