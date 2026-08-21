import { useUserRoles } from '@/features/server/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getRoleNameColor } from '@/helpers/get-role-name-color';
import { cn } from '@/lib/utils';
import { isDeletedUser } from '@kurier/shared';
import { memo } from 'react';
import { UserPopover } from '../user-popover';

type TUserNameProps = {
  userId: number;
  className?: string;
  children: React.ReactNode;
};

const UserName = memo(({ userId, className, children }: TUserNameProps) => {
  const user = useUserById(userId);
  const roles = useUserRoles(userId);
  const nameColor = getRoleNameColor(roles);
  const isDeleted = user ? isDeletedUser(user) : false;
  const applyColor = !user?.banned && !isDeleted && !!nameColor;

  return (
    <UserPopover userId={userId}>
      <span
        className={cn('cursor-pointer hover:underline', className)}
        style={applyColor ? { color: nameColor } : undefined}
      >
        {children}
      </span>
    </UserPopover>
  );
});

UserName.displayName = 'UserName';

export { UserName };
