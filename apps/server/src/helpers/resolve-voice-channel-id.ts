import { VoiceRuntime } from '../runtimes/voice';
import type { Context } from '../utils/trpc';

// prefer the connection-scoped value set by join/leave; fall back to the
// runtime so subscriptions still work if ctx was created before join or the
// socket reconnected while the user remained in voice.
const resolveVoiceChannelId = (ctx: Context): number | undefined => {
  if (ctx.currentVoiceChannelId) {
    return ctx.currentVoiceChannelId;
  }

  const runtime = VoiceRuntime.findRuntimeByUserId(ctx.user.id);

  if (!runtime) {
    return undefined;
  }

  ctx.currentVoiceChannelId = runtime.id;

  return runtime.id;
};

export { resolveVoiceChannelId };
