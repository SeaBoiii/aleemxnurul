/** Films are a gift, not a toll: skip them on Data Saver or anything slower than 4G. */
export function canStream() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!connection) return true;
  return !connection.saveData && (connection.effectiveType ?? '4g') === '4g';
}
