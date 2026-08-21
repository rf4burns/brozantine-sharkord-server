import { memo, useMemo } from 'react';
import { AudioOverride } from '../overrides/audio';
import { ImageOverride } from '../overrides/image';
import { VideoOverride } from '../overrides/video';
import type { TFoundMedia } from '../renderer/types';

type TMediaProps = {
  media: TFoundMedia[];
};

const Media = memo(({ media }: TMediaProps) => {
  const { imagesAndVideos, audios } = useMemo(() => {
    const imagesAndVideos = media.filter(
      (item) => item.type === 'image' || item.type === 'video'
    );
    const audios = media.filter((item) => item.type === 'audio');

    return {
      imagesAndVideos,
      audios
    };
  }, [media]);

  return (
    <>
      {imagesAndVideos.map((item) =>
        item.type === 'image' ? (
          <ImageOverride key={item.key} src={item.url} />
        ) : (
          <VideoOverride key={item.key} src={item.url} />
        )
      )}

      {audios.map((item) => (
        <AudioOverride src={item.url} key={item.key} />
      ))}
    </>
  );
});

export { Media };
