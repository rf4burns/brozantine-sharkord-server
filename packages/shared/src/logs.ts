/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { TChannel, TRole, TSettings } from './tables';
import type { ChannelType } from './types';

export enum ActivityLogType {
  SERVER_STARTED = 'SERVER_STARTED',
  EDIT_SERVER_SETTINGS = 'EDIT_SERVER_SETTINGS',
  // -------------------- USERS --------------------
  USER_CREATED = 'USER_CREATED',
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
  USER_KICKED = 'USER_KICKED',
  USER_BANNED = 'USER_BANNED',
  USER_UNBANNED = 'USER_UNBANNED',
  USER_DELETED = 'USER_DELETED',
  USER_UPDATED_PASSWORD = 'USER_UPDATED_PASSWORD',
  USER_ROLE_ADDED = 'USER_ROLE_ADDED',
  USER_ROLE_REMOVED = 'USER_ROLE_REMOVED',
  USER_MUTED = 'USER_MUTED',
  USER_UNMUTED = 'USER_UNMUTED',
  USER_DEAFENED = 'USER_DEAFENED',
  USER_UNDEAFENED = 'USER_UNDEAFENED',
  USER_MOVED = 'USER_MOVED',
  USER_NICKNAME_UPDATED = 'USER_NICKNAME_UPDATED',
  // -------------------- ROLES --------------------
  CREATED_ROLE = 'CREATED_ROLE',
  DELETED_ROLE = 'DELETED_ROLE',
  UPDATED_ROLE = 'UPDATED_ROLE',
  UPDATED_DEFAULT_ROLE = 'UPDATED_DEFAULT_ROLE',
  // -------------------- CHANNELS --------------------
  CREATED_CHANNEL = 'CREATED_CHANNEL',
  DELETED_CHANNEL = 'DELETED_CHANNEL',
  UPDATED_CHANNEL = 'UPDATED_CHANNEL',
  UPDATED_CHANNEL_PERMISSIONS = 'UPDATED_CHANNEL_PERMISSIONS',
  DELETED_CHANNEL_PERMISSIONS = 'DELETED_CHANNEL_PERMISSIONS',
  // -------------------- INVITES --------------------
  CREATED_INVITE = 'CREATED_INVITE',
  DELETED_INVITE = 'DELETED_INVITE',
  USED_INVITE = 'USED_INVITE',
  // -------------------- EMOJIS --------------------
  CREATED_EMOJI = 'CREATED_EMOJI',
  DELETED_EMOJI = 'DELETED_EMOJI',
  UPDATED_EMOJI = 'UPDATED_EMOJI',
  // -------------------- CATEGORIES --------------------
  CREATED_CATEGORY = 'CREATED_CATEGORY',
  DELETED_CATEGORY = 'DELETED_CATEGORY',
  UPDATED_CATEGORY = 'UPDATED_CATEGORY',
  // -------------------- PLUGINS --------------------
  EXECUTED_PLUGIN_COMMAND = 'EXECUTED_PLUGIN_COMMAND',
  EXECUTED_PLUGIN_ACTION = 'EXECUTED_PLUGIN_ACTION',
  PLUGIN_TOGGLED = 'PLUGIN_TOGGLED',
  // -------------------- MESSAGES --------------------
  TOGGLED_MESSAGE_PIN = 'TOGGLED_MESSAGE_PIN',
  MESSAGE_DELETED = 'MESSAGE_DELETED',
  MESSAGE_EDITED = 'MESSAGE_EDITED'
}

export type TActivityLogDetailsMap = {
  [ActivityLogType.SERVER_STARTED]: {};
  [ActivityLogType.EDIT_SERVER_SETTINGS]: {
    values: Partial<{
      [K in keyof TSettings]: any;
    }>;
  };
  // -------------------- USERS --------------------
  [ActivityLogType.USER_KICKED]: {
    reason: string | undefined;
    kickedBy: number;
    targetUserId: number;
    targetUsername: string;
  };
  [ActivityLogType.USER_BANNED]: {
    reason: string | undefined;
    bannedBy: number;
    targetUserId: number;
    targetUsername: string;
  };
  [ActivityLogType.USER_UNBANNED]: {
    unbannedBy: number;
    targetUserId: number;
    targetUsername: string;
  };
  [ActivityLogType.USER_DELETED]: {
    reason: string | undefined;
    deletedBy: number;
    targetUserId: number;
    targetUsername: string;
    wipe: boolean;
  };
  [ActivityLogType.USER_ROLE_ADDED]: {
    targetUserId: number;
    targetUsername: string;
    roleId: number;
    roleName: string;
    assignedBy: number;
  };
  [ActivityLogType.USER_ROLE_REMOVED]: {
    targetUserId: number;
    targetUsername: string;
    roleId: number;
    roleName: string;
    removedBy: number;
  };
  [ActivityLogType.USER_MUTED]: {
    targetUserId: number;
    targetUsername: string;
    mutedBy: number;
  };
  [ActivityLogType.USER_UNMUTED]: {
    targetUserId: number;
    targetUsername: string;
    unmutedBy: number;
  };
  [ActivityLogType.USER_DEAFENED]: {
    targetUserId: number;
    targetUsername: string;
    deafenedBy: number;
  };
  [ActivityLogType.USER_UNDEAFENED]: {
    targetUserId: number;
    targetUsername: string;
    undeafenedBy: number;
  };
  [ActivityLogType.USER_MOVED]: {
    targetUserId: number;
    targetUsername: string;
    movedBy: number;
    fromChannelId: number;
    fromChannelName: string;
    toChannelId: number;
    toChannelName: string;
  };
  [ActivityLogType.USER_NICKNAME_UPDATED]: {
    targetUserId: number;
    targetUsername: string;
    updatedBy: number;
    nickname: string | null;
  };
  [ActivityLogType.USER_CREATED]: {
    inviteCode: string | undefined;
    username: string;
  };
  [ActivityLogType.USER_JOINED]: {
    inviteCode: string | undefined;
  };
  [ActivityLogType.USER_LEFT]: {};
  [ActivityLogType.USER_UPDATED_PASSWORD]: {};
  // -------------------- ROLES --------------------
  [ActivityLogType.CREATED_ROLE]: {
    roleId: number;
    roleName: string;
  };
  [ActivityLogType.DELETED_ROLE]: {
    roleId: number;
    roleName: string;
  };
  [ActivityLogType.UPDATED_ROLE]: {
    roleId: number;
    permissions: string[];
    values: Partial<TRole>;
  };
  [ActivityLogType.UPDATED_DEFAULT_ROLE]: {
    newRoleId: number;
    oldRoleId: number;
    newRoleName: string;
    oldRoleName: string;
  };
  // -------------------- CHANNELS --------------------
  [ActivityLogType.CREATED_CHANNEL]: {
    channelId: number;
    channelName: string;
    type: ChannelType;
  };
  [ActivityLogType.DELETED_CHANNEL]: {
    channelId: number;
    channelName: string;
  };
  [ActivityLogType.UPDATED_CHANNEL]: {
    channelId: number;
    values: Partial<TChannel>;
  };
  [ActivityLogType.UPDATED_CHANNEL_PERMISSIONS]: {
    channelId: number;
    targetUserId?: number;
    targetRoleId?: number;
    permissions: {
      permission: string;
      allow: boolean;
    }[];
  };
  [ActivityLogType.DELETED_CHANNEL_PERMISSIONS]: {
    channelId: number;
    targetUserId?: number;
    targetRoleId?: number;
  };
  // -------------------- INVITES --------------------
  [ActivityLogType.CREATED_INVITE]: {
    code: string;
    maxUses: number;
    expiresAt: number | null;
  };
  [ActivityLogType.DELETED_INVITE]: {
    code: string;
  };
  [ActivityLogType.USED_INVITE]: {
    code: string;
  };
  // -------------------- EMOJIS --------------------
  [ActivityLogType.CREATED_EMOJI]: {
    name: string;
  };
  [ActivityLogType.DELETED_EMOJI]: {
    name: string;
  };
  [ActivityLogType.UPDATED_EMOJI]: {
    fromName: string;
    toName: string;
  };
  // -------------------- CATEGORIES --------------------
  [ActivityLogType.CREATED_CATEGORY]: {
    categoryId: number;
    categoryName: string;
  };
  [ActivityLogType.DELETED_CATEGORY]: {
    categoryId: number;
    categoryName: string;
  };
  [ActivityLogType.UPDATED_CATEGORY]: {
    categoryId: number;
    values: Partial<{
      name: string;
      position: number;
    }>;
  };
  // -------------------- PLUGINS --------------------
  [ActivityLogType.EXECUTED_PLUGIN_COMMAND]: {
    pluginId: string;
    commandName: string;
    args: Record<string, any>;
  };
  [ActivityLogType.EXECUTED_PLUGIN_ACTION]: {
    pluginId: string;
    actionName: string;
    payload: unknown;
  };
  [ActivityLogType.PLUGIN_TOGGLED]: {
    pluginId: string;
    enabled: boolean;
  };
  // -------------------- MESSAGES --------------------
  [ActivityLogType.TOGGLED_MESSAGE_PIN]: {
    messageId: number;
    channelId: number;
    pinned: boolean;
    pinnedBy: number;
  };
  [ActivityLogType.MESSAGE_DELETED]: {
    messageId: number;
    channelId: number;
    authorId: number | null;
    deletedBy: number;
    contentPreview: string | undefined;
  };
  [ActivityLogType.MESSAGE_EDITED]: {
    messageId: number;
    channelId: number;
    authorId: number | null;
    editedBy: number;
  };
};

export type TActivityLogDetails<T extends ActivityLogType = ActivityLogType> = {
  type: T;
  details: TActivityLogDetailsMap[T];
};
