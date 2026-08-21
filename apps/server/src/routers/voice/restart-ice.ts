import { Permission } from '@kurier/shared';
import { z } from 'zod';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const restartIceRoute = protectedProcedure
  .input(
    z.object({
      direction: z.enum(['send', 'recv'])
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);

    invariant(ctx.currentVoiceChannelId, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    const runtime = VoiceRuntime.findById(ctx.currentVoiceChannelId);

    invariant(runtime, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Voice runtime not found for this channel'
    });

    const iceParameters = await runtime.restartIce(
      ctx.user.id,
      input.direction
    );

    invariant(iceParameters, {
      code: 'NOT_FOUND',
      message: 'Transport not found'
    });

    return iceParameters;
  });

export { restartIceRoute };
