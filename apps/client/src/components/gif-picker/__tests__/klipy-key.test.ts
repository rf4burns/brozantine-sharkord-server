import { describe, expect, test } from 'bun:test';
import {
  BROZANTINE_KLIPY_API_KEY,
  extractKey,
  isBrozantineHost
} from '../klipy-key';

describe('klipy-key', () => {
  test('extracts a scrapeable klipy url key', () => {
    const js = `fetch("https://api.klipy.com/api/v1/${BROZANTINE_KLIPY_API_KEY}/gifs/trending")`;

    expect(extractKey(js)).toBe(BROZANTINE_KLIPY_API_KEY);
  });

  test('extracts a vite env-style key', () => {
    expect(extractKey('VITE_KLIPY_API_KEY="abcdefghijklmnop1234"')).toBe(
      'abcdefghijklmnop1234'
    );
  });

  test('returns undefined when no key is present', () => {
    expect(extractKey('const x = 1;')).toBeUndefined();
  });

  test('detects brozantine hosts', () => {
    expect(isBrozantineHost('kurier.brozantine.com')).toBe(true);
    expect(isBrozantineHost('app.brozantine.com')).toBe(true);
    expect(isBrozantineHost('localhost')).toBe(false);
  });
});
