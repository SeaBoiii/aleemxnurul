const allowed = ['seen-letter', 'visited', 'vault-key'];
export function readStorage<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
}
export function writeStorage(key: string, value: unknown) {
  if (!allowed.includes(key)) return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The gift works in private mode, too. */ }
}
