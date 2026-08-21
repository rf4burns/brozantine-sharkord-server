import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { Label, Popover, PopoverContent, PopoverTrigger } from '@kurier/ui';
import { ChevronUp } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TVoiceDevicePopoverProps = {
  kind: 'audioinput' | 'audiooutput';
};

const VoiceDevicePopover = memo(({ kind }: TVoiceDevicePopoverProps) => {
  const { t } = useTranslation('sidebar');
  const { devices, inputDevices, playbackDevices, saveDevices } = useDevices();
  const list = kind === 'audioinput' ? inputDevices : playbackDevices;
  const selectedId =
    kind === 'audioinput' ? devices.microphoneId : devices.playbackId;

  const onSelect = useCallback(
    (deviceId: string) => {
      if (kind === 'audioinput') {
        saveDevices({ ...devices, microphoneId: deviceId });
        return;
      }

      saveDevices({ ...devices, playbackId: deviceId });
    },
    [devices, kind, saveDevices]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-4 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          title={kind === 'audioinput' ? t('inputDevices') : t('outputDevices')}
        >
          <ChevronUp className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-64 p-2">
        <Label className="px-1 text-xs text-muted-foreground">
          {kind === 'audioinput' ? t('inputDevices') : t('outputDevices')}
        </Label>
        <div className="mt-1 max-h-56 space-y-0.5 overflow-y-auto">
          {list.map((device) => {
            if (!device) return null;

            const isSelected = selectedId === device.deviceId;

            return (
              <button
                key={device.deviceId || device.label}
                type="button"
                className={`flex w-full truncate rounded-md px-2 py-1.5 text-left text-sm ${
                  isSelected
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
                onClick={() => onSelect(device.deviceId)}
              >
                {device.label || t('defaultDevice')}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});

export { VoiceDevicePopover };
