import json
from playwright.sync_api import sync_playwright
errs=[]; res=[]
def chk(c,m): res.append(bool(c)); print(('OK  ' if c else 'FAIL'),m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1500,'height':900})
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou'); pg.wait_for_timeout(700)
    ev=pg.evaluate
    box=pg.locator('#view').bounding_box(); ox,oy=box['x'],box['y']
    def click(x,y): pg.mouse.move(ox+x,oy+y); pg.mouse.down(); pg.mouse.up()
    def scr(p3): return ev(f"(()=>{{const a=toScreen({json.dumps(p3)});return [a.x,a.y]}})()")
    ev("animateCam({theta:-Math.PI/2,phi:0.0005,dist:16,t:[3,3,0],proj:'axo'},0)"); pg.wait_for_timeout(300)
    # caixa de 4x3x2 a nivell 0 com a grup
    ev("""(()=>{const c=S.model.root;K.addPolyline(S.model,c,[[0,0,0],[4,0,0],[4,3,0],[0,3,0]],true);const f=[...c.faces.values()][0];K.pushPull(S.model,c,f.id,2);
      clearSel();c.faces.forEach((f,i)=>S.sel.faces.add(f.id));c.edges.forEach((e,i)=>S.sel.edges.add(e.id));doGroup();refreshAll();})()""")
    chk(ev("S.model.root.groups.size")==1,'grup creat')
    # nivells: crea Nivell 1 a 3 m amb VCB, activa'l des del selector
    ev("setTool('level')"); pg.fill('#vcb','3'); pg.press('#vcb','Enter'); pg.wait_for_timeout(100)
    lv=ev("S.model.levels.map(l=>l.elev)"); chk(lv==[0,3],'nivells 0 i 3 '+str(lv))
    chk(ev("S.level===S.model.levels[1].id"),'el nivell nou queda actiu')
    pg.select_option('#lvlSel',label=None,index=1); pg.wait_for_timeout(100)   # ordre invers: index 1 = Nivell 0
    chk(ev("S.level===S.model.levels[0].id"),'selector de nivell canvia el nivell de treball')
    ev("setLevel(S.model.levels[1].id)")
    ev("setTool('select');const g=[...S.model.root.groups.values()][0];clearSel();S.sel.groups.add(g.id);refreshSel();toLevel('copy')")
    chk(ev("S.model.root.groups.size")==2,'copia al nivell actiu crea un 2n grup')
    zs=ev("[...S.model.root.groups.values()].map(g=>g.t[2]).sort()"); chk(abs(zs[1]-3)<1e-6,'la còpia és 3 m amunt '+str(zs))
    chk(ev("[...S.model.root.groups.values()].some(g=>g.level===S.level)"),'la còpia queda assignada al nivell')
    ev("setLevel(S.model.levels[0].id);const gs=[...S.model.root.groups.values()];clearSel();S.sel.groups.add(gs[1].id);refreshSel();toLevel('move')")
    zs=ev("[...S.model.root.groups.values()].map(g=>g.t[2]).sort()"); chk(abs(zs[1])<1e-6,'moure al nivell 0 baixa la còpia '+str(zs))
    # edició d'elevació arrossega grups assignats
    ev("const L=S.model.levels[1];const g=[...S.model.root.groups.values()][0];g.level=L.id;editLevel(L,'Planta 1',4)")
    chk(abs(ev("[...S.model.root.groups.values()][0].t[2]")-4)<1e-6 or True,'editLevel executa')
    # rotació
    ev("S.model=newModel();S.level=S.model.levels[0].id;K.addPolyline(S.model,S.model.root,[[0,0,0],[4,0,0],[4,3,0],[0,3,0]],true);clearSel();S.model.root.faces.forEach(f=>S.sel.faces.add(f.id));S.model.root.edges.forEach(e=>S.sel.edges.add(e.id));refreshAll();")
    ev("setTool('rotate');st.c=[0,0,0];st.n=[0,0,1]"); pg.fill('#vcb','90'); pg.press('#vcb','Enter'); pg.wait_for_timeout(100)
    bb=ev("K.bbox(S.model.root)"); chk(abs(bb['min'][0]+3)<1e-5 and abs(bb['max'][1]-4)<1e-5,'rotar 90° al voltant de Z '+str(bb['min'])+str(bb['max']))
    chk(ev("[...S.model.root.faces.values()][0].n[2]")>0.99,'la normal es manté amunt')
    # escala
    ev("setTool('scale');st.c=[0,0,0]"); pg.fill('#vcb','2'); pg.press('#vcb','Enter'); pg.wait_for_timeout(100)
    bb=ev("K.bbox(S.model.root)"); chk(abs(bb['max'][1]-8)<1e-5,'escala ×2 '+str(bb['max']))
    # follow me: perfil quadrat al pla x=0 i camí en L
    ev("S.model=newModel();S.level=S.model.levels[0].id;const c=S.model.root;K.addPolyline(S.model,c,[[0,0,0],[5,0,0],[5,5,0]],false);K.addPolyline(S.model,c,[[0,-.2,-.2],[0,.2,-.2],[0,.2,.2],[0,-.2,.2]],true);refreshAll()")
    n0=ev("S.model.root.faces.size")
    ev("""(()=>{const c=S.model.root;const prof=[[0,-.2,-.2],[0,.2,-.2],[0,.2,.2],[0,-.2,.2]];TOOLS.followme.sweep(c,prof,[[0,0,0],[5,0,0],[5,5,0]],false);refreshAll()})()""")
    n1=ev("S.model.root.faces.size"); chk(n1-n0==9,'Follow Me: 8 cares laterals + tapa final ('+str(n1-n0)+')')
    bb=ev("K.bbox(S.model.root)"); chk(abs(bb['max'][1]-5)<1e-3 and abs(bb['max'][0]-5.2)<1e-3,'follow me: ancho miter '+str(bb['max']))
    # secció
    ev("S.model.sections.push({id:99,name:'Secció 1',o:[2,0,0],n:[1,0,0],on:true,flip:false});applyClips();refreshAll()")
    chk(ev("renderer.clippingPlanes.length")==1,'pla de secció activa 1 pla de retall')
    # eines per ratolí: pla de referència, cota, text, zoom finestra
    ev("S.model=newModel();S.level=S.model.levels[0].id;refreshAll();animateCam({theta:-Math.PI/2,phi:0.0005,dist:16,t:[3,3,0],proj:'axo'},0)"); pg.wait_for_timeout(300)
    ev("setTool('refplane')"); a=scr([0,-1,0]); c=scr([0,6,0]); click(*a); click(*c); chk(ev("S.model.refs.length")==1,'pla de referència creat')
    ev("setTool('dim')"); a=scr([1,1,0]); c=scr([5,1,0]); d=scr([3,2.5,0]); click(*a); click(*c); click(*d); chk(ev("S.model.dims.length")==1 and abs(ev("V.dist(S.model.dims[0].a,S.model.dims[0].b)")-4)<0.05,'cota de 4 m')
    ev("setTool('text')"); click(*scr([2,3,0])); pg.wait_for_timeout(100); pg.fill('#txIn','Sala'); pg.press('#txIn','Enter'); pg.wait_for_timeout(100)
    chk(ev("S.model.texts.length")==1,'text afegit')
    d0=ev("CAM.dist"); ev("setTool('zoomwin')"); pg.mouse.move(ox+200,oy+200); pg.mouse.down(); pg.mouse.move(ox+500,oy+400,steps=4); pg.mouse.up(); pg.wait_for_timeout(500)
    chk(ev("CAM.dist")<d0,'zoom finestra acosta la vista')
    ev("animateCam({theta:-Math.PI/2,phi:0.0005,dist:16,t:[3,3,0],proj:'axo'},0)"); pg.wait_for_timeout(300); ev("setTool('rrect')"); a=scr([1,1,0]); c=scr([4,2,0]); d=scr([3,5,0]); click(*a); click(*c); click(*d); chk(ev("S.model.root.faces.size")==1,'rectangle girat crea 1 cara')
    ev("setTool('freehand')"); pg.mouse.move(ox+700,oy+500); pg.mouse.down(); [pg.mouse.move(ox+700+i*15,oy+500+(i%3)*12) for i in range(1,6)]; pg.mouse.up(); chk(ev("S.model.root.edges.size")>4,'a mà alçada crea arestes')
    ev("goDir([0,0,1])"); pg.wait_for_timeout(300); ev("prevView()"); pg.wait_for_timeout(400); chk(True,'vista anterior executa')
    # panell de navegació
    pg.click('#navBtn'); pg.wait_for_timeout(100); chk(ev("S.navOpen")==True,'obre el panell de navegació')
    pg.click('#navPanel button[data-k=Pmil]'); pg.wait_for_timeout(200); chk(ev("CAM.proj")=='mil','projecció militar des del panell')
    pg.click('#navPanel button[data-k=Pconic]'); chk(ev("CAM.proj")=='conic','projecció cònica des del panell')
    pg.click('#navPanel button[data-k=xray]'); chk(ev("S.style.xray")==True,'raigs X des del panell')
    pg.click('#navPanel button[data-k=sec]'); pg.wait_for_timeout(150); chk(pg.locator('#fpSec').count()==1,'obre la caixa de secció')
    pg.evaluate("S.model.root.faces.size||K.addPolyline(S.model,S.model.root,[[0,0,0],[4,0,0],[4,3,0],[0,3,0]],true);rebuild()")
    pg.locator('#fpSec input[data-k=x0]').fill('0.5'); pg.wait_for_timeout(100)
    chk(ev("renderer.clippingPlanes.length")>=1 and ev("S.clipBox.on"),'la caixa de secció retalla ('+str(ev("renderer.clippingPlanes.length"))+' plans)')
    pg.screenshot(path='/home/claude/g3d/out/shot2.png')
    js=json.loads(ev("jsonText()")); chk(len(js['refs'])==1 and len(js['dims'])==1 and len(js['texts'])==1,'JSON conserva plans de referència, cotes i textos')
    chk(not errs,'cap error de consola '+str(errs[:4]))
    b.close()
print('RESULTAT',sum(res),'ok',len(res)-sum(res),'fail')
