import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appearancePreference, resolvedAppearance, lightColors, darkColors } from '../src/core/appearance.ts';

test('appearance defaults safely and respects an explicit theme over device changes', () => {
  for (const invalid of [null, undefined, 'invalid', {}, 42]) assert.equal(appearancePreference(invalid), 'system');
  assert.equal(resolvedAppearance('system', 'dark'), 'dark');
  assert.equal(resolvedAppearance('system', 'light'), 'light');
  assert.equal(resolvedAppearance('system', null), 'light');
  assert.equal(resolvedAppearance('light', 'dark'), 'light');
  assert.equal(resolvedAppearance('dark', 'light'), 'dark');
});
function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
test('both palettes provide readable body, secondary, action, and status text', () => {
  for (const [name, palette] of Object.entries({ light: lightColors, dark: darkColors })) {
    const pairs = [['onAccent', 'accent'], ['accent', 'accentSoft'], ['green', 'greenSoft'], ['danger', 'surface']];
    for (const background of ['canvas', 'surface', 'rail', 'welcome']) for (const foreground of ['ink', 'muted']) pairs.push([foreground, background]);
    for (const [foreground, background] of pairs) {
      const a = luminance(palette[foreground as keyof typeof palette]), b = luminance(palette[background as keyof typeof palette]);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      assert.ok(ratio >= 4.5, `${name} ${foreground}/${background}: ${ratio.toFixed(2)}`);
    }
  }
});
