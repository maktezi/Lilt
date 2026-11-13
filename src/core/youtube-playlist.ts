export type YouTubeEntry = { id: string; title: string; url: string };
export type YouTubePlaylist = { title: string; entries: YouTubeEntry[]; unavailable: number };

export function youtubePlaylistLink(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(url.hostname.toLowerCase())) return null;
    const id = url.searchParams.get('list');
    return id && /^[\w-]{10,150}$/.test(id) ? `https://www.youtube.com/playlist?list=${id}` : null;
  } catch { return null; }
}

/** Read a JSON object in the public page without evaluating provider JavaScript. */
export function pageObject(html: string, marker: RegExp): any {
  const match = marker.exec(html);
  if (!match) throw new Error('YouTube did not return playlist data. Check that the playlist is public.');
  const start = html.indexOf('{', match.index + match[0].length);
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i >= 0 && i < html.length; i++) {
    const char = html[i];
    if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; }
    else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return JSON.parse(html.slice(start, i + 1));
  }
  throw new Error('YouTube returned incomplete playlist data. Try again.');
}
function find(value: any, key: string): any {
  if (!value || typeof value !== 'object') return undefined;
  if (value[key]) return value[key];
  for (const child of Object.values(value)) { const result = find(child, key); if (result) return result; }
}
const text = (value: any): string => value?.simpleText || value?.runs?.map((run: any) => run.text || '').join('') || '';
export function playlistPage(data: any): { entries: YouTubeEntry[]; unavailable: number; continuation?: string; title: string } {
  const list = find(data, 'playlistVideoListRenderer');
  const action = find(data, 'appendContinuationItemsAction');
  const items = list?.contents || action?.continuationItems;
  if (!Array.isArray(items)) throw new Error('This playlist is unavailable, private, or requires sign-in.');
  const entries: YouTubeEntry[] = []; let unavailable = 0, continuation: string | undefined;
  for (const item of items) {
    const video = item.playlistVideoRenderer;
    if (video) {
      if (!/^[\w-]{11}$/.test(video.videoId || '') || video.isPlayable === false) { unavailable++; continue; }
      entries.push({ id: video.videoId, title: text(video.title) || 'YouTube audio', url: `https://www.youtube.com/watch?v=${video.videoId}` });
    }
    const token = find(item, 'continuationCommand')?.token;
    if (typeof token === 'string') continuation = token;
  }
  return { entries, unavailable, continuation, title: find(data, 'playlistMetadataRenderer')?.title || text(find(data, 'playlistHeaderRenderer')?.title) || 'YouTube playlist' };
}
export async function resolveYouTubePlaylist(input: string, signal: AbortSignal, request: typeof fetch = fetch): Promise<YouTubePlaylist> {
  const url = youtubePlaylistLink(input);
  if (!url) throw new Error('Paste a valid YouTube playlist link.');
  const response = await request(url, { signal });
  if (!response.ok) throw new Error(`YouTube could not load this playlist (${response.status}). Try again.`);
  const html = await response.text();
  const initial = pageObject(html, /(?:var\s+ytInitialData\s*=|window\["ytInitialData"\]\s*=|ytInitialData\s*=)/);
  let page = playlistPage(initial);
  const result: YouTubePlaylist = { title: page.title, entries: [...page.entries], unavailable: page.unavailable };
  const visited = new Set<string>();
  while (page.continuation) {
    if (visited.has(page.continuation)) throw new Error('YouTube repeated a playlist page. Retry to load the complete playlist.');
    visited.add(page.continuation);
    const context = pageObject(html, /"INNERTUBE_CONTEXT"\s*:/);
    const next = await request('https://www.youtube.com/youtubei/v1/browse', {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, continuation: page.continuation }),
    });
    if (!next.ok) throw new Error('Could not load the whole playlist. Retry before downloading.');
    page = playlistPage(await next.json());
    result.entries.push(...page.entries); result.unavailable += page.unavailable;
    if (result.entries.length > 10_000) throw new Error('This playlist exceeds 10,000 songs. Split it into smaller playlists.');
  }
  // Exact duplicate videos share the same durable track in Lilt.
  result.entries = [...new Map(result.entries.map(entry => [entry.id, entry])).values()];
  if (!result.entries.length) throw new Error('This playlist has no public, playable videos.');
  return result;
}
