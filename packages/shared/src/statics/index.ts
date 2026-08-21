export * from './metrics';
export * from './permissions';
export * from './storage';

export const DEFAULT_MESSAGES_LIMIT = 100;

export const DEFAULT_ACTIVITY_LOG_LIMIT = 50;

export const MAX_NICKNAME_LENGTH = 24;

export const MAX_PRONOUNS_LENGTH = 32;

export const MAX_STATUS_MESSAGE_LENGTH = 128;

export const OWNER_ROLE_ID = 1;

export const TYPING_MS = 300;

export enum DisconnectCode {
  UNEXPECTED = 1006,
  KICKED = 40000,
  BANNED = 40001,
  SERVER_SHUTDOWN = 40002,
  DELETED = 40003
}

export const DELETED_USER_IDENTITY_AND_NAME = '__deleted_user__'; // this will be used as identity AND name, but in the interface we render as "Deleted"

export const DEFAULT_BITRATE = 6000; // kbps,
