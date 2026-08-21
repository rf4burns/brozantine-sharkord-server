import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { logVoice } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TRemoteUserStreamKinds } from '@/types';
import { StreamKind } from '@kurier/shared';
import type { RtpCapabilities } from 'mediasoup-client/types';
import { useEffect, type MutableRefObject } from 'react';

const PRODUCER_REFRESH_DELAY_MS = 750;

type TEvents = {
  consume: (
    remoteId: number,
    kind: StreamKind,
    rtpCapabilities: RtpCapabilities
  ) => Promise<void>;
  consumeExistingProducers: (
    rtpCapabilities: RtpCapabilities
  ) => Promise<void>;
  removeRemoteUserStream: (
    userId: number,
    kind: TRemoteUserStreamKinds
  ) => void;
  removeExternalStreamTrack: (
    streamId: number,
    kind: StreamKind.EXTERNAL_AUDIO | StreamKind.EXTERNAL_VIDEO
  ) => void;
  removeExternalStream: (streamId: number) => void;
  clearRemoteUserStreamsForUser: (userId: number) => void;
  isConnected: boolean;
  rtpCapabilitiesRef: MutableRefObject<RtpCapabilities | null>;
};

const useVoiceEvents = ({
  consume,
  consumeExistingProducers,
  removeRemoteUserStream,
  removeExternalStreamTrack,
  removeExternalStream,
  clearRemoteUserStreamsForUser,
  isConnected,
  rtpCapabilitiesRef
}: TEvents) => {
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const ownUserId = useOwnUserId();

  useEffect(() => {
    if (!currentVoiceChannelId) {
      logVoice('Voice events not initialized - missing channelId');
      return;
    }

    if (!isConnected) {
      logVoice('Voice events not initialized - not connected');
      return;
    }

    const rtpCapabilities = rtpCapabilitiesRef.current;

    if (!rtpCapabilities) {
      logVoice('Voice events not initialized - missing RTP capabilities');
      return;
    }

    const trpc = getTRPCClient();

    let isCleaningUp = false;
    const refreshTimers = new Set<ReturnType<typeof setTimeout>>();

    const refreshProducers = (reason: string) => {
      if (isCleaningUp) return;

      logVoice('Refreshing voice producers', { reason, currentVoiceChannelId });

      void consumeExistingProducers(rtpCapabilities);
    };

    // cover the gap between consumeExistingProducers in init and this
    // subscription becoming active — anyone who produced in between is missed
    // by VOICE_NEW_PRODUCER alone
    refreshProducers('subscription_start');

    const onVoiceNewProducerSub = trpc.voice.onNewProducer.subscribe(
      undefined,
      {
        onData: ({ remoteId, kind, channelId }) => {
          if (currentVoiceChannelId !== channelId || isCleaningUp) return;

          if (remoteId === ownUserId) {
            logVoice('Ignoring own producer event', {
              remoteId,
              ownUserId,
              kind,
              channelId
            });

            return;
          }

          logVoice('New producer event received', {
            remoteId,
            kind,
            channelId
          });

          void consume(remoteId, kind, rtpCapabilities).catch((error) => {
            logVoice('Error consuming new producer', {
              error,
              remoteId,
              kind,
              channelId
            });
          });
        },
        onError: (error) => {
          logVoice('onVoiceNewProducer subscription error', { error });
        }
      }
    );

    const onVoiceProducerClosedSub = trpc.voice.onProducerClosed.subscribe(
      undefined,
      {
        onData: ({ channelId, remoteId, kind }) => {
          if (currentVoiceChannelId !== channelId || isCleaningUp) return;

          logVoice('Producer closed event received', {
            remoteId,
            kind,
            channelId
          });

          try {
            if (
              kind === StreamKind.EXTERNAL_VIDEO ||
              kind === StreamKind.EXTERNAL_AUDIO
            ) {
              removeExternalStreamTrack(remoteId, kind);
            } else {
              removeRemoteUserStream(remoteId, kind);
            }
          } catch (error) {
            logVoice('Error removing remote stream for closed producer', {
              error,
              remoteId,
              kind,
              channelId
            });
          }
        },
        onError: (error) => {
          logVoice('onVoiceProducerClosed subscription error', { error });
        }
      }
    );

    const onVoiceUserLeaveSub = trpc.voice.onLeave.subscribe(undefined, {
      onData: ({ channelId, userId }) => {
        if (currentVoiceChannelId !== channelId || isCleaningUp) return;

        logVoice('User leave event received', { userId, channelId });

        try {
          clearRemoteUserStreamsForUser(userId);
        } catch (error) {
          logVoice('Error clearing remote streams for user', { error });
        }
      },
      onError: (error) => {
        logVoice('onVoiceUserLeave subscription error', { error });
      }
    });

    // new members produce after join; if we miss VOICE_NEW_PRODUCER, a delayed
    // getProducers refresh still picks up their audio
    const onVoiceUserJoinSub = trpc.voice.onJoin.subscribe(undefined, {
      onData: ({ channelId, userId }) => {
        if (
          currentVoiceChannelId !== channelId ||
          userId === ownUserId ||
          isCleaningUp
        ) {
          return;
        }

        logVoice('User join event received, scheduling producer refresh', {
          userId,
          channelId
        });

        const timer = setTimeout(() => {
          refreshTimers.delete(timer);
          refreshProducers('remote_user_joined');
        }, PRODUCER_REFRESH_DELAY_MS);

        refreshTimers.add(timer);
      },
      onError: (error) => {
        logVoice('onVoiceUserJoin subscription error', { error });
      }
    });

    const onVoiceRemoveExternalStreamSub =
      trpc.voice.onRemoveExternalStream.subscribe(undefined, {
        onData: ({ channelId, streamId }) => {
          if (currentVoiceChannelId !== channelId || isCleaningUp) return;

          logVoice('External stream removed event received', {
            streamId,
            channelId
          });

          try {
            removeExternalStream(streamId);
          } catch (error) {
            logVoice('Error removing external stream', {
              error,
              streamId,
              channelId
            });
          }
        },
        onError: (error) => {
          logVoice('onVoiceRemoveExternalStream subscription error', { error });
        }
      });

    return () => {
      logVoice('Cleaning up voice events');

      isCleaningUp = true;

      for (const timer of refreshTimers) {
        clearTimeout(timer);
      }

      refreshTimers.clear();

      onVoiceNewProducerSub.unsubscribe();
      onVoiceProducerClosedSub.unsubscribe();
      onVoiceUserLeaveSub.unsubscribe();
      onVoiceUserJoinSub.unsubscribe();
      onVoiceRemoveExternalStreamSub.unsubscribe();
    };
  }, [
    currentVoiceChannelId,
    ownUserId,
    isConnected,
    rtpCapabilitiesRef,
    consume,
    consumeExistingProducers,
    removeRemoteUserStream,
    removeExternalStreamTrack,
    removeExternalStream,
    clearRemoteUserStreamsForUser
  ]);
};

export { useVoiceEvents };
