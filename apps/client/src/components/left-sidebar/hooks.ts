import { useAutoJoinLastChannel } from '@/features/app/hooks';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  useChannelsMap,
  useCurrentVoiceChannelId
} from '@/features/server/channels/hooks';
import { channelByIdSelector } from '@/features/server/channels/selectors';
import { store } from '@/features/store';
import { getLocalStorageItemAsJSON, LocalStorageKey } from '@/helpers/storage';
import { useSelectChannel } from '@/hooks/use-select-channel';
import { getTRPCClient } from '@/lib/trpc';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const loadExpandedValue = (categoryId: number): boolean => {
  const expandedMap = getLocalStorageItemAsJSON<Record<number, boolean>>(
    LocalStorageKey.CATEGORIES_EXPANDED,
    {}
  );

  return expandedMap?.[categoryId] ?? true;
};

const saveExpandedValue = (categoryId: number, expanded: boolean): void => {
  const expandedMap = getLocalStorageItemAsJSON<Record<number, boolean>>(
    LocalStorageKey.CATEGORIES_EXPANDED,
    {}
  );

  const newExpandedMap = {
    ...expandedMap,
    [categoryId]: expanded
  };

  localStorage.setItem(
    LocalStorageKey.CATEGORIES_EXPANDED,
    JSON.stringify(newExpandedMap)
  );
};

const useCategoryExpanded = (categoryId: number) => {
  const [expanded, setExpanded] = useState(loadExpandedValue(categoryId));

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const newValue = !prev;

      saveExpandedValue(categoryId, newValue);

      return newValue;
    });
  }, [categoryId]);

  return useMemo(
    () => ({ expanded, toggleExpanded }),
    [expanded, toggleExpanded]
  );
};

const useRestoreLastSelectedChannel = () => {
  const autoJoinLastChannel = useAutoJoinLastChannel();
  const channelsMap = useChannelsMap();

  useEffect(() => {
    if (!autoJoinLastChannel) return;

    const lastSelectedChannelId = localStorage.getItem(
      LocalStorageKey.LAST_SELECTED_CHANNEL
    );

    if (lastSelectedChannelId) {
      const channelId = parseInt(lastSelectedChannelId, 10);
      const lastChannel = channelsMap[channelId];

      if (lastChannel) {
        setSelectedChannelId(channelId);
      }
    }
  }, [channelsMap, autoJoinLastChannel]);
};

const useVoiceMoveSubscription = () => {
  const { t } = useTranslation('sidebar');
  const selectChannel = useSelectChannel();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const selectChannelRef = useRef(selectChannel);
  const currentVoiceChannelIdRef = useRef(currentVoiceChannelId);
  const failedMoveUserRef = useRef(t('failedMoveUser'));

  selectChannelRef.current = selectChannel;
  currentVoiceChannelIdRef.current = currentVoiceChannelId;
  failedMoveUserRef.current = t('failedMoveUser');

  useEffect(() => {
    const trpc = getTRPCClient();

    const sub = trpc.voice.onMoved.subscribe(undefined, {
      onData: ({ channelId, fromChannelId }) => {
        void (async () => {
          if (currentVoiceChannelIdRef.current !== fromChannelId) {
            toast.error(failedMoveUserRef.current);
            return;
          }

          const channel = channelByIdSelector(store.getState(), channelId);

          if (!channel) {
            toast.error(failedMoveUserRef.current);
            return;
          }

          const moved = await selectChannelRef.current(channelId);

          if (!moved) {
            toast.error(failedMoveUserRef.current);
          }
        })();
      },
      onError: (err) => console.error('onMoved subscription error:', err)
    });

    return () => sub.unsubscribe();
  }, []);
};

export {
  useCategoryExpanded,
  useRestoreLastSelectedChannel,
  useVoiceMoveSubscription
};
