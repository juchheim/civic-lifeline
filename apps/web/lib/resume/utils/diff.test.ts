import { describe, expect, it } from 'vitest';

import { diffWords, mergeSegments, tokenizeForDiff } from './diff';

describe('tokenizeForDiff', () => {
  it('splits text into words and whitespace tokens', () => {
    expect(tokenizeForDiff('Hello world')).toEqual(['Hello', ' ', 'world']);
  });
});

describe('mergeSegments', () => {
  it('merges adjacent segments of same type', () => {
    const merged = mergeSegments([
      { type: 'added', value: 'Hello' },
      { type: 'added', value: ' ' },
      { type: 'removed', value: 'Earth' },
      { type: 'removed', value: '!' },
    ]);
    expect(merged).toEqual([
      { type: 'added', value: 'Hello ' },
      { type: 'removed', value: 'Earth!' },
    ]);
  });
});

describe('diffWords', () => {
  it('identifies added and removed segments', () => {
    const result = diffWords('hello earth', 'hello world');
    expect(result).toEqual([
      { type: 'unchanged', value: 'hello ' },
      { type: 'removed', value: 'earth' },
      { type: 'added', value: 'world' },
    ]);
  });
});
