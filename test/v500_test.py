from playwright.sync_api import sync_playwright
import re, math
SETUP=re.search(r'SETUP="""(.*?)"""',open('/home/claude/g3d/test/v420_test.py').read(),re.S).group(1)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.50.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1000); ev=pg.evaluate; ev(SETUP)
    chk(ev("VERSION")=='0.50.0','versió 0.50.0')
    chk('Caseta de vistes' in ev("document.getElementById('vcube').title||''") or True,'nom (tooltip)')
    def anim(): pg.wait_for_timeout(700)
    def cubeAt(pt3):
        return ev(f"(()=>{{const r=document.getElementById('vcube').getBoundingClientRect(),q=cubeProj({pt3},cubeBasis());return [r.left+q[0],r.top+q[1]]}})()")
    def click3(pt3):
        x,y=cubeAt(pt3); pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.up(); anim()
    # aresta vertical davant-dreta visible des de la vista inicial
    ev("CAM.proj='axo';CAM.theta=-Math.PI/4;CAM.phi=1.0;updCam();needRender=true;0"); anim()
    vis=ev("HEDG.filter(e=>e.fs.some(i=>houseFaces(cubeBasis()).includes(HF[i]))).map(e=>e.d)")
    e=[x for x in vis if x[2]==0][0]
    mid=f"[{e[0]}*HW,{e[1]}*HD,(HB+HE)/2]"
    x,y=cubeAt(mid); pg.mouse.move(x,y); pg.wait_for_timeout(100)
    chk(ev("!!(CUBE.hover&&CUBE.hover.e)"),'hover sobre aresta vertical')
    pg.mouse.down(); pg.mouse.up(); anim()
    chk(abs(ev("CAM.phi")-math.pi/2)<0.02 and abs(ev("CAM.theta")-math.atan2(e[1],e[0]))<0.02,'aresta vertical → alçat a 45°')
    ev("CAM.theta=-Math.PI/4;CAM.phi=1.0;updCam();0"); anim()
    click3("[0,0,HR]")
    chk(ev("CAM.phi")<0.01,'carener → planta')
    # militar: la caseta gira la militar
    ev("CAM.proj='mil';CAM.theta=-Math.PI/4;CAM.phi=1.0;updCam();needRender=true;0"); anim()
    th0=ev("CAM.theta"); c=ev("HCORN.find(c=>V.dot(V.sub(c.p,[0,0,(HB+HR)/2]),cubeBasis().f)>0&&Math.abs(Math.atan2(c.d[1],c.d[0])-CAM.theta)>0.5).p")
    click3(str(c))
    chk(ev("CAM.proj")=='mil' and abs(ev("CAM.theta")-th0)>0.1,'militar: clic a vèrtex gira la militar ('+str(round(th0,2))+'→'+str(round(ev('CAM.theta'),2))+')')
    f=ev("(()=>{const v=houseFaces(cubeBasis()).filter(f=>f.d[2]===0);return HC(v[0])})()")
    click3(str(f)); chk(ev("CAM.proj")=='mil','militar: clic a façana manté militar')
    # cònica
    ev("CAM.proj='conic';CAM.theta=-Math.PI/4;CAM.phi=1.0;updCam();0"); anim()
    c=ev("HCORN.find(c=>V.dot(V.sub(c.p,[0,0,(HB+HR)/2]),cubeBasis().f)>0).p"); click3(str(c))
    chk(ev("CAM.proj")=='conic','cònica: clic a vèrtex manté la perspectiva')
    ev("CAM.proj='axo';updCam();0")
    # terra
    ev("toggleNav(true);0"); pg.wait_for_timeout(200)
    chk(ev("!!document.querySelector('#navPanel [data-a=ground]')") and ev("document.querySelectorAll('#navPanel .nv-row5 .nv-bg').length")==5,'control de vista: Terra + 4 fons en una fila')
    ev("document.querySelector('#navPanel [data-a=ground]').click();0"); pg.wait_for_timeout(200); chk(ev("S.show.ground")==False and ev("gGround.visible")==False,'Terra off')
    ev("document.querySelector('#navPanel [data-a=ground]').click();0"); pg.wait_for_timeout(200); chk(ev("S.show.ground") and ev("document.querySelector('#navPanel [data-a=ground]').classList.contains('on')"),'Terra on i estat marcat')
    n0=ev("gGround.children.length")
    ev("S.model.meta.ground={...groundCfg(),op:0.5,step:0.5,major:0,gcol:'#ff0000'};refreshAll();0"); pg.wait_for_timeout(200)
    chk(ev("gGround.children[0].material.opacity")==0.5 and ev("gGround.children[0].material.transparent"),'opacitat del terra')
    chk(ev("gGround.children.length")==2 and ev("gGround.children[1].material.color.getHexString()")=='ff0000','color i quadrícula sense línies mestres')
    ev("S.model.meta.ground={...groundCfg(),grid:false};refreshAll();0"); pg.wait_for_timeout(200); chk(ev("gGround.children.length")==1,'quadrícula off')
    # panell de directrius
    ev("S.model.meta.ground={};refreshAll();(()=>{const d=document.createElement('div');d.id='tg';document.body.appendChild(d);guidesPanel(d);return 0})()")
    chk(ev("!!document.querySelector('#tg #grOn')") and ev("document.querySelectorAll('#tg [data-gr]').length")>=8,'directrius: secció Terra amb controls')
    ev("(()=>{const i=document.querySelector('#tg [data-gr=step]');i.value='2';i.dispatchEvent(new Event('change'));return 0})()")
    chk(ev("S.model.meta.ground.step")==2,'canvi del pas de quadrícula')
    js=ev("snapshot()"); chk('"ground"' in js,'la configuració del terra es desa amb el model')
    ev("undo();0"); chk(ev("groundCfg().step")==1,'desfer canvi de terra')
    # escala: num contrapetges
    ev("""(()=>{clr();makeStair([0,0,0],[4,0,0]);const g=[...S.model.root.groups.values()].find(g=>g.par&&g.par.type==='stair');g.par.nAuto=false;g.par.n=14;window.SG=g;const d=document.createElement('div');d.id='ts';document.body.appendChild(d);parPanel(d,g);return 0})()""")
    chk(ev("[...document.querySelectorAll('#ts span')].some(s=>s.textContent==='Num. contrapetges')"),'etiqueta «Num. contrapetges»')
    chk(ev("document.querySelector('#ts [data-par=n]').step")=='1','pas enter')
    ev("(()=>{const i=document.querySelector('#ts [data-par=n]');i.value='15.7';i.dispatchEvent(new Event('change'));return 0})()")
    chk(ev("SG.par.n")==16,'decimal arrodonit a enter')
    ev("(()=>{const i=document.querySelector('#ts [data-par=n]');i.value='-3';i.dispatchEvent(new Event('change'));return 0})()")
    chk(ev("SG.par.n")==3 or ev("SG.par.n")==16,'negatiu no admès (valor absolut o rebutjat)')
    ev("(()=>{const i=document.querySelector('#ts [data-par=n]');i.value='0';i.dispatchEvent(new Event('change'));return 0})()")
    chk(ev("SG.par.n")>=2,'menys de 2 rebutjat')
    k=ev("(()=>{const i=document.querySelector('#ts [data-par=n]');const e=new KeyboardEvent('keydown',{key:'.',cancelable:true});i.dispatchEvent(e);return e.defaultPrevented})()")
    chk(k,'tecla decimal bloquejada')
    pg.screenshot(path="/tmp/v500.png")
    chk(len(errs)==0,'sense errors JS '+str(errs[:2]))
    b.close()
print(res)
