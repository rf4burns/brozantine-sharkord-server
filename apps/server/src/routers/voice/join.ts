import {
  ChannelPermission,
  ChannelType,
  Permission,
  ServerEvents
} from '@kurier/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { channels, users } from '../../db/schema';
import { overlayServerVoiceFlags } from '../../helpers/server-voice-state';
import { consumeVoiceMoveGrant } from '../../helpers/voice-move-grants';
import { logger } from '../../logger';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const joinVoiceRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.joinVoiceChannel.maxRequests,
  windowMs: config.rateLimiters.joinVoiceChannel.windowMs,
  logLabel: 'joinVoice'
})
  .input(
    z.object({
      channelId: z.number(),
      state: z.object({
        micMuted: z.boolean().default(false),
        soundMuted: z.boolean().default(false)
      })
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);

    const movedByModerator = consumeVoiceMoveGrant(
      ctx.user.id,
      input.channelId
    );

    if (!movedByModerator) {
      await ctx.needsChannelPermission(input.channelId, ChannelPermission.JOIN);
    }

    const channel = await db
      .select()
      .from(channels)
      .where(eq(channels.id, input.channelId))
      .get();

    invariant(channel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    invariant(channel.type === ChannelType.VOICE, {
      code: 'BAD_REQUEST',
      message: 'Channel is not a voice channel'
    });

    const userAlreadyInVoiceChannel = VoiceRuntime.findRuntimeByUserId(
      ctx.user.id
    );

    invariant(!userAlreadyInVoiceChannel, {
      code: 'BAD_REQUEST',
      message: 'User already in a voice channel'
    });

    const runtime = VoiceRuntime.findById(input.channelId);

    invariant(runtime, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Voice runtime not found for this channel'
    });

    const memberVoiceFlags = await db
      .select({
        serverMuted: users.serverMuted,
        serverDeafened: users.serverDeafened
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1)
      .get();

    runtime.addUser(
      ctx.user.id,
      overlayServerVoiceFlags(input.state, {
        serverMuted: memberVoiceFlags?.serverMuted ?? false,
        serverDeafened: memberVoiceFlags?.serverDeafened ?? false
      })
    );

    const voiceUser = runtime.getUser(ctx.user.id);

    invariant(voiceUser, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to join voice channel'
    });

    ctx.currentVoiceChannelId = channel.id;
    ctx.pubsub.publish(ServerEvents.USER_JOIN_VOICE, {
      channelId: input.channelId,
      userId: ctx.user.id,
      state: voiceUser.state,
      joinedAt: voiceUser.joinedAt,
      occupiedSince: runtime.getState().occupiedSince
    });

    logger.info('%s joined voice channel %s', ctx.user.name, channel.name);

    const router = runtime.getRouter();

    return {
      routerRtpCapabilities: router.rtpCapabilities
    };
  });

export { joinVoiceRoute };
