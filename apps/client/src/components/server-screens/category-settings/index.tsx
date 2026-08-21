import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { General } from './general';

type TCategorySettingsProps = TServerScreenBaseProps & {
  categoryId: number;
};

const CategorySettings = memo(
  ({ close, categoryId }: TCategorySettingsProps) => {
    const { t } = useTranslation('settings');
    const [tab, setTab] = useState('general');

    const groups = useMemo(
      () => [
        {
          items: [{ id: 'general', label: t('generalTab') }]
        }
      ],
      [t]
    );

    return (
      <ServerScreenLayout
        close={close}
        title={t('categorySettingsTitle')}
        groups={groups}
        value={tab}
        onValueChange={setTab}
      >
        {tab === 'general' && <General categoryId={categoryId} />}
      </ServerScreenLayout>
    );
  }
);

export { CategorySettings };
