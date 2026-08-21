import { FullScreenImage } from '@/components/fullscreen-image/content';
import { copyImagePixels } from '@/helpers/copy-image-pixels';
import { Skeleton } from '@kurier/ui';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { OverrideLayout } from './layout';
import { LinkOverride } from './link';

type TImageOverrideProps = {
  src: string;
  alt?: string;
  title?: string;
};

const ImageOverride = memo(({ src, alt }: TImageOverrideProps) => {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const onLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      setLoading(false);
      // @ts-expect-error - green what is your problem green what is your problem me say alone ramp
      event.target.style.opacity = 1;
    },
    []
  );

  const onError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const onCopyImage = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();

      try {
        const result = await copyImagePixels(src);

        toast.success(
          result === 'image' ? t('copiedImage') : t('copiedImageLink')
        );
      } catch {
        toast.error(t('failedCopyImage'));
      }
    },
    [src, t]
  );

  useEffect(() => {
    setTimeout(() => {
      setLoading((prev) => {
        if (prev === false) return prev;

        return true;
      });
    }, 0);
  }, []);

  if (error) return null;

  return (
    <OverrideLayout>
      {loading ? (
        <Skeleton className="h-[300px] w-[400px] max-w-full" />
      ) : (
        <FullScreenImage
          src={src}
          alt={alt}
          onLoad={onLoad}
          onError={onError}
          onContextMenu={onCopyImage}
          className="max-w-[400px] max-h-[300px] object-contain object-left w-fit"
          style={{ opacity: 0 }}
          crossOrigin="anonymous"
        />
      )}

      <LinkOverride link={src} label="Open in new tab" />
    </OverrideLayout>
  );
});

export { ImageOverride };
