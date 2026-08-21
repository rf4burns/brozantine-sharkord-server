import {
  ChannelPermission,
  isDeletedUser,
  OWNER_ROLE_ID,
  type TJoinedMessage,
  type TJoinedPublicUser,
  type TJoinedRole,
  UserStatus
} from '@kurier/shared';
import type { channelPermissionsSelector } from './channels/selectors';

const canViewChannel = (
  channel: { id: number; private: boolean },
  channelPermissions: ReturnType<typeof channelPermissionsSelector>,
  isOwner: boolean,
  currentVoiceChannelId?: number
) => {
  if (isOwner || !channel.private) {
    return true;
  }

  if (channel.id === currentVoiceChannelId) {
    return true;
  }

  return (
    channelPermissions[channel.id]?.permissions?.[
      ChannelPermission.VIEW_CHANNEL
    ] === true
  );
};

const compareMessagesByDate = (a: TJoinedMessage, b: TJoinedMessage) => {
  const createdAtDifference = a.createdAt - b.createdAt;

  if (createdAtDifference !== 0) {
    return createdAtDifference;
  }

  return a.id - b.id;
};

const mergeMessagesChronologically = (
  existing: TJoinedMessage[],
  incoming: TJoinedMessage[]
) => {
  if (incoming.length === 0) {
    return existing;
  }

  const sortedIncoming = [...incoming].sort(compareMessagesByDate);

  if (existing.length === 0) {
    return sortedIncoming;
  }

  const firstExisting = existing[0];
  const lastExisting = existing[existing.length - 1];
  const firstIncoming = sortedIncoming[0];
  const lastIncoming = sortedIncoming[sortedIncoming.length - 1];

  if (compareMessagesByDate(lastExisting, firstIncoming) <= 0) {
    return [...existing, ...sortedIncoming];
  }

  if (compareMessagesByDate(lastIncoming, firstExisting) <= 0) {
    return [...sortedIncoming, ...existing];
  }

  const merged: TJoinedMessage[] = [];
  let existingIndex = 0;
  let incomingIndex = 0;

  while (
    existingIndex < existing.length &&
    incomingIndex < sortedIncoming.length
  ) {
    if (
      compareMessagesByDate(
        existing[existingIndex],
        sortedIncoming[incomingIndex]
      ) <= 0
    ) {
      merged.push(existing[existingIndex]);
      existingIndex += 1;
    } else {
      merged.push(sortedIncoming[incomingIndex]);
      incomingIndex += 1;
    }
  }

  if (existingIndex < existing.length) {
    merged.push(...existing.slice(existingIndex));
  }

  if (incomingIndex < sortedIncoming.length) {
    merged.push(...sortedIncoming.slice(incomingIndex));
  }

  return merged;
};

const getHighestRolePosition = (
  roleIds: number[] | undefined,
  roles: TJoinedRole[]
): number => {
  if (!roleIds || roleIds.length === 0) {
    return -1;
  }

  if (roleIds.includes(OWNER_ROLE_ID)) {
    return Number.MAX_SAFE_INTEGER;
  }

  const positions = roles
    .filter((role) => roleIds.includes(role.id))
    .map((role) => role.position);

  if (positions.length === 0) {
    return -1;
  }

  return Math.max(...positions);
};

const canModerateMember = (
  actorRoleIds: number[] | undefined,
  targetRoleIds: number[] | undefined,
  roles: TJoinedRole[],
  actorUserId: number | undefined,
  targetUserId: number
): boolean => {
  if (actorUserId === undefined || actorUserId === targetUserId) {
    return false;
  }

  if (actorRoleIds?.includes(OWNER_ROLE_ID)) {
    return true;
  }

  return (
    getHighestRolePosition(actorRoleIds, roles) >
    getHighestRolePosition(targetRoleIds, roles)
  );
};

export type TMemberListGroup = {
  id: string;
  labelKey: 'onlineGroup' | 'offlineGroup' | 'bannedGroup' | 'hoistedRole';
  label: string;
  color?: string;
  users: TJoinedPublicUser[];
};

const buildMemberListGroups = (
  users: TJoinedPublicUser[],
  roles: TJoinedRole[],
  maxUsers: number
): TMemberListGroup[] => {
  const visibleUsers = users.filter((user) => !isDeletedUser(user));

  // discord-style: only hoisted roles become section headers. owner and the
  // default/@everyone role never appear as groups.
  const hoistedRoles = [...roles]
    .filter(
      (role) => role.hoist && !role.isDefault && role.id !== OWNER_ROLE_ID
    )
    .sort((a, b) => b.position - a.position || a.id - b.id);

  const getHighestHoistedRole = (user: TJoinedPublicUser) => {
    const userHoistedRoles = hoistedRoles.filter((role) =>
      user.roleIds.includes(role.id)
    );

    return userHoistedRoles[0];
  };

  const isOnline = (user: TJoinedPublicUser) =>
    !user.banned && (user.status ?? UserStatus.OFFLINE) !== UserStatus.OFFLINE;

  const groups: TMemberListGroup[] = [];
  let remaining = maxUsers;
  const placedIds = new Set<number>();

  const takeUsers = (source: TJoinedPublicUser[]) => {
    const taken = source.slice(0, remaining);
    remaining -= taken.length;

    for (const user of taken) {
      placedIds.add(user.id);
    }

    return taken;
  };

  for (const role of hoistedRoles) {
    if (remaining <= 0) break;

    const members = takeUsers(
      visibleUsers.filter(
        (user) => isOnline(user) && getHighestHoistedRole(user)?.id === role.id
      )
    );

    if (members.length === 0) continue;

    groups.push({
      id: `role-${role.id}`,
      labelKey: 'hoistedRole',
      label: role.name,
      color: role.color,
      users: members
    });
  }

  if (remaining > 0) {
    const onlineUsers = takeUsers(
      visibleUsers.filter(
        (user) =>
          isOnline(user) &&
          !placedIds.has(user.id) &&
          !getHighestHoistedRole(user)
      )
    );

    if (onlineUsers.length > 0) {
      groups.push({
        id: 'online',
        labelKey: 'onlineGroup',
        label: 'Online',
        users: onlineUsers
      });
    }
  }

  if (remaining > 0) {
    const offlineUsers = takeUsers(
      visibleUsers.filter(
        (user) => !user.banned && !isOnline(user) && !placedIds.has(user.id)
      )
    );

    if (offlineUsers.length > 0) {
      groups.push({
        id: 'offline',
        labelKey: 'offlineGroup',
        label: 'Offline',
        users: offlineUsers
      });
    }
  }

  if (remaining > 0) {
    const bannedUsers = takeUsers(
      visibleUsers.filter((user) => user.banned && !placedIds.has(user.id))
    );

    if (bannedUsers.length > 0) {
      groups.push({
        id: 'banned',
        labelKey: 'bannedGroup',
        label: 'Banned',
        users: bannedUsers
      });
    }
  }

  return groups;
};

export {
  buildMemberListGroups,
  canModerateMember,
  canViewChannel,
  getHighestRolePosition,
  mergeMessagesChronologically
};
