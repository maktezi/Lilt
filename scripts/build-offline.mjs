import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const html = await readFile('dist/index.html', 'utf8');
await writeFile('dist/index.html', html.replace('</head>', '<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"></head>'));
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
const assets = (await files('dist')).filter(path => !path.endsWith('.map') && !path.endsWith('sw.js')).map(path => `/${path.slice(5)}`);
const hash = createHash('sha256');
for (const asset of assets) hash.update(await readFile(`dist${asset}`));
const version = hash.digest('hex').slice(0, 16);
await writeFile('dist/sw.js', `
const CACHE = 'lilt-shell-${version}';
const ASSETS = ${JSON.stringify([...assets, '/'])};
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('lilt-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !ASSETS.includes(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request, {ignoreSearch: true})) || fetch(event.request)));
});
`);
console.log(`Offline application shell prepared: ${assets.length} assets, ${version}`);
