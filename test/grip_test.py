from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    chk(ev("VERSION")=="24",'versió 24')
    rail=ev("RAIL.map(r=>r[0]+':'+r[1].join(','))"); chk(any(r.startswith('BIM · elements:wall,column,slab,roof') for r in rail) and any('matf,pad,strip' in r and r.startswith('BIM') for r in rail) and not any(r.startswith('Dibuix') and 'wall' in r for r in rail),'les eines BIM són a l’apartat BIM, no a Dibuix')
    ev("createLevel(3.0); window.LV=S.model.levels.slice().sort((a,b)=>a.elev-b.elev).map(l=>l.id); S.level=LV[0]; setLevel(S.level); S.show.levels=false")
    ev("window.R=makeRoof([[0,0],[10,0],[10,6],[0,6]]); animateCam({proj:'axo',theta:-1.0,phi:1.0,t:[5,3,0.5],dist:26}); 0"); pg.wait_for_timeout(900)
    box=pg.locator('#view canvas').bounding_box()
    def center(sel):
        bb=pg.locator(sel).bounding_box(); return bb['x']+bb['width']/2, bb['y']+bb['height']/2
    def drag(sel,dx,dy,mods=None,steps=6,dot=False):
        x,y=center(sel)
        if dot:
            bb=pg.locator(sel).bounding_box(); x=bb['x']+5; y=bb['y']+bb['height']/2
        for m in (mods or []): pg.keyboard.down(m)
        pg.mouse.move(x,y); pg.mouse.down()
        for i in range(1,steps+1): pg.mouse.move(x+dx*i/steps,y+dy*i/steps); pg.wait_for_timeout(40)
        pg.mouse.up()
        for m in (mods or []): pg.keyboard.up(m)
        pg.wait_for_timeout(200)
    n=ev("GRIP.list.map(g=>g.d.key).join(' ')"); chk(n.count('v')==4 and n.count('e')==4 and n.count('s')==4,'coberta seleccionada: 4 vèrtexs, 4 arestes i 4 xips de pendent (%s)'%n)
    chk(pg.inner_text('[data-gval="s0"]')=='pla','xip «pla» en una coberta acabada de crear')
    # activar pendent amb el triangle i escriure el valor a la vista
    pg.click('[data-gtoggle="s0"]'); pg.wait_for_timeout(150); chk(ev("R.par.sl[0].on") and pg.inner_text('[data-gval="s0"]')=='30%','clic al triangle: aresta inclinada al 30 %')
    pg.click('[data-gval="s2"]'); pg.keyboard.type('1/2'); pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
    chk(ev("R.par.sl[2].on") and abs(ev("R.par.sl[2].v")-50)<1e-6 and pg.inner_text('[data-gval="s2"]')=='50%','valor escrit a la vista: «1/2» → 50 %')
    ev("GRIP.sel='s1'"); pg.fill('#vcb','20°'); pg.press('#vcb','Enter'); chk(abs(ev("R.par.sl[1].v")-36.397)<1e-2,'amb un xip actiu, el VCB aplica el pendent (20° → %.2f %%)'%ev("R.par.sl[1].v"))
    ev("document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(150); chk(not ev("[...S.model.root.groups.values()].find(g=>g.par&&g.par.type==='roof').par.sl[1].on"),'es pot desfer')
    # arrossegar un vèrtex i una aresta en planta
    ev("window.R=[...S.model.root.groups.values()].find(g=>g.par&&g.par.type==='roof'); clearSel(); S.sel.groups.add(R.id); refreshAll()")
    sx=ev("(()=>{const a=toScreen([0,0,0]),b=toScreen([1,0,0]),c=toScreen([0,1,0]);return [b.x-a.x,b.y-a.y,c.x-a.x,c.y-a.y];})()")
    drag('[data-grip="v1"]',sx[0]*2,sx[1]*2); q=ev("R.par.pts[1]"); chk(abs(q[0]-12)<0.06 and abs(q[1])<0.06,'vèrtex arrossegat 2 m en X a la vista: %s'%[round(x,3) for x in q])
    ev("R.par.pts[1]=[10,0]; refreshAll()")
    drag('[data-grip="e2"]',sx[2]*1.5,sx[3]*1.5); q=ev("[R.par.pts[2],R.par.pts[3]]"); chk(abs(q[0][1]-7.5)<0.06 and abs(q[1][1]-7.5)<0.06 and abs(q[0][0]-10)<1e-6,'aresta desplaçada en paral·lel 1,5 m: y=%.3f'%q[0][1])
    pg.dblclick('[data-grip="e0"]'); pg.wait_for_timeout(150); chk(ev("R.par.pts.length")==5 and ev("R.par.sl.length")==5,'doble clic a l’aresta: vèrtex nou')
    pg.keyboard.down('Alt'); pg.click('[data-grip="v1"]'); pg.keyboard.up('Alt'); pg.wait_for_timeout(150); chk(ev("R.par.pts.length")==4,'Alt+clic: vèrtex esborrat')
    # enganxament a un punt del model
    ev("makeColumn([14,0,0]); clearSel(); S.sel.groups.add(R.id); refreshAll()"); t=ev("(()=>{const a=toScreen([13.8,-0.2,0]),b=toScreen(R.par.pts[1].concat([0]));return [a.x-b.x,a.y-b.y];})()")
    drag('[data-grip="v1"]',t[0]+3,t[1]+2,steps=8); q=ev("R.par.pts[1]"); chk(abs(q[0]-13.8)<1e-6 and abs(q[1]+0.2)<1e-6,'el vèrtex s’enganxa a la cantonada del pilar: %s'%q)
    # mode cotes de punts: arrossegar en vertical
    ev("R.par.pts=[[0,0],[10,0],[10,6],[0,6]]; R.par.mode='pts'; clearSel(); S.sel.groups.add(R.id); refreshAll()"); pg.wait_for_timeout(200)
    n=ev("GRIP.list.map(g=>g.d.key).join(' ')"); chk(n.split()==['z0','ze0','z1','ze1','z2','ze2','z3','ze3'],'mode cotes: agafadors de vèrtex i d’aresta')
    sz=ev("(()=>{const a=toScreen([10,6,0]),b=toScreen([10,6,1]);return [b.x-a.x,b.y-a.y];})()")
    drag('[data-grip="z2"]',sz[0]*0.5,sz[1]*0.5,dot=True); chk(abs(ev("R.par.dz[2]")-0.5)<0.011,'vèrtex pujat 0,50 m arrossegant en vertical: %.3f'%ev("R.par.dz[2]"))
    chk(abs(round(ev("R.par.dz[2]")*100)-ev("R.par.dz[2]")*100)<1e-6,'la cota s’ajusta al centímetre')
    drag('[data-grip="ze3"]',sz[0]*0.3,sz[1]*0.3,dot=True); chk(abs(ev("R.par.dz[3]")-0.3)<0.011 and abs(ev("R.par.dz[0]")-0.3)<0.011,'aresta: els dos extrems pugen 0,30')
    pg.click('[data-gval="z1"]'); pg.keyboard.type('-0,05'); pg.keyboard.press('Enter'); pg.wait_for_timeout(150); chk(abs(ev("R.par.dz[1]")+0.05)<1e-9 and pg.inner_text('[data-gval="z1"]')=='−0,05','cota escrita a la vista amb coma decimal')
    ev("R.par.extra.push({p:[5,3],z:0}); refreshAll()"); drag('[data-grip="x0"]',-sz[0]*0.2,-sz[1]*0.2,dot=True); chk(abs(ev("R.par.extra[0].z")+0.2)<0.011,'punt interior (bunera) baixat 0,20')
    drag('[data-grip="x0"]',sx[0]*1,sx[1]*1,mods=['Shift'],dot=True); chk(abs(ev("R.par.extra[0].p[0]")-6)<0.08,'Maj+arrossega: el punt es mou en planta (x=%.3f)'%ev("R.par.extra[0].p[0]"))
    # mur i forjat
    ev("S.level=LV[0]; window.W=makeWall([0,-10,0],[6,-10,0]); window.W2=makeWall([6,-10,0],[6,-6,0]); clearSel(); S.sel.groups.add(W.id); refreshAll()"); pg.wait_for_timeout(150)
    chk(ev("GRIP.list.map(g=>g.d.key).join()")=='wa,wb','mur: agafadors als dos extrems')
    drag('[data-grip="wa"]',-sx[0]*2,-sx[1]*2); chk(abs(ev("W.par.a[0]")+2)<0.06 and abs(ev("solidVolume(W)")-(8*0.3*3))<0.06,'extrem del mur estirat 2 m; la unió amb l’altre mur es manté (%.3f m³)'%ev("solidVolume(W)"))
    ev("window.SL=makeSlab([0,-20,0],[6,-16,0]); refreshAll()"); pg.wait_for_timeout(150); chk(ev("GRIP.list.length")==8,'forjat: vèrtexs i arestes editables')
    ev("setTool('line')"); pg.wait_for_timeout(200); ev("needRender=true"); pg.wait_for_timeout(200); chk(pg.locator('.grip').count()==0,'els agafadors només apareixen amb l’eina Selecciona')
    chk(not errs,'sense errors %s'%errs[:3])
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
