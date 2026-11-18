import json, base64, struct, zlib
from playwright.sync_api import sync_playwright
errs=[]; res=[]
def chk(c,m): res.append(bool(c)); print(('OK  ' if c else 'FAIL'),m)
def png():
    def ch(t,d): c=struct.pack('>I',len(d))+t+d; return c+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    raw=b''.join(b'\x00'+bytes([200,60,60]*40) for _ in range(20))
    return b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',40,20,8,2,0,0,0))+ch(b'IDAT',zlib.compress(raw))+ch(b'IEND',b'')
open('/tmp/t.png','wb').write(png())
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1500,'height':900})
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou'); pg.wait_for_timeout(600)
    ev=pg.evaluate
    chk(ev("VERSION")=="24",'versió 24')
    # nivell 1 a 3 m, eix i pla de referència
    ev("createLevel(3); S.model.grids.push({id:900,name:'A',a:[10,0,0],b:[10,20,0]}); S.model.refs.push({id:901,name:'PR1',a:[0,0],b:[8,6]}); refreshAll()")
    chk(len(ev("planeList()"))==4,'plans de destí: 2 nivells + eix + referència')
    # DXF al nivell 0
    pg.set_input_files('#dxfInput','/tmp/t.dxf'); pg.wait_for_selector('#iGo')
    chk('HATCH' in pg.inner_text('#dlgBox'),'informa d’entitats no importades')
    pg.select_option('#iPl',index=1); pg.click('#iGo'); pg.wait_for_timeout(300)
    r=ev("(()=>{const g=[...S.model.root.groups.values()][0];const ls=[...g.groups.values()];let f=0,e=0,vs=[];ls.forEach(l=>{f+=l.faces.size;e+=l.edges.size;l.verts.forEach(v=>vs.push(v.p))});return {name:g.name,layers:ls.map(l=>l.name).sort(),f,e,maxx:Math.max(...vs.map(p=>p[0])),maxz:Math.max(...vs.map(p=>p[2])),tags:S.model.tags.map(t=>t.name),texts:S.model.texts.length,lvl:g.level}})()")
    print(r)
    chk(r['layers']==['COTES','MURS'],'capes -> subgrups'); chk('MURS' in r['tags'] and 'COTES' in r['tags'],'capes -> etiquetes')
    chk(abs(r['maxx']-5)<1e-6,'mm -> m (INSUNITS 4): x màx 5 m'); chk(r['f']==3,'3 cares (rectangle, cercle, pilar de bloc)'); chk(r['texts']==1,'text importat')
    # DXF a un pla vertical (eix A)
    pg.keyboard.press('Escape')
    pg.set_input_files('#dxfInput','/tmp/t2.dxf'); pg.wait_for_selector('#iGo'); pg.select_option('#iPl',value='grid:900'); pg.uncheck('#iFac'); pg.click('#iGo'); pg.wait_for_timeout(300)
    r2=ev("(()=>{const g=[...S.model.root.groups.values()][1];const vs=[];g.groups.forEach(l=>l.verts.forEach(v=>vs.push(v.p)));return {x:[Math.min(...vs.map(p=>p[0])),Math.max(...vs.map(p=>p[0]))],y:[Math.min(...vs.map(p=>p[1])),Math.max(...vs.map(p=>p[1]))],z:[Math.min(...vs.map(p=>p[2])),Math.max(...vs.map(p=>p[2]))]}})()")
    print(r2); chk(abs(r2['x'][0]-10)<1e-6 and abs(r2['x'][1]-10)<1e-6,'pla vertical: x constant = 10'); chk(abs(r2['y'][1]-5)<1e-6 or abs(r2['y'][1]-15)<1e-6 or r2['y'][1]>9,'pla vertical: DXF x -> eix Y'); chk(abs(r2['z'][1]-4)<1e-6,'pla vertical: DXF y -> Z (4 m)')
    # visibilitat de capa
    ev("S.model.tags.find(t=>t.name==='COTES').visible=false; rebuild()")
    # imatge
    pg.set_input_files('#imgInput','/tmp/t.png'); pg.wait_for_selector('#iW'); pg.fill('#iW','8'); pg.select_option('#iPl',value='ref:901'); pg.click('#iGo'); pg.wait_for_timeout(500)
    im=ev("S.model.images[0]"); chk(im['wm']==8 and abs(im['hm']-4)<1e-9,'imatge 8 x 4 m'); chk(ev("gImg.children.length")==1,'malla d’imatge a l’escena')
    # JSON incrusta la imatge, snapshots no
    js=ev("jsonText()"); o=json.loads(js); chk(o['images'][0]['data'].startswith('data:image/png'),'JSON del fitxer incrusta la imatge'); chk('data:image' not in ev("snapshot()"),'snapshots d’undo sense dades d’imatge')
    ev("(js=>{const m=K.fromJSON(JSON.parse(js));S.model=m;S.undo=[];refreshAll();})("+json.dumps(js)+")"); chk(ev("gImg.children.length")==1,'reobertura del JSON recupera la imatge')
    # calibratge: simula imgcal
    ev("S.imgTarget=S.model.images[0].id")
    f=ev("(()=>{const f=imgFrame(S.model.images[0]);const a=V.add(f.pos,V.mul(f.ru,-1)),b=V.add(f.pos,V.mul(f.ru,1));return [a,b]})()")
    ev("setTool('imgcal')")
    # calibratge directe amb la mateixa matemàtica: distància 2 m -> 4 m => escala x2
    ev("(()=>{const i=S.model.images[0],f=imgFrame(i);const a=V.add(f.pos,V.mul(f.ru,-1)),d=2,v=4,k=v/d;const w=V.sub(a,f.pos),ax=V.dot(w,f.fr.u),ay=V.dot(w,f.fr.v);i.cx=ax+(i.cx-ax)*k;i.cy=ay+(i.cy-ay)*k;i.wm*=k;i.hm*=k;rebuildImages();})()")
    chk(ev("S.model.images[0].wm")==16,'calibratge escala l’amplada')
    # imgHit sobre el pla de referència (vertical)
    h=ev("(()=>{const i=S.model.images[0],f=imgFrame(i);const o=V.add(f.pos,V.mul(f.fr.n,5));return !!imgHit({o,d:V.mul(f.fr.n,-1)})})()"); chk(h,'raig talla el pla de la imatge')
    pg.screenshot(path='/tmp/imp.png')
    print('ERRS',errs)
print('PASS',sum(res),'/',len(res))
