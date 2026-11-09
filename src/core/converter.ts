import { youtubeVideoLink } from './sources.ts';
import type { DownloadSummary } from './download-status.ts';

export type ConverterProvider = 'flvto' | 'ytmp3';
export type AudioQuality = 128 | 192 | 256 | 320;
export function providerForQuality(quality: AudioQuality): ConverterProvider {
  return quality === 192 ? 'ytmp3' : 'flvto';
}
export function qualityForProvider(provider: ConverterProvider, requested: AudioQuality): AudioQuality {
  return provider === 'ytmp3' ? 192 : requested === 192 ? 320 : requested;
}
export type ConverterProps = {
  videoLink: string; quality: AudioQuality; provider: ConverterProvider;
  visible: boolean;
  playlistId?: string;
  onMinimize: () => void;
  onUpdate: (summary: DownloadSummary | null) => void;
  onClose: () => void;
  onDone: () => void;
  onDownload: (url: string, filename: string, signal: AbortSignal, progress: (state: { phase: 'downloading' | 'saving'; received: number; total: number; jobId?: string }) => void) => Promise<void>;
};
export function converterPage(provider: ConverterProvider, link: string) {
  const canonical = youtubeVideoLink(link);
  if (!canonical) throw new Error('Enter a valid YouTube video link.');
  const id = new URL(canonical).searchParams.get('v')!;
  // Flvto embeds this public player on its /download page. YTMP3 supports a video/format hash.
  return provider === 'flvto' ? `https://embed.dlsrv.online/v1/full?videoId=${id}` : `https://ytmp3.gl/#${id}/mp3`;
}
export function converterOrigin(url: string) {
  try { return ['https://embed.dlsrv.online', 'https://ytmp3.gl'].includes(new URL(url).origin); } catch { return false; }
}
export function converterDownload(message: string): { url: string; filename: string } | null {
  try {
    if (message.length > 16384) return null;
    const data = JSON.parse(message);
    if (data.type !== 'lilt-download' || typeof data.url !== 'string') return null;
    const url = new URL(data.url);
    // A remote page must never turn the app into a local-network downloader.
    if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') return null;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) return null;
    const title = typeof data.title === 'string' ? data.title : 'YouTube audio';
    const filename = (title.replace(/[\x00-\x1f/\\:*?"<>|]/g, '').replace(/\.mp3$/i, '').trim().slice(0, 150) || 'YouTube audio') + '.mp3';
    return { url: url.href, filename };
  } catch { return null; }
}

/** Runs inside the provider page. Observe completion, without reproducing its private API. */
export function converterBridge(provider: ConverterProvider, quality: AudioQuality) {
  return `(() => {
    if (window.__liltConverter) return true;
    window.__liltConverter = true;
    let sent = false, started = false, failed = false, verificationRejected = false;
    const send = value => window.ReactNativeWebView.postMessage(JSON.stringify(value));
    const progress = (stage, value) => send({type:'lilt-progress', stage, progress: typeof value === 'number' && Number.isFinite(value) ? value : null});
    const complete = (url, title) => {
      if (sent || typeof url !== 'string' || !url.startsWith('https://')) return;
      sent = true; send({type:'lilt-download', url, title: title || document.querySelector('form label')?.textContent || 'YouTube audio'});
    };
    const fail = () => { if (!sent && !failed) { failed = true; send({type:'lilt-error', reason: verificationRejected ? 'verification' : 'source'}); } };
    // Prevent advertising popups from leaving the app. Final audio is captured separately.
    window.open = () => null;
    if (${JSON.stringify(provider)} === 'flvto') {
      const original = window.fetch;
      window.fetch = async function(input, options) {
        let request;
        try { request = new URL(typeof input === 'string' ? input : input.url, location.href); } catch (_) {}
        const tracked = request && request.origin === location.origin && /^\\/api\\/(?:v3\\/(?:download|progress)|download\\/mp3)$/.test(request.pathname);
        const verification = request && (request.hostname === 'check.dlsrv.online' || request.origin === location.origin && request.pathname === '/api/verify');
        if (verification) progress('verifying', null);
        else if (request && request.hostname === 'www.youtube.com' && request.pathname === '/oembed') progress('preparing', null);
        if (tracked && !request.pathname.endsWith('/progress')) progress('converting', null);
        let response;
        try { response = await original.apply(this, arguments); }
        catch (error) { if (tracked) fail(); throw error; }
        if (verification && [401, 403].includes(response.status)) {
          verificationRejected = true;
          // A rejected source check cannot be repaired by waiting on the loading screen.
          // Stop this attempt rather than letting the page repeat its verification loop.
          fail();
        }
        try {
          if (request && request.hostname === 'www.youtube.com' && request.pathname === '/oembed' && response.ok) {
            const metadata = await response.clone().json();
            if (typeof metadata.title === 'string') send({type:'lilt-title', title:metadata.title});
          }
          if (tracked) {
            const result = await response.clone().json();
            if (!response.ok || result.error) fail();
            else {
              if (typeof result.progress === 'number') progress('converting', result.progress);
              if (result.url && (!request.pathname.endsWith('/progress') || result.done)) complete(result.url, document.querySelector('h1')?.textContent);
            }
          }
        } catch (_) { /* Keep the provider's response and behavior intact. */ }
        return response;
      };
      const timer = setInterval(() => {
        if (sent || started) { clearInterval(timer); return; }
        const row = Array.from(document.querySelectorAll('tr')).find(row => row.querySelector('td')?.textContent.trim() === '${quality}kbps');
        const button = row && Array.from(row.querySelectorAll('button')).find(button => button.textContent.trim() === 'Download');
        if (button && !button.disabled) { started = true; button.click(); }
        else {
          const tab = Array.from(document.querySelectorAll('button')).find(button => /^(MP3|Audio)$/i.test(button.textContent.trim()));
          if (tab && tab.getAttribute('aria-selected') !== 'true' && !tab.dataset.liltSelected) { tab.dataset.liltSelected = 'true'; tab.click(); }
        }
      }, 300);
      setTimeout(() => clearInterval(timer), 45000);
    } else {
      // The fallback spends time authenticating and extracting before its first progress callback.
      // Observe those existing requests; do not issue extra conversion requests.
      if (typeof XMLHttpRequest !== 'undefined') {
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
          try {
            const request = new URL(String(url), location.href);
            if (/(^|\\.)gammacloud\\.net$/.test(request.hostname)) {
              if (/\\/api\\/v1\\/(auth|init)$/.test(request.pathname)) progress('verifying', null);
              else if (request.pathname.endsWith('/convert')) progress('extracting', null);
            }
          } catch (_) {}
          return originalOpen.apply(this, arguments);
        };
      }
      // YTMP3 calls this function only when its progress polling has completed.
      const timer = setInterval(() => {
        if (sent) { clearInterval(timer); return; }
        if (typeof window.setLabel === 'function' && !window.setLabel.__lilt) {
          const original = window.setLabel;
          const wrapped = function(title) {
            if (typeof title === 'string' && !/^Error \\d/i.test(title)) send({type:'lilt-title', title});
            return original.apply(this, arguments);
          };
          wrapped.__lilt = true; window.setLabel = wrapped;
        }
        // This page's cProgress function only runs three 3-second animation timers.
        // Its download URL is already available; let the transfer queue request it now.
        if (typeof window.cProgress === 'function' && !window.cProgress.__lilt) {
          const wrapped = function(progressUrl, downloadUrl, title, stage, id, format) {
            if (format === 'mp3') complete(downloadUrl + '&v=' + encodeURIComponent(id) + '&f=mp3&r=' + location.hostname, title);
          };
          wrapped.__lilt = true; window.cProgress = wrapped;
        }
        if (typeof window.updateProgress === 'function' && !window.updateProgress.__lilt) {
          const original = window.updateProgress;
          const wrapped = function(stage) { progress(stage === 1 ? 'extracting' : stage === 2 ? 'converting' : 'preparing', null); return original.apply(this, arguments); };
          wrapped.__lilt = true; window.updateProgress = wrapped;
        }
        if (typeof window.download === 'function' && !window.download.__lilt) {
          const wrapped = function(url, id, format, title) {
            if (format === 'mp3') complete(url + '&v=' + encodeURIComponent(id) + '&f=mp3&r=' + location.hostname, title);
          };
          wrapped.__lilt = true; window.download = wrapped;
        }
        if (typeof window.error === 'function' && !window.error.__lilt) {
          const original = window.error;
          const wrapped = function() { original.apply(this, arguments); fail(); };
          wrapped.__lilt = true; window.error = wrapped;
        }
      }, 50);
      setTimeout(() => clearInterval(timer), 300000);
    }
    document.addEventListener('click', event => {
      const anchor = event.target.closest && event.target.closest('a[href]');
      if (anchor && (anchor.hasAttribute('download') || /\\.mp3(?:$|[?#])/i.test(anchor.href))) {
        event.preventDefault(); event.stopImmediatePropagation(); complete(anchor.href, anchor.download);
      }
    }, true);
    const errorTimer = setInterval(() => {
      if (sent || failed) { clearInterval(errorTimer); return; }
      const text = document.body?.innerText || '';
      if (/Download Failed|Something went wrong\\. Please try again\\.|Conversion failed|Error \\d+\\.\\d+/i.test(text)) fail();
    }, 500);
    setTimeout(() => clearInterval(errorTimer), 300000);
    true;
  })(); true;`;
}
