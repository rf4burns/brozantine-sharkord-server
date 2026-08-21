import { ServerEvents, StreamKind, type TVoiceUserState } from '@kurier/shared';
import { VoiceRuntime } from '../runtimes/voice';
import { pubsub } from '../utils/pubsub';

const overlayServerVoiceFlags = (
  state: Pick<TVoiceUserState, 'micMuted' | 'soundMuted'>,
  flags: Pick<TVoiceUserState, 'serverMuted' | 'serverDeafened'>
): Pick<
  TVoiceUserState,
  'micMuted' | 'soundMuted' | 'serverMuted' | 'serverDeafened'
> => {
  return {
    serverMuted: flags.serverMuted,
    serverDeafened: flags.serverDeafened,
    micMuted: state.micMuted || flags.serverMuted || flags.serverDeafened,
    soundMuted: state.soundMuted || flags.serverDeafened
  };
};

const applyMemberVoiceModeration = (
  userId: number,
  patch: Partial<Pick<TVoiceUserState, 'serverMuted' | 'serverDeafened'>>
) => {
  const runtime = VoiceRuntime.findRuntimeByUserId(userId);

  if (!runtime) {
    return;
  }

  const current = runtime.getUserState(userId);
  const serverMuted = patch.serverMuted ?? current.serverMuted;
  const serverDeafened = patch.serverDeafened ?? current.serverDeafened;
  const nextState: Partial<TVoiceUserState> = {
    serverMuted,
    serverDeafened
  };

  if (serverMuted || serverDeafened) {
    nextState.micMuted = true;
  }

  if (serverDeafened) {
    nextState.soundMuted = true;
  }

  if (patch.serverDeafened === false) {
    nextState.soundMuted = false;
  }

  runtime.updateUserState(userId, nextState);

  if (serverMuted || serverDeafened) {
    runtime.removeProducer(userId, StreamKind.AUDIO);
  }

  pubsub.publish(ServerEvents.USER_VOICE_STATE_UPDATE, {
    channelId: runtime.id,
    userId,
    state: runtime.getUserState(userId)
  });
};

export { applyMemberVoiceModeration, overlayServerVoiceFlags };
