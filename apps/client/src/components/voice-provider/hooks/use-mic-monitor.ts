import { applyAudioOutputDevice } from '@/helpers/audio-output';
import { useCallback, useEffect, useRef, useState } from 'react';

type TUseMicMonitorParams = {
  localAudioStream: MediaStream | undefined;
  isConnected: boolean;
  soundMuted: boolean;
  playbackId: string | undefined;
  toggleSound: () => Promise<void>;
};

const useMicMonitor = ({
  localAudioStream,
  isConnected,
  soundMuted,
  playbackId,
  toggleSound
}: TUseMicMonitorParams) => {
  const [isMicMonitoring, setIsMicMonitoring] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMicMonitoringRef = useRef(false);

  isMicMonitoringRef.current = isMicMonitoring;

  const stopMicMonitor = useCallback(() => {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audioRef.current = null;
    }

    setIsMicMonitoring(false);
  }, []);

  const startMicMonitor = useCallback(async () => {
    if (!localAudioStream || !isConnected) {
      return;
    }

    if (!soundMuted) {
      await toggleSound();
    }

    stopMicMonitor();

    const audio = new Audio();
    audio.srcObject = localAudioStream;
    await applyAudioOutputDevice(audio, playbackId, false);
    await audio.play();
    audioRef.current = audio;
    setIsMicMonitoring(true);
  }, [
    isConnected,
    localAudioStream,
    playbackId,
    soundMuted,
    stopMicMonitor,
    toggleSound
  ]);

  const toggleMicMonitor = useCallback(async () => {
    if (isMicMonitoringRef.current) {
      stopMicMonitor();
      return;
    }

    await startMicMonitor();
  }, [startMicMonitor, stopMicMonitor]);

  useEffect(() => {
    if (!isConnected) {
      stopMicMonitor();
    }
  }, [isConnected, stopMicMonitor]);

  useEffect(() => {
    if (isMicMonitoring && !soundMuted) {
      stopMicMonitor();
    }
  }, [isMicMonitoring, soundMuted, stopMicMonitor]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!isMicMonitoring || !audio || !localAudioStream) {
      return;
    }

    audio.srcObject = localAudioStream;
  }, [isMicMonitoring, localAudioStream]);

  useEffect(() => {
    void applyAudioOutputDevice(audioRef.current, playbackId, false);
  }, [playbackId]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;

      if (audio) {
        audio.pause();
        audio.srcObject = null;
      }
    };
  }, []);

  return { isMicMonitoring, toggleMicMonitor };
};

export { useMicMonitor };
