from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
res = {"ok": 0, "fail": 0}
def chk(c, msg):
    res["ok" if c else "fail"] += 1; print(("OK  " if c else "FAIL") + " " + msg)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":1400,"height":860})
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800)
    ev = lambda s: pg.evaluate(s)
    chk(ev("OPT.wallT")==0.30, "gruix per defecte 0.30 m")
    chk(ev("VERSION")=="24", "versió 24")
    ev("S.model.levels.length")
    if len(ev("S.model.levels"))<2: ev("createLevel(3.0)")
    lv = ev("S.model.levels.slice().sort((a,b)=>a.elev-b.elev).map(l=>l.elev)")
    chk(len(lv)>=2, "hi ha almenys dos nivells %s" % lv)
    # dos murs en L des del nivell 0
    ev("S.level = S.model.levels.slice().sort((a,b)=>a.elev-b.elev)[0].id; setLevel(S.level)")
    ev("makeWall([0,0,0],[4,0,0]); makeWall([4,0,0],[4,3,0])")
    n = ev("[...S.model.root.groups.values()].filter(g=>g.par).length")
    chk(n==2, "dos murs creats (%d)" % n)
    chk(ev("[...S.model.root.groups.values()].filter(g=>g.par).every(g=>g.ifc=='IfcWall')"), "classe IfcWall")
    z = ev("(()=>{const g=[...S.model.root.groups.values()].filter(g=>g.par)[0];let mn=1e9,mx=-1e9;for(const f of g.faces.values())for(const v of f.loop){const p=g.verts.get(v).p;mn=Math.min(mn,p[2]);mx=Math.max(mx,p[2]);}return [mn,mx];})()")
    top = lv[1] if lv[1] > lv[0] else None
    chk(abs(z[0]-lv[0])<1e-6 and abs(z[1]-(lv[1] if lv[1]>lv[0] else lv[0]+3))<1e-6, "mur des del nivell base fins al superior %s" % z)
    # unió: el mur 1 queda estès fins a l'exterior de l'angle
    xs = ev("(()=>{const g=[...S.model.root.groups.values()].filter(g=>g.par)[0];let mx=-1e9;for(const f of g.faces.values())for(const v of f.loop)mx=Math.max(mx,g.verts.get(v).p[0]);return mx;})()")
    chk(xs > 4.1 and xs < 4.2, "unió en angle: extensió de t/2 a l'extrem (x max %.3f)" % xs)
    # canvi d'elevació del nivell superior -> el mur es regenera
    ev("editLevel(S.model.levels.slice().sort((a,b)=>a.elev-b.elev)[1], null, %f)" % (lv[1]+1.0))
    z2 = ev("(()=>{const g=[...S.model.root.groups.values()].filter(g=>g.par)[0];let mx=-1e9;for(const f of g.faces.values())for(const v of f.loop)mx=Math.max(mx,g.verts.get(v).p[2]);return mx;})()")
    chk(abs(z2-(lv[1]+1.0))<1e-6, "regeneració en canviar el nivell superior (%.3f)" % z2)
    # desar i carregar
    rt = ev("(()=>{const j=K.toJSON(S.model);const m=K.fromJSON(JSON.parse(JSON.stringify(j)));return [...m.root.groups.values()].filter(g=>g.par).length;})()")
    chk(rt==2, "els paràmetres es desen al JSON (%s)" % rt)
    chk(not errs, "sense errors de JS %s" % errs)
    print("RESULTAT %d ok %d fail" % (res["ok"], res["fail"]))
    b.close()
