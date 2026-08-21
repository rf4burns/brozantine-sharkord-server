import type { TChannelNotificationLevel } from '@kurier/shared';
import { and, eq } from 'drizzle-orm';
import { db } from '..';
import { channelNotificationOverrides } from '../schema';

const setChannelNotificationOverride = async (
  userId: number,
  channelId: number,
  level: TChannelNotificationLevel
) => {
  if (level === 'all') {
    await db
      .delete(channelNotificationOverrides)
      .where(
        and(
          eq(channelNotificationOverrides.userId, userId),
          eq(channelNotificationOverrides.channelId, channelId)
        )
      );

    return;
  }

  const existing = await db
    .select({ channelId: channelNotificationOverrides.channelId })
    .from(channelNotificationOverrides)
    .where(
      and(
        eq(channelNotificationOverrides.userId, userId),
        eq(channelNotificationOverrides.channelId, channelId)
      )
    )
    .limit(1)
    .get();

  const now = Date.now();

  if (existing) {
    await db
      .update(channelNotificationOverrides)
      .set({
        level,
        updatedAt: now
      })
      .where(
        and(
          eq(channelNotificationOverrides.userId, userId),
          eq(channelNotificationOverrides.channelId, channelId)
        )
      );

    return;
  }

  await db.insert(channelNotificationOverrides).values({
    userId,
    channelId,
    level,
    updatedAt: now
  });
};

export { setChannelNotificationOverride };
