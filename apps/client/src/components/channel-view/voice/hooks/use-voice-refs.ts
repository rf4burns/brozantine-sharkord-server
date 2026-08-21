import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { useVolumeControl } from '@/components/voice-provider/volume-control-context';
import { useIsOwnUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import {
  applyAudioOutputDevice,
  ensureAudioElementPlaying
} from '@/helpers/audio-output';
import { StreamKind } from '@kurier/shared';
import { useCallback, useEffect, useMemo } from 'react';
import { useAudioLevel } from './use-audio-level';

const useVoiceRefs = (
  remoteId: number,
  pluginId?: string,
  streamKey?: string
) => {
  const {
    remoteUserStreams,
    externalStreams,
    localAudioStream,
    localVideoStream,
    localScreenShareStream,
    ownVoiceState,
    isLocallySpeaking,
    getOrCreateRefs
  } = useVoice();
  const isOwnUser = useIsOwnUser(remoteId);
  const {
    getVolume,
    getUserVolumeKey,
    getUserScreenVolumeKey,
    getExternalVolumeKey
  } = useVolumeControl();
  const { devices } = useDevices();

  const {
    videoRef,
    audioRef,
    screenShareRef,
    screenShareAudioRef,
    externalAudioRef,
    externalVideoRef
  } = getOrCreateRefs(remoteId);

  const videoStream = useMemo(() => {
    if (isOwnUser) return localVideoStream;

    return remoteUserStreams[remoteId]?.[StreamKind.VIDEO];
  }, [remoteUserStreams, remoteId, isOwnUser, localVideoStream]);

  const audioStream = useMemo(() => {
    if (isOwnUser) return undefined;

    return remoteUserStreams[remoteId]?.[StreamKind.AUDIO];
  }, [remoteUserStreams, remoteId, isOwnUser]);

  const audioStreamForLevel = useMemo(() => {
    if (isOwnUser) return localAudioStream;

    return remoteUserStreams[remoteId]?.[StreamKind.AUDIO];
  }, [remoteUserStreams, remoteId, isOwnUser, localAudioStream]);

  const screenShareStream = useMemo(() => {
    if (isOwnUser) return localScreenShareStream;

    return remoteUserStreams[remoteId]?.[StreamKind.SCREEN];
  }, [remoteUserStreams, remoteId, isOwnUser, localScreenShareStream]);

  const screenShareAudioStream = useMemo(() => {
    if (isOwnUser) return undefined;

    return remoteUserStreams[remoteId]?.[StreamKind.SCREEN_AUDIO];
  }, [remoteUserStreams, remoteId, isOwnUser]);

  const externalAudioStream = useMemo(() => {
    if (isOwnUser) return undefined;

    const external = externalStreams[remoteId];

    return external?.audioStream;
  }, [externalStreams, remoteId, isOwnUser]);

  const externalVideoStream = useMemo(() => {
    if (isOwnUser) return undefined;

    const external = externalStreams[remoteId];

    return external?.videoStream;
  }, [externalStreams, remoteId, isOwnUser]);

  const { audioLevel, isSpeaking, speakingIntensity, speakingEffectClass } =
    useAudioLevel(audioStreamForLevel);

  const userVolumeKey = getUserVolumeKey(remoteId);
  const userVolume = getVolume(userVolumeKey);

  const userScreenVolumeKey = getUserScreenVolumeKey(remoteId);
  const userScreenVolume = getVolume(userScreenVolumeKey);

  const externalVolumeKey =
    pluginId && streamKey ? getExternalVolumeKey(pluginId, streamKey) : null;

  const externalVolume = externalVolumeKey ? getVolume(externalVolumeKey) : 100;

  const attenuationFactor = useMemo(() => {
    if (!devices.attenuationEnabled || !isLocallySpeaking) return 1;

    return Math.max(0, 1 - (devices.attenuationPercent ?? 80) / 100);
  }, [
    devices.attenuationEnabled,
    devices.attenuationPercent,
    isLocallySpeaking
  ]);

  const playbackVolume = useCallback(
    (volume: number) =>
      Math.max(0, Math.min(1, (volume / 100) * attenuationFactor)),
    [attenuationFactor]
  );

  const syncPlaybackElement = useCallback(
    async (
      element: HTMLAudioElement | null,
      stream: MediaStream | undefined,
      volume: number
    ) => {
      if (!element || !stream) return;

      if (element.srcObject !== stream) {
        element.srcObject = stream;
      }

      element.volume = playbackVolume(volume);
      element.muted = ownVoiceState.soundMuted;

      await applyAudioOutputDevice(element, devices.playbackId);

      if (!ownVoiceState.soundMuted) {
        await ensureAudioElementPlaying(element);
      }
    },
    [devices.playbackId, ownVoiceState.soundMuted, playbackVolume]
  );

  useEffect(() => {
    if (!videoStream || !videoRef.current) return;

    videoRef.current.srcObject = videoStream;
  }, [videoStream, videoRef]);

  useEffect(() => {
    void syncPlaybackElement(audioRef.current, audioStream, userVolume);
  }, [audioRef, audioStream, syncPlaybackElement, userVolume]);

  useEffect(() => {
    void syncPlaybackElement(
      screenShareAudioRef.current,
      screenShareAudioStream,
      userScreenVolume
    );
  }, [
    screenShareAudioRef,
    screenShareAudioStream,
    syncPlaybackElement,
    userScreenVolume
  ]);

  useEffect(() => {
    if (!screenShareStream || !screenShareRef.current) return;

    if (screenShareRef.current.srcObject !== screenShareStream) {
      screenShareRef.current.srcObject = screenShareStream;
    }
  }, [screenShareStream, screenShareRef]);

  useEffect(() => {
    void syncPlaybackElement(
      externalAudioRef.current,
      externalAudioStream,
      externalVolume
    );
  }, [
    externalAudioRef,
    externalAudioStream,
    externalVolume,
    syncPlaybackElement
  ]);

  useEffect(() => {
    if (!externalVideoStream || !externalVideoRef.current) return;

    if (externalVideoRef.current.srcObject !== externalVideoStream) {
      externalVideoRef.current.srcObject = externalVideoStream;
    }
  }, [externalVideoStream, externalVideoRef]);

  useEffect(() => {
    const syncMute = async (element: HTMLAudioElement | null) => {
      if (!element) return;

      element.muted = ownVoiceState.soundMuted;

      if (!ownVoiceState.soundMuted) {
        await ensureAudioElementPlaying(element);
      }
    };

    void syncMute(audioRef.current);
    void syncMute(screenShareAudioRef.current);
    void syncMute(externalAudioRef.current);
  }, [
    ownVoiceState.soundMuted,
    audioRef,
    screenShareAudioRef,
    externalAudioRef,
    audioStream,
    screenShareAudioStream,
    externalAudioStream
  ]);

  return {
    videoRef,
    audioRef,
    screenShareRef,
    screenShareAudioRef,
    externalAudioRef,
    externalVideoRef,
    hasAudioStream: !!audioStream,
    hasVideoStream: !!videoStream,
    hasScreenShareStream: !!screenShareStream,
    hasScreenShareAudioStream: !!screenShareAudioStream,
    hasExternalAudioStream: !!externalAudioStream,
    hasExternalVideoStream: !!externalVideoStream,
    audioLevel,
    isSpeaking,
    speakingIntensity,
    speakingEffectClass
  };
};

export { useVoiceRefs };
