import { cn } from '@/lib/utils';
import { UserStatus } from '@kurier/shared';
import { memo } from 'react';

type TUserStatusBadgeProps = {
  status: UserStatus;
  className?: string;
};

const UserStatusBadge = memo(({ status, className }: TUserStatusBadgeProps) => {
  return (
    <div
      className={cn(
        'h-3 w-3 rounded-full border-2 border-card',
        status === UserStatus.ONLINE && 'bg-status-online',
        status === UserStatus.IDLE && 'bg-status-idle',
        status === UserStatus.OFFLINE && 'bg-status-offline',
        className
      )}
    />
  );
});

export { UserStatusBadge };
