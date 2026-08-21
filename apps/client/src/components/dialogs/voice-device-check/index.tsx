import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import type { TDialogBaseProps } from '@/components/dialogs/types';
import { useMicrophoneTest } from '@/components/server-screens/user-settings/devices/hooks/use-microphone-test';
import { useWebcamTest } from '@/components/server-screens/user-settings/devices/hooks/use-webcam-test';
import { MicrophoneTestLevelBar } from '@/components/server-screens/user-settings/devices/microphone-test-level-bar';
import { useChannelById } from '@/features/server/channels/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { MICROPHONE_GATE_DEFAULT_THRESHOLD_DB } from '@/helpers/audio-gate';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Group,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@kurier/ui';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULT_NAME = 'default';

type TVoiceDeviceCheckDialogProps = TDialogBaseProps & {
  channelId: number;
  onJoin: () => Promise<boolean>;
};

const VoiceDeviceCheckDialog = memo(
  ({ isOpen, close, channelId, onJoin }: TVoiceDeviceCheckDialogProps) => {
    const { t } = useTranslation('dialogs');
    const settingsT = useTranslation('settings').t;
    const channel = useChannelById(channelId);
    const {
      devices,
      saveDevices,
      inputDevices,
      playbackDevices,
      videoDevices
    } = useDevices();
    const [joining, setJoining] = useState(false);
    const [skipNextTime, setSkipNextTime] = useState(
      !!devices.skipVoiceDeviceCheck
    );

    const {
      testAudioRef,
      permissionState,
      isTesting,
      getAudioLevelSnapshot,
      requestPermission,
      startTest,
      stopTest
    } = useMicrophoneTest({
      microphoneId: devices.microphoneId,
      playbackId: devices.playbackId,
      autoGainControl: !!devices.autoGainControl,
      echoCancellation: !!devices.echoCancellation,
      noiseSuppression: devices.noiseSuppression,
      noiseGateEnabled: !!devices.noiseGateEnabled,
      noiseGateThresholdDb:
        devices.noiseGateThresholdDb ?? MICROPHONE_GATE_DEFAULT_THRESHOLD_DB
    });
    const {
      testVideoRef,
      isStarting: isVideoStarting,
      isTesting: isVideoTesting,
      isPreviewReady: isVideoPreviewReady,
      startTest: startVideoTest,
      stopTest: stopVideoTest
    } = useWebcamTest({
      webcamId: devices.webcamId,
      webcamResolution: devices.webcamResolution,
      webcamFramerate: devices.webcamFramerate
    });

    useEffect(() => {
      if (!isOpen) return;

      void (async () => {
        await requestPermission({ silent: true });
        await startTest();
      })();

      return () => {
        stopTest();
        stopVideoTest();
      };
    }, [isOpen, requestPermission, startTest, stopTest, stopVideoTest]);

    const handleJoin = useCallback(async () => {
      if (joining) return;

      setJoining(true);
      stopTest();
      stopVideoTest();

      if (skipNextTime !== devices.skipVoiceDeviceCheck) {
        saveDevices({ ...devices, skipVoiceDeviceCheck: skipNextTime });
      }

      try {
        const didJoin = await onJoin();

        if (!didJoin) {
          setJoining(false);
          return;
        }

        close();
      } catch {
        setJoining(false);
      }
    }, [
      joining,
      stopTest,
      stopVideoTest,
      skipNextTime,
      devices,
      saveDevices,
      onJoin,
      close
    ]);

    const handleTestSpeaker = useCallback(() => {
      playSound(SoundType.OWN_USER_JOINED_VOICE_CHANNEL);
    }, []);

    const handleToggleCamera = useCallback(() => {
      if (isVideoTesting) {
        stopVideoTest();
        return;
      }

      void startVideoTest();
    }, [isVideoTesting, startVideoTest, stopVideoTest]);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={joining ? undefined : close}
          close={joining ? undefined : close}
        >
          <DialogHeader>
            <DialogTitle>{t('voiceDeviceCheckTitle')}</DialogTitle>
            <DialogDescription>
              {t('voiceDeviceCheckDesc', {
                channel: channel?.name ?? ''
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Group label={settingsT('microphoneLabel')}>
              <Select
                value={devices.microphoneId}
                onValueChange={(value) =>
                  saveDevices({ ...devices, microphoneId: value })
                }
                disabled={inputDevices.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={settingsT('microphonePlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {inputDevices.map((device) => (
                      <SelectItem
                        key={device?.deviceId}
                        value={device?.deviceId || DEFAULT_NAME}
                      >
                        {device?.label.trim() || settingsT('defaultMicrophone')}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <MicrophoneTestLevelBar
                isTesting={isTesting}
                noiseGateEnabled={!!devices.noiseGateEnabled}
                noiseGateThresholdDb={devices.noiseGateThresholdDb}
                onThresholdChange={(value) =>
                  saveDevices({ ...devices, noiseGateThresholdDb: value })
                }
                getAudioLevelSnapshot={getAudioLevelSnapshot}
              />
              {permissionState !== 'granted' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void requestPermission()}
                >
                  {settingsT('permitMicAccess')}
                </Button>
              )}
              <audio ref={testAudioRef} className="hidden" />
            </Group>

            <Group label={settingsT('playbackLabel')}>
              <Select
                value={devices.playbackId}
                onValueChange={(value) =>
                  saveDevices({ ...devices, playbackId: value })
                }
                disabled={playbackDevices.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={settingsT('playbackPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {playbackDevices.map((device) => (
                      <SelectItem
                        key={device?.deviceId}
                        value={device?.deviceId || DEFAULT_NAME}
                      >
                        {device?.label.trim() || settingsT('defaultOutput')}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestSpeaker}
              >
                {t('voiceDeviceCheckTestSpeaker')}
              </Button>
            </Group>

            <Group label={settingsT('webcamLabel')}>
              <Select
                value={devices.webcamId}
                onValueChange={(value) =>
                  saveDevices({ ...devices, webcamId: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={settingsT('webcamPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {videoDevices.map((device) => (
                      <SelectItem
                        key={device?.deviceId}
                        value={device?.deviceId || DEFAULT_NAME}
                      >
                        {device?.label.trim() || settingsT('defaultWebcam')}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-muted/40">
                <video
                  ref={testVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
                {!isVideoPreviewReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    {isVideoStarting
                      ? settingsT('startingCamera')
                      : t('voiceDeviceCheckCameraIdle')}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleToggleCamera}
              >
                {isVideoTesting
                  ? settingsT('stopVideoPreviewBtn')
                  : t('voiceDeviceCheckTestCamera')}
              </Button>
            </Group>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {t('voiceDeviceCheckSkip')}
              </span>
              <Switch
                checked={skipNextTime}
                onCheckedChange={setSkipNextTime}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={joining}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void handleJoin()}
              disabled={joining}
            >
              {joining
                ? t('voiceDeviceCheckJoining')
                : t('voiceDeviceCheckJoin')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { VoiceDeviceCheckDialog };
