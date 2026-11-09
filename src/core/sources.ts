export type SourceResult = { url: string; safeUrl: string; name: string; needsLink: boolean };
export const converters = {
  flvto: { name: 'Flvto', url: 'https://flvto.world/', quality: '128, 256, or 320 kbps · choose on Flvto' },
  ytmp3: { name: 'YTMP3', url: 'https://ytmp3.gl/', quality: '192 kbps · fixed quality' },
} as const;
/** Return a single canonical video link, dropping tracking and playlist parameters. */
export function youtubeVideoLink(input: string): string | null {
  let url: URL;
  try { url = new URL(input.trim()); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (/^\/(shorts|embed|live)\//.test(url.pathname)) id = url.pathname.split('/')[2];
  }
  return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
}
export function parseSource(input: string): SourceResult {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error('Enter a complete https:// audio link.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Use an HTTP or HTTPS link without embedded account credentials.');
  }
  const host = url.hostname.toLowerCase();
  if (/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(host)) {
    throw new Error('Use the YouTube tab for video links. Add direct audio links separately.');
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
