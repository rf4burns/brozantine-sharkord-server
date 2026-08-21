import { UserAvatar } from '@/components/user-avatar';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useCan } from '@/features/server/hooks';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { DEFAULT_PROFILE_COLOR, Permission } from '@kurier/shared';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ColorPicker,
  Group,
  ImageSwatchPicker,
  Input,
  Textarea
} from '@kurier/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AvatarManager } from './avatar-manager';
import { BannerManager } from './banner-manager';

const Profile = memo(() => {
  const { t } = useTranslation('settings');
  const ownPublicUser = useOwnPublicUser();
  const can = useCan();
  const canChangeNickname = can(Permission.CHANGE_NICKNAME);
  const { setTrpcErrors, r, values, onChange } = useForm({
    name: ownPublicUser?.name ?? '',
    profileColor: ownPublicUser?.profileColor ?? DEFAULT_PROFILE_COLOR,
    bio: ownPublicUser?.bio ?? '',
    nickname: ownPublicUser?.nickname ?? '',
    pronouns: ownPublicUser?.pronouns ?? '',
    statusMessage: ownPublicUser?.statusMessage ?? ''
  });

  const handleColorChange = useCallback(
    (color: string) => {
      onChange('profileColor', color);
    },
    [onChange]
  );

  const onUpdateUser = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.update.mutate(values);
      toast.success(t('profileUpdated'));
    } catch (error) {
      setTrpcErrors(error);
    }
  }, [values, setTrpcErrors, t]);

  if (!ownPublicUser) return null;

  const userAvatarUrl = getFileUrl(ownPublicUser.avatar);
  const userBannerUrl = getFileUrl(ownPublicUser.banner);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profileTitle')}</CardTitle>
        <CardDescription>{t('profileDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-6">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-start gap-4">
              <AvatarManager user={ownPublicUser} />

              <BannerManager user={ownPublicUser} />

              <Group label={t('profileColorLabel')}>
                <ColorPicker
                  value={values.profileColor}
                  onChange={handleColorChange}
                  defaultValue={DEFAULT_PROFILE_COLOR}
                />
                <ImageSwatchPicker
                  src={userAvatarUrl}
                  onChange={handleColorChange}
                />
                <ImageSwatchPicker
                  src={userBannerUrl}
                  onChange={handleColorChange}
                />
              </Group>
            </div>

            <Group label={t('usernameLabel')}>
              <Input placeholder={t('usernamePlaceholder')} {...r('name')} />
            </Group>

            <Group label={t('nicknameLabel')}>
              <Input
                placeholder={t('nicknamePlaceholder')}
                {...r('nickname')}
                disabled={!canChangeNickname}
              />
            </Group>

            <Group label={t('pronounsLabel')}>
              <Input
                placeholder={t('pronounsPlaceholder')}
                {...r('pronouns')}
              />
            </Group>

            <Group label={t('statusMessageLabel')}>
              <Input
                placeholder={t('statusMessagePlaceholder')}
                {...r('statusMessage')}
              />
            </Group>

            <Group label={t('bioLabel')}>
              <Textarea placeholder={t('bioPlaceholder')} {...r('bio')} />
            </Group>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeServerScreens}>
                {t('cancel')}
              </Button>
              <Button onClick={onUpdateUser}>{t('saveChanges')}</Button>
            </div>
          </div>

          <div className="hidden w-72 shrink-0 overflow-hidden rounded-lg bg-rail lg:block">
            <div className="relative">
              {userBannerUrl ? (
                <div
                  className="h-20 bg-cover bg-center"
                  style={{ backgroundImage: `url("${userBannerUrl}")` }}
                />
              ) : (
                <div
                  className="h-20"
                  style={{ background: values.profileColor }}
                />
              )}
              <div className="absolute left-4 top-10 rounded-full bg-rail p-1">
                <UserAvatar
                  userId={ownPublicUser.id}
                  className="h-16 w-16"
                  showStatusBadge={false}
                />
              </div>
            </div>
            <div className="px-4 pb-4 pt-10">
              <div className="text-lg font-bold">
                {values.nickname?.trim() || values.name}
              </div>
              <div className="text-sm text-muted-foreground">
                @{values.name}
                {values.pronouns ? ` · ${values.pronouns}` : ''}
              </div>
              {values.statusMessage && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {values.statusMessage}
                </p>
              )}
              {values.bio && (
                <p className="mt-2 text-sm text-foreground">{values.bio}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export { Profile };
