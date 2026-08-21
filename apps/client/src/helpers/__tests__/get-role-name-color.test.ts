import { OWNER_ROLE_ID, type TRole } from '@kurier/shared';
import { describe, expect, test } from 'bun:test';
import { getRoleNameColor } from '../get-role-name-color';

const makeRole = (
  overrides: Partial<TRole> & Pick<TRole, 'id' | 'name' | 'position' | 'color'>
): TRole => ({
  isPersistent: false,
  isDefault: false,
  hoist: false,
  storageQuotaOverrideEnabled: false,
  storageSpaceQuota: 0,
  createdAt: 0,
  updatedAt: null,
  ...overrides
});

describe('getRoleNameColor', () => {
  test('skips owner and uses the next highest colored role', () => {
    const color = getRoleNameColor([
      makeRole({
        id: OWNER_ROLE_ID,
        name: 'Owner',
        position: 3,
        color: '#ff0000',
        isPersistent: true
      }),
      makeRole({
        id: 10,
        name: 'Admin',
        position: 2,
        color: '#00ff00'
      }),
      makeRole({
        id: 2,
        name: 'Member',
        position: 0,
        color: '#99aab5',
        isDefault: true,
        isPersistent: true
      })
    ]);

    expect(color).toBe('#00ff00');
  });

  test('uses the default role color when it is the highest colored role', () => {
    const color = getRoleNameColor([
      makeRole({
        id: OWNER_ROLE_ID,
        name: 'Owner',
        position: 2,
        color: '#ffffff',
        isPersistent: true
      }),
      makeRole({
        id: 2,
        name: 'Untrusted',
        position: 0,
        color: '#ff0000',
        isDefault: true,
        isPersistent: true
      })
    ]);

    expect(color).toBe('#ff0000');
  });
});
