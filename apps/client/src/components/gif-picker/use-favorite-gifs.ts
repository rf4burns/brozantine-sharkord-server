import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { useCallback, useSyncExternalStore } from 'react';

let favoritesCache: string[] | null = null;
const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback());
};

const loadFavorites = (): string[] => {
  if (favoritesCache !== null) return favoritesCache;

  const stored = getLocalStorageItemAsJSON<string[]>(
    LocalStorageKey.FAVORITE_GIFS,
    []
  );

  favoritesCache = stored ?? [];

  return favoritesCache;
};

const persistFavorites = (urls: string[]) => {
  favoritesCache = urls;
  setLocalStorageItemAsJSON(LocalStorageKey.FAVORITE_GIFS, urls);
  notifySubscribers();
};

const subscribe = (callback: () => void) => {
  subscribers.add(callback);

  return () => {
    subscribers.delete(callback);
  };
};

const useFavoriteGifs = () => {
  const favorites = useSyncExternalStore(
    subscribe,
    loadFavorites,
    loadFavorites
  );

  const isFavorite = useCallback(
    (url: string) => favorites.includes(url),
    [favorites]
  );

  const toggleFavorite = useCallback((url: string) => {
    const current = loadFavorites();
    const next = current.includes(url)
      ? current.filter((item) => item !== url)
      : [url, ...current];

    persistFavorites(next);
  }, []);

  return { favorites, isFavorite, toggleFavorite };
};

export { useFavoriteGifs };
