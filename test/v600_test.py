from playwright.sync_api import sync_playwright
import re, base64
SETUP=re.search(r'SETUP="""(.*?)"""',open('/home/claude/g3d/test/v420_test.py').read(),re.S).group(1)
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.60.0.html"
# SKP sintètic escrit amb el mateix OpenSKP de l'app: grups, un component repetit, classes i propietats IFC
MK="""(()=>{const b=OpenSKP.create();const sq=(d,w,h)=>d.addFace([[0,0,0],[w,0,0],[w,h,0],[0,h,0]]);
 const fin=b.addComponentDefinition('Finestra',d=>d.addFace([[0,0,0],[40,0,0],[40,0,50],[0,0,50]]));
 const tau=b.addComponentDefinition('Taula',d=>sq(d,30,30));
 b.addGroup(d=>d.addFace([[0,0,0],[100,0,0],[100,0,100],[0,0,100]]),{name:'Mur',translation:[0,200,0],attributeDicts:[['AppliedSchemaTypes',{'IFC 4':'IfcWallStandardCase'}],['IFC 4',{Name:'M1',LoadBearing:'true'}]]});
 b.addGroup(d=>sq(d,20,20),{name:'Res',translation:[200,200,0]});
 b.addInstance(fin,{translation:[0,0,0]});b.addInstance(fin,{name:'Fin B',translation:[100,0,0]});b.addInstance(fin,{translation:[0,300,0]});
 b.addInstance(tau,{translation:[0,100,0],attributeDicts:[['AppliedSchemaTypes',{'IFC 2x3':'IfcFurniture'}]]});
 const x=b.toBytes();let s='';x.forEach(c=>s+=String.fromCharCode(c));return btoa(s)})()"""
IMP="""d=>{const b=Uint8Array.from(atob(d),c=>c.charCodeAt(0)).buffer;clr();const r=skpToModel(b,{level:null});rebuild();refreshAll();
 return {r:{n:r.groups.length,cls:r.classified,comps:r.comps},g:r.groups.map(g=>({id:g.id,name:g.name,ifc:g.ifc,kind:g.skp&&g.skp.kind,def:g.skp&&g.skp.def,props:g.skp&&g.skp.props||null}))}}"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1600,"height":950}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); ev=pg.evaluate; W=lambda t=250: pg.wait_for_timeout(t)
    pg.goto(URL+"?nou"); W(1000); ev(SETUP)
    chk(ev("VERSION")=='0.60.0','versió 0.60.0')
    chk(ev("typeof OpenSKP.SkpFile.fromBuffer(new ArrayBuffer(0)).buildInstancedScene")=='function' if False else ev("typeof OpenSKP.SkpFile.prototype.buildInstancedScene")=='function','OpenSKP 1.7.0: buildInstancedScene disponible')
    B=ev(MK); open('/tmp/t_v600.skp','wb').write(base64.b64decode(B))
    R=ev(IMP,B); G={x['name']:x for x in R['g']}; print(R['r'],[ (x['name'],x['ifc'],x['kind']) for x in R['g']])
    chk(R['r']['n']==6,'6 objectes: les 3 finestres no es fusionen (%d)'%R['r']['n'])
    chk(len([x for x in R['g'] if x['def']=='Finestra'])==3,'3 instàncies del component Finestra')
    chk(G['Mur']['kind']=='group' and G['Res']['kind']=='group','Mur i Res reconeguts com a grups')
    chk(all(x['kind']=='component' for x in R['g'] if x['def'] in ('Finestra','Taula')),'Finestra i Taula reconeguts com a components')
    chk(G['Mur']['ifc']=='IfcWall','classe del fitxer: IfcWallStandardCase → IfcWall')
    chk(G['Taula']['ifc']=='IfcFurniture','classe IFC 2x3 de la instància: IfcFurniture')
    chk(G['Mur']['props'] and G['Mur']['props'].get('Name')=='M1','propietats de l’esquema llegides (només lectura)')
    chk(R['r']['cls']==2 and R['r']['comps']==2,'recompte: 2 classificats, 2 components')
    # Info del grup
    fid=[x['id'] for x in R['g'] if x['def']=='Finestra']
    ev("clearSel();S.sel.groups.add(%d);refreshAll();refreshSel&&refreshSel();renderInfo();0"%fid[0]); W()
    txt=ev("$('infoBody').textContent")
    chk('Component SKP «Finestra»' in txt and 'Instàncies3' in txt.replace(' ',''),'Info: origen i nombre d’instàncies')
    chk(ev("!!$('gSkpAll')&&$('gSkpAll').checked"),'Info: opció «totes les instàncies» activa per defecte')
    # propagació
    ev("pushUndo();$('gIfc').value='IfcWindow';$('gIfc').dispatchEvent(new Event('change'));0"); W()
    chk(ev("[%s].every(id=>S.model.root.groups.get(id).ifc==='IfcWindow')"%','.join(map(str,fid))),'classificar una instància classifica les 3')
    ev("undo();0"); W()
    chk(ev("[%s].every(id=>!S.model.root.groups.get(id).ifc)"%','.join(map(str,fid))),'desfer torna les 3 a sense classe')
    ev("S.skpAll=false;setIfc([S.model.root.groups.get(%d)],'IfcDoor');0"%fid[1])
    chk(ev("[%s].map(id=>S.model.root.groups.get(id).ifc)"%','.join(map(str,fid)))==[None,'IfcDoor',None],'opció desmarcada: només aquella instància')
    ev("S.skpAll=true;setIfc([S.model.root.groups.get(%d)],null);0"%fid[1])
    # els grups no propaguen
    chk(ev("skpSiblings(S.model.root.groups.get(%d)).length"%G['Res']['id'])==0,'un grup SKP no té germans')
    # classificació assistida: una fila per component
    P=ev("buildProposals(loadRules()).map(p=>[p.nm,(p.gs||[]).length])"); print(P)
    chk(['Finestra ×3',3] in P,'proposta: les 3 finestres en una sola fila (×3)')
    ev("classDlg();0"); W()
    chk(ev("!!$('cFlt')"),'diàleg: filtre per origen')
    ev("$('cFlt').value='comp';$('cFlt').dispatchEvent(new Event('change'));$('cCalc').click();0"); W()
    rows=ev("[...document.querySelectorAll('#cProp .pr')].map(r=>r.querySelector('span').textContent)"); print(rows)
    chk(rows==['Finestra ×3'],'filtre «Components SKP»: només la fila del component pendent')
    ev("document.querySelector('#cProp select').value='IfcWindow';document.querySelector('#cProp select').dispatchEvent(new Event('change'));document.querySelector('#cProp input[type=checkbox]').checked=true;document.querySelector('#cProp input[type=checkbox]').dispatchEvent(new Event('change'));$('cApply').click();0"); W()
    chk(ev("[%s].every(id=>S.model.root.groups.get(id).ifc==='IfcWindow')"%','.join(map(str,fid))),'aplicar la fila classifica les 3 instàncies')
    # desar i tornar a obrir
    rt=ev("(()=>{const m=K.fromJSON(JSON.parse(JSON.stringify(K.toJSON(S.model))));const g=[...m.root.groups.values()].find(x=>x.name==='Mur');return g.skp&&g.skp.kind==='group'&&g.skp.props.Name==='M1'})()")
    chk(rt,'origen SKP i propietats es conserven en desar')
    # exportar a SKP i tornar a importar: classe i grup
    B2=ev("(()=>{const x=buildSKP(sceneStats().all,{});let s='';x.bytes.forEach(c=>s+=String.fromCharCode(c));return btoa(s)})()")
    R2=ev(IMP,B2); print([(x['name'],x['ifc'],x['kind']) for x in R2['g']])
    chk(len([x for x in R2['g'] if x['ifc']=='IfcWindow'])==3 and any(x['ifc']=='IfcWall' for x in R2['g']),'exporta i reimporta: les classes es conserven')
    chk(all(x['kind']=='group' for x in R2['g']),'l’exportació de guaitaBIMup surt com a grups')
    # avís de tercers actualitzat
    html=open('/home/claude/g3d/out/guaitaBIMup_v0.60.0.html').read()
    chk('OpenSKP 1.7.0' in html and 'earcut 3.2.4' in html and '---- Three.js r160 (MIT) ----' in html and 'Carregats en execució des de CDN' not in html,'avisos de tercers actualitzats (OpenSKP 1.7.0, earcut 3.2.4, Three.js)')
    chk(not errs,'sense errors JS %s'%errs)
print(res)
