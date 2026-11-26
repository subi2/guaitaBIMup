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

## SKP: classificació IFC (v0.60.0 fet; pendents)
- Fet: lector OpenSKP 1.7.0 (`buildInstancedScene` + `parse`); una instància de primer nivell = un grup (els components repetits ja no es fusionen pel nom); origen `g.skp = {kind: group|component, def, defId, schema, props}`; classe de `AppliedSchemaTypes` (i de `guaitaBIMup.ifc_class` en reimportar exportacions pròpies); StandardCase/ElementedCase → classe base; la classe d'una instància s'aplica a totes les del component (opció a Info); classificació assistida agrupa instàncies i filtra per origen.
- [ ] **Validar amb un SKP real classificat amb SketchUp** (2021+ i anterior). Només s'ha provat amb fitxers sintètics escrits amb OpenSKP.
- [ ] **Classe a la definició en fitxers antics (≤2020):** OpenSKP 1.7.0 només dona els atributs de definició en fitxers 2021+ (VFF); en fitxers antics només es llegeixen els de la instància.
- [ ] **Exportació SKP:** escriure la classe a `AppliedSchemaTypes` perquè SketchUp la reconegui, i exportar components com a components (ara tot surt com a grups).
- [ ] **Propietats IFC del SKP com a Psets editables** (ara només lectura).
- [ ] **Instàncies imbricades:** només es reconeix l'origen del primer nivell; els components dins de grups queden fusionats al grup pare.

## v0.58.0 · SKP: arestes suaus i suavitzades
- Es llegeixen les marques soft/smooth/hidden de les arestes del SKP (OpenSKP, definicions i instàncies imbricades) i s'etiqueten a l'import: soft/hidden → e.sf; smooth → e.sm (ombreig suau a través de l'aresta, sense dependre de l'angle).
- Pendent: marques en cares complexes triangulades pel soldat de vèrtexs, exportar sf/sm al SKP, instàncies compartides de components.
- Llicència: OpenSKP (lector del format SKP) ja és a l'aplicació; el format SKP és propietat de Trimble, ús per interoperabilitat; no és assessorament jurídic.

## Importador d'IFC (ajornat)
- Passa a «més endavant»: ja no és la v0.59.0. Pla ja escrit: nivells `IfcBuildingStorey`, classes IFC, quantitats i Psets, geolocalització (`IfcMapConversion`); lector candidat web-ifc (llicència per verificar); estudiar l'export IFC i el format .igz d'IngeTrazo amb IFC i .igz d'exemple de l'usuari.

## v0.59.0 · retall de planta i càmera cònica al menú de vista (fet)
- Pestanya de planta amb icona de retall: clic = activa/desactiva (manual); Maj+clic = automàtic. En automàtic, el retall només és actiu amb la càmera gairebé zenital (< 15° del zenit); en girar, el model es veu complet. Obrir una altra vista reinicia l'estat. Les escenes amb vista base de planta conserven el retall.
- Panell «Vista» (caseta de vistes): botó «Càmera cònica…» sota la projecció; passa a cònica i obre el control de càmera.
- Multivista (visor dividit en 2, 3 o 4): descartada de moment; es manté un sol viewport. Implicacions a anotar si es reprèn: `CAM`/`cam` globals, `renderer.clippingPlanes` global, siluetes, línies, etiquetes, nodes, símbol de càmera, cub i eines assumeixen una sola càmera.
