import {
  DELETED_USER_IDENTITY_AND_NAME,
  HEX_COLOR_REGEX,
  MAX_NICKNAME_LENGTH,
  MAX_PRONOUNS_LENGTH,
  MAX_STATUS_MESSAGE_LENGTH,
  Permission
} from '@kurier/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { protectedProcedure } from '../../utils/trpc';

const zUserPreferences = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  locale: z.string().max(16).optional(),
  compactMode: z.boolean().optional()
});

const emptyToNull = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const updateUserRoute = protectedProcedure
  .input(
    z.object({
      name: z
        .string()
        .min(1)
        .max(24)
        .refine((val) => val !== DELETED_USER_IDENTITY_AND_NAME, {
          message: 'Protected username'
        }),
      profileColor: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color'),
      bio: z.string().max(160).optional(),
      nickname: z.string().max(MAX_NICKNAME_LENGTH).optional(),
      pronouns: z.string().max(MAX_PRONOUNS_LENGTH).optional(),
      statusMessage: z.string().max(MAX_STATUS_MESSAGE_LENGTH).optional(),
      preferences: zUserPreferences.optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const nickname = emptyToNull(input.nickname);

    const currentUser = await db
      .select({ nickname: users.nickname })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1)
      .get();

    if (nickname !== (currentUser?.nickname ?? null)) {
      await ctx.needsPermission(Permission.CHANGE_NICKNAME);
    }

    const updatedUser = await db
      .update(users)
      .set({
        name: input.name,
        profileColor: input.profileColor,
        bio: input.bio ?? null,
        nickname,
        pronouns: emptyToNull(input.pronouns),
        statusMessage: emptyToNull(input.statusMessage),
        ...(input.preferences !== undefined
          ? { preferences: input.preferences }
          : {})
      })
      .where(eq(users.id, ctx.userId))
      .returning()
      .get();

    publishUser(updatedUser.id, 'update');

    return {
      preferences: updatedUser.preferences ?? {}
    };
  });

export { updateUserRoute };
