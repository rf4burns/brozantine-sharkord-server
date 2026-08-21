import { ElapsedTime } from '@/components/elapsed-time';
import { TypingDots } from '@/components/typing-dots';
import {
  useChannelById,
  useChannelNotificationLevel,
  useChannelsByCategoryId,
  useCurrentVoiceChannelId,
  useSelectedChannelId
} from '@/features/server/channels/hooks';
import {
  useCan,
  useChannelCan,
  useHasSharingScreenUsers,
  useHasUnreadMentions,
  useTypingUsersByChannelId,
  useUnreadMessagesCount,
  useVoiceUsersByChannelId
} from '@/features/server/hooks';
import {
  useVoiceChannelExternalStreamsList,
  useVoiceChannelOccupiedSince
} from '@/features/server/voice/hooks';
import { useSelectChannel } from '@/hooks/use-select-channel';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChannelPermission,
  Permission,
  type TChannel,
  TestId,
  getTrpcError
} from '@kurier/shared';
import { BellOff, Hash, Volume2 } from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChannelContextMenu } from '../context-menus/channel';
import { UnreadCount } from '../unread-count';
import { ExternalStream } from './external-stream';
import { VOICE_USER_DND_MIME } from './helpers';
import { VoiceUser } from './voice-user';
import { Waveform } from './waveform';

type TVoiceProps = Omit<TItemWrapperProps, 'children'> & {
  channel: TChannel;
};

const Voice = memo(
  ({
    channel,
    isSelected,
    ...props
  }: TVoiceProps & { isSelected: boolean }) => {
    const { t } = useTranslation('sidebar');
    const users = useVoiceUsersByChannelId(channel.id);
    const occupiedSince = useVoiceChannelOccupiedSince(channel.id);
    const externalStreams = useVoiceChannelExternalStreamsList(channel.id);
    const unreadCount = useUnreadMessagesCount(channel.id);
    const hasUnreadMentions = useHasUnreadMentions(channel.id);
    const currentVoiceChannelId = useCurrentVoiceChannelId();
    const someoneIsSharingScreen = useHasSharingScreenUsers(channel.id);
    const notificationLevel = useChannelNotificationLevel(channel.id);
    const isMuted = notificationLevel === 'nothing';

    const dropZoneRef = useRef<HTMLDivElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const isVoiceActive = users.length > 0 || externalStreams.length > 0;
    const isOwnChannel = currentVoiceChannelId === channel.id;

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      if (!e.dataTransfer.types.includes(VOICE_USER_DND_MIME)) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        const next = e.relatedTarget;

        if (next instanceof Node && dropZoneRef.current?.contains(next)) {
          return;
        }

        setIsDragOver(false);
      },
      []
    );

    const handleDrop = useCallback(
      async (e: React.DragEvent<HTMLDivElement>) => {
        setIsDragOver(false);

        const raw = e.dataTransfer.getData(VOICE_USER_DND_MIME);

        if (!raw) return;

        e.preventDefault();

        const userId = Number(raw);

        if (!userId || users.some((user) => user.id === userId)) return;

        try {
          const trpc = getTRPCClient();

          await trpc.voice.moveUser.mutate({ userId, channelId: channel.id });
        } catch (error) {
          toast.error(getTrpcError(error, t('failedMoveUser')));
        }
      },
      [channel.id, users, t]
    );

    return (
      <div
        ref={dropZoneRef}
        onDragOverCapture={handleDragOver}
        onDragLeave={handleDragLeave}
        onDropCapture={handleDrop}
        className={cn('rounded-[4px]', {
          'ring-1 ring-primary bg-accent/40': isDragOver
        })}
      >
        <ItemWrapper
          {...props}
          isSelected={isSelected}
          isUnread={unreadCount > 0}
          isMuted={isMuted}
          className={cn(props.className, {
            'text-blue-500':
              someoneIsSharingScreen && (isOwnChannel || isSelected),
            'text-green-500':
              (isOwnChannel && !someoneIsSharingScreen) ||
              (isSelected &&
                !someoneIsSharingScreen &&
                !isOwnChannel &&
                isVoiceActive)
          })}
        >
          {isVoiceActive ? (
            <Waveform isScreenSharing={someoneIsSharingScreen} />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{channel.name}</span>
            {channel.topic ? (
              <span className="truncate text-[11px] leading-tight text-muted-foreground">
                {channel.topic}
              </span>
            ) : null}
          </span>

          {occupiedSince !== null && (
            <ElapsedTime
              startedAt={occupiedSince}
              className="text-[10px] text-green-500 shrink-0"
            />
          )}

          {unreadCount > 0 && (
            <UnreadCount count={unreadCount} hasMention={hasUnreadMentions} />
          )}
          {isMuted && unreadCount === 0 && (
            <BellOff className="h-3.5 w-3.5 shrink-0 opacity-70" />
          )}
        </ItemWrapper>
        {channel.type === 'VOICE' && (
          <div
            className="ml-6 space-y-1 mt-1"
            onContextMenu={(e) => e.stopPropagation()}
          >
            {users.map((user) => (
              <VoiceUser
                key={user.id}
                userId={user.id}
                user={user}
                isOwnChannel={isOwnChannel}
              />
            ))}
            {externalStreams.map((stream) => (
              <ExternalStream
                key={stream.streamId}
                streamId={stream.streamId}
                title={stream.title}
                tracks={stream.tracks}
                pluginId={stream.pluginId}
                streamKey={stream.key}
                avatarUrl={stream.avatarUrl}
                isOwnChannel={isOwnChannel}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

type TTextProps = Omit<TItemWrapperProps, 'children'> & {
  channel: TChannel;
};

const Text = memo(({ channel, ...props }: TTextProps) => {
  const typingUsers = useTypingUsersByChannelId(channel.id);
  const unreadCount = useUnreadMessagesCount(channel.id);
  const hasUnreadMessages = useHasUnreadMentions(channel.id);
  const hasTypingUsers = typingUsers.length > 0;
  const notificationLevel = useChannelNotificationLevel(channel.id);
  const isMuted = notificationLevel === 'nothing';

  return (
    <ItemWrapper {...props} isUnread={unreadCount > 0} isMuted={isMuted}>
      <Hash className="h-4 w-4" />
      <span className="flex-1">{channel.name}</span>
      {hasTypingUsers && (
        <div className="flex items-center gap-0.5 ml-auto">
          <TypingDots className="space-x-0.5" />
        </div>
      )}
      {!hasTypingUsers && unreadCount > 0 && (
        <UnreadCount count={unreadCount} hasMention={hasUnreadMessages} />
      )}
      {isMuted && !hasTypingUsers && unreadCount === 0 && (
        <BellOff className="h-3.5 w-3.5 shrink-0 opacity-70" />
      )}
    </ItemWrapper>
  );
});

type TItemWrapperProps = {
  children: React.ReactNode;
  className?: string;
  isSelected: boolean;
  isUnread?: boolean;
  isMuted?: boolean;
  onClick: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  style?: React.CSSProperties;
  disabled?: boolean;
};

const ItemWrapper = memo(
  ({
    children,
    isSelected,
    isUnread = false,
    isMuted = false,
    onClick,
    className,
    dragHandleProps,
    style,
    disabled = false
  }: TItemWrapperProps) => {
    return (
      <div
        {...dragHandleProps}
        data-testid={TestId.CHANNEL_ITEM}
        style={style}
        className={cn(
          'flex w-full cursor-pointer select-none items-center gap-2 rounded-[4px] px-2 py-1 text-[15px] text-muted-foreground hover:bg-card hover:text-foreground',
          {
            'bg-card text-foreground': isSelected,
            'font-semibold text-foreground dark:text-white':
              isUnread && !isSelected,
            'opacity-80': isMuted && !isSelected && !isUnread,
            'cursor-default opacity-50 hover:bg-transparent hover:text-muted-foreground':
              disabled
          },
          className
        )}
        onClick={disabled ? undefined : onClick}
      >
        {children}
      </div>
    );
  }
);

type TChannelProps = {
  channelId: number;
  isSelected: boolean;
  onClick: () => void;
};

const Channel = memo(({ channelId, isSelected, onClick }: TChannelProps) => {
  const channel = useChannelById(channelId);
  const channelCan = useChannelCan(channelId);
  const can = useCan();
  const currentVoiceChannelId = useCurrentVoiceChannelId();

  const isConnectedVoiceChannel = currentVoiceChannelId === channelId;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: channelId });

  if (!channel) {
    return null;
  }

  if (
    !isConnectedVoiceChannel &&
    !channelCan(ChannelPermission.VIEW_CHANNEL) &&
    !can(Permission.MANAGE_CHANNELS)
  ) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform && { ...transform, x: 0 }),
        transition,
        opacity: isDragging ? 0.5 : 1
      }}
    >
      <ChannelContextMenu channelId={channelId}>
        <div>
          {channel.type === 'TEXT' && (
            <Text
              channel={channel}
              isSelected={isSelected}
              onClick={onClick}
              dragHandleProps={{ ...attributes, ...listeners }}
            />
          )}
          {channel.type === 'VOICE' && (
            <Voice
              channel={channel}
              isSelected={isSelected}
              onClick={onClick}
              dragHandleProps={{ ...attributes, ...listeners }}
              disabled={
                !isConnectedVoiceChannel &&
                (!channelCan(ChannelPermission.JOIN) ||
                  !can(Permission.JOIN_VOICE_CHANNELS))
              }
            />
          )}
        </div>
      </ChannelContextMenu>
    </div>
  );
});

type TChannelsProps = {
  categoryId: number;
};

const Channels = memo(({ categoryId }: TChannelsProps) => {
  const { t } = useTranslation('sidebar');
  const channels = useChannelsByCategoryId(categoryId);
  const selectedChannelId = useSelectedChannelId();
  const can = useCan();
  const channelIds = useMemo(
    () => channels.map((channel) => channel.id),
    [channels]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  const onChannelClick = useSelectChannel();

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = channelIds.indexOf(active.id as number);
      const newIndex = channelIds.indexOf(over.id as number);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reorderedIds = [...channelIds];
      const [movedId] = reorderedIds.splice(oldIndex, 1);

      reorderedIds.splice(newIndex, 0, movedId);

      try {
        const trpc = getTRPCClient();

        await trpc.channels.reorder.mutate({
          categoryId,
          channelIds: reorderedIds
        });
      } catch (error) {
        toast.error(getTrpcError(error, t('failedReorderChannels')));
      }
    },
    [categoryId, channelIds, t]
  );

  return (
    <div className="space-y-0.5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={channelIds}
          strategy={verticalListSortingStrategy}
          disabled={!can(Permission.MANAGE_CHANNELS)}
        >
          {channels.map((channel) => (
            <Channel
              key={channel.id}
              channelId={channel.id}
              isSelected={selectedChannelId === channel.id}
              onClick={() => onChannelClick(channel.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
});

export { Channels };
