from playwright.sync_api import sync_playwright
import re
src=open('/home/claude/g3d/test/v420_test.py').read()
SETUP=re.search(r'SETUP="""(.*?)"""',src,re.S).group(1)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.44.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate
    chk(ev("VERSION")=='0.44.0','versió 0.44.0')
    ev(SETUP); ev("clr();mk(0,0,0,4,2,3,'A');mk(6,0,0,3,2,3,'B');S.model.views=[];rebuild();0")
    ev("window.__d=[];deliver=async(n,d,m)=>{window.__d.push([n,typeof d==='string'?d.length:(d.length||d.byteLength||d.size||0)]);return true};0")
    chk(ev("document.querySelector('.panel-title,.ph')!==undefined"),'ok')
    # nom del panell
    chk(ev("panelDefs().views[0]")=='Navegador del model','panell = Navegador del model')
    chk(ev("(()=>{renderTray();return document.querySelectorAll('[data-pubnew]').length})()")>=5,'botó ⧉ a cada vista del model')
    # crear vistes publicables
    ev("(()=>{window.PA=pubCreate('plan:'+S.model.levels[0].id);window.PB=pubCreate('elev:S');return 0})()")
    chk(ev("pubData().pubs.length")==2,'2 vistes publicables')
    chk(ev("PA.name")=='Planta N0 - Publicació' or 'Publicació' in ev("PA.name"),'nom per defecte: %s'%ev("PA.name"))
    # estil per vista
    ev("(()=>{PA.rep='ISO';PB.rep='Contrast';return 0})()")
    w=ev("(()=>{const a=pubDrawing(PA),b=pubDrawing(PB);return [a.sty.ln.w.A,b.sty.ln.w.A,a.sty.ln.set,b.sty.ln.set]})()")
    chk(w[0]==0.5 and w[1]==0.8,'cada vista amb el seu joc de línies: %s'%w)
    chk(ev("S.style.name")=='Treball','l’estil global es restaura')
    # estat restaurat
    ev("(()=>{PA.filter.hidIfc=['IfcWall'];return 0})()")
    n0=ev("(()=>{const d=pubDrawing(PB);return d.vis.length})()")
    ev("(()=>{for(const g of S.model.root.groups.values())g.ifc='IfcWall';rebuild();return 0})()")
    n1=ev("(()=>{PB.filter.hidIfc=[];return pubDrawing(PB).vis.length})()")
    n2=ev("(()=>{PB.filter.hidIfc=['IfcWall'];const n=pubDrawing(PB).vis.length;PB.filter.hidIfc=[];return n})()")
    print(n0,n1,n2)
    chk(n1>0 and n2==0,'filtre IFC: amb IfcWall ocult el dibuix queda buit (%d → %d)'%(n1,n2))
    chk(ev("S.hiddenIfc.size")==0 and ev("S.model.tags.every(t=>t.visible)"),'filtre es restaura')
    ev("PA.filter.hidIfc=[];0")
    # límits planta
    ev("(()=>{pvSet(S.model.levels[0],{rear:0});return 0})()")
    r0=ev("pubDrawing(PA).rear.length")
    ev("(()=>{PA.lim.rear=2.5;PA.lim.cut=1.2;return 0})()")
    ev("(()=>{S.model.levels[0].elev=0;return 0})()")
    r1=ev("pubDrawing(PA).rear.length")
    chk(ev("vrOf(S.model.levels[0]).rear")==0 and r1>r0,'límit de fons reflexades (%d → %d) i rang del nivell restaurat'%(r0,r1))
    print(r0,r1)
    # caixa de secció
    ev("(()=>{PA.lim.rear=null;PA.lim.box={on:true,x0:0,x1:0.5,y0:0,y1:1,z0:0,z1:1,rot:0};return 0})()")
    a=ev("(()=>{const d=pubDrawing(PA);let u=[1e9,-1e9];for(const c of d.cut)for(const l of c.loops)for(const q of l){u[0]=Math.min(u[0],q[0]);u[1]=Math.max(u[1],q[0])}return u})()")
    print(a)
    chk(a[1]-a[0]<5.1 and a[1]>a[0],'caixa de secció limita el tall (amplada %.2f < 9)'%(a[1]-a[0]))
    ev("PA.lim.box=null;0")
    # plànol
    ev("(()=>{const P=pubData();window.SH={id:pubNext(),name:'Plànol A1',fmt:'A3',items:[PA.id,PB.id]};P.sheets.push(SH);return 0})()")
    L=ev("(()=>{const d=pubSheetBuild(SH);const l={};for(const p of d.prims)if(p.t==='l')l[p.layer]=1;return [d.fmt,Object.keys(l),d.items.length]})()")
    print(L); chk(L[0]=='A3' and L[2]==2,'plànol amb 2 vistes i format A3')
    ev("(()=>{PB.scale=50;return 0})()")
    chk('1:50' in ev("sheetSVG(pubSheetBuild(SH))"),'escala per vista (1:50) al plànol')
    ev("(async()=>{await pubExportSheet(SH,'svg');await pubExportSheet(SH,'pdf');await pubExportSheet(SH,'dxf')})()"); pg.wait_for_timeout(500)
    chk(len(ev("window.__d"))==3,'exporta SVG/PDF/DXF del plànol')
    # exportació del model sense plànol
    ev("(()=>{const P=pubData();window.EX={id:pubNext(),name:'IFC cru',src:'model',fmt:'ifc',filter:{hidTags:[],hidIfc:[]}};P.exps.push(EX);return 0})()")
    ev("pubRunExport(EX)"); pg.wait_for_timeout(500)
    d=ev("window.__d"); chk(len(d)==4 and d[3][0].endswith('.ifc'),'exportació IFC directa del model, sense plànol: %s'%d[3:])
    ev("(()=>{EX.fmt='dxf';EX.filter.hidIfc=['IfcWall'];return 0})()")
    ev("pubRunExport(EX)"); pg.wait_for_timeout(400)
    d2=ev("window.__d"); chk(len(d2)==4,'filtre del model sense geometria: no exporta (res a exportar)')
    # finestra
    ev("pubOpen(PA.id);0")
    chk(ev("!!document.getElementById('pubWin')")and ev("document.querySelectorAll('[data-pub]').length")==2,'finestra Plànols amb 2 vistes')
    chk(ev("document.querySelectorAll('[data-sheet]').length")==1 and ev("document.querySelectorAll('[data-exp]').length")==1,'llistes de plànols i exportacions')
    ev("document.querySelector('[data-pub]').click();0")
    chk(ev("!!document.querySelector('[data-pubrep]')"),'formulari de representació')
    ev("document.getElementById('pubClose').click();0")
    chk(not ev("!!document.getElementById('pubWin')"),'tanca')
    # serialitzar
    j=ev("JSON.parse(JSON.stringify(K.toJSON(S.model))).meta.pub")
    chk(len(j['pubs'])==2 and len(j['sheets'])==1,'es desa al model (meta.pub)')
    # escena com a vista publicable
    ev("(()=>{window.SC=saveScene();window.PC=pubCreate('scene:'+SC.id);return 0})()")
    d3=ev("(()=>{const d=pubDrawing(PC);return d?d.vis.length:-1})()")
    chk(d3>0,'escena 3D com a vista publicable (%d línies)'%d3)
    chk(not errs,'sense errors %s'%errs)
    print(res)
