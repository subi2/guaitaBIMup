from playwright.sync_api import sync_playwright
import re, math
SETUP=re.search(r'SETUP="""(.*?)"""',open('/home/claude/g3d/test/v420_test.py').read(),re.S).group(1)
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.59.0.html"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1600,"height":950}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); ev=pg.evaluate; W=lambda t=300: pg.wait_for_timeout(t)
    pg.goto(URL+"?nou"); W(1000); ev(SETUP)
    chk(ev("VERSION")=='0.59.0','versió 0.59.0')
    ev("clr();mk(0,0,0,4,3,3,'Caixa');rebuild();0"); W()
    LV="S.model.levels[0].id"
    ev("openView('plan:'+%s);0"%LV); W(900)
    chk(ev("S.view.startsWith('plan:')")and ev("S.viewClips.length")>0,'obre la planta amb retall base')
    chk(ev("planCutOn()") and len(ev("renderer.clippingPlanes"))>=2,'planta zenital: retall actiu')
    chk(ev("!!document.querySelector('#tabs button.on i.pc')"),'la pestanya de planta té l’icona de retall')
    # girar la càmera: automàtic desactiva el retall
    ev("CAM.phi=1.0;updCam();needRender=true;0"); W(300)
    chk(not ev("planCutOn()") and ev("renderer.clippingPlanes.filter(p=>!p.floor).length")==ev("secPlanes().length+boxPlanes().length"),'en girar fora de la vista zenital el model es veu complet (automàtic)')
    chk(ev("document.querySelector('#tabs button.on i.pc').classList.contains('off')"),'la icona es marca com a desactivada')
    # caseta de vistes: planta -> retall actiu de nou
    ev("NV_ACT.PL();0"); W(900)
    chk(ev("planCutOn()") and ev("S.view.startsWith('plan:')"),'tornar a planta reactiva el retall')
    # forçat manual: desactivar en zenital
    ev("togglePlanCut();0"); W(200)
    chk(ev("S.pcut")==False and not ev("planCutOn()"),'interruptor: desactiva el retall en planta')
    ev("CAM.phi=0.0005;updCam();needRender=true;0"); W(250)
    chk(not ev("planCutOn()"),'forçat: segueix desactivat en vista zenital')
    # forçar actiu en 3D
    ev("togglePlanCut();0"); ev("CAM.phi=1.0;updCam();needRender=true;0"); W(250)
    chk(ev("S.pcut")==True and ev("planCutOn()"),'forçat actiu: el retall es manté en girar')
    # tornar a automàtic
    ev("togglePlanCut(true);0"); W(250)
    chk(ev("S.pcut")==None and not ev("planCutOn()"),'automàtic: en 3D no talla')
    # clic real a la icona
    ev("openView('plan:'+%s);0"%LV); W(900)
    pg.click('#tabs button.on i.pc'); W(250)
    chk(ev("S.pcut")==False,'clic a la icona desactiva el retall')
    pg.click('#tabs button.on i.pc',modifiers=['Shift']); W(250)
    chk(ev("S.pcut")==None and ev("planCutOn()"),'Maj+clic torna a automàtic')
    # canviar de vista reinicia l'estat manual
    ev("togglePlanCut();0"); ev("openView('elev:N');0"); W(500)
    chk(ev("S.pcut")==None and ev("S.view")=='elev:N' and len(ev("renderer.clippingPlanes"))==ev("secPlanes().length+boxPlanes().length"),'una altra vista reinicia l’estat i no hi ha retall de planta')
    # planta -> escena guardada: les escenes no depenen de l'automàtic
    ev("openView('plan:'+%s);0"%LV); W(900); ev("saveScene();0"); W(300)
    ev("CAM.phi=1.0;updCam();needRender=true;0"); W(200)
    chk(ev("S.view.startsWith('scene:')") and ev("viewClipsEff().length")==ev("S.viewClips.length"),'una escena amb vista base de planta conserva el retall (no s’aplica l’automàtic)')
    # menú de vista: botó de càmera cònica
    ev("S.navOpen=true;syncNav();0"); W(200)
    chk(ev("!!document.querySelector('#navPanel [data-a=camwin]')"),'botó «Càmera cònica…» al panell de projecció')
    ev("setProj('axo');0"); pg.click('#navPanel [data-a=camwin]'); W(500)
    chk(ev("CAM.proj")=='conic' and ev("!!document.querySelector('#cpOrb')"),'el botó passa a cònica i obre el control de càmera')
    box=pg.eval_on_selector('#navPanel [data-a=camwin]',"e=>{const r=e.getBoundingClientRect();const p=document.querySelector('#navPanel').getBoundingClientRect();return [r.left>=p.left-1,r.right<=p.right+1]}")
    chk(all(box),'el botó cap dins del panell')
    # sense errors
    chk(not errs,'sense errors JS %s'%errs)
    pg.screenshot(path='/tmp/v590.png')
print(res)
