export type DiffSegment = {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
};

export function diffWords(original: string, revised: string): DiffSegment[] {
  const a = tokenizeForDiff(original);
  const b = tokenizeForDiff(revised);
  const m = a.length;
  const n = b.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      segments.push({ type: 'unchanged', value: b[j] });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      segments.push({ type: 'removed', value: a[i] });
      i += 1;
    } else {
      segments.push({ type: 'added', value: b[j] });
      j += 1;
    }
  }

  while (i < m) {
    segments.push({ type: 'removed', value: a[i] });
    i += 1;
  }

  while (j < n) {
    segments.push({ type: 'added', value: b[j] });
    j += 1;
  }

  return mergeSegments(segments);
}

export function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
  const merged: DiffSegment[] = [];
  for (const segment of segments) {
    if (!segment.value) continue;
    const previous = merged[merged.length - 1];
    if (previous && previous.type === segment.type) {
      previous.value += segment.value;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

export function tokenizeForDiff(text: string): string[] {
  return text.match(/\s+|\S+/g) ?? [];
}
