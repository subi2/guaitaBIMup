const fs=require('fs');const r=f=>fs.readFileSync(f,'utf8');
const VER=r('src/app-core.js').match(/const VERSION = '([^']+)'/)[1];
const lic=`<!--
SPDX-License-Identifier: AGPL-3.0-only
guaitaBIMup v${VER} — © SBS BiM Consulting, Jordi Subirós
Inclou Three.js r160 (MIT) © 2010-2023 three.js authors.
-->`;
const html=`<!DOCTYPE html>
${lic}
<html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>guaitaBIMup v${VER}</title><link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' rx='96' fill='%23111318'/><polygon points='110,250 250,250 250,110 110,170' fill='%23D7F74A'/><polygon points='262,250 402,250 402,170 262,110' fill='%23FF2DCB'/><rect x='110' y='262' width='140' height='140' fill='%2300E5FF'/><rect x='262' y='262' width='140' height='140' fill='%23FFE100'/></svg>" type="image/svg+xml">
<style>
${r('src/style.css')}
</style></head><body>
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
${r('src/app-mod.js')}
${r('src/app-keys.js')}
${r('src/app-skp.js')}
${r('src/app-class.js')}
${r('src/app-sel.js')}
${r('src/app-opt.js')}
${r('src/app-style.js')}
${r('src/app-lines.js')}
${r('src/app-pub.js')}
${r('src/app-pubg.js')}
${r('src/app-par.js')}
${r('src/app-comp.js')}
${r('src/app-roof.js')}
${r('src/app-stair.js')}
${r('src/app-bsec.js')}
${r('src/app-cam.js')}
${r('src/app-grip.js')}
${r('src/app-doc.js')}
${r('src/app-taller.js')}
${r('src/app-sess.js')}
${r('src/app-dock.js')}
${r('src/app-ui.js')}
</script></body></html>`;
fs.mkdirSync('out',{recursive:true});fs.writeFileSync(`out/guaitaBIMup_v${VER}.html`,html);
// extreu JS per a node --check
fs.writeFileSync('out/_app.js',html.split('<script>').slice(2).join('').replace(/<\/script>[\s\S]*$/,''));
console.log('OK',(html.length/1024|0)+' kb');
