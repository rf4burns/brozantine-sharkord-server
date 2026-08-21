import { ActivityLogType } from '@kurier/shared';
import type { TFunction } from 'i18next';

type TActivityLogRow = {
  userId: number | null;
  type: ActivityLogType;
  details: Record<string, unknown> | null;
};

const formatActivityLogEntry = (
  t: TFunction<'settings'>,
  actorName: string,
  row: TActivityLogRow
) => {
  const details = row.details ?? {};
  const key = `audit_${row.type}`;

  return t(key, {
    actor: actorName,
    ...details,
    defaultValue: t('auditUnknown', { actor: actorName, type: row.type })
  });
};

const ACTIVITY_LOG_TYPE_OPTIONS = Object.values(ActivityLogType);

export { ACTIVITY_LOG_TYPE_OPTIONS, formatActivityLogEntry };
