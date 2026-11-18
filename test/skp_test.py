import json
from playwright.sync_api import sync_playwright
errs=[]; res=[]
def chk(c,m): res.append(bool(c)); print(('OK  ' if c else 'FAIL'),m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1500,'height':900})
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou'); pg.wait_for_timeout(700); ev=pg.evaluate
    chk(ev("VERSION")=="24",'versió 24'); chk(ev("typeof OpenSKP.create")=='function','OpenSKP incrustat')
    ev("""window.mkBox=(x,y,z,w,d,h,ifc)=>{const c=S.model.root;K.addPolyline(S.model,c,[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],true);
      const f=[...c.faces.values()][0];K.pushPull(S.model,c,f.id,h);clearSel();c.faces.forEach(f=>S.sel.faces.add(f.id));c.edges.forEach(e=>S.sel.edges.add(e.id));const g=doGroup();g.ifc=ifc||null;clearSel();return g.id;};0""")
    ev("""(()=>{const t={id:S.model.nid++,name:'Estructura',color:'#E53935',visible:true};S.model.tags.push(t);
      S.model.materials.push({name:'Formigo',color:'#9AA0A6'});
      const a=mkBox(0,0,0,4,3,2.5,'IfcWall'); mkBox(6,0,0,2,2,3,'IfcColumn'); mkBox(10,0,0,3,3,1,null);
      const c=S.model.root; c.groups.get(a).tag=t.id; c.groups.get(a).name='Mur nord';
      K.addPolyline(S.model,c,[[0,6,0],[2,6,0],[2,8,0],[0,8,0]],true); refreshAll();})()""")
    # buit al mur: resta d'una caixa que el travessa -> cares amb forats
    ev("""(()=>{const c=S.model.root;const a=[...c.groups.keys()][0];const t=mkBox(1,-1,0.5,1,5,1);clearSel();S.sel.groups.add(a);S.sel.groups.add(t);boolOp('subtract');})()""")
    n=ev("sceneStats().bim.length"); chk(n>=2,'elements BIM '+str(n))
    r=ev("(()=>{const x=buildSKP(sceneStats().all,{});return {len:x.bytes.length,notes:x.notes,groups:x.groups,faces:x.faces,layers:x.layers,mats:x.materials,ver:x.ver}})()"); print(r)
    chk(r['len']>1000,'fitxer generat'); chk(r['ver'] and r['ver'].get('ok'),'relectura OpenSKP: àrea coincideix amb el model'); chk(r['groups']>=3,'grups escrits')
    b64=ev("(()=>{const x=buildSKP(sceneStats().bim,{});let s='';x.bytes.forEach(c=>s+=String.fromCharCode(c));return btoa(s)})()")
    import base64; open('/tmp/t_bim.skp','wb').write(base64.b64decode(b64))
    b64=ev("(()=>{const x=buildSKP(sceneStats().all,{});let s='';x.bytes.forEach(c=>s+=String.fromCharCode(c));return btoa(s)})()")
    open('/tmp/t_all.skp','wb').write(base64.b64decode(b64))
    ev("exportDlg('skp')"); chk(ev("!!document.getElementById('xScope')"),'diàleg SKP'); 
    ev("S.model.root.groups.size||0"); 
    ev("var c=S.model.root;K.addPolyline(S.model,c,[[0,0,0],[2,0,0],[2,2,0],[0,2,0]],true);clearSel();c.faces.forEach(f=>S.sel.faces.add(f.id));c.edges.forEach(e=>S.sel.edges.add(e.id));doGroup()")
    pg.click('#xGo'); pg.wait_for_timeout(800)
    nt=ev("document.getElementById('dlgBox').textContent"); print(nt)
    chk('Error' not in nt and 'Escrit' in nt,'el diàleg genera l’SKP sense error (fmt)')
    print('ERRS',errs)
print('PASS',sum(res),'/',len(res))
