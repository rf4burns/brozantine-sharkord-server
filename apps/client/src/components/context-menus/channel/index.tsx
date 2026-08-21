import { ServerScreen } from '@/components/server-screens/screens';
import { openVoiceChatSidebar } from '@/features/app/actions';
import { requestConfirmation } from '@/features/dialogs/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { setChannelNotificationOverride } from '@/features/server/channels/actions';
import {
  useChannelById,
  useChannelNotificationLevel
} from '@/features/server/channels/hooks';
import { useCan } from '@/features/server/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  ChannelType,
  Permission,
  type TChannelNotificationLevel
} from '@kurier/shared';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@kurier/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TChannelContextMenuProps = {
  children: React.ReactNode;
  channelId: number;
};

const ChannelContextMenu = memo(
  ({ children, channelId }: TChannelContextMenuProps) => {
    const { t } = useTranslation('sidebar');
    const can = useCan();
    const channel = useChannelById(channelId);
    const notificationLevel = useChannelNotificationLevel(channelId);

    const isDm = !!channel?.isDm;
    const canManageChannels = can(Permission.MANAGE_CHANNELS) && !isDm;
    const isVoiceChannel = channel?.type === ChannelType.VOICE && !isDm;
    const canSetVoiceStatus =
      !!isVoiceChannel &&
      (canManageChannels || can(Permission.SET_VOICE_CHANNEL_STATUS));

    const onOpenChat = useCallback(() => {
      openVoiceChatSidebar(channelId);
    }, [channelId]);

    const onDeleteClick = useCallback(async () => {
      const choice = await requestConfirmation({
        title: t('deleteChannelTitle'),
        message: t('deleteChannelMsg'),
        confirmLabel: t('deleteLabel'),
        cancelLabel: t('cancel', { ns: 'common' })
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.channels.delete.mutate({ channelId });

        toast.success(t('channelDeleted'));
      } catch {
        toast.error(t('failedDeleteChannel'));
      }
    }, [channelId, t]);

    const onEditClick = useCallback(() => {
      openServerScreen(ServerScreen.CHANNEL_SETTINGS, { channelId });
    }, [channelId]);

    const onSetStatusClick = useCallback(async () => {
      const next = window.prompt(
        t('setVoiceStatusPrompt'),
        channel?.topic ?? ''
      );

      if (next === null) return;

      const trpc = getTRPCClient();

      try {
        await trpc.channels.updateVoiceStatus.mutate({
          channelId,
          topic: next.trim() || null
        });
      } catch {
        toast.error(t('failedSetVoiceStatus'));
      }
    }, [channel?.topic, channelId, t]);

    const onNotificationLevelChange = useCallback(
      async (value: string) => {
        const level = value as TChannelNotificationLevel;
        const trpc = getTRPCClient();

        try {
          const result = await trpc.channels.setNotificationOverride.mutate({
            channelId,
            level
          });

          setChannelNotificationOverride(result);
        } catch {
          toast.error(t('failedSetNotifications'));
        }
      },
      [channelId, t]
    );

    return (
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>{channel?.name}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuLabel>{t('notificationsLabel')}</ContextMenuLabel>
          <ContextMenuRadioGroup
            value={notificationLevel}
            onValueChange={onNotificationLevelChange}
          >
            <ContextMenuRadioItem value="all">
              {t('notificationAll')}
            </ContextMenuRadioItem>
            <ContextMenuRadioItem value="mentions">
              {t('notificationMentions')}
            </ContextMenuRadioItem>
            <ContextMenuRadioItem value="nothing">
              {t('notificationMute')}
            </ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          {isVoiceChannel && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onOpenChat}>
                {t('openChat')}
              </ContextMenuItem>
            </>
          )}
          {canSetVoiceStatus && (
            <ContextMenuItem onClick={onSetStatusClick}>
              {t('setVoiceStatus')}
            </ContextMenuItem>
          )}
          {canManageChannels && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onEditClick}>
                {t('editLabel')}
              </ContextMenuItem>
              <ContextMenuItem variant="destructive" onClick={onDeleteClick}>
                {t('deleteLabel')}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);

export { ChannelContextMenu };
