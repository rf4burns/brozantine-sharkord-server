import {
  ActivityLogType,
  MAX_NICKNAME_LENGTH,
  Permission
} from '@kurier/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { assertCanModerateUser } from '../../helpers/role-hierarchy';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const emptyToNull = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const updateNicknameRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      nickname: z.string().max(MAX_NICKNAME_LENGTH).optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_NICKNAMES);

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

    const nickname = emptyToNull(input.nickname);

    await db
      .update(users)
      .set({
        nickname,
        updatedAt: Date.now()
      })
      .where(eq(users.id, input.userId));

    publishUser(input.userId, 'update');

    await enqueueActivityLog({
      type: ActivityLogType.USER_NICKNAME_UPDATED,
      userId: ctx.userId,
      details: {
        targetUserId: input.userId,
        targetUsername: targetUser.name,
        updatedBy: ctx.userId,
        nickname
      }
    });
  });

export { updateNicknameRoute };
