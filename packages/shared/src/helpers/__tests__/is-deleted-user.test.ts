import { describe, expect, test } from 'bun:test';
import { DELETED_USER_IDENTITY_AND_NAME } from '../../statics';
import { isDeletedUser } from '../is-deleted-user';

describe('is-deleted-user', () => {
  test('should return true when deleted is set', () => {
    expect(isDeletedUser({ deleted: true, name: 'Ada' })).toBe(true);
  });

  test('should return true for the legacy placeholder name', () => {
    expect(isDeletedUser({ name: DELETED_USER_IDENTITY_AND_NAME })).toBe(true);
  });

  test('should return true for the legacy placeholder identity', () => {
    expect(
      isDeletedUser({ identity: DELETED_USER_IDENTITY_AND_NAME, name: 'Ada' })
    ).toBe(true);
  });

  test('should return false for a live user', () => {
    expect(
      isDeletedUser({ deleted: false, name: 'Ada', identity: 'ada' })
    ).toBe(false);
  });
});
