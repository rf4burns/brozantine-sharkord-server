import {
  ServerHeadphonesOffIcon,
  ServerMicOffIcon
} from '@/components/voice-state-icons';
import type { TVoiceUserState } from '@kurier/shared';
import { cn } from '@kurier/ui';
import { HeadphoneOff, Headphones, Mic, MicOff } from 'lucide-react';
import { memo } from 'react';

type TVoiceStateIndicatorsProps = {
  state: TVoiceUserState;
  className?: string;
  iconClassName?: string;
  hideWhenClear?: boolean;
};

const VoiceStateIndicators = memo(
  ({
    state,
    className,
    iconClassName = 'h-3 w-3',
    hideWhenClear = false
  }: TVoiceStateIndicatorsProps) => {
    const showMic = !hideWhenClear || state.micMuted || state.serverMuted;
    const showSound =
      !hideWhenClear || state.soundMuted || state.serverDeafened;

    return (
      <div className={cn('flex items-center gap-1', className)}>
        {showMic && (
          <div>
            {state.serverMuted || state.serverDeafened ? (
              <ServerMicOffIcon
                className={cn(iconClassName, 'text-orange-500')}
              />
            ) : state.micMuted ? (
              <MicOff className={cn(iconClassName, 'text-red-500')} />
            ) : (
              <Mic className={cn(iconClassName, 'text-green-500')} />
            )}
          </div>
        )}

        {showSound && (
          <div>
            {state.serverDeafened ? (
              <ServerHeadphonesOffIcon
                className={cn(iconClassName, 'text-orange-500')}
              />
            ) : state.soundMuted ? (
              <HeadphoneOff className={cn(iconClassName, 'text-red-500')} />
            ) : (
              <Headphones className={cn(iconClassName, 'text-green-500')} />
            )}
          </div>
        )}
      </div>
    );
  }
);

export { VoiceStateIndicators };
