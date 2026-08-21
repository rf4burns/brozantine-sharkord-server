import { ActivityLogType, DisconnectCode, Permission } from '@kurier/shared';
import { eq } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { assertCanModerateUser } from '../../helpers/role-hierarchy';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const banRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      reason: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.BAN_MEMBERS);

    invariant(input.userId !== ctx.user.id, {
      code: 'BAD_REQUEST',
      message: 'You cannot ban yourself.'
    });

    const targetUser = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1)
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    await assertCanModerateUser(ctx.userId, input.userId);
    const userWs = ctx.getUserWs(input.userId);

    if (userWs) {
      userWs.close(DisconnectCode.BANNED, input.reason);
    }

    await db
      .update(users)
      .set({
        banned: true,
        banReason: input.reason ?? null,
        bannedAt: Date.now()
      })
      .where(eq(users.id, input.userId));

    publishUser(input.userId, 'update');

    await enqueueActivityLog({
      type: ActivityLogType.USER_BANNED,
      userId: ctx.userId,
      details: {
        reason: input.reason,
        bannedBy: ctx.userId,
        targetUserId: input.userId,
        targetUsername: targetUser.name
      }
    });
  });

export { banRoute };
