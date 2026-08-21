import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { ServerSearch } from '@/components/top-bar/server-search';
import { VoiceButtons } from '@/components/top-bar/voice-buttons';
import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { PluginSlot } from '@kurier/shared';
import { Button, Tooltip } from '@kurier/ui';
import { PanelRight, PanelRightClose } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type THeaderActionsProps = {
  onToggleRightSidebar?: () => void;
  isRightSidebarOpen?: boolean;
  showMembersToggle?: boolean;
};

const HeaderActions = memo(
  ({
    onToggleRightSidebar,
    isRightSidebarOpen,
    showMembersToggle = true
  }: THeaderActionsProps) => {
    const { t } = useTranslation('topbar');
    const settings = usePublicServerSettings();
    const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
    const currentVoiceChannelId = useCurrentVoiceChannelId();

    const handleToggle = useCallback(() => {
      onToggleRightSidebar?.();
    }, [onToggleRightSidebar]);

    return (
      <div className="flex shrink-0 items-center gap-1">
        {settings?.enableSearch && <ServerSearch />}
        <PluginSlotRenderer slotId={PluginSlot.TOPBAR_RIGHT} />
        {isCurrentVoiceChannelSelected && currentVoiceChannelId && (
          <VoiceButtons currentVoiceChannelId={currentVoiceChannelId} />
        )}
        {showMembersToggle && onToggleRightSidebar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="hidden h-8 w-8 px-0 lg:flex"
          >
            {isRightSidebarOpen ? (
              <Tooltip content={t('closeMembersSidebar')}>
                <div>
                  <PanelRightClose className="h-5 w-5" />
                </div>
              </Tooltip>
            ) : (
              <Tooltip content={t('openMembersSidebar')}>
                <div>
                  <PanelRight className="h-5 w-5" />
                </div>
              </Tooltip>
            )}
          </Button>
        )}
      </div>
    );
  }
);

export { HeaderActions };
