import { TextChannel } from '@/components/channel-view/text';
import { VoiceChannel } from '@/components/channel-view/voice';
import { ChatHeader } from '@/components/chat-header';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import {
  useSelectedChannelId,
  useSelectedChannelType
} from '@/features/server/channels/hooks';
import {
  useActiveFullscreenPluginId,
  useServerName
} from '@/features/server/hooks';
import { ChannelType, PluginSlot } from '@kurier/shared';
import { Alert, AlertDescription } from '@kurier/ui';
import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TContentWrapperProps = {
  isDmMode: boolean;
  selectedDmChannelId?: number;
  onToggleRightSidebar: () => void;
  isRightSidebarOpen: boolean;
};

const ContentWrapper = memo(
  ({
    isDmMode,
    selectedDmChannelId,
    onToggleRightSidebar,
    isRightSidebarOpen
  }: TContentWrapperProps) => {
    const { t } = useTranslation();
    const selectedChannelId = useSelectedChannelId();
    const selectedChannelType = useSelectedChannelType();
    const serverName = useServerName();
    const activeFullscreenPluginId = useActiveFullscreenPluginId();

    if (activeFullscreenPluginId) {
      return (
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          <div className="relative flex h-full w-full flex-col overflow-auto bg-background">
            <PluginSlotRenderer
              slotId={PluginSlot.FULL_SCREEN}
              activeFullscreenPluginId={activeFullscreenPluginId}
            />
          </div>
        </main>
      );
    }

    let content;
    let showOuterHeader = false;
    let headerChannelId: number | undefined;

    if (isDmMode) {
      if (selectedDmChannelId) {
        content = (
          <TextChannel
            key={selectedDmChannelId}
            channelId={selectedDmChannelId}
            onToggleRightSidebar={onToggleRightSidebar}
            isRightSidebarOpen={isRightSidebarOpen}
          />
        );
      } else {
        showOuterHeader = true;
        content = (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t('selectDmPrompt')}
          </div>
        );
      }
    } else if (selectedChannelId) {
      if (selectedChannelType === ChannelType.TEXT) {
        content = (
          <TextChannel
            key={selectedChannelId}
            channelId={selectedChannelId}
            onToggleRightSidebar={onToggleRightSidebar}
            isRightSidebarOpen={isRightSidebarOpen}
          />
        );
      } else if (selectedChannelType === ChannelType.VOICE) {
        showOuterHeader = true;
        headerChannelId = selectedChannelId;
        content = (
          <VoiceChannel key={selectedChannelId} channelId={selectedChannelId} />
        );
      }
    } else {
      showOuterHeader = true;
      content = (
        <>
          <div className="hidden h-full w-full flex-col gap-2 overflow-auto lg:flex">
            <PluginSlotRenderer slotId={PluginSlot.HOME_SCREEN} />
          </div>
          <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center md:hidden">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold text-foreground">
                {t('welcomeToServer', { name: serverName })}
              </h2>
            </div>
            <Alert variant="destructive" className="max-w-md">
              <AlertTriangle />
              <AlertDescription>{t('mobileNotOptimized')}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  <ArrowRight />
                </span>
                <span>{t('swipeRightForChannels')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  <ArrowLeft />
                </span>
                <span>{t('swipeLeftForUsers')}</span>
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        {showOuterHeader && (
          <ChatHeader
            channelId={headerChannelId}
            isDmMode={isDmMode}
            onToggleRightSidebar={onToggleRightSidebar}
            isRightSidebarOpen={isRightSidebarOpen}
          />
        )}
        {content}
      </main>
    );
  }
);

export { ContentWrapper };
