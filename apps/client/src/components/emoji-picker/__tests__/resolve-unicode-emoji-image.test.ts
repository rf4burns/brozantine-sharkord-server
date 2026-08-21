import { describe, expect, test } from 'bun:test';
import { resolveUnicodeEmojiImage } from '../emoji-data';

describe('resolveUnicodeEmojiImage', () => {
  test('resolves a known emoji name to a Twemoji CDN URL', () => {
    const url = resolveUnicodeEmojiImage('grinning');

    expect(url).toBeDefined();
    expect(url).toContain('jdecked/twemoji@15.1.1');
    expect(url).toContain('/1f600.png');
  });

  test('resolves by shortcode', () => {
    const url = resolveUnicodeEmojiImage('smile');

    expect(url).toBeDefined();
    expect(url).toContain('jdecked/twemoji@15.1.1');
  });

  test('returns undefined for unknown names', () => {
    expect(resolveUnicodeEmojiImage('not_a_real_emoji_xyz')).toBeUndefined();
  });
});
