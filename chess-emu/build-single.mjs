// Genera dist/appsscript/index.html: toda la web en un único fichero HTML
// (para Google Apps Script o cualquier sitio donde solo se pueda pegar un HTML).
// Uso: node build-single.mjs   (requiere esbuild: npm i -D esbuild)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const out = 'dist/appsscript';
mkdirSync(out, { recursive: true });

const engine = await build({ entryPoints: ['engine.worker.js'], bundle: true, format: 'iife', globalName: 'ChessEngine', write: false, minify: false, target: 'es2020' });
const engineSrc = engine.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const app = await build({ entryPoints: ['app.js'], bundle: true, format: 'iife', write: false, minify: false, target: 'es2020' });
const appSrc = app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
let single = html
  .replace('<link rel="stylesheet" href="style.css">', `<style>\n${css}\n</style>`)
  .replace(/<link rel="canonical"[^>]*>\s*/, '')
  .replace('<script type="module" src="app.js"></script>',
    `<script type="text/plain" id="engineSrc">\n${engineSrc}\n</script>\n` +
    `<script>window.__ENGINE_SOURCE = document.getElementById('engineSrc').textContent;</script>\n` +
    `<script>\n${engineSrc}\nwindow.ChessEngine = ChessEngine;\n</script>\n` +
    `<script>\n${appSrc}\n</script>`);
writeFileSync(`${out}/index.html`, single);
writeFileSync(`${out}/Code.gs`, `// Google Apps Script: sirve la web de ajedrez como aplicación web.
// Implementar → Nueva implementación → Aplicación web → Acceso: "Cualquier usuario".
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ChessEmu · Juega al ajedrez')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
`);
console.log('OK', `${out}/index.html`, (single.length / 1024).toFixed(0) + ' KB');
