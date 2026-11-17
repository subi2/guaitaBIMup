const fs=require('fs');const r=f=>fs.readFileSync(f,'utf8');
const lic=`<!--
SPDX-License-Identifier: AGPL-3.0-only
guaitaBIMup 29 — © SBS BiM Consulting, Jordi Subirós
Inclou Three.js r160 (MIT) © 2010-2023 three.js authors.
-->`;
const html=`<!DOCTYPE html>
${lic}
<html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>guaitaBIMup 29</title>
<style>
${r('src/style.css')}
</style><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png" type="image/png"><link rel="apple-touch-icon" href="icon-192.png"><script>if("serviceWorker" in navigator){addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));}</script></head><body>
${r('src/body.html')}
<script>/* three.js r160 — MIT License — Copyright © 2010-2023 three.js authors */
${r('dist/three.bundle.js').replace(/<\/script/g,'<\\/script')}
</script>
<script>
${r('dist/third-party-skp.txt').replace(/<\/script/g,'<\\/script')}
${r('dist/openskp.bundle.js').replace(/<\/script/g,'<\\/script')}
</script>
<script>
// SPDX-License-Identifier: AGPL-3.0-only
${r('src/kernel.js').replace(/if \(typeof module[^\n]*\n/,'')}
${r('src/app-core.js')}
${r('src/app-tools.js')}
${r('src/app-ext.js')}
${r('src/app-import.js')}
${r('src/app-export.js')}
${r('src/app-ctx.js')}
${r('src/app-bool.js')}
${r('src/app-skp.js')}
${r('src/app-class.js')}
${r('src/app-sel.js')}
${r('src/app-opt.js')}
${r('src/app-style.js')}
${r('src/app-par.js')}
${r('src/app-comp.js')}
${r('src/app-roof.js')}
${r('src/app-stair.js')}
${r('src/app-bsec.js')}
${r('src/app-grip.js')}
${r('src/app-doc.js')}
${r('src/app-ui.js')}
</script></body></html>`;
fs.mkdirSync('out',{recursive:true});fs.writeFileSync('out/guaitaBIMup 29.html',html);
// extreu JS per a node --check
fs.writeFileSync('out/_app.js',html.split('<script>').slice(2).join('').replace(/<\/script>[\s\S]*$/,''));
console.log('OK',(html.length/1024|0)+' kb');
