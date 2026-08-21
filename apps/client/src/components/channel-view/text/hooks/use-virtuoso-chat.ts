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
// small slack so sub-pixel / padding does not stop fill-loading early
const VIEWPORT_FILL_SLACK_PX = 16;

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [firstItemIndex, setFirstItemIndex] = useState(FIRST_ITEM_INDEX_START);
  const [unseenCount, setUnseenCount] = useState(0);
  const atBottomRef = useRef(true);
  const atTopRef = useRef(true);
  const pendingPrependRef = useRef(false);
  const groupsBeforeLoadRef = useRef(0);
  const messageCountBeforeLoadRef = useRef(0);
  const lastMessageIdRef = useRef<number | undefined>(undefined);
  const groupedMessagesRef = useRef(groupedMessages);
  const listHeightRef = useRef(0);
  const fetchingRef = useRef(fetching);
  const hasMoreRef = useRef(hasMore);
  const loadMoreRef = useRef(loadMore);
  const messageCountRef = useRef(messageCount);
  const fillExhaustedRef = useRef(false);
  const loadInFlightRef = useRef(false);

  groupedMessagesRef.current = groupedMessages;
  atBottomRef.current = atBottom;
  fetchingRef.current = fetching;
  hasMoreRef.current = hasMore;
  loadMoreRef.current = loadMore;
  messageCountRef.current = messageCount;

  useEffect(() => {
    setAtBottom(true);
    setFirstItemIndex(FIRST_ITEM_INDEX_START);
    setUnseenCount(0);
    pendingPrependRef.current = false;
    lastMessageIdRef.current = undefined;
    listHeightRef.current = 0;
    atTopRef.current = true;
    fillExhaustedRef.current = false;
    loadInFlightRef.current = false;
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
    const addedGroups = groupedMessages.length - groupsBeforeLoadRef.current;
    const addedMessages = messageCount - messageCountBeforeLoadRef.current;

    if (addedGroups > 0) {
      setFirstItemIndex((index) => index - addedGroups);
    }

    // server said hasMore but nothing new arrived - stop fill loop
    if (addedMessages <= 0) {
      fillExhaustedRef.current = true;
    }
  }, [fetching, groupedMessages.length, messageCount]);

  useEffect(() => {
    if (!atBottom || messageCount <= HIGH_WATERMARK) {
      return;
    }

    trimOldestMessages(channelId, HIGH_WATERMARK_KEEP);
  }, [atBottom, channelId, messageCount]);

  const needsViewportFill = useCallback(() => {
    const viewportHeight = viewportRef.current?.clientHeight ?? 0;
    const listHeight = listHeightRef.current;

    if (viewportHeight <= 0) {
      return atTopRef.current;
    }

    if (listHeight <= 0) {
      return true;
    }

    return listHeight <= viewportHeight + VIEWPORT_FILL_SLACK_PX;
  }, []);

  const requestOlderMessages = useCallback(() => {
    if (
      loadInFlightRef.current ||
      fetchingRef.current ||
      !hasMoreRef.current ||
      fillExhaustedRef.current ||
      groupedMessagesRef.current.length === 0
    ) {
      return;
    }

    loadInFlightRef.current = true;
    pendingPrependRef.current = true;
    groupsBeforeLoadRef.current = groupedMessagesRef.current.length;
    messageCountBeforeLoadRef.current = messageCountRef.current;

    void Promise.resolve(loadMoreRef.current()).finally(() => {
      loadInFlightRef.current = false;
    });
  }, []);

  const onAtBottomStateChange = useCallback((isAtBottom: boolean) => {
    setAtBottom(isAtBottom);
  }, []);

  const onAtTopStateChange = useCallback(
    (isAtTop: boolean) => {
      atTopRef.current = isAtTop;

      if (isAtTop) {
        requestOlderMessages();
      }
    },
    [requestOlderMessages]
  );

  const onStartReached = useCallback(() => {
    atTopRef.current = true;
    requestOlderMessages();
  }, [requestOlderMessages]);

  const onTotalListHeightChanged = useCallback(
    (height: number) => {
      listHeightRef.current = height;

      if (needsViewportFill()) {
        requestOlderMessages();
      }
    },
    [needsViewportFill, requestOlderMessages]
  );

  // keep loading older pages while content still fits in the viewport.
  // Virtuoso startReached often does not re-fire when alignToBottom leaves
  // empty space above and there is no scrollbar.
  useEffect(() => {
    if (fetching || !hasMore || messageCount === 0 || fillExhaustedRef.current) {
      return;
    }

    if (!needsViewportFill()) {
      return;
    }

    requestOlderMessages();
  }, [
    fetching,
    hasMore,
    messageCount,
    groupedMessages.length,
    needsViewportFill,
    requestOlderMessages
  ]);

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
    viewportRef,
    atBottom,
    firstItemIndex,
    unseenCount,
    onAtBottomStateChange,
    onAtTopStateChange,
    onStartReached,
    onTotalListHeightChanged,
    scrollToBottom,
    isAtBottom,
    scrollToGroupByMessageId
  };
};

export { useVirtuosoChat };
