import { setModViewOpen } from '@/features/app/actions';
import { openDirectMessage } from '@/features/hosts/actions';
import { usePublicServerSettings, useUserRoles } from '@/features/server/hooks';
import { useIsOwnUser, useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { useDateLocale } from '@/hooks/use-date-locale';
import {
  isDeletedUser,
  USER_MODERATION_PERMISSIONS,
  UserStatus
} from '@kurier/shared';
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@kurier/ui';
import { format } from 'date-fns';
import { MessageSquare, ShieldCheck, Trash, UserCog } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MemberVoiceModeration } from '../member-voice-moderation';
import { Protect } from '../protect';
import { RoleBadge } from '../role-badge';
import { UserAvatar } from '../user-avatar';
import { UserStatusBadge } from '../user-status';

type TUserPopoverProps = {
  userId: number;
  children: React.ReactNode;
};

const UserPopover = memo(({ userId, children }: TUserPopoverProps) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const user = useUserById(userId);
  const roles = useUserRoles(userId);
  const settings = usePublicServerSettings();
  const isOwnUser = useIsOwnUser(userId);

  const onDirectMessageClick = useCallback(async () => {
    if (!user) return;

    await openDirectMessage(user);
  }, [user]);

  if (!user) return <>{children}</>;

  const isDeleted = isDeletedUser(user);
  const showDmButton =
    settings?.directMessagesEnabled && !isDeleted && !isOwnUser;
  const displayName = getRenderedUsername(user);

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[340px] overflow-hidden border-border bg-rail p-0"
        align="start"
        side="right"
      >
        <div className="relative">
          {isDeleted ? (
            <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md bg-gray-600 px-2 py-1 text-xs text-white">
              <Trash className="h-3 w-3" />
              {t('deletedBadge')}
            </div>
          ) : (
            user.banned && (
              <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md bg-red-500 px-2 py-1 text-xs text-white">
                <ShieldCheck className="h-3 w-3" />
                {t('bannedBadge')}
              </div>
            )
          )}
          {user.banner ? (
            <div
              className="h-[120px] w-full bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url("${getFileUrl(user.banner)}")`
              }}
            />
          ) : (
            <div
              className="h-[120px] w-full"
              style={{
                background: user.profileColor || '#5865f2'
              }}
            />
          )}
          <div className="absolute left-4 top-[72px]">
            <div className="rounded-full bg-rail p-1">
              <UserAvatar
                userId={user.id}
                className="h-20 w-20"
                showStatusBadge={false}
              />
            </div>
            <div className="absolute bottom-1 right-1">
              <UserStatusBadge
                status={user.status || UserStatus.OFFLINE}
                className="h-4 w-4 border-[3px] border-rail"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 pb-4 pt-12">
          <div>
            <div
              className={`truncate text-xl font-bold leading-6 ${
                isDeleted
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              }`}
            >
              {displayName}
            </div>
            <div className="truncate text-sm text-muted-foreground">
              @{user.name}
              {user.pronouns ? ` · ${user.pronouns}` : ''}
            </div>
            {user.statusMessage && (
              <p className="mt-1 text-sm text-muted-foreground">
                {user.statusMessage}
              </p>
            )}
          </div>

          {user.bio && (
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-faint">
                {t('aboutMe')}
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {user.bio}
              </p>
            </div>
          )}

          {roles.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-faint">
                {t('rolesHeader', { count: roles.length })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((role) => (
                  <RoleBadge key={role.id} role={role} />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              {t('memberSince', {
                date: format(new Date(user.createdAt), 'PP', {
                  locale: dateLocale
                })
              })}
            </p>

            <div className="flex items-center gap-2">
              {showDmButton && (
                <IconButton
                  icon={MessageSquare}
                  variant="ghost"
                  size="sm"
                  title={t('directMessage')}
                  onClick={onDirectMessageClick}
                />
              )}

              {!isDeleted && (
                <MemberVoiceModeration userId={userId} variant="icons" />
              )}

              <Protect permission={USER_MODERATION_PERMISSIONS}>
                <IconButton
                  icon={UserCog}
                  variant="ghost"
                  size="sm"
                  title={t('moderationView')}
                  onClick={() => setModViewOpen(true, user.id)}
                />
              </Protect>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

UserPopover.displayName = 'UserPopover';

export { UserPopover };
