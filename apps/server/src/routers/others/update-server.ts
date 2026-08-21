import { Permission } from '@kurier/shared';
import { protectedProcedure } from '../../utils/trpc';
import { updater } from '../../utils/updater';

const updateServerRoute = protectedProcedure.mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_UPDATES);

  // under systemd this may schedule process.exit after the binary swap
  await updater.update();

  return { ok: true as const };
});

export { updateServerRoute };
