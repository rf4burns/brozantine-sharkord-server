import { memberMatchKey } from '@/helpers/member-match-key';
import { describe, expect, test } from 'bun:test';

describe('memberMatchKey', () => {
  test('prefers identity over name', () => {
    expect(memberMatchKey({ name: 'Ada', identity: 'ada.lovelace' })).toBe(
      'ada.lovelace'
    );
  });

  test('falls back to display name', () => {
    expect(memberMatchKey({ name: 'Ada' })).toBe('ada');
  });

  test('uses _identity from public users', () => {
    expect(memberMatchKey({ name: 'Ada', _identity: 'Ada.Lovelace' })).toBe(
      'ada.lovelace'
    );
  });
});
