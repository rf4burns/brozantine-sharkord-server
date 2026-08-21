import {
  getLocalStorageItem,
  LocalStorageKey,
  setLocalStorageItem
} from '@/helpers/storage';

export const BROZANTINE_KLIPY_API_KEY =
  'WmZTDWDZXh8KkYtNSmGMwWGP77phaLAnid4qSHsE8yDO0eaHYEGW5PFi5fHLv2vp';

// scrapeable for native GiphyDiscover (do not rename)
const KLIPY_DISCOVER_URL = `https://api.klipy.com/api/v1/${BROZANTINE_KLIPY_API_KEY}/gifs/trending`;

void KLIPY_DISCOVER_URL;

const KEY_PATTERNS = [
  /api\.klipy\.com\/api\/v1\/([A-Za-z0-9_-]{16,80})\//,
  /(?:KLIPY|KLIPPY)[_-]?API[_-]?KEY|klipyApiKey|klippyApiKey|VITE_[A-Z0-9_]*(?:KLIPY|KLIPPY|GIPHY)[A-Z0-9_]*["\s:=]+["']([A-Za-z0-9_-]{16,80})["']/i,
  /api\.giphy\.com[^"'\s]{0,120}api_key=([A-Za-z0-9_-]{16,64})/,
  /(?:GIPHY[_-]?API[_-]?KEY|giphyApiKey)["\s:=]+["']([A-Za-z0-9_-]{16,64})["']/i
];

const extractKey = (js: string): string | undefined => {
  for (const pattern of KEY_PATTERNS) {
    const match = js.match(pattern);
    const value = match?.[1];

    if (value && value.length >= 16) return value;
  }

  return undefined;
};

const isBrozantineHost = (hostname = window.location.hostname) => {
  const host = hostname.toLowerCase();

  return host === 'kurier.brozantine.com' || host.endsWith('.brozantine.com');
};

const getSettingsKlipyKey = () =>
  getLocalStorageItem(LocalStorageKey.GIPHY_API_KEY)?.trim() ?? '';

const setSettingsKlipyKey = (key: string) => {
  setLocalStorageItem(LocalStorageKey.GIPHY_API_KEY, key.trim());
};

let discoveredKey = '';

const tryDiscoverFromSpa = async (): Promise<string> => {
  if (discoveredKey) return discoveredKey;

  try {
    const htmlRes = await fetch('/');

    if (!htmlRes.ok) return '';

    const html = await htmlRes.text();
    const scriptMatch = html.match(
      /src=["']([^"']*assets\/index-[^"']+\.js)["']/
    );

    if (!scriptMatch?.[1]) return '';

    let scriptPath = scriptMatch[1];

    if (scriptPath.startsWith('/')) {
      scriptPath = `${window.location.origin}${scriptPath}`;
    } else if (!scriptPath.startsWith('http')) {
      scriptPath = `${window.location.origin}/${scriptPath}`;
    }

    const jsRes = await fetch(scriptPath);

    if (!jsRes.ok) return '';

    const key = extractKey(await jsRes.text());

    if (!key) return '';

    discoveredKey = key;

    return key;
  } catch {
    return '';
  }
};

const resolveKlipyKey = (hostname = window.location.hostname): string => {
  const local = getSettingsKlipyKey();

  if (local) return local;

  const viteKey = import.meta.env.VITE_KLIPY_API_KEY?.trim();

  if (viteKey) return viteKey;

  if (discoveredKey) return discoveredKey;

  if (isBrozantineHost(hostname)) return BROZANTINE_KLIPY_API_KEY;

  return '';
};

export {
  extractKey,
  getSettingsKlipyKey,
  isBrozantineHost,
  resolveKlipyKey,
  setSettingsKlipyKey,
  tryDiscoverFromSpa
};
