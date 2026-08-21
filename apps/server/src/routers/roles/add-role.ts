import { ActivityLogType, Permission } from '@kurier/shared';
import { gte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { publishRole } from '../../db/publishers';
import { roles } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const addRoleRoute = protectedProcedure.mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_ROLES);

  const bumpedRoles = await db
    .select({ id: roles.id })
    .from(roles)
    .where(gte(roles.position, 1));

  const role = await db.transaction(async (tx) => {
    await tx
      .update(roles)
      .set({
        position: sql`${roles.position} + 1`,
        updatedAt: Date.now()
      })
      .where(gte(roles.position, 1));

    return tx
      .insert(roles)
      .values({
        name: 'New Role',
        color: '#ffffff',
        isDefault: false,
        isPersistent: false,
        position: 1,
        hoist: false,
        storageQuotaOverrideEnabled: false,
        storageSpaceQuota: 0,
        createdAt: Date.now()
      })
      .returning()
      .get();
  });

  await Promise.all([
    publishRole(role.id, 'create'),
    ...bumpedRoles.map((bumped) => publishRole(bumped.id, 'update'))
  ]);

  enqueueActivityLog({
    type: ActivityLogType.CREATED_ROLE,
    userId: ctx.user.id,
    details: {
      roleId: role.id,
      roleName: role.name
    }
  });

  return role.id;
});

export { addRoleRoute };
