export function formatPhoneNumber(value: string | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D+/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7);
    return `+1 (${area}) ${prefix}-${line}`;
  }

  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const line = digits.slice(6);
    return `(${area}) ${prefix}-${line}`;
  }

  if (digits.length === 7) {
    const prefix = digits.slice(0, 3);
    const line = digits.slice(3);
    return `${prefix}-${line}`;
  }

  return trimmed;
}

export function normalizeSkillLabel(label: string): string {
  const collapsed = label.replace(/\s+/g, ' ').trim();
  if (!collapsed || collapsed.length > 50) return '';

  return collapsed
    .split(' ')
    .map(segment =>
      segment
        .split(/([/-])/)
        .map(chunk => {
          if (chunk === '/' || chunk === '-') return chunk;
          if (!chunk) return '';
          if (/^[A-Z0-9]+$/.test(chunk)) return chunk.toUpperCase();
          return chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase();
        })
        .join(''),
    )
    .join(' ');
}
