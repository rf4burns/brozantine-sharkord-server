import { trimOldestMessages } from '@/features/server/messages/actions';
import type { TMessageGroup } from '@/features/server/messages/hooks';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';

const FIRST_ITEM_INDEX_START = 100000;
const HIGH_WATERMARK = 1800;
const HIGH_WATERMARK_KEEP = 1600;

type TUseVirtuosoChatParams = {
  channelId: number;
  groupedMessages: TMessageGroup[];
  messageCount: number;
  fetching: boolean;
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
};

const useVirtuosoChat = ({
  channelId,
  groupedMessages,
  messageCount,
  fetching,
  hasMore,
  loadMore
}: TUseVirtuosoChatParams) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [firstItemIndex, setFirstItemIndex] = useState(FIRST_ITEM_INDEX_START);
  const [unseenCount, setUnseenCount] = useState(0);
  const atBottomRef = useRef(true);
  const pendingPrependRef = useRef(false);
  const groupsBeforeLoadRef = useRef(0);
  const lastMessageIdRef = useRef<number | undefined>(undefined);
  const groupedMessagesRef = useRef(groupedMessages);

  groupedMessagesRef.current = groupedMessages;
  atBottomRef.current = atBottom;

  useEffect(() => {
    setAtBottom(true);
    setFirstItemIndex(FIRST_ITEM_INDEX_START);
    setUnseenCount(0);
    pendingPrependRef.current = false;
    lastMessageIdRef.current = undefined;
  }, [channelId]);

  const lastGroup = groupedMessages[groupedMessages.length - 1];
  const lastMessageId = lastGroup?.messages[lastGroup.messages.length - 1]?.id;

  useEffect(() => {
    if (atBottom) {
      setUnseenCount(0);
      lastMessageIdRef.current = lastMessageId;
      return;
    }

    if (
      lastMessageId !== undefined &&
      lastMessageIdRef.current !== undefined &&
      lastMessageId !== lastMessageIdRef.current
    ) {
      setUnseenCount((count) => count + 1);
    }

    lastMessageIdRef.current = lastMessageId;
  }, [atBottom, lastMessageId]);

  useLayoutEffect(() => {
    if (!pendingPrependRef.current || fetching) {
      return;
    }

    pendingPrependRef.current = false;
    const added = groupedMessages.length - groupsBeforeLoadRef.current;

    if (added > 0) {
      setFirstItemIndex((index) => index - added);
    }
  }, [fetching, groupedMessages.length]);

  useEffect(() => {
    if (!atBottom || messageCount <= HIGH_WATERMARK) {
      return;
    }

    trimOldestMessages(channelId, HIGH_WATERMARK_KEEP);
  }, [atBottom, channelId, messageCount]);

  const onAtBottomStateChange = useCallback((isAtBottom: boolean) => {
    setAtBottom(isAtBottom);
  }, []);

  const onStartReached = useCallback(() => {
    if (fetching || !hasMore || groupedMessages.length === 0) {
      return;
    }

    pendingPrependRef.current = true;
    groupsBeforeLoadRef.current = groupedMessages.length;
    void loadMore();
  }, [fetching, groupedMessages.length, hasMore, loadMore]);

  const scrollToBottom = useCallback(() => {
    const lastIndex = Math.max(0, groupedMessagesRef.current.length - 1);

    virtuosoRef.current?.scrollToIndex({
      index: lastIndex,
      align: 'end',
      behavior: 'auto'
    });
    setAtBottom(true);
    setUnseenCount(0);
  }, []);

  const isAtBottom = useCallback(() => atBottomRef.current, []);

  const scrollToGroupByMessageId = useCallback((messageId: number) => {
    const index = groupedMessagesRef.current.findIndex((group) =>
      group.messages.some((message) => message.id === messageId)
    );

    if (index < 0) {
      return;
    }

    virtuosoRef.current?.scrollToIndex({
      index,
      align: 'center',
      behavior: 'auto'
    });
  }, []);

  return {
    virtuosoRef,
    atBottom,
    firstItemIndex,
    unseenCount,
    onAtBottomStateChange,
    onStartReached,
    scrollToBottom,
    isAtBottom,
    scrollToGroupByMessageId
  };
};

export { useVirtuosoChat };
