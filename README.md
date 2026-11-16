# guaitaBIMup

Modelador 3D tipus SketchUp amb eines BIM, de la suite Guaita Apps. És un fitxer HTML autònom: s'obre al navegador sense instal·lació.

## Obrir-lo

Obre `guaitaBIMup.html` amb un navegador modern (Chrome, Edge, Firefox o Safari). No cal connexió a internet.

## Desenvolupament

El codi font és a `src/`. Per generar l'HTML:

```bash
node build.js
```

El resultat va a `out/guaitaBIMup N.html`, on N és la versió indicada a `src/app-core.js`.

## Estat

Versió 29. Llengua de la interfície: català, en fase inicial.

## Llicència

AGPL-3.0-only. Copyright (C) 2026 subi2 i col·laboradors de guaitaBIMup. Text complet a `LICENSE`. Els components de tercers, amb les seves llicències, són a `dist/third-party-skp.txt`.
