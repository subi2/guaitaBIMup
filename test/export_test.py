import json, base64, sys, os, subprocess
from playwright.sync_api import sync_playwright
errs=[]; res=[]
def chk(c,m): res.append(bool(c)); print(('OK  ' if c else 'FAIL'),m)
OUT='/tmp/exp'; os.makedirs(OUT,exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1500,'height':900})
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou'); pg.wait_for_timeout(700)
    ev=pg.evaluate
    chk('BIMup' in ev("document.querySelector('.brand').textContent"),'marca guaitaBIMup')
    chk(ev("VERSION")=="24",'versió 24')
    ev("""(()=>{const c=S.model.root;
      const mk=(x,y,w,d,h,ifc)=>{K.addPolyline(S.model,c,[[x,y,0],[x+w,y,0],[x+w,y+d,0],[x,y+d,0]],true);const fs=[...c.faces.values()];const f=fs[fs.length-1];K.pushPull(S.model,c,f.id,h);
        clearSel();c.faces.forEach(f=>S.sel.faces.add(f.id));c.edges.forEach(e=>S.sel.edges.add(e.id));const g=doGroup();g.ifc=ifc;clearSel();return g;};
      mk(0,0,4,3,2.5,'IfcWall'); mk(6,0,2,2,3,'IfcColumn'); mk(10,0,3,3,1,null);
      K.addPolyline(S.model,c,[[0,6,0],[2,6,0],[2,8,0],[0,8,0]],true);
      S.model.grids.push({id:900,name:'A',a:[0,-2,0],b:[0,10,0]},{id:901,name:'1',a:[-2,0,0],b:[14,0,0]});
      refreshAll();})()""")
    st=ev("(()=>{const s=sceneStats();return [s.bim.length,s.sk.length]})()")
    chk(st[0]==2 and st[1]>=1,'àmbits BIM/esbós '+str(st))
    for ver in ['IFC2X3','IFC4','IFC4X1','IFC4X2','IFC4X3']:
        t=ev(f"buildIFC(sceneStats().all,{{version:'{ver}'}}).text"); open(f'{OUT}/t_{ver}.ifc','w').write(t)
    for v in ['R12','R2000','R2013']:
        for lay in ['class','level','tag']:
            t=ev(f"buildDXF(sceneStats().all,{{version:'{v}',layers:'{lay}',edges:true,extras:true}}).text"); open(f'{OUT}/t_{v}_{lay}.dxf','w').write(t)
    o=ev("buildOBJ(sceneStats().all,'a.mtl')"); open(f'{OUT}/t.obj','w').write(o['obj']); open(f'{OUT}/t.mtl','w').write(o['mtl'])
    g=ev("Array.from(buildGLB(sceneStats().all).glb)"); open(f'{OUT}/t.glb','wb').write(bytes(g))
    s=ev("Array.from(new Uint8Array(buildSTL(sceneStats().all,1000).buf))"); open(f'{OUT}/t.stl','wb').write(bytes(s))
    open(f'{OUT}/t.svg','w').write(ev("buildSVG({scope:'all',bg:'white',edges:true})"))
    # diàleg
    ev("exportDlg('ifc')"); chk(ev("!!document.getElementById('xVer')"),'diàleg IFC obert'); ev("$('xX').click()")
    # menú contextual
    ev("setTool('select')"); box=pg.locator('#view').bounding_box()
    pg.mouse.move(box['x']+700,box['y']+600); pg.mouse.down(button='right'); pg.mouse.up(button='right'); pg.wait_for_timeout(150)
    chk(ev("$('ctx').classList.contains('show')"),'clic dret curt obre el menú contextual')
    pg.screenshot(path=f'{OUT}/ctx.png')
    pg.keyboard.press('Escape')
    chk(not ev("$('ctx').classList.contains('show')"),'Esc tanca el menú')
    pg.mouse.move(box['x']+700,box['y']+600); pg.mouse.down(button='right'); pg.mouse.move(box['x']+760,box['y']+640,steps=4); pg.mouse.up(button='right'); pg.wait_for_timeout(100)
    chk(not ev("$('ctx').classList.contains('show')"),'arrossegar amb el dret desplaça i no obre menú')
    pg.screenshot(path=f'{OUT}/main.png')
    chk(ev("K.toJSON(S.model).format")=='guaitabimup','format JSON guaitabimup')
    chk(ev("K.fromJSON({format:'guaita3dsketch',v:1,units:'m',nid:1,meta:{},tags:[{id:0,name:'x',color:'#fff',visible:true}],materials:[],root:K.toJSON(newModel()).root,levels:[]}) !== null"),'acull format antic')
    print('ERRS',errs)
print('PASS',sum(res),'/',len(res))
