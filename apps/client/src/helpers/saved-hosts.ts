import {
  getLocalStorageItem,
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItem,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';

export type TSavedHost = {
  host: string;
  token?: string;
  name?: string;
  logo?: string;
  mentionUnread?: number;
};

type TSavedHostsSnapshot = {
  hosts: TSavedHost[];
  activeHost: string;
};

const listeners = new Set<() => void>();

const getDefaultHost = () => {
  if (import.meta.env.MODE === 'development') {
    return 'localhost:4991';
  }

  return window.location.host;
};

const parseServerLink = (input: string): URL | null => {
  let value = input.trim();

  if (!value) return null;

  if (!value.includes('://')) {
    value = `https://${value}`;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const normalizeHost = (input: string): string | null => {
  const uri = parseServerLink(input);

  if (!uri) return null;

  const host = (uri.host || uri.pathname).replaceAll('/', '').trim();

  return host || null;
};

const extractInviteFromLink = (input: string): string | undefined => {
  const uri = parseServerLink(input);
  const invite = uri?.searchParams.get('invite')?.trim();

  return invite || undefined;
};

const emit = () => {
  listeners.forEach((listener) => listener());
};

const persist = (snapshot: TSavedHostsSnapshot) => {
  setLocalStorageItemAsJSON(LocalStorageKey.SAVED_SERVERS, snapshot.hosts);
  setLocalStorageItem(LocalStorageKey.ACTIVE_HOST, snapshot.activeHost);
  cache = snapshot;
  emit();
};

const readSnapshot = (): TSavedHostsSnapshot => {
  const defaultHost = getDefaultHost();
  const storedHost = getLocalStorageItem(LocalStorageKey.ACTIVE_HOST);
  const storedHosts =
    getLocalStorageItemAsJSON<TSavedHost[]>(LocalStorageKey.SAVED_SERVERS) ??
    [];
  const hosts = storedHosts.filter((entry) => entry.host);

  if (hosts.length === 0) {
    const token =
      getLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN) ?? undefined;

    hosts.push({
      host: storedHost || defaultHost,
      token
    });
  }

  const activeHost =
    storedHost && hosts.some((entry) => entry.host === storedHost)
      ? storedHost
      : hosts[0]?.host || defaultHost;

  return { hosts, activeHost };
};

let cache = readSnapshot();

if (
  !getLocalStorageItem(LocalStorageKey.ACTIVE_HOST) ||
  !getLocalStorageItem(LocalStorageKey.SAVED_SERVERS)
) {
  persist(cache);
}

const subscribeSavedHosts = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getSavedHostsSnapshot = () => cache;

const getActiveHost = () => cache.activeHost;

const getSavedHost = (host: string) =>
  cache.hosts.find((entry) => entry.host === host);

const upsertSavedHost = (patch: TSavedHost) => {
  const hosts = [...cache.hosts];
  const index = hosts.findIndex((entry) => entry.host === patch.host);

  if (index === -1) {
    hosts.push(patch);
  } else {
    hosts[index] = { ...hosts[index], ...patch };
  }

  persist({
    hosts,
    activeHost: cache.activeHost
  });
};

const setActiveHost = (host: string) => {
  const hosts = cache.hosts.some((entry) => entry.host === host)
    ? cache.hosts
    : [...cache.hosts, { host }];

  persist({
    hosts,
    activeHost: host
  });
};

const removeSavedHost = (host: string) => {
  const hosts = cache.hosts.filter((entry) => entry.host !== host);
  const activeHost =
    cache.activeHost === host
      ? hosts[0]?.host || getDefaultHost()
      : cache.activeHost;

  if (hosts.length === 0) {
    persist({
      hosts: [{ host: activeHost }],
      activeHost
    });
    return;
  }

  persist({ hosts, activeHost });
};

export {
  extractInviteFromLink,
  getActiveHost,
  getDefaultHost,
  getSavedHost,
  getSavedHostsSnapshot,
  normalizeHost,
  removeSavedHost,
  setActiveHost,
  subscribeSavedHosts,
  upsertSavedHost
};
