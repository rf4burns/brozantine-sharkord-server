import {
  ChannelPermission,
  getMediasoupKind,
  Permission,
  ServerEvents,
  StreamKind
} from '@kurier/shared';
import { z } from 'zod';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const produceRoute = protectedProcedure
  .input(
    z.object({
      transportId: z.string(),
      kind: z.enum(StreamKind),
      rtpParameters: z.any(),
      qualityLayers: z
        .array(
          z.object({
            spatialLayer: z.number().int().nonnegative(),
            label: z.string().trim().min(1)
          })
        )
        .optional()
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

    if (input.kind === StreamKind.AUDIO) {
      await ctx.needsChannelPermission(
        ctx.currentVoiceChannelId,
        ChannelPermission.SPEAK
      );

      const voiceState = runtime.getUserState(ctx.user.id);

      invariant(!voiceState.serverMuted && !voiceState.serverDeafened, {
        code: 'FORBIDDEN',
        message: 'You cannot speak while server muted or deafened.'
      });
    } else if (input.kind === StreamKind.VIDEO) {
      await ctx.needsPermission(Permission.ENABLE_WEBCAM);
      await ctx.needsChannelPermission(
        ctx.currentVoiceChannelId,
        ChannelPermission.WEBCAM
      );
    } else if (input.kind === StreamKind.SCREEN) {
      await ctx.needsPermission(Permission.SHARE_SCREEN);
      await ctx.needsChannelPermission(
        ctx.currentVoiceChannelId,
        ChannelPermission.SHARE_SCREEN
      );
    }

    const producerTransport = runtime.getProducerTransport(ctx.user.id);

    invariant(producerTransport, {
      code: 'NOT_FOUND',
      message: 'Producer transport not found'
    });

    const producer = await producerTransport.produce({
      kind: getMediasoupKind(input.kind),
      rtpParameters: input.rtpParameters,
      appData: { kind: input.kind, userId: ctx.user.id }
    });

    runtime.addProducer(ctx.user.id, input.kind, producer, input.qualityLayers);

    ctx.pubsub.publishForChannel(
      ctx.currentVoiceChannelId,
      ServerEvents.VOICE_NEW_PRODUCER,
      {
        channelId: ctx.currentVoiceChannelId,
        remoteId: ctx.user.id,
        kind: input.kind
      }
    );

    return producer.id;
  });

export { produceRoute };
