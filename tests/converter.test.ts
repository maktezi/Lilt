import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { converterBridge, converterDownload, converterOrigin, converterPage, providerForQuality, qualityForProvider } from '../src/core/converter.ts';

const video = 'https://www.youtube.com/watch?v=qV-3UMfcWBc';
test('192 kbps routes directly to the fallback and source switching always requests a supported quality', () => {
  assert.equal(providerForQuality(192), 'ytmp3');
  for (const quality of [128, 256, 320] as const) assert.equal(providerForQuality(quality), 'flvto');
  assert.equal(qualityForProvider('ytmp3', 320), 192);
  assert.equal(qualityForProvider('flvto', 192), 320);
  assert.equal(qualityForProvider('flvto', 256), 256);
});
test('converter pages prefill the requested video; download bridge rejects unsafe destinations', () => {
  assert.equal(converterPage('flvto', video), 'https://embed.dlsrv.online/v1/full?videoId=qV-3UMfcWBc');
  assert.equal(converterPage('ytmp3', video), 'https://ytmp3.gl/#qV-3UMfcWBc/mp3');
  assert.throws(() => converterPage('flvto', 'https://youtube.com/playlist?list=x'));
  assert.equal(converterOrigin('https://ytmp3.gl/#video'), true);
  assert.equal(converterOrigin('https://ytmp3.gl.evil.com/'), false);
  for (const url of ['javascript:alert(1)', 'http://cdn.example.com/a.mp3', 'https://localhost/a', 'https://192.168.1.1/a', 'https://[::1]/a', 'https://printer.local/a', 'https://user:pass@cdn.example.com/a', 'https://cdn.example.com:8443/a']) {
    assert.equal(converterDownload(JSON.stringify({ type: 'lilt-download', url })), null);
  }
  assert.deepEqual(converterDownload(JSON.stringify({ type: 'lilt-download', url: 'https://cdn.example.com/song?token=secret', title: '../My: song.mp3' })), { url: 'https://cdn.example.com/song?token=secret', filename: '..My song.mp3' });
  assert.equal(converterDownload('not JSON'), null);
});

function pageBridge(provider: 'flvto' | 'ytmp3', rows: object[] = []) {
  const messages: string[] = [], timers: (() => void)[] = [];
  let result: object = {}, ok = true, status = 200;
  const body = { innerText: '' };
  class FakeXHR { open(_method: string, _url: string) {} }
  const window: Record<string, any> = {
    ReactNativeWebView: { postMessage(message: string) { messages.push(message); } },
    async fetch() { return { ok, status, clone() { return { async json() { return result; } }; } }; },
    open() { throw new Error('A converter must not launch another app.'); },
  };
  const location = new URL(converterPage(provider, video));
  runInNewContext(converterBridge(provider, 320), { window, location, URL, XMLHttpRequest: FakeXHR,
    document: { body, querySelector() { return { textContent: 'Sample song' }; }, querySelectorAll(selector: string) { return selector === 'tr' ? rows : []; }, addEventListener() {} },
    setInterval(callback: () => void) { timers.push(callback); return timers.length; }, clearInterval() {}, setTimeout() {},
  });
  return { window, body, XHR: FakeXHR, messages, timers, result(value: object, successful = true, httpStatus = successful ? 200 : 503) { result = value; ok = successful; status = httpStatus; } };
}

test('Flvto bridge captures only completed conversion responses once, preserving signed URLs', async () => {
  const page = pageBridge('flvto');
  page.result({ done: false, url: 'https://cdn.example.com/not-ready.mp3' });
  await page.window.fetch('/api/v3/progress?job=123');
  assert.equal(page.messages.length, 0);
  page.result({ done: true, url: 'https://cdn.example.com/song?token=secret' });
  await page.window.fetch('/api/v3/progress?job=123');
  await page.window.fetch('/api/v3/progress?job=123');
  assert.equal(page.messages.length, 1);
  assert.equal(converterDownload(page.messages[0])?.url, 'https://cdn.example.com/song?token=secret');
  assert.equal(page.window.open('https://advert.example.com/'), null);
});
test('Flvto starts the selected bitrate and exposes a failed conversion for fallback', async () => {
  let clicked = 0;
  const row = { querySelector() { return { textContent: '320kbps' }; }, querySelectorAll() { return [{ textContent: 'Download', disabled: false, click() { clicked++; } }]; } };
  const page = pageBridge('flvto', [row]);
  page.timers[0](); page.timers[0]();
  assert.equal(clicked, 1);
  page.result({ error: 'busy' }, false);
  await page.window.fetch('/api/download/mp3');
  assert.ok(page.messages.some(message => JSON.parse(message).type === 'lilt-error'));
});
test('YTMP3 completion is captured automatically without clicking Download or opening an advertisement', () => {
  const page = pageBridge('ytmp3');
  page.window.download = () => assert.fail('Original download should be captured by Lilt.');
  page.timers[0]();
  page.window.download('https://cdn.example.com/audio?token=secret', 'qV-3UMfcWBc', 'mp3', 'Sample song');
  assert.equal(page.messages.length, 1);
  const download = converterDownload(page.messages[0]);
  assert.equal(download?.filename, 'Sample song.mp3');
  assert.equal(new URL(download!.url).searchParams.get('token'), 'secret');
  assert.equal(new URL(download!.url).searchParams.get('f'), 'mp3');
});
test('fallback starts its file request immediately instead of waiting through simulated progress timers', () => {
  const page = pageBridge('ytmp3');
  page.window.cProgress = () => assert.fail('The decorative nine-second delay must be skipped.');
  page.timers[0]();
  page.window.cProgress('https://cdn.example.com/progress', 'https://cdn.example.com/audio?token=secret', 'Sample song', 0, 'qV-3UMfcWBc', 'mp3');
  assert.equal(page.messages.length, 1);
  const download = converterDownload(page.messages[0]);
  assert.equal(download?.filename, 'Sample song.mp3');
  assert.equal(new URL(download!.url).searchParams.get('f'), 'mp3');
});
test('source verification is reported separately, and a rejected session is not called slow conversion', async () => {
  const page = pageBridge('flvto');
  page.result({}, false, 403);
  await page.window.fetch('https://check.dlsrv.online/example/redeem');
  assert.ok(page.messages.some(message => JSON.parse(message).stage === 'verifying'));
  assert.equal(page.messages.some(message => JSON.parse(message).type === 'lilt-download'), false);
  assert.ok(page.messages.some(message => { const event = JSON.parse(message); return event.type === 'lilt-error' && event.reason === 'verification'; }), 'rejection must fail immediately without waiting for a DOM error or retries');
  page.body.innerText = 'Something went wrong. Please try again.';
  page.timers[1]();
  assert.ok(page.messages.some(message => { const event = JSON.parse(message); return event.type === 'lilt-error' && event.reason === 'verification'; }));
});
test('fallback authentication and extraction report progress before its delayed conversion callback', () => {
  const page = pageBridge('ytmp3'), request = new page.XHR();
  request.open('GET', 'https://gamma.gammacloud.net/api/v1/auth?api_key=private');
  request.open('GET', 'https://coocco.gammacloud.net/api/v1/convert?token=private');
  assert.deepEqual(page.messages.map(message => JSON.parse(message).stage), ['verifying', 'extracting']);
  assert.equal(page.messages.some(message => message.includes('private')), false);
});
