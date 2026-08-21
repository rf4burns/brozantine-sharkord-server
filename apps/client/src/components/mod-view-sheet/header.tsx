import { MemberVoiceModeration } from '@/components/member-voice-moderation';
import { UserAvatar } from '@/components/user-avatar';
import { setModViewOpen } from '@/features/app/actions';
import {
  openDialog,
  requestConfirmation,
  requestTextInput
} from '@/features/dialogs/actions';
import { useCanModerateUser, useUserRoles } from '@/features/server/hooks';
import { useOwnUserId, useUserStatus } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  getTrpcError,
  isDeletedUser,
  Permission,
  UserStatus
} from '@kurier/shared';
import { Button, Input } from '@kurier/ui';
import { Gavel, Plus, Trash, UserMinus } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { RoleBadge } from '../role-badge';
import { useModViewContext } from './context';

const Header = memo(() => {
  const { t } = useTranslation('settings');
  const ownUserId = useOwnUserId();
  const { user, refetch } = useModViewContext();
  const status = useUserStatus(user.id);
  const userRoles = useUserRoles(user.id);
  const isDeletedUserAccount = isDeletedUser(user);
  const isOwnUser = user.id === ownUserId;
  const canModerate = useCanModerateUser(user.id);
  const [nickname, setNickname] = useState(user.nickname ?? '');

  useEffect(() => {
    setNickname(user.nickname ?? '');
  }, [user.nickname]);

  const onNicknameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setNickname(event.target.value);
    },
    []
  );

  const onSaveNickname = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.updateNickname.mutate({
        userId: user.id,
        nickname
      });
      toast.success(t('nicknameUpdated'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedUpdateNickname')));
    } finally {
      refetch();
    }
  }, [nickname, refetch, t, user.id]);

  const onRemoveRole = useCallback(
    async (roleId: number, roleName: string) => {
      const answer = await requestConfirmation({
        title: t('removeRoleTitle'),
        message: t('removeRoleMsg', { roleName }),
        confirmLabel: t('removeRoleConfirm')
      });

      if (!answer) {
        return;
      }

      const trpc = getTRPCClient();

      try {
        await trpc.users.removeRole.mutate({
          userId: user.id,
          roleId
        });
        toast.success(t('roleRemovedSuccess'));
      } catch (error) {
        toast.error(getTrpcError(error, t('failedRemoveRole')));
      } finally {
        refetch();
      }
    },
    [user.id, refetch, t]
  );

  const onKick = useCallback(async () => {
    const reason = await requestTextInput({
      title: t('kickTitle'),
      message: t('kickMsg'),
      confirmLabel: t('kickConfirm'),
      allowEmpty: true
    });

    if (reason === null) {
      return;
    }

    const trpc = getTRPCClient();

    try {
      await trpc.users.kick.mutate({
        userId: user.id,
        reason
      });
      toast.success(t('kickedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedKick')));
    } finally {
      refetch();
    }
  }, [user.id, refetch, t]);

  const onBan = useCallback(async () => {
    if (isDeletedUserAccount) {
      toast.error(t('cannotBanDeletedUser'));
      return;
    }

    const trpc = getTRPCClient();

    const reason = await requestTextInput({
      title: t('banTitle'),
      message: t('banMsg'),
      confirmLabel: t('banConfirm'),
      allowEmpty: true
    });

    if (reason === null) {
      return;
    }

    try {
      await trpc.users.ban.mutate({
        userId: user.id,
        reason
      });
      toast.success(t('bannedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedBan')));
    } finally {
      refetch();
    }
  }, [user.id, refetch, isDeletedUserAccount, t]);

  const onUnban = useCallback(async () => {
    if (isDeletedUserAccount) {
      toast.error(t('cannotBanDeletedUser'));
      return;
    }

    const trpc = getTRPCClient();

    const answer = await requestConfirmation({
      title: t('unbanTitle'),
      message: t('unbanMsg'),
      confirmLabel: t('unbanConfirm')
    });

    if (!answer) {
      return;
    }

    try {
      await trpc.users.unban.mutate({
        userId: user.id
      });
      toast.success(t('unbannedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedUnban')));
    } finally {
      refetch();
    }
  }, [user.id, refetch, isDeletedUserAccount, t]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <UserAvatar userId={user.id} className="h-12 w-12" />
        <h2 className="text-lg font-bold text-foreground">{user.name}</h2>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Protect permission={Permission.KICK_MEMBERS}>
          <Button
            variant="outline"
            size="sm"
            onClick={onKick}
            disabled={status === UserStatus.OFFLINE}
          >
            <UserMinus className="h-4 w-4" />
            {t('kickBtn')}
          </Button>
        </Protect>
        <Protect permission={Permission.BAN_MEMBERS}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (user.banned ? onUnban() : onBan())}
            disabled={isOwnUser || isDeletedUserAccount}
          >
            <Gavel className="h-4 w-4" />
            {user.banned ? t('unbanBtn') : t('banBtn')}
          </Button>
        </Protect>
        <MemberVoiceModeration
          userId={user.id}
          serverMuted={user.serverMuted}
          serverDeafened={user.serverDeafened}
          variant="buttons"
        />
        <Protect permission={Permission.DELETE_USERS}>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openDialog(Dialog.DELETE_USER, {
                user,
                refetch,
                onDelete: () => setModViewOpen(false)
              })
            }
            disabled={isOwnUser || isDeletedUserAccount}
          >
            <Trash className="h-4 w-4" />
            {t('deleteBtn')}
          </Button>
        </Protect>
      </div>

      <Protect permission={Permission.MANAGE_USERS}>
        <div className="flex flex-wrap gap-1.5 items-center">
          {userRoles.map((role) => (
            <RoleBadge key={role.id} role={role} onRemoveRole={onRemoveRole} />
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={isDeletedUserAccount}
            onClick={() => openDialog(Dialog.ASSIGN_ROLE, { user, refetch })}
          >
            <Plus className="h-3 w-3" />
            {t('modViewAssignRoleBtn')}
          </Button>
        </div>
      </Protect>

      {!isOwnUser && canModerate && (
        <Protect permission={Permission.MANAGE_NICKNAMES}>
          <div className="flex gap-2 items-center">
            <Input
              value={nickname}
              onChange={onNicknameChange}
              placeholder={t('modViewNicknamePlaceholder')}
              aria-label={t('modViewNicknameLabel')}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onSaveNickname}
              disabled={isDeletedUserAccount}
            >
              {t('saveNicknameBtn')}
            </Button>
          </div>
        </Protect>
      )}
    </div>
  );
});

export { Header };
