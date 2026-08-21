import {
  audioExtensions,
  imageExtensions,
  videoExtensions,
  type TJoinedMessage
} from '@kurier/shared';
import {
  collectGifUrlsForMessage,
  embedCoveredByGifs,
  isEmbeddableGifUrl
} from './gif-urls';
import type {
  TFoundMedia,
  TFoundOpenGraph,
  TMessageMetadataLike
} from './types';

const normalizeComparableUrl = (href: string): string => {
  try {
    const url = new URL(href);

    url.hash = '';

    return url.toString();
  } catch {
    return href;
  }
};

const getDisplayHostname = (href: string): string => {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
};

const getYoutubeVideoId = (url: URL) => {
  const hostname = url.hostname.replace(/^www\./, '');

  if (hostname === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] ?? undefined;
  }

  if (!hostname.endsWith('youtube.com')) {
    return undefined;
  }

  const [firstSegment, secondSegment] = url.pathname.split('/').filter(Boolean);

  if (url.pathname === '/watch') {
    return url.searchParams.get('v') ?? undefined;
  }

  if (firstSegment && ['shorts', 'embed', 'v', 'live'].includes(firstSegment)) {
    return secondSegment ?? undefined;
  }

  return undefined;
};

const getYoutubeInfo = (
  href: string
): {
  isYoutube: boolean;
  videoId: string | undefined;
} => {
  try {
    const url = new URL(href);
    const videoId = getYoutubeVideoId(url);

    return { isYoutube: !!videoId, videoId };
  } catch {
    // ignore
  }

  return { isYoutube: false, videoId: undefined };
};

const hasSpecializedLinkOverride = (href: string): boolean => {
  const { isYoutube } = getYoutubeInfo(href);

  return isYoutube;
};

const DIRECT_MEDIA_TYPES = new Set(['image', 'video', 'audio']);

const isMediaMetadata = (metadata: TMessageMetadataLike | null | undefined) => {
  return !!metadata?.mediaType && DIRECT_MEDIA_TYPES.has(metadata.mediaType);
};

const isPreviewableMediaExtension = (extension: string): boolean => {
  const ext = extension.toLowerCase().startsWith('.')
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;

  return (
    imageExtensions.includes(ext) ||
    videoExtensions.includes(ext) ||
    audioExtensions.includes(ext)
  );
};

const extractMessageOpenGraph = (
  message: TJoinedMessage,
  media: TFoundMedia[]
): TFoundOpenGraph[] => {
  const directMediaUrls = new Set(
    media.map((item) => normalizeComparableUrl(item.url))
  );
  const seenPreviewUrls = new Set<string>();
  const gifMediaUrls = collectGifUrlsForMessage(message);

  return (message.metadata ?? [])
    .map((metadata, index) => {
      const metadataEntry = metadata as TMessageMetadataLike;

      if (
        !metadataEntry ||
        metadataEntry.kind === 'media' ||
        isMediaMetadata(metadataEntry)
      ) {
        return undefined;
      }

      if (!metadataEntry.url || hasSpecializedLinkOverride(metadataEntry.url)) {
        return undefined;
      }

      if (isEmbeddableGifUrl(metadataEntry.url)) {
        return undefined;
      }

      const imageUrl = (metadataEntry.images ?? []).find((url) => {
        return !directMediaUrls.has(normalizeComparableUrl(url));
      });

      if (
        embedCoveredByGifs(
          {
            url: metadataEntry.url,
            images: metadataEntry.images,
            imageUrl,
            mediaType: metadataEntry.mediaType,
            kind: metadataEntry.kind
          },
          gifMediaUrls
        )
      ) {
        return undefined;
      }

      const normalizedUrl = normalizeComparableUrl(metadataEntry.url);

      if (seenPreviewUrls.has(normalizedUrl)) {
        return undefined;
      }

      seenPreviewUrls.add(normalizedUrl);

      const preview: TFoundOpenGraph = {
        key: `open-graph:${normalizedUrl}:${index}`,
        url: metadataEntry.url,
        hostname: getDisplayHostname(metadataEntry.url),
        title: metadataEntry.title,
        siteName: metadataEntry.siteName,
        description: metadataEntry.description,
        imageUrl,
        faviconUrl: metadataEntry.favicons?.[0]
      };

      const hasRenderableContent =
        !!preview.title ||
        !!preview.siteName ||
        !!preview.description ||
        !!preview.imageUrl ||
        !!preview.faviconUrl;

      return hasRenderableContent ? preview : undefined;
    })
    .filter((item): item is TFoundOpenGraph => !!item);
};

export {
  extractMessageOpenGraph,
  getDisplayHostname,
  getYoutubeInfo,
  getYoutubeVideoId,
  hasSpecializedLinkOverride,
  isPreviewableMediaExtension,
  normalizeComparableUrl
};
