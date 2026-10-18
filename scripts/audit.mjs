import lighthouse from 'lighthouse';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const url = process.env.AUDIT_URL || 'http://127.0.0.1:4173/';
const chromePath = [process.env.PLAYWRIGHT_EXECUTABLE_PATH, chromium.executablePath(), 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(path => path && existsSync(path));
await mkdir('.qa', {recursive:true});
const profile = resolve('.qa/lighthouse-profile');
const context = await chromium.launchPersistentContext(profile, {headless:true, executablePath:chromePath, args:['--remote-debugging-port=0']});
const port = Number((await readFile(resolve(profile,'DevToolsActivePort'), 'utf8')).split('\n')[0]);
try {
  const page = context.pages()[0] || await context.newPage();
  await page.goto(url);
  for (const scene of ['seal', 'sky']) {
    await page.evaluate(scene => {
      localStorage.clear();
      if (scene === 'sky') localStorage.setItem('seen-letter', 'true');
    }, scene);
    // Preserve visit state while still measuring a cold network cache.
    const session = await context.newCDPSession(page);
    await session.send('Network.clearBrowserCache');
    await session.detach();
    const result = await lighthouse(url, {port, onlyCategories:['performance', 'accessibility'], output:['json','html'], logLevel:'error', disableStorageReset:true});
    if (!result) throw new Error('Lighthouse returned no report.');
    await writeFile(`.qa/lighthouse-${scene}.json`, result.report[0]);
    await writeFile(`.qa/lighthouse-${scene}.html`, result.report[1]);
    const performance = Math.round(result.lhr.categories.performance.score * 100);
    const accessibility = Math.round(result.lhr.categories.accessibility.score * 100);
    console.log(`${scene}: mobile performance ${performance}, accessibility ${accessibility}`);
    for (const audit of Object.values(result.lhr.audits)) {
      if (audit.score !== null && audit.score < 1 && audit.details?.type === 'table') console.log(`  ${audit.id}: ${audit.title}`);
    }
    if (performance < 90 || accessibility < 95) process.exitCode = 1;
  }
} finally {
  await context.close();
}
