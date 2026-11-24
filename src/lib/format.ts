const timeFmt = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dayFmt = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
});

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

export function dayLabel(date: Date): string {
  return dayFmt.format(date);
}

const WEATHER: Record<string, string> = {
  clear_day: '晴',
  clear_night: '晴',
  cloudy_day: '多云',
  cloudy_night: '多云',
  light_rain_day: '小雨',
  light_rain_night: '小雨',
  heavy_rain_day: '大雨',
  heavy_rain_night: '大雨',
  snow_day: '雪',
  snow_night: '雪',
  thunder_day: '雷雨',
  thunder_night: '雷雨',
};

export function weatherLabel(status: string | undefined | null): string {
  if (!status) return '—';
  return WEATHER[status] ?? '—';
}
