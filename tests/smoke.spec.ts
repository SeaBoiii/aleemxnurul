import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { Page } from '@playwright/test';
// @ts-expect-error plain ESM helper shared with the build script
import { deriveKey, readAnswer } from '../scripts/vault.mjs';
import vault from '../src/data/vault.json' with { type: 'json' };

// The words are private: tests read them from the gitignored private/ folder, never from source.
const hasSecrets = existsSync('private/answer.txt') && existsSync('private/content.json');
test.skip(!hasSecrets, 'Needs private/answer.txt and private/content.json to open the seal.');
const secret = hasSecrets ? JSON.parse(await readFile('private/content.json', 'utf8')) : null;
const answer: string = hasSecrets ? await readAnswer() : '';
const project = (id: string) => secret.projects.find((item: { id: string }) => item.id === id);
const rememberedKey = hasSecrets ? Buffer.from(await globalThis.crypto.subtle.exportKey('raw', await deriveKey(answer, Buffer.from(vault.salt, 'base64')))).toString('base64') : '';

/** Behaves like her phone after the first visit: the seal remembers her. */
async function remembered(page: Page, extra: Record<string, string> = {}) {
  await page.addInitScript(([key, salt, more]) => {
    localStorage.setItem('vault-key', JSON.stringify({ salt, key }));
    Object.entries(more as Record<string, string>).forEach(([name, value]) => localStorage.setItem(name, value));
  }, [rememberedKey, vault.salt, extra] as const);
}

async function answerSeal(page: Page, value = answer) {
  await page.getByLabel(vault.question).fill(value);
  await page.getByRole('button', { name: 'Break the seal' }).click();
}

const runtimeErrors = new WeakMap<object, string[]>();
test.beforeEach(async ({page}) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});
test.afterEach(async ({page}) => {
  expect(runtimeErrors.get(page), 'No browser runtime errors').toEqual([]);
});

test('nothing private ships: the build holds only ciphertext',async()=>{
  const files=(await readdir('dist',{recursive:true})).filter(name=>/\.(js|html|css|json)$/.test(name));
  const phrases=[secret.letter.split(/\n/).find((line:string)=>line.length>40).slice(0,40), project('confession').note.slice(0,40), secret.finale.slice(0,40), secret.whispers[0]];
  for(const file of files){const text=await readFile(`dist/${file}`,'utf8');for(const phrase of phrases)expect(text,`${file} leaks private copy`).not.toContain(phrase);}
});

test('a wrong answer keeps the seal shut, the right one opens the letter, fly, trap focus, step inside, and return with visited state',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Press and hold to open your letter'})).toHaveCount(0);
  await answerSeal(page,'definitely not it');
  await expect(page.locator('#seal-feedback')).toContainText('not quite',{timeout:10000});
  await expect(page.getByRole('region',{name:'Your letter from Aleem'})).toHaveCount(0);
  await answerSeal(page);
  await expect(page.getByRole('region',{name:'Your letter from Aleem'})).toBeVisible();
  await page.getByRole('button',{name:'tap to read it all'}).click();
  await expect(page.getByText('Nurul,',{exact:false}).first()).toBeAttached();
  await page.getByRole('button',{name:'Show me'}).click();
  await expect(page.getByRole('heading',{name:'Every star was you.'})).toBeVisible();
  const star=page.getByRole('button',{name:/A Little Confession JUN '26/});
  await star.click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  const close=dialog.getByRole('button',{name:'Close dialog'});await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(dialog.getByRole('button',{name:'Next star'})).toBeFocused();
  await page.keyboard.press('Tab');await expect(close).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(star).toBeFocused();
  await star.click();await expect(dialog).toBeVisible();
  await page.route('https://confession.aleemxnurul.love/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>A Little Confession</title><h1>A Little Confession</h1>'}));
  await dialog.getByRole('button',{name:'Step inside',exact:true}).click();
  await page.waitForURL('https://confession.aleemxnurul.love/');
  await page.goBack();await expect(page.getByRole('heading',{name:'Every star was you.'})).toBeVisible({timeout:10000});
  await expect(page.getByRole('button',{name:/A Little Confession.*visited/})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('visited')||'[]'))).toContain('confession');
});

test('reduced-motion tap path, info sheet, list view, finale and resilient storage',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await answerSeal(page);
  await page.getByRole('button',{name:'Show me'}).click();
  await expect(page.getByRole('heading',{name:'Every star was you.'})).toBeVisible();
  await page.getByRole('button',{name:'About this sky'}).click();
  await expect(page.getByRole('dialog')).toContainText('The Weaver Girl & the Cowherd');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'List view'}).click();
  await expect(page.locator('.project-star')).toHaveCount(11);
  await page.getByRole('button',{name:/Our Flight AUG '26/}).click();
  await expect(page.getByRole('dialog')).toContainText(project('our_flight').hint);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>localStorage.setItem('visited',JSON.stringify(['confession','for_her','rsvp','wymm','return_to_me','our_journey','our_flight','our_gallery','sort_of_us','our_hearts','our_miles'])));
  await page.reload();await expect(page.getByText(secret.finale.slice(0,40),{exact:false})).toBeVisible();
  await page.evaluate(()=>{localStorage.setItem('visited','{"broken":true}');});await page.reload();
  await expect(page.locator('.visited-progress')).toContainText('0 / 11');
});

for(const width of [360,390,768,1440]){
  test(`responsive sky, card and accessibility at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:width>=768?900:844});await page.emulateMedia({reducedMotion:'reduce'});
    await remembered(page,{'seen-letter':'true'});await page.goto('/');
    await expect(page.getByRole('heading',{name:'Every star was you.'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const buttons=page.locator('.project-star');await expect(buttons).toHaveCount(11);
    for(const button of await buttons.all()){const rect=await button.boundingBox();expect(rect).toBeTruthy();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(width+1);}
    await mkdir('.qa',{recursive:true});await page.screenshot({path:`.qa/sky-${width}.png`});
    if(width===390){const results=await new AxeBuilder({page}).analyze();expect(results.violations).toEqual([]);}
    await buttons.first().click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.sheet')).toHaveCSS('opacity','1');await expect(page.locator('.sheet-backdrop')).toHaveCSS('opacity','1');await page.screenshot({path:`.qa/card-${width}.png`});
    if(width===390){const results=await new AxeBuilder({page}).analyze();expect(results.violations).toEqual([]);}
  });
}

test('private-mode storage errors do not stop the gift',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Unavailable','SecurityError');};Storage.prototype.setItem=()=>{throw new DOMException('Unavailable','SecurityError');};});
  await page.goto('/');await answerSeal(page);await page.getByRole('button',{name:'Show me'}).click();await expect(page.getByRole('heading',{name:'Every star was you.'})).toBeVisible();
});

test('the actual stars open their own cards, and the sheet drags closed',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await remembered(page,{'seen-letter':'true'});
  await page.goto('/');
  for (const button of await page.locator('.project-star').all()) {
    const title=await button.locator('.star-label > span').first().innerText();
    const glyph=await button.locator('.star-glyph').boundingBox();
    await page.mouse.click(glyph!.x+glyph!.width/2,glyph!.y+glyph!.height/2);
    await expect(page.getByRole('dialog').getByRole('heading',{name:title,exact:true})).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.locator('.project-star').first().click();
  const handle=await page.locator('.sheet-drag').boundingBox();
  await page.mouse.move(handle!.x+handle!.width/2,handle!.y+handle!.height/2);
  await page.mouse.down();await page.mouse.move(handle!.x+handle!.width/2,handle!.y+handle!.height/2+100,{steps:5});await page.mouse.up();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('love slider refuses less, and visited stars carry little voice memos',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await remembered(page,{'seen-letter':'true',visited:'["confession"]'});
  await page.goto('/');
  const visited=page.getByRole('button',{name:/A Little Confession.*visited/});
  await visited.hover();await page.mouse.down();await page.waitForTimeout(700);await page.mouse.up();
  await expect(page.getByRole('status')).toContainText(project('confession').note.slice(0,40));
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button',{name:'close note'}).click();
  const slider=page.getByRole('slider',{name:'How much do I love you?'});
  await slider.focus();await slider.press('End');
  await expect(page.locator('.love-answer')).toHaveText('okay it broke 💥');
  await slider.press('Home');await expect(slider).toHaveValue('90');
  await expect(page.locator('.love-answer')).toHaveText('a lot');
  await expect(page.getByText('21 August 2027',{exact:true})).toBeVisible();
});

test('a remembered device opens with a hold',async({page})=>{
  await remembered(page);
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Press and hold to open your letter'})).toBeVisible();
});

test('a stale saved key falls back to the question',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vault-key',JSON.stringify({salt:'old',key:'AAAA'})));
  await page.goto('/');
  await expect(page.getByLabel(vault.question)).toBeVisible();
});
