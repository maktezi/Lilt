import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDoublePress } from '../src/core/double-press.ts';
import { downloadPercent } from '../src/core/download-status.ts';

test('song activation requires a pair of presses and fires only once per pair', () => {
  let now = 1000, played = 0;
  const press = createDoublePress(() => played++, () => now);
  press(); assert.equal(played, 0);
  now += 150; press(); assert.equal(played, 1);
  now += 100; press(); assert.equal(played, 1);
  now += 500; press(); assert.equal(played, 1);
  now += 150; press(); assert.equal(played, 2);
});
test('unknown download lengths stay indeterminate and real progress is bounded', () => {
  assert.equal(downloadPercent(100, 0), null);
  assert.equal(downloadPercent(100, -1), null);
  assert.equal(downloadPercent(100, Infinity), null);
  assert.equal(downloadPercent(25, 100), 25);
  assert.equal(downloadPercent(200, 100), 100);
  assert.equal(downloadPercent(-1, 100), 0);
});
