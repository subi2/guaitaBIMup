from playwright.sync_api import sync_playwright
import re
src=open('/home/claude/g3d/test/v420_test.py').read()
SETUP=re.search(r'SETUP="""(.*?)"""',src,re.S).group(1)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.43.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate
    chk(ev("VERSION")=='0.43.0','versió 0.43.0')
    ev(SETUP)
    chk(ev("!!TOOLS.door&&!!TOOLS.win&&!!document.querySelector('[data-tool=door]')&&!!document.querySelector('[data-tool=win]')"),'eines Porta i Finestra a la barra BIM')
    chk(ev("(()=>{renderTray();return !!panelDefs().doors&&!!panelDefs().wins})()"),'panells definits')
    # components: porta 0.9x0.1x2.1, finestra 1.2x0.1x1.2, lliure
    ev("""(()=>{clr();
      const g1=mk(0,0,0,0.9,0.1,2.1,'Porta A');const d1=compFromGroup(g1,'door');
      const g2=mk(0,0,0,1.2,0.1,1.2,'Finestra A');const d2=compFromGroup(g2,'window');
      const g3=mk(0,0,0,0.5,0.5,0.5,'Cub');compFromGroup(g3,'free');
      clr();window.D1=d1.id;window.D2=d2.id;return 0})()""")
    ev("setTool('door');0"); 
    html=ev("document.body.innerText")
    chk(ev("compDefs().length")==3,'3 definicions')
    chk(ev("S.compId")==ev("D1"),'tool Porta tria una porta per defecte')
    chk(ev("document.querySelectorAll('[data-cat]').length")==2,'catàleg Portes + Finestres visibles (1 porta + 1 finestra): només portes (1)')
    chk(ev("document.querySelector('[data-cat] img').src.startsWith('data:image/png')"),'miniatura generada')
    chk(ev("!!document.querySelector('[data-catinfo]')"),'fitxa de característiques')
    inf=ev("document.querySelector('[data-catinfo]').innerText"); print(inf)
    chk('0.9' in inf.replace(',','.') and 'IfcDoor' in inf,'característiques: amplada i classe IFC')
    ev("setTool('win');0")
    chk(ev("document.querySelectorAll('.row.on[data-cat]').length")==1 and ev("S.compId")==ev("D2"),'catàleg Finestres: 1 finestra seleccionada')
    # col·locar sobre un mur
    ev("""(()=>{const c=ctxInfo().c;S.level=S.model.levels[0].id;const w=makeWall([0,0],[6,0]);rebuild();window.WID=[...c.groups.values()].find(g=>g.par&&g.par.type==='wall').id;return 0})()""")
    ev("""(()=>{const c=ctxInfo().c,W=c.groups.get(WID);makeComp(compDef(D1),[2,0,0],W);makeComp(compDef(D2),[4.2,0,0],W);refreshAll();return 0})()""")
    n=ev("compCount(D1)+compCount(D2)"); chk(n==2,'2 instàncies allotjades')
    a0=ev("(()=>{const W=ctxInfo().c.groups.get(WID);let a=0;for(const f of W.faces.values())a+=K.faceArea(W,f);return a})()")
    ev("(()=>{const c=ctxInfo().c;for(const g of c.groups.values())if(g.par&&g.par.type==='comp')g.par.cut=false;refreshAll();return 0})()")
    a1=ev("(()=>{const W=ctxInfo().c.groups.get(WID);let a=0;for(const f of W.faces.values())a+=K.faceArea(W,f);return a})()")
    print(a0,a1)
    chk(a1>a0,'amb forats el mur té menys àrea de cares que sense (%.2f < %.2f)'%(a0,a1))
    ev("(()=>{const c=ctxInfo().c;for(const g of c.groups.values())if(g.par&&g.par.type==='comp')g.par.cut=true;refreshAll();return 0})()")
    ev("(()=>{S.sel.groups.clear();S.sel.groups.add(WID);refreshAll();return 0})()")
    chk(ev("document.querySelectorAll('[data-cmphole]').length")==2,'panell del mur: 2 forats de component en només lectura')
    chk(ev("wallCompHoles(ctxInfo().c.groups.get(WID)).length")==2,'wallCompHoles = 2')
    chk(not errs,'sense errors %s'%errs)
    print(res)
