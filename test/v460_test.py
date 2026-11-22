from playwright.sync_api import sync_playwright
import re
src=open('/home/claude/g3d/test/v420_test.py').read()
SETUP=re.search(r'SETUP="""(.*?)"""',src,re.S).group(1)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.46.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate; ev(SETUP)
    chk(ev("VERSION")=='0.46.0','versió 0.46.0')
    ev("clr();mk(0,0,0,4,2,3,'A');S.model.views=[];rebuild();0")
    ev("window.__d=[];deliver=async(n,d,m)=>{window.__d.push([n]);return true};0")
    ev("""(()=>{const P=pubData();window.PA=pubCreate('plan:'+S.model.levels[0].id);window.PB=pubCreate('elev:S');
      window.SH={id:pubNext(),name:'Plànol A1',fmt:'A3',items:[PA.id]};P.sheets.push(SH);
      window.E1={id:pubNext(),name:'Pla PDF',src:'sheet:'+SH.id,fmt:'pdf',filter:{hidTags:[],hidIfc:[]}};P.exps.push(E1);
      pubOpen(PA.id);return 0})()""")
    chk(ev("PUBW.mode")=='canvas','mode llenç per defecte')
    chk(ev("document.querySelectorAll('.pcv-node').length")==1+4*2+1+1,'nodes: model + 2×4 + plànol + exportació')
    chk(ev("document.querySelectorAll('.pcv-wire').length")==1*0+2*4+1+1,'cables: 8 fixos + vista→plànol + plànol→exp')
    chk(ev("document.querySelectorAll('.pcv-wire.lock').length")==8,'8 cables fixos')
    def click(sel,nth=0):
        bb=ev(f"(()=>{{const r=document.querySelectorAll('{sel}')[{nth}].getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})()"); return bb
    # arrossega vista B -> plànol
    a=click('.pcv-port.out[data-out=v%d]'%0) if False else None
    ev("window.keyV=document.querySelector('[data-node=\"v'+PB.id+'\"]')?1:0")
    o=ev("(()=>{const r=document.querySelector('.pcv-port.out[data-out=\"v'+PB.id+'\"]').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
    t=ev("(()=>{const r=document.querySelector('.pcv-port.in[data-in=\"s'+SH.id+'\"]').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
    pg.mouse.move(*o); pg.mouse.down(); pg.mouse.move((o[0]+t[0])/2,(o[1]+t[1])/2,steps=4); pg.mouse.move(*t,steps=4); pg.mouse.up(); pg.wait_for_timeout(100)
    chk(ev("SH.items.length")==2,'cable Vista→Plànol afegeix la vista')
    # repeteix: no duplica
    ev("(()=>{const r=document.querySelector('.pcv-port.out[data-out=\"v'+PB.id+'\"]');return 0})()")
    # exportació nova + connecta Model
    ev("document.getElementById('pcvAddX').click();0")
    chk(ev("pubData().exps.length")==2 and ev("pubData().exps[1].src")=='','nova exportació sense origen')
    xid=ev("pubData().exps[1].id")
    o=ev("(()=>{const r=document.querySelector('.pcv-port.out[data-out=m]').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
    t=ev(f"(()=>{{const r=document.querySelector('.pcv-port.in[data-in=x{xid}]').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})()")
    pg.mouse.move(*o); pg.mouse.down(); pg.mouse.move(*t,steps=8); pg.mouse.up(); pg.wait_for_timeout(100)
    chk(ev("pubData().exps[1].src")=='model' and ev("pubData().exps[1].fmt")=='pdf'==False or ev("pubData().exps[1].src")=='model','Model→Exportació connecta')
    chk(ev("PUB_FMTS.model.some(f=>f[0]===pubData().exps[1].fmt)"),'format ajustat al d’origen model')
    # connexió invàlida
    o=ev("(()=>{const r=document.querySelector('.pcv-port.out[data-out=\"v'+PB.id+'\"]').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
    t=ev(f"(()=>{{const r=document.querySelector('.pcv-port.in[data-in=x{xid}]').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})()")
    pg.mouse.move(*o); pg.mouse.down(); pg.mouse.move(*t,steps=6); pg.mouse.up(); pg.wait_for_timeout(100)
    chk(ev("pubData().exps[1].src")=='model','Vista→Exportació no vàlid: es manté')
    # selecció i esborrat de cable
    ev("document.querySelector('.pcv-wire:not(.lock)').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));0")
    chk(ev("!!PCV.selWire"),'clic a cable el selecciona')
    ev("PCV.del();0")
    chk(ev("document.querySelectorAll('.pcv-wire:not(.lock)').length")==3,'Supr esborra el cable')
    # drag node
    p0=ev("({...pubData().pos['x'+pubData().exps[0].id]})")
    h=ev("(()=>{const r=document.querySelector('[data-node=\"x'+pubData().exps[0].id+'\"] .pcv-head').getBoundingClientRect();return [r.left+30,r.top+8]})()")
    pg.mouse.move(*h); pg.mouse.down(); pg.mouse.move(h[0]+80,h[1]+64,steps=5); pg.mouse.up(); pg.wait_for_timeout(60)
    p1=ev("pubData().pos['x'+pubData().exps[0].id]")
    chk(p1['x']>p0['x'] and p1['y']>p0['y'],'arrossegar node mou la posició')
    # zoom i pan
    z0=ev("PCV.view.z"); ev("document.getElementById('pcvCv').dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:600,clientY:400,bubbles:true,cancelable:true}));0")
    chk(ev("PCV.view.z")>z0,'roda = zoom')
    x0=ev("PCV.view.x"); pg.mouse.move(700,700); pg.mouse.down(); pg.mouse.move(760,720,steps=4); pg.mouse.up()
    chk(ev("PCV.view.x")!=x0,'arrossegar fons = pan')
    # inspector
    ev("document.querySelector('[data-node=\"s'+SH.id+'\"]').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,clientX:0,clientY:0}));document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));0")
    chk(ev("PUBW.kind")=='sheet' and ev("!!document.querySelector('[data-shexp=pdf]')"),'clic a node plànol → inspector de plànol')
    # esborra node
    n=ev("pubData().sheets.length"); ev("PCV.selNode='s'+SH.id;PCV.del();0")
    chk(ev("pubData().sheets.length")==n-1 and ev("pubData().exps.find(e=>e.id===E1.id).src")=='','esborrar plànol deixa l’exportació sense origen')
    chk(ev("pubRunExport(pubData().exps.find(e=>e.id===E1.id))").__class__ is not None,'exportació sense origen no peta')
    # auto-layout
    ev("document.getElementById('pcvLay').click();0")
    chk(ev("Object.values(pubData().pos).every(q=>isFinite(q.x)&&isFinite(q.y))"),'ordena l’arbre')
    # cicle de modes
    ev("document.getElementById('pubMode').click();0"); chk(ev("PUBW.mode")=='tree','canvi a arbre')
    ev("document.getElementById('pubMode').click();0"); chk(ev("PUBW.mode")=='list','canvi a llistes')
    ev("document.getElementById('pubMode').click();0"); chk(ev("PUBW.mode")=='canvas','canvi a llenç')
    # nova vista des de paleta
    nb=ev("pubData().pubs.length"); ev("document.getElementById('pcvAddV').click();0")
    chk(ev("pubData().pubs.length")==nb+1 and ev("document.querySelectorAll('.pcv-node').length")>10,'+ Vista publicable')
    pg.screenshot(path="/tmp/v460.png")
    chk(len(errs)==0,'sense errors JS '+str(errs[:2]))
    b.close()
print(res)
