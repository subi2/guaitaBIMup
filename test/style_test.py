from playwright.sync_api import sync_playwright
from PIL import Image
import io, json
URL = "file:///home/claude/g3d/out/guaitaBIMup%2029.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append(m.text) if m.type=="error" else None)
    pg.goto(URL); pg.wait_for_timeout(800)
    ev=lambda s: pg.evaluate(s)
    def shot():
        pg.wait_for_timeout(350); im=Image.open(io.BytesIO(pg.locator("#viewWrap").screenshot())).convert("RGB"); w,h=im.size; return im.crop((0,40,int(w*0.72),h-70))
    dark=lambda im: sum(1 for v in im.getdata() if sum(v)<150)
    chk(ev("VERSION")=="29",'versió 27'); chk(ev("STYLES_BUILTIN.length")==8,'8 estils predefinits')
    # caixa 4x3x3 tancada, agrupada
    ev("(()=>{const c=S.model.root;const r=K.addPolyline(S.model,c,[[0,0,0],[4,0,0],[4,3,0],[0,3,0]],true);const f=r.faces[0];K.pushPull(S.model,c,f.id,3*(c.faces.get(f.id).n[2]>0?1:-1));const sel={faces:new Set(c.faces.keys()),edges:new Set(c.edges.keys()),groups:new Set()};const g=K.makeGroup(S.model,c,sel);g.ifc='IfcWall';window.GRP=g.id;refreshAll();fitView();})();0")
    pg.wait_for_timeout(600)
    for i in range(8):
        ev("useStyle(STYLES_BUILTIN[%d])"%i); pg.wait_for_timeout(150)
    chk(not errs,'tots els estils s’apliquen sense errors %s'%errs[:2])
    # compatibilitat
    ev("useStyle(STYLES_BUILTIN[0]); S.style.wire=true"); chk(ev("S.style.fa.mode")=='wire','accessor antic wire'); ev("S.style.wire=false;S.style.colorBy='ifc'"); chk(ev("S.style.fa.by")=='ifc','accessor antic colorBy')
    # gruix d'aresta
    ev("useStyle(STYLES_BUILTIN[1]); S.show.levels=false; S.style.ed.wp=1; S.style.ed.w=1; refreshAll()"); a=dark(shot())
    ev("S.style.ed.w=5; refreshAll()"); c=dark(shot())
    chk(c>a*2.5,'gruix d’aresta 5 px dibuixa més píxels foscos (%d → %d)'%(a,c))
    ev("S.style.ed.w=1; S.style.ed.wp=5; refreshAll()"); d=dark(shot())
    chk(d>a*1.3 and ev("gSil.children.length")==1,'perfil/silueta gruixut (%d → %d)'%(a,d))
    # línia oculta: cares del color del fons
    ev("useStyle(STYLES_BUILTIN[1]); S.show.levels=false; refreshAll()"); im=shot(); w,h=im.size
    wh=sum(1 for v in im.getdata() if v==(255,255,255)); chk(wh>0.9*w*h,'línia oculta: fons i cares blancs (%.2f)'%(wh/(w*h)))
    # arestes ocultes a traços
    ev("useStyle(STYLES_BUILTIN[1]); S.style.ed.hid='off'; refreshAll()"); a=sum(1 for v in shot().getdata() if v!=(255,255,255))
    ev("S.style.ed.hid='dash'; refreshAll()"); c=sum(1 for v in shot().getdata() if v!=(255,255,255))
    chk(ev("S.style.name")=='Línia oculta' and ev("STYLES_BUILTIN[1].ed.hid")=='dash' and c>a+30,'Línia oculta mostra les arestes ocultes a traços (%d → %d)'%(a,c))
    # tapa de secció
    ev("useStyle(STYLES_BUILTIN[2]); S.model.sections.push({id:S.model.nid++,name:'Secció 1',o:[2,0,0],n:[1,0,0],on:true,flip:false}); applyClips(); refreshAll()")
    chk(ev("gCaps.children.filter(o=>o.userData.st).length")==2 and ev("gCaps.children.filter(o=>o.userData.cap).length")==1,'stencil del sòlid tancat i tapa del pla')
    with_cap=dark(shot())
    ev("S.style.sec.fill='none'; refreshAll()"); no_cap=dark(shot())
    chk(with_cap>no_cap+500,'el tall es ratlla (%d → %d píxels)'%(no_cap,with_cap))
    chk(ev("gCaps.children.filter(o=>o.isLineSegments2).length")==1,'línia de tall calculada')
    ev("S.model.sections=[]; applyClips(); refreshAll()")
    # ombres
    ev("useStyle(STYLES_BUILTIN[6])"); s1=shot(); ev("S.style.sun.sh=false; refreshAll()"); s2=shot()
    from PIL import ImageChops
    df=sum(1 for v in ImageChops.difference(s1,s2).getdata() if sum(v)>40)
    chk(df>300,'ombres projectades canvien la imatge (%d píxels)'%df)
    sd=ev("sunDir({date:'06-21',hour:12,lat:41.4,north:0})"); chk(abs(sd['alt']-72.0)<0.6 and abs(sd['d'][0])<1e-6 and sd['d'][1]<0,'sol al migdia del solstici: altura %.1f°, al sud'%sd['alt'])
    sd=ev("sunDir({date:'12-21',hour:12,lat:41.4,north:0})"); chk(abs(sd['alt']-25.2)<0.6,'solstici d’hivern: altura %.1f°'%sd['alt'])
    sd=ev("sunDir({date:'03-21',hour:16,lat:41.4,north:0})"); chk(sd['d'][0]<0,'a la tarda el sol és a l’oest')
    # llegenda
    ev("useStyle(STYLES_BUILTIN[3])"); chk('Mur' in pg.inner_text('#styLegend') or 'Wall' in pg.inner_text('#styLegend'),'llegenda per classes IFC')
    # desar al model, biblioteca, exportar, importar
    ev("useStyle(STYLES_BUILTIN[2]); S.style.name='Plànol SBS'; S.style.ed.wc=6; saveStyleTo('model'); saveStyleTo('lib')")
    chk(ev("S.model.meta.styles.length")==1 and ev("libStyles().length")==1,'estil desat al model i a la biblioteca')
    chk(ev("(S.style.name='Treball', saveStyleTo('model'))")==False,'no es pot sobreescriure un predefinit')
    j=json.loads(ev("stylesJSON()")); chk(j['format']=='guaitabimup-styles' and j['styles'][0]['ed']['wc']==6,'exportació JSON d’estils')
    ev("S.style.name='Plànol SBS'; S.style.ed.wc=6")
    rt=ev("(()=>{const m=K.fromJSON(JSON.parse(snapshot()));return [m.meta.styles[0].name,m.meta.style.name,m.meta.style.ed.wc];})()")
    chk(rt==['Plànol SBS','Plànol SBS',6],'l’estil actiu i els del model es desen al fitxer %s'%rt)
    ev("localStorage.removeItem('guaitabimup.styles'); S.model.meta.styles=[]")
    n=ev("importStyles(%s,true)"%json.dumps(json.dumps(j))); chk(n==1 and ev("libStyles().length")==1 and ev("S.model.meta.styles.length")==1,'importació d’estils')
    # panell
    ev("TRAY.closed.delete('sty'); renderTray()"); pg.select_option('[data-sty="fa.mode"]','mono'); chk(ev("S.style.fa.mode")=='mono','el panell canvia el mode de cares')
    pg.select_option('#stySel','b1'); chk(ev("S.style.name")=='Línia oculta','selector d’estils')
    # escena desa l'estil
    ev("saveScene(); useStyle(STYLES_BUILTIN[0]); openView(S.view)"); chk(ev("S.style.name")=='Línia oculta','l’escena recorda el seu estil')
    chk(not errs,'sense errors %s'%errs[:3])
    print("RESULTAT %d ok %d fail"%(res["ok"],res["fail"])); b.close()
