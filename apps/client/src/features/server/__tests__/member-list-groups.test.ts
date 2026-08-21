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
  test('groups online members under hoisted roles like Discord', () => {
    const roles = [
      makeRole({
        id: OWNER_ROLE_ID,
        name: 'Owner',
        position: 4,
        hoist: true,
        isPersistent: true
      }),
      makeRole({
        id: 10,
        name: 'Emperor',
        position: 3,
        hoist: true,
        color: '#ff00aa'
      }),
      makeRole({
        id: 11,
        name: 'Guard',
        position: 2,
        hoist: true,
        color: '#ff0000'
      }),
      makeRole({
        id: 12,
        name: 'Citizen',
        position: 1,
        hoist: true,
        color: '#55aaff'
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
        name: 'EmperorUser',
        roleIds: [OWNER_ROLE_ID, 10, 2],
        status: UserStatus.ONLINE
      }),
      makeUser({
        id: 2,
        name: 'GuardIdle',
        roleIds: [11, 2],
        status: UserStatus.IDLE
      }),
      makeUser({
        id: 3,
        name: 'CitizenOnline',
        roleIds: [12, 2],
        status: UserStatus.ONLINE
      }),
      makeUser({
        id: 4,
        name: 'NoHoistOnline',
        roleIds: [2],
        status: UserStatus.ONLINE
      }),
      makeUser({
        id: 5,
        name: 'OfflineEmperor',
        roleIds: [10, 2],
        status: UserStatus.OFFLINE
      }),
      makeUser({
        id: 6,
        name: 'OfflineCitizen',
        roleIds: [12, 2],
        status: UserStatus.OFFLINE
      })
    ];

    const groups = buildMemberListGroups(users, roles, 100);

    expect(groups.map((group) => group.id)).toEqual([
      'role-10',
      'role-11',
      'role-12',
      'online',
      'offline'
    ]);
    expect(groups[0]?.label).toBe('Emperor');
    expect(groups[0]?.users.map((user) => user.id)).toEqual([1]);
    expect(groups[1]?.users.map((user) => user.id)).toEqual([2]);
    expect(groups[2]?.users.map((user) => user.id)).toEqual([3]);
    expect(groups[3]?.users.map((user) => user.id)).toEqual([4]);
    expect(groups[4]?.users.map((user) => user.id)).toEqual([5, 6]);
  });

  test('ignores owner and default roles as group headers', () => {
    const roles = [
      makeRole({
        id: OWNER_ROLE_ID,
        name: 'Owner',
        position: 2,
        hoist: true,
        isPersistent: true
      }),
      makeRole({
        id: 10,
        name: 'Vip',
        position: 1,
        hoist: true
      }),
      makeRole({
        id: 2,
        name: 'Untrusted',
        position: 0,
        hoist: true,
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

    expect(groups.map((group) => group.id)).toEqual(['role-10', 'online']);
    expect(groups[0]?.users.map((user) => user.id)).toEqual([2]);
    expect(groups[1]?.users.map((user) => user.id)).toEqual([1]);
  });

  test('does not group under non-hoisted roles', () => {
    const roles = [
      makeRole({
        id: 10,
        name: 'Trusted',
        position: 2,
        hoist: false,
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
        name: 'OnlineTrusted',
        roleIds: [10, 2],
        status: UserStatus.ONLINE
      }),
      makeUser({
        id: 2,
        name: 'OfflineTrusted',
        roleIds: [10, 2],
        status: UserStatus.OFFLINE
      })
    ];

    const groups = buildMemberListGroups(users, roles, 100);

    expect(groups.map((group) => group.id)).toEqual(['online', 'offline']);
    expect(groups[0]?.users.map((user) => user.id)).toEqual([1]);
    expect(groups[1]?.users.map((user) => user.id)).toEqual([2]);
  });

  test('respects the member list cap across groups', () => {
    const roles = [
      makeRole({
        id: 10,
        name: 'Trusted',
        position: 2,
        hoist: true,
        color: '#00ff00'
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
        name: 'OfflineUser',
        roleIds: [],
        status: UserStatus.OFFLINE
      })
    ];

    const groups = buildMemberListGroups(users, roles, 1);

    expect(groups.map((group) => group.id)).toEqual(['role-10']);
    expect(groups[0]?.users.map((user) => user.id)).toEqual([1]);
  });
});
