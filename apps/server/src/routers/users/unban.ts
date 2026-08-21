import { ActivityLogType, Permission } from '@kurier/shared';
import { eq } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const unbanRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.BAN_MEMBERS);

    const targetUser = await db
      .select({
        id: users.id,
        name: users.name,
        deleted: users.deleted
      })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1)
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    invariant(!targetUser.deleted, {
      code: 'BAD_REQUEST',
      message: 'Cannot unban a deleted user.'
    });

    await db
      .update(users)
      .set({
        banned: false,
        banReason: null,
        bannedAt: null
      })
      .where(eq(users.id, input.userId));

    publishUser(input.userId, 'update');

    await enqueueActivityLog({
      type: ActivityLogType.USER_UNBANNED,
      userId: ctx.userId,
      details: {
        unbannedBy: ctx.userId,
        targetUserId: input.userId,
        targetUsername: targetUser.name
      }
    });
  });

export { unbanRoute };
