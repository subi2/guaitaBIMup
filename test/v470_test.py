from playwright.sync_api import sync_playwright
import re
src=open('/home/claude/g3d/test/v420_test.py').read()
SETUP=re.search(r'SETUP="""(.*?)"""',src,re.S).group(1)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.47.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1600,"height":950}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+e.stack[:300]))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate; ev(SETUP)
    chk(ev("VERSION")=='0.47.0','versió 0.47.0')
    ev("clr();mk(0,0,0,4,2,3,'A');S.model.views=[];rebuild();0")
    ev("window.__d=[];deliver=async(n,d,m)=>{window.__d.push([n,typeof d==='string'?d:'']);return true};0")
    # migració de dades v0.46
    ev("""(()=>{const P=pubData();P.pubs=[{id:pubNext(),name:'Vella',src:'plan:'+S.model.levels[0].id,rep:'Esbós',snap:null,scale:50,filter:{hidTags:[],hidIfc:['IfcSlab']},lim:{cut:1.5,rear:null,box:null}}];P.sheets=[{id:pubNext(),name:'S1',fmt:'A3',items:[P.pubs[0].id]}];P.exps=[{id:pubNext(),name:'X',src:'sheet:'+P.sheets[0].id,fmt:'pdf',filter:{hidTags:[],hidIfc:[]}}];return 0})()""")
    ev("GG();pubCompile();0")
    chk(ev("pubData().pubs.length")==1 and ev("pubData().pubs[0].rep")=='Esbós' and ev("pubData().pubs[0].scale")==50 and ev("pubData().pubs[0].lim.cut")==1.5 and ev("pubData().pubs[0].filter.hidIfc[0]")=='IfcSlab','migració v0.46 → graf conserva estil, escala, límits i filtre')
    chk(ev("pubData().sheets[0].items.length")==1 and ev("pubData().exps[0].src.startsWith('sheet:')"),'migració de plànol i exportació')
    # nou graf
    ev("delete pubData().g;pubData().pubs=[];pubData().sheets=[];pubData().exps=[];0")
    ev("window.QPA=pubCreate('plan:'+S.model.levels[0].id);window.QPB=pubCreate('elev:S');0")
    chk(ev("GG().nodes.filter(n=>n.t==='pub').length")==2,'pubCreate crea cadena al graf')
    chk(ev("pubData().pubs.length")==2,'compilació a vistes publicables')
    # modificador compartit
    ev("""(()=>{const g=GG();const lnA=gIn(gIn(QPA.id,'v')[0].id,'v')[0];window.QST=gAdd('style',0,0,{base:'Tècnic amb seccions',sec:'hatch'});
      const sa=gIn(QPA.id,'v')[0], sb=gIn(QPB.id,'v')[0]; gLink(sa.id,QST.id,'v'); gLink(QST.id,QPA.id,'v'); gLink(QST.id,QPB.id,'v'); pubCompile();return 0})()""")
    chk(ev("gResolve(QPB.id).vis.base")=='Tècnic amb seccions' and ev("gResolve(QPB.id).src")=='plan:'+str(ev("S.model.levels[0].id")),'un modificador compartit alimenta dues vistes (QPB passa a la cadena d’A)')
    chk(ev("gResolve(QPA.id).org.sec.id===QST.id"),'pila resolta: origen de cada valor')
    chk(ev("pubStyle(pubData().pubs.find(p=>p.id===QPA.id)).sec.fill")=='hatch','estil aplicat a l’estil de sortida')
    # tipus i cicles
    chk(ev("gLink(QPA.id, QST.id, 'v')")==False,'pub → modificador rebutjat (tipus)')
    chk(ev("gLink(QST.id, gIn(QST.id,'v')[0].id, 'v')")==False,'cicle rebutjat')
    # plànol + caràtula + export
    ev("""(()=>{window.QSH=gAdd('sheet',0,0,{name:'A-01',fmt:'A3'});gLink(QPA.id,QSH.id,'p');gLink(QPB.id,QSH.id,'p');window.QX=gAdd('exp2d',0,0,{name:'pla',fmt:'pdf'});gLink(QSH.id,QX.id,'s');pubCompile();return 0})()""")
    chk(ev("pubData().sheets[0].items.length")==2,'entrada multivista del plànol')
    chk(ev("!!gIssue(QX)") and 'caràtula' in ev("gIssue(QX)"),'PDF de plànol sense caràtula = error')
    ev("window.QT=gAdd('title',0,0,{title:'Planta i alçat',num:'A-01'});gLink(QT.id,QSH.id,'t');pubCompile();0")
    chk(ev("gIssue(QX)") is None,'amb caràtula: correcte')
    ev("gExport(QX)"); pg.wait_for_timeout(1500)
    chk(any(n.endswith('.pdf') for n,_ in ev("window.__d")),'exporta PDF del plànol')
    ev("window.__d=[];QX.p.fmt='svg';pubCompile();gExport(QX)"); pg.wait_for_timeout(1500)
    svg=ev("window.__d[0]?window.__d[0][1]:''")
    chk('Planta i alçat' in svg and 'A-01' in svg,'caràtula dibuixada a la làmina')
    # IFC i 3D des d'una vista filtrada
    ev("""(()=>{window.QF=gAdd('filter',0,0,{hidTags:[],hidIfc:['IfcWall']});const b=GG().nodes.find(n=>n.t==='base');gLink(b.id,QF.id,'v');window.QXI=gAdd('expm',0,0,{name:'ifc',fmt:'ifc'});gLink(QF.id,QXI.id,'s');window.QX3=gAdd('exp3d',0,0,{name:'web',fmt:'html3d'});gLink(GG().nodes.find(n=>n.t==='model').id,QX3.id,'s');pubCompile();return 0})()""")
    chk(ev("pubData().exps.find(e=>e.id===QXI.id).filter.hidIfc[0]")=='IfcWall','exportació de model hereta el filtre de la vista')
    ev("window.__d=[];gExport(QX3)"); pg.wait_for_timeout(1200)
    chk(ev("window.__d.length&&window.__d[0][0].endsWith('.html')&&window.__d[0][1].includes('model-viewer')"),'3D interactiu HTML')
    chk(ev("gIssue(gAdd('exp2d',0,0))")=='Sense origen.','exportació sense origen avisa')
    # UI
    ev("pubOpen(QPA.id);0"); pg.wait_for_timeout(500)
    chk(ev("document.querySelectorAll('.gc-n').length")==ev("GG().nodes.length"),'tots els nodes al llenç')
    chk(ev("!!document.querySelector('[data-node=\"'+QPA.id+'\"] .gc-th')") ,'node vista amb miniatura')
    pg.wait_for_timeout(2500)
    chk(ev("!!document.querySelector('.gc-th img.on')"),'miniatura generada')
    chk(ev("document.querySelectorAll('.gc-stk a[data-goto]').length")>=3,'inspector amb pila resolta i enllaços')
    chk(ev("!!document.querySelector('[data-node=\"'+QPA.id+'\"] [data-f=name]')"),'propietat principal editable dins el node')
    # editar al node
    ev("(()=>{const i=document.querySelector('[data-node=\"'+QSH.id+'\"] [data-f=fmt]');i.value='A2';i.dispatchEvent(new Event('change'));return 0})()")
    chk(ev("gN(QSH.id).p.fmt")=='A2','canvi de format des del node')
    # connectar amb ratolí: nova escala a QPB
    ev("window.QSC=gAdd('scale',0,0,{n:50});gLayout(true);pubDraw();GV.fitFn();0"); pg.wait_for_timeout(200)
    def ctr(sel): return ev(f"(()=>{{const r=document.querySelector('{sel}').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})()")
    o=ctr('u[data-out=\"'+str(ev('QST.id'))+'\"]'); t=ctr('u[data-in=\"'+str(ev('QSC.id'))+'\"]')
    pg.mouse.move(*o); pg.mouse.down(); pg.mouse.move(*t,steps=10); pg.mouse.up(); pg.wait_for_timeout(150)
    chk(ev("gIn(QSC.id,'v')[0]&&gIn(QSC.id,'v')[0].id===QST.id"),'connexió amb ratolí')
    # deixar cable al buit → menú filtrat
    o=ctr('u[data-out=\"'+str(ev('QSC.id'))+'\"]')
    pg.mouse.move(*o); pg.mouse.down(); pg.mouse.move(o[0]+40,o[1]+260,steps=8); pg.mouse.up(); pg.wait_for_timeout(150)
    chk(ev("!!document.querySelector('.gc-menu')") and ev("[...document.querySelectorAll('.gc-menu [data-add]')].every(d=>NT[d.dataset.add].ins.some(q=>q[2].includes('view')))"),'cable al buit obre menú filtrat per tipus')
    n0=ev("GG().nodes.length"); ev("document.querySelector('.gc-menu [data-add=pub]').click();0")
    chk(ev("GG().nodes.length")==n0+1 and ev("gIn(GG().nodes.at(-1).id,'v')[0].id===QSC.id"),'node afegit ja connectat')
    # drag node, selecció múltiple, duplicar, esborrar
    h=ctr('[data-node=\"'+str(ev('QT.id'))+'\"] .gc-h'); x0=ev("QT.x")
    pg.mouse.move(*h); pg.mouse.down(); pg.mouse.move(h[0]+120,h[1]+40,steps=6); pg.mouse.up()
    chk(ev("QT.x")>x0,'arrossegar node')
    ev("GV.sel=new Set([QT.id]);0"); n0=ev("GG().nodes.length"); pg.keyboard.press('Control+d'); pg.wait_for_timeout(100)
    chk(ev("GG().nodes.length")==n0+1,'Ctrl+D duplica')
    pg.keyboard.press('Delete'); pg.wait_for_timeout(100)
    chk(ev("GG().nodes.length")==n0,'Supr esborra')
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(300)
    chk(ev("GG().nodes.length")==n0+1 and ev("document.querySelectorAll('.gc-n').length")==n0+1,'desfer refresca el llenç')
    # menú contextual
    pg.mouse.click(1000,880,button='right'); pg.wait_for_timeout(100)
    chk(ev("document.querySelectorAll('.gc-menu [data-add]').length")==len(['base','filter','lim','style','lines','scale','pub','title','sheet','exp2d','expm','exp3d']),'clic dret: menú complet')
    pg.keyboard.press('Escape')
    z0=ev("GV.view.z"); ev("document.getElementById('gcCv').dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:800,clientY:400,bubbles:true,cancelable:true}));0")
    chk(ev("GV.view.z")>z0,'zoom amb roda')
    ev("document.getElementById('gcLay').click();0"); chk(ev("GG().nodes.every(n=>isFinite(n.x))"),'ordena el graf')
    pg.wait_for_timeout(1500); pg.screenshot(path="/tmp/v470.png")
    chk(len(errs)==0,'sense errors JS '+str(errs[:3]))
    b.close()
print(res)
