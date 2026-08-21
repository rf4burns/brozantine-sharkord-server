import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { useCallback, useSyncExternalStore } from 'react';
import { ALL_EMOJIS } from './emoji-data';

const MAX_RECENT_EMOJIS = 32;

type StoredEmoji = {
  name: string;
  shortcodes: string[];
  fallbackImage?: string;
  emoji?: string;
};

const emojiByName = new Map(ALL_EMOJIS.map((emoji) => [emoji.name, emoji]));

let recentEmojisCache: TEmojiItem[] | null = null;

const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback());
};

const resolveStoredEmoji = (stored: StoredEmoji): TEmojiItem => {
  const current = emojiByName.get(stored.name);

  if (current) {
    return current;
  }

  return {
    name: stored.name,
    shortcodes: stored.shortcodes,
    fallbackImage: stored.fallbackImage,
    emoji: stored.emoji
  };
};

const loadRecentEmojis = (): TEmojiItem[] => {
  if (recentEmojisCache !== null) {
    return recentEmojisCache;
  }

  const stored = getLocalStorageItemAsJSON<StoredEmoji[]>(
    LocalStorageKey.RECENT_EMOJIS,
    []
  );

  recentEmojisCache = (stored ?? []).map(resolveStoredEmoji);

  return recentEmojisCache;
};

const saveRecentEmojis = (emojis: TEmojiItem[]): void => {
  const toStore: StoredEmoji[] = emojis.map((e) => ({
    name: e.name,
    shortcodes: e.shortcodes,
    fallbackImage: e.fallbackImage,
    emoji: e.emoji
  }));

  setLocalStorageItemAsJSON(LocalStorageKey.RECENT_EMOJIS, toStore);

  recentEmojisCache = emojis;

  notifySubscribers();
};

const addRecentEmoji = (emoji: TEmojiItem): void => {
  const current = loadRecentEmojis();

  const filtered = current.filter((e) => e.name !== emoji.name);
  const updated = [emoji, ...filtered].slice(0, MAX_RECENT_EMOJIS);

  saveRecentEmojis(updated);
};

const subscribe = (callback: () => void): (() => void) => {
  subscribers.add(callback);

  return () => subscribers.delete(callback);
};

const getSnapshot = (): TEmojiItem[] => {
  return loadRecentEmojis();
};

const useRecentEmojis = () => {
  const recentEmojis = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  const addRecent = useCallback((emoji: TEmojiItem) => {
    addRecentEmoji(emoji);
  }, []);

  return {
    recentEmojis,
    addRecent
  };
};

export { addRecentEmoji, useRecentEmojis };
