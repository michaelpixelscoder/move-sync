import { format, formatDistanceStrict, isToday } from 'date-fns';

export function formatBytes(bytes: number) {
  if (bytes <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** exponent).toFixed(exponent > 1 ? 1 : 0)} ${units[exponent]}`;
}
export function formatDuration(ms: number) {
  if (!ms) return '—';
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}
export function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
export function formatMediaCaptureDate(value: number, now = new Date()) {
  const capturedAt = new Date(value);
  const hoursSinceCapture =
    Math.abs(now.getTime() - capturedAt.getTime()) / (60 * 60 * 1000);
  if (hoursSinceCapture < 6)
    return formatDistanceStrict(capturedAt, now, { addSuffix: true });
  if (isToday(capturedAt))
    return `Today, ${format(capturedAt, 'h:mm a').toLowerCase()}`;
  return format(
    capturedAt,
    capturedAt.getFullYear() === now.getFullYear() ? 'd MMMM' : 'd MMMM yyyy',
  );
}
export function formatFullDateTime(value: number) {
  return format(new Date(value), 'PPPP, h:mm a');
}
export function titleFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
}
