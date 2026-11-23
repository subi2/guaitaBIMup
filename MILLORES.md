# guaitaBIMup — document de millores (només pendents)

Actualitzat a la v0.50.0. El que ja s'ha fet es treu d'aquí.

## Interfície i caseta de vistes (Views House)

- [ ] **Eix Y positiu amagat pel sostre** de la caseta en algunes vistes (només es veu l'etiqueta).
- [ ] **Panell de vista i caixa de secció:** validar amb Magic Mouse i tàctil; les etiquetes de nivell del lliscador vertical s'amunteguen amb molts nivells; la planta en miniatura té un límit de 6.000 arestes.
- [ ] **Rails a 1280×720:** encara fan scroll (26 i 61 px).
- [ ] **Validar** tàctil, pantalles estretes i si cal canviar automàticament a la pestanya Info en seleccionar una entitat.

## BIM i planta

- [ ] **Dreceres per defecte** (pendent de decisió): conflictes amb Revit SP→SL «Divideix» i AR→«Matriu». Llista: RE, OC, PP, FM, RR, FH, PG, AR, PN, ZM, SL, ER, AN, MT, MF, PD, SB, BS, SC, IF, VP, ZF, ZR, OR, FL, RF, ST.
- [ ] **Rang de vista per categoria d'element** (substitucions com a Revit); ara hi ha una sola zona de profunditat per vista de planta.

## Escales

- [ ] **Escala de 4 trams en planta quadrada**, amb replans als cantons.
- [ ] **Amplada per tram** i **amplades diferents** dins una mateixa escala (també en L).
- [ ] **Angle de la L** lliure (no només 90°).

## Edició

- [ ] **Murs:** dividir, alinear, desfasar i simetria.
- [ ] **TR** en cares B-rep lliures; en cares laterals de cobertes i pilars; entre plans de referència i línies 3D.
- [ ] **TR de llosa amb vèrtex compartit:** inserir un vèrtex nou per no desplaçar la cara contigua.
- [ ] **Plans amb plans:** retallar cares entre elles.
- [ ] **Línies que formen part d'una cara:** ara no es modifiquen.
- [ ] **UN (desunir)** com a eina pròpia.
- [ ] **Còpia de nivells:** la geometria solta (fora de grups) no es copia amb «nivell i contingut».

## Plànols i publicació (compositor de nodes)

- [ ] **PDF 3D** (U3D/PRC; només Acrobat el mostra).
- [ ] **Anotació:** noms d'espai i cotes per element.
- [ ] **Caràtula:** quadre de revisions com a element propi; selecció múltiple a l'editor.
- [ ] **Plànols:** numeració automàtica quan comparteixen caràtula.
- [ ] **Branques del model:** la geometria solta de l'arrel continua visible encara que la vista vingui d'una branca.
- [ ] **Llenç:** les posicions dels nodes no entren a l'historial de desfer.

## Visibilitat i talla de components

- [ ] **Arestes d'alguns components que no es veuen:** repassar el comportament de talla i extensió quan se solapa amb un vèrtex (aresta que acaba o comença sobre un altre vèrtex de la mateixa cara o d'un component veí).

## Càmera cònica: fugues (després de v0.56.0)

- [ ] **Fugues en paper:** dibuixar les línies i marques de fuga a les vistes còniques dels plànols (PDF del compositor), amb l'opció per vista.
- [ ] **Imatge de fons al visor, al llenç o a la vista:** posar una foto darrere el model (opacitat, fixada a la càmera). És el pas previ al camera matching.
- [ ] **Camera matching:** traçar fugues sobre la foto i ajustar posició, mira i focal de la càmera perquè el model hi coincideixi.

## SKP: classificació IFC dels objectes importats

- [ ] **Categoria IFC als objectes del SKP:** `skpToModel` (src/app-sess.js) crea grups amb `ifc: null`; la capa només es converteix en etiqueta. Cal decidir si la classificació manual ha de ser per grup, per component o per entitat.
  - Referència (SketchUp Classifier): la classificació s'assigna a la definició del component i afecta totes les instàncies; en un grup o un component cal convertir la geometria en component abans de classificar-la. Format d'intercanvi: SKC i IFC.
  - Pendent de comprovar: si el Classificador IFC mostra els grups sense categoria en una llista pròpia, i si els components repetits del SKP (ara grups independents) haurien de compartir classificació.


## v0.58.0 · SKP: arestes suaus i suavitzades
- Es llegeixen les marques soft/smooth/hidden de les arestes del SKP (OpenSKP, definicions i instàncies imbricades) i s'etiqueten a l'import: soft/hidden → e.sf; smooth → e.sm (ombreig suau a través de l'aresta, sense dependre de l'angle).
- Pendent: marques en cares complexes triangulades pel soldat de vèrtexs, exportar sf/sm al SKP, instàncies compartides de components.
- Llicència: OpenSKP (lector del format SKP) ja és a l'aplicació; el format SKP és propietat de Trimble, ús per interoperabilitat; no és assessorament jurídic.
