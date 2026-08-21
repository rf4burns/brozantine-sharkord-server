import { openDialog } from '@/features/dialogs/actions';
import { Button } from '@kurier/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../../../dialogs/dialogs';

const Sounds = memo(() => {
  const { t } = useTranslation('settings');

  const handleOpen = useCallback(() => {
    openDialog(Dialog.SOUNDS);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{t('soundsTab')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('soundsDesc')}</p>
      </div>
      <Button onClick={handleOpen}>{t('openSoundsDialog')}</Button>
    </div>
  );
});

export { Sounds };
