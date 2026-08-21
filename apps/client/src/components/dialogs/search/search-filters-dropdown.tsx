import { useChannels } from '@/features/server/channels/hooks';
import { useUsers } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  formatSearchOperatorToken,
  getSearchTokenAtCursor,
  replaceSearchToken,
  SEARCH_HAS_VALUES,
  SEARCH_OPERATORS,
  type TSearchOperatorKey
} from '@kurier/shared';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type RefObject
} from 'react';
import { useTranslation } from 'react-i18next';

const MAX_SUGGESTIONS = 10;

type TSearchSuggestion = {
  id: string;
  label: string;
  description?: string;
  insert: string;
  keepOpen?: boolean;
};

type TSearchFiltersDropdownProps = {
  query: string;
  cursor: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (nextQuery: string, nextCursor: number) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  keyDownRef: MutableRefObject<
    ((event: KeyboardEvent<HTMLInputElement>) => boolean) | null
  >;
};

const todayUtcDate = (): string => {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
};

const SearchFiltersDropdown = memo(
  ({
    query,
    cursor,
    open,
    onOpenChange,
    onSelect,
    inputRef,
    keyDownRef
  }: TSearchFiltersDropdownProps) => {
    const { t } = useTranslation('dialogs');
    const users = useUsers();
    const channels = useChannels();
    const [selectedIndex, setSelectedIndex] = useState(0);

    const token = useMemo(
      () => getSearchTokenAtCursor(query, cursor),
      [query, cursor]
    );

    const suggestions = useMemo((): TSearchSuggestion[] => {
      if (!open) {
        return [];
      }

      if (token.isOperatorToken && token.key) {
        const key = token.key;
        const prefix = token.valuePrefix.toLowerCase();

        if (key === 'from' || key === 'mentions') {
          return users
            .filter(
              (user) =>
                user.name !== DELETED_USER_IDENTITY_AND_NAME &&
                user.name.toLowerCase().includes(prefix)
            )
            .slice(0, MAX_SUGGESTIONS)
            .map((user) => ({
              id: `user-${user.id}`,
              label: user.name,
              insert: formatSearchOperatorToken(key, user.name)
            }));
        }

        if (key === 'in') {
          return channels
            .filter(
              (channel) =>
                !channel.isDm && channel.name.toLowerCase().includes(prefix)
            )
            .slice(0, MAX_SUGGESTIONS)
            .map((channel) => ({
              id: `channel-${channel.id}`,
              label: `#${channel.name}`,
              insert: formatSearchOperatorToken(key, channel.name)
            }));
        }

        if (key === 'has') {
          return SEARCH_HAS_VALUES.filter((value) =>
            value.startsWith(prefix)
          ).map((value) => ({
            id: `has-${value}`,
            label: value,
            description: t(`searchHas_${value}`),
            insert: formatSearchOperatorToken(key, value)
          }));
        }

        if (key === 'pinned') {
          return (['true', 'false'] as const)
            .filter((value) => value.startsWith(prefix))
            .map((value) => ({
              id: `pinned-${value}`,
              label: value,
              insert: formatSearchOperatorToken(key, value)
            }));
        }

        if (key === 'before' || key === 'after' || key === 'during') {
          const date = todayUtcDate();

          if (prefix && !date.startsWith(prefix)) {
            return [
              {
                id: `date-${key}-typed`,
                label: prefix,
                description: t('searchDateHint'),
                insert: formatSearchOperatorToken(key, prefix)
              }
            ];
          }

          return [
            {
              id: `date-${key}`,
              label: date,
              description: t('searchDateHint'),
              insert: formatSearchOperatorToken(key, date)
            }
          ];
        }
      }

      const operatorPrefix = token.token.toLowerCase();

      return SEARCH_OPERATORS.filter(
        (op) =>
          `${op.key}:`.startsWith(operatorPrefix) ||
          op.key.startsWith(operatorPrefix)
      )
        .slice(0, MAX_SUGGESTIONS)
        .map((op) => ({
          id: `op-${op.key}`,
          label: `${op.key}:`,
          description: t(`searchOp_${op.key}`),
          insert: formatSearchOperatorToken(op.key as TSearchOperatorKey),
          keepOpen: true
        }));
    }, [channels, open, t, token, users]);

    useEffect(() => {
      setSelectedIndex(0);
    }, [suggestions]);

    const applySuggestion = useCallback(
      (suggestion: TSearchSuggestion) => {
        const keepOpen = Boolean(suggestion.keepOpen);
        const nextQuery = replaceSearchToken(
          query,
          token.start,
          token.end,
          suggestion.insert,
          { trailingSpace: !keepOpen }
        );
        const nextCursor =
          token.start + suggestion.insert.length + (keepOpen ? 0 : 1);

        onSelect(nextQuery, nextCursor);
        onOpenChange(keepOpen);

        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(nextCursor, nextCursor);
        });
      },
      [inputRef, onOpenChange, onSelect, query, token.end, token.start]
    );

    const onKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (!open || suggestions.length === 0) {
          return false;
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex((index) => (index + 1) % suggestions.length);

          return true;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex(
            (index) => (index - 1 + suggestions.length) % suggestions.length
          );

          return true;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
          const suggestion = suggestions[selectedIndex];

          if (suggestion) {
            event.preventDefault();
            applySuggestion(suggestion);

            return true;
          }
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onOpenChange(false);

          return true;
        }

        return false;
      },
      [applySuggestion, onOpenChange, open, selectedIndex, suggestions]
    );

    useEffect(() => {
      keyDownRef.current = onKeyDown;

      return () => {
        keyDownRef.current = null;
      };
    }, [keyDownRef, onKeyDown]);

    if (!open || suggestions.length === 0) {
      return null;
    }

    return (
      <div
        role="listbox"
        aria-label={t('searchFiltersLabel')}
        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
      >
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.id}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={cn(
              'flex w-full cursor-default select-none items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-sm outline-none',
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/60'
            )}
            onMouseEnter={() => setSelectedIndex(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              applySuggestion(suggestion);
            }}
          >
            <span className="font-medium">{suggestion.label}</span>
            {suggestion.description && (
              <span className="truncate text-xs text-muted-foreground">
                {suggestion.description}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }
);

export { SearchFiltersDropdown };
export type { TSearchFiltersDropdownProps };
