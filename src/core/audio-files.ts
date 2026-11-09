const extensions = { 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav' } as const;
export function audioExtension(mime: string) {
  const extension = extensions[mime as keyof typeof extensions];
  if (!extension) throw new Error('Unsupported audio format. Choose an MP3, M4A, or WAV file.');
  return extension;
}
export function audioFilename(track: { id: string; mime: string }) {
  return `${track.id}.${audioExtension(track.mime)}`;
}
export function audioFileCandidates(id: string) {
  return ['mp3', 'm4a', 'wav'].map(extension => `${id}.${extension}`).concat(id);
}
