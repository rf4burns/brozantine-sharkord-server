import { ActivityLog } from '@/components/server-screens/server-settings/audit-log';
import { useCan } from '@/features/server/hooks';
import { Permission, USER_ADMIN_VIEW_PERMISSIONS } from '@kurier/shared';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { Emojis } from './emojis';
import { General } from './general';
import { Invites } from './invites';
import { Plugins } from './plugins';
import { Roles } from './roles';
import { Storage } from './storage';
import { Updates } from './updates';
import { Users } from './users';

type TServerSettingsProps = TServerScreenBaseProps;

const ServerSettings = memo(({ close }: TServerSettingsProps) => {
  const { t } = useTranslation('settings');
  const can = useCan();

  const defaultTab = useMemo(() => {
    if (can(Permission.MANAGE_SETTINGS)) return 'general';
    if (can(Permission.MANAGE_ROLES)) return 'roles';
    if (can(Permission.MANAGE_EMOJIS)) return 'emojis';
    if (can(Permission.MANAGE_STORAGE)) return 'storage';
    if (can(USER_ADMIN_VIEW_PERMISSIONS)) return 'users';
    if (can(Permission.MANAGE_INVITES)) return 'invites';
    if (can(Permission.VIEW_AUDIT_LOG)) return 'audit';
    if (can(Permission.MANAGE_UPDATES)) return 'updates';
    return 'general';
  }, [can]);

  const [tab, setTab] = useState(defaultTab);

  const groups = useMemo(
    () => [
      {
        items: [
          {
            id: 'general',
            label: t('generalTab'),
            disabled: !can(Permission.MANAGE_SETTINGS)
          },
          {
            id: 'roles',
            label: t('rolesTab'),
            disabled: !can(Permission.MANAGE_ROLES)
          },
          {
            id: 'emojis',
            label: t('emojisTab'),
            disabled: !can(Permission.MANAGE_EMOJIS)
          },
          {
            id: 'users',
            label: t('usersTab'),
            disabled: !can(USER_ADMIN_VIEW_PERMISSIONS)
          },
          {
            id: 'invites',
            label: t('invitesTab'),
            disabled: !can(Permission.MANAGE_INVITES)
          },
          {
            id: 'audit',
            label: t('auditLogTab'),
            disabled: !can(Permission.VIEW_AUDIT_LOG)
          },
          {
            id: 'storage',
            label: t('storageTab'),
            disabled: !can(Permission.MANAGE_STORAGE)
          },
          {
            id: 'plugins',
            label: t('pluginsTab'),
            disabled: !can(Permission.MANAGE_PLUGINS)
          },
          {
            id: 'updates',
            label: t('updatesTab'),
            disabled: !can(Permission.MANAGE_UPDATES)
          }
        ]
      }
    ],
    [can, t]
  );

  return (
    <ServerScreenLayout
      close={close}
      title={t('serverSettingsTitle')}
      groups={groups}
      value={tab}
      onValueChange={setTab}
    >
      {tab === 'general' && can(Permission.MANAGE_SETTINGS) && <General />}
      {tab === 'roles' && can(Permission.MANAGE_ROLES) && <Roles />}
      {tab === 'emojis' && can(Permission.MANAGE_EMOJIS) && <Emojis />}
      {tab === 'storage' && can(Permission.MANAGE_STORAGE) && <Storage />}
      {tab === 'users' && can(USER_ADMIN_VIEW_PERMISSIONS) && <Users />}
      {tab === 'invites' && can(Permission.MANAGE_INVITES) && <Invites />}
      {tab === 'audit' && can(Permission.VIEW_AUDIT_LOG) && <ActivityLog />}
      {tab === 'updates' && can(Permission.MANAGE_UPDATES) && <Updates />}
      {tab === 'plugins' && can(Permission.MANAGE_PLUGINS) && <Plugins />}
    </ServerScreenLayout>
  );
});

export { ServerSettings };
