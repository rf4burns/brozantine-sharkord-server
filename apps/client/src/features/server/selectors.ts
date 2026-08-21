import { isDeletedUser, OWNER_ROLE_ID } from '@kurier/shared';
import { createSelector } from '@reduxjs/toolkit';
import { createCachedSelector } from 're-reselect';
import type { IRootState } from '../store';
import {
  channelPermissionsSelector,
  channelsByCategoryIdSelector,
  channelsReadStatesSelector,
  channelsSelector,
  currentVoiceChannelIdSelector
} from './channels/selectors';
import { buildMemberListGroups, canViewChannel } from './helpers';
import {
  threadTypingMapSelector,
  typingMapSelector
} from './messages/selectors';
import { rolesSelector } from './roles/selectors';
import type { TVoiceUser } from './types';
import {
  ownUserIdSelector,
  ownUserSelector,
  userByIdSelector,
  usersSelector
} from './users/selectors';
import { voiceChannelStateSelector } from './voice/selectors';

export const connectedSelector = (state: IRootState) => state.server.connected;

export const disconnectInfoSelector = (state: IRootState) =>
  state.server.disconnectInfo;

export const connectingSelector = (state: IRootState) =>
  state.server.connecting;

export const serverNameSelector = (state: IRootState) =>
  state.server.publicSettings?.name;

export const serverIdSelector = (state: IRootState) =>
  state.server.publicSettings?.serverId;

export const publicServerSettingsSelector = (state: IRootState) =>
  state.server.publicSettings;

export const pluginsEnabledSelector = (state: IRootState) =>
  !!state.server.publicSettings?.enablePlugins;

export const webRtcSimulcastEnabledSelector = (state: IRootState) =>
  !!state.server.publicSettings?.webRtcSimulcastEnabled;

export const infoSelector = (state: IRootState) => state.server.info;

export const activeFullscreenPluginIdSelector = (state: IRootState) =>
  state.server.activeFullscreenPluginId;

export const dmsOpenSelector = (state: IRootState) => state.server.dmsOpen;

export const ownUserRolesSelector = createSelector(
  [ownUserSelector, rolesSelector],
  (ownUser, roles) => {
    if (!ownUser?.roleIds) return [];
    return roles.filter((role) => ownUser.roleIds.includes(role.id));
  }
);

export const isOwnUserOwnerSelector = createSelector(
  [ownUserRolesSelector],
  (ownUserRoles) => ownUserRoles.some((role) => role.id === OWNER_ROLE_ID)
);

export const hasVisibleChannelsInCategorySelector = createCachedSelector(
  [
    (state: IRootState, categoryId: number) =>
      channelsByCategoryIdSelector(state, categoryId),
    channelPermissionsSelector,
    isOwnUserOwnerSelector,
    currentVoiceChannelIdSelector
  ],
  (channelsInCategory, channelPermissions, isOwner, currentVoiceChannelId) => {
    if (isOwner) return true;
    if (channelsInCategory.length === 0) return false;

    return channelsInCategory.some((channel) =>
      canViewChannel(
        channel,
        channelPermissions,
        isOwner,
        currentVoiceChannelId
      )
    );
  }
)((_, categoryId: number) => categoryId);

export const visibleChannelsInCategorySelector = createCachedSelector(
  [
    (state: IRootState, categoryId: number) =>
      channelsByCategoryIdSelector(state, categoryId),
    channelPermissionsSelector,
    isOwnUserOwnerSelector,
    currentVoiceChannelIdSelector
  ],
  (channelsInCategory, channelPermissions, isOwner, currentVoiceChannelId) =>
    channelsInCategory.filter((channel) =>
      canViewChannel(
        channel,
        channelPermissions,
        isOwner,
        currentVoiceChannelId
      )
    )
)((_, categoryId: number) => categoryId);

export const referenceableChannelsSelector = createSelector(
  [
    channelsSelector,
    channelPermissionsSelector,
    isOwnUserOwnerSelector,
    currentVoiceChannelIdSelector
  ],
  (channels, channelPermissions, isOwner, currentVoiceChannelId) =>
    channels
      .filter(
        (channel) =>
          !channel.isDm &&
          canViewChannel(
            channel,
            channelPermissions,
            isOwner,
            currentVoiceChannelId
          )
      )
      .sort((a, b) => a.position - b.position || a.id - b.id)
);

export const userRolesSelector = createSelector(
  [rolesSelector, userByIdSelector],
  (roles, user) => {
    if (!user?.roleIds) return [];
    return roles.filter((role) => user.roleIds.includes(role.id));
  }
);

export const userRolesIdsSelector = createSelector(
  [userByIdSelector],
  (user) => user?.roleIds || []
);

export const typingUsersByChannelIdSelector = createCachedSelector(
  [
    typingMapSelector,
    (_: IRootState, channelId: number) => channelId,
    ownUserIdSelector,
    usersSelector
  ],
  (typingMap, channelId, ownUserId, users) => {
    const userIds = typingMap[channelId] || [];

    return userIds
      .filter((id) => id !== ownUserId)
      .map((id) => users.find((u) => u.id === id))
      .filter((u) => !!u);
  }
)((_, channelId: number) => channelId);

export const hasSharingScreenUsersSelector = createCachedSelector(
  [voiceChannelStateSelector, (_: IRootState, channelId: number) => channelId],
  (voiceState) => {
    if (!voiceState) return false;

    return Object.values(voiceState.users).some((u) => u.sharingScreen);
  }
)((_, channelId: number) => channelId);

export const typingUsersByThreadIdSelector = createCachedSelector(
  [
    threadTypingMapSelector,
    (_: IRootState, parentMessageId: number) => parentMessageId,
    ownUserIdSelector,
    usersSelector
  ],
  (threadTypingMap, parentMessageId, ownUserId, users) => {
    const userIds = threadTypingMap[parentMessageId] || [];

    return userIds
      .filter((id) => id !== ownUserId)
      .map((id) => users.find((u) => u.id === id)!)
      .filter((u) => !!u);
  }
)((_, parentMessageId: number) => `thread-${parentMessageId}`);

export const voiceUsersByChannelIdSelector = createCachedSelector(
  [usersSelector, voiceChannelStateSelector],
  (users, voiceState) => {
    const voiceUsers: TVoiceUser[] = [];

    if (!voiceState) return voiceUsers;

    Object.entries(voiceState.users).forEach(([userIdStr, mapUser]) => {
      const userId = Number(userIdStr);
      const user = users.find((u) => u.id === userId);

      if (user) {
        const { joinedAt, ...voiceUserState } = mapUser;

        voiceUsers.push({
          ...user,
          state: voiceUserState,
          joinedAt
        });
      }
    });

    return voiceUsers;
  }
)((_state: IRootState, channelId: number) => channelId);

export const ownVoiceUserSelector = createSelector(
  [
    ownUserIdSelector,
    (state: IRootState) => {
      const channelId = currentVoiceChannelIdSelector(state);

      if (channelId === undefined) return undefined;

      return voiceUsersByChannelIdSelector(state, channelId);
    }
  ],
  (ownUserId, voiceUsers) =>
    voiceUsers?.find((voiceUser) => voiceUser.id === ownUserId)
);

export const mentionUnreadByChannelSelector = (
  state: IRootState,
  channelId: number
) => state.server.mentionUnreadByChannel[channelId] ?? 0;

export const mentionUnreadMapSelector = (state: IRootState) =>
  state.server.mentionUnreadByChannel;

export const mentionUnreadTotalSelector = createSelector(
  [mentionUnreadMapSelector],
  (mentionUnreadByChannel) =>
    Object.values(mentionUnreadByChannel).reduce<number>(
      (total, count) => total + (count ?? 0),
      0
    )
);

// this approach has some limitations but it should work for most cases
export const hasUnreadMentionsSelector = createCachedSelector(
  [mentionUnreadByChannelSelector],
  (mentionUnread) => mentionUnread > 0
)((_, channelId: number) => channelId);

export const categoryUnreadMessagesCountSelector = createCachedSelector(
  [visibleChannelsInCategorySelector, channelsReadStatesSelector],
  (channelsInCategory, readStatesMap) => {
    return channelsInCategory.reduce((total, channel) => {
      return total + (readStatesMap[channel.id] ?? 0);
    }, 0);
  }
)((_, categoryId: number) => categoryId);

export const categoryHasUnreadMentionsSelector = createCachedSelector(
  [visibleChannelsInCategorySelector, mentionUnreadMapSelector],
  (channelsInCategory, mentionUnreadByChannel) => {
    return channelsInCategory.some(
      (channel) => (mentionUnreadByChannel[channel.id] ?? 0) > 0
    );
  }
)((_, categoryId: number) => categoryId);

const MEMBER_LIST_MAX_USERS = 100;

export const memberListGroupsSelector = createSelector(
  [usersSelector, rolesSelector],
  (users, roles) => buildMemberListGroups(users, roles, MEMBER_LIST_MAX_USERS)
);

export const memberListHiddenCountSelector = createSelector(
  [usersSelector, memberListGroupsSelector],
  (users, groups) => {
    const visibleCount = users.filter((user) => !isDeletedUser(user)).length;
    const shownCount = groups.reduce(
      (total, group) => total + group.users.length,
      0
    );

    return Math.max(0, visibleCount - shownCount);
  }
);
