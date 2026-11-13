/** Keep existing playlist songs in place and insert this acquisition in its source order, including retries. */
export function mergePlaylistOrder(existing: string[], acquired: ReadonlyMap<number, string>): string[] {
  const ordered = [...acquired.entries()].sort(([a], [b]) => a - b).map(([, id]) => id);
  const acquiredIds = new Set(ordered);
  return [...new Set([...existing.filter(id => !acquiredIds.has(id)), ...ordered])];
}
