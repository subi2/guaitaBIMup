from playwright.sync_api import sync_playwright
import re
SETUP=re.search(r'SETUP="""(.*?)"""',open('/home/claude/g3d/test/v420_test.py').read(),re.S).group(1)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.51.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1000); ev=pg.evaluate; ev(SETUP)
    chk(ev("VERSION")=='0.51.0','versió 0.51.0')
    ev("mk(0,0,0,6,0.3,3,'m1');mk(0,4,0,6,0.3,3,'m2');mk(0,0,0,0.3,4,3,'m3');mk(6,0,0,0.3,4.3,3,'m4');mk(-1,-1,-0.3,9,7,0.3,'sol');refreshAll();fitView();0")
    ev("openView('plan:'+S.model.levels[0].id);refreshAll();0"); pg.wait_for_timeout(2500)
    chk(ev("S.viewClips.length")==2 and ev("S.viewClips[1].floor===true"),'planta: pla inferior marcat')
    chk(abs(ev("S.viewClips[1].constant")-0.001)<1e-9,'pla inferior desplaçat 1 mm sota el nivell (no coplanar amb el terra)')
    chk(ev("gCaps.children.filter(o=>o.userData.st).length")==8,'farcit: només els 4 murs (el forjat sota el nivell no compta)')
    chk(ev("gCaps.children.filter(o=>o.userData.cap).length")==1,'un sol pla de farcit (no el pla inferior)')
    pg.screenshot(path="/tmp/v510.png")
    from PIL import Image
    im=Image.open("/tmp/v510.png").convert('RGB')
    chk(im.getpixel((350,500))==(159,176,180) or im.getpixel((350,500))==(181,181,181),'mur farcit en gris')
    # fons sense ratlles: files de píxels del terra sense variació d'alta freqüència
    col=[sum(im.getpixel((300,y))) for y in range(700,790)]
    jumps=sum(1 for a,b2 in zip(col,col[1:]) if abs(a-b2)>20)
    chk(jumps<=3,'fora del forjat no hi ha ratllat ('+str(jumps)+' salts)')
    # barra de secció BIM
    ev("createBsec([0,0],[6,0]);0"); pg.wait_for_timeout(600)
    chk(ev("parseInt(document.getElementById('bsecBar').style.top)")>=96,'barra de secció BIM 3 files sota')
    r=ev("(()=>{const a=document.getElementById('bsecBar').getBoundingClientRect(),t=[...document.querySelectorAll('#tabs button')].map(x=>x.getBoundingClientRect().bottom);return [a.top,Math.max(...t)]})()")
    chk(r[0]>=r[1],'la barra no se sobreposa a les etiquetes ('+str(r)+')')
    chk(not errs,'sense errors de pàgina '+str(errs))
    print(res); b.close()
