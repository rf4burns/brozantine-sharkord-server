import { USER_ADMIN_VIEW_PERMISSIONS } from '@kurier/shared';
import { getUsers } from '../../db/queries/users';
import { clearFields } from '../../helpers/clear-fields';
import { protectedProcedure } from '../../utils/trpc';

const getUsersRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsAnyPermission(USER_ADMIN_VIEW_PERMISSIONS);

  const users = await getUsers();

  return clearFields(users, ['identity', 'password']);
});

export { getUsersRoute };
