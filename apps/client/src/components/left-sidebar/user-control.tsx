import { openServerScreen } from '@/features/server-screens/actions';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { cn } from '@/lib/utils';
import { Button } from '@kurier/ui';
import { HeadphoneOff, Headphones, Mic, MicOff, Settings } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerScreen } from '../server-screens/screens';
import { UserAvatar } from '../user-avatar';
import { UserPopover } from '../user-popover';
import { VoiceDevicePopover } from './voice-device-popover';

const UserControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const ownPublicUser = useOwnPublicUser();
  const { ownVoiceState, toggleMic, toggleSound } = useVoice();

  const handleSettingsClick = useCallback(() => {
    openServerScreen(ServerScreen.USER_SETTINGS);
  }, []);

  if (!ownPublicUser) return null;

  return (
    <div className="flex h-14 items-center justify-between border-t border-border bg-user-area px-2">
      <UserPopover userId={ownPublicUser.id}>
        <div className="flex items-center space-x-2 min-w-0 flex-1 cursor-pointer hover:bg-muted/30 rounded-md p-1 transition-colors">
          <UserAvatar
            userId={ownPublicUser.id}
            className="h-8 w-8 flex-shrink-0"
            showUserPopover={false}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold leading-4 text-foreground">
              {getRenderedUsername(ownPublicUser)}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {ownPublicUser.statusMessage?.trim() ||
                t(`status_${ownPublicUser.status ?? 'offline'}`)}
            </span>
          </div>
        </div>
      </UserPopover>

      <div className="flex items-center space-x-0.5">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 hover:bg-muted/50',
              ownVoiceState.micMuted
                ? 'text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={toggleMic}
            title={ownVoiceState.micMuted ? t('unmuteMic') : t('muteMic')}
            disabled={
              ownVoiceState.soundMuted ||
              ownVoiceState.serverMuted ||
              ownVoiceState.serverDeafened
            }
          >
            {ownVoiceState.micMuted ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <VoiceDevicePopover kind="audioinput" />
        </div>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 hover:bg-muted/50',
              ownVoiceState.soundMuted
                ? 'text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={toggleSound}
            title={ownVoiceState.soundMuted ? t('undeafen') : t('deafen')}
            disabled={ownVoiceState.serverDeafened}
          >
            {ownVoiceState.soundMuted ? (
              <HeadphoneOff className="h-4 w-4" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
          </Button>
          <VoiceDevicePopover kind="audiooutput" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={handleSettingsClick}
          title={t('userSettings')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export { UserControl };
