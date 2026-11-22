from playwright.sync_api import sync_playwright
import re
SETUP=re.search(r'SETUP="""(.*?)"""',open('/home/claude/g3d/test/v420_test.py').read(),re.S).group(1)
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.56.0.html"
# intersecció a pantalla de dues arestes allargades
ISECT="""(e1,e2)=>{const a=toScreen(e1[0]),b=toScreen(e1[1]),c=toScreen(e2[0]),d=toScreen(e2[1]);const r=[b.x-a.x,b.y-a.y],s=[d.x-c.x,d.y-c.y],den=r[0]*s[1]-r[1]*s[0];const t=((c.x-a.x)*s[1]-(c.y-a.y)*s[0])/den;return {x:a.x+r[0]*t,y:a.y+r[1]*t};}"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    ctx=b.new_context(viewport={"width":1600,"height":950}); pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); ev=pg.evaluate; W=lambda t=250: pg.wait_for_timeout(t)
    pg.goto(URL+"?nou"); W(1000); ev(SETUP); ev("window.isect="+ISECT+";0")
    chk(ev("VERSION")=='0.56.0','versió 0.56.0')
    ev("clr();mk(0,0,0,4,3,3,'Caixa');rebuild();0"); W()
    ev("setProj('conic');camSet({eye:[-6,-8,1.6],tgt:[2,1.5,1.6],lens:{...LENS_DEF,f:28}});camWin();0"); W(500)
    chk(ev("typeof TOOLS.camvp==='object'"),'eina Marca fugues registrada')
    chk(ev("!!$('cpVpPick')&&!!$('cpVpAx')&&!!document.querySelector('.vp-hero')"),'secció Fugues al panell amb dibuix esquemàtic i botons amb icona')
    chk(ev("!!document.querySelector('.vp-empty')"),'llegenda buida amb indicació')
    ev("""window.ex=SNAP.edges.filter(e=>Math.abs(e.b[1]-e.a[1])<1e-9&&Math.abs(e.b[2]-e.a[2])<1e-9);
          window.ey=SNAP.edges.filter(e=>Math.abs(e.b[0]-e.a[0])<1e-9&&Math.abs(e.b[2]-e.a[2])<1e-9);
          window.ez=SNAP.edges.filter(e=>Math.abs(e.b[0]-e.a[0])<1e-9&&Math.abs(e.b[1]-e.a[1])<1e-9);0""")
    chk(ev("ex.length>=2&&ey.length>=2&&ez.length>=2"),'arestes de la caixa en X, Y i Z')
    u0=ev("S.undo.length")
    ev("vpAdd(ex[0].a,ex[0].b);vpAdd(ex[1].a,ex[1].b);0")
    chk(ev("S.model.meta.cvp.fam.length")==1 and ev("S.model.meta.cvp.fam[0].e.length")==2,'dues arestes paral·leles formen F1')
    chk(ev("vpAdd(ex[1].b,ex[1].a)")==False,'una aresta repetida (invertida) no s’afegeix')
    chk(ev("S.undo.length")==u0+2,'cada aresta entra a desfer')
    g=ev("vpGeom()[0].vp"); q=ev("isect([ex[0].a,ex[0].b],[ex[1].a,ex[1].b])")
    chk(abs(g['x']-q['x'])<1 and abs(g['y']-q['y'])<1,'punt de fuga = intersecció de les arestes projectades (%.1f,%.1f / %.1f,%.1f)'%(g['x'],g['y'],q['x'],q['y']))
    ev("vpAdd(ez[0].a,ez[0].b);vpAdd(ez[1].a,ez[1].b);0")
    chk(ev("vpGeom()[1].vp")==None,'verticals amb càmera nivellada: sense fuga')
    chk(ev("vpGeom()[1].segs.length")==2,'les verticals es dibuixen com a rectes paral·leles')
    ev("vpAdd(ey[0].a,ey[0].b);0")
    chk(ev("S.model.meta.cvp.fam.length")==3,'tercera fuga F3')
    chk(ev("vpAdd([0,0,0],[1,1,1])")==False,'una quarta direcció es rebutja')
    ev("needRender=true;0"); W(300)
    n=ev("document.querySelectorAll('#camOv line[x1]').length")
    chk(ev("document.querySelectorAll('#camOv g[stroke=\"#FF5A36\"] line').length")==2 and n>=5,'línies de fuga al visor (%d)'%n)
    chk(ev("document.querySelectorAll('#cpVp .vp-row').length")==3 and 'sense fuga' in ev("$('cpVp').textContent"),'llegenda amb tres fugues i estat')
    # fuga lluny de la pantalla
    ev("camSet({eye:[-1,-12,1.6],tgt:[1,0,1.6],lens:{...LENS_DEF,f:28}});0"); W(300)
    G=ev("vpGeom()"); v=G[0]['vp']; q=ev("isect([ex[0].a,ex[0].b],[ex[1].a,ex[1].b])")
    chk(v and abs(v['x']-q['x'])<max(1,abs(q['x'])*1e-4) and v['x']>1600,'fuga fora de pantalla però calculada (x=%.0f px)'%(v['x'] if v else 0))
    chk(G[0]['mark'] and G[0]['mark']['in']==False and len(G[0]['segs'])==2,'marca a la vora i línies retallades al visor')
    chk(all(0<=c<=1601 for s in G[0]['segs'] for c in (s[0],s[2])),'segments dins del visor')
    # activa/desactiva
    ev("(()=>{const i=document.querySelector('input[data-cp=vpon]');i.checked=false;i.dispatchEvent(new Event('change'))})()"); W(300)
    chk(ev("vpGeom().length")==0 and ev("document.querySelectorAll('#camOv g[stroke]').length")==0,'interruptor amaga les fugues')
    ev("(()=>{const i=document.querySelector('input[data-cp=vpon]');i.checked=true;i.dispatchEvent(new Event('change'))})()"); W(300)
    # eina amb clic real
    ev("vpDel(2);0"); W(200)
    pos=ev("(()=>{const e=ey[1],a=toScreen(e.a),b=toScreen(e.b);return {x:(a.x+b.x)/2,y:(a.y+b.y)/2}})()")
    ev("setTool('camvp');0"); W(200)
    ev("TOOLS.camvp.down({},%f,%f);0"%(pos['x'],pos['y'])); W(200)
    chk(ev("S.model.meta.cvp.fam.length")==3,'l’eina afegeix l’aresta clicada')
    # exportació
    svg=ev("buildSVG({scope:'all',bg:'white',edges:true,vp:true})")
    chk('id="fugues"' in svg and '#FF5A36' in svg,'SVG de la vista amb les fugues')
    chk('id="fugues"' not in ev("buildSVG({scope:'all',bg:'white',edges:true})"),'SVG sense fugues si no es demana')
    px=ev("""(async()=>{const c=document.createElement('canvas');c.width=view.clientWidth;c.height=view.clientHeight;const g=c.getContext('2d');await vpCanvas(g,1);const d=g.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n})()""")
    chk(px>200,'PNG: les fugues es dibuixen al canvas (%d px)'%px)
    ev("exportDlg('png');0"); W(300)
    chk(ev("!!$('xVp')&&$('xVp').checked"),'diàleg PNG amb opció «Inclou les línies de fuga»')
    ev("$('dlg').classList.remove('show');0")
    # desar i desfer
    chk('"cvp"' in ev("snapshot()"),'les fugues es desen amb el model')
    ev("undo();0"); W(200)
    chk(ev("S.model.meta.cvp.fam.length")==2,'desfer treu l’última aresta/fuga')
    ev("vpAxes();0"); W(200)
    chk(ev("S.model.meta.cvp.fam.length")==3,'Eixos X·Y·Z completa les fugues principals')
    ev("vpDel();0")
    chk(ev("S.model.meta.cvp.fam.length")==0,'Esborra-les')
    ev("vpAxes();setTool('select');camSet({eye:[-6,-8,1.6],tgt:[2,1.5,3],lens:{...LENS_DEF,f:24}});vpAdd(ex[0].a,ex[0].b);0"); W(500)
    pg.screenshot(path='/tmp/v560.png')
    chk(not errs,'sense errors de pàgina '+str(errs[:3]))
    b.close()
print(res)
