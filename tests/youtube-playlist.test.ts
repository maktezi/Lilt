import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageObject, playlistPage, resolveYouTubePlaylist, youtubePlaylistLink } from '../src/core/youtube-playlist.ts';
const video = (id: string, title = id, playable = true) => ({ playlistVideoRenderer: { videoId: id, title: { runs: [{ text: title }] }, isPlayable: playable } });
const continuation = (token: string) => ({ continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token } } } });
const initial = (items: any[]) => ({ metadata: { playlistMetadataRenderer: { title: 'Full playlist' } }, contents: { playlistVideoListRenderer: { contents: items } } });
const next = (items: any[]) => ({ onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems: items } }] });
const html = (data: any) => `<script>var ytInitialData = ${JSON.stringify(data)};</script><script>ytcfg.set({"INNERTUBE_CONTEXT":{"client":{"clientName":"WEB","clientVersion":"test"}}});</script>`;
const link = 'https://www.youtube.com/playlist?list=PLabcdefghijk';

test('playlist links preserve list identity and reject credentials and lookalike hosts', () => {
  assert.equal(youtubePlaylistLink('https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabcdefghijk&index=2'), link);
  for (const value of ['https://youtube.com.evil.test/playlist?list=PLabcdefghijk', 'https://user:pass@youtube.com/playlist?list=PLabcdefghijk', 'file:///playlist?list=PLabcdefghijk', 'https://youtube.com/watch?v=dQw4w9WgXcQ']) assert.equal(youtubePlaylistLink(value), null);
});
test('public page parser handles braces and escapes inside titles without executing scripts', () => {
  const data = initial([video('dQw4w9WgXcQ', 'A {song} "title" \\')]);
  assert.deepEqual(pageObject(html(data), /var ytInitialData\s*=/), data);
  assert.throws(() => pageObject('var ytInitialData = {', /var ytInitialData\s*=/), /incomplete/);
});
test('whole playlist resolution follows every continuation and preserves order, skipping unavailable and duplicate videos', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const responses = [new Response(html(initial([video('dQw4w9WgXcQ'), video('aaaaaaaaaaa', 'Private', false), continuation('page2')]))), Response.json(next([video('bbbbbbbbbbb'), continuation('page3')])), Response.json(next([video('dQw4w9WgXcQ'), video('ccccccccccc')]))];
  const request = (async (url: string, init?: RequestInit) => { calls.push({ url, init }); return responses.shift()!; }) as typeof fetch;
  const result = await resolveYouTubePlaylist(link, new AbortController().signal, request);
  assert.deepEqual(result.entries.map(entry => entry.id), ['dQw4w9WgXcQ', 'bbbbbbbbbbb', 'ccccccccccc']);
  assert.equal(result.unavailable, 1); assert.equal(result.title, 'Full playlist');
  assert.equal(calls.length, 3);
  assert.equal(JSON.parse(calls[2].init?.body as string).continuation, 'page3');
});
test('partial resolution never silently downloads only the first page', async () => {
  const responses = [new Response(html(initial([video('dQw4w9WgXcQ'), continuation('page2')]))), new Response('', { status: 503 })];
  await assert.rejects(resolveYouTubePlaylist(link, new AbortController().signal, (async () => responses.shift()!) as typeof fetch), /whole playlist/);
  assert.throws(() => playlistPage({}), /unavailable/);
});
test('repeated continuations fail instead of looping or claiming completion', async () => {
  const responses = [new Response(html(initial([video('dQw4w9WgXcQ'), continuation('same')]))), Response.json(next([video('bbbbbbbbbbb'), continuation('same')]))];
  await assert.rejects(resolveYouTubePlaylist(link, new AbortController().signal, (async () => responses.shift()!) as typeof fetch), /repeated/);
});
test('playlist cancellation passes the signal to every network request', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(resolveYouTubePlaylist(link, controller.signal, (async (_url, options) => { assert.equal(options?.signal, controller.signal); options?.signal?.throwIfAborted(); throw new Error('unexpected'); }) as typeof fetch), { name: 'AbortError' });
});

 test('retrying a skipped song restores its source position without disturbing existing songs', async () => {
  const { mergePlaylistOrder } = await import('../src/core/playlist-order.ts');
  const acquired = new Map([[0, 'one'], [2, 'three']]);
  assert.deepEqual(mergePlaylistOrder(['existing', 'one', 'three'], acquired), ['existing', 'one', 'three']);
  acquired.set(1, 'two');
  assert.deepEqual(mergePlaylistOrder(['existing', 'one', 'three', 'two'], acquired), ['existing', 'one', 'two', 'three']);
});
