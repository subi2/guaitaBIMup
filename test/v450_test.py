from playwright.sync_api import sync_playwright
import re
src=open('/home/claude/g3d/test/v420_test.py').read()
SETUP=re.search(r'SETUP="""(.*?)"""',src,re.S).group(1)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.45.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate; ev(SETUP)
    chk(ev("VERSION")=='0.45.0','versió 0.45.0')
    ev("clr();mk(0,0,0,4,2,3,'A');S.model.views=[];rebuild();0")
    ev("window.__d=[];deliver=async(n,d,m)=>{window.__d.push([n,typeof d==='string'?d.length:(d.length||d.byteLength||d.size||0)]);return true};0")
    ev("""(()=>{const P=pubData();window.PA=pubCreate('plan:'+S.model.levels[0].id);window.PB=pubCreate('elev:S');
      window.SH={id:pubNext(),name:'Plànol A1',fmt:'A3',items:[PA.id,PB.id]};P.sheets.push(SH);
      window.E1={id:pubNext(),name:'Pla PDF',src:'sheet:'+SH.id,fmt:'pdf',filter:{hidTags:[],hidIfc:[]}};P.exps.push(E1);
      window.E2={id:pubNext(),name:'IFC cru',src:'model',fmt:'ifc',filter:{hidTags:[],hidIfc:[]}};P.exps.push(E2);
      pubOpen(PA.id);return 0})()""")
    chk(ev("PUBW.tree===true"),'vista d’arbre per defecte')
    chk(ev("document.querySelectorAll('[data-troot]').length")==1,'arrel = Model')
    chk(ev("document.querySelectorAll('[data-tpub]').length")==2,'2 vistes publicables a l’arbre')
    chk(ev("document.querySelectorAll('[data-tchip]').length")==6,'filtre · representació · límits per vista (6)')
    chk(ev("document.querySelectorAll('[data-tsheet]').length")==2,'el plànol penja de cada vista que hi és (node repetit)')
    chk(ev("document.querySelectorAll('[data-texp]').length")==3,'exportació del plànol sota cada aparició + directa del model (3)')
    chk(ev("(()=>{const g=document.querySelector('[data-tgrp=gx]');return !!g&&g.parentElement.innerText.includes('IFC cru')})()"),'exportació directa penja del Model, sense plànol')
    chk(not ev("!!document.querySelector('[data-sheet]')"),'sense llistes a la vista d’arbre')
    # inspector segons selecció
    ev("document.querySelector('[data-tpub]').click();0")
    chk(ev("!!document.querySelector('[data-pubrep]')"),'clic a vista → inspector de vista')
    ev("document.querySelector('[data-tsheet]').click();0")
    chk(ev("PUBW.kind")=='sheet' and ev("!!document.querySelector('[data-shexp=pdf]')"),'clic a plànol → inspector de plànol')
    ev("document.querySelector('[data-texp]').click();0")
    chk(ev("PUBW.kind")=='exp' and ev("!!document.querySelector('[data-expgo]')"),'clic a exportació → inspector d’exportació')
    # col·lapsar
    n=ev("document.querySelectorAll('[data-tpub]').length")
    ev("(()=>{PUBW.closed.add('gp');pubDraw();return 0})()")
    chk(ev("document.querySelectorAll('[data-tpub]').length")==0,'una branca es pot col·lapsar')
    ev("(()=>{PUBW.closed.clear();pubDraw();return 0})()")
    # PDF primer
    chk(ev("PUB_FMTS.sheet[0][0]")=='pdf','PDF és el format principal de plànol')
    ev("document.querySelector('[data-tpub]').click();0")
    chk(ev("document.querySelector('[data-pubexp]').dataset.pubexp")=='pdf' and ev("document.querySelector('[data-pubexp=pdf]').className.includes('acc')"),'botó PDF destacat a la vista')
    ev("document.querySelector('[data-pubexp=pdf]').click();0"); pg.wait_for_timeout(600)
    d=ev("window.__d"); chk(len(d)==1 and d[0][0].endswith('.pdf') and d[0][1]>500,'una vista publicable exporta PDF sola, sense plànol: %s'%d)
    ev("document.querySelector('[data-pubexp=svg]').click();0"); pg.wait_for_timeout(300)
    chk(ev("window.__d.length")==2,'SVG alternatiu')
    # canvi de mode
    ev("document.getElementById('pubMode').click();0")
    chk(ev("PUBW.tree")==False and ev("document.querySelectorAll('[data-pub]').length")==2,'canvi a vista de llistes')
    ev("document.getElementById('pubMode').click();0")
    chk(ev("document.querySelectorAll('[data-tpub]').length")==2,'tornar a l’arbre')
    # nou plànol sense vistes
    ev("(()=>{PUBW.kind='sheet';const P=pubData();P.sheets.push({id:pubNext(),name:'Buit',fmt:'auto',items:[]});pubDraw();return 0})()")
    chk(ev("!!document.querySelector('[data-tgrp=gs]')"),'plànols sense vistes en grup propi')
    chk(not errs,'sense errors %s'%errs)
    print(res)
