const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

const getYoutubeVideoIdFromUrl = (value: string): string | undefined => {
  const trimmed = value.trim();

  if (VIDEO_ID_RE.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];

      return id && VIDEO_ID_RE.test(id) ? id : undefined;
    }

    if (!hostname.endsWith('youtube.com')) return undefined;

    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v') ?? undefined;

      return id && VIDEO_ID_RE.test(id) ? id : undefined;
    }

    const [firstSegment, secondSegment] = url.pathname
      .split('/')
      .filter(Boolean);

    if (
      firstSegment &&
      ['shorts', 'embed', 'v', 'live'].includes(firstSegment) &&
      secondSegment &&
      VIDEO_ID_RE.test(secondSegment)
    ) {
      return secondSegment;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export { getYoutubeVideoIdFromUrl };
