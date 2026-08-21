import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@kurier/ui';
import { Star } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchGifs, type TKlipyGif } from './klipy';
import { resolveKlipyKey, tryDiscoverFromSpa } from './klipy-key';
import { useFavoriteGifs } from './use-favorite-gifs';

type TGifPickerProps = {
  children: React.ReactNode;
  onGifSelect: (url: string) => void;
};

type TGifTileProps = {
  previewUrl: string;
  originalUrl: string;
  isFavorite: boolean;
  onSelect: (url: string) => void;
  onToggleFavorite: (url: string) => void;
};

const GifTile = memo(
  ({
    previewUrl,
    originalUrl,
    isFavorite,
    onSelect,
    onToggleFavorite
  }: TGifTileProps) => {
    const handleSelect = useCallback(() => {
      onSelect(originalUrl);
    }, [onSelect, originalUrl]);

    const handleFavorite = useCallback(
      (event: React.MouseEvent) => {
        event.stopPropagation();
        onToggleFavorite(originalUrl);
      },
      [onToggleFavorite, originalUrl]
    );

    return (
      <button
        type="button"
        className="relative overflow-hidden rounded-md bg-muted aspect-square"
        onClick={handleSelect}
      >
        <img
          src={previewUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span
          role="button"
          tabIndex={0}
          className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white"
          onClick={handleFavorite}
        >
          <Star
            className={`h-3.5 w-3.5 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
          />
        </span>
      </button>
    );
  }
);

const GifPicker = memo(({ children, onGifSelect }: TGifPickerProps) => {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<TKlipyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [apiKey, setApiKey] = useState(() => resolveKlipyKey());
  const { favorites, isFavorite, toggleFavorite } = useFavoriteGifs();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGifSelect = useCallback(
    (url: string) => {
      onGifSelect(url);
      setOpen(false);
    },
    [onGifSelect]
  );

  const loadGifs = useCallback(
    async (query?: string, key = apiKey) => {
      if (!key) {
        setGifs([]);
        setError(undefined);
        setLoading(false);

        return;
      }

      setLoading(true);
      setError(undefined);

      const result = await fetchGifs({ apiKey: key, query });

      setGifs(result.gifs);
      setError(
        result.error ??
          (result.gifs.length === 0
            ? query
              ? t('gifNoSearchResults')
              : t('gifNoTrending')
            : undefined)
      );
      setLoading(false);
    },
    [apiKey, t]
  );

  const boot = useCallback(async () => {
    let key = resolveKlipyKey();

    if (!key) {
      setDiscovering(true);
      key = await tryDiscoverFromSpa();
      setDiscovering(false);
    }

    setApiKey(key);

    if (key) {
      await loadGifs(undefined, key);
    }
  }, [loadGifs]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (!nextOpen) {
        setSearch('');
        return;
      }

      void boot();
    },
    [boot]
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setSearch(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        void loadGifs(value.trim() || undefined);
      }, 300);
    },
    [loadGifs]
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleRetry = useCallback(() => {
    void loadGifs(search.trim() || undefined);
  }, [loadGifs, search]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[360px] p-0 h-100"
        align="end"
        sideOffset={8}
      >
        <Tabs defaultValue="search" className="flex h-full flex-col">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
            <TabsTrigger value="search">{t('gifSearchTab')}</TabsTrigger>
            <TabsTrigger value="favorites">{t('gifFavoritesTab')}</TabsTrigger>
          </TabsList>
          <TabsContent
            value="search"
            className="mt-0 flex flex-1 flex-col min-h-0"
          >
            <div className="border-b p-3">
              <Input
                placeholder={t('gifSearchPlaceholder')}
                value={search}
                onChange={handleSearchChange}
                className="h-9"
                disabled={!apiKey}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {discovering || loading ? (
                <div className="flex h-full items-center justify-center">
                  <Spinner size="sm" />
                </div>
              ) : !apiKey ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {t('gifNoKey')}
                </p>
              ) : error && gifs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-4">
                  <p className="text-center text-sm text-destructive">
                    {error}
                  </p>
                  <Button size="sm" variant="outline" onClick={handleRetry}>
                    {t('retry')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {gifs.map((gif) => (
                    <GifTile
                      key={gif.original}
                      previewUrl={gif.preview}
                      originalUrl={gif.original}
                      isFavorite={isFavorite(gif.original)}
                      onSelect={handleGifSelect}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent
            value="favorites"
            className="mt-0 flex flex-1 flex-col min-h-0 overflow-y-auto p-2"
          >
            {favorites.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {t('gifNoFavorites')}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {favorites.map((url) => (
                  <GifTile
                    key={url}
                    previewUrl={url}
                    originalUrl={url}
                    isFavorite
                    onSelect={handleGifSelect}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
});

GifPicker.displayName = 'GifPicker';

export { GifPicker };
