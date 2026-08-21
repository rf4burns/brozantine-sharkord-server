import { DisconnectCode, type TUserLeftReason } from '@kurier/shared';

const getUserLeftReason = (code: number): TUserLeftReason => {
  if (code === DisconnectCode.BANNED) {
    return 'ban';
  }

  if (code === DisconnectCode.SERVER_SHUTDOWN) {
    return 'server_shutdown';
  }

  if (code === DisconnectCode.DELETED) {
    return 'delete';
  }

  if (code === DisconnectCode.KICKED) {
    return 'kick';
  }

  return 'disconnect';
};

export { getUserLeftReason };
