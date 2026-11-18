import sys, json
from playwright.sync_api import sync_playwright
errs=[]; res=[]
def chk(c,m): res.append((bool(c),m)); print(('OK  ' if c else 'FAIL'),m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1500,'height':900})
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou'); pg.wait_for_timeout(800)
    chk(not errs,'arrenca sense errors '+str(errs[:3]))
    chk(pg.evaluate('glOK'),'WebGL disponible')
    def cnt(): return pg.evaluate('K.countAll(S.model.root)')
    # dibuixa rectangle amb el ratolí des de dalt
    pg.evaluate("animateCam({theta:-Math.PI/2,phi:0.0005,dist:14,t:[3,3,0],proj:'axo'},0)"); pg.wait_for_timeout(300)
    pg.keyboard.press('r'); pg.wait_for_timeout(450)
    box=pg.locator('#view').bounding_box()
    s=pg.evaluate("(()=>{const a=toScreen([1,1,0]),b=toScreen([5,4,0]);return [a.x,a.y,b.x,b.y]})()")
    ox,oy=box['x'],box['y']
    pg.mouse.move(ox+s[0],oy+s[1]); pg.mouse.down(); pg.mouse.up(); pg.mouse.move(ox+s[2],oy+s[3]); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(200)
    c=cnt(); chk(c['f']==1 and c['e']==4,'rectangle amb ratolí crea 1 cara i 4 arestes '+str(c))
    # push/pull amb VCB
    pg.keyboard.press('p'); mid=pg.evaluate("(()=>{const a=toScreen([3,2.5,0]);return [a.x,a.y]})()")
    pg.mouse.move(ox+mid[0],oy+mid[1]); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(100)
    pg.keyboard.type('2'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    c=cnt(); chk(c['f']==6,'push/pull 2 m → caixa amb 6 cares '+str(c))
    bb=pg.evaluate("K.bbox(S.model.root)"); chk(abs(bb['max'][2]-2)<1e-6,'alçada 2 m '+str(bb['max']))
    # grup + classificació
    pg.keyboard.press('Space'); pg.keyboard.down('Control'); pg.keyboard.press('a'); pg.keyboard.up('Control'); pg.keyboard.down('Control'); pg.keyboard.press('g'); pg.keyboard.up('Control'); pg.wait_for_timeout(150)
    chk(cnt()['g']==1,'Ctrl+A, Ctrl+G crea 1 grup')
    pg.evaluate("document.querySelector('#tray .pn:nth-child(3) .row.it:nth-of-type(3)')"); 
    pg.evaluate("S.sel.groups.size||0")
    # classe IFC via panell
    pg.evaluate("const g=[...S.model.root.groups.values()][0]; clearSel(); S.sel.groups.add(g.id); refreshSel();")
    pg.locator('#tray .pn',has_text='Classificador IFC').locator('.row.it',has_text='Mur').first.click(); pg.wait_for_timeout(150)
    chk(pg.evaluate("[...S.model.root.groups.values()][0].ifc")=='IfcWall','classe IFC assignada al grup (IfcWall)')
    # nivell via VCB
    pg.keyboard.press('l'); pg.keyboard.press('l'); pg.wait_for_timeout(500)
    pg.evaluate("setTool('level')"); pg.fill('#vcb','3'); pg.press('#vcb','Enter'); pg.wait_for_timeout(150)
    chk(pg.evaluate("S.model.levels.length")==2,'nivell creat a 3 m')
    # eix
    pg.evaluate("setTool('grid')"); a=pg.evaluate("(()=>{const a=toScreen([0,-1,0]),b=toScreen([0,6,0]);return [a.x,a.y,b.x,b.y]})()")
    pg.mouse.move(ox+a[0],oy+a[1]); pg.mouse.down(); pg.mouse.up(); pg.mouse.move(ox+a[2],oy+a[3]); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(150)
    chk(pg.evaluate("S.model.grids.length")==1,'eix de pilars creat')
    # projeccions i cub d'orientació
    pg.click('#navBtn')
    for pr in ['conic','axo','cav','mil']:
        pg.click(f'#navPanel button[data-k=P{pr}]'); pg.wait_for_timeout(250)
        pg.screenshot(path=f'/home/claude/g3d/out/shot_{pr}.png')
        chk(pg.evaluate('CAM.proj')==pr,'projecció '+pr)
    pg.click('#navPanel button[data-k=Pconic]'); pg.click('#navBtn'); pg.evaluate("animateCam({theta:-Math.PI/3,phi:1.15},0)"); pg.wait_for_timeout(400)
    cb=pg.locator('#vcube').bounding_box(); pg.mouse.click(cb['x']+60,cb['y']+30); pg.wait_for_timeout(500)
    chk(pg.evaluate('CAM.phi')<0.9,'clic a la cara del cub d'orientació canvia la vista (phi='+str(pg.evaluate('CAM.phi'))+')')
    # vistes: planta
    lid=pg.evaluate("S.model.levels[0].id"); pg.evaluate(f"openView('plan:{lid}')"); pg.wait_for_timeout(500)
    chk(pg.evaluate("S.tabs.length")==1,'vista de planta oberta com a pestanya')
    # desfer
    pg.evaluate("S.view=null;S.tabs=[];renderer.clippingPlanes=[];refreshAll()")
    n0=pg.evaluate("S.undo.length"); pg.keyboard.down('Control'); pg.keyboard.press('z'); pg.keyboard.up('Control'); pg.wait_for_timeout(100)
    chk(pg.evaluate("S.undo.length")==n0-1,'desfer funciona')
    # JSON round trip
    js=pg.evaluate("jsonText()"); chk(json.loads(js)['format']=='guaitabimup','JSON guaitabimup')
    pg.screenshot(path='/home/claude/g3d/out/shot_main.png')
    chk(not errs,'cap error de consola durant la prova '+str(errs[:4]))
    b.close()
print('RESULTAT',sum(1 for r in res if r[0]),'ok',sum(1 for r in res if not r[0]),'fail')
