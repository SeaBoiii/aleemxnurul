import vault from '../data/vault.json';
import { loadContent, type SealedContent } from '../content';
import { readStorage, writeStorage } from './storage';

export const question = vault.question;

/** Must match normaliseAnswer in scripts/vault.mjs: "Rainy Day!" and "rainyday" are the same answer. */
export const normaliseAnswer = (answer: string) => answer.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

const bytes = (base64: string) => Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
const base64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

async function open(key: CryptoKey) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(vault.iv) }, key, bytes(vault.data));
  loadContent(JSON.parse(new TextDecoder().decode(plain)) as SealedContent);
}

/** Tries her answer. On success the content is loaded and this device remembers the key. */
export async function unlock(answer: string): Promise<boolean> {
  try {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(normaliseAnswer(answer)), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes(vault.salt), iterations: vault.iterations }, material, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
    await open(key);
    writeStorage('vault-key', { salt: vault.salt, key: base64(await crypto.subtle.exportKey('raw', key)) });
    return true;
  } catch {
    return false;
  }
}

/** Reopens the vault with the key this device saved last time, if it still fits. */
export async function unlockRemembered(): Promise<boolean> {
  const saved = readStorage<{ salt?: string; key?: string } | null>('vault-key', null);
  if (!saved?.key || saved.salt !== vault.salt) return false;
  try {
    await open(await crypto.subtle.importKey('raw', bytes(saved.key), 'AES-GCM', false, ['decrypt']));
    return true;
  } catch {
    return false;
  }
}
