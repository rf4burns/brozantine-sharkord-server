import type { TDialogBaseProps } from '@/components/dialogs/types';
import { PaginatedList } from '@/components/paginated-list';
import { jumpToMessage } from '@/features/server/actions';
import type { TMessageJumpToTarget } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner
} from '@kurier/ui';
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent
} from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch } from './hooks';
import { SearchFiltersDropdown } from './search-filters-dropdown';
import { SearchResultFileCard } from './search-result-file';
import { SearchResultMessageCard } from './search-result-message';
import type { TUnifiedSearchResult } from './types';

const ITEMS_PER_PAGE = 12;

type TSearchDialogProps = TDialogBaseProps;

const SearchDialog = memo(({ isOpen, close }: TSearchDialogProps) => {
  const { t } = useTranslation('dialogs');
  const inputRef = useRef<HTMLInputElement>(null);
  const filtersKeyDownRef = useRef<
    ((event: KeyboardEvent<HTMLInputElement>) => boolean) | null
  >(null);

  const [cursor, setCursor] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { query, setQuery, loading, canSearch, unifiedResults } =
    useSearch(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setCursor(0);
      setFiltersOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (filtersOpen) {
        event.preventDefault();
        setFiltersOpen(false);

        return;
      }

      close();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [close, filtersOpen]);

  const onJump = useCallback(
    (target: TMessageJumpToTarget) => {
      jumpToMessage(target);
      close();
    },
    [close]
  );

  const syncCursor = useCallback(() => {
    const next = inputRef.current?.selectionStart ?? query.length;

    setCursor(next);
  }, [query.length]);

  const onQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextQuery = event.target.value;

      setQuery(nextQuery);
      setCursor(event.target.selectionStart ?? nextQuery.length);
      setFiltersOpen(true);
    },
    [setQuery]
  );

  const onFilterSelect = useCallback(
    (nextQuery: string, nextCursor: number) => {
      setQuery(nextQuery);
      setCursor(nextCursor);
    },
    [setQuery]
  );

  const onInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const handled = filtersKeyDownRef.current?.(event) ?? false;

      if (handled) {
        return;
      }

      if (event.key === 'ArrowDown' && !filtersOpen) {
        setFiltersOpen(true);
      }
    },
    [filtersOpen]
  );

  const onInputFocus = useCallback(() => {
    setFiltersOpen(true);
    syncCursor();
  }, [syncCursor]);

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="h-[86vh] max-h-[94vh] lg:min-w-7xl gap-0 overflow-hidden p-0"
        onInteractOutside={close}
        close={close}
      >
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b border-border bg-card/70 px-5 py-4 text-left">
            <DialogTitle className="text-base">{t('searchTitle')}</DialogTitle>
            <DialogDescription>{t('searchDesc')}</DialogDescription>
            <div className="relative mt-3">
              <Input
                ref={inputRef}
                value={query}
                onChange={onQueryChange}
                onKeyDown={onInputKeyDown}
                onClick={syncCursor}
                onKeyUp={syncCursor}
                onSelect={syncCursor}
                onFocus={onInputFocus}
                placeholder={t('searchPlaceholder')}
                autoFocus
                className="h-10"
                autoComplete="off"
                spellCheck={false}
              />
              <SearchFiltersDropdown
                query={query}
                cursor={cursor}
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
                onSelect={onFilterSelect}
                inputRef={inputRef}
                keyDownRef={filtersKeyDownRef}
              />
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            {!canSearch && !loading && (
              <div className="flex h-full min-h-55 items-center justify-center rounded-lg bg-muted/20 px-6 text-sm text-muted-foreground">
                {t('searchHint')}
              </div>
            )}

            {loading && (
              <div className="flex h-full min-h-55 items-center justify-center">
                <Spinner size="sm" />
              </div>
            )}

            {canSearch && !loading && (
              <PaginatedList
                items={unifiedResults}
                itemsPerPage={ITEMS_PER_PAGE}
              >
                <PaginatedList.Empty className="flex h-full min-h-55 items-center justify-center rounded-lg bg-muted/20 px-6 text-sm text-muted-foreground">
                  {t('noResults')}
                </PaginatedList.Empty>

                <PaginatedList.List<TUnifiedSearchResult>
                  className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
                  getItemKey={(entry) => entry.key}
                >
                  {(entry) => {
                    if (entry.type === 'message') {
                      return (
                        <SearchResultMessageCard
                          message={entry.item}
                          onJump={onJump}
                        />
                      );
                    }

                    return (
                      <SearchResultFileCard
                        result={entry.item}
                        onJump={onJump}
                      />
                    );
                  }}
                </PaginatedList.List>

                <PaginatedList.Pagination
                  alwaysShow
                  className="flex shrink-0 items-center justify-center gap-1 border-t border-border pt-3"
                />
              </PaginatedList>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export { SearchDialog };
