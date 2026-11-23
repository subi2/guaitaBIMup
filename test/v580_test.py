from playwright.sync_api import sync_playwright
import re, math, base64
SETUP=re.search(r'SETUP="""(.*?)"""',open('/home/claude/g3d/test/v420_test.py').read(),re.S).group(1)
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.58.0.html"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1600,"height":950}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); ev=pg.evaluate
    pg.goto(URL+"?nou"); pg.wait_for_timeout(1000); ev(SETUP)
    chk(ev("VERSION")=='0.58.0','versió 0.58.0')
    # skpEdgeMarks amb parse() fals: definició amb 1 aresta suau; instància girada 90° sobre Z i desplaçada
    r=ev("""()=>{const d={vertices:[{id:1,x:0,y:0,z:0},{id:2,x:39.37007874,y:0,z:0},{id:3,x:0,y:39.37007874,z:0}],edges:[{id:1,v1Id:1,v2Id:2,soft:true,smooth:true,hidden:false},{id:2,v1Id:1,v2Id:3,soft:false,smooth:false,hidden:true},{id:3,v1Id:2,v2Id:3,soft:false,smooth:false,hidden:false}],instances:[]};
      const outer={vertices:[],edges:[],instances:[{refIdx:5,matrix:[0,1,0,-1,0,0,0,0,1,100,0,0,1]}]};
      const root={vertices:[],edges:[],instances:[{refIdx:7,matrix:[1,0,0,0,1,0,0,0,1,0,0,39.37007874,1]}]};
      const mid={vertices:[],edges:[],instances:[{refIdx:5,matrix:[0,1,0,-1,0,0,0,0,1,0,0,0,1]}]};
      const m={root,definitions:new Map([[7,mid],[5,d]])};
      return skpEdgeMarks({parse:()=>m}).map(x=>({a:x.a.map(v=>+v.toFixed(4)),b:x.b.map(v=>+v.toFixed(4)),soft:x.soft,smooth:x.smooth}))}""")
    print(r)
    chk(len(r)==2,'2 marques (suau+oculta); la tercera aresta no en té')
    s=[x for x in r if x['smooth']][0]
    # rotació 90° sobre Z: (1,0,0)->(0,1,0) amb la convenció fila-major; z desplaçat 1 m
    chk(s['soft'] and abs(s['a'][2]-1)<1e-4 and abs(s['b'][2]-1)<1e-4 and abs(math.dist(s['a'],s['b'])-1)<1e-3,'longitud 1 m i alçada 1 m composades per instàncies imbricades (%s)'%s)
    # aplicació a un grup: cub 1 m amb una aresta marcada
    r2=ev("""()=>{clr();mk(0,0,0,1,1,1,'C');const g=[...S.model.root.groups.values()][0];
      const es=[...g.edges.values()].map(e=>[g.verts.get(e.a).p,g.verts.get(e.b).p]);const t=es[0];
      const n=skpApplyMarks(g,[{a:t[0].slice(),b:t[1].slice(),soft:true,smooth:true},{a:[9,9,9],b:[9,9,10],soft:true,smooth:false}]);
      return {n,sf:[...g.edges.values()].filter(e=>e.sf).length,sm:[...g.edges.values()].filter(e=>e.sm).length}}""")
    chk(r2['n']==1 and r2['sf']==1 and r2['sm']==1,'només s’etiqueta l’aresta coincident (%s)'%r2)
    # serialització
    ev("()=>{clr();mk(0,0,0,1,1,1,'C');const g=[...S.model.root.groups.values()][0];const e=[...g.edges.values()][0];e.sf=1;e.sm=1;}")
    r4=ev("""()=>{const g=[...S.model.root.groups.values()][0];const e=[...g.edges.values()].find(e=>e.sm);const gj=JSON.stringify(K.toJSON(S.model));const m2=K.fromJSON(JSON.parse(gj));const g2=[...m2.root.groups.values()][0];const e2=g2.edges.get(e.id);return !!(e2&&e2.sm===1&&e2.sf===1)}""")
    chk(r4,'sf i sm sobreviuen a la serialització')
    # ombreig: cilindre amb arestes marcades facetat vs suau
    r5=ev("""()=>{clr();mk(0,0,0,1,1,1,'C');const g=[...S.model.root.groups.values()][0];S.style.ed.sm=true;S.style.ed.soft=20;
      const f=[...g.faces.values()][0];const vid=f.loop[0];
      const base=smoothN(g,f,vid);SMOC.delete(g);
      const g2faces=[...g.faces.values()].filter(h=>h!==f&&h.loop.includes(vid));
      // aresta compartida entre f i una veïna
      const nb=g2faces[0];const sh=f.loop.filter(v=>nb.loop.includes(v));const e=[...g.edges.values()].find(e=>sh.includes(e.a)&&sh.includes(e.b));
      e.sm=1;SMOC.delete(g);const sm=smoothN(g,f,vid);e.sm=2;SMOC.delete(g);const fac=smoothN(g,f,vid);
      return {base,sm,fac,fn:f.n}}""")
    chk(r5['base']==r5['fn'] and r5['sm']!=r5['fn'] and r5['fac']==r5['fn'],'e.sm=1 força ombreig suau a 90°; e.sm=2 el manté facetat (%s)'%r5)
    # SKP reals sense marques: no peten
    for f in ['/tmp/t.skp','/tmp/t_all.skp','/tmp/t_bim.skp','/home/claude/ingelibre/ingetrazo/tests/data/test_export.skp']:
        d=base64.b64encode(open(f,'rb').read()).decode()
        o=ev("""d=>{const b=Uint8Array.from(atob(d),c=>c.charCodeAt(0)).buffer;clr();const r=skpToModel(b,{level:null});return r.groups.length}""",d)
        chk(o>=1,'importa %s'%f.split('/')[-1])
    chk(not errs,'sense errors JS %s'%errs)
print(res)
