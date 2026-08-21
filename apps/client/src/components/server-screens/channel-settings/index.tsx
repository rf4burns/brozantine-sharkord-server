import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { General } from './general';
import { ChannelPermissions } from './permissions';

type TChannelSettingsProps = TServerScreenBaseProps & {
  channelId: number;
};

const ChannelSettings = memo(({ close, channelId }: TChannelSettingsProps) => {
  const { t } = useTranslation('settings');
  const [tab, setTab] = useState('general');

  const groups = useMemo(
    () => [
      {
        items: [
          { id: 'general', label: t('generalTab') },
          { id: 'permissions', label: t('permissionsTab') }
        ]
      }
    ],
    [t]
  );

  return (
    <ServerScreenLayout
      close={close}
      title={t('channelSettingsTitle')}
      groups={groups}
      value={tab}
      onValueChange={setTab}
    >
      {tab === 'general' && <General channelId={channelId} />}
      {tab === 'permissions' && <ChannelPermissions channelId={channelId} />}
    </ServerScreenLayout>
  );
});

export { ChannelSettings };
