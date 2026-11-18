from playwright.sync_api import sync_playwright
errs=[]; res=[]
def chk(c,m): res.append(bool(c)); print(('OK  ' if c else 'FAIL'),m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1500,'height':900})
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou'); pg.wait_for_timeout(600)
    ev=pg.evaluate
    chk(ev("VERSION")=="24",'versió 24'); chk(ev("TOLB()")==1e-6,'tolerància per defecte 1e-6')
    ev("""window.mkBox=(x,y,z,w,d,h,ifc)=>{const c=S.model.root;const n0=c.faces.size;K.addPolyline(S.model,c,[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],true);
      const f=[...c.faces.values()][0];K.pushPull(S.model,c,f.id,h);
      clearSel();c.faces.forEach(f=>S.sel.faces.add(f.id));c.edges.forEach(e=>S.sel.edges.add(e.id));const g=doGroup();g.ifc=ifc||null;clearSel();return g.id;};0""")
    def setup(a,bx):
        ev("S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();S.model.root.groups.clear();clearSel()")
        ia=ev(f"mkBox({a[0]},{a[1]},{a[2]},{a[3]},{a[4]},{a[5]},'IfcWall')"); ib=ev(f"mkBox({bx[0]},{bx[1]},{bx[2]},{bx[3]},{bx[4]},{bx[5]})")
        ev(f"clearSel();S.sel.groups.add({ia});S.sel.groups.add({ib});refreshSel()")
    def vols(): return ev("[...S.model.root.groups.values()].map(g=>[g.name,g.ifc,Math.round(solidVolume(g)*1e6)/1e6,[...g.faces.values()].length])")
    A=(0,0,0,4,3,2); B=(3,1,0,3,1,2)
    setup(A,B); chk(sorted([v[2] for v in vols()])==[6,24],'sòlids inicials 24 i 6 '+str(vols()))
    ev("boolOp('union')"); v=vols(); chk(len(v)==1 and abs(v[0][2]-28)<1e-6,'unió = 28 '+str(v)); chk(v[0][1]=='IfcWall','hereta classe IFC d’A')
    setup(A,B); ev("boolOp('intersect')"); v=vols(); chk(len(v)==1 and abs(v[0][2]-2)<1e-6,'intersecció = 2 '+str(v))
    setup(A,B); ev("boolOp('subtract')"); v=vols(); chk(len(v)==1 and abs(v[0][2]-22)<1e-6,'resta = 22 '+str(v))
    setup(A,B); ev("boolOp('trim')"); v=vols(); chk(len(v)==2 and sorted(x[2] for x in v)==[6,22],'retall conserva B '+str(v))
    setup(A,B); ev("boolOp('split')"); v=vols(); chk(sorted(round(x[2],6) for x in v)==[2,4,22],'divisió 2/22/4 '+str(v))
    # túnel: caixa que travessa A -> obertura (cares amb forats)
    setup(A,(1,-1,0.5,1,5,1)); ev("boolOp('subtract')"); v=vols(); chk(len(v)==1 and abs(v[0][2]-21)<1e-6,'túnel = 21 '+str(v))
    chk(ev("(()=>{const g=[...S.model.root.groups.values()][0];const a={faces:[],edges:[]};flatInto(g,[0,0,0],a);return weldElement({faces:a.faces,edges:[]}).closed})()"),'resultat del túnel tancat')
    # sòlid empotrat dins: resta -> forat intern (cavitat)
    setup(A,(1,1,0.5,1,1,1)); ev("boolOp('union')"); v=vols(); chk(len(v)==1 and abs(v[0][2]-24)<1e-6,'unió amb sòlid interior = 24 '+str(v))
    # no tancat
    ev("S.model.root.faces.clear();S.model.root.edges.clear();S.model.root.verts.clear();S.model.root.groups.clear();clearSel()")
    # configuració
    ev("configDlg()"); pg.fill('#cTol','1e-5'); pg.click('#cOk'); chk(ev("TOLB()")==1e-5,'configuració aplica 1e-5')
    ev("configDlg()"); pg.fill('#cTol','abc'); pg.click('#cOk'); chk('no vàlid' in ev("document.getElementById('cErr').textContent"),'rebutja valor no vàlid')
    pg.click('#cDef'); pg.click('#cOk'); chk(ev("TOLB()")==1e-6 and ev("S.model.meta.tol")==None,'per defecte 1e-6')
    ev("S.model.meta.tol=1e-4"); chk(ev("K.fromJSON(JSON.parse(JSON.stringify(K.toJSON(S.model)))).meta.tol")==1e-4,'tolerància es desa amb el model')
    print('ERRS',errs)
print('PASS',sum(res),'/',len(res))
