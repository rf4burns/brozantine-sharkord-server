import { ChannelPermission, Permission, ServerEvents } from '@kurier/shared';
import { z } from 'zod';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const updateVoiceStateRoute = protectedProcedure
  .input(
    z.object({
      micMuted: z.boolean().optional(),
      soundMuted: z.boolean().optional(),
      webcamEnabled: z.boolean().optional(),
      sharingScreen: z.boolean().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);

    invariant(ctx.currentVoiceChannelId, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    const validatedInput = { ...input };

    const [
      canSpeak,
      hasWebcamPermission,
      hasScreenPermission,
      canUseWebcamChannel,
      canShareScreenChannel
    ] = await Promise.all([
      ctx.hasChannelPermission(
        ctx.currentVoiceChannelId,
        ChannelPermission.SPEAK
      ),
      ctx.hasPermission(Permission.ENABLE_WEBCAM),
      ctx.hasPermission(Permission.SHARE_SCREEN),
      ctx.hasChannelPermission(
        ctx.currentVoiceChannelId,
        ChannelPermission.WEBCAM
      ),
      ctx.hasChannelPermission(
        ctx.currentVoiceChannelId,
        ChannelPermission.SHARE_SCREEN
      )
    ]);

    const canUseWebcam = hasWebcamPermission && canUseWebcamChannel;
    const canShareScreen = hasScreenPermission && canShareScreenChannel;

    if (!canSpeak) {
      delete validatedInput.micMuted;
    }

    if (!canUseWebcam) {
      delete validatedInput.webcamEnabled;
    }

    if (!canShareScreen) {
      delete validatedInput.sharingScreen;
    }

    const runtime = VoiceRuntime.findById(ctx.currentVoiceChannelId);

    invariant(runtime, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Voice runtime not found for this channel'
    });

    const currentState = runtime.getUserState(ctx.user.id);

    if (currentState.serverMuted || currentState.serverDeafened) {
      delete validatedInput.micMuted;
    }

    if (currentState.serverDeafened) {
      delete validatedInput.soundMuted;
    }

    runtime.updateUserState(ctx.user.id, {
      ...validatedInput
    });

    const newState = runtime.getUserState(ctx.user.id);

    ctx.pubsub.publish(ServerEvents.USER_VOICE_STATE_UPDATE, {
      channelId: ctx.currentVoiceChannelId,
      userId: ctx.user.id,
      state: newState
    });
  });

export { updateVoiceStateRoute };
