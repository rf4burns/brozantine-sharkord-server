import { MessageCompose } from '@/components/message-compose';
import { useThreadSidebar } from '@/features/app/hooks';
import {
  useChannelCan,
  useTypingUsersByChannelId
} from '@/features/server/hooks';
import {
  useMessages,
  type TMessageGroup
} from '@/features/server/messages/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { LocalStorageKey } from '@/helpers/storage';
import { getTRPCClient } from '@/lib/trpc';
import type { TReplyTarget } from '@/types';
import {
  ChannelPermission,
  TYPING_MS,
  getTrpcError,
  prepareMessageHtml,
  type TJoinedMessage
} from '@kurier/shared';
import { Spinner } from '@kurier/ui';
import { throttle } from 'lodash-es';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import { toast } from 'sonner';
import { ChatInputDivider } from './chat-input-divider';
import { DEFAULT_MAX_HEIGHT_VH } from './helpers';
import { useArrowUpEdit } from './hooks/use-arrow-up-edit';
import { useScrollToJumpTarget } from './hooks/use-scroll-to-jump-target';
import { useVirtuosoChat } from './hooks/use-virtuoso-chat';
import { JumpToBottom } from './jump-to-bottom';
import { MessagesGroup } from './messages-group';
import { TextSkeleton } from './text-skeleton';
import { TextTopbar } from './text-top-bar';
import {
  getChannelDraftKey,
  getDraftMessage,
  setDraftMessage
} from './use-draft-messages';

type TChannelProps = {
  channelId: number;
  onClose?: () => void;
  onToggleRightSidebar?: () => void;
  isRightSidebarOpen?: boolean;
};

const TextChannel = memo(
  ({
    channelId,
    onClose,
    onToggleRightSidebar,
    isRightSidebarOpen
  }: TChannelProps) => {
    const { t } = useTranslation();
    const {
      messages,
      hasMore,
      loadMore,
      loading,
      fetching,
      groupedMessages,
      scrollToMessage: fetchAndHighlightMessage
    } = useMessages(channelId);

    const {
      virtuosoRef,
      atBottom,
      firstItemIndex,
      unseenCount,
      onAtBottomStateChange,
      onStartReached,
      scrollToBottom,
      isAtBottom,
      scrollToGroupByMessageId
    } = useVirtuosoChat({
      channelId,
      groupedMessages,
      messageCount: messages.length,
      fetching,
      hasMore,
      loadMore
    });

    const scrollToMessage = useCallback(
      async (messageId: number, highlightTime?: number) => {
        scrollToGroupByMessageId(messageId);
        await fetchAndHighlightMessage(messageId, highlightTime);
        scrollToGroupByMessageId(messageId);
      },
      [fetchAndHighlightMessage, scrollToGroupByMessageId]
    );

    useScrollToJumpTarget(channelId, scrollToMessage);

    const draftChannelKey = getChannelDraftKey(channelId);

    const [newMessage, setNewMessage] = useState(
      getDraftMessage(draftChannelKey)
    );
    const [replyingToMessage, setReplyingToMessage] = useState<
      TJoinedMessage | undefined
    >();
    const typingUsers = useTypingUsersByChannelId(channelId);
    const composeContainerRef = useRef<HTMLDivElement>(null);
    const { activeThreadMessageId } = useThreadSidebar();
    const {
      composeRef,
      editingMessageId,
      handleArrowUpEdit,
      handleEditComplete
    } = useArrowUpEdit(messages);

    const replyTarget = useMemo<TReplyTarget | undefined>(() => {
      if (!replyingToMessage) {
        return undefined;
      }

      if (replyingToMessage.pluginId) {
        return { userId: null, pluginId: replyingToMessage.pluginId };
      }

      return { userId: replyingToMessage.userId, pluginId: null };
    }, [replyingToMessage]);

    const onComposeResize = useCallback(() => {
      if (isAtBottom()) {
        scrollToBottom();
      }
    }, [isAtBottom, scrollToBottom]);

    const channelCan = useChannelCan(channelId);

    const sendTypingSignal = useMemo(
      () =>
        throttle(async () => {
          const trpc = getTRPCClient();

          try {
            await trpc.messages.signalTyping.mutate({ channelId });
          } catch {
            // ignore
          }
        }, TYPING_MS),
      [channelId]
    );

    const setNewMessageHandler = useCallback(
      (value: string) => {
        setNewMessage(value);
        setDraftMessage(draftChannelKey, value);
      },
      [setNewMessage, draftChannelKey]
    );

    const onSend = useCallback(
      async (message: string, files: { id: string }[]) => {
        sendTypingSignal.cancel();

        const trpc = getTRPCClient();

        try {
          await trpc.messages.send.mutate({
            content: prepareMessageHtml(message),
            channelId,
            files: files.map((f) => f.id),
            replyToMessageId: replyingToMessage?.id
          });

          playSound(SoundType.MESSAGE_SENT);
        } catch (error) {
          toast.error(getTrpcError(error, t('failedSendMessage')));
          return false;
        }

        setNewMessageHandler('');
        setReplyingToMessage(undefined);

        return true;
      },
      [
        channelId,
        sendTypingSignal,
        setNewMessageHandler,
        t,
        replyingToMessage?.id
      ]
    );

    const onReplyMessageSelect = useCallback((message: TJoinedMessage) => {
      setReplyingToMessage(message);
    }, []);

    const renderMessageGroup = useCallback(
      (_index: number, group: TMessageGroup) => (
        <MessagesGroup
          group={group.messages}
          onReplyMessageSelect={onReplyMessageSelect}
          replyTargetMessageId={replyingToMessage?.id}
          activeThreadMessageId={activeThreadMessageId}
          editingMessageId={editingMessageId}
          onEditComplete={handleEditComplete}
        />
      ),
      [
        activeThreadMessageId,
        editingMessageId,
        handleEditComplete,
        onReplyMessageSelect,
        replyingToMessage?.id
      ]
    );

    const computeGroupKey = useCallback(
      (_index: number, group: TMessageGroup) => group.key,
      []
    );

    if (!channelCan(ChannelPermission.VIEW_CHANNEL) || loading) {
      return <TextSkeleton />;
    }

    return (
      <>
        {fetching && (
          <div className="absolute top-0 left-0 right-0 h-12 z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
              <Spinner size="xs" />
              <span className="text-sm text-muted-foreground">
                Fetching older messages...
              </span>
            </div>
          </div>
        )}

        <TextTopbar
          onScrollToMessage={scrollToMessage}
          channelId={channelId}
          onClose={onClose}
          onToggleRightSidebar={onToggleRightSidebar}
          isRightSidebarOpen={isRightSidebarOpen}
        />

        <div className="relative min-h-0 flex-1">
          <Virtuoso
            key={channelId}
            ref={virtuosoRef}
            data={groupedMessages}
            firstItemIndex={firstItemIndex}
            initialTopMostItemIndex={Math.max(0, groupedMessages.length - 1)}
            alignToBottom
            followOutput={atBottom ? 'smooth' : false}
            atBottomStateChange={onAtBottomStateChange}
            startReached={onStartReached}
            increaseViewportBy={{ top: 400, bottom: 200 }}
            computeItemKey={computeGroupKey}
            itemContent={renderMessageGroup}
            className="h-full pb-7 pt-2 animate-in fade-in duration-500"
          />
          <JumpToBottom
            visible={!atBottom}
            unseenCount={unseenCount}
            onClick={scrollToBottom}
          />
        </div>

        <ChatInputDivider
          composeContainerRef={composeContainerRef}
          scrollToBottom={scrollToBottom}
          isAtBottom={isAtBottom}
          storageKey={LocalStorageKey.CHAT_INPUT_HEIGHT_VH}
          defaultMaxHeightVh={DEFAULT_MAX_HEIGHT_VH}
        />

        <MessageCompose
          ref={composeRef}
          composeContainerRef={composeContainerRef}
          channelId={channelId}
          message={newMessage}
          onMessageChange={setNewMessageHandler}
          onSend={onSend}
          onTyping={sendTypingSignal}
          typingUsers={typingUsers}
          showPluginSlot
          onCancelReply={() => setReplyingToMessage(undefined)}
          replyTarget={replyTarget}
          replyToMessageId={replyingToMessage?.id}
          onArrowUp={handleArrowUpEdit}
          onResize={onComposeResize}
        />
      </>
    );
  }
);

export { TextChannel };
