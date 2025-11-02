import { describe, expect, it } from 'vitest';

import { buildTimelineValue, normalizeTimeline, parseMonthYear, splitTimeline } from './timeline';

describe('buildTimelineValue', () => {
  it('returns year-month when both provided', () => {
    expect(buildTimelineValue({ year: '2020', month: '05' })).toBe('2020-05');
  });

  it('returns year when month missing', () => {
    expect(buildTimelineValue({ year: '2021' })).toBe('2021');
  });

  it('returns undefined when year missing', () => {
    expect(buildTimelineValue({ month: '05' })).toBeUndefined();
  });
});

describe('splitTimeline', () => {
  it('parses year-month string', () => {
    expect(splitTimeline('2020-04')).toEqual({ year: '2020', month: '04', isPresent: false });
  });

  it('handles present keyword', () => {
    expect(splitTimeline('present')).toEqual({ year: '', month: '', isPresent: true });
  });

  it('falls back to empty parts for invalid values', () => {
    expect(splitTimeline('invalid')).toEqual({ year: '', month: '', isPresent: false });
  });
});

describe('normalizeTimeline', () => {
  it('normalizes year-only, year-month, and ISO formats', () => {
    expect(normalizeTimeline('2020')).toBe('2020');
    expect(normalizeTimeline('2020-06')).toBe('2020-06');
    expect(normalizeTimeline('2020-06-15')).toBe('2020-06');
  });

  it('parses month-year strings', () => {
    expect(normalizeTimeline('June 2020')).toBe('2020-06');
    expect(normalizeTimeline('jun 2020')).toBe('2020-06');
  });

  it('returns undefined for blank input', () => {
    expect(normalizeTimeline('   ')).toBeUndefined();
  });
});

describe('parseMonthYear', () => {
  it('parses full month names', () => {
    expect(parseMonthYear('September 2018')).toBe('2018-09');
  });

  it('parses abbreviated month names', () => {
    expect(parseMonthYear('Sep 2018')).toBe('2018-09');
  });

  it('returns undefined for invalid strings', () => {
    expect(parseMonthYear('2020 Sep')).toBeUndefined();
  });
});
