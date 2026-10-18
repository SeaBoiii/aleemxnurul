import { chromium } from 'playwright';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projects = [
  ['confession', 'https://confession.aleemxnurul.love/', 'live'],
  ['for_her', 'https://foryou.aleemxnurul.love/', 'live'],
  ['rsvp', 'https://seaboiii.github.io/rsvp/', 'draft'],
  ['wymm', 'https://wymm.aleemxnurul.love/', 'live'],
  ['return_to_me', 'https://seaboiii.github.io/return_to_me/', 'live'],
  ['our_journey', 'https://seaboiii.github.io/our_journey/', 'draft'],
  ['our_flight', 'https://rsvp.aleemxnurul.love/', 'live'],
  ['our_gallery', 'https://gallery.aleemxnurul.love/', 'live'],
  ['sort_of_us', 'https://sortofus.aleemxnurul.love/', 'live'],
  ['our_hearts', 'https://seaboiii.github.io/our_hearts/', 'live'],
  ['our_miles', 'https://seaboiii.github.io/our_miles/', 'live'],
];
const scraped = { generatedAt: new Date().toISOString(), projects: {}, failures: [] };
let previous = { projects: {} };
try {
  previous = JSON.parse(await readFile(resolve(root, 'src/data/scraped.json'), 'utf8'));
} catch { /* First capture has no existing metadata. */ }
await mkdir(resolve(root, 'public/previews'), { recursive: true });
await mkdir(resolve(root, 'src/data'), { recursive: true });
const executablePath = [process.env.PLAYWRIGHT_EXECUTABLE_PATH, process.env.CHROME_PATH, chromium.executablePath(), 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(path => path && existsSync(path));
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });

try {
  for (const [id, url, status] of projects) {
    const saved = previous.projects?.[id];
    const record = { url, status, title: saved?.title ?? null, themeColor: saved?.themeColor ?? null, ogImage: saved?.ogImage ?? null, captures: { ...saved?.captures }, errors: [] };
    scraped.projects[id] = record;
    for (const [name, viewport, deviceScaleFactor] of [['mobile', { width: 390, height: 844 }, 2], ['desktop', { width: 1440, height: 900 }, 1]]) {
      const context = await browser.newContext({ viewport, deviceScaleFactor, isMobile: name === 'mobile', hasTouch: name === 'mobile', colorScheme: 'dark' });
      const page = await context.newPage();
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`);
        await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
        await page.waitForTimeout(2500);
        const metadata = await page.evaluate(() => ({
          title: document.title,
          themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
          ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? null,
        }));
        record.title = metadata.title;
        record.themeColor = metadata.themeColor;
        record.ogImage = metadata.ogImage ? new URL(metadata.ogImage, page.url()).href : null;
        const file = `${id}-${name}.webp`;
        const buffer = await page.screenshot({ type: 'png', fullPage: false, animations: 'allow', timeout: 20_000 });
        await sharp(buffer).webp({ quality: 78, effort: 5 }).toFile(resolve(root, 'public/previews', file));
        record.captures[name] = `/previews/${file}`;
        console.log(`Captured ${id} ${name} (${viewport.width * deviceScaleFactor} × ${viewport.height * deviceScaleFactor}).`);
      } catch (error) {
        const failure = { id, url, viewport: name, message: error.message.split('\n')[0] };
        record.errors.push(failure.message);
        scraped.failures.push(failure);
        console.warn(`Capture failed: ${id} ${name}: ${failure.message}`);
      } finally {
        await context.close();
      }
      await writeFile(resolve(root, 'src/data/scraped.json'), JSON.stringify(scraped, null, 2) + '\n');
    }
  }
} finally {
  await browser.close();
  await writeFile(resolve(root, 'src/data/scraped.json'), JSON.stringify(scraped, null, 2) + '\n');
}
console.log(`Capture complete: ${projects.length * 2 - scraped.failures.length}/${projects.length * 2} screenshots; ${scraped.failures.length} failures recorded in src/data/scraped.json.`);
