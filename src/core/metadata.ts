import { MAX_BYTES } from './model.ts';
const ascii = (bytes: Uint8Array, start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));
const syncSafe = (b: Uint8Array, i: number) => ((b[i] & 127) << 21) | ((b[i + 1] & 127) << 14) | ((b[i + 2] & 127) << 7) | (b[i + 3] & 127);
export function inspectAudio(bytes: Uint8Array, filename: string) {
  if (bytes.length > MAX_BYTES) throw new Error('This file exceeds the 100 MB per-track limit.');
  if (bytes.length < 44) throw new Error('This file is empty or too short to be audio.');
  const id3 = ascii(bytes, 0, 3) === 'ID3';
  const offset = id3 ? 10 + syncSafe(bytes, 6) : 0;
  const mp3 = bytes[offset] === 255 && (bytes[offset + 1] & 224) === 224 && (bytes[offset + 1] & 6) !== 0;
  const wav = ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE';
  const m4a = ascii(bytes, 4, 4) === 'ftyp' && /M4A|isom|mp4/.test(ascii(bytes, 8, 24));
  if (!mp3 && !wav && !m4a) throw new Error('No supported audio header found. Choose an MP3, M4A, or WAV file.');
  let title = filename.replace(/\.[^.]+$/, '') || 'Untitled track';
  let artist = 'Unknown artist', album = 'Unknown album', duration = 0;
  if (id3 && [3, 4].includes(bytes[3]) && !(bytes[5] & 192)) {
    for (let pos = 10; pos + 10 < Math.min(offset, bytes.length);) {
      const frame = ascii(bytes, pos, 4);
      const size = bytes[3] === 4 ? syncSafe(bytes, pos + 4) : new DataView(bytes.buffer, bytes.byteOffset).getUint32(pos + 4);
      if (!size || size > 1024 * 1024 || pos + 10 + size > bytes.length) break;
      if (['TIT2', 'TPE1', 'TALB'].includes(frame)) {
        const encoding = bytes[pos + 10];
        try {
          const text = new TextDecoder(encoding === 0 ? 'iso-8859-1' : encoding === 3 ? 'utf-8' : encoding === 2 ? 'utf-16be' : 'utf-16le')
            .decode(bytes.subarray(pos + 11, pos + 10 + size)).replace(/\0/g, '').replace(/^\uFEFF/, '').trim();
          if (text) { if (frame === 'TIT2') title = text; if (frame === 'TPE1') artist = text; if (frame === 'TALB') album = text; }
        } catch { /* Keep filename fallback for an unsupported text encoding. */ }
      }
      pos += 10 + size;
    }
  }
  if (wav) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let rate = 0;
    for (let pos = 12; pos + 8 <= bytes.length;) {
      const size = view.getUint32(pos + 4, true), chunk = ascii(bytes, pos, 4);
      if (chunk === 'fmt ' && size >= 16 && pos + 24 <= bytes.length) rate = view.getUint32(pos + 16, true);
      if (chunk === 'data' && rate) { duration = Math.min(size, bytes.length - pos - 8) / rate; break; }
      pos += 8 + size + size % 2;
    }
  }
  return { title, artist, album, duration, mime: wav ? 'audio/wav' : mp3 ? 'audio/mpeg' : 'audio/mp4' };
}
