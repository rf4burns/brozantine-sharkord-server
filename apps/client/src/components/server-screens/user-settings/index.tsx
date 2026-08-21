import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { Appearance } from './appearance';
import { Devices } from './devices';
import { Notifications } from './notifications';
import { Others } from './others';
import { Password } from './password';
import { Profile } from './profile';
import { Sounds } from './sounds';

type TUserSettingsProps = TServerScreenBaseProps;

const UserSettings = memo(({ close }: TUserSettingsProps) => {
  const { t } = useTranslation('settings');
  const [tab, setTab] = useState('profile');

  const groups = useMemo(
    () => [
      {
        label: t('userSettingsGroup'),
        items: [
          { id: 'profile', label: t('profileTab') },
          { id: 'devices', label: t('devicesTab') },
          { id: 'appearance', label: t('appearanceTab') },
          { id: 'sounds', label: t('soundsTab') },
          { id: 'notifications', label: t('notificationsTab') },
          { id: 'password', label: t('passwordTab') },
          { id: 'others', label: t('othersTab') }
        ]
      }
    ],
    [t]
  );

  return (
    <ServerScreenLayout
      close={close}
      title={t('userSettingsTitle')}
      groups={groups}
      value={tab}
      onValueChange={setTab}
    >
      {tab === 'profile' && <Profile />}
      {tab === 'devices' && <Devices />}
      {tab === 'appearance' && <Appearance />}
      {tab === 'sounds' && <Sounds />}
      {tab === 'notifications' && <Notifications />}
      {tab === 'password' && <Password />}
      {tab === 'others' && <Others />}
    </ServerScreenLayout>
  );
});

export { UserSettings };
