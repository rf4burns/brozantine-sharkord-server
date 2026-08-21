import { useSelectedChannelId } from '@/features/server/channels/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@kurier/shared';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OverrideLayout } from './layout';

type TYoutubeOverrideProps = {
  videoId: string;
};

const YoutubeOverride = memo(({ videoId }: TYoutubeOverrideProps) => {
  const { t } = useTranslation('common');
  const channelId = useSelectedChannelId();
  const [src, setSrc] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      try {
        const trpc = getTRPCClient();
        const result = await trpc.others.resolveYoutube.query({
          video: videoId,
          channelId
        });

        if (!cancelled) {
          setSrc(result.url);
          setError(undefined);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getTrpcError(err, t('youtubePlayFailed')));
        }
      }
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [videoId, channelId, t]);

  return (
    <OverrideLayout>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {src && (
        <video
          src={src}
          controls
          className="aspect-video w-150 max-w-full bg-black"
          preload="metadata"
        />
      )}
      {!src && !error && (
        <div className="aspect-video w-150 max-w-full bg-muted/40" />
      )}
    </OverrideLayout>
  );
});

export { YoutubeOverride };
