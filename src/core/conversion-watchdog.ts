type Clock = { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };
/** Repeated polling is not progress. Stop idle attempts as well as overly long conversions. */
export function watchConversion(onTimeout: () => void, clock: Clock = { setTimeout, clearTimeout }, idleMs = 60_000, maximumMs = 240_000) {
  let stopped = false, lastSignal = '';
  let idle: ReturnType<typeof setTimeout>, maximum: ReturnType<typeof setTimeout>;
  function stop() { stopped = true; clock.clearTimeout(idle); clock.clearTimeout(maximum); }
  function timeout() { if (stopped) return; stop(); onTimeout(); }
  idle = clock.setTimeout(timeout, idleMs);
  maximum = clock.setTimeout(timeout, maximumMs);
  return {
    stop,
    progress(signal: string, nextIdleMs = idleMs) {
      if (stopped || signal === lastSignal) return;
      lastSignal = signal;
      clock.clearTimeout(idle); idle = clock.setTimeout(timeout, nextIdleMs);
    },
  };
}
