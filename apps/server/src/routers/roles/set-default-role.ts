import { ActivityLogType, OWNER_ROLE_ID, Permission } from '@kurier/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishRole } from '../../db/publishers';
import { getDefaultRole, getRole } from '../../db/queries/roles';
import { roles } from '../../db/schema';
import { assertCanManageRole } from '../../helpers/role-hierarchy';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const setDefaultRoleRoute = protectedProcedure
  .input(
    z.object({
      roleId: z.number().min(1)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_ROLES);

    const defaultRole = await getDefaultRole();

    invariant(defaultRole, {
      code: 'NOT_FOUND',
      message: 'Default role not found'
    });

    if (input.roleId === defaultRole?.id) return;

    const newDefaultRole = await getRole(input.roleId);

    invariant(newDefaultRole, {
      code: 'NOT_FOUND',
      message: 'Role not found'
    });

    invariant(newDefaultRole.id !== OWNER_ROLE_ID, {
      code: 'BAD_REQUEST',
      message: 'The owner role cannot be the default role.'
    });

    await assertCanManageRole(ctx.userId, input.roleId);

    await db.transaction(async (tx) => {
      await tx
        .update(roles)
        .set({
          isDefault: false,
          position: newDefaultRole.position
        })
        .where(eq(roles.id, defaultRole.id));

      await tx
        .update(roles)
        .set({
          isDefault: true,
          hoist: false,
          position: 0
        })
        .where(eq(roles.id, input.roleId));
    });

    await Promise.all([
      publishRole(defaultRole.id, 'update'),
      publishRole(input.roleId, 'update')
    ]);

    enqueueActivityLog({
      type: ActivityLogType.UPDATED_DEFAULT_ROLE,
      userId: ctx.user.id,
      details: {
        newRoleId: input.roleId,
        oldRoleId: defaultRole.id,
        newRoleName: newDefaultRole.name,
        oldRoleName: defaultRole.name
      }
    });
  });

export { setDefaultRoleRoute };
