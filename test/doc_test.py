from playwright.sync_api import sync_playwright
import base64, subprocess, re
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    chk(ev("VERSION")=="24",'versió 24')
    # casa mínima: 4 murs 6x4, forjat, pilar interior, finestra, i una caixa darrere que ha de quedar oculta en alçat sud
    ev("""(()=>{createLevel(3.0); S.level=S.model.levels.slice().sort((a,b)=>a.elev-b.elev)[0].id; setLevel(S.level);
      makeWall([0,0,0],[6,0,0]); makeWall([6,0,0],[6,4,0]); makeWall([6,4,0],[0,4,0]); makeWall([0,4,0],[0,0,0]);
      makeSlab([0,0,0],[6,4,0]); makeColumn([3,2,0]);
      addOpening([...S.model.root.groups.values()].filter(g=>g.par&&g.par.type==='wall')[0],[3,0,0],1.2,1.2,0.9,'IfcWindow');
      const c=S.model.root;const r=K.addPolyline(S.model,c,[[2,6,0],[4,6,0],[4,7,0],[2,7,0]],true);const f=r.faces[0];K.pushPull(S.model,c,f.id,2*(c.faces.get(f.id).n[2]>0?1:-1));
      clearSel(); refreshAll();})();0""")
    L0=ev("S.level")
    d=ev("(()=>{const d=drawing2D(docView('plan:%s'),{hidden:true});return {cut:d.cut.length,loops:d.cut.reduce((a,c)=>a+c.loops.length,0),vis:d.vis.length,hid:d.hid.length,bb:d.bb,area:d.cut.reduce((a,c)=>a+c.loops.reduce((s,l)=>{let ar=0;for(let i=0;i<l.length;i++){const p=l[i],q=l[(i+1)%%l.length];ar+=p[0]*q[1]-q[0]*p[1];}return s+Math.abs(ar)/2;},0),0)};})()"%L0)
    # tall a +1.2: 4 murs (un partit per la finestra: 0.9..2.1 conté 1.2 → 5 contorns) + pilar = 6 contorns
    chk(d['loops']==7,'planta: contorns de tall de 5 trams de mur (finestra inclosa), pilar i caixa: %d'%d['loops'])
    exp=(6.3*4.3-5.7*3.7)-1.2*0.3+0.16+2.0
    chk(abs(d['area']-exp)<1e-3,'planta: àrea tallada %.4f m² (esperada %.4f)'%(d['area'],exp))
    chk(d['vis']>0,'planta: arestes vistes sota el tall (%d)'%d['vis'])
    e=ev("(()=>{const d=drawing2D(docView('elev:S'),{hidden:true});const inb=s=>s[0]>2.05&&s[2]>2.05&&s[0]<3.95&&s[2]<3.95&&s[1]<1.95&&s[3]<1.95&&s[1]>0.05&&s[3]>0.05;return {cut:d.cut.length,vis:d.vis.length,hid:d.hid.length,bb:d.bb, boxVis:d.vis.filter(s=>Math.abs(s[0]-2)<1e-6&&Math.abs(s[2]-2)<1e-6&&Math.max(s[1],s[3])<1.99&&Math.min(s[1],s[3])>-0.19).length, boxHid:d.hid.filter(s=>Math.abs(s[0]-2)<1e-6&&Math.abs(s[2]-2)<1e-6).length};})()")
    chk(e['cut']==0 and e['vis']>0,'alçat sud: sense tall i amb arestes vistes')
    chk(e['boxHid']>0,'alçat sud: la caixa del darrere queda oculta pel mur (%d trams ocults a x=2)'%e['boxHid'])
    chk(abs(e['bb']['v1']-3.0)<0.35 and e['bb']['u0']<=-0.15+1e-6,'alçat sud: extensió correcta')
    # secció vertical pel mig
    ev("S.model.sections.push({id:S.model.nid++,name:'Secció A',o:[3,2,0],n:[1,0,0],on:false,flip:false})")
    s=ev("(()=>{const d=drawing2D(docView('cut:'+S.model.sections[0].id),{hidden:false});return {loops:d.cut.reduce((a,c)=>a+c.loops.length,0),area:d.cut.reduce((a,c)=>a+c.loops.reduce((s,l)=>{let ar=0;for(let i=0;i<l.length;i++){const p=l[i],q=l[(i+1)%l.length];ar+=p[0]*q[1]-q[0]*p[1];}return s+Math.abs(ar)/2;},0),0)};})()")
    # x=3: mur sud tallat per la finestra (0..0.9 i 2.1..3 → 2 contorns), mur nord (1), forjat (1), pilar (1)
    exps=0.3*(0.9+0.9)+0.3*3+4.0*0.2+0.4*3+2.0
    chk(s['loops']==6 and abs(s['area']-exps)<5e-3,'secció: 6 contorns i àrea %.4f m² (esperada %.4f)'%(s['area'],exps))
    # ratllat
    h=ev("hatchLines([[[0,0],[10,0],[10,10],[0,10]],[[4,4],[6,4],[6,6],[4,6]]],1,Math.PI/4).reduce((a,s)=>a+Math.hypot(s[2]-s[0],s[3]-s[1]),0)")
    chk(abs(h-96)<3,'ratllat amb forat: longitud total ≈ àrea/separació (%.2f)'%h)
    # làmina i formats
    sh=ev("(()=>{const s=docSheet(['plan:%s','cut:'+S.model.sections[0].id,'elev:S','elev:E'],{scale:100,hidden:true});return {W:s.W,H:s.H,fmt:s.fmt,n:s.prims.length,items:s.items.length};})()"%L0)
    chk(sh['items']==4 and sh['fmt'] in('A4','A3'),'làmina multivista 1:100 en %s amb 4 vistes'%sh['fmt'])
    sh50=ev("docSheet(['plan:%s'],{scale:20}).fmt"%L0); chk(sh50 in('A2','A1','A3'),'a 1:20 el full creix (%s)'%sh50)
    svg=ev("sheetSVG(docSheet(['plan:%s','elev:S'],{scale:100,hidden:true}))"%L0); open('/home/claude/g3d/out/doc.svg','w').write(svg)
    chk(svg.startswith('<svg') and 'stroke-dasharray' in svg and 'fill-rule="evenodd"' in svg and 'E 1:100' in svg,'SVG amb traços ocults, farciment i títol')
    import xml.dom.minidom; xml.dom.minidom.parseString(svg); chk(True,'SVG és XML vàlid')
    pdf=base64.b64decode(ev("(()=>{const u=sheetPDF(docSheet(['multi'].length?['plan:%s','cut:'+S.model.sections[0].id,'elev:S','elev:E']:[],{scale:100,hidden:true}));let s='';for(const b of u)s+=String.fromCharCode(b);return btoa(s);})()"%L0)); open('/home/claude/g3d/out/doc.pdf','wb').write(pdf)
    chk(pdf[:8]==b'%PDF-1.4' and pdf.rstrip().endswith(b'%%EOF'),'PDF amb capçalera i final')
    r=subprocess.run(['pdftoppm','-r','80','-png','/home/claude/g3d/out/doc.pdf','/home/claude/g3d/out/docpdf'],capture_output=True,text=True)
    chk(r.returncode==0 and not r.stderr.strip(),'el PDF es renderitza amb poppler sense avisos %s'%r.stderr[:120])
    dxf=ev("sheetDXF(docSheet(['plan:%s'],{scale:100,hidden:true}))"%L0); open('/home/claude/g3d/out/doc.dxf','w').write(dxf)
    chk(dxf.count('\nLINE\n')>20 and 'G-TALL' in dxf and dxf.rstrip().endswith('EOF'),'DXF amb línies per capes')
    xs=[float(x) for x in re.findall(r"\nLINE\n8\nG-TALL\n10\n([-\d.]+)",dxf)]; chk(max(xs)-min(xs)>6.2 and max(xs)-min(xs)<6.4,'DXF en metres reals (amplada del tall %.3f m)'%(max(xs)-min(xs)))
    # diàleg
    ev("docDlg()"); pg.wait_for_timeout(300); chk(pg.locator('#dcPrev svg').count()==1 and 'Full' in pg.inner_text('#dcInfo'),'diàleg amb vista prèvia')
    pg.select_option('#dcV','elev:S'); chk('línies' in pg.inner_text('#dcInfo'),'canvi de vista al diàleg')
    with pg.expect_download() as dl: pg.click('#dcPDF')
    chk(dl.value.suggested_filename.endswith('.pdf'),'descàrrega PDF: %s'%dl.value.suggested_filename)
    chk(not errs,'sense errors %s'%errs[:3])
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
