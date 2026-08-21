import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { getVoiceControlsBridge } from '@/components/voice-provider/controls-bridge';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { useOwnVoiceState, useVoice } from '@/features/server/voice/hooks';
import { MICROPHONE_GATE_DEFAULT_THRESHOLD_DB } from '@/helpers/audio-gate';
import {
  getNoiseGateWorkletAvailabilitySnapshot,
  subscribeNoiseGateWorkletAvailability
} from '@/helpers/audio-worklet/noise-gate-worklet';
import {
  getRestrictOwnAudioSupport,
  getSuppressLocalAudioPlaybackSupport
} from '@/helpers/get-display-media-support';
import { DEFAULT_PTT_KEYBIND } from '@/helpers/ptt-keybind';
import { useForm } from '@/hooks/use-form';
import { cn } from '@/lib/utils';
import {
  NoiseSuppression,
  Resolution,
  VideoCodec,
  VoiceInputMode,
  type TPttKeybind
} from '@/types';
import { DEFAULT_BITRATE } from '@kurier/shared';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Label,
  LoadingCard,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider,
  Switch
} from '@kurier/ui';
import { filesize } from 'filesize';
import { Info } from 'lucide-react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMicrophoneTest } from './hooks/use-microphone-test';
import { useWebcamTest } from './hooks/use-webcam-test';
import { KeybindCapture } from './keybind-capture';
import { MicrophoneTestLevelBar } from './microphone-test-level-bar';
import { ResolutionFpsControl } from './resolution-fps-control';
import { RestrictOwnAudioAlert } from './restrict-own-audio-alert';
import { SuppressLocalAudioPlaybackAlert } from './suppress-local-audio-playback-alert';
import { SupressionHelp } from './supression-help';

const DEFAULT_NAME = 'default';

const Devices = memo(() => {
  const { t } = useTranslation('settings');
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const settings = usePublicServerSettings();
  const ownVoiceState = useOwnVoiceState();
  const { isMicMonitoring, toggleMicMonitor } = useVoice();

  const onToggleMicMonitor = useCallback(() => {
    void toggleMicMonitor();
  }, [toggleMicMonitor]);
  const {
    devices,
    saveDevices,
    loading: devicesLoading,
    inputDevices,
    playbackDevices,
    videoDevices,
    loadDevices
  } = useDevices();
  const { values, onChange, setValues } = useForm(devices);
  const noiseGateWorkletAvailability = useSyncExternalStore(
    subscribeNoiseGateWorkletAvailability,
    getNoiseGateWorkletAvailabilitySnapshot,
    getNoiseGateWorkletAvailabilitySnapshot
  );
  const isNoiseGateAvailable = noiseGateWorkletAvailability.available;
  const isRestrictOwnAudioSupported = useMemo(
    () => getRestrictOwnAudioSupport(),
    []
  );
  const isSuppressLocalAudioPlaybackSupported = useMemo(
    () => getSuppressLocalAudioPlaybackSupport(),
    []
  );

  const {
    testAudioRef,
    permissionState,
    isTesting,
    getAudioLevelSnapshot,
    error: microphoneTestError,
    requestPermission,
    startTest,
    stopTest
  } = useMicrophoneTest({
    microphoneId: values.microphoneId,
    playbackId: values.playbackId,
    autoGainControl: !!values.autoGainControl,
    echoCancellation: !!values.echoCancellation,
    noiseSuppression: values.noiseSuppression,
    noiseGateEnabled: !!values.noiseGateEnabled,
    noiseGateThresholdDb:
      values.noiseGateThresholdDb ?? MICROPHONE_GATE_DEFAULT_THRESHOLD_DB
  });
  const {
    testVideoRef,
    isStarting: isVideoStarting,
    isTesting: isVideoTesting,
    isPreviewReady: isVideoPreviewReady,
    error: webcamTestError,
    startTest: startVideoTest,
    stopTest: stopVideoTest
  } = useWebcamTest({
    webcamId: values.webcamId,
    webcamResolution: values.webcamResolution,
    webcamFramerate: values.webcamFramerate
  });

  const saveDeviceSettings = useCallback(() => {
    saveDevices(values);
    toast.success(t('deviceSettingsSaved'));
  }, [saveDevices, values, t]);
  const selectVadMode = useCallback(() => {
    onChange('inputMode', VoiceInputMode.VAD);
  }, [onChange]);
  const selectPttMode = useCallback(() => {
    onChange('inputMode', VoiceInputMode.PTT);
  }, [onChange]);
  const handlePttKeybindChange = useCallback(
    (keybind: TPttKeybind) => {
      onChange('pttKeybind', keybind);
    },
    [onChange]
  );
  const didPrimeDevicesOnGrantedRef = useRef(false);
  const mutedByTestRef = useRef<{
    previousMicMuted: boolean;
    previousSoundMuted: boolean;
  } | null>(null);
  const restoreVoiceStateAfterTestRef = useRef<() => Promise<void>>(
    async () => {}
  );

  const restoreVoiceStateAfterTest = useCallback(async () => {
    if (!currentVoiceChannelId) {
      mutedByTestRef.current = null;
      return;
    }

    const mutedByTest = mutedByTestRef.current;
    if (!mutedByTest) return;

    mutedByTestRef.current = null;

    const voiceControlsBridge = getVoiceControlsBridge();
    if (!voiceControlsBridge) {
      toast.error(t('voiceControlsUnavailable'));
      return;
    }

    await voiceControlsBridge.setMicMuted(mutedByTest.previousMicMuted);
    await voiceControlsBridge.setSoundMuted(mutedByTest.previousSoundMuted);
  }, [currentVoiceChannelId, t]);

  useEffect(() => {
    restoreVoiceStateAfterTestRef.current = restoreVoiceStateAfterTest;
  }, [restoreVoiceStateAfterTest]);

  const startMicrophoneTest = useCallback(async () => {
    if (currentVoiceChannelId) {
      const voiceControlsBridge = getVoiceControlsBridge();
      if (!voiceControlsBridge) {
        toast.error(t('voiceControlsUnavailable'));
        return;
      }

      mutedByTestRef.current = {
        previousMicMuted: ownVoiceState.micMuted,
        previousSoundMuted: ownVoiceState.soundMuted
      };

      await voiceControlsBridge.setMicMuted(true);
      await voiceControlsBridge.setSoundMuted(true);
    } else {
      mutedByTestRef.current = null;
    }

    const didStart = await startTest();

    if (!didStart) {
      await restoreVoiceStateAfterTest();
      return;
    }
  }, [
    currentVoiceChannelId,
    ownVoiceState.micMuted,
    ownVoiceState.soundMuted,
    startTest,
    restoreVoiceStateAfterTest,
    t
  ]);

  const stopMicrophoneTest = useCallback(async () => {
    stopTest();
    await restoreVoiceStateAfterTest();
  }, [stopTest, restoreVoiceStateAfterTest]);

  const requestMicrophonePermission = useCallback(async () => {
    await requestPermission();
    await loadDevices();
  }, [requestPermission, loadDevices]);

  const startWebcamTest = useCallback(async () => {
    const didStart = await startVideoTest();
    if (!didStart) return;

    await loadDevices();
  }, [startVideoTest, loadDevices]);

  useEffect(() => {
    if (permissionState !== 'granted') {
      didPrimeDevicesOnGrantedRef.current = false;
      return;
    }

    if (didPrimeDevicesOnGrantedRef.current) return;
    didPrimeDevicesOnGrantedRef.current = true;

    void (async () => {
      await requestPermission({ silent: true });
      await loadDevices();
    })();
  }, [permissionState, requestPermission, loadDevices]);

  useEffect(() => {
    return () => {
      void restoreVoiceStateAfterTestRef.current();
    };
  }, []);

  const hasMicrophones = inputDevices.length > 0;
  const hasDefaultPlaybackOption = playbackDevices.some(
    (device) => device?.deviceId === DEFAULT_NAME
  );
  const hasDefaultVideoOption = videoDevices.some(
    (device) => device?.deviceId === DEFAULT_NAME
  );

  const maxBitrate = useMemo(
    () => (settings?.webRtcMaxBitrate ? settings.webRtcMaxBitrate / 1000 : 0),
    [settings?.webRtcMaxBitrate]
  );

  useEffect(() => {
    setValues(devices);
  }, [devices, setValues]);

  if (devicesLoading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('devicesTitle')}</CardTitle>
        <CardDescription>{t('devicesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentVoiceChannelId && (
          <Alert variant="default">
            <Info />
            <AlertDescription>{t('voiceChannelActiveInfo')}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-6">
          <Group label={t('playbackLabel')}>
            <Select
              onValueChange={(value) => onChange('playbackId', value)}
              value={values.playbackId}
              disabled={playbackDevices.length === 0}
            >
              <SelectTrigger className="w-92">
                <SelectValue placeholder={t('playbackPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {!hasDefaultPlaybackOption && (
                    <SelectItem value={DEFAULT_NAME}>
                      {t('defaultOutput')}
                    </SelectItem>
                  )}
                  {playbackDevices.map((device) => (
                    <SelectItem
                      key={device?.deviceId}
                      value={device?.deviceId || DEFAULT_NAME}
                    >
                      {device?.label.trim() || t('defaultOutput')}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Group>

          <Group label={t('microphoneLabel')}>
            <Select
              onValueChange={(value) => onChange('microphoneId', value)}
              value={values.microphoneId}
              disabled={inputDevices.length === 0}
            >
              <SelectTrigger className="w-92">
                <SelectValue placeholder={t('microphonePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {inputDevices.map((device) => (
                    <SelectItem
                      key={device?.deviceId}
                      value={device?.deviceId || DEFAULT_NAME}
                    >
                      {device?.label.trim() || t('defaultMicrophone')}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Group label={t('inputModeLabel')} description={t('inputModeDesc')}>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={cn(
                    'rounded-md border p-3 text-left transition-colors',
                    values.inputMode === VoiceInputMode.VAD
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/40'
                  )}
                  onClick={selectVadMode}
                >
                  <div className="text-sm font-medium">{t('inputModeVad')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('inputModeVadDesc')}
                  </div>
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-md border p-3 text-left transition-colors',
                    values.inputMode === VoiceInputMode.PTT
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/40'
                  )}
                  onClick={selectPttMode}
                >
                  <div className="text-sm font-medium">{t('inputModePtt')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('inputModePttDesc')}
                  </div>
                </button>
              </div>
            </Group>

            {values.inputMode === VoiceInputMode.PTT && (
              <Group
                label={t('pttKeybindLabel')}
                description={t('pttKeybindDesc')}
              >
                <KeybindCapture
                  value={values.pttKeybind ?? DEFAULT_PTT_KEYBIND}
                  onChange={handlePttKeybindChange}
                />
              </Group>
            )}

            <Group
              label={t('noiseSuppressionLabel')}
              className="my-4"
              help={<SupressionHelp />}
            >
              <Select
                value={values.noiseSuppression}
                onValueChange={(value) =>
                  onChange('noiseSuppression', value as NoiseSuppression)
                }
              >
                <SelectTrigger className="w-92">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={NoiseSuppression.NONE}>
                      {t('noiseSuppressionNone')}
                    </SelectItem>
                    <SelectItem value={NoiseSuppression.STANDARD}>
                      {t('standard')}
                    </SelectItem>
                    <SelectItem value={NoiseSuppression.RNNOISE}>
                      RNNoise ({t('experimental')})
                    </SelectItem>
                    <SelectItem value={NoiseSuppression.DTLN}>
                      DTLN ({t('experimental')})
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Group>

            <div className="flex items-center gap-4">
              <Group label={t('echoCancellationLabel')}>
                <Switch
                  checked={!!values.echoCancellation}
                  onCheckedChange={(checked) =>
                    onChange('echoCancellation', checked)
                  }
                />
              </Group>

              <Group label={t('autoGainControlLabel')}>
                <Switch
                  checked={!!values.autoGainControl}
                  onCheckedChange={(checked) =>
                    onChange('autoGainControl', checked)
                  }
                />
              </Group>

              {values.inputMode === VoiceInputMode.VAD && (
                <Group
                  label={t('vadSensitivityLabel')}
                  description={t('vadSensitivityDesc')}
                >
                  <Switch
                    checked={values.noiseGateEnabled}
                    disabled={!isNoiseGateAvailable}
                    onCheckedChange={(checked) =>
                      onChange('noiseGateEnabled', checked)
                    }
                  />
                </Group>
              )}
            </div>

            {!isNoiseGateAvailable &&
              values.inputMode === VoiceInputMode.VAD && (
                <p className="text-xs text-muted-foreground">
                  {t('noiseGateUnavailable')}
                  {noiseGateWorkletAvailability.reason
                    ? ` ${noiseGateWorkletAvailability.reason}`
                    : ''}
                </p>
              )}
          </Group>

          <Group label={t('microphoneTestLabel')}>
            <div className="flex items-center gap-2">
              {permissionState !== 'granted' && (
                <Button variant="outline" onClick={requestMicrophonePermission}>
                  {t('permitMicAccess')}
                </Button>
              )}

              {!isTesting ? (
                <Button
                  variant="secondary"
                  onClick={() => void startMicrophoneTest()}
                  disabled={permissionState === 'denied' || !hasMicrophones}
                >
                  {t('startTestBtn')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => void stopMicrophoneTest()}
                >
                  {t('stopTestBtn')}
                </Button>
              )}
            </div>

            {currentVoiceChannelId && isTesting && (
              <p className="text-sm text-muted-foreground">
                {t('mutedDuringTest')}
              </p>
            )}

            <MicrophoneTestLevelBar
              isTesting={isTesting}
              noiseGateEnabled={
                values.inputMode === VoiceInputMode.VAD &&
                values.noiseGateEnabled
              }
              noiseGateControlsDisabled={!isNoiseGateAvailable}
              noiseGateThresholdDb={values.noiseGateThresholdDb}
              onThresholdChange={(value) =>
                onChange('noiseGateThresholdDb', value)
              }
              getAudioLevelSnapshot={getAudioLevelSnapshot}
            />

            {microphoneTestError && (
              <Alert variant="destructive">
                <Info />
                <AlertDescription>{microphoneTestError}</AlertDescription>
              </Alert>
            )}

            <audio ref={testAudioRef} className="hidden" />
          </Group>

          <Group
            label={t('attenuationLabel')}
            description={t('attenuationDesc')}
          >
            <Switch
              checked={!!values.attenuationEnabled}
              onCheckedChange={(checked) =>
                onChange('attenuationEnabled', checked)
              }
            />
            {values.attenuationEnabled && (
              <Group label={t('attenuationAmountLabel')}>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[values.attenuationPercent ?? 80]}
                  onValueChange={(value) =>
                    onChange('attenuationPercent', value[0] ?? 80)
                  }
                  rightSlot={
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {values.attenuationPercent ?? 80}%
                    </span>
                  }
                />
              </Group>
            )}
          </Group>

          <Group
            label={t('skipVoiceDeviceCheckLabel')}
            description={t('skipVoiceDeviceCheckDesc')}
          >
            <Switch
              checked={!!values.skipVoiceDeviceCheck}
              onCheckedChange={(checked) =>
                onChange('skipVoiceDeviceCheck', checked)
              }
            />
          </Group>
        </div>

        <Separator />

        <div className="space-y-6">
          <Group label={t('webcamLabel')}>
            <div className="space-y-4">
              <Select
                onValueChange={(value) => onChange('webcamId', value)}
                value={values.webcamId}
              >
                <SelectTrigger className="w-full max-w-96">
                  <SelectValue placeholder={t('webcamPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {!hasDefaultVideoOption && (
                      <SelectItem value={DEFAULT_NAME}>
                        {t('defaultWebcam')}
                      </SelectItem>
                    )}
                    {videoDevices.map((device) => (
                      <SelectItem
                        key={device?.deviceId}
                        value={device?.deviceId || DEFAULT_NAME}
                      >
                        {device?.label.trim() || t('defaultWebcam')}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="group relative aspect-video w-full max-w-[28rem] overflow-hidden rounded-md border border-border bg-muted/40">
                <video
                  ref={testVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`h-full w-full object-cover transition-opacity duration-150 ${
                    values.mirrorOwnVideo ? '-scale-x-100' : ''
                  } ${isVideoTesting ? 'opacity-100' : 'opacity-0'}`}
                />

                {!isVideoTesting && !isVideoStarting && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="secondary"
                      onClick={() => void startWebcamTest()}
                    >
                      {t('startVideoPreviewBtn')}
                    </Button>
                  </div>
                )}

                {(isVideoStarting ||
                  (isVideoTesting && !isVideoPreviewReady)) && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    {t('startingCamera')}
                  </div>
                )}

                {isVideoTesting && (
                  <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-3 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <Button
                      variant="secondary"
                      className="pointer-events-auto"
                      onClick={stopVideoTest}
                    >
                      {t('stopVideoPreviewBtn')}
                    </Button>
                  </div>
                )}
              </div>

              {webcamTestError && (
                <Alert variant="destructive">
                  <Info />
                  <AlertDescription>{webcamTestError}</AlertDescription>
                </Alert>
              )}

              <ResolutionFpsControl
                framerate={values.webcamFramerate}
                resolution={values.webcamResolution}
                onFramerateChange={(value) =>
                  onChange('webcamFramerate', value)
                }
                onResolutionChange={(value) =>
                  onChange('webcamResolution', value as Resolution)
                }
              />

              <Group label={t('mirrorOwnVideoLabel')}>
                <Switch
                  checked={!!values.mirrorOwnVideo}
                  onCheckedChange={(checked) =>
                    onChange('mirrorOwnVideo', checked)
                  }
                />
              </Group>
            </div>
          </Group>
        </div>

        <Separator />

        <div className="space-y-6">
          <Group
            label={t('simulcastUserLabel')}
            description={
              settings?.webRtcSimulcastEnabled
                ? t('simulcastUserDesc')
                : t('simulcastDisabledByServerDesc')
            }
          >
            <Switch
              checked={!!values.simulcastEnabled}
              disabled={!settings?.webRtcSimulcastEnabled}
              onCheckedChange={(checked) =>
                onChange('simulcastEnabled', checked)
              }
            />
          </Group>
          <Group label={t('screenSharingLabel')}>
            <div className="flex">
              <ResolutionFpsControl
                framerate={values.screenFramerate}
                resolution={values.screenResolution}
                onFramerateChange={(value) =>
                  onChange('screenFramerate', value)
                }
                onResolutionChange={(value) =>
                  onChange('screenResolution', value as Resolution)
                }
              />

              <div className="ml-2">
                <Select
                  value={values.screenCodec ?? VideoCodec.AUTO}
                  onValueChange={(value) =>
                    onChange('screenCodec', value as VideoCodec)
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t('selectCodecPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={VideoCodec.AUTO}>Auto</SelectItem>
                      <SelectItem value={VideoCodec.VP8}>VP8</SelectItem>
                      <SelectItem value={VideoCodec.VP9}>VP9</SelectItem>
                      <SelectItem value={VideoCodec.H264}>H264</SelectItem>
                      <SelectItem value={VideoCodec.AV1}>AV1</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('maxBitrateLabel')}</Label>

              <Slider
                className="max-w-96"
                min={200}
                max={maxBitrate}
                step={100}
                value={[values.screenBitrate ?? DEFAULT_BITRATE]}
                onValueChange={([value]) => onChange('screenBitrate', value)}
                rightSlot={
                  <span className="text-sm text-muted-foreground w-20 text-right">
                    {filesize((values.screenBitrate ?? DEFAULT_BITRATE) * 125, {
                      bits: true
                    })}
                    /s
                  </span>
                }
              />
            </div>

            <Group
              label={t('shareSystemAudioLabel')}
              description={t('shareSystemAudioDesc')}
            >
              <Switch
                checked={!!values.shareSystemAudio}
                onCheckedChange={(checked) =>
                  onChange('shareSystemAudio', checked)
                }
              />
            </Group>

            <Group
              label={t('restrictOwnAudioLabel')}
              description={t('restrictOwnAudioDesc')}
            >
              {isRestrictOwnAudioSupported ? (
                <Switch
                  checked={!!values.restrictOwnAudio}
                  disabled={!isRestrictOwnAudioSupported}
                  onCheckedChange={(checked) =>
                    onChange('restrictOwnAudio', checked)
                  }
                />
              ) : (
                <RestrictOwnAudioAlert
                  isSupported={isRestrictOwnAudioSupported}
                />
              )}
            </Group>

            <Group
              label={t('suppressLocalAudioPlaybackLabel')}
              description={t('suppressLocalAudioPlaybackDesc')}
            >
              {isSuppressLocalAudioPlaybackSupported ? (
                <Switch
                  checked={!!values.suppressLocalAudioPlayback}
                  disabled={!isSuppressLocalAudioPlaybackSupported}
                  onCheckedChange={(checked) =>
                    onChange('suppressLocalAudioPlayback', checked)
                  }
                />
              ) : (
                <SuppressLocalAudioPlaybackAlert
                  isSupported={isSuppressLocalAudioPlaybackSupported}
                />
              )}
            </Group>

            <Group
              label={t('micMonitorLabel')}
              description={t('micMonitorDesc')}
            >
              <Switch
                checked={isMicMonitoring}
                disabled={!currentVoiceChannelId}
                onCheckedChange={onToggleMicMonitor}
              />
            </Group>

            <span className="text-sm text-muted-foreground">
              {t('screenSharingNote')}
            </span>
          </Group>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('cancel')}
          </Button>
          <Button onClick={saveDeviceSettings}>{t('saveChanges')}</Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Devices };
