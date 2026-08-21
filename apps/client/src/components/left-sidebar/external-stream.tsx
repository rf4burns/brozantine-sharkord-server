import { useAudioLevel } from '@/components/channel-view/voice/hooks/use-audio-level';
import { useStreamVolumeControl } from '@/components/voice-provider/hooks/use-stream-volume-control';
import { useVoice } from '@/features/server/voice/hooks';
import type { TExternalStreamTracks } from '@kurier/shared';
import { cn, Tooltip } from '@kurier/ui';
import { Headphones, Router, Video, VolumeX } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StreamContextMenu } from './stream-context-menu';

type TExternalStreamProps = {
  streamId: number;
  title: string;
  tracks?: TExternalStreamTracks;
  pluginId?: string;
  streamKey?: string;
  avatarUrl?: string;
  isOwnChannel?: boolean;
};

const ExternalStream = memo(
  ({
    streamId,
    title,
    tracks,
    pluginId,
    streamKey,
    avatarUrl,
    isOwnChannel = false
  }: TExternalStreamProps) => {
    const { t } = useTranslation('sidebar');
    const hasVideo = tracks?.video;
    const hasAudio = tracks?.audio;
    const { externalStreams } = useVoice();
    const { isSpeaking, speakingEffectClass } = useAudioLevel(
      externalStreams[streamId]?.audioStream
    );

    const { isMuted } = useStreamVolumeControl({
      type: 'external',
      pluginId: pluginId ?? '',
      streamKey: streamKey ?? ''
    });
    const shouldShowMuteIndicator = isOwnChannel && isMuted;

    const row = (
      <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/30 text-sm">
        <Tooltip
          content={
            pluginId
              ? t('externalStreamPlugin', { pluginId })
              : t('externalStream')
          }
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={title}
              className={cn(
                'h-5 w-5 rounded object-cover',
                isSpeaking && speakingEffectClass
              )}
            />
          ) : (
            <Router
              className={cn(
                'h-5 w-5 text-muted-foreground opacity-60',
                isSpeaking && speakingEffectClass
              )}
            />
          )}
        </Tooltip>

        <span className="flex-1 text-muted-foreground truncate text-xs">
          {title}
        </span>

        <div className="flex items-center gap-1 opacity-60">
          {shouldShowMuteIndicator && (
            <VolumeX className="h-3 w-3 text-red-500" />
          )}
          {hasVideo && <Video className="h-3 w-3 text-blue-500" />}
          {hasAudio && <Headphones className="h-3 w-3 text-green-500" />}
        </div>
      </div>
    );

    if (!isOwnChannel || !pluginId || !streamKey) {
      return row;
    }

    return (
      <StreamContextMenu
        type="external"
        pluginId={pluginId}
        streamKey={streamKey}
        title={title}
        avatarUrl={avatarUrl}
      >
        {row}
      </StreamContextMenu>
    );
  }
);

export { ExternalStream };
