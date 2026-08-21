import { Protect } from '@/components/protect';
import {
  ServerHeadphonesOffIcon,
  ServerMicOffIcon
} from '@/components/voice-state-icons';
import { useCanModerateUser } from '@/features/server/hooks';
import { useIsOwnUser } from '@/features/server/users/hooks';
import { useVoiceUserStateByUserId } from '@/features/server/voice/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { Permission, getTrpcError } from '@kurier/shared';
import { Button, ContextMenuItem } from '@kurier/ui';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TMemberVoiceModerationProps = {
  userId: number;
  serverMuted?: boolean;
  serverDeafened?: boolean;
  variant: 'icons' | 'buttons' | 'menu';
};

const MemberVoiceModeration = memo(
  ({
    userId,
    serverMuted: knownMuted,
    serverDeafened: knownDeafened,
    variant
  }: TMemberVoiceModerationProps) => {
    const { t } = useTranslation('settings');
    const canModerate = useCanModerateUser(userId);
    const isOwnUser = useIsOwnUser(userId);
    const voiceState = useVoiceUserStateByUserId(userId);
    const [optimisticMuted, setOptimisticMuted] = useState<boolean>();
    const [optimisticDeafened, setOptimisticDeafened] = useState<boolean>();

    const liveMuted = knownMuted ?? voiceState?.serverMuted;
    const liveDeafened = knownDeafened ?? voiceState?.serverDeafened;

    useEffect(() => {
      if (liveMuted === undefined) {
        return;
      }

      setOptimisticMuted(undefined);
    }, [liveMuted]);

    useEffect(() => {
      if (liveDeafened === undefined) {
        return;
      }

      setOptimisticDeafened(undefined);
    }, [liveDeafened]);

    const muted = optimisticMuted ?? liveMuted ?? false;
    const deafened = optimisticDeafened ?? liveDeafened ?? false;

    const visible = canModerate && !isOwnUser;

    const onToggleMute = useCallback(async () => {
      const trpc = getTRPCClient();
      const nextMuted = !muted;

      try {
        await trpc.users.mute.mutate({
          userId,
          muted: nextMuted
        });
        setOptimisticMuted(nextMuted);
        toast.success(nextMuted ? t('mutedSuccess') : t('unmutedSuccess'));
      } catch (error) {
        toast.error(getTrpcError(error, t('failedMute')));
      }
    }, [muted, t, userId]);

    const onToggleDeafen = useCallback(async () => {
      const trpc = getTRPCClient();
      const nextDeafened = !deafened;

      try {
        await trpc.users.deafen.mutate({
          userId,
          deafened: nextDeafened
        });
        setOptimisticDeafened(nextDeafened);
        toast.success(
          nextDeafened ? t('deafenedSuccess') : t('undeafenedSuccess')
        );
      } catch (error) {
        toast.error(getTrpcError(error, t('failedDeafen')));
      }
    }, [deafened, t, userId]);

    if (!visible) {
      return null;
    }

    if (variant === 'menu') {
      return (
        <>
          <Protect permission={Permission.MUTE_MEMBERS}>
            <ContextMenuItem onClick={onToggleMute}>
              <ServerMicOffIcon className="h-4 w-4" />
              {muted ? t('unmuteBtn') : t('muteBtn')}
            </ContextMenuItem>
          </Protect>
          <Protect permission={Permission.DEAFEN_MEMBERS}>
            <ContextMenuItem onClick={onToggleDeafen}>
              <ServerHeadphonesOffIcon className="h-4 w-4" />
              {deafened ? t('undeafenBtn') : t('deafenBtn')}
            </ContextMenuItem>
          </Protect>
        </>
      );
    }

    if (variant === 'buttons') {
      return (
        <>
          <Protect permission={Permission.MUTE_MEMBERS}>
            <Button variant="outline" size="sm" onClick={onToggleMute}>
              <ServerMicOffIcon className="h-4 w-4" />
              {muted ? t('unmuteBtn') : t('muteBtn')}
            </Button>
          </Protect>
          <Protect permission={Permission.DEAFEN_MEMBERS}>
            <Button variant="outline" size="sm" onClick={onToggleDeafen}>
              <ServerHeadphonesOffIcon className="h-4 w-4" />
              {deafened ? t('undeafenBtn') : t('deafenBtn')}
            </Button>
          </Protect>
        </>
      );
    }

    return (
      <>
        <Protect permission={Permission.MUTE_MEMBERS}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title={muted ? t('unmuteBtn') : t('muteBtn')}
            onClick={onToggleMute}
          >
            <ServerMicOffIcon className="h-4 w-4" />
          </Button>
        </Protect>
        <Protect permission={Permission.DEAFEN_MEMBERS}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title={deafened ? t('undeafenBtn') : t('deafenBtn')}
            onClick={onToggleDeafen}
          >
            <ServerHeadphonesOffIcon className="h-4 w-4" />
          </Button>
        </Protect>
      </>
    );
  }
);

MemberVoiceModeration.displayName = 'MemberVoiceModeration';

export { MemberVoiceModeration };
