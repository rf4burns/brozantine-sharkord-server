const URL_IN_TEXT = /https?:\/\/[^\s<>"')\]]+/gi;
const HREF_ATTR = /href\s*=\s*["']([^"']+)["']/gi;

const isGifCdnHost = (host: string) => {
  const h = host.toLowerCase().replace(/^www\./, '');

  if (h === 'giphy.com' || h === 'tenor.com' || h === 'klipy.com') {
    return false;
  }

  return (
    h === 'i.giphy.com' ||
    h === 'media.giphy.com' ||
    (h.startsWith('media') && h.endsWith('.giphy.com')) ||
    h === 'media.tenor.com' ||
    h === 'c.tenor.com' ||
    (h.startsWith('media') && h.endsWith('.tenor.com')) ||
    h === 'media.klipy.com' ||
    h === 'cdn.klipy.com' ||
    (h.endsWith('.klipy.com') && h.includes('media'))
  );
};

const cleanUrl = (raw: string): string | null => {
  let value = raw.trim();

  if (!value) return null;

  value = value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');

  while (value && '.,);]!?"\''.includes(value[value.length - 1] ?? '')) {
    value = value.slice(0, -1);
  }

  return value || null;
};

const isEmbeddableGifUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;

  const cleaned = cleanUrl(url);

  if (!cleaned) return false;

  try {
    const uri = new URL(cleaned);

    if (uri.protocol !== 'http:' && uri.protocol !== 'https:') {
      return false;
    }

    if (uri.pathname.toLowerCase().endsWith('.gif')) {
      return true;
    }

    return isGifCdnHost(uri.hostname);
  } catch {
    return false;
  }
};

const isGifProviderPage = (url: string | null | undefined): boolean => {
  if (!url) return false;

  const cleaned = cleanUrl(url);

  if (!cleaned) return false;

  try {
    const uri = new URL(cleaned);
    const host = uri.hostname.toLowerCase().replace(/^www\./, '');
    const path = uri.pathname.toLowerCase();

    if (host === 'giphy.com' || host.endsWith('.giphy.com')) {
      return path.includes('/gifs/') || path.includes('/clips/');
    }

    if (host === 'tenor.com' || host.endsWith('.tenor.com')) {
      return path.includes('/view/') || path.startsWith('/v1/');
    }

    return false;
  } catch {
    return false;
  }
};

const normalizeGifUrl = (url: string): string => {
  const cleaned = cleanUrl(url) ?? url;

  try {
    const uri = new URL(cleaned);

    uri.hash = '';

    return uri.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return cleaned.toLowerCase();
  }
};

const extractUrlsFromHtml = (html: string): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string | undefined) => {
    const cleaned = cleanUrl(raw ?? '');

    if (!cleaned || !cleaned.toLowerCase().startsWith('http')) {
      return;
    }

    const key = normalizeGifUrl(cleaned);

    if (seen.has(key)) return;

    seen.add(key);
    out.push(cleaned);
  };

  for (const match of html.matchAll(HREF_ATTR)) {
    add(match[1]);
  }

  for (const match of html.matchAll(URL_IN_TEXT)) {
    add(match[0]);
  }

  return out;
};

const extractEmbeddableGifUrls = (html: string): string[] =>
  extractUrlsFromHtml(html).filter(isEmbeddableGifUrl);

const urlsToHideFromHtml = (
  html: string,
  gifMediaUrls: string[]
): Set<string> => {
  const hide = new Set(gifMediaUrls.map(normalizeGifUrl));

  if (gifMediaUrls.length === 0) {
    return hide;
  }

  for (const url of extractUrlsFromHtml(html)) {
    if (isGifProviderPage(url)) {
      hide.add(normalizeGifUrl(url));
    }
  }

  return hide;
};

const stripUrlsFromHtml = (
  html: string,
  normalizedHide: Set<string>
): string => {
  if (!html || normalizedHide.size === 0) return html;

  let out = html.replace(
    /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi,
    (full, href: string) => {
      const cleaned = cleanUrl(href);

      if (cleaned && normalizedHide.has(normalizeGifUrl(cleaned))) {
        return '';
      }

      return full;
    }
  );

  out = out.replace(URL_IN_TEXT, (raw) => {
    const cleaned = cleanUrl(raw);

    if (cleaned && normalizedHide.has(normalizeGifUrl(cleaned))) {
      return '';
    }

    return raw;
  });

  out = out.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
  out = out.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');

  return out.trim();
};

const isVisuallyEmptyHtml = (html: string): boolean => {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length === 0;
};

const getDisplayHtmlWithoutGifs = (html: string): string => {
  const gifs = extractEmbeddableGifUrls(html);
  const hide = urlsToHideFromHtml(html, gifs);

  return stripUrlsFromHtml(html, hide);
};

export {
  extractEmbeddableGifUrls,
  getDisplayHtmlWithoutGifs,
  isEmbeddableGifUrl,
  isGifProviderPage,
  isVisuallyEmptyHtml,
  normalizeGifUrl
};
