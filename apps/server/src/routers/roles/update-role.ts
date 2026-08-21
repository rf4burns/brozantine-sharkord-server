import {
  ActivityLogType,
  OWNER_ROLE_ID,
  Permission,
  STORAGE_MAX_QUOTA_PER_USER,
  STORAGE_MIN_QUOTA_PER_USER
} from '@kurier/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { syncRolePermissions } from '../../db/mutations/roles';
import { publishRole } from '../../db/publishers';
import { getRole } from '../../db/queries/roles';
import { roles } from '../../db/schema';
import { assertCanManageRole } from '../../helpers/role-hierarchy';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const updateRoleRoute = protectedProcedure
  .input(
    z.object({
      roleId: z.number().min(1),
      name: z.string().min(1).max(26),
      color: z
        .string()
        .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
      permissions: z.enum(Permission).array(),
      hoist: z.boolean(),
      storageQuotaOverrideEnabled: z.boolean(),
      storageSpaceQuota: z
        .number()
        .min(STORAGE_MIN_QUOTA_PER_USER)
        .max(STORAGE_MAX_QUOTA_PER_USER)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_ROLES);

    await assertCanManageRole(ctx.userId, input.roleId);

    const existingRole = await getRole(input.roleId);

    invariant(existingRole, {
      code: 'NOT_FOUND',
      message: 'Role not found'
    });

    const hoist =
      existingRole.isDefault || existingRole.id === OWNER_ROLE_ID
        ? false
        : input.hoist;

    const updatedRole = await db
      .update(roles)
      .set({
        name: input.name,
        color: input.color,
        hoist,
        storageQuotaOverrideEnabled: input.storageQuotaOverrideEnabled,
        storageSpaceQuota: input.storageSpaceQuota
      })
      .where(eq(roles.id, input.roleId))
      .returning()
      .get();

    if (updatedRole.id !== OWNER_ROLE_ID) {
      await syncRolePermissions(updatedRole.id, input.permissions);
    }

    publishRole(updatedRole.id, 'update');
    enqueueActivityLog({
      type: ActivityLogType.UPDATED_ROLE,
      userId: ctx.user.id,
      details: {
        roleId: updatedRole.id,
        permissions: input.permissions,
        values: input
      }
    });
  });

export { updateRoleRoute };
