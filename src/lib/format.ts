const timeFmt = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFmt = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
});

const weekFmt = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' });

export type Tone = 'ok' | 'warn' | 'hot';

export function clamp(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function toneOf(value: number): Tone {
  if (value >= 85) return 'hot';
  if (value >= 65) return 'warn';
  return 'ok';
}

export function timeParts(date: Date): { hhmm: string; ss: string } {
  return {
    hhmm: timeFmt.format(date),
    ss: String(date.getSeconds()).padStart(2, '0'),
  };
}

export function dateLabel(date: Date): string {
  return `${dateFmt.format(date)} ${weekFmt.format(date)}`;
}
