import {
  ActivityLogType,
  DEFAULT_ACTIVITY_LOG_LIMIT,
  Permission
} from '@kurier/shared';
import { and, desc, eq, inArray, lt, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { activityLog } from '../../db/schema';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const getActivityLogRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.getActivityLog.maxRequests,
  windowMs: config.rateLimiters.getActivityLog.windowMs,
  logLabel: 'getActivityLog'
})
  .input(
    z.object({
      cursor: z.number().nullish(),
      limit: z.number().min(1).max(100).default(DEFAULT_ACTIVITY_LOG_LIMIT),
      types: z.enum(ActivityLogType).array().optional(),
      userId: z.number().optional()
    })
  )
  .meta({ infinite: true })
  .query(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.VIEW_AUDIT_LOG);

    const { cursor, limit, types, userId } = input;
    const filters: SQL[] = [];

    if (types && types.length > 0) {
      filters.push(inArray(activityLog.type, types));
    }

    if (userId) {
      filters.push(eq(activityLog.userId, userId));
    }

    if (cursor) {
      filters.push(lt(activityLog.createdAt, cursor));
    }

    const rows = await db
      .select({
        id: activityLog.id,
        userId: activityLog.userId,
        type: activityLog.type,
        details: activityLog.details,
        ip: activityLog.ip,
        createdAt: activityLog.createdAt
      })
      .from(activityLog)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (page.at(-1)?.createdAt ?? null) : null;

    const canViewSensitive = await ctx.hasPermission(
      Permission.VIEW_USER_SENSITIVE_DATA
    );

    return {
      items: page.map((row) => ({
        ...row,
        type: row.type as ActivityLogType,
        ip: canViewSensitive ? row.ip : null
      })),
      nextCursor
    };
  });

export { getActivityLogRoute };
