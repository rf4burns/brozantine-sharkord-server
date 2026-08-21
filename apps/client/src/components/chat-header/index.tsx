import { HeaderActions } from '@/components/chat-header/header-actions';
import { useChannelById } from '@/features/server/channels/hooks';
import { ChannelType } from '@kurier/shared';
import { Hash, MessageCircleMore, Volume2 } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TChatHeaderProps = {
  channelId?: number;
  isDmMode?: boolean;
  onToggleRightSidebar?: () => void;
  isRightSidebarOpen?: boolean;
};

const ChatHeader = memo(
  ({
    channelId,
    isDmMode,
    onToggleRightSidebar,
    isRightSidebarOpen
  }: TChatHeaderProps) => {
    const { t } = useTranslation('topbar');
    const channel = useChannelById(channelId ?? 0);

    return (
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
        <div className="flex min-w-0 items-center gap-2">
          {isDmMode || channel?.isDm ? (
            <MessageCircleMore className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : channel?.type === ChannelType.VOICE ? (
            <Volume2 className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <Hash className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          {channel && (
            <>
              <span className="truncate text-base font-semibold">
                {channel.isDm ? t('directMessageHeader') : channel.name}
              </span>
              {channel.topic && (
                <>
                  <span className="hidden h-4 w-px bg-border sm:block" />
                  <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                    {channel.topic}
                  </span>
                </>
              )}
            </>
          )}
        </div>
        <HeaderActions
          onToggleRightSidebar={onToggleRightSidebar}
          isRightSidebarOpen={isRightSidebarOpen}
          showMembersToggle={!isDmMode}
        />
      </div>
    );
  }
);

export { ChatHeader };
