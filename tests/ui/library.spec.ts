import { test, expect } from '@playwright/test';
function wave() {
  const bytes = Buffer.alloc(160044); bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVE', 8); bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(160000, 40); return bytes;
}
test('import, favorite, playlist, restart, and offline playback', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByText('Within reach.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Import your first songs' }).click();
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose audio files' }).click();
  await (await picker).setFiles({ name: 'Morning.wav', mimeType: 'audio/wav', buffer: wave() });
  await expect(page.getByRole('button', { name: 'Play Morning by Unknown artist' })).toBeVisible();
  await page.getByRole('button', { name: 'Favorite Morning', exact: true }).click();
  await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
  await page.getByRole('textbox', { name: 'Playlist name', exact: true }).fill('Sunday songs');
  await page.getByRole('button', { name: 'Create playlist', exact: true }).last().click();
  await page.getByRole('button', { name: 'Back to collection' }).click();
  await page.getByRole('button', { name: 'Options for Morning' }).click();
  await page.getByRole('button', { name: 'Add to playlist', exact: true }).click();
  await page.getByRole('button', { name: 'Sunday songs', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unfavorite Morning', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sunday songs', exact: true })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true); await page.reload();
  await page.getByRole('button', { name: 'Play Morning by Unknown artist' }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open player for Morning' }).click();
  await expect(page.getByText('Playing from your device')).toBeVisible();
});
test('unsupported providers show actionable feedback', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add music', exact: true }).click();
  await page.getByRole('tab', { name: 'Paste links' }).click();
  await page.getByRole('textbox', { name: 'Direct audio links' }).fill('https://www.youtube.com/playlist?list=example');
  await page.getByRole('button', { name: 'Review links' }).click();
  await expect(page.getByRole('alert')).toContainText('YouTube acquisition is not connected');
});
test('switching between already loaded tracks starts the new source', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add music', exact: true }).click();
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose audio files' }).click();
  const second = wave(); second.writeInt16LE(12, 44);
  await (await picker).setFiles([{ name: 'First.wav', mimeType: 'audio/wav', buffer: wave() }, { name: 'Second.wav', mimeType: 'audio/wav', buffer: second }]);
  await expect(page.getByRole('button', { name: 'Play First by Unknown artist' })).toBeVisible();
  await page.getByRole('button', { name: 'Play First by Unknown artist' }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play Second by Unknown artist' }).click();
  await expect(page.getByRole('button', { name: 'Open player for Second' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open player for Second' }).click();
  await page.getByRole('button', { name: 'Repeat: none. Change repeat mode', exact: true }).click();
  await page.getByRole('button', { name: 'Repeat: all. Change repeat mode', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Repeat: single. Change repeat mode', exact: true })).toBeVisible();
});
for (const width of [360, 390, 768, 1440]) test(`collection fits at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  await expect(page.getByText('Your collection', { exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: `.impeccable/review/${width === 1440 ? 'desktop' : width === 390 ? 'mobile' : `user-${width}`}.png`, fullPage: true });
});
