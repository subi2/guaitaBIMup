from playwright.sync_api import sync_playwright
errs=[]; res=[]
def chk(c,m): res.append(bool(c)); print(('OK  ' if c else 'FAIL'),m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1500,'height':900})
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou'); pg.wait_for_timeout(600)
    ev=pg.evaluate
    chk(ev("VERSION")=="24",'versió 24')
    ev("""window.mkBox=(x,y,z,w,d,h,name,ifc,grp)=>{const c=S.model.root;const before=new Set(c.faces.keys()),be=new Set(c.edges.keys());K.addPolyline(S.model,c,[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],true);
      const f=[...c.faces.values()].find(f=>!before.has(f.id));K.pushPull(S.model,c,f.id,h);if(!grp)return 0;
      clearSel();c.faces.forEach(f=>{if(!before.has(f.id)||1)S.sel.faces.add(f.id)});c.edges.forEach(e=>S.sel.edges.add(e.id));const g=doGroup();g.name=name;g.ifc=ifc||null;clearSel();return g.id;};
      window.scr=(p)=>{const s=toScreen(p);const r=view.getBoundingClientRect();return [r.left+s.x,r.top+s.y]};0""")
    A=ev("mkBox(0,0,0,4,0.3,3,'Mur A','IfcWall',1)")
    ev("S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear()") if False else None
    # els grups es creen amb la geometria resident: netegem entre caixes movent-la a grup (doGroup ja la mou)
    B=ev("mkBox(4,0,0,4,0.3,3,'Mur B','IfcWall',1)")
    C=ev("mkBox(20,0,0,4,0.3,3,'Mur C','IfcWall',1)")
    D=ev("mkBox(0,0.3,0,4,0.3,3,'Mur D','IfcColumn',1)")
    ev("refreshAll();fitView()"); pg.wait_for_timeout(300)
    chk(ev("S.model.root.groups.size")==4,'4 grups creats')
    # cadenes de grups
    ch=ev(f"[...groupChain(S.model.root,{A},true)].sort()"); chk(sorted(ch)==sorted([A,B]),f'cadena mateixa classe des d’A = A,B (no C ni D) {ch}')
    ch2=ev(f"[...groupChain(S.model.root,{A},false)].sort()"); chk(sorted(ch2)==sorted([A,B,D]),f'cadena sense filtre de classe = A,B,D {ch2}')
    # modificadors amb ratolí real
    ev("setTool('select')")
    def cen(g): return ev(f"(()=>{{const g=S.model.root.groups.get({g});const b=K.bbox(g,g.t);return scr([(b.min[0]+b.max[0])/2,b.min[1],(b.min[2]+b.max[2])/2])}})()")
    ca,cb=cen(A),cen(B)
    pg.mouse.click(*ca); chk(ev("[...S.sel.groups]")==[A],'clic: selecciona A')
    pg.keyboard.down('Control'); pg.mouse.click(*cb); pg.keyboard.up('Control'); chk(sorted(ev("[...S.sel.groups]"))==sorted([A,B]),'Ctrl+clic afegeix B')
    pg.keyboard.down('Shift'); pg.mouse.click(*cb); pg.keyboard.up('Shift'); chk(ev("[...S.sel.groups]")==[A],'Maj+clic alterna (treu B)')
    pg.keyboard.down('Control'); pg.keyboard.down('Shift'); pg.mouse.click(*ca); pg.keyboard.up('Shift'); pg.keyboard.up('Control'); chk(ev("S.sel.groups.size")==0,'Ctrl+Maj+clic treu A')
    # cursor
    chk('data:image/svg+xml' in ev("canvas.style.cursor"),'punter propi per a Selecciona')
    pg.keyboard.down('Control'); pg.wait_for_timeout(50); c1=ev("canvas.style.cursor"); pg.keyboard.up('Control'); pg.wait_for_timeout(50); c2=ev("canvas.style.cursor")
    chk(c1!=c2,'el punter canvia amb Ctrl')
    ev("setTool('line')"); chk('data:image/svg+xml' in ev("canvas.style.cursor") and ev("canvas.style.cursor")!=c2,'punter propi per a Línia'); ev("setTool('select')")
    # Tab
    pg.mouse.move(*ca); pg.wait_for_timeout(100); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    chk(ev("TABST&&TABST.cur&&TABST.cur.groups.size")==2,'Tab: previsualitza cadena de 2 grups')
    pg.keyboard.press('Shift+Tab'); chk(ev("TABST.cur.groups.size")==1,'Maj+Tab: torna a l’element sol')
    pg.keyboard.press('Tab'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    chk(sorted(ev("[...S.sel.groups]"))==sorted([A,B]),'Enter confirma la cadena A,B'); chk(ev("TABST")is None,'estat Tab netejat')
    pg.mouse.move(*ca); pg.keyboard.press('Tab'); pg.mouse.move(ca[0]+40,ca[1]+40); pg.wait_for_timeout(100); chk(ev("TABST")is None,'moure el ratolí cancel·la la previsualització')
    # Ctrl+I i Esc
    ev("clearSel();S.sel.groups.add(%d);refreshSel()"%A); pg.keyboard.press('Control+i'); chk(sorted(ev("[...S.sel.groups]"))==sorted([B,C,D]),'Ctrl+I inverteix')
    # triple clic i cadenes de cares/arestes (geometria solta, context d'un grup)
    ev("S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();S.model.nid+=0;clearSel();refreshAll()")
    ev("mkBox(0,0,0,2,2,2,'',null,0);mkBox(10,0,0,2,2,2,'',null,0);K.addPolyline(S.model,S.model.root,[[0,10,0],[3,10,0],[3,13,0]],false);refreshAll();fitView()")
    chk(ev("S.model.root.faces.size")==12,'12 cares soltes (2 caixes)')
    f0=ev("[...S.model.root.faces.values()][0].id")
    ev(f"tripleSel({{type:'face',id:{f0}}},'replace')"); chk(ev("S.sel.faces.size")==6,'triple clic: 6 cares de la caixa (no l’altra)')
    es=ev("[...S.model.root.edges.values()].filter(e=>S.model.root.verts.get(e.a).p[1]>=10).map(e=>e.id)"); chk(len(es)==2,'polilínia de 2 arestes')
    chk(ev(f"edgeChain(S.model.root,{es[0]},false).size")==2,'cadena d’arestes (valència 2) = 2')
    cands=ev(f"tabCands({{type:'face',id:{f0}}}).map(c=>[c.label,c.faces.size])"); print(cands)
    chk(len(cands)>=2 and cands[-1][1]==6,'Tab de cares: cara → … → 6 connectades')
    # barra de propietats
    ev("S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();clearSel()")
    ev("mkBox(0,0,0,4,0.3,3,'Mur A','IfcWall',1);mkBox(4,0,0,4,0.3,3,'Mur B','IfcWall',1);mkBox(0,5,0,2,2,2,'Pilar P1','IfcColumn',1);mkBox(10,5,0,3,3,0.2,'Llosa 1',null,1);refreshAll()")
    ev("toggleSelBar(true)"); chk(ev("$('selBar').classList.contains('show')"),'barra visible')
    n=lambda f: ev(f"selTotal(runFilter({f}))")
    chk(n("[{p:'classe',v:'IfcWall'}]")==2,'filtre classe = mur → 2')
    chk(n("[{p:'classe',v:''}]")==1,'filtre No BIM → 1')
    chk(n("[{p:'nom',v:'mur*'}]")==2,'filtre nom Mur* → 2 (insensible a majúscules)')
    chk(n("[{p:'pend',v:'1'}]")==1,'sense classificar → 1')
    chk(n("[{p:'tipus',v:'group'},{p:'classe',v:'IfcColumn'}]")==1,'tipus grup i classe pilar → 1 (AND)')
    chk(n("[{p:'mida',v:'<2'},{p:'tipus',v:'group'}]")==1,'mida (volum) < 2 → llosa')
    chk(n("[{p:'orient',v:'h'},{p:'tipus',v:'face'}]")==0,'cap cara solta horitzontal al context')
    pg.select_option('#sbOp','replace'); pg.click('#sbGo'); pg.wait_for_timeout(100); chk(ev("S.sel.groups.size")==ev("selTotal(runFilter())"),'«Selecciona» aplica el filtre')
    ev("clearSel();var g0=[...S.model.root.groups.values()].find(g=>g.name==='Mur A');S.sel.groups.add(g0.id);SB.filters=[{p:'classe',v:''}];SB.op='replace';similarSel()")
    chk(ev("S.sel.groups.size")==2,'Similar: tots els murs a partir d’un mur')
    ev("SB.scope='model';SB.filters=[{p:'classe',v:'IfcColumn'}]"); chk(n("SB.filters")==1,'àmbit tot el model')
    print('ERRS',errs); chk(len(errs)==0,'sense errors de consola'); print('PASS',sum(res),'/',len(res)); b.close()
