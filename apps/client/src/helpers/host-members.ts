import { memberMatchKey } from '@/helpers/member-match-key';
import { getActiveHost, getSavedHostsSnapshot } from '@/helpers/saved-hosts';
import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { isDeletedUser, type TJoinedPublicUser } from '@kurier/shared';

export type TCachedHostMember = {
  userId: number;
  name: string;
  identity?: string;
};

type THostMembersIndex = Record<string, TCachedHostMember[]>;

const emptyIndex: THostMembersIndex = {};

let cache: THostMembersIndex | undefined;

const getCache = () => {
  if (!cache) {
    cache =
      getLocalStorageItemAsJSON<THostMembersIndex>(
        LocalStorageKey.HOST_MEMBERS
      ) ?? emptyIndex;
  }

  return cache;
};

const persist = (next: THostMembersIndex) => {
  cache = next;
  setLocalStorageItemAsJSON(LocalStorageKey.HOST_MEMBERS, next);
};

const cacheHostMembers = (host: string, users: TJoinedPublicUser[]) => {
  const members = users
    .filter((user) => !isDeletedUser(user) && !user.banned)
    .map((user) => ({
      userId: user.id,
      name: user.name,
      identity: user._identity || undefined
    }));

  persist({
    ...getCache(),
    [host]: members
  });
};

const findSharedHostForUser = (
  user: TJoinedPublicUser,
  options?: { skipCurrent?: boolean }
): { host: string; userId: number } | null => {
  const key = memberMatchKey(user);

  if (!key) {
    return null;
  }

  const activeHost = getActiveHost();
  const hosts = getSavedHostsSnapshot().hosts.filter((entry) => entry.token);
  const ordered = options?.skipCurrent
    ? hosts.filter((entry) => entry.host !== activeHost)
    : [
        ...hosts.filter((entry) => entry.host === activeHost),
        ...hosts.filter((entry) => entry.host !== activeHost)
      ];

  for (const entry of ordered) {
    const match = (getCache()[entry.host] ?? []).find(
      (member) => memberMatchKey(member) === key
    );

    if (match) {
      return { host: entry.host, userId: match.userId };
    }
  }

  return null;
};

export { cacheHostMembers, findSharedHostForUser };
