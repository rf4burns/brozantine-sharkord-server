import { ElapsedTime } from '@/components/elapsed-time';
import { UserAvatar } from '@/components/user-avatar';
import { useStreamVolumeControl } from '@/components/voice-provider/hooks/use-stream-volume-control';
import { VoiceStateIndicators } from '@/components/voice-state-icons/indicators';
import { useCan } from '@/features/server/hooks';
import type { TVoiceUser } from '@/features/server/types';
import { useIsOwnUser } from '@/features/server/users/hooks';
import {
  useOwnVoiceState,
  useSpeakingState
} from '@/features/server/voice/hooks';
import { Permission } from '@kurier/shared';
import { cn } from '@kurier/ui';
import { Monitor, Video, VolumeX } from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { UserPopover } from '../user-popover';
import { beginVoiceUserDrag, endVoiceUserDrag } from './helpers';
import { StreamContextMenu } from './stream-context-menu';

type TVoiceUserProps = {
  userId: number;
  user: TVoiceUser;
  isOwnChannel?: boolean;
};

const VoiceUser = memo(({ user, isOwnChannel = false }: TVoiceUserProps) => {
  const isOwnUser = useIsOwnUser(user.id);
  const ownVoiceState = useOwnVoiceState();
  const { isMuted } = useStreamVolumeControl({ type: 'user', userId: user.id });
  const { isActivelySpeaking, speakingEffectClass } = useSpeakingState(user.id);
  const can = useCan();
  const shouldShowMuteIndicator = isOwnChannel && !isOwnUser && isMuted;
  const canMove = !isOwnUser && can(Permission.MOVE_MEMBERS);
  const didDragRef = useRef(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const voiceState = useMemo(
    () => (isOwnUser ? ownVoiceState : user.state),
    [isOwnUser, ownVoiceState, user.state]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
    },
    []
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      didDragRef.current = true;
      setPopoverOpen(false);
      e.stopPropagation();
      beginVoiceUserDrag(user.id, e.dataTransfer);
    },
    [user.id]
  );

  const handleDragEnd = useCallback(() => {
    endVoiceUserDrag();
    // click can fire after dragend; clear on the next tick if it did not
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  }, []);

  const handleRowClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!didDragRef.current) return;

    e.preventDefault();
    e.stopPropagation();
    didDragRef.current = false;
  }, []);

  const handleNameClick = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      e.stopPropagation();

      if (didDragRef.current) {
        e.preventDefault();
        didDragRef.current = false;
        return;
      }

      setPopoverOpen(true);
    },
    []
  );

  const userRow = (
    <div
      draggable={canMove}
      onPointerDown={canMove ? handlePointerDown : undefined}
      onDragStart={canMove ? handleDragStart : undefined}
      onDragEnd={canMove ? handleDragEnd : undefined}
      onClick={canMove ? handleRowClick : undefined}
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/30 text-sm select-none [&_img]:[-webkit-user-drag:none]',
        canMove && 'cursor-grab active:cursor-grabbing'
      )}
    >
      <UserAvatar
        userId={user.id}
        className={cn('h-5 w-5', isActivelySpeaking && speakingEffectClass)}
        showUserPopover={false}
        showStatusBadge={false}
      />

      <UserPopover
        userId={user.id}
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
      >
        <span
          className="flex-1 min-w-0 text-muted-foreground truncate text-xs cursor-pointer"
          onClick={handleNameClick}
        >
          {user.name}
        </span>
      </UserPopover>

      <ElapsedTime
        startedAt={user.joinedAt}
        className="text-[10px] text-muted-foreground shrink-0"
      />

      <div className="flex items-center gap-1 opacity-60">
        {shouldShowMuteIndicator && (
          <VolumeX className="h-3 w-3 text-red-500" />
        )}

        <VoiceStateIndicators state={voiceState} hideWhenClear />

        {voiceState.webcamEnabled && (
          <Video className="h-3 w-3 text-blue-500" />
        )}

        {voiceState.sharingScreen && (
          <Monitor className="h-3 w-3 text-purple-500" />
        )}
      </div>
    </div>
  );

  if (isOwnUser) {
    return userRow;
  }

  return (
    <StreamContextMenu type="user" userId={user.id} name={user.name}>
      {userRow}
    </StreamContextMenu>
  );
});

export { VoiceUser };
