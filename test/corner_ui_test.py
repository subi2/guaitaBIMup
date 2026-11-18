from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    ev("createLevel(3.0); S.level=S.model.levels.slice().sort((a,b)=>a.elev-b.elev)[0].id; setLevel(S.level)")
    ev("animateCam({proj:'axo',theta:-Math.PI/2,phi:0.0005,t:[3,2,0],dist:14}); 0"); pg.wait_for_timeout(800)
    setTool=ev("setTool('wall'); 1")
    W="[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall')"
    box=pg.locator('#view canvas').bounding_box()
    def scr(p): 
        s=ev("(()=>{const s=toScreen(%s);return [s.x,s.y];})()"%p); return box['x']+s[0], box['y']+s[1]
    pts=[[0,0,0],[6,0,0],[6,4,0],[0,4,0],[0,0,0]]
    for q in pts:
        x,y=scr(q); pg.mouse.move(x,y); pg.wait_for_timeout(60); pg.mouse.click(x,y); pg.wait_for_timeout(120)
    pg.wait_for_timeout(300)
    n=ev(W+".length"); chk(n==4,'l’eina Mur crea 4 murs amb clics (%d)'%n)
    v=sum(ev(W+".map(g=>solidVolume(g))")) if n else 0
    chk(abs(v-18)<2e-3,'volum de la caixa feta amb el ratolí: %.4f'%v)
    if n<4: print('  ', ev("S.tool"), ev("st.from"))
    chk(not errs,'sense errors %s'%errs[:3])
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
