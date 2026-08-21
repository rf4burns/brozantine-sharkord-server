import { LanguageSwitcher } from '@/components/language-switcher';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { connect } from '@/features/server/actions';
import { useInfo } from '@/features/server/hooks';
import {
  getFileUrl,
  getHostFromServer,
  getUrlFromServer
} from '@/helpers/get-file-url';
import { upsertSavedHost } from '@/helpers/saved-hosts';
import {
  getLocalStorageItem,
  getLocalStorageItemBool,
  getSessionStorageItem,
  LocalStorageKey,
  removeLocalStorageItem,
  removeSessionStorageItem,
  SessionStorageKey,
  setLocalStorageItem,
  setLocalStorageItemBool,
  setSessionStorageItem
} from '@/helpers/storage';
import { useForm } from '@/hooks/use-form';
import { PluginSlot, TestId } from '@kurier/shared';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Group,
  Input,
  Label,
  Switch
} from '@kurier/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const Connect = memo(() => {
  const { t } = useTranslation('connect');
  const { values, r, setErrors, onChange } = useForm<{
    identity: string;
    password: string;
    rememberCredentials: boolean;
    autoLogin: boolean;
  }>({
    identity: getLocalStorageItem(LocalStorageKey.IDENTITY) || '',
    password: getLocalStorageItem(LocalStorageKey.USER_PASSWORD) || '',
    rememberCredentials: !!getLocalStorageItem(
      LocalStorageKey.REMEMBER_CREDENTIALS
    ),
    autoLogin: getLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN)
  });

  const [loading, setLoading] = useState(false);
  const info = useInfo();

  const inviteCode = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('invite');
    const fromSwitch = getSessionStorageItem(SessionStorageKey.PENDING_INVITE);

    return fromUrl || fromSwitch || undefined;
  }, []);

  const onConnectClick = useCallback(async () => {
    setLoading(true);

    try {
      const url = getUrlFromServer();
      const response = await fetch(`${url}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identity: values.identity,
          password: values.password,
          invite: inviteCode,
          autoLogin: values.autoLogin || undefined
        })
      });

      if (!response.ok) {
        const data = await response.json();

        setErrors(data.errors || {});
        return;
      }

      const data = (await response.json()) as { token: string };

      setSessionStorageItem(SessionStorageKey.TOKEN, data.token);
      setLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN, values.autoLogin);
      upsertSavedHost({
        host: getHostFromServer(),
        token: data.token
      });
      removeSessionStorageItem(SessionStorageKey.PENDING_INVITE);

      if (values.autoLogin) {
        setLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN, data.token);
      } else {
        removeLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);
      }

      await connect();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      toast.error(t('connectError', { message: errorMessage }));
    } finally {
      setLoading(false);
    }
  }, [
    values.identity,
    values.password,
    values.autoLogin,
    setErrors,
    inviteCode,
    t
  ]);

  const logoSrc = useMemo(() => {
    if (info?.logo) {
      return getFileUrl(info.logo);
    }

    return '/kurier-logo.png';
  }, [info]);

  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-sidebar">
      <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
        <LanguageSwitcher variant="icon" />
      </div>
      <Card className="w-full max-w-[420px] border-border bg-sidebar shadow-2xl">
        <CardHeader>
          <CardTitle className="flex flex-col items-center gap-3 text-center">
            <img
              src={logoSrc}
              alt="Kurier"
              className="block max-h-20 max-w-full rounded-2xl"
            />
            <span className="text-2xl font-bold leading-tight">
              {t('welcomeBack')}
            </span>
            {info?.name && (
              <span className="text-sm font-normal text-muted-foreground">
                {info.name}
              </span>
            )}
          </CardTitle>
          <PluginSlotRenderer slotId={PluginSlot.CONNECT_SCREEN} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {info?.description && (
            <span className="text-sm text-muted-foreground">
              {info?.description}
            </span>
          )}

          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onConnectClick();
            }}
          >
            <Group label={t('identityLabel')} help={t('identityHelp')}>
              <Input
                {...r('identity')}
                autoComplete="username"
                data-testid={TestId.CONNECT_IDENTITY_INPUT}
              />
            </Group>
            <Group label={t('passwordLabel')}>
              <Input
                {...r('password')}
                type="password"
                autoComplete="current-password"
                onEnter={onConnectClick}
                data-testid={TestId.CONNECT_PASSWORD_INPUT}
              />
            </Group>
          </form>

          <div
            className="flex items-center gap-2 w-fit cursor-pointer"
            data-testid={TestId.CONNECT_AUTO_LOGIN_SWITCH}
            onClick={() => {
              onChange('autoLogin', !values.autoLogin);
            }}
          >
            <Switch checked={values.autoLogin} />
            <Label className="text-sm cursor-pointer">
              {t('autoLoginLabel')}
            </Label>
          </div>

          <div className="flex flex-col gap-2">
            {!window.isSecureContext && (
              <Alert variant="destructive">
                <AlertTitle>{t('insecureTitle')}</AlertTitle>
                <AlertDescription>{t('insecureDesc')}</AlertDescription>
              </Alert>
            )}

            <Button
              className="h-12 w-full"
              onClick={onConnectClick}
              disabled={loading || !values.identity || !values.password}
              data-testid={TestId.CONNECT_BUTTON}
            >
              {t('connectBtn')}
            </Button>

            {!info?.allowNewUsers && (
              <>
                {!inviteCode && (
                  <span className="text-xs text-muted-foreground text-center">
                    {t('registrationDisabled')}
                  </span>
                )}
              </>
            )}

            {inviteCode && (
              <Alert variant="info">
                <AlertTitle>{t('invitedTitle')}</AlertTitle>
                <AlertDescription>
                  <span className="font-mono text-xs">
                    {t('inviteCode', { code: inviteCode })}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground select-none">
        <span>v{VITE_APP_VERSION}</span>
        <a
          href="https://github.com/rf4burns/brozantine-sharkord-server"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
    </div>
  );
});

export { Connect };
