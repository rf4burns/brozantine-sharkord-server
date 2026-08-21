import { OWNER_ROLE_ID } from '@kurier/shared';
import { inArray } from 'drizzle-orm';
import { db } from '../db';
import { getRole, getUserRoleIds } from '../db/queries/roles';
import { roles } from '../db/schema';
import { invariant } from '../utils/invariant';

const OWNER_POSITION = Number.MAX_SAFE_INTEGER;

const getHighestRolePosition = async (userId: number): Promise<number> => {
  const roleIds = await getUserRoleIds(userId);

  if (roleIds.includes(OWNER_ROLE_ID)) {
    return OWNER_POSITION;
  }

  if (roleIds.length === 0) {
    return -1;
  }

  const rows = await db
    .select({ position: roles.position })
    .from(roles)
    .where(inArray(roles.id, roleIds));

  if (rows.length === 0) {
    return -1;
  }

  return Math.max(...rows.map((row) => row.position));
};

const assertCanModerateUser = async (actorId: number, targetId: number) => {
  invariant(actorId !== targetId, {
    code: 'BAD_REQUEST',
    message: 'You cannot moderate yourself.'
  });

  const actorRoleIds = await getUserRoleIds(actorId);

  if (actorRoleIds.includes(OWNER_ROLE_ID)) {
    return;
  }

  const [actorPosition, targetPosition] = await Promise.all([
    getHighestRolePosition(actorId),
    getHighestRolePosition(targetId)
  ]);

  invariant(actorPosition > targetPosition, {
    code: 'FORBIDDEN',
    message: 'You cannot moderate a member with an equal or higher role.'
  });
};

const assertCanManageRole = async (actorId: number, roleId: number) => {
  const role = await getRole(roleId);

  invariant(role, {
    code: 'NOT_FOUND',
    message: 'Role not found'
  });

  const actorPosition = await getHighestRolePosition(actorId);

  invariant(actorPosition > role.position, {
    code: 'FORBIDDEN',
    message: 'You cannot manage a role that is equal or higher than yours.'
  });

  return role;
};

export {
  assertCanManageRole,
  assertCanModerateUser,
  getHighestRolePosition,
  OWNER_POSITION
};
