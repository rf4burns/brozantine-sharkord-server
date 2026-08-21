import { logVoice } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TRemoteUserStreamKinds } from '@/types';
import {
  type ConsumerType,
  getMediasoupKind,
  StreamKind,
  type TStreamQualityLayer
} from '@kurier/shared';
import { TRPCClientError } from '@trpc/client';
import {
  type AppData,
  type Consumer,
  type Device,
  type RtpCapabilities,
  type Transport
} from 'mediasoup-client/types';
import { useCallback, useRef } from 'react';
import { getStoredStreamQuality } from '../helpers';

type TIceDirection = 'send' | 'recv';

type TUseTransportParams = {
  addRemoteUserStream: (
    userId: number,
    stream: MediaStream,
    kind: TRemoteUserStreamKinds
  ) => void;
  removeRemoteUserStream: (
    userId: number,
    kind: TRemoteUserStreamKinds
  ) => void;
  addExternalStreamTrack: (
    streamId: number,
    stream: MediaStream,
    kind: StreamKind.EXTERNAL_AUDIO | StreamKind.EXTERNAL_VIDEO
  ) => void;
  removeExternalStreamTrack: (
    streamId: number,
    kind: StreamKind.EXTERNAL_AUDIO | StreamKind.EXTERNAL_VIDEO
  ) => void;
  setRemoteConsumerType: (
    remoteId: number,
    kind: StreamKind,
    consumerType: ConsumerType | undefined
  ) => void;
  setRemoteStreamQualityLayers: (
    remoteId: number,
    kind: StreamKind,
    layers: TStreamQualityLayer[]
  ) => void;
  clearRemoteConsumerMetadata: () => void;
  onSilentRejoinNeeded: () => void;
};

const MAX_ICE_RESTARTS = 2;
const ICE_RESTART_WAIT_MS = 4000;
const DISCONNECT_GRACE_MS = 1500;
const ICE_POLL_INTERVAL_MS = 200;

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForTransportConnected = async (
  transport: Transport<AppData>,
  timeoutMs: number
) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (transport.closed) return false;
    if (transport.connectionState === 'connected') return true;

    await wait(ICE_POLL_INTERVAL_MS);
  }

  return !transport.closed && transport.connectionState === 'connected';
};

const useTransports = ({
  addRemoteUserStream,
  removeRemoteUserStream,
  addExternalStreamTrack,
  removeExternalStreamTrack,
  setRemoteConsumerType,
  setRemoteStreamQualityLayers,
  clearRemoteConsumerMetadata,
  onSilentRejoinNeeded
}: TUseTransportParams) => {
  const producerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumers = useRef<{
    [userId: number]: {
      [kind: string]: Consumer<AppData>;
    };
  }>({});
  const consumerCodecs = useRef<Map<string, string>>(new Map());
  const consumeOperationsInProgress = useRef<Set<string>>(new Set());
  const cleaningUpRef = useRef(false);
  const silentRejoinRequestedRef = useRef(false);
  const onSilentRejoinNeededRef = useRef(onSilentRejoinNeeded);
  const iceRestartAttemptsRef = useRef<Record<TIceDirection, number>>({
    send: 0,
    recv: 0
  });
  const iceRestartInFlightRef = useRef<Record<TIceDirection, boolean>>({
    send: false,
    recv: false
  });
  const iceRestartTimersRef = useRef<
    Record<TIceDirection, ReturnType<typeof setTimeout> | undefined>
  >({
    send: undefined,
    recv: undefined
  });

  onSilentRejoinNeededRef.current = onSilentRejoinNeeded;

  const clearIceRestartTimer = useCallback((direction: TIceDirection) => {
    const timer = iceRestartTimersRef.current[direction];

    if (timer) {
      clearTimeout(timer);
      iceRestartTimersRef.current[direction] = undefined;
    }
  }, []);

  const requestSilentRejoin = useCallback(() => {
    if (cleaningUpRef.current || silentRejoinRequestedRef.current) return;

    silentRejoinRequestedRef.current = true;
    logVoice('Requesting silent voice rejoin');
    onSilentRejoinNeededRef.current();
  }, []);

  const restartIce = useCallback(
    async (direction: TIceDirection) => {
      if (cleaningUpRef.current || silentRejoinRequestedRef.current) return;

      const transport =
        direction === 'send'
          ? producerTransport.current
          : consumerTransport.current;

      if (!transport || transport.closed) {
        requestSilentRejoin();
        return;
      }

      if (transport.connectionState === 'connected') {
        iceRestartAttemptsRef.current[direction] = 0;
        return;
      }

      if (iceRestartInFlightRef.current[direction]) return;

      if (iceRestartAttemptsRef.current[direction] >= MAX_ICE_RESTARTS) {
        logVoice('ICE restart attempts exhausted', { direction });
        requestSilentRejoin();
        return;
      }

      iceRestartInFlightRef.current[direction] = true;
      iceRestartAttemptsRef.current[direction] += 1;

      logVoice('Restarting ICE', {
        direction,
        attempt: iceRestartAttemptsRef.current[direction]
      });

      try {
        const trpc = getTRPCClient();
        const iceParameters = await trpc.voice.restartIce.mutate({
          direction
        });

        if (transport.closed || cleaningUpRef.current) return;

        await transport.restartIce({ iceParameters });

        const connected = await waitForTransportConnected(
          transport,
          ICE_RESTART_WAIT_MS
        );

        if (connected) {
          iceRestartAttemptsRef.current[direction] = 0;
          logVoice('ICE restart succeeded', { direction });
          return;
        }

        logVoice('ICE restart did not restore connection', { direction });
        requestSilentRejoin();
      } catch (error) {
        logVoice('ICE restart failed', { direction, error });
        requestSilentRejoin();
      } finally {
        iceRestartInFlightRef.current[direction] = false;
      }
    },
    [requestSilentRejoin]
  );

  const handleTransportConnectionState = useCallback(
    (direction: TIceDirection, state: string) => {
      if (cleaningUpRef.current) return;

      const transport =
        direction === 'send'
          ? producerTransport.current
          : consumerTransport.current;

      logVoice(
        `${direction === 'send' ? 'Producer' : 'Consumer'} transport connection state changed`,
        { state }
      );

      if (state === 'connected') {
        clearIceRestartTimer(direction);
        iceRestartAttemptsRef.current[direction] = 0;
        return;
      }

      if (state === 'closed') {
        clearIceRestartTimer(direction);

        if (direction === 'send') {
          producerTransport.current = undefined;
        } else {
          consumerTransport.current = undefined;
        }

        requestSilentRejoin();
        return;
      }

      if (state === 'failed') {
        clearIceRestartTimer(direction);
        void restartIce(direction);
        return;
      }

      if (state === 'disconnected' && transport && !transport.closed) {
        clearIceRestartTimer(direction);

        iceRestartTimersRef.current[direction] = setTimeout(() => {
          iceRestartTimersRef.current[direction] = undefined;

          const current =
            direction === 'send'
              ? producerTransport.current
              : consumerTransport.current;

          if (
            !current ||
            current.closed ||
            current.connectionState === 'connected'
          ) {
            return;
          }

          void restartIce(direction);
        }, DISCONNECT_GRACE_MS);
      }
    },
    [clearIceRestartTimer, requestSilentRejoin, restartIce]
  );

  const createProducerTransport = useCallback(
    async (device: Device) => {
      logVoice('Creating producer transport', { device });

      const trpc = getTRPCClient();

      try {
        const params = await trpc.voice.createProducerTransport.mutate();

        logVoice('Got producer transport parameters', { params });

        producerTransport.current = device.createSendTransport(params);
        cleaningUpRef.current = false;
        silentRejoinRequestedRef.current = false;

        producerTransport.current.on(
          'connect',
          async ({ dtlsParameters }, callback, errback) => {
            logVoice('Producer transport connected', { dtlsParameters });

            try {
              await trpc.voice.connectProducerTransport.mutate({
                dtlsParameters
              });

              callback();
            } catch (error) {
              errback(error as Error);
              logVoice('Error connecting producer transport', { error });
            }
          }
        );

        producerTransport.current.on('connectionstatechange', (state) => {
          handleTransportConnectionState('send', state);
        });

        producerTransport.current.on('icecandidateerror', (error) => {
          logVoice('Producer transport ICE candidate error', { error });
        });

        producerTransport.current.on(
          'produce',
          async ({ rtpParameters, appData }, callback, errback) => {
            logVoice('Producing new track', { rtpParameters, appData });

            const { kind, qualityLayers } = appData as {
              kind: StreamKind;
              qualityLayers?: TStreamQualityLayer[];
            };

            if (!producerTransport.current) return;

            try {
              const producerId = await trpc.voice.produce.mutate({
                transportId: producerTransport.current.id,
                kind,
                rtpParameters,
                qualityLayers
              });

              callback({ id: producerId });
            } catch (error) {
              if (error instanceof TRPCClientError) {
                if (error.data.code === 'FORBIDDEN') {
                  logVoice('Permission denied to produce track', { kind });
                  errback(
                    new Error(
                      `You don't have permission to ${kind} in this channel`
                    )
                  );

                  return;
                }
              }

              logVoice('Error producing new track', { error });
              errback(error as Error);
            }
          }
        );
      } catch (error) {
        logVoice('Error creating producer transport', { error });
      }
    },
    [handleTransportConnectionState]
  );

  const createConsumerTransport = useCallback(
    async (device: Device) => {
      logVoice('Creating consumer transport', { device });

      const trpc = getTRPCClient();

      try {
        const params = await trpc.voice.createConsumerTransport.mutate();

        logVoice('Got consumer transport parameters', { params });

        consumerTransport.current = device.createRecvTransport(params);
        cleaningUpRef.current = false;
        silentRejoinRequestedRef.current = false;

        consumerTransport.current.on(
          'connect',
          async ({ dtlsParameters }, callback, errback) => {
            logVoice('Consumer transport connected', { dtlsParameters });

            try {
              await trpc.voice.connectConsumerTransport.mutate({
                dtlsParameters
              });

              callback();
            } catch (error) {
              errback(error as Error);
              logVoice('Consumer transport connect error', { error });
            }
          }
        );

        consumerTransport.current.on('connectionstatechange', (state) => {
          handleTransportConnectionState('recv', state);
        });

        consumerTransport.current.on('icecandidateerror', (error) => {
          logVoice('Consumer transport ICE candidate error', { error });
        });
      } catch (error) {
        logVoice('Failed to create consumer transport', { error });
      }
    },
    [handleTransportConnectionState]
  );

  const consume = useCallback(
    async (
      remoteId: number,
      kind: StreamKind,
      rtpCapabilities: RtpCapabilities
    ) => {
      if (!consumerTransport.current) {
        logVoice('Consumer transport not available');
        return;
      }

      const operationKey = `${remoteId}-${kind}`;

      if (consumeOperationsInProgress.current.has(operationKey)) {
        logVoice('Consume operation already in progress', {
          remoteId,
          kind
        });
        return;
      }

      consumeOperationsInProgress.current.add(operationKey);

      try {
        logVoice('Consuming remote producer', { remoteId, kind });

        const trpc = getTRPCClient();

        const {
          producerId,
          consumerId,
          consumerKind,
          consumerRtpParameters,
          consumerType,
          qualityLayers
        } = await trpc.voice.consume.mutate({
          kind,
          remoteId,
          rtpCapabilities
        });

        logVoice('Got consumer parameters', {
          producerId,
          consumerId,
          consumerKind,
          consumerType,
          qualityLayers,
          consumerRtpParameters
        });

        if (!consumers.current[remoteId]) {
          consumers.current[remoteId] = {};
        }

        const existingConsumer = consumers.current[remoteId][consumerKind];

        if (existingConsumer && !existingConsumer.closed) {
          logVoice('Closing existing consumer before creating new one');

          existingConsumer.close();
          delete consumers.current[remoteId][consumerKind];
        }

        const newConsumer = await consumerTransport.current.consume({
          id: consumerId,
          producerId: producerId,
          kind: getMediasoupKind(consumerKind),
          rtpParameters: consumerRtpParameters
        });

        logVoice('Created new consumer', { newConsumer });

        const cleanupEvents = [
          'transportclose',
          'trackended',
          '@close',
          'close'
        ];

        cleanupEvents.forEach((event) => {
          // @ts-expect-error - YOLO
          newConsumer?.on(event, () => {
            logVoice(`Consumer cleanup event "${event}" triggered`, {
              remoteId,
              kind
            });

            if (
              kind === StreamKind.EXTERNAL_VIDEO ||
              kind === StreamKind.EXTERNAL_AUDIO
            ) {
              removeExternalStreamTrack(remoteId, kind);
            } else {
              removeRemoteUserStream(remoteId, kind);
            }

            if (consumers.current[remoteId]?.[consumerKind]) {
              delete consumers.current[remoteId][consumerKind];
            }

            consumerCodecs.current.delete(`${remoteId}-${kind}`);

            setRemoteConsumerType(remoteId, kind, undefined);
            setRemoteStreamQualityLayers(remoteId, kind, []);
          });
        });

        consumers.current[remoteId][consumerKind] = newConsumer;

        setRemoteConsumerType(remoteId, kind, consumerType);
        setRemoteStreamQualityLayers(remoteId, kind, qualityLayers);

        const codecKey = `${remoteId}-${kind}`;

        const negotiatedCodec =
          newConsumer.rtpParameters?.codecs?.[0]?.mimeType;

        if (negotiatedCodec) {
          consumerCodecs.current.set(codecKey, negotiatedCodec);
        }

        if (
          consumerType === 'simulcast' &&
          (kind === StreamKind.VIDEO ||
            kind === StreamKind.SCREEN ||
            kind === StreamKind.EXTERNAL_VIDEO)
        ) {
          const quality = getStoredStreamQuality(remoteId, kind, qualityLayers);

          if (quality.mode === 'layer') {
            await trpc.voice.setConsumerQuality.mutate({
              remoteId,
              kind,
              quality
            });
          }
        }

        const stream = new MediaStream();

        stream.addTrack(newConsumer.track);

        if (
          kind === StreamKind.EXTERNAL_VIDEO ||
          kind === StreamKind.EXTERNAL_AUDIO
        ) {
          addExternalStreamTrack(remoteId, stream, kind);
        } else {
          addRemoteUserStream(remoteId, stream, kind);
        }
      } catch (error) {
        logVoice('Error consuming remote producer', { error });
      } finally {
        consumeOperationsInProgress.current.delete(operationKey);
      }
    },
    [
      addRemoteUserStream,
      removeRemoteUserStream,
      addExternalStreamTrack,
      removeExternalStreamTrack,
      setRemoteConsumerType,
      setRemoteStreamQualityLayers
    ]
  );

  const consumeExistingProducers = useCallback(
    async (
      rtpCapabilities: RtpCapabilities,
      externalStreamTracks?: {
        [streamId: number]: { audio?: boolean; video?: boolean };
      }
    ) => {
      logVoice('Consuming existing producers', { rtpCapabilities });

      const trpc = getTRPCClient();

      try {
        const {
          remoteAudioIds,
          remoteScreenIds,
          remoteScreenAudioIds,
          remoteVideoIds,
          remoteExternalStreamIds
        } = await trpc.voice.getProducers.query();

        logVoice('Got existing producers', {
          remoteAudioIds,
          remoteScreenIds,
          remoteVideoIds,
          remoteExternalStreamIds
        });

        remoteAudioIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.AUDIO, rtpCapabilities);
        });

        remoteVideoIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.VIDEO, rtpCapabilities);
        });

        remoteScreenIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.SCREEN, rtpCapabilities);
        });

        remoteScreenAudioIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.SCREEN_AUDIO, rtpCapabilities);
        });

        remoteExternalStreamIds.forEach((streamId: number) => {
          const tracks = externalStreamTracks?.[streamId];

          if (tracks?.audio !== false) {
            consume(streamId, StreamKind.EXTERNAL_AUDIO, rtpCapabilities);
          }
          if (tracks?.video !== false) {
            consume(streamId, StreamKind.EXTERNAL_VIDEO, rtpCapabilities);
          }
        });
      } catch (error) {
        logVoice('Error consuming existing producers', { error });
      }
    },
    [consume]
  );

  const getConsumerCodec = useCallback(
    (remoteId: number, kind: StreamKind): string | undefined => {
      return consumerCodecs.current.get(`${remoteId}-${kind}`);
    },
    []
  );

  const cleanupTransports = useCallback(() => {
    logVoice('Cleaning up transports');

    cleaningUpRef.current = true;
    silentRejoinRequestedRef.current = false;
    iceRestartAttemptsRef.current = { send: 0, recv: 0 };
    iceRestartInFlightRef.current = { send: false, recv: false };
    clearIceRestartTimer('send');
    clearIceRestartTimer('recv');

    Object.values(consumers.current).forEach((userConsumers) => {
      Object.values(userConsumers).forEach((consumer) => {
        if (!consumer.closed) {
          consumer.close();
        }
      });
    });

    consumers.current = {};
    consumerCodecs.current.clear();

    clearRemoteConsumerMetadata();

    consumeOperationsInProgress.current.clear();

    if (producerTransport.current && !producerTransport.current.closed) {
      producerTransport.current.close();
    }

    producerTransport.current = undefined;

    if (consumerTransport.current && !consumerTransport.current.closed) {
      consumerTransport.current.close();
    }

    consumerTransport.current = undefined;

    logVoice('Transports cleanup complete');
  }, [clearIceRestartTimer, clearRemoteConsumerMetadata]);

  return {
    producerTransport,
    consumerTransport,
    consumers,
    createProducerTransport,
    createConsumerTransport,
    consume,
    consumeExistingProducers,
    cleanupTransports,
    getConsumerCodec
  };
};

export { useTransports };
