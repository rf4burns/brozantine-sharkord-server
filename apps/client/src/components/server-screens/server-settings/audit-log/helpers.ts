import { ActivityLogType } from '@kurier/shared';
import type { TFunction } from 'i18next';

type TActivityLogRow = {
  userId: number | null;
  type: ActivityLogType;
  details: Record<string, unknown> | null;
};

const LEGACY_MODERATOR_KEYS: Partial<
  Record<ActivityLogType, 'kickedBy' | 'bannedBy' | 'unbannedBy'>
> = {
  [ActivityLogType.USER_KICKED]: 'kickedBy',
  [ActivityLogType.USER_BANNED]: 'bannedBy',
  [ActivityLogType.USER_UNBANNED]: 'unbannedBy'
};

const resolveName = (
  userNameById: Map<number, string>,
  userId: number | null | undefined,
  fallback: string
) => {
  if (userId == null) {
    return fallback;
  }

  return userNameById.get(userId) ?? fallback;
};

const formatActivityLogEntry = (
  t: TFunction<'settings'>,
  actorName: string,
  row: TActivityLogRow,
  userNameById: Map<number, string> = new Map()
) => {
  const details: Record<string, unknown> = { ...(row.details ?? {}) };
  let displayActor = actorName;

  // older kick/ban/unban rows stored the target as userId and the moderator in details
  const moderatorKey = LEGACY_MODERATOR_KEYS[row.type];
  if (moderatorKey) {
    const moderatorId = details[moderatorKey];
    const hasTargetUsername = typeof details.targetUsername === 'string';
    if (
      typeof moderatorId === 'number' &&
      row.userId != null &&
      moderatorId !== row.userId &&
      !hasTargetUsername
    ) {
      details.targetUsername = actorName;
      details.targetUserId = row.userId;
      displayActor = resolveName(userNameById, moderatorId, t('auditSystem'));
    }
  }

  if (
    typeof details.targetUsername !== 'string' &&
    typeof details.targetUserId === 'number'
  ) {
    details.targetUsername = resolveName(
      userNameById,
      details.targetUserId,
      `#${details.targetUserId}`
    );
  }

  const key = `audit_${row.type}`;

  return t(key, {
    actor: displayActor,
    ...details,
    defaultValue: t('auditUnknown', {
      actor: displayActor,
      type: row.type
    })
  });
};

const ACTIVITY_LOG_TYPE_OPTIONS = Object.values(ActivityLogType);

export { ACTIVITY_LOG_TYPE_OPTIONS, formatActivityLogEntry };
