import {
  ActivityLogType,
  DELETED_USER_IDENTITY_AND_NAME,
  DisconnectCode,
  OWNER_ROLE_ID,
  Permission,
  ServerEvents
} from '@kurier/shared';
import { eq } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { getUserRoleIds } from '../../db/queries/roles';
import { emojis, messageReactions, messages, users } from '../../db/schema';
import { assertCanModerateUser } from '../../helpers/role-hierarchy';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { pubsub } from '../../utils/pubsub';
import { protectedProcedure } from '../../utils/trpc';

const deleteUserRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      wipe: z.boolean().default(false)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.DELETE_USERS);

    invariant(input.userId !== ctx.user.id, {
      code: 'BAD_REQUEST',
      message: 'You cannot delete yourself.'
    });

    await assertCanModerateUser(ctx.userId, input.userId);

    const targetUser = await db
      .select({
        id: users.id,
        identity: users.identity,
        name: users.name,
        deleted: users.deleted
      })
      .from(users)
      .where(eq(users.id, input.userId))
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found.'
    });

    invariant(targetUser.identity !== DELETED_USER_IDENTITY_AND_NAME, {
      code: 'BAD_REQUEST',
      message: 'Cannot delete the deleted user placeholder.'
    });

    invariant(!targetUser.deleted, {
      code: 'BAD_REQUEST',
      message: 'User is already deleted.'
    });

    const targetRoleIds = await getUserRoleIds(input.userId);

    invariant(!targetRoleIds.includes(OWNER_ROLE_ID), {
      code: 'BAD_REQUEST',
      message: 'Cannot delete an owner account.'
    });

    const userWs = ctx.getUserWs(input.userId);

    if (userWs) {
      userWs.close(DisconnectCode.DELETED, 'Your account has been deleted');
    }

    const now = Date.now();

    await db.transaction(async (tx) => {
      if (input.wipe) {
        await tx.delete(messages).where(eq(messages.userId, input.userId));
        await tx.delete(emojis).where(eq(emojis.userId, input.userId));
        await tx
          .delete(messageReactions)
          .where(eq(messageReactions.userId, input.userId));
      }

      await tx
        .update(users)
        .set({
          deleted: true,
          deletedAt: now,
          banned: true,
          bannedAt: now,
          banReason: 'Account deleted'
        })
        .where(eq(users.id, input.userId));
    });

    await publishUser(input.userId, 'update');

    pubsub.publish(ServerEvents.USER_DELETE, {
      isWipe: input.wipe,
      userId: input.userId
    });

    enqueueActivityLog({
      type: ActivityLogType.USER_DELETED,
      userId: ctx.userId,
      details: {
        reason: 'Your account has been deleted',
        deletedBy: ctx.userId,
        targetUserId: input.userId,
        targetUsername: targetUser.name,
        wipe: input.wipe
      }
    });
  });

export { deleteUserRoute };
