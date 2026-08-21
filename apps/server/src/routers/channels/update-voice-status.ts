import { ChannelType, Permission } from '@kurier/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { publishChannel } from '../../db/publishers';
import { channels } from '../../db/schema';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const updateVoiceStatusRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.sendAndEditMessage.maxRequests,
  windowMs: config.rateLimiters.sendAndEditMessage.windowMs,
  logLabel: 'updateVoiceStatus'
})
  .input(
    z.object({
      channelId: z.number().min(1),
      topic: z.string().max(128).nullable()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsAnyPermission([
      Permission.SET_VOICE_CHANNEL_STATUS,
      Permission.MANAGE_CHANNELS
    ]);

    const channel = await db
      .select()
      .from(channels)
      .where(eq(channels.id, input.channelId))
      .limit(1)
      .get();

    invariant(channel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    invariant(channel.type === ChannelType.VOICE, {
      code: 'BAD_REQUEST',
      message: 'Status can only be set on voice channels'
    });

    await assertChannelAccess(ctx, input.channelId);

    await db
      .update(channels)
      .set({ topic: input.topic })
      .where(eq(channels.id, input.channelId));

    publishChannel(input.channelId, 'update');
  });

export { updateVoiceStatusRoute };
