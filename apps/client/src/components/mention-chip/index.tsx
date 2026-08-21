import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { UserPopover } from '../user-popover';

type TSpecialMentionKind = 'everyone' | 'here';

type TMentionChipProps = {
  userId?: number | null;
  mentionKind?: TSpecialMentionKind | null;
  label?: string;
};

const MentionChip = memo(
  ({ userId, mentionKind, label: labelProp }: TMentionChipProps) => {
    const user = useUserById(userId ?? null);
    const ownUserId = useOwnUserId();
    const isSpecialMention =
      mentionKind === 'everyone' || mentionKind === 'here';
    const isOwnMention = !isSpecialMention && ownUserId === userId;
    const label =
      labelProp ??
      (isSpecialMention
        ? mentionKind
        : user
          ? getRenderedUsername(user)
          : 'Deleted User');

    const chip = (
      <span
        className={cn(
          'mention rounded px-0.5 transition-colors',
          isSpecialMention || isOwnMention
            ? 'text-yellow-400 dark:text-yellow-200 bg-primary/10 hover:bg-primary/20 font-medium'
            : 'text-primary bg-primary/10 hover:bg-primary/20',
          !isSpecialMention && 'cursor-pointer'
        )}
      >
        @{label}
      </span>
    );

    if (isSpecialMention || userId == null) {
      return chip;
    }

    return <UserPopover userId={userId}>{chip}</UserPopover>;
  }
);

export { MentionChip };
export type { TSpecialMentionKind };
