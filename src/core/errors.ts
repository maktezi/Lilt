/** Native/network exceptions may echo a submitted URL or a private local path. */
export function publicError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (!(error instanceof Error)) return fallback;
  return error.message
    .replace(/https?:\/\/[^\s<>"')]+/gi, value => {
      try { const url = new URL(value); return `${url.origin}${url.pathname}`; } catch { return '[audio link]'; }
    })
    .replace(/(?:file|content):\/\/[^\s<>"')]+/gi, '[local audio file]');
}
