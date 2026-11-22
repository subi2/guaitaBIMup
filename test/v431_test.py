from playwright.sync_api import sync_playwright
import re
src=open('/home/claude/g3d/test/v420_test.py').read()
SETUP=re.search(r'SETUP="""(.*?)"""',src,re.S).group(1)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.43.1.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate
    chk(ev("VERSION")=='0.43.1','versió 0.43.1')
    ev(SETUP); ev("clr();mk(0,0,0,4,2,3,'A');S.model.views=[];rebuild();0")
    chk(not ev("TRAY.closed.has('scenes')"),'panell Escenes obert per defecte')
    ev("openView('plan:'+S.model.levels[0].id);0")
    chk(ev("S.viewClips.length")==2,'planta amb 2 plans de tall')
    ev("(()=>{S.model.tags[0]&&(S.model.tags[0].visible=false);S.hiddenIfc.add('IfcWall');saveScene();return 0})()")
    sc=ev("S.model.views[0]")
    chk(sc['vk'].startswith('plan:') and 'IfcWall' in sc['hidIfc'] and sc['hidTags'] is not None,'escena desa vista de tall, IFC i etiquetes: %s'%{k:sc[k] for k in ('vk','hidIfc','hidTags')})
    chk(ev("S.view").startswith('scene:'),'vista activa = escena')
    ev("(()=>{openView('elev:S');S.hiddenIfc.clear();S.model.tags.forEach(t=>t.visible=true);return 0})()")
    chk(ev("S.viewClips.length")==0,'alçat sense plans de tall')
    ev("openView('scene:'+S.model.views[0].id);0")
    chk(ev("S.viewClips.length")==2,'obrir escena restaura el tall de planta')
    chk(ev("S.hiddenIfc.has('IfcWall')"),'obrir escena restaura classes IFC ocultes')
    chk(ev("S.view").startswith('scene:'),'la vista queda com a escena')
    # panell
    chk(ev("document.querySelectorAll('[data-scene]').length")==1,'fila d’escena al panell')
    ev("(()=>{const i=document.querySelector('[data-scene] input');i.value='Planta N0 acabat';i.dispatchEvent(new Event('change'));return 0})()")
    chk(ev("S.model.views[0].name")=='Planta N0 acabat','reanomenar')
    ev("(()=>{openView('elev:S');return 0})()")
    ev("document.querySelector('[data-scupd]').click();0")
    chk(ev("S.model.views[0].vk")=='elev:S','Actualitza substitueix per la vista actual')
    ev("saveScene();0"); ev("document.querySelectorAll('[data-scene] button')[3].click();0")
    chk(len(ev("S.model.views"))==2,'segona escena')
    # serialització
    j=ev("JSON.parse(JSON.stringify(K.toJSON(S.model))).views[0]")
    chk('vk' in j and 'hidIfc' in j,'es serialitza')
    chk(not errs,'sense errors %s'%errs)
    print(res)
