import { RelativeTime } from '@/components/relative-time';
import { UserAvatar } from '@/components/user-avatar';
import { useUsers } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { getTRPCClient } from '@/lib/trpc';
import {
  ActivityLogType,
  DEFAULT_ACTIVITY_LOG_LIMIT,
  getTrpcError
} from '@kurier/shared';
import { Button, Spinner } from '@kurier/ui';
import { format } from 'date-fns';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ACTIVITY_LOG_TYPE_OPTIONS, formatActivityLogEntry } from './helpers';

type TActivityLogItem = {
  id: number;
  userId: number | null;
  type: ActivityLogType;
  details: Record<string, unknown> | null;
  ip: string | null;
  createdAt: number;
};

const ActivityLog = memo(() => {
  const { t } = useTranslation('settings');
  const users = useUsers();
  const [items, setItems] = useState<TActivityLogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const userNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const user of users) {
      map.set(user.id, getRenderedUsername(user));
    }
    return map;
  }, [users]);

  const loadPage = useCallback(
    async (cursor: number | null, replace: boolean) => {
      setLoading(true);
      const trpc = getTRPCClient();

      try {
        const result = await trpc.activityLog.get.query({
          cursor: cursor ?? undefined,
          limit: DEFAULT_ACTIVITY_LOG_LIMIT,
          types: typeFilter ? [typeFilter as ActivityLogType] : undefined,
          userId: userFilter ? Number(userFilter) : undefined
        });

        setItems((prev) =>
          replace ? result.items : [...prev, ...result.items]
        );
        setNextCursor(result.nextCursor);
      } catch (error) {
        toast.error(getTrpcError(error, t('auditLogFailed')));
      } finally {
        setLoading(false);
      }
    },
    [t, typeFilter, userFilter]
  );

  useEffect(() => {
    void loadPage(null, true);
  }, [loadPage]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      void loadPage(nextCursor, false);
    }
  }, [loadPage, nextCursor]);

  const handleTypeFilter = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setTypeFilter(event.target.value);
    },
    []
  );

  const handleUserFilter = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setUserFilter(event.target.value);
    },
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t('auditLogTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('auditLogDesc')}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="h-9 rounded-md border border-border bg-card px-2 text-sm"
          value={typeFilter}
          onChange={handleTypeFilter}
        >
          <option value="">{t('auditAllActions')}</option>
          {ACTIVITY_LOG_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <select
          className="h-9 min-w-40 rounded-md border border-border bg-card px-2 text-sm"
          value={userFilter}
          onChange={handleUserFilter}
        >
          <option value="">{t('auditAllUsers')}</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {getRenderedUsername(user)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const actorName =
            (item.userId && userNameById.get(item.userId)) || t('auditSystem');

          return (
            <div
              key={item.id}
              className="flex gap-3 rounded-md px-2 py-3 hover:bg-card"
            >
              {item.userId ? (
                <UserAvatar userId={item.userId} className="h-8 w-8" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-card" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  {formatActivityLogEntry(t, actorName, item, userNameById)}
                </p>
                <div className="mt-0.5 flex gap-2 text-xs text-faint">
                  <RelativeTime date={new Date(item.createdAt)}>
                    {(relative) => (
                      <span title={format(item.createdAt, 'PPpp')}>
                        {relative}
                      </span>
                    )}
                  </RelativeTime>
                  {item.ip && <span>{item.ip}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && !loading && (
          <p className="py-8 text-sm text-muted-foreground">
            {t('auditEmpty')}
          </p>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}

      {nextCursor && !loading && (
        <Button variant="outline" onClick={handleLoadMore}>
          {t('auditLoadMore')}
        </Button>
      )}
    </div>
  );
});

export { ActivityLog };
