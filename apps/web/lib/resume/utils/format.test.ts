import { describe, expect, it } from 'vitest';

import { formatPhoneNumber, normalizeSkillLabel } from './format';

describe('formatPhoneNumber', () => {
  it('formats US 10-digit numbers', () => {
    expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
  });

  it('strips leading 1 from 11-digit numbers and formats as standard US number', () => {
    expect(formatPhoneNumber('1 (415) 555-7890')).toBe('(415) 555-7890');
    expect(formatPhoneNumber('14155557890')).toBe('(415) 555-7890');
  });

  it('formats 7-digit local numbers', () => {
    expect(formatPhoneNumber('5551234')).toBe('555-1234');
  });

  it('returns trimmed original string for unsupported lengths', () => {
    expect(formatPhoneNumber('12345')).toBe('12345');
  });

  it('handles undefined or blank input', () => {
    expect(formatPhoneNumber(undefined)).toBe('');
    expect(formatPhoneNumber('   ')).toBe('');
  });
});

describe('normalizeSkillLabel', () => {
  it('capitalizes words and collapses spaces', () => {
    expect(normalizeSkillLabel(' customer   service ')).toBe('Customer Service');
  });

  it('preserves hyphen and slash separators', () => {
    expect(normalizeSkillLabel('cash-handling/POS')).toBe('Cash-Handling/POS');
  });

  it('keeps acronyms uppercase', () => {
    expect(normalizeSkillLabel('FEMA compliance')).toBe('FEMA Compliance');
  });

  it('returns empty string for blank input', () => {
    expect(normalizeSkillLabel('   ')).toBe('');
  });
});
