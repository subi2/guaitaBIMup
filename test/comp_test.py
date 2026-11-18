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
    ev("createLevel(3.0); window.LV=S.model.levels.slice().sort((a,b)=>a.elev-b.elev).map(l=>l.id); S.level=LV[0]; setLevel(S.level)")
    # fitxers SKP de prova fets amb l'escriptor: porta 36×2×80 polzades amb un forat de vidre, i taula
    mk="""(name,boxes)=>{const b=OpenSKP.create(),m=b.addMaterial('Fusta',[160,110,60]);
      b.addGroup(d=>{for(const [x0,y0,z0,x1,y1,z1] of boxes){const q=(a,bb,c,dd)=>d.addFace([a,bb,c,dd],{material:m,autoTriangulate:true});
        q([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]);q([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]);q([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]);q([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]);q([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]);q([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]);}},{name});
      const by=b.toBytes();return by.buffer.slice(by.byteOffset,by.byteOffset+by.byteLength);}"""
    ev("window.mkSkp="+mk+";0")
    d=ev("(()=>{const d=compFromSKP('Porta 90',mkSkp('Porta',[[10,5,0,46,7,80]]));window.DD=d;return {size:d.size,kind:d.kind,f:d.f.length,v:d.v.length,minx:Math.min(...d.v.map(p=>p[0])),miny:Math.min(...d.v.map(p=>p[1])),minz:Math.min(...d.v.map(p=>p[2]))};})()")
    chk(abs(d['size'][0]-0.9144)<1e-3 and abs(d['size'][1]-0.0508)<1e-3 and abs(d['size'][2]-2.032)<1e-3,'SKP importat en metres: %s'%d['size'])
    chk(d['kind']=='door' and d['f']==6 and d['v']==8,'definició neta: 6 cares i 8 vèrtexs, tipus porta pel nom (%s cares, %s vèrtexs)'%(d['f'],d['v']))
    chk(abs(d['minx'])<1e-6 and abs(d['miny']+0.0254)<1e-3 and abs(d['minz'])<1e-6,'origen normalitzat: X des de 0, Y centrada, Z des de 0')
    ev("window.W1=makeWall([0,0,0],[5,0,0]);0"); v0=ev("solidVolume(W1)")
    ev("window.D1=makeComp(DD,[2,0,0],W1);0"); v1=ev("solidVolume(W1)")
    chk(abs((v0-v1)-0.9144*0.3*2.032)<1e-3,'la porta obre el forat al mur: −%.4f m³'%(v0-v1))
    chk(ev("D1.ifc")=='IfcDoor' and abs(ev("solidVolume(D1)")-0.9144*0.0508*2.032)<1e-3,'instància IfcDoor amb la geometria del component')
    bb=ev("(()=>{let a=[1e9,1e9,1e9],b=[-1e9,-1e9,-1e9];for(const v of D1.verts.values())for(let i=0;i<3;i++){a[i]=Math.min(a[i],v.p[i]);b[i]=Math.max(b[i],v.p[i]);}return a.concat(b).map(x=>+x.toFixed(3));})()")
    chk(bb==[1.543,-0.025,0,2.457,0.025,2.032],'porta centrada al punt clicat i al gruix del mur: %s'%bb)
    # el mur es mou: la porta el segueix
    ev("clearSel(); S.sel.groups.add(W1.id); pushUndo(); TOOLS.move.apply([0,4,0],false); refreshAll()")
    chk(abs(ev("Math.min(...[...D1.verts.values()].map(v=>v.p[1]))")-3.975)<1e-3,'en moure el mur, la porta el segueix')
    # la porta llisca pel mur
    ev("clearSel(); S.sel.groups.add(D1.id); TOOLS.move.apply([1,0.7,0],false); refreshAll()")
    chk(abs(ev("D1.par.s")-2.543)<1e-3 and abs(ev("Math.min(...[...D1.verts.values()].map(v=>v.p[1]))")-3.975)<1e-3,'moure la porta la fa lliscar pel mur (no en surt)')
    chk(abs((v0-ev("solidVolume(W1)"))-0.9144*0.3*2.032)<1e-3,'el forat segueix la porta')
    # girar la cara i desactivar el forat
    ev("D1.par.flip=true; refreshAll()"); chk(abs(ev("D1.par.rot"))==180 and abs(ev("solidVolume(D1)")-0.9144*0.0508*2.032)<1e-3,'porta girada 180°')
    ev("D1.par.cut=false; refreshAll()"); chk(abs(ev("solidVolume(W1)")-v0)<1e-3,'sense forat quan es desactiva'); ev("D1.par.cut=true; D1.par.flip=false; refreshAll()")
    # finestra: ampit per defecte
    ev("window.DW=compFromSKP('Finestra 120',mkSkp('F',[[0,0,0,47.244,2,47.244]])); window.F1=makeComp(DW,[1,4,0],W1);0")
    chk(ev("DW.kind")=='window' and ev("F1.par.sill")==0.9 and ev("F1.ifc")=='IfcWindow','finestra amb ampit 0,90 per defecte')
    # copiar mur + porta + finestra a un altre nivell
    ev("clearSel(); for(const g of [W1,D1,F1]) S.sel.groups.add(g.id); TOOLS.move.apply([0,0,3],true); refreshAll()")
    cp=ev("(()=>{const ws=[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall'&&g!==W1),cs=[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='comp'&&g!==D1&&g!==F1);window.W2=ws[0];return {nw:ws.length,nc:cs.length,hosts:cs.map(c=>c.par.host===ws[0].id),z:cs.map(c=>+Math.min(...[...c.verts.values()].map(v=>v.p[2])).toFixed(3)).sort(),vol:solidVolume(ws[0])};})()")
    chk(cp['nw']==1 and cp['nc']==2 and all(cp['hosts']),'còpia conjunta: els components nous queden allotjats al mur nou')
    chk(cp['z']==[3,3.9] and abs(cp['vol']-ev("solidVolume(W1)"))<1e-3,'la còpia té els forats i les cotes del nivell nou: %s'%cp['z'])
    # IFC
    ifc=ev("buildIFC(scopeFilter(collectScene(),'all'),{version:'IFC4'}).text")
    chk(ifc.count('IFCDOOR(')==2 and ifc.count('IFCWINDOW(')==2 and ifc.count('IFCOPENINGELEMENT(')==4 and ifc.count('IFCRELVOIDSELEMENT(')==4 and ifc.count('IFCRELFILLSELEMENT(')==4,'IFC: portes, finestres, buits i relacions (%d/%d/%d/%d/%d)'%(ifc.count('IFCDOOR('),ifc.count('IFCWINDOW('),ifc.count('IFCOPENINGELEMENT('),ifc.count('IFCRELVOIDSELEMENT('),ifc.count('IFCRELFILLSELEMENT(')))
    # esborrar el mur: el component passa a lliure al mateix lloc
    pos=ev("[...D1.verts.values()].map(v=>v.p[0]).sort()[0]")
    ev("pushUndo(); S.model.root.groups.delete(W1.id); refreshAll()")
    chk(ev("D1.par.host")==None and abs(ev("[...D1.verts.values()].map(v=>v.p[0]).sort()[0]")-pos)<1e-3,'sense el mur, la porta queda lliure on era')
    # component lliure: moble
    ev("window.DT=compFromSKP('Taula',mkSkp('T',[[0,0,28,60,30,30],[0,0,0,2,2,28],[58,0,0,60,2,28],[0,28,0,2,30,28],[58,28,0,60,30,28]])); window.T1=makeComp(DT,[10,10,0],null);0")
    chk(ev("DT.kind")=='free' and ev("T1.ifc")=='IfcFurniture' and ev("T1.par.host")==None,'component lliure classificat com a mobiliari')
    n0=ev("[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall').map(g=>solidVolume(g)).join()")
    ev("clearSel(); S.sel.groups.add(T1.id); transformSel(p=>rotPt(p,[10,10,0],[0,0,1],Math.PI/2)); refreshAll()")
    ex=ev("(()=>{let a=1e9,b=-1e9;for(const v of T1.verts.values()){a=Math.min(a,v.p[0]);b=Math.max(b,v.p[0]);}return b-a;})()"); chk(abs(ev("T1.par.rot")-90)<1e-3 and abs(ex-0.762)<1e-3,'el moble gira: 1,52×0,76 passa a 0,76 en X (%.3f)'%ex)
    ev("clearSel(); S.sel.groups.add(T1.id); TOOLS.move.apply([0,0,3],true); refreshAll()"); chk(ev("[...S.model.root.groups.values()].filter(g=>g.par&&g.par.cid===DT.id).map(g=>g.par.lv).sort().join()")==ev("[LV[0],LV[1]].sort().join()"),'moble copiat al nivell de sobre')
    chk(ev("compCount(DT.id)")==2,'recompte d’instàncies')
    # component a partir d'un grup
    ev("(()=>{const c=S.model.root;const r=K.addPolyline(S.model,c,[[20,0,0],[21,0,0],[21,1,0],[20,1,0]],true);const f=r.faces[0];K.pushPull(S.model,c,f.id,0.5*(c.faces.get(f.id).n[2]>0?1:-1));const sel={faces:new Set(c.faces.keys()),edges:new Set(c.edges.keys()),groups:new Set()};const g=K.makeGroup(S.model,c,sel);g.name='Banc';window.DG=compFromGroup(g);})();0")
    chk(ev("DG.size")==[1,1,0.5] and ev("DG.f.length")==6,'definició creada d’un grup')
    # desar i carregar
    rt=ev("(()=>{const m=K.fromJSON(JSON.parse(snapshot()));return [m.meta.comps.length,[...m.root.groups.values()].filter(g=>g.par&&g.par.type==='comp').length];})()"); chk(rt==[4,6],'definicions i instàncies al fitxer %s'%rt)
    ev("restore(snapshot()); refreshAll()") if ev("typeof restore")=='function' else None
    chk(ev("[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='comp').every(g=>g.verts.size>0)"),'en recarregar, les instàncies es regeneren')
    # panell
    ev("TRAY.closed.delete('cmp'); renderTray()"); chk(pg.locator('[data-cmp]').count()==4,'panell de components amb 4 definicions')
    pg.click('[data-cmpins="%s"]'%ev("DT.id")); chk(ev("S.tool")=='comp' and ev("S.compId")==ev("DT.id"),'«Insereix» activa l’eina amb el component')
    pg.keyboard.press('Escape'); chk(not errs,'sense errors %s'%errs[:3])
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
