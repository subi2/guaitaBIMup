from playwright.sync_api import sync_playwright
import math
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    chk(ev("VERSION")=="24",'versió 24')
    chk([round(ev("slopeParse('%s','pct')"%t),3) for t in ['30','30%','45°','1/3','1:4']]==[30,30,100,33.333,25],'pendent en %, graus i 1/x')
    chk(ev("slopeFmt(100,'deg')")=='45°' and ev("slopeFmt(25,'ratio')")=='1:4' and ev("slopeFmt(30,'pct')")=='30%','format del pendent')
    ev("createLevel(3.0); window.LV=S.model.levels.slice().sort((a,b)=>a.elev-b.elev).map(l=>l.id); S.level=LV[1]; setLevel(S.level)")
    ZR="(g=>{let mn=1e9,mx=-1e9;for(const v of g.verts.values()){mn=Math.min(mn,v.p[2]);mx=Math.max(mx,v.p[2]);}return [+mn.toFixed(4),+mx.toFixed(4)];})"
    HAT="((g,x,y)=>{let best=-1e9;for(const f of g.faces.values()){if(f.n[2]<0.05)continue;const q=f.loop.map(i=>g.verts.get(i).p);let ins=true,sg=0;for(let i=0;i<q.length;i++){const a=q[i],b=q[(i+1)%q.length],c=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);if(Math.abs(c)<1e-9)continue;if(sg===0)sg=Math.sign(c);else if(Math.sign(c)!==sg){ins=false;break;}}if(!ins)continue;const a=q[0],z=a[2]-(f.n[0]*(x-a[0])+f.n[1]*(y-a[1]))/f.n[2];best=Math.max(best,z);}return +best.toFixed(4);})"
    # neix plana
    ev("window.R=makeRoof([[0,0],[10,0],[10,6],[0,6]]);0")
    chk(ev(ZR+"(R)")==[3,3.25] and abs(ev("solidVolume(R)")-15)<1e-3 and ev("R.ifc")=='IfcRoof' and ev("R.par.sl.every(s=>!s.on&&s.v===30)"),'neix plana, 0,25 de gruix sobre el nivell, pendent per defecte 30%')
    # quatre aigües 50%
    ev("R.par.sl.forEach(s=>{s.on=true;s.v=50}); refreshAll()")
    chk(abs(ev("solidVolume(R)")-15)<2e-3,'quatre aigües: volum = àrea × gruix vertical (%.4f)'%ev("solidVolume(R)"))
    chk(ev(ZR+"(R)")==[3,4.75],'carener a nivell + gruix + 50%% × 3 m: %s'%ev(ZR+"(R)"))
    chk(ev(HAT+"(R,5,3)")==4.75 and ev(HAT+"(R,1,3)")==3.75 and ev(HAT+"(R,5,1)")==3.75 and ev(HAT+"(R,1,1)")==3.75,'cotes sobre el carener, els aiguavessos i el tremujal')
    chk(ev("parPdt(R.par)")=='.HIP_ROOF.','tipus IFC HIP_ROOF')
    # dues aigües (testers a les arestes curtes) amb pendents diferents
    ev("R.par.sl[1].on=false; R.par.sl[3].on=false; R.par.sl[0].v=50; R.par.sl[2].v=100; refreshAll()")
    chk(abs(ev("solidVolume(R)")-15)<2e-3 and ev(ZR+"(R)")==[3,5.25],'dues aigües amb pendents 50%% i 100%%: carener desplaçat a y=4, cota %s'%ev(ZR+"(R)")[1])
    chk(ev(HAT+"(R,0.01,4)")==5.25 and ev("parPdt(R.par)")=='.GABLE_ROOF.','tester vertical i tipus GABLE_ROOF')
    # un sol pendent
    ev("R.par.sl[2].on=false; R.par.sl[0].v=30; refreshAll()"); chk(ev(ZR+"(R)")==[3,5.05] and ev("parPdt(R.par)")=='.SHED_ROOF.','un pendent del 30%% en 6 m: +1,80 → %s'%ev(ZR+"(R)")[1])
    # volada: el nivell és la cara inferior al ràfec
    ev("R.par.ov=0.5; refreshAll()"); bb=ev("(()=>{let a=1e9,b=-1e9;for(const v of R.verts.values()){a=Math.min(a,v.p[1]);b=Math.max(b,v.p[1]);}return [a,b];})()")
    chk(bb==[-0.5,6.5] and ev(ZR+"(R)")==[3,5.35] and abs(ev("solidVolume(R)")-11*7*0.25)<2e-3,'volada 0,50: perímetre ampliat i cara inferior del ràfec al nivell')
    # alçada de tall
    ev("R.par.ov=0; R.par.sl.forEach(s=>{s.on=true;s.v=50}); R.par.cutH=1.2; refreshAll()"); chk(ev(ZR+"(R)")==[3,4.2],'alçada de tall 1,20: coberta truncada %s'%ev(ZR+"(R)")); ev("R.par.cutH=0; refreshAll()")
    # planta en L: aiguafons per intersecció de plans
    ev("window.RL=makeRoof([[20,0],[30,0],[30,4],[24,4],[24,10],[20,10]]); RL.par.sl.forEach(s=>{s.on=true;s.v=50}); refreshAll()")
    chk(ev("convexPieces(RL.par.pts).length")==2,'planta en L: dues peces convexes màximes')
    chk(abs(ev("solidVolume(RL)")-64*0.25)<3e-3 and not ev("RL.warn"),'L: volum = àrea × gruix (%.4f)'%ev("solidVolume(RL)"))
    chk(ev(ZR+"(RL)")==[3,4.25],'L: careners a +1,00 (mitja amplada 2 m × 50%)')
    h=[ev(HAT+"(RL,%s,%s)"%q) for q in [(23,3),(25,2),(22,7),(22,2),(23.5,3.5),(21,1)]]
    chk(h==[3.75,4.25,4.25,4.25,3.5,3.75],'L: aiguafons, careners i tremujal a les cotes exactes %s'%h)
    # perímetre girat no ortogonal (triangle)
    ev("window.RT=makeRoof([[40,0],[46,0],[43,5]]); RT.par.sl.forEach(s=>{s.on=true;s.v=100}); refreshAll()"); r_in=2*15/(6+2*math.hypot(3,5))
    chk(abs(ev(ZR+"(RT)")[1]-(3.25+r_in))<2e-3,'triangle a tres aigües: cim al radi inscrit (%.4f)'%ev(ZR+"(RT)")[1])
    # cotes de punts
    ev("window.RP=makeRoof([[0,20],[8,20],[8,26],[0,26]]); RP.par.mode='pts'; RP.par.dz=[0,0,0.3,0.3]; refreshAll()")
    chk(ev(ZR+"(RP)")==[3,3.55] and abs(ev("solidVolume(RP)")-48*(0.25+0.15))<2e-3,'cotes de vèrtex: pla inclinat amb cara inferior plana (%.4f)'%ev("solidVolume(RP)"))
    ev("RP.par.under='par'; refreshAll()"); chk(abs(ev("solidVolume(RP)")-48*0.25)<2e-3,'cara inferior paral·lela: gruix constant')
    ev("RP.par.under='flat'; RP.par.dz=[0.2,0.2,0.2,0.2]; RP.par.extra=[{p:[4,23],z:0}]; refreshAll()")
    chk(abs(ev("solidVolume(RP)")-(48*0.25+48*0.2*2/3))<2e-3 and ev(HAT+"(RP,4,23)")==3.25,'bunera central: piràmide invertida (%.4f)'%ev("solidVolume(RP)"))
    # recinte de murs i murs fins a la coberta
    ev("S.level=LV[0]; setLevel(S.level); window.WS=[makeWall([0,40,0],[8,40,0]),makeWall([8,40,0],[8,46,0]),makeWall([8,46,0],[0,46,0]),makeWall([0,46,0],[0,40,0])];0")
    lp=ev("(()=>{const l=wallLoop(S.model.root,WS[2]);return [l.pts.map(q=>q.map(x=>+x.toFixed(3))),l.top];})()")
    chk(sorted(map(tuple,lp[0]))==sorted([(-0.15,39.85),(8.15,39.85),(8.15,46.15),(-0.15,46.15)]) and lp[1]==3,'recinte de murs: perímetre per la cara exterior i coronació a +3,00')
    ev("const l=wallLoop(S.model.root,WS[0]),z=zToLevel(l.top); window.RW=makeRoof(l.pts,z[0],z[1]); RW.par.sl[0].on=true; RW.par.sl[2].on=true; RW.par.sl[0].v=RW.par.sl[2].v=40; refreshAll()")
    chk(ev("RW.par.lv")==ev("LV[1]") and ev(ZR+"(RW)")[0]==3,'coberta sobre la coronació dels murs')
    v0=ev("solidVolume(WS[1])"); ev("for(const w of WS){w.par.hm='roof'; w.par.hr=RW.id;} refreshAll()")
    k=0.4; hw=3.15  # mitja amplada exterior
    gable=ev("solidVolume(WS[1])"); exp=v0+0.3*(0.5*6.3*hw*k)  # triangle del tester sobre +3,00 en un mur de 0,30
    chk(abs(gable-exp)<0.01,'mur tester puja fins a la coberta: volum %.4f (esperat %.4f)'%(gable,exp))
    side=ev("solidVolume(WS[0])"); chk(abs(side-ev("solidVolume(WS[2])"))<1e-3 and side>ev("4*0")+8*0.3*3-0.2 and side<8.3*0.3*3+0.3,'murs laterals acaben sota el pendent (%.4f)'%side)
    chk(ev(ZR+"(WS[1])")[1]==round(3+hw*k,4),'coronació del tester a la cota del carener per sota: %s'%ev(ZR+"(WS[1])")[1])
    ev("RW.par.sl[0].v=RW.par.sl[2].v=80; refreshAll()"); chk(ev(ZR+"(WS[1])")[1]==round(3+hw*0.8,4),'en canviar el pendent, el mur es regenera')
    ev("pushUndo(); S.model.root.groups.delete(RW.id); refreshAll()"); chk(ev(ZR+"(WS[1])")==[0,3] and ev("!!WS[1].warn"),'sense la coberta: alçada fixa i avís')
    # adopció d'un grup de geometria lliure
    ev("(()=>{const c=S.model.root;const r=K.addPolyline(S.model,c,[[60,0,3],[66,0,3],[66,4,3],[60,4,3]],true);const f=r.faces[0];K.pushPull(S.model,c,f.id,0.3*(c.faces.get(f.id).n[2]>0?1:-1));const sel={faces:new Set(c.faces.keys()),edges:new Set(c.edges.keys()),groups:new Set()};const g=K.makeGroup(S.model,c,sel);g.name='Coberta lliure';g.ifc='IfcRoof';window.RA=roofAdopt(c,g);})();0")
    chk(ev("RA.par.type")=='roof' and ev("RA.par.t")==0.3 and ev("RA.par.lv")==ev("LV[1]") and ev("RA.par.off")==0 and ev("RA.name")=='Coberta lliure' and abs(ev("solidVolume(RA)")-24*0.3)<1e-3,'grup lliure convertit: perímetre, gruix 0,30 i nivell +3,00')
    # panell
    ev("clearSel(); S.sel.groups.add(RA.id); refreshAll()"); pg.fill('[data-rfsl="0"]','1/2'); pg.dispatch_event('[data-rfsl="0"]','change')
    chk(ev("RA.par.sl[0].on") and abs(ev("RA.par.sl[0].v")-50)<1e-6 and ev(ZR+"(RA)")[1] in (5.3,6.3),'panell: «1/2» activa l’aresta al 50%% → %s'%ev(ZR+"(RA)")[1])
    pg.select_option('#rfUnit','deg'); chk(pg.input_value('[data-rfsl="0"]')=='26.57°','unitat en graus al panell')
    pg.click('#rfAll'); chk(ev("RA.par.sl.every(s=>s.on)"),'botó «Totes inclinades»'); ev("OPT.slopeUnit='pct'")
    # còpia a un altre nivell i IFC
    ev("clearSel(); S.sel.groups.add(R.id); TOOLS.move.apply([0,-10,-3],true); refreshAll()"); chk(ev("[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='roof'&&g.par.lv===LV[0]).length")==1,'coberta copiada i reassignada al nivell inferior')
    ifc=ev("buildIFC(scopeFilter(collectScene(),'all'),{version:'IFC4'}).text"); chk(ifc.count('IFCROOF(')>=5 and '.HIP_ROOF.' in ifc and '.FREEFORM.' in ifc,'IFC amb IfcRoof i tipus predefinits')
    rt=ev("(()=>{const m=K.fromJSON(JSON.parse(snapshot()));return [...m.root.groups.values()].filter(g=>g.par&&g.par.type==='roof').length;})()"); chk(rt>=5,'es desa al fitxer')
    chk(not errs,'sense errors %s'%errs[:3])
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
