import { ActivityLogType, Permission } from '@kurier/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { assertCanModerateUser } from '../../helpers/role-hierarchy';
import { applyMemberVoiceModeration } from '../../helpers/server-voice-state';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const muteRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.moveMembers.maxRequests,
  windowMs: config.rateLimiters.moveMembers.windowMs,
  logLabel: 'muteMember'
})
  .input(
    z.object({
      userId: z.number(),
      muted: z.boolean()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MUTE_MEMBERS);

    const targetUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1)
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found.'
    });

    await assertCanModerateUser(ctx.userId, input.userId);

    await db
      .update(users)
      .set({
        serverMuted: input.muted,
        updatedAt: Date.now()
      })
      .where(eq(users.id, input.userId));

    applyMemberVoiceModeration(input.userId, { serverMuted: input.muted });
    publishUser(input.userId, 'update');

    if (input.muted) {
      enqueueActivityLog({
        type: ActivityLogType.USER_MUTED,
        userId: ctx.userId,
        details: { targetUserId: input.userId, mutedBy: ctx.userId }
      });
    } else {
      enqueueActivityLog({
        type: ActivityLogType.USER_UNMUTED,
        userId: ctx.userId,
        details: { targetUserId: input.userId, unmutedBy: ctx.userId }
      });
    }
  });

export { muteRoute };
