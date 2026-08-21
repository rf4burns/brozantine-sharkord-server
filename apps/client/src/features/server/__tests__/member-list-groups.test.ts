import {
  OWNER_ROLE_ID,
  UserStatus,
  type TJoinedPublicUser,
  type TJoinedRole
} from '@kurier/shared';
import { describe, expect, test } from 'bun:test';
import { buildMemberListGroups } from '../helpers';

const makeRole = (
  overrides: Partial<TJoinedRole> &
    Pick<TJoinedRole, 'id' | 'name' | 'position'>
): TJoinedRole => ({
  color: '#ffffff',
  isPersistent: false,
  isDefault: false,
  hoist: false,
  storageQuotaOverrideEnabled: false,
  storageSpaceQuota: 0,
  createdAt: 0,
  updatedAt: null,
  permissions: [],
  ...overrides
});

const makeUser = (
  overrides: Partial<TJoinedPublicUser> &
    Pick<TJoinedPublicUser, 'id' | 'name' | 'roleIds'>
): TJoinedPublicUser => ({
  nickname: null,
  pronouns: null,
  statusMessage: null,
  preferences: null,
  profileColor: '#5865f2',
  bio: null,
  avatar: null,
  avatarId: null,
  banner: null,
  bannerId: null,
  banned: false,
  deleted: false,
  createdAt: 0,
  status: UserStatus.ONLINE,
  ...overrides
});

describe('buildMemberListGroups', () => {
  test('orders ranks highest to lowest with the lowest rank above Offline', () => {
    const roles = [
      makeRole({
        id: OWNER_ROLE_ID,
        name: 'Owner',
        position: 3,
        isPersistent: true
      }),
      makeRole({
        id: 10,
        name: 'Trusted',
        position: 2,
        color: '#00ff00'
      }),
      makeRole({
        id: 11,
        name: 'Untrusted',
        position: 0,
        color: '#ff0000'
      })
    ];

    const users = [
      makeUser({
        id: 1,
        name: 'OnlineTrusted',
        roleIds: [10, 11],
        status: UserStatus.ONLINE
      }),
      makeUser({
        id: 2,
        name: 'OnlineUntrusted',
        roleIds: [11],
        status: UserStatus.ONLINE
      }),
      makeUser({
        id: 3,
        name: 'OfflineUntrusted',
        roleIds: [11],
        status: UserStatus.OFFLINE
      }),
      makeUser({
        id: 4,
        name: 'OfflineTrusted',
        roleIds: [10, 11],
        status: UserStatus.OFFLINE
      })
    ];

    const groups = buildMemberListGroups(users, roles, 100);

    expect(groups.map((group) => group.id)).toEqual([
      'role-10',
      'role-11',
      'offline'
    ]);
    expect(groups[0]?.label).toBe('Trusted');
    expect(groups[1]?.label).toBe('Untrusted');
    expect(groups[0]?.users.map((user) => user.id)).toEqual([1]);
    expect(groups[1]?.users.map((user) => user.id)).toEqual([2, 3]);
    expect(groups[2]?.users.map((user) => user.id)).toEqual([4]);
  });

  test('groups online members by highest non-owner role', () => {
    const roles = [
      makeRole({
        id: OWNER_ROLE_ID,
        name: 'Owner',
        position: 3,
        isPersistent: true
      }),
      makeRole({
        id: 10,
        name: 'Admin',
        position: 2,
        color: '#ff0000'
      }),
      makeRole({
        id: 11,
        name: 'Mod',
        position: 1,
        color: '#00ff00'
      }),
      makeRole({
        id: 2,
        name: 'Untrusted',
        position: 0,
        isDefault: true,
        isPersistent: true
      })
    ];

    const users = [
      makeUser({
        id: 1,
        name: 'OwnerUser',
        roleIds: [OWNER_ROLE_ID, 10, 2],
        status: UserStatus.ONLINE
      }),
      makeUser({
        id: 2,
        name: 'ModUser',
        roleIds: [11, 2],
        status: UserStatus.IDLE
      }),
      makeUser({
        id: 3,
        name: 'UntrustedOnline',
        roleIds: [2],
        status: UserStatus.ONLINE
      }),
      makeUser({
        id: 4,
        name: 'OfflineAdmin',
        roleIds: [10, 2],
        status: UserStatus.OFFLINE
      })
    ];

    const groups = buildMemberListGroups(users, roles, 100);

    expect(groups.map((group) => group.id)).toEqual([
      'role-10',
      'role-11',
      'role-2',
      'offline'
    ]);
    expect(groups[0]?.users.map((user) => user.id)).toEqual([1]);
    expect(groups[1]?.users.map((user) => user.id)).toEqual([2]);
    expect(groups[2]?.users.map((user) => user.id)).toEqual([3]);
    expect(groups[3]?.users.map((user) => user.id)).toEqual([4]);
  });

  test('ignores the owner role for grouping', () => {
    const roles = [
      makeRole({
        id: OWNER_ROLE_ID,
        name: 'Owner',
        position: 2,
        isPersistent: true
      }),
      makeRole({
        id: 10,
        name: 'Vip',
        position: 1
      }),
      makeRole({
        id: 2,
        name: 'Untrusted',
        position: 0,
        isDefault: true,
        isPersistent: true
      })
    ];

    const users = [
      makeUser({
        id: 1,
        name: 'OwnerOnly',
        roleIds: [OWNER_ROLE_ID, 2],
        status: UserStatus.ONLINE
      }),
      makeUser({
        id: 2,
        name: 'VipOnline',
        roleIds: [10, 2],
        status: UserStatus.ONLINE
      })
    ];

    const groups = buildMemberListGroups(users, roles, 100);

    expect(groups.map((group) => group.id)).toEqual(['role-10', 'role-2']);
    expect(groups[0]?.users.map((user) => user.id)).toEqual([2]);
    expect(groups[1]?.users.map((user) => user.id)).toEqual([1]);
  });

  test('keeps the lowest rank when the member list is capped', () => {
    const roles = [
      makeRole({
        id: 10,
        name: 'Trusted',
        position: 2,
        color: '#00ff00'
      }),
      makeRole({
        id: 11,
        name: 'Untrusted',
        position: 0,
        color: '#ff0000'
      })
    ];

    const users = [
      makeUser({
        id: 1,
        name: 'OnlineTrusted',
        roleIds: [10],
        status: UserStatus.ONLINE
      }),
      makeUser({
        id: 2,
        name: 'OfflineUntrusted',
        roleIds: [11],
        status: UserStatus.OFFLINE
      })
    ];

    const groups = buildMemberListGroups(users, roles, 1);

    expect(groups.map((group) => group.id)).toEqual(['role-11']);
    expect(groups[0]?.users.map((user) => user.id)).toEqual([2]);
  });
});
