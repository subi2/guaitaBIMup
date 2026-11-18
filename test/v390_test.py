from playwright.sync_api import sync_playwright
import math
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.39.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900},device_scale_factor=2); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate
    chk(ev("VERSION")=='0.39.0','versió')
    chk(ev("CAM.proj")=='axo','projecció per defecte: axonomètrica')
    pg.click("#navBtn"); pg.wait_for_timeout(200)
    chk(ev("navPanel.classList.contains('show')"),'el panell de vista s\'obre')
    order=ev("[...document.querySelectorAll('#navPanel .nv-o.h')].map(b=>b.dataset.a)")
    chk(order==['axo','conic','cav','mil'],'ordre projeccions %s'%order)
    cells=ev("[...document.querySelectorAll('#navPanel .nv-cross .nv-c')].map(b=>b.dataset.a)")
    chk(cells==['prev','N','home','O','PL','E','fit','S','sec'],'distribució de la rosa dels vents %s'%cells)
    chk(ev("document.querySelector('.nv-o.h[data-a=axo]').classList.contains('on')"),'Axonomètrica marcada activa')
    # fletxes a la part interior
    tri=ev("(()=>{const r=k=>{const c=document.querySelector('.nv-c[data-a='+k+']').getBoundingClientRect(),t=document.querySelector('.nv-c[data-a='+k+'] .tri').getBoundingClientRect();return [Math.round(t.left+t.width/2-(c.left+c.width/2)),Math.round(t.top+t.height/2-(c.top+c.height/2))]};return {N:r('N'),S:r('S'),O:r('O'),E:r('E')}})()")
    chk(tri['N'][1]>0 and tri['S'][1]<0 and tri['O'][0]>0 and tri['E'][0]<0,'fletxes a la part interior %s'%tri)
    # vistes ortogonals
    for k,d in [('N',[0,1,0]),('S',[0,-1,0]),('E',[1,0,0]),('O',[-1,0,0]),('PL',[0,0,1])]:
        pg.click(".nv-c[data-a=%s]"%k); pg.wait_for_timeout(1000)
        dd=ev("curDir()"); chk(sum(a*b for a,b in zip(dd,d))>0.999,'vista %s'%k)
        chk(ev("document.querySelector('.nv-c[data-a=%s]').classList.contains('on')"%k),'%s queda marcada'%k)
    pg.click(".nv-c[data-a=N]"); pg.hover(".nv-c[data-a=S]"); chk(ev("nvHint.textContent")=='Alçat sud, vist des del sud','pista en passar-hi per sobre')
    # axonometries trimètriques
    for k in ['SO','SE','NE','NO']:
        pg.click(".nv-o[data-a=%s]"%k); pg.wait_for_timeout(1000)
        chk(ev("CAM.proj")=='axo' and ev("document.querySelector('.nv-o[data-a=%s]').classList.contains('on')"%k),'punt de vista %s'%k)
    # projeccions
    pg.click(".nv-o[data-a=conic]"); chk(ev("CAM.proj")=='conic','cònica'); pg.click(".nv-o[data-a=mil]"); chk(ev("CAM.proj")=='mil','militar')
    pg.click(".nv-o[data-a=axo]"); chk(ev("CAM.proj")=='axo','axonomètrica')
    # estil i fons
    pg.click(".nv-o[data-a=wire]"); chk(ev("S.style.wire")==True,'filferro actiu'); pg.click(".nv-o[data-a=wire]"); chk(ev("S.style.wire")==False,'filferro desactivat')
    pg.click(".nv-o[data-a=cifc]"); chk(ev("S.style.colorBy")=='ifc','IFC'); pg.click(".nv-o[data-a=cifc]")
    pg.click(".nv-bg[data-a=black]"); chk(ev("S.bg")=='black','fons negre'); pg.click(".nv-bg[data-a=sky]")
    pg.screenshot(path="/tmp/g0.png",clip={"x":700,"y":90,"width":800,"height":700})
    # caixa de secció
    ev("makeBox=null"); 
    pg.click(".nv-c[data-a=sec]"); pg.wait_for_timeout(300)
    chk(ev("!!document.getElementById('fpSec')"),'s\'obre la caixa de secció')
    chk(ev("document.getElementById('fsOn').getAttribute('aria-checked')")=='false','inicialment inactiva')
    pg.click("#fsOn"); chk(ev("S.clipBox.on")==True,'interruptor Activa')
    ev("document.querySelector('#fpSec input[data-k=x1]').value=0.6;document.querySelector('#fpSec input[data-k=x1]').dispatchEvent(new Event('input'))")
    chk(abs(ev("S.clipBox.x1")-0.6)<1e-6,'lliscador X màxima')
    ev("document.querySelector('#fpSec input[data-k=rot]').value=30;document.querySelector('#fpSec input[data-k=rot]').dispatchEvent(new Event('input'))")
    chk(ev("S.clipBox.rot")==30 and ev("fsRv.textContent")=='30°','gir 30°')
    chk(ev("renderer.clippingPlanes.length")>0,'plans de tall aplicats')
    px=ev("(()=>{const c=document.getElementById('fsPlan'),g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>0&&(d[i]>150||d[i+1]>150))n++;return n})()")
    chk(px>50,'la planta en miniatura es dibuixa (%d píxels clars)'%px)
    # nivells
    ev("S.model.levels.length>1||createLevel(3)"); 
    ev("sectionBoxPanel()"); pg.wait_for_timeout(100); ev("sectionBoxPanel()"); pg.wait_for_timeout(300)
    n=ev("document.querySelectorAll('#fsLv option').length"); chk(n>=3,'desplegable de nivells (%d opcions)'%n)
    ev("(()=>{const s=document.getElementById('fsLv');s.value='all';s.dispatchEvent(new Event('change'))})()"); chk(ev("S.clipBox.z0")==0 and ev("S.clipBox.z1")==1,'Tot l\'edifici')
    pg.screenshot(path="/tmp/g1.png",clip={"x":300,"y":90,"width":500,"height":560})
    ev("document.getElementById('fsRs').click()"); chk(ev("S.clipBox.on")==False and ev("S.clipBox.rot")==0,'Restableix')
    ev("document.getElementById('fsX').click()"); chk(ev("!document.getElementById('fpSec')"),'tanca')
    chk(not errs,'sense errors %s'%errs)
    b.close()
print("RESULTAT",res)
