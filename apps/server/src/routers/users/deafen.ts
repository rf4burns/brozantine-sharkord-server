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

const deafenRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.moveMembers.maxRequests,
  windowMs: config.rateLimiters.moveMembers.windowMs,
  logLabel: 'deafenMember'
})
  .input(
    z.object({
      userId: z.number(),
      deafened: z.boolean()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.DEAFEN_MEMBERS);

    const targetUser = await db
      .select({ id: users.id, name: users.name })
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
        serverDeafened: input.deafened,
        updatedAt: Date.now()
      })
      .where(eq(users.id, input.userId));

    applyMemberVoiceModeration(input.userId, {
      serverDeafened: input.deafened
    });
    publishUser(input.userId, 'update');

    if (input.deafened) {
      await enqueueActivityLog({
        type: ActivityLogType.USER_DEAFENED,
        userId: ctx.userId,
        details: {
          targetUserId: input.userId,
          targetUsername: targetUser.name,
          deafenedBy: ctx.userId
        }
      });
    } else {
      await enqueueActivityLog({
        type: ActivityLogType.USER_UNDEAFENED,
        userId: ctx.userId,
        details: {
          targetUserId: input.userId,
          targetUsername: targetUser.name,
          undeafenedBy: ctx.userId
        }
      });
    }
  });

export { deafenRoute };
