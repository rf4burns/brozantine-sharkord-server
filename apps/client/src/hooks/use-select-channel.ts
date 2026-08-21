import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { Dialog } from '@/components/dialogs/dialogs';
import { openDialog } from '@/features/dialogs/actions';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { channelByIdSelector } from '@/features/server/channels/selectors';
import { joinVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { store } from '@/features/store';
import { LocalStorageKey } from '@/helpers/storage';
import { ChannelType } from '@kurier/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const useSelectChannel = () => {
  const { t } = useTranslation('dialogs');
  const { init } = useVoice();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const { devices } = useDevices();

  const joinAndInit = useCallback(
    async (channelId: number) => {
      setSelectedChannelId(channelId);

      const response = await joinVoice(channelId);

      if (!response) {
        setSelectedChannelId(undefined);

        return false;
      }

      try {
        await init(response, channelId);
        return true;
      } catch {
        setSelectedChannelId(undefined);
        toast.error(t('failedInitVoice'));

        return false;
      }
    },
    [init, t]
  );

  return useCallback(
    async (channelId: number) => {
      const channel = channelByIdSelector(store.getState(), channelId);

      if (!channel) return;

      if (channel.type !== ChannelType.VOICE) {
        setSelectedChannelId(channel.id);
        localStorage.setItem(
          LocalStorageKey.LAST_SELECTED_CHANNEL,
          channel.id.toString()
        );

        return;
      }

      if (currentVoiceChannelId === channel.id) {
        setSelectedChannelId(channel.id);
        return;
      }

      const joinImmediately =
        !!currentVoiceChannelId || !!devices.skipVoiceDeviceCheck;

      if (joinImmediately) {
        await joinAndInit(channel.id);
        return;
      }

      openDialog(Dialog.VOICE_DEVICE_CHECK, {
        channelId: channel.id,
        onJoin: () => joinAndInit(channel.id)
      });
    },
    [currentVoiceChannelId, devices.skipVoiceDeviceCheck, joinAndInit]
  );
};

export { useSelectChannel };
