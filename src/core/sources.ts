export type SourceResult = { url: string; safeUrl: string; name: string; needsLink: boolean };
export function parseSource(input: string): SourceResult {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error('Enter a complete https:// audio link.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Use an HTTP or HTTPS link without embedded account credentials.');
  }
  const host = url.hostname.toLowerCase();
  if (/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(host)) {
    throw new Error('YouTube acquisition is not connected. Import an audio file you already have, or use a permitted direct audio link.');
  }
  if (/(^|\.)spotify\.com$/.test(host)) {
    throw new Error('Spotify discovery is not connected. You can create a local playlist and import your audio files.');
  }
  let name: string;
  try { name = decodeURIComponent(url.pathname.split('/').pop() || 'Audio download'); } catch { name = 'Audio download'; }
  const needsLink = !!url.search || !!url.hash;
  const safe = new URL(url); safe.search = ''; safe.hash = '';
  return { url: url.href, safeUrl: safe.href, name, needsLink };
}
export function parseBatch(input: string): SourceResult[] {
  const lines = input.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) throw new Error('Paste one direct audio link per line.');
  if (lines.length > 100) throw new Error('Add up to 100 links in one batch.');
  return [...new Map(lines.map(line => { const source = parseSource(line); return [source.url, source]; })).values()];
}
