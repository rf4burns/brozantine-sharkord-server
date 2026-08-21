import { describe, expect, test } from 'bun:test';
import { getTwemojiUrl, toTwemojiCodepoint } from '../twemoji';

describe('twemoji', () => {
  test('encodes a simple emoji', () => {
    expect(toTwemojiCodepoint('😀')).toBe('1f600');
    expect(getTwemojiUrl('😀')).toContain('/1f600.png');
  });

  test('strips variation selectors', () => {
    expect(toTwemojiCodepoint('❤️')).toBe('2764');
  });
});
