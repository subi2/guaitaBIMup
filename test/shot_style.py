from playwright.sync_api import sync_playwright
import sys
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1100,"height":700}); pg.on("console",lambda m: print("CON",m.text) if m.type in("error","warning") else None)
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    ev("(()=>{const c=S.model.root;const r=K.addPolyline(S.model,c,[[0,0,0],[4,0,0],[4,3,0],[0,3,0]],true);const f=r.faces[0];K.pushPull(S.model,c,f.id,3*(c.faces.get(f.id).n[2]>0?1:-1));const sel={faces:new Set(c.faces.keys()),edges:new Set(c.edges.keys()),groups:new Set()};const g=K.makeGroup(S.model,c,sel);g.ifc='IfcWall';createLevel(3);S.level=S.model.levels[0].id;makeWall([6,0,0],[10,0,0]);makeWall([10,0,0],[10,4,0]);addOpening([...S.model.root.groups.values()].filter(g=>g.par)[0],[8,0,0],1.2,1.2,0.9,'IfcWindow');makeColumn([7,3,0]);clearSel();refreshAll();fitView();})();0")
    pg.wait_for_timeout(700)
    for i in [1,2,6,7]:
        ev("useStyle(STYLES_BUILTIN[%d])"%i)
        if i==2: ev("S.model.sections.push({id:S.model.nid++,name:'Secció 1',o:[2,1.5,0],n:[0,1,0],on:true,flip:false}); applyClips(); refreshAll()")
        pg.wait_for_timeout(400); pg.locator("#viewWrap").screenshot(path="/home/claude/g3d/out/sty%d.png"%i)
        if i==2: ev("S.model.sections=[]; applyClips()")
    b.close()
