from playwright.sync_api import sync_playwright
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.42.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
SETUP="""
window.mk=(x,y,z,w,d,h,name)=>{const g=K.newContainer(S.model,'group');g.name=name;g.t=[0,0,0];g.ifc=null;g.level=null;g.tag=0;g.cut=null;g.thru=false;g.prio=0;g.nojoin=false;S.model.root.groups.set(g.id,g);
 const r=K.addPolyline(S.model,g,[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],true);const f=r.faces[0];K.pushPull(S.model,g,f.id,h*(g.faces.get(f.id).n[2]>0?1:-1));return g;};
window.clr=()=>{S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();S.sel.groups.clear();};
window.len=a=>{let s=0;for(let i=0;i<a.length;i+=6)s+=Math.hypot(a[i+3]-a[i],a[i+4]-a[i+1],a[i+5]-a[i+2]);return s;};
window.cl=()=>{const L=S.model.levels[0].id;openView('plan:'+L);rebuild();return lnCutLines([S.viewClips[0]]);};
0"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate
    chk(ev("VERSION")=='0.42.0','versió 0.42.0')
    ev(SETUP)
    # 1. unió: dos cossos del mateix material que se solapen
    ev("clr();mk(0,0,0,4,2,3,'A');mk(3,0,0,4,2,3,'B');0")
    r=ev("(()=>{const c=cl();return {a:len(c.A),b:len(c.B)}})()")
    chk(abs(r['a']-18)<1e-3,'unió mateix material: només el perímetre exterior (18 m): %.3f'%r['a'])
    # 2. sense unió
    r=ev("(()=>{const g=[...S.model.root.groups.values()];g[1].nojoin=true;const c=cl();return len(c.A)})()")
    chk(abs(r-24)<1e-3,'no s’uneix: es dibuixen els dos perímetres (24 m): %.3f'%r)
    # 3. retall: materials diferents, prioritat
    r=ev("""(()=>{const g=[...S.model.root.groups.values()];g[1].nojoin=false;for(const f of g[1].faces.values())f.mat=1;g[1].prio=1;const c=cl();return len(c.A)})()""")
    chk(abs(r-20)<1e-3,'retall per prioritat (B talla A): 12+8 = 20 m: %.3f'%r)
    r=ev("""(()=>{const g=[...S.model.root.groups.values()];g[1].prio=0;g[0].prio=2;const c=cl();return len(c.A)})()""")
    chk(abs(r-20)<1e-3,'retall invertit (A talla B): 20 m: %.3f'%r)
    # 4. no tallable
    r=ev("""(()=>{const g=[...S.model.root.groups.values()];g[0].prio=0;g[1].cut=false;const c=cl();return [len(c.A),len(c.B)]})()""")
    chk(abs(r[0]-12)<1e-3 and abs(r[1]-12)<1e-3,'no tallable: contorn a B (12) i A només amb A (12): %s'%r)
    # 5. contacte mateix material
    ev("clr();mk(0,0,0,4,2,3,'A');mk(0,2,0,4,2,3,'C');0")
    r=ev("len(cl().A)")
    chk(abs(r-16)<1e-3,'contacte per cara, mateix material: sense línia d’encontre (16 m): %.3f'%r)
    ev("(()=>{const g=[...S.model.root.groups.values()];for(const f of g[1].faces.values())f.mat=2;0})()")
    r=ev("len(cl().A)")
    chk(abs(r-20)<1e-3,'contacte per cara, materials diferents: la línia d’encontre es manté (20 m): %.3f'%r)
    # 6. caps a pantalla: només un cap per cos tancat
    ev("clr();mk(0,0,0,4,2,3,'A');mk(3,0,0,4,2,3,'B');cl();0")
    chk(ev("gCaps.children.some(o=>o.userData.cap)"),'tapa de secció creada')
    # 7. graus
    ev("""S.view='elev:S';S.style.ln.eOn=[true,true,true];LN_CTX=undefined;0""")
    r=ev("(()=>{const b=modelBox(),LB=lnCtx();return lnSplit([0,b.min[1],0],[0,b.min[1]+6,0],LB).map(p=>p[2])})()")
    chk(r==[0,1,2,3,3],'graus 0,1,2,3 per distància: %s'%r)
    ev("S.style.ln.eOn=[true,false,true];LN_CTX=undefined;0")
    r=ev("(()=>{const b=modelBox(),LB=lnCtx();return lnSplit([0,b.min[1],0],[0,b.min[1]+6,0],LB).map(p=>p[2])})()")
    chk(r==[0,1,1,3,3],'grau 2 apagat: hereta el 1 %s'%r)
    ev("S.style.ln.eOn=[false,false,false];LN_CTX=undefined;0")
    r=ev("(()=>{const b=modelBox(),LB=lnCtx();return lnSplit([0,b.min[1],0],[0,b.min[1]+6,0],LB).map(p=>p[2])})()")
    chk(all(x==0 for x in r),'cap grau actiu: tot gruix ple %s'%r)
    ev("S.style.ln.eOn=[true,true,true];LN_CTX=undefined;0")
    ev("S.view=null;LN_CTX=undefined;0")
    chk(ev("lnCtx()")is None,'vista 3D lliure: sense graus')
    # 8. reflexades
    ev("(()=>{const L=S.model.levels[0];pvSet(L,{rear:2});openView('plan:'+L.id);rebuild();0})()")
    chk(ev("gRef.children.length")==1,'reflexades D dibuixades a la planta (rear 2 m)')
    ev("(()=>{const L=S.model.levels[0];pvSet(L,{rear:0});openView('plan:'+L.id);rebuild();0})()")
    chk(ev("gRef.children.length")==0,'rear 0: reflexades desactivades per defecte')
    # 9. ocultes marcades
    ev("(()=>{S.style.ed.hid='mark';S.view=null;refreshAll();0})()")
    n0=ev("gModel.children.filter(o=>o.renderOrder===1).length")
    ev("(()=>{[...S.model.root.groups.values()][0].thru=true;refreshAll();0})()")
    n1=ev("gModel.children.filter(o=>o.renderOrder===1).length")
    chk(n0==0 and n1>=1,'ocultes C només per als elements marcats (%d → %d)'%(n0,n1))
    # 10. panell i propietats
    ev("(()=>{LAY.act[2]='vis';TRAY.closed.delete('lns');renderTray();0})()")
    chk(ev("!!document.querySelector('#lnKey svg')"),'panell Línies amb clau viva')
    chk(ev("document.querySelectorAll('#lnKey .lk').length")>=7,'clau amb elements ressaltables')
    chk(ev("document.querySelectorAll('[data-ln]').length")==8,'files A B C D S + E1 E2 E3')
    ev("document.querySelector('#lnSet').value='Esbós';document.querySelector('#lnSet').dispatchEvent(new Event('change'))")
    chk(ev("S.style.ln.w.A")==0.7 and ev("S.style.ln.set")=='Esbós','joc Esbós aplicat')
    ev("(()=>{const i=document.querySelector('[data-ln=\"B\"] input[type=number]');i.value='0.4';i.dispatchEvent(new Event('change'));0})()")
    chk(ev("S.style.ln.w.B")==0.4 and ev("S.style.ln.set")=='personalitzat','gruix B editat → joc personalitzat')
    ev("(()=>{const i=document.querySelector('#lnName');i.value='El meu';document.querySelector('#lnSave').click();0})()")
    chk(ev("lnSets().length")==1 and ev("lnSets()[0].w.B")==0.4,'joc propi desat al model')
    j=ev("JSON.stringify(K.toJSON(S.model))")
    chk('"lineSets"' in j and '"nj"' not in j,'joc propi i flags es serialitzen')
    ev("(()=>{clearSel();const g=[...S.model.root.groups.values()][0];S.sel.groups.add(g.id);renderInfo();0})()")
    chk(ev("!!document.querySelector('#gCut')&&!!document.querySelector('#gThru')&&!!document.querySelector('#gPrio')"),'Info: talla / a través / prioritat')
    ev("(()=>{const s=document.querySelector('#gCut');s.value='0';s.dispatchEvent(new Event('change'));0})()")
    chk(ev("[...S.model.root.groups.values()][0].cut")==False,'talla = no desat al grup')
    j=ev("JSON.stringify(K.toJSON(S.model))"); ev("window.J=%s;0"%repr(j).replace("'",'"') if False else "0")
    chk(ev("(()=>{const m=K.fromJSON(JSON.parse(JSON.stringify(K.toJSON(S.model))));return [...m.root.groups.values()][0].cut})()")==False,'talla es conserva en desar/carregar')
    # 11. solapaments
    ev("clr();mk(0,0,0,4,2,3,'A');mk(3,0,0,4,2,3,'B');mk(10,0,0,1,1,1,'Z');S.view=null;rebuild();0")
    chk(ev("lnOverlaps().length")==1,'solapaments: només A∩B')
    ev("(()=>{document.querySelector('#lnFind').click();0})()")
    chk(ev("document.querySelectorAll('[data-ov]').length")==1,'llista de solapaments al panell')
    ev("clr();mk(0,0,0,4,2,3,'A');mk(0,2,0,4,2,3,'C');S.view=null;rebuild();0")
    chk(ev("lnOverlaps().length")==0,'contacte per cara no és solapament')
    ev("clr();mk(0,0,0,6,6,6,'G');mk(2,2,2,1,1,1,'p');S.view=null;rebuild();0")
    chk(ev("lnOverlaps().length")==1,'cos dins d’un altre és solapament')
    # 13. dibuix 2D amb unió
    ev("clr();mk(0,0,0,4,2,3,'A');mk(3,0,0,4,2,3,'B');S.view=null;rebuild();0")
    r=ev("(()=>{const L=S.model.levels[0].id,d=drawing2D(docView('plan:'+L),{hidden:true,hmode:'mark'});let s=0;for(const c of d.cut)for(const e of c.edges)s+=Math.hypot(e[2]-e[0],e[3]-e[1]);return [d.cut.length,s]})()")
    chk(r[0]==2 and abs(r[1]-18)<1e-3,'document: 2 cossos, contorn unit de 18 m (%s)'%r)
    ev("S.style.sec.fill='hatch';0")
    r=ev("(()=>{const sh=docSheet(['plan:'+S.model.levels[0].id],{scale:100,hidden:false});let n=0;for(const p of sh.prims)if(p.t==='l'&&p.layer==='G-TALL-RATLLAT')n+=Math.hypot(p.x2-p.x1,p.y2-p.y1);return n})()")
    ev("S.style.sec.fill='grey';0")
    r2=ev("(()=>{const sh=docSheet(['plan:'+S.model.levels[0].id],{scale:100,hidden:false});return [sh.prims.filter(p=>p.t==='p').length,sh.prims.filter(p=>p.t==='l'&&p.layer==='G-TALL').length]})()")
    # àrea unió = 4*2+4*2-1*2 = 14 m2 → ratllat 1.6 mm: longitud ≈ 140 mm² ... A 1:100 = 14 m2 → 1400 cm2... paper 1400 mm2 / 1.6 = 875 mm
    chk(abs(r-875)<25,'document: ratllat només sobre la unió (%.0f mm ≈ 875)'%r)
    chk(r2[0]==2 and r2[1]>=8,'document: farciment gris i contorn A (%s)'%r2)
    # 12. style: serialització
    chk(ev("stylePlain(S.style).ln.w.B")==0.4,'estil conserva el joc de línies')
    chk(ev("mkStyle(stylePlain(S.style)).ln.mult.length")==4,'mkStyle clona el joc')
    chk(errs==[],'sense errors %s'%errs)
    pg.screenshot(path="/tmp/v420_a.png")
    b.close()
print(res)
