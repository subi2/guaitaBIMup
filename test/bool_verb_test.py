from playwright.sync_api import sync_playwright
errs=[]; res=[]
def chk(c,m): res.append(bool(c)); print(('OK  ' if c else 'FAIL'),m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1500,'height':900}); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou'); pg.wait_for_timeout(600); ev=pg.evaluate
    ev("""window.mk=(x)=>{var c=S.model.root;var bf=new Set(c.faces.keys());K.addPolyline(S.model,c,[[x,0,0],[x+4,0,0],[x+4,4,0],[x,4,0]],true);var f=[...c.faces.values()].find(f=>!bf.has(f.id));K.pushPull(S.model,c,f.id,4);clearSel();c.faces.forEach(f=>S.sel.faces.add(f.id));c.edges.forEach(e=>S.sel.edges.add(e.id));var g=doGroup();clearSel();return g.id};
    window.A=mk(0); window.B=mk(2); refreshAll(); fitView(); 0""")
    # verb primer
    ev("clearSel();refreshSel()")
    ev("boolOp('subtract')")
    chk(ev("S.boolPend")=='subtract','verb primer: operació armada')
    chk('BOOLEANA' in ev("$('stTool').textContent"),'barra d’estat mostra l’operació armada')
    ev(f"S.sel.groups.clear();S.sel.groups.add({'A'});S.sel.groups.add({'B'});refreshSel()")
    ev("var e=new KeyboardEvent('keydown',{key:'Enter',bubbles:true});window.dispatchEvent(e)")
    chk(ev("S.boolPend")==None,'Enter executa')
    chk(ev("[...S.model.root.groups.values()].map(g=>g.name)")==['Resta'] or any('Resta' in (g['name'] or '') for g in ev("[...S.model.root.groups.values()].map(g=>({name:g.name}))")),'resultat «Resta» creat')
    chk(ev("S.model.root.groups.size")==1,'els dos sòlids originals es substitueixen per un de sol')
    # nom primer (ja existia) i Esc cancel·la
    ev("S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();window.A=mk(0);window.B=mk(2);clearSel();refreshAll()")
    ev("S.sel.groups.add(A);S.sel.groups.add(B);refreshSel();boolOp('union')")
    chk(ev("S.model.root.groups.size")==1,'nom primer funciona')
    ev("S.model.root.groups.clear();S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();window.A=mk(0);window.B=mk(2);clearSel();refreshAll()")
    ev("boolOp('intersect')"); pg.keyboard.press('Escape'); chk(ev("S.boolPend")==None,'Esc cancel·la')
    chk(ev("S.model.root.groups.size")==2,'cancel·lat no toca res')
    # verb per menú amb la UI real
    ev("clearSel();refreshSel();S.boolPend=null")
    ev("BOOL_ITEMS().find(x=>x.l.startsWith('Resta')).f()")
    chk(ev("S.boolPend")=='subtract','element del menú BOOL_ITEMS arma l’operació (sense selecció)')
    pg.keyboard.press('Escape')
    print('ERRS',errs); chk(len(errs)==0,'sense errors'); print('PASS',sum(res),'/',len(res)); b.close()
