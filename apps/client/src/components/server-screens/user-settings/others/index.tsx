import {
  getSettingsKlipyKey,
  setSettingsKlipyKey
} from '@/components/gif-picker/klipy-key';
import { LanguageSwitcher } from '@/components/language-switcher';
import { setAutoJoinLastChannel } from '@/features/app/actions';
import { useAutoJoinLastChannel } from '@/features/app/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Input,
  Switch
} from '@kurier/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

const Others = memo(() => {
  const { t } = useTranslation('settings');
  const autoJoinLastChannel = useAutoJoinLastChannel();
  const [klipyKey, setKlipyKey] = useState(getSettingsKlipyKey);

  const handleKlipyKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setKlipyKey(value);
      setSettingsKlipyKey(value);
    },
    []
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('othersTitle')}</CardTitle>
        <CardDescription>{t('othersDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group
          label={t('autoJoinLastChannelLabel')}
          description={t('autoJoinLastChannelDesc')}
        >
          <Switch
            checked={autoJoinLastChannel}
            onCheckedChange={(value) => setAutoJoinLastChannel(value)}
          />
        </Group>

        <Group label={t('languageLabel')} description={t('languageDesc')}>
          <LanguageSwitcher />
        </Group>

        <Group label={t('klipyApiKeyLabel')} description={t('klipyApiKeyDesc')}>
          <Input
            value={klipyKey}
            onChange={handleKlipyKeyChange}
            placeholder={t('klipyApiKeyPlaceholder')}
            type="password"
            autoComplete="off"
          />
        </Group>
      </CardContent>
    </Card>
  );
});

export { Others };
