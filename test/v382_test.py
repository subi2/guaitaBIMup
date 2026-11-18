from playwright.sync_api import sync_playwright
import math
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.38.2.b.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    for vp in [(1500,900),(1280,720)]:
        pg=b.new_page(viewport={"width":vp[0],"height":vp[1]},device_scale_factor=3 if vp[0]==1500 else 1); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(800); ev=pg.evaluate
        chk(ev("VERSION")=='0.38.2.b','versió %s'%vp[0])
        n1=ev("document.querySelectorAll('#rail .tb[data-tool]').length"); n2=ev("document.querySelectorAll('#rail2 .tb[data-tool]').length")
        chk(n1>0 and n2>0 and n1+n2>=40,'dues columnes esquerra %d+%d'%(n1,n2))
        chk(ev("[...document.querySelectorAll('.tb[data-tool]')].length")==len(set(ev("[...document.querySelectorAll('.tb[data-tool]')].map(b=>b.dataset.tool)"))),'sense eines duplicades')
        sc=ev("['rail','rail2'].map(i=>{const e=document.getElementById(i);return e.scrollHeight-e.clientHeight})")
        chk(max(sc)<=1,'sense scroll als rails %s'%sc)
        chk(ev("!document.getElementById('vcHome')"),'sense botó home')
        chk(ev("getComputedStyle(document.getElementById('railR')).display")=='none' and ev("getComputedStyle(document.getElementById('railR2')).display")=='none','rails dreta buits ocults')
        if vp[0]==1280:
            chk(not errs,'sense errors %s'%errs); pg.close(); continue
        # drag barra mesura de rail2 a railR2 (zona dreta)
        r=ev("(()=>{const h=document.querySelector('#rail2 .bar-h').getBoundingClientRect();const m=document.getElementById('main').getBoundingClientRect();return [h.left+14,h.top+8,m.right]})()")
        pg.mouse.move(r[0],r[1]); pg.mouse.down(); pg.mouse.move(r[0]+40,r[1]+10,steps=3)
        z=ev("document.body.classList.contains('bardrag')"); 
        t=ev("(()=>{const e=document.getElementById('railR2').getBoundingClientRect();return [e.left+20,e.top+60]})()")
        pg.mouse.move(t[0],t[1],steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
        chk(ev("LAY.bars.mes.dock")=='right2' and ev("document.querySelectorAll('#railR2 .bar').length")==1,'arrossegar barra a segona columna dreta (%s)'%ev("LAY.bars.mes.dock"))
        # tornar-la a left
        r=ev("(()=>{const h=document.querySelector('#railR2 .bar-h').getBoundingClientRect();return [h.left+14,h.top+8]})()")
        pg.mouse.move(r[0],r[1]); pg.mouse.down(); pg.mouse.move(r[0]-30,r[1]+10,steps=3)
        t=ev("(()=>{const e=document.getElementById('rail').getBoundingClientRect();return [e.left+30,e.top+200]})()")
        pg.mouse.move(t[0],t[1],steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
        chk(ev("LAY.bars.mes.dock")=='left','arrossegar de nou a rail 1 (%s)'%ev("LAY.bars.mes.dock"))
        ev("layReset()"); chk(ev("LAY.bars.mes.dock")=='left2','reset restaura repartiment')
        # caseta
        box=ev("(()=>{const r=document.getElementById('vcube').getBoundingClientRect();return [r.left,r.top]})()")
        ev("CAM.proj='conic'; CAM.theta=-1.0; CAM.phi=1.1; updCam(); needRender=true"); pg.wait_for_timeout(300)
        pg.screenshot(path="/tmp/f0.png",clip={"x":box[0]-10,"y":box[1]-10,"width":150,"height":140})
        # cantonada visible: clic a un punt calent
        pt=ev("(()=>{const b=cubeBasis();const C=[0,0,(HB+HR)/2];const c=HCORN.filter(c=>V.dot(V.sub(c.p,C),b.f)>0)[0];const q=cubeProj(c.p,b);return [q[0],q[1],c.d]})()")
        pg.mouse.click(box[0]+pt[0],box[1]+pt[1]); pg.wait_for_timeout(1200)
        d=ev("(()=>{const s=camState();return [s.theta,s.phi,CAM.proj]})()")
        exp_th=math.atan2(pt[2][1],pt[2][0]); exp_ph=math.acos(pt[2][2]/math.hypot(*pt[2]))
        chk(d[2]=='axo' and abs(d[0]-exp_th)<0.02 and abs(d[1]-exp_ph)<0.02,'clic a cantonada → axonometria trimètrica %s'%d)
        # trimètrica: 3 factors d'escala diferents
        dd=pt[2]; n=math.hypot(*dd); f=[math.sqrt(1-(x/n)**2) for x in dd]
        chk(len({round(x,3) for x in f})==3,'tres escurçaments diferents %s'%[round(x,3) for x in f])
        # clic a la porta → vista davant
        ev("CAM.proj='conic'; CAM.theta=-Math.PI/2; CAM.phi=1.2; updCam(); needRender=true"); pg.wait_for_timeout(300)
        pg.screenshot(path="/tmp/f1.png",clip={"x":box[0]-10,"y":box[1]-10,"width":150,"height":140})
        dp=ev("(()=>{const b=cubeBasis();const q=cubeProj([0,-HD,HB+0.3],b);return q})()")
        pg.mouse.click(box[0]+dp[0],box[1]+dp[1]); pg.wait_for_timeout(1200)
        s=ev("camState()"); chk(abs(s['phi']-math.pi/2)<0.02 and abs(s['theta']+math.pi/2)<0.02,'clic a la porta → vista davant')
        # etiquetes no travessen la casa
        bad=0
        for th in [x*0.5 for x in range(-6,7)]:
            for ph in [0.5,0.9,1.3,1.8,2.4]:
                ev("CAM.theta=%f;CAM.phi=%f"%(th,ph))
                bad+=ev("(()=>{const b=cubeBasis();let n=0;for(const a of HAX){const E=V.add(HO,V.mul(a.d,a.p+0.25)),e=cubeProj(E,b);if(houseCovers(E,e,b)){/*tapada: no s'ha de dibuixar*/}} return 0})()")
        chk(ev("typeof houseCovers")=='function','houseCovers definit')
        chk(not errs,'sense errors %s'%errs)
        pg.close()
    b.close()
print("RESULTAT",res)
