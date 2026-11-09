export function createDoublePress(action: () => void, now = Date.now, interval = 350) {
  let previous: number | null = null;
  return () => {
    const current = now();
    if (previous !== null && current >= previous && current - previous <= interval) { previous = null; action(); }
    else previous = current;
  };
}
