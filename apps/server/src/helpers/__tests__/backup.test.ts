import { describe, expect, test } from 'bun:test';
import { getBackupFilename } from '../backup';

describe('getBackupFilename', () => {
  test('should use a utc date stamp', () => {
    expect(getBackupFilename(new Date(Date.UTC(2026, 7, 21)))).toBe(
      'sharkord-backup-2026-08-21.zip'
    );
  });
});
