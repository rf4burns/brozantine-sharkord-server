import { openThreadSidebar } from '@/features/app/actions';
import { useCan } from '@/features/server/hooks';
import { useIsOwnUser, useOwnUser } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import {
  hasMention,
  Permission,
  TestId,
  UserStatus,
  type TJoinedMessage
} from '@kurier/shared';
import { MessageSquareText } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageActions } from './message-actions';
import { MessageEditInline } from './message-edit-inline';
import { MessageRenderer } from './renderer';

type TMessageProps = {
  message: TJoinedMessage;
  disableActions?: boolean;
  disableFiles?: boolean;
  disableReactions?: boolean;
  onReplyMessageSelect?: (message: TJoinedMessage) => void;
  isInlineReplyTarget?: boolean;
  isActiveThread?: boolean;
  editingMessageId?: number;
  onEditComplete?: () => void;
};

const Message = memo(
  ({
    message,
    disableActions,
    disableFiles,
    disableReactions,
    onReplyMessageSelect,
    isInlineReplyTarget,
    isActiveThread,
    editingMessageId,
    onEditComplete
  }: TMessageProps) => {
    const { t } = useTranslation('common');
    const [isPencilEditing, setIsPencilEditing] = useState(false);
    const isEditing = isPencilEditing || editingMessageId === message.id;
    const isFromOwnUser = useIsOwnUser(message.userId);
    const can = useCan();
    const ownUser = useOwnUser();

    const canManage = useMemo(
      () => can(Permission.MANAGE_MESSAGES) || isFromOwnUser,
      [can, isFromOwnUser]
    );

    const isMentioned = useMemo(
      () =>
        hasMention(message.content, ownUser?.id, {
          isOnline:
            (ownUser?.status ?? UserStatus.OFFLINE) !== UserStatus.OFFLINE
        }),
      [message.content, ownUser?.id, ownUser?.status]
    );

    const isThreadReply = !!message.parentMessageId;
    const replyCount = message.replyCount ?? 0;

    const onThreadClick = useCallback(() => {
      openThreadSidebar(message.id, message.channelId);
    }, [message.id, message.channelId]);

    return (
      <div
        className={cn(
          'group relative min-w-0 flex-1 px-0 py-0',
          isActiveThread && 'bg-primary/10',
          isMentioned && 'border-l-2 border-l-[#f0b232] bg-[#f0b232]/10 pl-2',
          isInlineReplyTarget && 'bg-primary/10'
        )}
        data-testid={TestId.MESSAGE_ITEM}
        data-message-id={message.id}
      >
        {!isEditing ? (
          <>
            <MessageRenderer
              message={message}
              disableFiles={disableFiles}
              disableReactions={disableReactions}
            />
            {!isThreadReply && replyCount > 0 && (
              <button
                type="button"
                onClick={onThreadClick}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline mt-1 transition-colors"
              >
                <MessageSquareText className="h-3 w-3" />
                <span>{t('reply', { count: replyCount })}</span>
              </button>
            )}
            {!disableActions && (
              <MessageActions
                onEdit={() => setIsPencilEditing(true)}
                canManage={canManage}
                messageId={message.id}
                channelId={message.channelId}
                editable={message.editable ?? false}
                isPinned={message.pinned ?? false}
                disablePin={!!message.parentMessageId}
                isThreadReply={isThreadReply}
                onReply={() => onReplyMessageSelect?.(message)}
              />
            )}
          </>
        ) : (
          <MessageEditInline
            message={message}
            onBlur={() => {
              setIsPencilEditing(false);
              if (editingMessageId === message.id) {
                onEditComplete?.();
              }
            }}
          />
        )}
      </div>
    );
  }
);

export { Message };
