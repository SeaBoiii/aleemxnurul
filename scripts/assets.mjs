import { chromium } from 'playwright';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = resolve(root, 'public');
await mkdir(resolve(publicDir, 'brand'), { recursive: true });
await copyFile(resolve(root, '../our_flight/public/monogram-a-and-n.png'), resolve(publicDir, 'brand/monogram.png'));
// Keep the supplied original intact, and ship a small transparent rendition wherever
// the monogram is displayed at icon size or embedded in the seal illustrations.
const monogramSmall = await sharp(resolve(publicDir, 'brand/monogram.png'))
  .resize({ width: 160, withoutEnlargement: true })
  .webp({ quality: 82, alphaQuality: 90, effort: 6 })
  .toBuffer();
await writeFile(resolve(publicDir, 'brand/monogram-small.webp'), monogramSmall);
const monogram = monogramSmall.toString('base64');
const writeAsset = (name, contents) => writeFile(resolve(publicDir, name), contents);

// Separate clip paths let the real seal split without substituting a different illustration.
const edge = Array.from({ length: 64 }, (_, i) => {
  const angle = (i / 64) * Math.PI * 2;
  const radius = i % 2 ? 101 : 104;
  return `${i ? 'L' : 'M'}${120 + Math.cos(angle) * radius},${120 + Math.sin(angle) * radius}`;
}).join(' ') + 'Z';
const sealDefs = `<defs><radialGradient id="wax" cx="38%" cy="30%"><stop stop-color="#f1ddb0"/><stop offset=".55" stop-color="#d9b472"/><stop offset="1" stop-color="#b88743"/></radialGradient><filter id="emboss"><feGaussianBlur stdDeviation=".6"/></filter><clipPath id="left"><path d="M0 0H121L116 43 126 79 115 112 123 148 114 183 121 240H0Z"/></clipPath><clipPath id="right"><path d="M121 0H240V240H121L114 183 123 148 115 112 126 79 116 43Z"/></clipPath></defs>`;
const sealBody = `<path d="${edge}" fill="url(#wax)"/><circle cx="120" cy="120" r="84" fill="none" stroke="#f1ddb0" stroke-opacity=".6" stroke-width="2"/><circle cx="120" cy="120" r="79" fill="none" stroke="#9a723a" stroke-opacity=".35"/><image href="data:image/webp;base64,${monogram}" x="54" y="76" width="132" height="88" opacity=".76"/><path d="M121 17 116 43 126 79 115 112 123 148 114 183 121 223" fill="none" stroke="#90672d" stroke-width="1" opacity=".45"/>`;
const seal = (part) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${sealDefs}<g${part ? ` clip-path="url(#${part})"` : ''}>${sealBody}</g></svg>`;
await Promise.all([
  writeAsset('wax-seal.svg', seal()),
  writeAsset('wax-seal-left.svg', seal('left')),
  writeAsset('wax-seal-right.svg', seal('right')),
  writeAsset('paper-plane.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M7 43 94 9 65 93 46 60Z" fill="#fff6e9" stroke="#d9b472" stroke-linejoin="round" stroke-width="2"/><path d="M94 9 46 60 39 82 35 54Z" fill="#e8d4b5"/><path d="M94 9 46 60" fill="none" stroke="#d9b472" stroke-width="2"/></svg>'),
  writeAsset('envelope.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 380"><defs><linearGradient id="paper" x2="0" y2="1"><stop stop-color="#fff6e9"/><stop offset="1" stop-color="#eddfc8"/></linearGradient></defs><rect x="10" y="12" width="540" height="356" rx="16" fill="url(#paper)"/><path d="m10 28 270 192L550 28" fill="#f6ead7" stroke="#ddc9a7" stroke-width="2"/><path d="M10 358 211 185M550 358 349 185" fill="none" stroke="#ddc9a7" stroke-width="2"/><path d="M10 358 218 190Q280 152 342 190L550 358" fill="#fff6e9" stroke="#ddc9a7" stroke-width="2"/></svg>'),
]);

const favicon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="124" fill="#04121d"/><path d="M256 48Q282 228 464 256Q282 284 256 464Q230 284 48 256Q230 228 256 48" fill="#d9b472"/><path d="M256 298c-64-38-72-70-45-88 19-13 36-3 45 10 9-13 26-23 45-10 27 18 19 50-45 88" fill="#e07a93" stroke="#04121d" stroke-width="8"/></svg>';
await writeAsset('favicon.svg', favicon);
for (const size of [32, 180, 192, 512]) {
  await sharp(Buffer.from(favicon)).resize(size, size).png().toFile(resolve(publicDir, `favicon-${size}.png`));
}
await copyFile(resolve(publicDir, 'favicon-180.png'), resolve(publicDir, 'apple-touch-icon.png'));
await writeAsset('manifest.webmanifest', JSON.stringify({
  name: 'Every Star Was You', short_name: 'Every Star', description: 'For Nurulain — every star was you.', start_url: '/', display: 'standalone', background_color: '#04121D', theme_color: '#04121D',
  icons: [{ src: '/favicon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/favicon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
}, null, 2) + '\n');

const serif = (await readFile(resolve(root, 'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2'))).toString('base64');
const serifItalic = (await readFile(resolve(root, 'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2'))).toString('base64');
const mono = (await readFile(resolve(root, 'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2'))).toString('base64');
let seed = 2817;
const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const stars = Array.from({ length: 110 }, () => `<circle cx="${Math.round(random() * 1200)}" cy="${Math.round(random() * 630)}" r="${(random() * 1.5 + .35).toFixed(2)}" fill="#f1ddb0" opacity="${(random() * .5 + .1).toFixed(2)}"/>`).join('');
// Same J2000 gnomonic projection as src/lib/constellation.ts: north up,
// RA increases left, then +20° rotation. A uniform scale preserves the real sky.
const projected = [[83,433],[100,421],[63,453],[122,513],[202,422],[287,250],[268,252],[288,214],[308,212],[314,192],[327,203],[133,58]];
const map = projected.map(([x,y]) => [120 + x * .94, 43 + y * .94]);
const figureEdges = [[2,0],[0,1],[0,3],[3,4],[5,6],[6,7],[7,8],[8,5],[10,9],[9,8],[8,10]];
const figure = figureEdges.map(([a,b]) => `<path d="M${map[a]}L${map[b]}" fill="none" stroke="#d9b472" stroke-width="1.1" opacity=".55"/>`).join('');
const crossing = `<path d="M${map[4]}L${map[5]}" fill="none" stroke="#d9b472" stroke-width="1" stroke-dasharray="2 6" opacity=".42"/>`;
const constellation = map.slice(0,11).map(([x,y], index) => {
  const prominent = index === 0 || index === 10;
  const radius = prominent ? 10 : 5;
  return `<g transform="translate(${x},${y})"><circle r="${prominent ? 24 : 12}" fill="#d9b472" opacity=".065"/><circle r="${prominent ? 13 : 7}" fill="#d9b472" opacity=".1"/><path d="M0-${radius}Q1-1 ${radius} 0Q1 1 0 ${radius}Q-1 1-${radius} 0Q-1-1 0-${radius}" fill="${index === 2 || index === 5 ? '#9fb4c7' : '#f1ddb0'}"/></g>`;
}).join('') + `<path d="M${map[11][0]},${map[11][1]-7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="none" stroke="#9fb4c7" opacity=".5"/>`;
const dust = Array.from({ length: 250 }, () => {
  const y = random() * 630;
  const offset = (random() + random() + random() - 1.5) * 44;
  const x = 220 + y * .2 + offset;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(random() * .75 + .15).toFixed(2)}" fill="${random() > .6 ? '#f4b6c2' : '#f1ddb0'}" opacity="${(random() * .22 + .05).toFixed(2)}"/>`;
}).join('');
const milkyWay = `<defs><filter id="river-blur" filterUnits="userSpaceOnUse" x="0" y="0" width="1200" height="630"><feGaussianBlur stdDeviation="22"/></filter><linearGradient id="river"><stop stop-color="#f4b6c2" stop-opacity=".035"/><stop offset=".5" stop-color="#f1ddb0" stop-opacity=".07"/><stop offset="1" stop-color="#f4b6c2" stop-opacity=".02"/></linearGradient></defs><path d="M210-30C230 150 290 360 350 680" fill="none" stroke="url(#river)" stroke-width="80" filter="url(#river-blur)"/>${dust}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:Serif;src:url(data:font/woff2;base64,${serif})}@font-face{font-family:Serif;src:url(data:font/woff2;base64,${serifItalic});font-style:italic}@font-face{font-family:Mono;src:url(data:font/woff2;base64,${mono})}*{box-sizing:border-box}body{width:1200px;height:630px;margin:0;overflow:hidden;color:#fff6e9;background:radial-gradient(ellipse at 45% 120%,#033a4e 0%,#04121d 70%)}.sky{position:absolute;inset:0}.title{position:absolute;left:630px;right:65px;top:192px}small{font:11px Mono;letter-spacing:3px;color:#d9b472}h1{font:72px/1.04 Serif;font-weight:400;margin:24px 0 16px;letter-spacing:-1px}h1 em{color:#f1ddb0}p{font:17px/1.7 Serif;letter-spacing:.3px;color:#b3bbc0}.rule{width:50px;height:1px;background:#d9b472;margin-top:30px}.footer{position:absolute;bottom:44px;left:50px;right:50px;font:10px Mono;letter-spacing:3px;color:#a0b1b8;display:flex;justify-content:space-between}.monogram{position:absolute;top:38px;left:47px;width:71px;height:48px;object-fit:contain}.grain{position:absolute;inset:0;opacity:.045;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E")}</style></head><body><svg class="sky" viewBox="0 0 1200 630">${stars}${milkyWay}${figure}${crossing}${constellation}<g fill="#f1ddb0" font-family="Serif" font-size="20"><text x="430" y="216" font-style="italic">the Weaver Girl</text><text x="81" y="469" font-style="italic">the Cowherd</text></g><g fill="#92a8b3" font-family="Mono" font-size="9" letter-spacing="2"><text x="433" y="233">VEGA · LYRA</text><text x="83" y="486">ALTAIR · AQUILA</text><text x="211" y="84">DENEB</text><text x="310" y="365" transform="rotate(72 310 365)">THE SILVER RIVER</text></g><path d="m490 135 27-12-9 28-7-10Z" fill="#fff6e9"/><path d="m517 123-16 18-2 7" fill="none" stroke="#d9b472"/></svg><img class="monogram" src="data:image/webp;base64,${monogram}" alt=""><div class="title"><small>A LITTLE UNIVERSE, JUST FOR YOU</small><h1>For Nurulain —<br><em>every star<br>was you.</em></h1><div class="rule"></div><p>Eleven websites. One way back to you.</p></div><div class="footer"><span>ALEEMXNURUL.LOVE</span><span>MADE BY ALEEM, FOR NURULAIN ♡</span></div><div class="grain"></div></body></html>`;
// Keep the source reproducible, but only the resulting PNG ships with the site.
await mkdir(resolve(root, 'scripts/templates'), { recursive: true });
await writeFile(resolve(root, 'scripts/templates/og.html'), html);
const executablePath = [process.env.PLAYWRIGHT_EXECUTABLE_PATH, process.env.CHROME_PATH, chromium.executablePath(), 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(path => path && existsSync(path));
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(publicDir, 'og.png'), type: 'png' });
} finally {
  await browser.close();
}
console.log('Generated seal halves, envelope, plane, favicon set, manifest and 1200 × 630 OG image.');
