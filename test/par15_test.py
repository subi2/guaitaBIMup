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
    ev("createLevel(3.0); S.level=S.model.levels.slice().sort((a,b)=>a.elev-b.elev)[0].id; setLevel(S.level)")
    W="[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall')"
    ev("makeWall([0,0,0],[4,0,0]); makeWall([4,0,0],[4,3,0])")
    v=ev(W+".map(g=>solidVolume(g))"); chk(abs(sum(v)-6.3)<1e-3 and abs(v[0]-(4*0.3*3))<1e-3,'unió a biaix: volums %s sumen 6.3 sense solapament'%[round(x,4) for x in v])
    # el vèrtex exterior del biaix és (4.15,-0.15)
    mx=ev("(()=>{const g="+W+"[0];let m=[-1e9,1e9];for(const v of g.verts.values()){m[0]=Math.max(m[0],v.p[0]);m[1]=Math.min(m[1],v.p[1]);}return m;})()")
    chk(abs(mx[0]-4.15)<1e-6 and abs(mx[1]+0.15)<1e-6,'cantonada exterior del biaix %s'%mx)
    ev("makeWall([2,0,0],[2,2,0])"); v=ev(W+".map(g=>solidVolume(g))")
    chk(abs(v[2]-0.3*1.85*3)<1e-3 and abs(v[0]-3.6)<1e-3,'unió en T: el mur topa a la cara del passant (%.4f)'%v[2])
    ev("makeWall([4,0,0],[7,0,0])"); v=ev(W+".map(g=>solidVolume(g))")
    tot=ev("(()=>{const ws="+W+";let P=solidPolys(ws[0]).polys;for(const g of [ws[1],ws[3]])P=BOOL.union(P,solidPolys(g).polys);const c=S.model.root,t=polysToGroup(P,c,{},'u');c.groups.set(t.g.id,t.g);const vol=solidVolume(t.g);c.groups.delete(t.g.id);return vol;})()")
    chk(abs((v[0]+v[1]+v[3])-tot)<2e-3,'tres murs en un nus: sense solapament (suma %.4f = unió %.4f)'%(v[0]+v[1]+v[3],tot))
    chk(abs(tot-(7.0*0.3+2.85*0.3)*3)<2e-3,'tres murs en un nus: sense buits (%.4f)'%tot)
    # panell de propietats
    ev("clearSel(); S.sel.groups.add("+W+"[2].id); refreshAll()")
    pg.fill('[data-par="t"]','0.5'); pg.dispatch_event('[data-par="t"]','change')
    chk(abs(ev(W+"[2].par.t")-0.5)<1e-9 and abs(ev("solidVolume("+W+"[2])")-0.5*1.85*3)<1e-3,'el panell canvia el gruix i regenera')
    pg.select_option('[data-par="hm"]','fix'); pg.fill('[data-par="h"]','2'); pg.dispatch_event('[data-par="h"]','change')
    chk(abs(ev("solidVolume("+W+"[2])")-0.5*1.85*2)<1e-3,'mode d’alçada fixa des del panell')
    ev("createLevel(6.0)"); ev("clearSel(); S.sel.groups.add("+W+"[2].id); refreshAll()")
    pg.select_option('[data-par="hm"]','lvl'); top=ev("S.model.levels.find(l=>l.elev===6).id"); pg.select_option('[data-par="hl"]',str(top))
    chk(abs(ev("solidVolume("+W+"[2])")-0.5*1.85*6)<1e-3,'mode «fins a un nivell» des del panell')
    pg.keyboard.press("Control+z"); chk(ev(W+"[2].par.hm")!='lvl' or ev(W+"[2].par.hl")!=top,'els canvis del panell es poden desfer')
    # obertures: editar i esborrar
    ev("addOpening("+W+"[3],[5.5,0,0],1.0,1.2,0.9,'IfcWindow'); clearSel(); S.sel.groups.add("+W+"[3].id); refreshAll()")
    v0=ev("solidVolume("+W+"[3])"); pg.fill('[data-op="w0"]','2'); pg.dispatch_event('[data-op="w0"]','change'); v1=ev("solidVolume("+W+"[3])")
    chk(abs((v0-v1)-1.0*0.3*1.2)<1e-3,'amplada de l’obertura editable (%.4f)'%(v0-v1))
    ifc=ev("buildIFC(scopeFilter(collectScene(),'all'),{version:'IFC4'}).text")
    chk(ifc.count('IFCOPENINGELEMENT(')==1 and ifc.count('IFCRELVOIDSELEMENT(')==1 and ifc.count('IFCWINDOW(')==1 and ifc.count('IFCRELFILLSELEMENT(')==1,'IFC4: buit, finestra i relacions')
    ifc2=ev("buildIFC(scopeFilter(collectScene(),'all'),{version:'IFC2X3'}).text"); chk(ifc2.count('IFCRELVOIDSELEMENT(')==1 and ifc2.count('IFCWINDOW(')==1,'IFC2x3: buit i finestra')
    import re
    m=re.search(r"IFCWINDOW\(([^;]*)\);",ifc); chk(m and ',1.2,2.' in m.group(1),'IfcWindow amb OverallHeight i OverallWidth')
    pg.click('[data-opdel="0"]'); chk(ev(W+"[3].par.openings.length")==0 and abs(ev("solidVolume("+W+"[3])")-ev("solidVolume("+W+"[3])"))<1e-9 and 'IFCOPENINGELEMENT(' not in ev("buildIFC(scopeFilter(collectScene(),'all'),{version:'IFC4'}).text"),'obertura esborrada des del panell')
    # forjat per polígon (L)
    ev("makeSlabPoly([[0,10],[6,10],[6,13],[3,13],[3,16],[0,16]])"); sv=ev("solidVolume([...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='slab')[0])")
    chk(abs(sv-27*0.2)<1e-3,'forjat poligonal còncau: 27 m² × 0.20 (%.4f)'%sv)
    # dreceres
    pg.locator('#view canvas').focus(); pg.keyboard.press("Shift+P"); chk(ev("S.tool")=='column','Maj+P: pilar'); pg.keyboard.press("Shift+O"); chk(ev("S.tool")=='opening','Maj+O: obertura'); pg.keyboard.press("Shift+F"); chk(ev("S.tool")=='slab','Maj+F: forjat')
    chk(not errs,'sense errors %s'%errs[:3])
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
