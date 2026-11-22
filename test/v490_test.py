from playwright.sync_api import sync_playwright
import re
SETUP=re.search(r'SETUP="""(.*?)"""',open('/home/claude/g3d/test/v420_test.py').read(),re.S).group(1)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.49.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1600,"height":950}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+(e.stack or '')[:200]))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate; ev(SETUP)
    chk(ev("VERSION")=='0.49.0','versió 0.49.0')
    ev("clr();mk(0,0,0,4,2,3,'A');S.model.views=[];rebuild();0")
    ev("window.__d=[];deliver=async(n,d,m)=>{window.__d.push([n,typeof d==='string'?d:String.fromCharCode.apply(null,Array.from(d))]);return true};0")
    # migració d'un graf v0.48
    ev("""(()=>{const P=pubData();P.pubs=[];P.sheets=[];P.exps=[];const m={id:pubNext(),t:'model',x:0,y:0,p:{by:'ifc',tree:false}},b={id:pubNext(),t:'base',x:0,y:0,p:{src:'plan:'+S.model.levels[0].id}},pu={id:pubNext(),t:'pub',x:0,y:0,p:{name:'V'}},
      sh={id:pubNext(),t:'sheet',x:0,y:0,p:{name:'Vell',fmt:'A2'}},ti={id:pubNext(),t:'title',x:0,y:0,p:{tpl:'etsab',project:'Casa X',title:'Planta',num:'B-07',author:'JS',school:'ETSAB'}};
      P.g={nodes:[m,b,pu,sh,ti],wires:[{a:m.id,b:b.id,bp:'m'},{a:b.id,b:pu.id,bp:'v'},{a:pu.id,b:sh.id,bp:'p'},{a:ti.id,b:sh.id,bp:'t'}]};window.OSH=sh;window.OTI=ti;GG();pubCompile();return 0})()""")
    chk(ev("gIn(OSH.id,'f')[0].p.fmt")=='A2','migració: el format del plànol passa a un node Full')
    chk(ev("gIn(OTI.id,'d')[0].p.projecte")=='Casa X' and ev("OSH.p.numero")=='B-07' and ev("OSH.p.titol")=='Planta','migració: dades al projecte i al plànol')
    chk(ev("Array.isArray(OTI.p.items)&&OTI.p.items.length>5"),'migració: caràtula passa a bloc de dibuix')
    # nou esquema
    ev("""(()=>{delete pubData().g;pubData().pubs=[];pubData().sheets=[];pubData().exps=[];window.PA=pubCreate('plan:'+S.model.levels[0].id);window.FU=gAdd('paper',0,0,{fmt:'A3'});window.PJ=gAdd('proj',0,0,{projecte:'Habitatge Collserola',client:'Família Puig',emplacament:'Vallvidrera',extra:[['expedient','EXP-42']]});
      window.CA=gAdd('title',0,0);gLink(PJ.id,CA.id,'d');window.SH=gAdd('sheet',0,0,{name:'Planta',numero:'A-03',titol:'Planta baixa',revisio:'B'});gLink(FU.id,SH.id,'f');gLink(PA.id,SH.id,'p');gLink(CA.id,SH.id,'t');
      window.X=gAdd('exp2d',0,0,{name:'pla',fmt:'svg'});gLink(SH.id,X.id,'s');pubCompile();return 0})()""")
    d=ev("(()=>{const d=pubSheetBuild(pubData().sheets[0]);return [d.W,d.H]})()")
    chk(d==[420,297],'Full A3 horitzontal defineix la mida '+str(d))
    ev("FU.p.orient='port';pubCompile();0"); chk(ev("(()=>{const d=pubSheetBuild(pubData().sheets[0]);return [d.W,d.H]})()")==[297,420],'orientació vertical')
    ev("FU.p.fmt='A1';FU.p.orient='land';pubCompile();0"); chk(ev("pubSheetBuild(pubData().sheets[0]).W")==841,'canviar el Full no toca la caràtula')
    chk(ev("CA.p.w")==180,'la caràtula manté la seva mida')
    ev("FU.p.fmt='custom';FU.p.w=500;FU.p.h=300;pubCompile();0"); chk(ev("pubSheetBuild(pubData().sheets[0]).W")==500,'mida personalitzada')
    ev("FU.p.fmt='A3';pubCompile();gExport(X)"); pg.wait_for_timeout(900); svg=ev("__d.at(-1)[1]")
    chk(all(t in svg for t in ['Habitatge Collserola','Família Puig','Planta baixa','A-03','Rev. B','1:100']),'camps del projecte i del plànol a la caràtula')
    # camp lliure a la caràtula
    ev("CA.p.items.push({t:'text',x:2,y:45,s:'Exp. {projecte.expedient}',fs:2});CA.p.h=50;pubCompile();__d=[];gExport(X)"); pg.wait_for_timeout(700)
    chk('Exp. EXP-42' in ev("__d.at(-1)[1]"),'camp lliure del projecte')
    # franja vertical
    ev("Object.assign(CA.p,{tpl:'franja',...tbTemplate('franja')});pubCompile();0")
    r=ev("(()=>{const s=pubData().sheets[0],d=pubSheetBuild(s),r=tbRect(s.block,d.W,d.H,10,0);return [r.x,r.h]})()")
    chk(r==[420-10-45,297-20],'franja vertical estirada a l’alçada del full '+str(r))
    # requisits
    ev("X.p.fmt='pdf';pubCompile();0"); chk(ev("gIssue(X)") is None,'PDF amb Full i Caràtula')
    ev("GG().wires=GG().wires.filter(w=>!(w.b===SH.id&&w.bp==='f'));pubCompile();0")
    chk('Full' in (ev("gIssue(gN(SH.id))") or '') ,'plànol sense Full avisa')
    ev("gLink(FU.id,SH.id,'f');pubCompile();0")
    # vista solta amb full
    ev("window.XV=gAdd('exp2d',0,0,{name:'v',fmt:'svg'});gLink(PA.id,XV.id,'s');gLink(FU.id,XV.id,'f');pubCompile();__d=[];gExport(XV)"); pg.wait_for_timeout(700)
    chk('width="420mm"' in ev("__d.at(-1)[1]") or '420' in ev("__d.at(-1)[1]")[:400],'vista solta amb Full')
    # editor de caràtula
    ev("Object.assign(CA.p,{tpl:'guaita',...tbTemplate('guaita')});pubOpen(CA.id);0"); pg.wait_for_timeout(400)
    ev("document.querySelector('[data-tbedit]').click();0"); pg.wait_for_timeout(300)
    chk(ev("!!document.getElementById('gcTb')"),'editor de caràtula obert')
    n0=ev("CA.p.items.length"); ev("document.querySelector('[data-tbadd=Camp]').click();0"); pg.wait_for_timeout(100)
    chk(ev("CA.p.items.length")==n0+1 and ev("CA.p.items.at(-1).s")=='{planol.titol}','afegeix camp')
    ev("(()=>{const s=document.querySelector('[data-tbfield]');s.value='{projecte.client}';s.dispatchEvent(new Event('change'));return 0})()")
    chk('{projecte.client}' in ev("CA.p.items.at(-1).s"),'insereix camp a un text')
    x0=ev("CA.p.items.at(-1).x"); r=ev(f"(()=>{{const r=document.querySelector('[data-tbi=\"{n0}\"]').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})()")
    pg.mouse.move(*r); pg.mouse.down(); pg.mouse.move(r[0]+60,r[1]-20,steps=6); pg.mouse.up(); pg.wait_for_timeout(100)
    chk(ev("CA.p.items.at(-1).x")>x0 and (ev("CA.p.items.at(-1).x")*2)%1==0,'arrossega amb ajust de 0,5 mm')
    ev("document.querySelector('[data-tbadd=Rectangle]').click();0"); i=ev("CA.p.items.length-1"); w0=ev("CA.p.items.at(-1).w")
    h=ev(f"(()=>{{const r=document.querySelector('[data-tbh=\"{i}\"]').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})()")
    pg.mouse.move(*h); pg.mouse.down(); pg.mouse.move(h[0]+50,h[1],steps=5); pg.mouse.up(); pg.wait_for_timeout(100)
    chk(ev("CA.p.items.at(-1).w")>w0,'redimensiona amb la nansa')
    n1=ev("CA.p.items.length"); pg.keyboard.press('ArrowRight'); x1=ev("CA.p.items.at(-1).x"); pg.keyboard.press('Delete'); pg.wait_for_timeout(100)
    chk(ev("CA.p.items.length")==n1-1,'Supr esborra l’element')
    for t in ['Nord','Escala gràfica','Logo','Línia']: ev(f"document.querySelector('[data-tbadd=\"{t}\"]').click();0")
    chk(ev("['north','scalebar','logo','line'].every(t=>CA.p.items.some(i=>i.t===t))"),'símbols: nord, escala gràfica, logo, línia')
    pg.screenshot(path="/tmp/v490t.png")
    ev("document.getElementById('gcTbDone').click();0")
    # escala gràfica i logo a PDF
    ev("PJ.p.logo=(()=>{const c=document.createElement('canvas');c.width=20;c.height=10;return {src:c.toDataURL('image/jpeg'),w:20,h:10}})();X.p.fmt='pdf';pubCompile();__d=[];gExport(X)"); pg.wait_for_timeout(900)
    pdf=ev("__d.at(-1)[1]"); chk('/DCTDecode' in pdf,'logo del projecte al PDF')
    # editor de làmina evita la caràtula
    ev("gSheetEdit(SH.id);0"); pg.wait_for_timeout(300)
    br=ev("(()=>{const s=pubData().sheets.find(x=>x.id===SH.id),d=pubSheetBuild(s);return tbRect(s.block,d.W,d.H,s.paper.mg,s.paper.bind)})()")
    r=ev("(()=>{const r=document.querySelector('#gcSheet [data-item] rect').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
    tgt=ev(f"(()=>{{const svg=document.querySelector('#gcSheet svg'),m=svg.getScreenCTM(),pt=new DOMPoint({br['x']}+{br['w']}/2,{297-br['y']-br['h']/2}).matrixTransform(m);return [pt.x,pt.y]}})()")
    pg.mouse.move(*r); pg.mouse.down(); pg.mouse.move(*tgt,steps=8); pg.mouse.up(); pg.wait_for_timeout(150)
    pos=ev("SH.p.pos[PA.id]"); 
    chk(pos[1]>=br['y']+br['h'] or pos[0]+1<br['x'],'la vista no queda sobre la caràtula '+str(pos))
    ev("document.getElementById('gcShDone').click();pubDraw();GV.fitted=false;pubDraw();0"); pg.wait_for_timeout(1500); pg.screenshot(path="/tmp/v490.png")
    chk(ev("document.querySelectorAll('.gc-n[data-t=paper],.gc-n[data-t=proj],.gc-n[data-t=title]').length")==3,'nodes Full, Projecte i Caràtula al llenç')
    chk(len(errs)==0,'sense errors JS '+str(errs[:2]))
    b.close()
print(res)
