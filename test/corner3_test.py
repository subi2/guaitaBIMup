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
    W="[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall')"
    cases={'c':(18.0),'l':(16.92),'r':(19.08)}
    for cw in [False, True]:
        for just,exp in cases.items():
            ev("S.model.root.groups.clear(); OPT.wallJust='%s'"%just)
            pts=[[0,0,0],[6,0,0],[6,4,0],[0,4,0]]
            if cw: pts=[[0,0,0],[0,4,0],[6,4,0],[6,0,0]]
            js=";".join("makeWall(%s,%s)"%(pts[i],pts[(i+1)%4]) for i in range(4))
            ev(js)
            v=sum(ev(W+".map(g=>solidVolume(g))"))
            # sentit horari: l=exterior -> valor de 'r'
            e = exp if not cw or just=='c' else {'l':19.08,'r':16.92}[just]
            chk(abs(v-e)<2e-3,'caixa %s %s: %.4f (esperat %.2f)'%('CW' if cw else 'CCW',just,v,e))
    chk(not errs,'sense errors %s'%errs[:3])
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
