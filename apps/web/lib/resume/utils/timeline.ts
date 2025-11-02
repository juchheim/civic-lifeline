const MONTH_NAME_LOOKUP: Record<string, string> = {
  january: '01',
  jan: '01',
  february: '02',
  feb: '02',
  march: '03',
  mar: '03',
  april: '04',
  apr: '04',
  may: '05',
  june: '06',
  jun: '06',
  july: '07',
  jul: '07',
  august: '08',
  aug: '08',
  september: '09',
  sep: '09',
  october: '10',
  oct: '10',
  november: '11',
  nov: '11',
  december: '12',
  dec: '12',
};

export type TimelineParts = { month: string; year: string; isPresent: boolean };

export function buildTimelineValue({ year, month }: { year?: string; month?: string }) {
  const normalizedYear = year?.trim();
  const normalizedMonth = month?.trim();
  if (!normalizedYear) return undefined;
  if (normalizedMonth) {
    return `${normalizedYear}-${normalizedMonth}`;
  }
  return normalizedYear;
}

export function splitTimeline(value?: string): TimelineParts {
  if (!value) {
    return { month: '', year: '', isPresent: false };
  }
  const normalized = normalizeTimeline(value);
  if (!normalized) {
    return { month: '', year: '', isPresent: false };
  }
  if (normalized === 'present') {
    return { month: '', year: '', isPresent: true };
  }
  const match = normalized.match(/^(\d{4})(?:-(\d{2}))?$/);
  if (match) {
    return {
      year: match[1],
      month: match[2] ?? '',
      isPresent: false,
    };
  }
  return { month: '', year: '', isPresent: false };
}

export function normalizeTimeline(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === 'present') return 'present';
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  const yearMonthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (yearMonthMatch) {
    return `${yearMonthMatch[1]}-${yearMonthMatch[2]}`;
  }
  const yearMonthDayMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yearMonthDayMatch) {
    return `${yearMonthDayMatch[1]}-${yearMonthDayMatch[2]}`;
  }
  const monthYear = parseMonthYear(trimmed);
  if (monthYear) {
    return monthYear;
  }
  return trimmed;
}

export function parseMonthYear(value: string) {
  const match = value.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return undefined;
  const month = MONTH_NAME_LOOKUP[match[1].toLowerCase()];
  if (!month) return undefined;
  return `${match[2]}-${month}`;
}
