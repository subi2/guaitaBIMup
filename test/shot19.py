from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1100,"height":700}); pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    ev("""(()=>{createLevel(3.0); S.level=S.model.levels.slice().sort((a,b)=>a.elev-b.elev)[0].id; setLevel(S.level);
    const mk=(name,boxes)=>{const b=OpenSKP.create(),m=b.addMaterial('Fusta',[160,110,60]);b.addGroup(d=>{for(const [x0,y0,z0,x1,y1,z1] of boxes){const q=(a,bb,c,dd)=>d.addFace([a,bb,c,dd],{material:m,autoTriangulate:true});q([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]);q([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]);q([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]);q([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]);q([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]);q([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]);}},{name});const by=b.toBytes();return by.buffer.slice(by.byteOffset,by.byteOffset+by.byteLength);};
    const DD=compFromSKP('Porta',mk('P',[[0,0,0,36,2,80]])),DW=compFromSKP('Finestra',mk('F',[[0,0,0,48,2,48]])),DT=compFromSKP('Taula',mk('T',[[0,0,28,60,30,30],[0,0,0,2,2,28],[58,0,0,60,2,28],[0,28,0,2,30,28],[58,28,0,60,30,28]]));
    const w=makeWall([0,0,0],[6,0,0]); const w2=makeWall([6,0,0],[6,4,0]); makeComp(DD,[1.5,0,0],w); makeComp(DW,[4,0,0],w); makeComp(DT,[3,2,0],null);
    const c=makeColumn([1,3,0]); makePad([0,0,0],c); makeStrip(null,null,w); makeStrip(null,null,w2); clearSel(); S.show.levels=false; refreshAll(); animateCam({proj:'axo',theta:-1.0,phi:1.05,t:[3,2,1],dist:16});})();0""")
    pg.wait_for_timeout(900); pg.locator("#viewWrap").screenshot(path="/home/claude/g3d/out/v19.png"); b.close()
