import { describe, expect, test } from 'bun:test';
import { getTwemojiUrl, toTwemojiCodepoint } from '../twemoji';

describe('twemoji', () => {
  test('encodes a simple emoji', () => {
    expect(toTwemojiCodepoint('😀')).toBe('1f600');
    expect(getTwemojiUrl('😀')).toContain('/1f600.png');
    expect(getTwemojiUrl('😀')).toContain('jdecked/twemoji@15.1.0');
  });

  test('strips variation selectors for standalone emoji', () => {
    expect(toTwemojiCodepoint('❤️')).toBe('2764');
  });

  test('keeps fe0f after zwj gender signs', () => {
    // with and without FE0F in the source string (TipTap often omits it)
    expect(toTwemojiCodepoint('🦸‍♂️')).toBe('1f9b8-200d-2642-fe0f');
    expect(toTwemojiCodepoint('🦸‍♂')).toBe('1f9b8-200d-2642-fe0f');
    expect(toTwemojiCodepoint('🧙‍♀️')).toBe('1f9d9-200d-2640-fe0f');
    expect(getTwemojiUrl('🦸‍♂️')).toContain('/1f9b8-200d-2642-fe0f.png');
  });

  test('keeps fe0f after zwj for occupation symbols', () => {
    expect(toTwemojiCodepoint('🧑‍⚕️')).toBe('1f9d1-200d-2695-fe0f');
    expect(toTwemojiCodepoint('🧑‍⚖')).toBe('1f9d1-200d-2696-fe0f');
    expect(toTwemojiCodepoint('🧑‍✈️')).toBe('1f9d1-200d-2708-fe0f');
  });

  test('keeps fe0f on heart before zwj sequences', () => {
    expect(toTwemojiCodepoint('❤️‍🔥')).toBe('2764-fe0f-200d-1f525');
    expect(toTwemojiCodepoint('❤️‍🩹')).toBe('2764-fe0f-200d-1fa79');
  });

  test('encodes eye in speech bubble without fe0f', () => {
    expect(toTwemojiCodepoint('👁️‍🗨️')).toBe('1f441-200d-1f5e8');
  });
});
