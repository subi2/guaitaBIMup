from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1200,"height":760}); pg.on("pageerror",lambda e:print("ERR",e)); pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    print(ev("""(()=>{createLevel(3.0); const LV=S.model.levels.slice().sort((a,b)=>a.elev-b.elev).map(l=>l.id); S.level=LV[0]; setLevel(S.level);
    const out=[]; const mk=(name,pts,area)=>{S.level=LV[1]; const r=makeRoof(pts); r.par.sl.forEach(s=>{s.on=true;s.v=50}); r.par.ov=0; refreshAll(); out.push(name+': vol '+solidVolume(r).toFixed(3)+' (àrea×gruix '+(area*0.25).toFixed(3)+') peces '+convexPieces(r.par.pts).length+' avís '+(r.warn?'SÍ':'no')); return r;};
    mk('U',[[0,0],[12,0],[12,10],[8,10],[8,4],[4,4],[4,10],[0,10]],12*10-4*6);
    mk('T',[[20,0],[32,0],[32,4],[28,4],[28,10],[24,10],[24,4],[20,4]],12*4+4*6);
    mk('Z',[[40,0],[48,0],[48,6],[54,6],[54,10],[44,10],[44,4],[40,4]],8*4+4*2+10*4);
    mk('oblic',[[60,0],[70,2],[68,9],[63,10],[58,5]],0.5*Math.abs(60*2-70*0+70*9-68*2+68*10-63*9+63*5-58*10+58*0-60*5));
    S.level=LV[0]; const ws=[makeWall([0,-14,0],[8,-14,0]),makeWall([8,-14,0],[8,-8,0]),makeWall([8,-8,0],[0,-8,0]),makeWall([0,-8,0],[0,-14,0])];
    const l=wallLoop(S.model.root,ws[0]),z=zToLevel(l.top),r=makeRoof(l.pts,z[0],z[1]); r.par.sl[0].on=r.par.sl[2].on=true; r.par.ov=0.4; for(const w of ws){w.par.hm='roof';w.par.hr=r.id;} clearSel(); S.show.levels=false; refreshAll();
    animateCam({proj:'axo',theta:-1.0,phi:1.0,t:[20,0,2],dist:70}); return out.join(' | ');})()"""))
    pg.wait_for_timeout(1200); pg.locator("#viewWrap").screenshot(path="/home/claude/g3d/out/v20.png")
    ev("animateCam({t:[4,-11,2],dist:22,theta:-0.6}); 0"); pg.wait_for_timeout(900); pg.locator("#viewWrap").screenshot(path="/home/claude/g3d/out/v20b.png"); b.close()
