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
  test('groups online members by highest hoisted role and puts offline in Offline', () => {
    const roles = [
      makeRole({
        id: OWNER_ROLE_ID,
        name: 'Owner',
        position: 3,
        hoist: true,
        isPersistent: true
      }),
      makeRole({
        id: 10,
        name: 'Admin',
        position: 2,
        hoist: true,
        color: '#ff0000'
      }),
      makeRole({
        id: 11,
        name: 'Mod',
        position: 1,
        hoist: true,
        color: '#00ff00'
      }),
      makeRole({
        id: 2,
        name: 'Member',
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
        name: 'PlainOnline',
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
      'online',
      'offline'
    ]);
    expect(groups[0]?.users.map((user) => user.id)).toEqual([1]);
    expect(groups[1]?.users.map((user) => user.id)).toEqual([2]);
    expect(groups[2]?.users.map((user) => user.id)).toEqual([3]);
    expect(groups[3]?.users.map((user) => user.id)).toEqual([4]);
  });

  test('ignores non-hoisted roles and the owner role for grouping', () => {
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
        name: 'HiddenVip',
        position: 1,
        hoist: false
      }),
      makeRole({
        id: 2,
        name: 'Member',
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

    expect(groups.map((group) => group.id)).toEqual(['online']);
    expect(groups[0]?.users.map((user) => user.id)).toEqual([1, 2]);
  });
});
