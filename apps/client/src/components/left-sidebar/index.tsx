import { ResizableSidebar } from '@/components/resizable-sidebar';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useDmsOpen, useServerName } from '@/features/server/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { TestId } from '@kurier/shared';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Categories } from './categories';
import { DirectMessages } from './direct-messages';
import {
  useRestoreLastSelectedChannel,
  useVoiceMoveSubscription
} from './hooks';
import { PluginButtons } from './plugin-buttons';
import { ServerDropdownMenu } from './server-dropdown';
import { UserControl } from './user-control';
import { VoiceControl } from './voice-control';

const MIN_WIDTH = 180;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 240;

type TLeftSidebarProps = {
  className?: string;
};

const LeftSidebar = memo(({ className }: TLeftSidebarProps) => {
  const { t } = useTranslation('sidebar');
  const serverName = useServerName();
  const dmsOpen = useDmsOpen();

  useRestoreLastSelectedChannel();
  useVoiceMoveSubscription();

  return (
    <ResizableSidebar
      storageKey={LocalStorageKey.LEFT_SIDEBAR_WIDTH}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      defaultWidth={DEFAULT_WIDTH}
      edge="right"
      className={cn('h-full bg-sidebar', className)}
      data-testid={TestId.LEFT_SIDEBAR}
    >
      <div className="flex h-12 w-full items-center justify-between border-b border-border px-4 shadow-sm">
        <h2
          className="cursor-pointer truncate font-semibold text-foreground"
          onClick={() => setSelectedChannelId(undefined)}
          data-testid={TestId.LEFT_SIDEBAR_SERVER_NAME}
        >
          {dmsOpen ? t('directMessages') : serverName}
        </h2>
        <div>
          <ServerDropdownMenu />
        </div>
      </div>
      <PluginButtons />
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {dmsOpen ? <DirectMessages /> : <Categories />}
      </div>
      <VoiceControl />
      <UserControl />
    </ResizableSidebar>
  );
});

export { LeftSidebar };
