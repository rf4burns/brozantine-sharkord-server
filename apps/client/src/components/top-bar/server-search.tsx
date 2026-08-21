import { openDialog } from '@/features/dialogs/actions';
import { Search } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../dialogs/dialogs';

const ServerSearch = memo(() => {
  const { t } = useTranslation('topbar');
  const openSearchDialog = useCallback(() => {
    openDialog(Dialog.SEARCH);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearchDialog();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearchDialog]);

  return (
    <button
      type="button"
      onClick={openSearchDialog}
      className="flex w-36 max-w-xs items-center gap-2 rounded-md bg-rail px-2 py-1 text-xs text-muted-foreground transition hover:bg-card md:w-52"
    >
      <Search className="h-3.5 w-3.5 animate-pulse" />
      <span className="truncate text-left">{t('searchContent')}</span>
      <span className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] md:inline">
        Ctrl+K
      </span>
    </button>
  );
});

export { ServerSearch };
