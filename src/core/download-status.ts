import type { Job } from './model.ts';
export type DownloadPhase = 'connecting' | 'verifying' | 'preparing' | 'extracting' | 'converting' | 'downloading' | 'saving' | 'complete';
export type DownloadSummary = {
  title: string; phase: DownloadPhase; percent: number | null;
  received: number; total: number; error: string | null;
  playlistId?: string; jobId?: string;
};
export const downloadLabels: Record<DownloadPhase, string> = {
  connecting: 'Connecting', verifying: 'Checking source', preparing: 'Preparing', extracting: 'Preparing audio',
  converting: 'Preparing audio', downloading: 'Downloading', saving: 'Saving', complete: 'Saved to your music',
};
export function downloadPercent(received: number, total: number): number | null {
  return Number.isFinite(received) && Number.isFinite(total) && total > 0 ? Math.max(0, Math.min(100, Math.round(received / total * 100))) : null;
}
export function jobDownloadSummary(job: Job): DownloadSummary {
  return { title: job.name, phase: job.state === 'verifying' ? 'saving' : job.state === 'completed' ? 'complete' : 'downloading',
    percent: job.state === 'completed' ? 100 : downloadPercent(job.received, job.total), received: job.received, total: job.total, error: job.error || null, playlistId: job.playlistId, jobId: job.id };
}
