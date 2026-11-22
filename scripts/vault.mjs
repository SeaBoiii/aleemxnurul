// Seals Aleem's words for Nurulain. Reads private/content.json and the answer in
// private/answer.txt (both gitignored), and writes src/data/vault.json, which holds
// only the question and AES-256-GCM ciphertext. Run: npm run vault
import { webcrypto as crypto } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentFile = resolve(root, 'private/content.json');
const answerFile = resolve(root, 'private/answer.txt');
export const iterations = 600_000;

/** Must match normaliseAnswer in src/lib/vault.ts. */
export const normaliseAnswer = (answer) => answer.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export async function deriveKey(answer, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(normaliseAnswer(answer)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function readAnswer() {
  if (!existsSync(answerFile)) throw new Error('Missing private/answer.txt: write the answer to the seal question on its first line.');
  const answer = (await readFile(answerFile, 'utf8')).split(/\r?\n/)[0];
  if (normaliseAnswer(answer).length < 4) throw new Error('The answer in private/answer.txt is too short to protect anything.');
  return answer;
}

const base64 = (bytes) => Buffer.from(bytes).toString('base64');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!existsSync(contentFile)) throw new Error('Missing private/content.json.');
  const { question, ...content } = JSON.parse(await readFile(contentFile, 'utf8'));
  const statsFile = resolve(root, 'private/stats.json');
  // Per-project history names every repository, so it travels inside the vault too.
  if (existsSync(statsFile)) content.stats = JSON.parse(await readFile(statsFile, 'utf8')).projects;
  const sky = JSON.parse(await readFile(resolve(root, 'src/data/sky.json'), 'utf8'));
  const mismatch = content.projects.findIndex((project, index) => project.star !== sky.stars[index]?.key);
  if (mismatch >= 0 || content.projects.length !== sky.stars.length) throw new Error(`private/content.json and src/data/sky.json disagree at star ${mismatch + 1}.`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(await readAnswer(), salt);
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(content)));
  const vault = { version: 1, question, kdf: 'PBKDF2-SHA256', iterations, salt: base64(salt), iv: base64(iv), data: base64(new Uint8Array(sealed)) };
  await writeFile(resolve(root, 'src/data/vault.json'), JSON.stringify(vault, null, 2) + '\n');
  console.log(`Sealed ${content.projects.length} stars, the letter and the finale into src/data/vault.json.`);
}
