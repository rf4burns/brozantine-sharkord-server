import { setCapturingPttKeybind } from '@/helpers/ptt-capture';
import {
  formatPttKeybind,
  isModifierCode,
  keybindFromKeyboardEvent
} from '@/helpers/ptt-keybind';
import type { TPttKeybind } from '@/types';
import { Button } from '@kurier/ui';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TKeybindCaptureProps = {
  value: TPttKeybind;
  onChange: (keybind: TPttKeybind) => void;
};

const KeybindCapture = memo(({ value, onChange }: TKeybindCaptureProps) => {
  const { t } = useTranslation('settings');
  const [listening, setListening] = useState(false);

  const stopListening = useCallback(() => {
    setListening(false);
    setCapturingPttKeybind(false);
  }, []);

  const startListening = useCallback(() => {
    setListening(true);
    setCapturingPttKeybind(true);
  }, []);

  useEffect(() => {
    if (!listening) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      event.preventDefault();
      event.stopPropagation();

      if (event.code === 'Escape') {
        stopListening();
        return;
      }

      if (isModifierCode(event.code)) return;

      onChange(keybindFromKeyboardEvent(event));
      stopListening();
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      setCapturingPttKeybind(false);
    };
  }, [listening, onChange, stopListening]);

  useEffect(() => {
    return () => {
      setCapturingPttKeybind(false);
    };
  }, []);

  return (
    <Button
      type="button"
      variant={listening ? 'secondary' : 'outline'}
      onClick={listening ? stopListening : startListening}
    >
      {listening ? t('pttKeybindPressKey') : formatPttKeybind(value)}
    </Button>
  );
});

export { KeybindCapture };
