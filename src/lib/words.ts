const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const romans: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

/** "fourteen", so the copy keeps up as stars are added. Falls back to digits past twenty. */
export const countWord = (n: number) => small[n] ?? String(n);
export const capitalised = (n: number) => countWord(n).replace(/^./, (c) => c.toUpperCase());
export function roman(n: number) {
  let out = '';
  for (const [value, glyph] of romans) while (n >= value) { out += glyph; n -= value; }
  return out;
}
