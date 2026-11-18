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
    # caixa tancada 6x4 amb murs de 0.30 fets com a l'eina (sentit horari)
    ev("makeWall([0,0,0],[6,0,0]); makeWall([6,0,0],[6,4,0]); makeWall([6,4,0],[0,4,0]); makeWall([0,4,0],[0,0,0])")
    W="[...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall')"
    vols=ev(W+".map(g=>solidVolume(g))")
    exp=(6.3*4.3-5.7*3.7)*3
    chk(abs(sum(vols)-exp)<2e-3,'caixa tancada de 4 murs sense solapaments ni buits: suma %.4f, esperat %.4f'%(sum(vols),exp))
    # mateixa caixa en un sol gest de tots els murs que comparteixen cantonades: el mur 0 no pot acabar a x=6 sense la cantonada
    mx=ev("Math.max(...("+W+"[0].faces.size?[...("+W+"[0].verts.values())].map(v=>v.p[0]):[0]))")
    chk(abs(mx-6.15)<1e-6,'extrem del mur 0 arriba a x=6.15 (%.4f)'%mx)
    # compacte: mostra dues arestes a la cantonada posterior i canvia en girar
    ev("setVisMode('lvl','compact')")
    k1=ev("backCorner()")
    ev("animateCam({theta: Math.PI/2+0.3}); 0"); pg.wait_for_timeout(600)
    k2=ev("backCorner()")
    chk(k1!=k2,'cantonada posterior canvia en girar la vista (%s → %s)'%(k1,k2))
    chk(ev("(()=>{const n=gAnnot.children.filter(o=>o.isLine).length;return n;})()")>=2,'compacte: dues arestes de nivell')
    chk(not errs,'sense errors %s'%errs[:3])
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
