from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup_v0.38.1.e.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=pg.evaluate
    chk(ev("VERSION")=='0.38.1.e','versió 0.38.1.e')
    # --- cap eina duplicada a les barres ---
    names=ev("[...document.querySelectorAll('.tb[data-tool]')].map(b=>b.dataset.tool)")
    chk(len(names)==len(set(names)) and len(names)>=45,'cada eina apareix una sola vegada a les barres (%d)'%len(names))
    chk(ev("[...document.querySelectorAll('#toolbar .tb[data-tool]')].map(b=>b.dataset.tool)")==['orbit','pan','zoom','zoomwin'],'barra superior: només navegació + accions')
    # --- pestanyes ---
    tabs=ev("[...document.querySelectorAll('.tab2:not(.mv)')].map(b=>b.textContent)")
    chk(tabs==['Info','Directrius','Visual','Classificació'],'4 pestanyes en dos panells %s'%tabs)
    T=lambda: ev("[...document.querySelectorAll('#tray .pn>h2 .t')].map(x=>x.textContent)")
    chk(T()==['Informació de l’entitat'],'pestanya Info %s'%T())
    T=lambda: ev("[...document.querySelectorAll('#tray .pn>h2 .t, #tray2 .pn>h2 .t')].map(x=>x.textContent)")
    chk(ev("document.querySelectorAll('#tray .tab2:not(.mv)').length")==2 and ev("document.querySelectorAll('#tray2 .tab2:not(.mv)').length")==2,'dos panells laterals amb 2 pestanyes cadascun')
    chk(T()==['Informació de l’entitat','Navegador de vistes','Seccions BIM','Escenes','Estils de visualització','Materials'],'pestanyes actives inicials %s'%T())
    T1=lambda: ev("[...document.querySelectorAll('#tray .pn>h2 .t')].map(x=>x.textContent)")
    T2=lambda: ev("[...document.querySelectorAll('#tray2 .pn>h2 .t')].map(x=>x.textContent)")
    pg.click("[data-tab=dir]"); chk(T1()==['Nivells','Eixos, plans i anotacions'],'pestanya Directrius (panell 1) %s'%T1())
    chk(T2()==['Navegador de vistes','Seccions BIM','Escenes','Estils de visualització','Materials'],'pestanya Visual (panell 2) %s'%T2())
    pg.click("[data-tab=cls]"); chk(T2()==['Esquema','Classificador IFC','Components','Etiquetes','Imatges de calc'],'pestanya Classificació (panell 2) %s'%T2())
    # llista plegable
    pg.click("#tray2 .pn>h2"); chk(ev("TRAY.closed.has('outl')")==False,'panell plegable (obre Esquema)')
    # --- panell flotant ---
    ev("setPanelFloat('ifc',true)")
    chk(ev("!!document.querySelector('#floatLayer .fpanel[data-key=ifc]')") and 'Classificador IFC' not in T(),'panell desacoblat flota i surt de la safata')
    pg.click("#floatLayer .fpanel[data-key=ifc] .fp-t .pfb"); chk(ev("!document.querySelector('#floatLayer .fpanel')") and 'Classificador IFC' in T(),'panell reacoblat')
    ev("setPanelFloat('lvl',true)"); pg.wait_for_timeout(100)
    r=ev("(()=>{const f=document.querySelector('.fpanel .fp-t').getBoundingClientRect(); return [f.left+60,f.top+10]})()")
    pg.mouse.move(r[0],r[1]); pg.mouse.down(); pg.mouse.move(r[0]+120,r[1]+80,steps=5); pg.mouse.up(); pg.wait_for_timeout(300)
    chk(ev("LAY.panels.lvl.x")>100,'panell flotant arrossegable x=%s'%ev("LAY.panels.lvl.x"))
    ev("setPanelFloat('lvl',false)")
    # --- barres: arrossegar a dalt, a la dreta i flotant ---
    def drag(bar,tx,ty):
        g=ev("(()=>{const r=document.querySelector('.bar[data-bar=%s] .dg').getBoundingClientRect(); return [r.left+3,r.top+3]})()"%bar)
        pg.mouse.move(g[0],g[1]); pg.mouse.down(); pg.mouse.move(tx,ty,steps=8); pg.mouse.up(); pg.wait_for_timeout(300)
    drag('dib',600,50); chk(ev("LAY.bars.dib.dock")=='top' and ev("!!document.querySelector('#toolbar .bar[data-bar=dib]')"),'barra Dibuix acoblada a dalt')
    drag('mes',1180,400); chk(ev("LAY.bars.mes.dock")=='right' and ev("!!document.querySelector('#railR .bar[data-bar=mes]')"),'barra Mesura acoblada a la dreta')
    drag('lin',650,450); chk(ev("LAY.bars.lin.dock")=='float' and ev("!!document.querySelector('#floatLayer .bar[data-bar=lin]')"),'barra Línies flotant')
    names=ev("[...document.querySelectorAll('.tb[data-tool]')].map(b=>b.dataset.tool)")
    chk(len(names)==len(set(names)) and len(names)>=45,'després de moure: sense duplicats ni pèrdues (%d)'%len(names))
    pg.wait_for_timeout(300); chk('"dib":{"dock":"top"' in ev("localStorage.getItem('guaitabimup.layout')"),'disposició desada')
    # eina funciona des d'una barra flotant
    pg.click("#floatLayer .tb[data-tool=trim]"); chk(ev("S.tool")=='trim','eina activable des de barra flotant')
    # --- menús ---
    m=ev("menuDefs().map(x=>x[0])")
    chk(m==['Fitxer','Edita','Visualitza','Dibuixa','Modifica','Mesura','BIM','Finestra','Ajuda'],'menús %s'%m)
    cnt=ev("(()=>{const o={}; (function w(a){a.forEach(i=>{if(i.sub)w(i.sub); else if(i.l&&!i.sep){o[i.l]=(o[i.l]||0)+1;}});})(menuDefs().filter(x=>!['Finestra'].includes(x[0])).flatMap(x=>x[1])); return Object.entries(o).filter(([k,v])=>v>1)})()")
    chk(all(k in ('Esborra','Escala','Raigs X','Complet','Compacte') for k,v in cnt),'cap eina duplicada als menús (només homònims de contextos diferents) %s'%cnt)
    # --- restableix ---
    ev("layReset()"); chk(ev("LAY.bars.dib.dock")=='left' and ev("LAY.act[1]")=='info','restableix la disposició')
    # segon panell: ocultar, moure pestanya
    ev("toggleTray2()"); chk(ev("document.querySelectorAll('#tray .tab2:not(.mv)').length")==4 and ev("getComputedStyle($('tray2')).display")=='none','sense segon panell: les 4 pestanyes al primer')
    ev("toggleTray2()"); ev("moveTab('dir')"); chk(ev("trayTabs(2).map(t=>t[0])")==['dir','vis','cls'],'moure pestanya Directrius al panell 2')
    ev("layReset()")
    # sense scroll als dos panells per defecte (pestanyes inicials)
    chk(ev("$('tray').scrollHeight<=$('tray').clientHeight+1 && $('tray2').scrollHeight<=$('tray2').clientHeight+1"),'cap scroll als panells laterals per defecte')
    # eixos a la cantonada davantera esquerra de la caseta
    chk(ev("HO.join()")=='-0.75,-1,-0.65','origen dels eixos: cantonada davantera esquerra (base)')
    chk(len(errs)==0,'sense errors de pàgina %s'%errs)
    b.close()
print("RESULTAT", res)
