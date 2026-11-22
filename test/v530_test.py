from playwright.sync_api import sync_playwright
import re
SETUP=re.search(r'SETUP="""(.*?)"""',open('/home/claude/g3d/test/v420_test.py').read(),re.S).group(1)
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); ev=pg.evaluate
    pg.goto("file:///home/claude/g3d/out/guaitaBIMup_v0.53.0.html?nou"); pg.wait_for_timeout(1000); ev(SETUP)
    W=lambda t=300: pg.wait_for_timeout(t)
    chk(ev("VERSION")=='0.53.0','versió 0.53.0')
    ev("mk(0,0,0,6,0.3,3,'m1');mk(0,4,0,6,0.3,3,'m2');mk(0,0,0,0.3,4,3,'m3');mk(6,0,0,0.3,4.3,3,'m4');refreshAll();0")
    ev("camPlace({eye:[-6,-8,1.6],tgt:[3,2,1.6],lens:{...LENS_DEF,f:24}});camWin();0"); W(900)
    chk(ev("!!document.querySelector('#camPan [data-cp=keep]')"),'interruptor Mantén la mida a la finestra')
    # sense keep: la distància no canvia
    d0=ev("V.dist(S.model.meta.ccam.eye,S.model.meta.ccam.tgt)"); ev("camLensSet({f:48});0")
    chk(abs(ev("V.dist(S.model.meta.ccam.eye,S.model.meta.ccam.tgt)")-d0)<1e-9,'sense keep: la distància es manté')
    ev("camLensSet({f:24});0")
    # amb keep
    ev("(()=>{const i=document.querySelector('#camPan [data-cp=keep]');i.checked=true;i.dispatchEvent(new Event('change'))})()"); W()
    chk(ev("S.model.meta.ccam.lens.keep")==True,'keep activat i desat')
    def size(): return ev("(()=>{const a=toScreen([3,2,0]),c=toScreen([3,2,3]);return Math.abs(a.y-c.y)})()")
    s0=size(); ev("camLensSet({f:48});0"); W(200); s1=size()
    chk(abs(s1-s0)/s0<0.01,'mida a pantalla del punt de mira constant en doblar la focal (%.1f→%.1f)'%(s0,s1))
    chk(abs(ev("V.dist(S.model.meta.ccam.eye,S.model.meta.ccam.tgt)")-2*d0)<1e-6,'la càmera s’allunya proporcionalment')
    ev("(()=>{const e=S.model.meta.ccam;return 0})()")
    # fugues: la profunditat varia
    ex=lambda: ev("(()=>{const a=toScreen([0,0,0]),b=toScreen([6,0,0]);return Math.abs(b.x-a.x)})()")
    r1=ex(); ev("camLensSet({f:100});0"); W(200); r2=ex(); ev("camLensSet({f:12});0"); W(200); r3=ex()
    chk(abs(ev("V.dist(S.model.meta.ccam.eye,S.model.meta.ccam.tgt)")-d0*12/24)<1e-6,'focal 12 mm: càmera a mitja distància')
    chk(abs(size()-s0)/s0<0.01,'mida constant a 12 mm')
    chk(abs(r1-r3)>2 or abs(r1-r2)>2,'les fugues canvien (amplada d’un mur %.0f/%.0f/%.0f)'%(r1,r2,r3))
    for k,v in (('ah',40),('av',30)):
        ev(f"(()=>{{const i=document.querySelector('#camPan [data-cp={k}]');i.value='{v}';i.dispatchEvent(new Event('change'))}})()"); W(150)
        chk(abs(size()-s0)/s0<0.01,'mida constant en canviar l’angle '+k)
    ev("document.querySelector('#camPan .cp-chip[data-f=\"85\"]').click();0"); W(200); chk(abs(size()-s0)/s0<0.01,'mida constant amb xip 85 mm')
    # nansa d'obertura
    ev("setProj('mil');animateCam({t:[-2,-3,0],dist:70},0);0"); W(700)
    pf=ev("(()=>{const q=toScreen(CAMV.geo.side),r=document.getElementById('viewWrap').getBoundingClientRect();return [r.left+q.x,r.top+q.y]})()")
    d1=ev("V.dist(S.model.meta.ccam.eye,S.model.meta.ccam.tgt)"); f1=ev("S.model.meta.ccam.lens.f")
    pg.mouse.move(pf[0],pf[1]); pg.mouse.down(); pg.mouse.move(pf[0]+30,pf[1],steps=4); pg.mouse.up(); W(200)
    f2=ev("S.model.meta.ccam.lens.f"); d2=ev("V.dist(S.model.meta.ccam.eye,S.model.meta.ccam.tgt)")
    chk(abs(f2-f1)>0.5 and abs(d2/d1-f2/f1)<0.02,'nansa d’obertura també compensa (f %.0f→%.0f, d×%.2f)'%(f1,f2,d2/d1))
    # desactivar
    ev("camLensSet({keep:false});camLensSet({f:30});0"); d3=ev("V.dist(S.model.meta.ccam.eye,S.model.meta.ccam.tgt)"); ev("camLensSet({f:60});0")
    chk(abs(ev("V.dist(S.model.meta.ccam.eye,S.model.meta.ccam.tgt)")-d3)<1e-9,'desactivat: torna al comportament normal')
    chk(not errs,'sense errors '+str(errs[:3])); print(res); b.close()
