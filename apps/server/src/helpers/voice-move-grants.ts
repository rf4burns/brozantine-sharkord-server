const MOVE_GRANT_TTL_MS = 30_000;

type TVoiceMoveGrant = {
  channelId: number;
  expiresAt: number;
};

const voiceMoveGrants = new Map<number, TVoiceMoveGrant>();

const isGrantValid = (
  grant: TVoiceMoveGrant | undefined,
  channelId: number
): grant is TVoiceMoveGrant => {
  return (
    !!grant && grant.channelId === channelId && grant.expiresAt > Date.now()
  );
};

const grantVoiceMove = (userId: number, channelId: number): void => {
  voiceMoveGrants.set(userId, {
    channelId,
    expiresAt: Date.now() + MOVE_GRANT_TTL_MS
  });
};

const peekVoiceMoveGrant = (userId: number, channelId: number): boolean => {
  return isGrantValid(voiceMoveGrants.get(userId), channelId);
};

const consumeVoiceMoveGrant = (userId: number, channelId: number): boolean => {
  const grant = voiceMoveGrants.get(userId);

  if (!isGrantValid(grant, channelId)) {
    if (grant) {
      voiceMoveGrants.delete(userId);
    }

    return false;
  }

  voiceMoveGrants.delete(userId);

  return true;
};

const clearVoiceMoveGrantsForTests = (): void => {
  voiceMoveGrants.clear();
};

export {
  clearVoiceMoveGrantsForTests,
  consumeVoiceMoveGrant,
  grantVoiceMove,
  peekVoiceMoveGrant
};
