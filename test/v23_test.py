from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
res={"ok":0,"fail":0}
def chk(c,m):
    res["ok" if c else "fail"]+=1; print(("OK  " if c else "FAIL")+" "+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1400,"height":860}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800); ev=lambda s: pg.evaluate(s)
    ev("createLevel(3.0); window.LV=S.model.levels.slice().sort((a,b)=>a.elev-b.elev).map(l=>l.id); setLevel(LV[0])")
    ev("setTool('stair')"); pg.locator('#view canvas').click(position={'x':300,'y':300}); pg.keyboard.press('l'); pg.wait_for_timeout(100)
    chk(ev("S.tool")=='stair' and ev("OPT.stairShape")=='L','tecla L amb l’eina Escala: tipus L, es manté l’eina')
    pg.keyboard.press('u'); chk(ev("S.tool")=='stair' and ev("OPT.stairShape")=='U','tecla U: tipus U, es manté l’eina')
    pg.keyboard.press('i'); chk(ev("S.tool")=='stair' and ev("OPT.stairShape")=='I','tecla I: tipus recta')
    pg.keyboard.press('p'); chk(ev("S.tool")=='pushpull','fora d’escala la tecla P torna a canviar d’eina')
    ev("setTool('stair')"); ev("OPT.stairShape='U'; OPT.stairW=1; OPT.stairG=0.28; OPT.stairT=0.15; OPT.stairGap=0.1")
    ev("window.E=makeStair([0,0],[5,0]); E.par.shape='U'; refreshAll()")
    chk(ev("solidVolume(E)")>1 and ev("parPdt(E.par)")=='.HALF_TURN_STAIR.','escala en U es regenera amb volum')
    # porta orientada en Y (com en molts SKP): ha de quedar sobre l’eix i fer el forat de 0,90
    ev("setTool('select'); createLevel(3.0)")
    ev("""window.W=makeWall([0,0],[4,0]); refreshAll(); window.DD={id:S.model.nid++,name:'PortaY',kind:'door',ifc:'IfcDoor',ver:1,size:[0.1,0.9,2.1],v:[[-0.05,0,0],[0.05,0,0],[0.05,0.9,0],[-0.05,0.9,0],[-0.05,0,2.1],[0.05,0,2.1],[0.05,0.9,2.1],[-0.05,0.9,2.1]],e:[],f:[{l:[0,1,2,3],h:[],m:null,n:[0,0,-1]},{l:[4,5,6,7],h:[],m:null,n:[0,0,1]}]}; compDefs().push(DD); window.DOOR=makeComp(DD,[2,0,0],W); refreshAll()""")
    chk(ev("DD.size[0]")==0.9 and ev("DD.size[1]")==0.1,'definició orientada en Y: es normalitza amb l’amplada en X')
    chk(abs(ev("DOOR.par.s")+0.45-2)<1e-6,'porta col·locada al mur (s=%s)'%ev("DOOR.par.s"))
    bb=ev("(()=>{const b=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(const v of DOOR.verts.values())for(let i=0;i<3;i++){b[i]=Math.min(b[i],v.p[i]);b[i+3]=Math.max(b[i+3],v.p[i]);}return b})()")
    chk(abs(bb[1]+0.05)<1e-3 and abs(bb[4]-0.05)<1e-3 and abs(bb[3]-bb[0]-0.9)<1e-3,'porta: centrada a l’eix (y ±0,05) i amplada 0,90 en X')
    chk(abs(ev("solidVolume(W)")-(4*0.3*3-0.9*2.1*0.3))<0.01,'el mur té el forat de la porta (volum %.3f)'%ev("solidVolume(W)"))
    chk(not errs,'sense errors %s'%errs[:3])
    b.close()
print(res)
