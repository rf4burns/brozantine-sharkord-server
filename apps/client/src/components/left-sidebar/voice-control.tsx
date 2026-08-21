import { ElapsedTime } from '@/components/elapsed-time';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useCan, useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import {
  useVoice,
  useVoiceChannelOccupiedSince
} from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission, Permission } from '@kurier/shared';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch
} from '@kurier/ui';
import {
  AlertTriangle,
  AudioLines,
  Headphones,
  Loader2,
  Monitor,
  MonitorOff,
  PhoneOff,
  RefreshCw,
  Video,
  VideoOff,
  Wifi,
  WifiOff
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalAudioStreams } from '../channel-view/voice/external-audio-streams';
import { VoiceAudioStreams } from '../channel-view/voice/voice-audio-streams';
import { useDevices } from '../devices-provider/hooks/use-devices';
import { MusicBotPanel } from './music-bot-panel';
import { StatsPopover } from './stats-popover';

const VoiceControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const voiceChannelId = useCurrentVoiceChannelId();
  const occupiedSince = useVoiceChannelOccupiedSince(voiceChannelId);
  const channelCan = useChannelCan(voiceChannelId);
  const can = useCan();
  const {
    ownVoiceState,
    toggleWebcam,
    toggleScreenShare,
    changeScreenShareSource,
    isScreenShareSupported,
    isMicMonitoring,
    toggleMicMonitor,
    connectionStatus
  } = useVoice();
  const { devices, saveDevices } = useDevices();

  const onShareSystemAudioChange = useCallback(
    (checked: boolean) => {
      saveDevices({ ...devices, shareSystemAudio: checked });
    },
    [devices, saveDevices]
  );

  const onChangeScreenShareSource = useCallback(() => {
    void changeScreenShareSource();
  }, [changeScreenShareSource]);

  const onToggleMicMonitor = useCallback(() => {
    void toggleMicMonitor();
  }, [toggleMicMonitor]);

  const connectionInfo = useMemo(() => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: t('voiceConnecting'),
          color: 'text-yellow-500'
        };
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4 text-green-600" />,
          text: t('voiceConnected'),
          color: 'text-green-600'
        };
      case 'failed':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          text: t('voiceFailed'),
          color: 'text-red-500'
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="h-4 w-4 text-red-500" />,
          text: t('voiceDisconnected'),
          color: 'text-red-500'
        };
    }
  }, [connectionStatus, t]);

  if (!voiceChannelId) {
    return null;
  }

  return (
    <>
      <VoiceAudioStreams channelId={voiceChannelId} />
      <ExternalAudioStreams channelId={voiceChannelId} />
      <div className="bg-secondary/30 border-t border-border">
        <StatsPopover>
          <div className="flex items-center px-2 py-1.5 gap-2 bg-secondary/50 cursor-pointer hover:bg-secondary/60 transition-colors">
            {connectionInfo.icon}
            <span className={cn('text-xs font-medium', connectionInfo.color)}>
              {connectionInfo.text}
            </span>
            {occupiedSince !== null && (
              <ElapsedTime
                startedAt={occupiedSince}
                className="ml-auto text-xs text-green-600"
              />
            )}
          </div>
        </StatsPopover>

        <div className="flex items-center justify-between px-2 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void leaveVoice({ reason: 'user_disconnect_button' }).catch(
                () => undefined
              );
            }}
          >
            <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
            {t('disconnectVoice')}
          </Button>

          <div className="flex gap-1">
            <MusicBotPanel />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-md transition-all duration-200',
                ownVoiceState.webcamEnabled
                  ? 'bg-green-500/15 hover:bg-green-500/25 text-green-400 hover:text-green-300'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
              )}
              onClick={toggleWebcam}
              title={
                ownVoiceState.webcamEnabled
                  ? t('turnOffCamera')
                  : t('turnOnCamera')
              }
              disabled={
                !can(Permission.ENABLE_WEBCAM) ||
                !channelCan(ChannelPermission.WEBCAM)
              }
            >
              {ownVoiceState.webcamEnabled ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </Button>

            {isScreenShareSupported && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8 rounded-md transition-all duration-200',
                    ownVoiceState.sharingScreen
                      ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300'
                      : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
                  )}
                  onClick={toggleScreenShare}
                  title={
                    ownVoiceState.sharingScreen
                      ? t('stopScreenShare')
                      : t('startScreenShare')
                  }
                  disabled={
                    !can(Permission.SHARE_SCREEN) ||
                    !channelCan(ChannelPermission.SHARE_SCREEN)
                  }
                >
                  {ownVoiceState.sharingScreen ? (
                    <Monitor className="h-4 w-4" />
                  ) : (
                    <MonitorOff className="h-4 w-4" />
                  )}
                </Button>
                {ownVoiceState.sharingScreen && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                    onClick={onChangeScreenShareSource}
                    title={t('changeScreenShareSource')}
                    disabled={
                      !can(Permission.SHARE_SCREEN) ||
                      !channelCan(ChannelPermission.SHARE_SCREEN)
                    }
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                      title={t('includeSystemAudio')}
                    >
                      <Headphones className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" side="top" className="w-72 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {t('includeSystemAudio')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('includeSystemAudioHint')}
                        </p>
                      </div>
                      <Switch
                        checked={!!devices.shareSystemAudio}
                        onCheckedChange={onShareSystemAudioChange}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-md transition-all duration-200',
                isMicMonitoring
                  ? 'bg-green-500/15 hover:bg-green-500/25 text-green-400 hover:text-green-300'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
              )}
              onClick={onToggleMicMonitor}
              title={
                isMicMonitoring ? t('stopMicMonitor') : t('startMicMonitor')
              }
            >
              <AudioLines className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
});

export { VoiceControl };
