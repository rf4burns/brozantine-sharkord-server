import { ResizableSidebar } from '@/components/resizable-sidebar';
import { UserAvatar } from '@/components/user-avatar';
import {
  useMemberListGroups,
  useMemberListHiddenCount,
  useUserRoles
} from '@/features/server/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { getRoleNameColor } from '@/helpers/get-role-name-color';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPopover } from '../user-popover';

const MIN_WIDTH = 180;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 240;

type TUserProps = {
  userId: number;
  name: string;
  banned: boolean;
};

const User = memo(({ userId, name, banned }: TUserProps) => {
  const roles = useUserRoles(userId);
  const nameColor = getRoleNameColor(roles);

  return (
    <UserPopover userId={userId}>
      <div className="flex min-w-0 cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1 hover:bg-card">
        <UserAvatar userId={userId} className="h-8 w-8 shrink-0" />
        <span
          className={cn(
            'truncate text-sm',
            banned && 'text-muted-foreground line-through'
          )}
          style={!banned && nameColor ? { color: nameColor } : undefined}
        >
          {name}
        </span>
      </div>
    </UserPopover>
  );
});

type TRightSidebarProps = {
  className?: string;
  isOpen?: boolean;
};

const RightSidebar = memo(
  ({ className, isOpen = true }: TRightSidebarProps) => {
    const { t } = useTranslation('sidebar');
    const groups = useMemberListGroups();
    const hiddenCount = useMemberListHiddenCount();
    const usersCount =
      groups.reduce((total, group) => total + group.users.length, 0) +
      hiddenCount;

    const getGroupLabel = useCallback(
      (group: (typeof groups)[number]) => {
        if (group.labelKey === 'hoistedRole') {
          return `${group.label} - ${group.users.length}`;
        }

        if (group.labelKey === 'onlineGroup') {
          return t('onlineGroup', { count: group.users.length });
        }

        if (group.labelKey === 'offlineGroup') {
          return t('offlineGroup', { count: group.users.length });
        }

        return t('bannedGroup', { count: group.users.length });
      },
      [t]
    );

    return (
      <ResizableSidebar
        storageKey={LocalStorageKey.RIGHT_SIDEBAR_WIDTH}
        minWidth={MIN_WIDTH}
        maxWidth={MAX_WIDTH}
        defaultWidth={DEFAULT_WIDTH}
        edge="left"
        isOpen={isOpen}
        className={cn('h-full bg-sidebar', className)}
      >
        <div className="flex h-12 items-center border-b border-border px-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('membersHeader', { count: usersCount })}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.id} className="space-y-0.5">
                <div
                  className="truncate px-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-faint"
                  style={group.color ? { color: group.color } : undefined}
                >
                  {getGroupLabel(group)}
                </div>
                {group.users.map((user) => (
                  <User
                    key={user.id}
                    userId={user.id}
                    name={getRenderedUsername(user)}
                    banned={user.banned}
                  />
                ))}
              </div>
            ))}
            {hiddenCount > 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {t('andMore', { count: hiddenCount })}
              </div>
            )}
          </div>
        </div>
      </ResizableSidebar>
    );
  }
);

export { RightSidebar };
