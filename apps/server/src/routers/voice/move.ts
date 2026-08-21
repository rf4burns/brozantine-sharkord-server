import {
  ActivityLogType,
  ChannelType,
  Permission,
  ServerEvents
} from '@kurier/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { publishHiddenChannelToUser } from '../../db/publishers';
import { userCan } from '../../db/queries/roles';
import { channels, users } from '../../db/schema';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { grantVoiceMove } from '../../helpers/voice-move-grants';
import { logger } from '../../logger';
import { enqueueActivityLog } from '../../queues/activity-log';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const moveUserRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.moveMembers.maxRequests,
  windowMs: config.rateLimiters.moveMembers.windowMs,
  logLabel: 'moveUser'
})
  .input(
    z.object({
      userId: z.number(),
      channelId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MOVE_MEMBERS);

    // move is rank-agnostic: anyone with MOVE_MEMBERS can drag any member
    invariant(ctx.userId !== input.userId, {
      code: 'BAD_REQUEST',
      message: 'You cannot move yourself.'
    });

    const [channel, targetUser] = await Promise.all([
      db.select().from(channels).where(eq(channels.id, input.channelId)).get(),
      db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1)
        .get()
    ]);

    invariant(channel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    invariant(channel.type === ChannelType.VOICE, {
      code: 'BAD_REQUEST',
      message: 'Channel is not a voice channel'
    });

    // sidebar drop targets are viewable channels; JOIN is granted to the target
    await assertChannelAccess(ctx, input.channelId);

    const canUseVoice = await userCan(
      input.userId,
      Permission.JOIN_VOICE_CHANNELS
    );

    invariant(canUseVoice, {
      code: 'FORBIDDEN',
      message: 'Target user is not allowed to use voice channels'
    });

    const currentRuntime = VoiceRuntime.findRuntimeByUserId(input.userId);

    invariant(currentRuntime, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    const originChannel = await db
      .select({ isDm: channels.isDm, name: channels.name })
      .from(channels)
      .where(eq(channels.id, currentRuntime.id))
      .limit(1)
      .get();

    // dm calls are private to their participants, moderation does not reach into
    // them. same message as above so this does not leak that the user is in a dm
    invariant(!originChannel?.isDm, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    invariant(currentRuntime.id !== input.channelId, {
      code: 'BAD_REQUEST',
      message: 'User is already in that channel'
    });

    grantVoiceMove(input.userId, input.channelId);

    await publishHiddenChannelToUser(input.userId, input.channelId);

    ctx.pubsub.publishFor(input.userId, ServerEvents.USER_VOICE_MOVED, {
      channelId: input.channelId,
      fromChannelId: currentRuntime.id
    });

    await enqueueActivityLog({
      type: ActivityLogType.USER_MOVED,
      userId: ctx.userId,
      details: {
        targetUserId: input.userId,
        targetUsername: targetUser.name,
        movedBy: ctx.userId,
        fromChannelId: currentRuntime.id,
        fromChannelName: originChannel?.name ?? String(currentRuntime.id),
        toChannelId: input.channelId,
        toChannelName: channel.name
      }
    });

    logger.info(
      '%s moved user %s to voice channel %s',
      ctx.user.name,
      input.userId,
      channel.name
    );
  });

export { moveUserRoute };
