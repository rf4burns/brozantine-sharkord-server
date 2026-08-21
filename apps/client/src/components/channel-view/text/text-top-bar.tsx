import { HeaderActions } from '@/components/chat-header/header-actions';
import { useChannelById } from '@/features/server/channels/hooks';
import { ChannelType } from '@kurier/shared';
import { IconButton } from '@kurier/ui';
import { Hash, MessageCircleMore, Volume2, X } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PinnedMessagesPopover } from './pinned-messages-popover';

type TTextTopbarProps = {
  onScrollToMessage: (messageId: number) => Promise<void>;
  channelId: number;
  onClose?: () => void;
  onToggleRightSidebar?: () => void;
  isRightSidebarOpen?: boolean;
};

const TextTopbar = memo(
  ({
    onScrollToMessage,
    channelId,
    onClose,
    onToggleRightSidebar,
    isRightSidebarOpen
  }: TTextTopbarProps) => {
    const { t } = useTranslation('topbar');
    const channel = useChannelById(channelId);

    const info = useMemo(() => {
      if (channel?.isDm) {
        return {
          name: t('directMessageHeader'),
          topic: undefined as string | undefined
        };
      }

      return {
        name: channel?.name,
        topic: channel?.topic
      };
    }, [channel, t]);

    const getIcon = useCallback(() => {
      if (channel?.isDm) {
        return (
          <MessageCircleMore className="inline-block h-5 w-5 text-muted-foreground" />
        );
      }

      if (channel?.type === ChannelType.TEXT) {
        return <Hash className="inline-block h-5 w-5 text-muted-foreground" />;
      }

      if (channel?.type === ChannelType.VOICE) {
        return (
          <Volume2 className="inline-block h-5 w-5 text-muted-foreground" />
        );
      }

      return null;
    }, [channel]);

    return (
      <div className="flex h-12 w-auto shrink-0 overflow-hidden border-b border-border bg-background">
        <div className="flex w-full items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-2">
            {getIcon()}
            <span className="max-w-40 truncate font-semibold">{info.name}</span>
            {info.topic && (
              <>
                <span className="hidden h-4 w-px bg-border sm:block" />
                <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                  {info.topic}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <PinnedMessagesPopover onScrollToMessage={onScrollToMessage} />
            {!onClose && (
              <HeaderActions
                onToggleRightSidebar={onToggleRightSidebar}
                isRightSidebarOpen={isRightSidebarOpen}
                showMembersToggle={!channel?.isDm}
              />
            )}
            {onClose && (
              <IconButton
                onClick={onClose}
                icon={X}
                variant="ghost"
                size="sm"
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

export { TextTopbar };
