import { CHANNEL_NOTIFICATION_LEVELS, ServerEvents } from '@kurier/shared';
import { z } from 'zod';
import { config } from '../../config';
import { setChannelNotificationOverride } from '../../db/mutations/channels';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const setNotificationOverrideRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.setNotificationOverride.maxRequests,
  windowMs: config.rateLimiters.setNotificationOverride.windowMs,
  logLabel: 'setNotificationOverride'
})
  .input(
    z.object({
      channelId: z.number(),
      level: z.enum(CHANNEL_NOTIFICATION_LEVELS)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await assertChannelAccess(ctx, input.channelId);

    await setChannelNotificationOverride(
      ctx.userId,
      input.channelId,
      input.level
    );

    const payload = {
      channelId: input.channelId,
      level: input.level
    };

    ctx.pubsub.publishFor(
      ctx.userId,
      ServerEvents.CHANNEL_NOTIFICATION_OVERRIDE,
      payload
    );

    return payload;
  });

export { setNotificationOverrideRoute };
