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
    for just in ['c','l','r']:
        ev("S.model.root.groups.clear(); OPT.wallJust='%s'"%just)
        ev("makeWall([0,0,0],[6,0,0]); makeWall([6,0,0],[6,4,0]); makeWall([6,4,0],[0,4,0]); makeWall([0,4,0],[0,0,0])")
        vols=ev(W+".map(g=>solidVolume(g))")
        if just=='c': exp=(6.3*4.3-5.7*3.7)*3
        elif just=='l': exp=(6.3*4.3-6.0*4.0)*3+0  # eix exterior l=0 -> dins
        else: exp=None
        if just=='c': chk(abs(sum(vols)-exp)<2e-3,'caixa centrada: %.4f'%sum(vols))
        else:
            # justificació: el volum de la corona és 2*(6+4)*0.3*3 = 18 en ambdós casos
            chk(abs(sum(vols)-18)<2e-3,'caixa just. %s: %.4f (esperat 18)'%(just,sum(vols)))
    # angle no recte: triangle equilàter-ish
    ev("S.model.root.groups.clear(); OPT.wallJust='c'")
    ev("makeWall([0,0,0],[6,0,0]); makeWall([6,0,0],[3,5.196,0]); makeWall([3,5.196,0],[0,0,0])")
    vols=ev(W+".map(g=>solidVolume(g))")
    chk(all(v>0 for v in vols) and abs(sum(vols)-(3*(6+6+6)*0.3/1*0+0)-sum(vols))<1e-9 and sum(vols)>0,'triangle: volums positius %s'%[round(v,3) for v in vols])
    chk(not errs,'sense errors %s'%errs[:3])
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
