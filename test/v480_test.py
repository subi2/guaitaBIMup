from playwright.sync_api import sync_playwright
import re
SETUP=re.search(r'SETUP="""(.*?)"""',open('/home/claude/g3d/test/v420_test.py').read(),re.S).group(1)
URL="file:///home/claude/g3d/out/guaitaBIMup_v0.48.0.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1600,"height":950}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+(e.stack or '')[:200]))
    pg.goto(URL); pg.wait_for_timeout(900); ev=pg.evaluate; ev(SETUP)
    chk(ev("VERSION")=='0.48.0','versió 0.48.0')
    ev("""(()=>{clr();S.model.views=[];const L=S.model.levels;if(L.length<2)L.push({id:S.model.nid++,name:'Nivell 1',elev:3});L.sort((a,b)=>a.elev-b.elev);
      const a=mk(0,0,0,4,0.2,3,'Mur A');a.ifc='IfcWall';a.level=L[0].id;const b2=mk(0,3,0,4,0.2,3,'Mur B');b2.ifc='IfcWall';b2.level=L[0].id;
      const c=mk(0,0,0,4,3.2,0.2,'Llosa');c.ifc='IfcSlab';c.level=L[0].id;const d=mk(6,0,0,1,1,1,'Caixa');d.level=L[0].id;window.IDS=[a.id,b2.id,c.id,d.id];rebuild();return 0})()""")
    ev("window.__d=[];deliver=async(n,d,m)=>{window.__d.push([n,typeof d==='string'?d:(d instanceof Uint8Array?Array.from(d.slice(0,0)).join()+String.fromCharCode.apply(null,Array.from(d)):'')]);return true};0")
    # arbre
    ev("window.M=GG().nodes.find(n=>n.t==='model');M.p.by='level>ifc';gTreeBuild(M);pubCompile();0")
    br=ev("GG().nodes.filter(n=>n.t==='branch').map(n=>[n.p.dim,n.p.val,gBranchEls(n.id).length])")
    chk(len(br)==1+3,'arbre Nivell › Classe: 1 nivell + 3 classes '+str(br))
    chk(ev("gBranchEls(GG().nodes.find(n=>n.t==='branch'&&n.p.val==='IfcWall').id).length")==2,'branca IfcWall = 2 elements')
    # canvi de criteri conserva/reconstrueix
    ev("M.p.by='ifc';gTreeBuild(M);0"); chk(ev("GG().nodes.filter(n=>n.t==='branch').length")==3,'reorganitza per classe')
    ev("M.p.by='level>ifc';gTreeBuild(M);0")
    # branca → vista: només aquells elements
    ev("""(()=>{window.BW=GG().nodes.find(n=>n.t==='branch'&&n.p.val==='IfcWall');window.VB=gAdd('base',0,0,{src:'plan:'+S.model.levels[0].id});gLink(BW.id,VB.id,'m');window.PP=gAdd('pub',0,0,{name:'Murs'});gLink(VB.id,PP.id,'v');pubCompile();return 0})()""")
    chk(sorted(ev("pubData().pubs.find(p=>p.id===PP.id).filter.only"))==sorted(ev("IDS.slice(0,2)")),'vista alimentada per branca = submodel')
    ev("(()=>{const p=pubData().pubs.find(p=>p.id===PP.id);window.__n=pubRender(p,()=>collectScene().length);return 0})()")
    chk(ev("__n")==2 and ev("collectScene().length")==4,'pubRender limita al submodel i restaura')
    # exportació IFC des de branca amb Psets
    ev("""(()=>{const g=S.model.root.groups.get(IDS[0]);g.psets={Pset_WallCommon:{IsExternal:true,FireRating:'EI60',ThermalTransmittance:0.35}};window.XI=gAdd('expm',0,0,{name:'murs',fmt:'ifc'});gLink(BW.id,XI.id,'s');pubCompile();return 0})()""")
    ev("gExport(XI)"); pg.wait_for_timeout(800)
    ifc=ev("window.__d.at(-1)[1]")
    chk("Pset_WallCommon" in ifc and "IFCBOOLEAN(.T.)" in ifc and "'EI60'" in ifc and "IFCREAL(0.35)" in ifc,'Psets a l’IFC')
    chk(ifc.count("IFCWALL")>=2 and "IFCSLAB" not in ifc,'IFC només amb la branca')
    # psets es desen
    js=ev("snapshot()"); chk('Pset_WallCommon' in js,'Psets es desen al .gbup.json')
    # reassignar: llosa → IfcWall
    ev("pushUndo();gAssign([IDS[2]],BW.id,false);0")
    chk(ev("S.model.root.groups.get(IDS[2]).ifc")=='IfcWall','reassigna classe arrossegant')
    ev("undo();0"); chk(ev("S.model.root.groups.get(IDS[2]).ifc")=='IfcSlab','desfer la reassignació')
    # copiar de nivell a nivell
    ev("M.p.by='level';gTreeBuild(M);0")
    has1=ev("GG().nodes.some(n=>n.t==='branch'&&n.p.val===String(S.model.levels[1].id))")
    if not has1:
        ev("(()=>{const n=gAdd('branch',0,0,{dim:'level',val:String(S.model.levels[1].id),key:'x'});gLink(M.id,n.id,'m');return 0})()")
    n0=ev("S.model.root.groups.size")
    ev("(()=>{const t=GG().nodes.find(n=>n.t==='branch'&&n.p.val===String(S.model.levels[1].id));pushUndo();window.__k=gAssign([IDS[0]],t.id,true);return 0})()")
    chk(ev("S.model.root.groups.size")==n0+1,'copia a un altre nivell')
    chk(ev("(()=>{const c=[...S.model.root.groups.values()].at(-1);return [c.level===S.model.levels[1].id, Math.abs(c.t[2]-3)<1e-6, !!c.psets]})()")==[True,True,True],'la còpia canvia de nivell, puja a la cota i conserva Psets')
    # anotació + caràtula ETSAB + logo
    ev("""(()=>{const pb=gIn(PP.id,'v')[0];window.AN=gAdd('ann',0,0,{dims:true,north:true,note:'Nota de prova',label:'PLANTA MURS'});gLink(VB.id,AN.id,'v');gLink(AN.id,PP.id,'v');
      window.SH=gAdd('sheet',0,0,{name:'L1',fmt:'A3'});gLink(PP.id,SH.id,'p');const c=document.createElement('canvas');c.width=40;c.height=20;const x=c.getContext('2d');x.fillStyle='#c00';x.fillRect(0,0,40,20);
      window.TT=gAdd('title',0,0,{tpl:'etsab',school:'ETSAB',course:'Projectes 3',title:'Murs',logo:{src:c.toDataURL('image/jpeg',0.9),w:40,h:20}});gLink(TT.id,SH.id,'t');window.XP=gAdd('exp2d',0,0,{name:'l1',fmt:'svg'});gLink(SH.id,XP.id,'s');pubCompile();return 0})()""")
    ev("window.__d=[];gExport(XP)"); pg.wait_for_timeout(1200); svg=ev("window.__d[0][1]")
    chk('PLANTA MURS' in svg and 'Nota de prova' in svg and '>N<' in svg,'anotació: rètol, nota i nord')
    chk('Projectes 3' in svg and '<image' in svg,'caràtula ETSAB amb logo (SVG)')
    chk(svg.count('#0E7C86')>=2,'cotes generals')
    ev("window.__d=[];XP.p.fmt='pdf';pubCompile();gExport(XP)"); pg.wait_for_timeout(1200); pdf=ev("window.__d[0][1]")
    chk('/DCTDecode' in pdf and '/Im0 Do' in pdf,'logo incrustat al PDF')
    # editor de làmina
    ev("pubOpen(SH.id);0"); pg.wait_for_timeout(400)
    ev("document.querySelector('[data-shedit]').click();0"); pg.wait_for_timeout(500)
    chk(ev("!!document.getElementById('gcSheet')") and ev("document.querySelectorAll('#gcSheet [data-item]').length")==1,'editor de làmina obert')
    r=ev("(()=>{const r=document.querySelector('#gcSheet [data-item] rect').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
    pg.mouse.move(*r); pg.mouse.down(); pg.mouse.move(r[0]+120,r[1]+60,steps=8); pg.mouse.up(); pg.wait_for_timeout(150)
    pos=ev("SH.p.pos&&SH.p.pos[PP.id]")
    chk(bool(pos),'arrossegar desa la posició '+str(pos))
    ev("pubCompile();window.__pl=pubSheetBuild(pubData().sheets.find(s=>s.id===SH.id)).place[0];0")
    chk(ev("__pl.x")==pos[0] and ev("__pl.y")==pos[1],'docSheet respecta la posició manual')
    pg.screenshot(path="/tmp/v480s.png")
    ev("document.getElementById('gcShDone').click();0")
    # UI arbre
    ev("M.p.by='level>ifc';gTreeBuild(M);GV.sel=new Set([GG().nodes.find(n=>n.t==='branch'&&n.p.val==='IfcWall').id]);GV.elem=IDS[0];pubDraw();0"); pg.wait_for_timeout(300)
    chk(ev("document.querySelectorAll('.gc-n[data-t=branch]').length")>=3,'branques visibles al llenç')
    chk(ev("!!document.querySelector('[data-psv=\"Pset_WallCommon.FireRating\"]')"),'inspector d’element amb Psets')
    ev("(()=>{const i=document.querySelector('[data-psv=\"Pset_WallCommon.FireRating\"]');i.value='EI90';i.dispatchEvent(new Event('change'));return 0})()")
    chk(ev("S.model.root.groups.get(IDS[0]).psets.Pset_WallCommon.FireRating")=='EI90','edita valor de Pset')
    ev("(()=>{document.getElementById('gcBP').value='Pset_Projecte';document.getElementById('gcBK').value='Fase';document.getElementById('gcBV').value='3';document.getElementById('gcBGo').click();return 0})()")
    chk(ev("IDS.slice(0,2).every(i=>S.model.root.groups.get(i).psets.Pset_Projecte.Fase===3)"),'propietat massiva a tota la branca (numèrica)')
    # drag & drop d'element amb HTML5
    ok=ev("""(()=>{const src=document.querySelector('.gc-n[data-t=branch] .gc-el');const tgt=[...document.querySelectorAll('.gc-n[data-t=branch]')].find(d=>gN(+d.dataset.node).p.val==='IfcSlab');if(!src||!tgt)return 'no';
      const dt=new DataTransfer();src.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));tgt.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));tgt.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));return +src.dataset.gel})()""")
    chk(ok!='no' and ev(f"S.model.root.groups.get({ok}).ifc")=='IfcSlab','arrossegar element a una altra branca')
    # plega arbre i compacte
    ev("M.p.tree=false;pubDraw();0"); chk(ev("document.querySelectorAll('.gc-n[data-t=branch]').length")>=1,'plegat: es mantenen les branques en ús')
    ev("GV.view.z=0.4;pubDraw();0"); chk(ev("document.querySelector('.gc-world').classList.contains('cmp')"),'mode compacte amb poc zoom')
    ev("GV.view.z=0.8;M.p.tree=true;GV.fitted=false;pubDraw();0"); pg.wait_for_timeout(1500); pg.screenshot(path="/tmp/v480.png")
    chk(len(errs)==0,'sense errors JS '+str(errs[:2]))
    b.close()
print(res)
