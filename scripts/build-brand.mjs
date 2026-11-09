import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

// Rebuild raster assets from the approved vector geometry using ImageMagick.
const mark = await readFile('assets/brand/mark.svg', 'utf8');
const geometry = mark.match(/<path[^>]+\/>/g).join('');
await mkdir('public/icons', { recursive: true });
function rasterize(svg, path, size) {
  const density = svg.includes('width="1024"') ? '144' : '576';
  const result = spawnSync('magick', ['-background', 'none', '-density', density, 'svg:-', '-resize', `${size}x${size}`, `PNG32:${path}`], { input: svg, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'ImageMagick export failed');
}
const icon = (rounded = false, foregroundOnly = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${foregroundOnly ? '' : `<rect width="1024" height="1024" rx="${rounded ? 232 : 0}" fill="#EF4B45"/>`}<g fill="#FFFFFF" transform="translate(${foregroundOnly ? '267 238' : '226 193'}) scale(${foregroundOnly ? '4.8' : '5.6'})">${geometry}</g></svg>`;
await writeFile('assets/brand/app-icon.svg', icon());
rasterize(await readFile('assets/brand/logo.svg', 'utf8'), 'assets/brand/logo.png', 1140);
rasterize(mark, 'assets/brand/mark.png', 440);
rasterize(icon(), 'assets/brand/app-icon.png', 1024);
rasterize(icon(false, true), 'assets/brand/adaptive-foreground.png', 1024);
rasterize(icon(true), 'assets/brand/favicon.png', 48);
for (const size of [192, 512]) rasterize(icon(), `public/icons/lilt-${size}.png`, size);
rasterize(icon(), 'public/icons/apple-touch-icon.png', 180);
console.log('Lilt brand assets exported.');
