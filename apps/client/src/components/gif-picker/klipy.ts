export type TKlipyGif = {
  preview: string;
  original: string;
};

export type TKlipyResult = {
  gifs: TKlipyGif[];
  error?: string;
};

const KLIPY_HOST = 'api.klipy.com';

const gifAt = (
  file: Record<string, unknown>,
  size: string
): string | undefined => {
  const sized = file[size];

  if (!sized || typeof sized !== 'object') return undefined;

  const gif = (sized as Record<string, unknown>).gif;

  if (gif && typeof gif === 'object') {
    const url = (gif as Record<string, unknown>).url;

    if (typeof url === 'string') return url;
  }

  const webp = (sized as Record<string, unknown>).webp;

  if (webp && typeof webp === 'object') {
    const url = (webp as Record<string, unknown>).url;

    if (typeof url === 'string') return url;
  }

  return undefined;
};

const parseGif = (entry: unknown): TKlipyGif | undefined => {
  if (!entry || typeof entry !== 'object') return undefined;

  const file = (entry as Record<string, unknown>).file;

  if (!file || typeof file !== 'object') return undefined;

  const fileMap = file as Record<string, unknown>;
  const original =
    gifAt(fileMap, 'hd') ??
    gifAt(fileMap, 'md') ??
    gifAt(fileMap, 'sm') ??
    gifAt(fileMap, 'xs') ??
    '';
  const preview =
    gifAt(fileMap, 'sm') ??
    gifAt(fileMap, 'xs') ??
    gifAt(fileMap, 'md') ??
    gifAt(fileMap, 'hd') ??
    original;

  if (!original) return undefined;

  return { preview, original };
};

const extractList = (body: unknown): unknown[] => {
  if (!body || typeof body !== 'object') return [];

  const data = (body as Record<string, unknown>).data;

  if (Array.isArray(data)) return data;

  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as Record<string, unknown>).data)
  ) {
    return (data as Record<string, unknown>).data as unknown[];
  }

  return [];
};

const fetchGifs = async ({
  apiKey,
  query,
  perPage = 24
}: {
  apiKey: string;
  query?: string;
  perPage?: number;
}): Promise<TKlipyResult> => {
  const key = apiKey.trim();

  if (!key) {
    return { gifs: [], error: 'No KLIPY API key configured.' };
  }

  const path =
    !query || query.trim().length === 0
      ? `/api/v1/${key}/gifs/trending`
      : `/api/v1/${key}/gifs/search`;
  const params = new URLSearchParams({ per_page: String(perPage) });

  if (query && query.trim().length > 0) {
    params.set('q', query.trim());
  }

  try {
    const res = await fetch(
      `https://${KLIPY_HOST}${path}?${params.toString()}`
    );

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          gifs: [],
          error: 'Invalid or unauthorized KLIPY API key. Check Settings.'
        };
      }

      const snippet = (await res.text()).slice(0, 180);

      return {
        gifs: [],
        error: `KLIPY rejected the key (${res.status}). ${snippet}`
      };
    }

    const body: unknown = await res.json();
    const gifs = extractList(body)
      .map(parseGif)
      .filter((gif): gif is TKlipyGif => !!gif);

    return { gifs };
  } catch {
    return { gifs: [], error: 'Could not reach KLIPY.' };
  }
};

export { fetchGifs };
