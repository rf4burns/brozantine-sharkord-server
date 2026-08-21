import { ActivityLogType, OWNER_ROLE_ID, Permission } from '@kurier/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishRole } from '../../db/publishers';
import { roles } from '../../db/schema';
import { assertCanManageRole } from '../../helpers/role-hierarchy';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const reorderRolesRoute = protectedProcedure
  .input(
    z.object({
      roleIds: z.array(z.number())
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_ROLES);

    const existingRoles = await db
      .select({
        id: roles.id,
        position: roles.position,
        isDefault: roles.isDefault
      })
      .from(roles);

    const existingIds = new Set(existingRoles.map((role) => role.id));
    const nextVisibleIds: number[] = [];

    for (const roleId of input.roleIds) {
      if (existingIds.has(roleId) && !nextVisibleIds.includes(roleId)) {
        nextVisibleIds.push(roleId);
      }
    }

    const missingRoleIds = existingRoles
      .map((role) => role.id)
      .filter((roleId) => !nextVisibleIds.includes(roleId));

    const nextRoleOrder = [...nextVisibleIds, ...missingRoleIds];
    const defaultRole = existingRoles.find((role) => role.isDefault);

    invariant(nextRoleOrder[0] === OWNER_ROLE_ID, {
      code: 'BAD_REQUEST',
      message: 'The owner role must stay at the top of the hierarchy.'
    });

    invariant(
      defaultRole !== undefined &&
        nextRoleOrder[nextRoleOrder.length - 1] === defaultRole.id,
      {
        code: 'BAD_REQUEST',
        message: 'The default role must stay at the bottom of the hierarchy.'
      }
    );

    const existingById = new Map(existingRoles.map((role) => [role.id, role]));

    for (let i = 0; i < nextRoleOrder.length; i++) {
      const roleId = nextRoleOrder[i]!;
      const previousIndex = [...existingRoles]
        .sort((a, b) => b.position - a.position || a.id - b.id)
        .findIndex((role) => role.id === roleId);

      if (previousIndex === i) {
        continue;
      }

      const role = existingById.get(roleId);

      if (!role || role.id === OWNER_ROLE_ID || role.isDefault) {
        continue;
      }

      await assertCanManageRole(ctx.userId, roleId);
    }

    const highestPosition = nextRoleOrder.length - 1;

    await db.transaction(async (tx) => {
      for (let i = 0; i < nextRoleOrder.length; i++) {
        const roleId = nextRoleOrder[i]!;
        const newPosition = highestPosition - i;

        await tx
          .update(roles)
          .set({
            position: newPosition,
            updatedAt: Date.now()
          })
          .where(eq(roles.id, roleId));
      }
    });

    await Promise.all(
      nextRoleOrder.map((roleId) => publishRole(roleId, 'update'))
    );

    enqueueActivityLog({
      type: ActivityLogType.UPDATED_ROLE,
      userId: ctx.user.id,
      details: {
        roleId: nextRoleOrder[0]!,
        permissions: [],
        values: {
          position: highestPosition
        }
      }
    });
  });

export { reorderRolesRoute };
