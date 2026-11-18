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
    # nivells 0, 3, 6.5, 9  (alçades de planta diferents)
    ev("createLevel(3.0); createLevel(6.5); createLevel(9.0); window.LV=S.model.levels.slice().sort((a,b)=>a.elev-b.elev).map(l=>l.id); S.level=LV[0]; setLevel(S.level)")
    ZR="(g=>{let mn=1e9,mx=-1e9;for(const v of g.verts.values()){mn=Math.min(mn,v.p[2]+g.t[2]);mx=Math.max(mx,v.p[2]+g.t[2]);}return [+mn.toFixed(4),+mx.toFixed(4)];})"
    ev("window.W1=makeWall([0,0,0],[4,0,0]); addOpening(W1,[2,0,0],1,1.2,0.9,'IfcWindow'); window.C1=makeColumn([2,3,0]);0")
    # còpia +3 m amb l'eina Moure (Ctrl)
    ev("clearSel(); S.sel.groups.add(W1.id); S.sel.groups.add(C1.id); pushUndo(); TOOLS.move.apply([0,0,3],true); refreshAll()")
    ws=ev("[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall').map(g=>[g.id,g.par.lv,g.par.bo,g.level,"+ZR+"(g),g.par.openings.length])")
    chk(len(ws)==2 and ws[0][4]==[0,3] and ws[0][1]==ev("LV[0]"),'l’original no canvia en copiar (%s)'%ws[0])
    cp=[w for w in ws if w[0]!=ev("W1.id")][0]
    chk(cp[1]==ev("LV[1]") and cp[2]==0 and cp[3]==ev("LV[1]"),'la còpia queda reassignada al nivell de +3,00 sense desfasament')
    chk(cp[4]==[3,6.5],'la còpia pren l’alçada del nou nivell de sobre: %s'%cp[4])
    chk(cp[5]==1,'la còpia conserva l’obertura')
    chk(ev("(()=>{const a=[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall');return a[0].par!==a[1].par&&a[0].par.openings!==a[1].par.openings;})()"),'paràmetres independents entre original i còpia')
    cs=ev("[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='column').map(g=>[g.par.lv,"+ZR+"(g)])"); chk([3,6.5] in [c[1] for c in cs] and [0,3] in [c[1] for c in cs],'pilar copiat al nivell nou amb la seva alçada: %s'%[c[1] for c in cs])
    # moure la còpia en horitzontal no arrossega l'original
    ev("const cp=[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall'&&g.id!==W1.id)[0]; window.W2=cp; clearSel(); S.sel.groups.add(cp.id); TOOLS.move.apply([0,5,0],false); refreshAll()")
    chk(ev("W1.par.a[1]")==0 and ev("W2.par.a[1]")==5,'moure la còpia no mou l’original')
    # copiar a una cota intermèdia: desfasament
    ev("clearSel(); S.sel.groups.add(W1.id); TOOLS.move.apply([0,8,1],true); refreshAll(); window.W3=[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall'&&g.id!==W1.id&&g.id!==W2.id)[0]")
    chk(ev("W3.par.lv")==ev("LV[0]") and abs(ev("W3.par.bo")-1)<1e-9 and ev(ZR+"(W3)")==[1,3],'còpia a +1,00: mateix nivell amb desfasament de base 1,00 → %s'%ev(ZR+"(W3)"))
    # desfasaments manuals i mode «fins a un nivell» amb salt de plantes
    ev("pushUndo(); W1.par.bo=-0.5; W1.par.to=0.3; refreshAll()"); chk(ev(ZR+"(W1)")==[-0.5,3.3],'desfasament de base −0,50 i superior +0,30: %s'%ev(ZR+"(W1)"))
    ev("W1.par.bo=0; W1.par.to=0; W1.par.hm='lvl'; W1.par.hl=LV[2]; refreshAll()"); chk(ev(ZR+"(W1)")==[0,6.5],'fins a un nivell (2 plantes)')
    ev("clearSel(); S.sel.groups.add(W1.id); TOOLS.move.apply([0,12,3],true); refreshAll(); window.W4=[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall'&&![W1.id,W2.id,W3.id].includes(g.id))[0]")
    chk(ev("W4.par.hl")==ev("LV[3]") and ev(ZR+"(W4)")==[3,9],'la còpia manté el salt de dues plantes: %s'%ev(ZR+"(W4)"))
    ev("clearSel(); S.sel.groups.add(W4.id); TOOLS.move.apply([0,0,3.5],false); refreshAll()")
    chk(ev("W4.par.hm")=='fix' and ev(ZR+"(W4)")==[6.5,12.5],'sense nivell per mantenir el salt: passa a alçada fixa i conserva l’alçada: %s'%ev(ZR+"(W4)"))
    # dalt de tot sense nivell de sobre: avís
    ev("S.level=LV[3]; setLevel(S.level); window.W5=makeWall([0,20,0],[3,20,0])"); chk(ev("!!W5.warn") and ev(ZR+"(W5)")==[9,12],'sense nivell superior: alçada fixa i avís')
    # canviar elevació de nivell arrossega base i sostre
    ev("editLevel(S.model.levels.find(l=>l.id===LV[1]), null, 3.2)"); chk(ev(ZR+"(W2)")==[3.2,6.5],'canvi d’elevació del nivell: %s'%ev(ZR+"(W2)"))
    # rotació d'un element paramètric
    ev("clearSel(); S.sel.groups.add(C1.id); C1.par.w=0.6; transformSel(p=>rotPt(p,[0,0,0],[0,0,1],Math.PI/2)); refreshAll()")
    chk(abs(ev("C1.par.p[0]")+3)<1e-6 and abs(ev("C1.par.p[1]")-2)<1e-6 and abs(ev("C1.par.rot")-90)<1e-3,'girar un pilar gira els paràmetres (posició i rotació)')
    bb=ev("(()=>{let a=1e9,b=-1e9;for(const v of C1.verts.values()){a=Math.min(a,v.p[0]);b=Math.max(b,v.p[0]);}return b-a;})()"); chk(abs(bb-0.4)<1e-6,'secció girada 90°: 0,60×0,40 passa a 0,40 en X (%.3f)'%bb)
    # pilar circular
    ev("C1.par.shape='circ'; C1.par.w=0.5; refreshAll()"); v=ev("solidVolume(C1)"); chk(abs(v-0.19411*3.2)<0.002,'pilar circular Ø0,50: volum %.4f'%v)
    # fonaments
    ev("S.level=LV[0]; setLevel(S.level); setTool('matf'); window.M1=makeSlab([20,0,0],[26,4,0]); setTool('select')")
    chk(ev("M1.par.kind")=='base' and ev(ZR+"(M1)")==[-0.5,0] and ev("M1.name").startswith('Llosa'),'llosa de fonamentació de 0,50 sota el nivell')
    ev("M1.par.face='bot'; M1.par.off=-1; refreshAll()"); chk(ev(ZR+"(M1)")==[-1,-0.5],'llosa: nivell a la cara inferior amb desfasament −1,00')
    ev("C1.par.shape='rect'; C1.par.w=0.4; C1.par.d=0.4; C1.par.rot=30; C1.par.bo=-0.2; refreshAll(); window.P1=makePad([0,0,0],C1)")
    chk(ev("P1.par.p[0]")==ev("C1.par.p[0]") and ev("P1.par.rot")==30 and ev(ZR+"(P1)")==[-0.7,-0.2] and ev("P1.ifc")=='IfcFooting','sabata aïllada sota el pilar: centrada, girada i a la cota de la seva base %s'%ev(ZR+"(P1)"))
    chk(abs(ev("solidVolume(P1)")-1.2*1.2*0.5)<1e-3,'volum de la sabata aïllada 1,20×1,20×0,50')
    ev("W1.par.hm='next'; refreshAll(); window.S1=makeStrip(null,null,W1)")
    chk(ev("S1.par.a")==ev("W1.par.a") and abs(ev("solidVolume(S1)")-4*0.6*0.4)<1e-3 and ev(ZR+"(S1)")==[-0.4,0],'sabata correguda sota el mur: 4,00×0,60×0,40')
    ev("window.S2=makeStrip([4,0,0],[4,3,0])"); tot=ev("solidVolume(S1)+solidVolume(S2)"); chk(abs(tot-(4+3)*0.6*0.4)<1e-3,'sabates corregudes en angle unides a biaix (%.4f)'%tot)
    ifc=ev("buildIFC(scopeFilter(collectScene(),'all'),{version:'IFC4'}).text")
    chk('.PAD_FOOTING.' in ifc and '.STRIP_FOOTING.' in ifc and '.BASESLAB.' in ifc,'IFC amb PAD_FOOTING, STRIP_FOOTING i BASESLAB')
    # panell
    ev("clearSel(); S.sel.groups.add(W2.id); refreshAll()"); pg.fill('[data-par="bo"]','0.25'); pg.dispatch_event('[data-par="bo"]','change'); chk(ev(ZR+"(W2)")==[3.45,6.5],'desfasament de base des del panell')
    ev("clearSel(); S.sel.groups.add(P1.id); refreshAll()"); pg.fill('[data-par="t"]','0.8'); pg.dispatch_event('[data-par="t"]','change'); chk(abs(ev("solidVolume(P1)")-1.2*1.2*0.8)<1e-3,'cantell de la sabata des del panell')
    # desar i carregar
    rt=ev("(()=>{const m=K.fromJSON(JSON.parse(snapshot()));return [...m.root.groups.values()].filter(g=>g.par).map(g=>g.par.type).sort().join(',');})()"); chk('pad' in rt and 'strip' in rt,'es desa al fitxer (%s)'%rt[:60])
    pg.keyboard.press('Escape'); chk(not errs,'sense errors %s'%errs[:3])
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
