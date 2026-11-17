<!-- SPDX-License-Identifier: AGPL-3.0-only · Copyright (c) 2026 subi2 i col·laboradors de guaitaBIMup -->

# guaitaBIMup

[Català](#català) · [English](#english)

---

## Català

Modelador 3D tipus SketchUp amb eines BIM. Un sol fitxer HTML, sense núvol ni CDN.

### Instal·la-la com a aplicació (PWA)

Obre `pagescat/index.html` des d'una adreça HTTPS (per exemple GitHub Pages) amb Chrome o Edge i tria «Instal·la». Obert directament des de `file://` funciona com una pàgina normal, però no com a PWA.

### Funcions

Navegació configurable, dibuix amb snaps (final, punt mig, creuaments), eixos de pilars, murs, forjats, pilars, obertures amb forat real, escales rectes, en L i en U, components amb eixos, seccions BIM i estils de visualització. Exportació IFC i DXF.

### Fitxers

| Fitxer | Per a què |
|---|---|
| `pagescat/index.html` | L'aplicació (català) |
| `pagescat/HLP_guaitaBIMup-ajuda.html` | Ajuda d'ús (català) |
| `pagescat/manifest.webmanifest`, `sw.js`, `icon-*.png` | Fitxers PWA; estan a la mateixa carpeta que l'aplicació |
| `LICENSE` | AGPL-3.0-only |
| `src/`, `build.js`, `dist/` | Codi font i generació de l'HTML |

### Ús

Obre `pagescat/index.html` al navegador. Per generar-lo des del codi: `node build.js` (sortida a `out/`).

### Limitacions conegudes

- La interfície és només en català.
- Els snaps de centre, quadrant i tangent d'arcs depenen de les metadades dels arcs (pendent).

### Contribuir i llicència

Copyright (c) 2026 subi2 i col·laboradors de guaitaBIMup. Llicència AGPL-3.0-only, text complet a `LICENSE`. Els components de tercers i les seves llicències són a `dist/third-party-skp.txt`.

---

## English

Single-file 3D modeller with BIM tools, in the style of SketchUp. No cloud and no CDN.

### Install as an app (PWA)

Open `pagescat/index.html` from an HTTPS address (for example GitHub Pages) in Chrome or Edge and choose «Install». Opened directly from `file://` it works as a normal page, but not as a PWA.

### Files

| File | Purpose |
|---|---|
| `pagescat/index.html` | The application (Catalan) |
| `pagescat/HLP_guaitaBIMup-ajuda.html` | User guide (Catalan) |
| `pagescat/manifest.webmanifest`, `sw.js`, `icon-*.png` | PWA files, kept next to the application |
| `LICENSE` | AGPL-3.0-only |

### Licence

Copyright (c) 2026 subi2 and contributors to guaitaBIMup. Licensed under AGPL-3.0-only; full text in `LICENSE`.

> English version of the interface and guide: pending (`pageseng/`).
