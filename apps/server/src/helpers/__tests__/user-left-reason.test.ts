import { DisconnectCode } from '@kurier/shared';
import { describe, expect, test } from 'bun:test';
import { getUserLeftReason } from '../user-left-reason';

describe('getUserLeftReason', () => {
  test('should map disconnect codes to plugin leave reasons', () => {
    expect(getUserLeftReason(DisconnectCode.BANNED)).toBe('ban');
    expect(getUserLeftReason(DisconnectCode.SERVER_SHUTDOWN)).toBe(
      'server_shutdown'
    );
    expect(getUserLeftReason(DisconnectCode.DELETED)).toBe('delete');
    expect(getUserLeftReason(DisconnectCode.KICKED)).toBe('kick');
    expect(getUserLeftReason(DisconnectCode.UNEXPECTED)).toBe('disconnect');
    expect(getUserLeftReason(1000)).toBe('disconnect');
  });
});
