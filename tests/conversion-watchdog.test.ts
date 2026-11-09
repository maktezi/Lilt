import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchConversion } from '../src/core/conversion-watchdog.ts';

function fakeClock() {
  let now = 0, id = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  return {
    clock: {
      setTimeout: ((callback: () => void, delay: number) => { timers.set(++id, { at: now + delay, callback }); return id; }) as unknown as typeof setTimeout,
      clearTimeout: ((key: number) => { timers.delete(key); }) as unknown as typeof clearTimeout,
    },
    advance(ms: number) {
      const target = now + ms;
      while (true) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].callback();
      }
      now = target;
    },
  };
}
test('a hung conversion exits once instead of leaving a looping loader', () => {
  const time = fakeClock(); let failed = 0;
  watchConversion(() => failed++, time.clock, 60, 240);
  time.advance(61); assert.equal(failed, 1);
  time.advance(500); assert.equal(failed, 1);
});
test('unchanged polling does not keep a stalled conversion alive', () => {
  const time = fakeClock(); let failed = 0;
  const watcher = watchConversion(() => failed++, time.clock, 60, 240);
  watcher.progress('converting:10');
  time.advance(40); watcher.progress('converting:10');
  time.advance(21); assert.equal(failed, 1);
});
test('genuine progress resets idle time but cannot extend the absolute deadline', () => {
  const time = fakeClock(); let failed = 0;
  const watcher = watchConversion(() => failed++, time.clock, 60, 240);
  for (let percent = 10; percent <= 40; percent += 10) { time.advance(50); watcher.progress(`converting:${percent}`); }
  assert.equal(failed, 0);
  time.advance(41); assert.equal(failed, 1);
});
test('success, cancellation, or retry stops the previous attempt timer', () => {
  const time = fakeClock(); let failed = 0;
  const watcher = watchConversion(() => failed++, time.clock, 60, 240);
  watcher.stop(); watcher.progress('late message'); time.advance(500);
  assert.equal(failed, 0);
});
test('connection checks expire promptly while active extraction gets a longer deadline', () => {
  const time = fakeClock(); let failed = 0;
  const watcher = watchConversion(() => failed++, time.clock, 20, 240);
  time.advance(10); watcher.progress('verifying', 20);
  time.advance(15); assert.equal(failed, 0);
  watcher.progress('extracting', 60);
  time.advance(50); assert.equal(failed, 0);
  time.advance(11); assert.equal(failed, 1);
});
