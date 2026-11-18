from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.37.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
RESET = "S.model=newModel(); S.level=S.model.levels[0].id; S.ctx=[]; S.undo=[]; S.undoL=[]; S.sel.edges.clear(); S.sel.faces.clear(); S.sel.groups.clear(); S.show.levels=true; S.tool='select'"
NEAR=lambda a,b,t=1e-6: abs(a-b)<t
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    chk(ev("VERSION")=='0.37','versió 0.37')
    ev(RESET); pg.wait_for_timeout(200)
    # --- pla de treball a la cota del primer punt (cursor lliure) ---
    r=ev("(()=>{const o=pickBase(700,500,{from:[1,1,3]}); return [o.kind,o.p[2]]})()")
    chk(r[0]=='plane' and NEAR(r[1],3,1e-6),'sense snap: el segon punt cau a la cota del primer (z=3) %s'%r)
    r=ev("(()=>{const o=pickBase(700,500,{}); return [o.kind,o.p[2]]})()")
    chk(NEAR(r[1],ev("workZ()")),'sense primer punt: pla del nivell actiu %s'%r)
    # --- eina nivell en dos passos ---
    ev("setTool('level')")
    n0=ev("S.model.levels.length")
    pg.mouse.move(700,500); pg.wait_for_timeout(100); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(100)
    chk(ev("!!st.from"),'nivell: primer clic fixa punt de referència')
    chk(ev("S.model.levels.length")==n0,'nivell: encara no creat')
    ev("TOOLS.level.vcb('3.2')"); 
    chk(ev("S.model.levels.length")==n0+1 and any(abs(l['elev']-3.2)<1e-6 for l in ev("S.model.levels")),'nivell a la cota escrita 3.2')
    # estirat amb ratolí: punt en pantalla de (x,y,2.5) sobre la vertical
    ev("setTool('level')")
    xy=ev("(()=>{const r=view.getBoundingClientRect(),a=toScreen([0,0,0]); return [a.x+r.left,a.y+r.top]})()")
    ev("st.from=[0,0,0]"); 
    t=ev("(()=>{const r=view.getBoundingClientRect(),a=toScreen([0,0,2.5]); return [a.x+r.left,a.y+r.top]})()")
    pg.mouse.move(t[0],t[1]); pg.wait_for_timeout(100); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(150)
    zs=sorted(l['elev'] for l in ev("S.model.levels"))
    chk(any(abs(z-2.5)<0.02 for z in zs),'nivell estirat amb ratolí a ~2.5 m %s'%zs)
    # --- selecció i còpia de nivells ---
    ev(RESET)
    ev("S.model.levels.push({id:S.model.nid++,name:'Nivell 1',elev:3}); S.model.levels.sort((a,b)=>a.elev-b.elev); window.L0=S.model.levels[0]; S.level=L0.id; makeWall([0,0],[4,0]);")
    ok=ev("copyLevels([L0.id], 6, false)")
    chk(ok and ev("S.model.levels.length")==3 and ev("S.model.levels.some(l=>Math.abs(l.elev-6)<1e-6)"),'còpia només nivell a +6')
    chk(ev("S.model.root.groups.size")==1,'sense contingut: cap element copiat')
    ev(RESET); ev("window.L0=S.model.levels[0]; S.level=L0.id; makeWall([0,0],[4,0]);")
    ok=ev("copyLevels([L0.id], 3, true)")
    chk(ok and ev("S.model.root.groups.size")==2,'còpia amb contingut: el mur es duplica')
    nl=ev("S.model.levels.find(l=>Math.abs(l.elev-3)<1e-6)")
    w=ev("[...S.model.root.groups.values()].map(g=>[g.level,g.par&&g.par.lv])")
    chk(any(x[0]==nl['id'] for x in w),'el mur copiat és assignat al nivell nou %s'%w)
    chk(ev("S.undoL[S.undoL.length-1]")=='copiar nivell','desfer etiquetat')
    ev("copyLevels([L0.id], 3, true)")
    chk(ev("S.model.levels.length")==2,'cota ja ocupada: no duplica el nivell')
    # selecció des del llistat (Ctrl+clic)
    ev("S.selAnn.lvls.add(L0.id)"); chk(ev("levelSelIds()")==[ev("L0.id")],'levelSelIds retorna els seleccionats')
    chk(len(errs)==0,'sense errors de pàgina %s'%errs)
    b.close()
print("RESULTAT", res)
