import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useCan } from '@/features/server/hooks';
import { usePluginMetadata } from '@/features/server/plugins/hooks';
import {
  useVoice,
  useVoiceChannelExternalStreamsList
} from '@/features/server/voice/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, Permission } from '@kurier/shared';
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner
} from '@kurier/ui';
import { Music, RefreshCw, SkipForward, Square, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useStreamVolumeControl } from '../voice-provider/hooks/use-stream-volume-control';

export const MUSIC_BOT_PLUGIN_ID = 'music-bot';

type TQueueItem = {
  label?: string;
  position?: number;
};

type TPlayerState = {
  currentSong?: string;
  currentThumbnailUrl?: string;
  queue?: TQueueItem[];
};

const executeMusicAction = async (actionName: string, payload?: unknown) => {
  const trpc = getTRPCClient();

  return trpc.plugins.executeAction.mutate({
    pluginId: MUSIC_BOT_PLUGIN_ID,
    actionName,
    payload
  });
};

const MusicBotPanel = memo(() => {
  const { t } = useTranslation('sidebar');
  const can = useCan();
  const plugin = usePluginMetadata(MUSIC_BOT_PLUGIN_ID);
  const voiceChannelId = useCurrentVoiceChannelId();
  const { ownVoiceState } = useVoice();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [player, setPlayer] = useState<TPlayerState>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const inVoice = !!voiceChannelId;
  const externalStreams = useVoiceChannelExternalStreamsList(
    voiceChannelId ?? 0
  );
  const musicStream = useMemo(
    () =>
      externalStreams.find((stream) => stream.pluginId === MUSIC_BOT_PLUGIN_ID),
    [externalStreams]
  );
  const { volume, setVolume } = useStreamVolumeControl({
    type: 'external',
    pluginId: musicStream?.pluginId ?? MUSIC_BOT_PLUGIN_ID,
    streamKey: musicStream?.key ?? 'music'
  });

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const state = await executeMusicAction('getPlayerState');

      if (state && typeof state === 'object') {
        setPlayer(state as TPlayerState);
      }
    } catch (error) {
      setMessage(getTrpcError(error, t('musicBotFailed')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const runAction = useCallback(
    async (actionName: string, payload?: unknown) => {
      setBusy(true);
      setMessage('');

      try {
        const result = await executeMusicAction(actionName, payload);

        if (result && typeof result === 'object') {
          const map = result as Record<string, unknown>;

          if (map.player && typeof map.player === 'object') {
            setPlayer(map.player as TPlayerState);
          }

          if (map.message) {
            setMessage(String(map.message));
          }
        }
      } catch (error) {
        const text = getTrpcError(error, t('musicBotFailed'));

        setMessage(text);
        toast.error(text);
      } finally {
        setBusy(false);
      }
    },
    [t]
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (nextOpen) {
        void refresh();
      }
    },
    [refresh]
  );

  const handlePlay = useCallback(() => {
    const q = query.trim();

    if (!q) {
      setMessage(t('musicBotQueryRequired'));
      return;
    }

    void runAction('playMusic', { query: q, channelId: voiceChannelId });
    setQuery('');
  }, [query, runAction, t, voiceChannelId]);

  const handleQueue = useCallback(() => {
    const q = query.trim();

    if (!q) {
      setMessage(t('musicBotQueryRequired'));
      return;
    }

    void runAction('queueMusic', { query: q });
    setQuery('');
  }, [query, runAction, t]);

  const handleQueryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    []
  );

  const handleVolumeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(Number(event.target.value));
    },
    [setVolume]
  );

  const handleRemoveQueueItem = useCallback(
    (position: number) => {
      void runAction('removeQueueItem', { position });
    },
    [runAction]
  );

  useEffect(() => {
    if (!open) return;

    void refresh();
  }, [open, refresh]);

  if (!plugin || !can(Permission.USE_PLUGINS)) {
    return null;
  }

  const queueList = Array.isArray(player.queue)
    ? player.queue.filter(
        (item): item is TQueueItem => !!item && typeof item === 'object'
      )
    : [];
  const controlsDisabled = busy || !inVoice;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={t('musicBotTitle')}
        >
          <Music className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3"
        align="end"
        side="top"
        sideOffset={8}
      >
        <div className="mb-2 flex items-center gap-2">
          <Music className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm font-semibold">
            {t('musicBotTitle')}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => void refresh()}
            disabled={busy}
            title={t('musicBotRefresh')}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        {!inVoice && (
          <p className="mb-2 text-xs text-yellow-500">
            {t('musicBotJoinVoice')}
          </p>
        )}
        {loading ? (
          <div className="flex justify-center p-6">
            <Spinner size="sm" />
          </div>
        ) : (
          <>
            {player.currentThumbnailUrl && (
              <img
                src={player.currentThumbnailUrl}
                alt=""
                className="mb-2 h-28 w-full rounded-md object-cover"
              />
            )}
            <p className="mb-2 truncate text-sm">
              {player.currentSong || t('musicBotNothingPlaying')}
            </p>
            <Input
              value={query}
              onChange={handleQueryChange}
              placeholder={t('musicBotQueryPlaceholder')}
              disabled={controlsDisabled}
              className="mb-2 h-8"
              onKeyDown={(event) => {
                if (event.key === 'Enter') handlePlay();
              }}
            />
            <div className="mb-2 flex flex-wrap gap-1">
              <Button
                size="sm"
                onClick={handlePlay}
                disabled={controlsDisabled}
              >
                {t('musicBotPlay')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleQueue}
                disabled={controlsDisabled}
              >
                {t('musicBotQueue')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void runAction('nextMusic')}
                disabled={controlsDisabled}
              >
                <SkipForward className="mr-1 h-3.5 w-3.5" />
                {t('musicBotNext')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void runAction('stopMusic')}
                disabled={controlsDisabled}
              >
                <Square className="mr-1 h-3.5 w-3.5" />
                {t('musicBotStop')}
              </Button>
            </div>
            {musicStream && (
              <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                {t('musicBotVolume')}
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1"
                />
              </label>
            )}
            {message && (
              <p className="mb-2 text-xs text-muted-foreground">{message}</p>
            )}
            {queueList.length > 0 && (
              <div className="max-h-40 overflow-y-auto">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  {t('musicBotQueue')}
                </p>
                {queueList.map((item, index) => (
                  <div
                    key={`${item.position ?? index}-${item.label}`}
                    className="flex items-center gap-1 py-0.5"
                  >
                    <span className="flex-1 truncate text-xs">
                      {item.label ?? t('musicBotTrack')}
                    </span>
                    {typeof item.position === 'number' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={controlsDisabled}
                        onClick={() => handleRemoveQueueItem(item.position!)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {ownVoiceState.soundMuted && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t('musicBotDeafened')}
              </p>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
});

export { MusicBotPanel };
