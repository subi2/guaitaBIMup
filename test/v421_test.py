from playwright.sync_api import sync_playwright
import re
src=open('/home/claude/g3d/test/v420_test.py').read()
SETUP=re.search(r'SETUP="""(.*?)"""',src,re.S).group(1)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.42.1.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
def edgeLen(ev): return ev("""(()=>{rebuild();let s=0;gModel.traverse(o=>{if(o.isLineSegments2&&!o.userData.cap&&o.material&&!o.material.dashed){const a=o.geometry.attributes.instanceStart,e=o.geometry.attributes.instanceEnd;if(!a)return;for(let i=0;i<a.count;i++)s+=Math.hypot(e.getX(i)-a.getX(i),e.getY(i)-a.getY(i),e.getZ(i)-a.getZ(i));}});return s})()""")
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1500,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate
    chk(ev("VERSION")=='0.42.1','versió 0.42.1')
    ev(SETUP)
    ev("S.view=null;S.style.ln.j3=false;0")
    ev("clr();mk(0,0,0,4,2,3,'A');mk(3,0,0,4,2,3,'B');0")
    off=edgeLen(ev)
    ev("S.style.ln.j3=true;0"); on=edgeLen(ev)
    print(off,on)
    chk(on<off-1,'unió 3D retalla arestes interiors (%.1f → %.1f)'%(off,on))
    # dos prismes que se solapen: perímetre unió en 3D = arestes visibles
    ev("(()=>{const g=[...S.model.root.groups.values()];g[1].nojoin=true;0})()")
    chk(abs(edgeLen(ev)-off)<1e-3,'nojoin: sense retall (%.1f)'%edgeLen(ev))
    ev("(()=>{const g=[...S.model.root.groups.values()];g[1].nojoin=false;0})()")
    # cos creuat: paret ∩ llosa crea arestes d'intersecció
    ev("clr();mk(0,0,0,6,6,0.3,'llosa');mk(2,2,-1,0.3,2,3,'paret');0")
    ev("S.style.ln.j3=false;0"); a=edgeLen(ev); ev("S.style.ln.j3=true;0"); c=edgeLen(ev)
    print(a,c)
    chk(ev("lnJoinCtx().inter.length")>0,'segments d’intersecció paret∩llosa: %d'%ev("lnJoinCtx().inter.length"))
    # exportació classificada
    ev("clr();mk(0,0,0,4,2,3,'A');mk(0,5,0,4,2,3,'B');0")
    ev("S.style.ln.j3=true;LN_CTX=undefined;0")
    L=ev("S.model.levels[0].id")
    ks=ev("docViews().map(v=>v[0])"); print(ks)
    ek=[k for k in ks if k.startswith('elev')][0]
    sh=ev("(k=>{const sh=docSheet([k],{scale:100,hidden:false});const lay={};for(const p of sh.prims)if(p.t==='l')lay[p.layer]=(lay[p.layer]||0)+1;return lay})('%s')"%ek)
    print(sh)
    chk('G-VISTA' in sh,'alçat: capa G-VISTA')
    chk(any(k.startswith('G-LLUNY') for k in sh),'alçat: franges de llunyania en capes G-LLUNYn')
    dxf=ev("(k=>sheetDXF(docSheet([k],{scale:100,hidden:false})))('%s')"%ek)
    chk('G-LLUNY1' in dxf and 'G-REFLEX' in dxf,'DXF defineix capes E i D')
    svg=ev("(k=>sheetSVG(docSheet([k],{scale:100,hidden:false})))('%s')"%ek)
    chk(svg.count('<path')>3,'SVG amb traçats')
    pk=[k for k in ks if k.startswith('plan')][0]
    n0=ev("(k=>docSheet([k],{scale:100,hidden:false}).prims.filter(p=>p.layer==='G-REFLEX').length)('%s')"%pk)
    ev("(()=>{const l=S.model.levels[0];pvSet(l,{rear:2.5});0})()")
    ev("S.model.levels[0].elev=-1;0")
    n1=ev("(k=>docSheet([k],{scale:100,hidden:false}).prims.filter(p=>p.layer==='G-REFLEX').length)('%s')"%pk)
    chk(n0==0 and n1>0,'planta: reflexades D només amb fons (%d → %d)'%(n0,n1))
    pdf=ev("(k=>sheetPDF(docSheet([k],{scale:100,hidden:false})).length)('%s')"%ek)
    chk(pdf>500,'PDF generat')
    chk(not errs,'sense errors %s'%errs)
    print(res)
