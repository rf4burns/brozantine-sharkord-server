import type { ActivityLogType, TActivityLogDetailsMap } from '@kurier/shared';
import chalk from 'chalk';
import Queue from 'queue';
import { db } from '../../db';
import { activityLog } from '../../db/schema';
import { logger } from '../../logger';
import { getUserIp } from '../../utils/wss';

const activityLogQueue = new Queue({
  concurrency: 2,
  autostart: true,
  timeout: 3000
});

activityLogQueue.autostart = true;

type TEnqueueActivityLog<T extends ActivityLogType = ActivityLogType> = {
  type: T;
  details?: TActivityLogDetailsMap[T];
  userId?: number | null;
  ip?: string;
};

const enqueueActivityLog = <T extends ActivityLogType>({
  type,
  details = {} as TActivityLogDetailsMap[T],
  userId = null,
  ip
}: TEnqueueActivityLog<T>) => {
  const date = Date.now();

  return new Promise<void>((resolve) => {
    activityLogQueue.push(async (callback) => {
      const start = performance.now();

      try {
        await db.insert(activityLog).values({
          userId,
          type: type,
          details,
          ip: ip || (userId != null ? getUserIp(userId) : undefined) || null,
          createdAt: date
        });

        logger.debug(
          `${chalk.dim('[Activity Logger]')} Logged activity of type ${type} for user ${userId} in ${(performance.now() - start).toFixed(2)} ms`
        );

        resolve();
        callback?.();
      } catch (error) {
        // best-effort: never take down the process for a log write failure
        logger.error(
          `${chalk.dim('[Activity Logger]')} Failed to log ${type}: %s`,
          error instanceof Error ? error.message : String(error)
        );
        resolve();
        callback?.(error as Error);
      }
    });
  });
};

export { enqueueActivityLog };
