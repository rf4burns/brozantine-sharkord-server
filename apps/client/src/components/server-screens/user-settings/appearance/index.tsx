import { useTheme } from '@/components/theme-provider';
import {
  getThemePresetPreview,
  LIGHT_THEME_PRESETS,
  THEME_ACCENT_SWATCHES,
  THEME_PRESETS,
  type TThemePreset
} from '@/lib/theme-presets';
import { cn } from '@/lib/utils';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TPresetCardProps = {
  preset: TThemePreset;
  selected: boolean;
  onSelect: (preset: TThemePreset) => void;
};

const PresetCard = memo(({ preset, selected, onSelect }: TPresetCardProps) => {
  const { t } = useTranslation('settings');
  const preview = getThemePresetPreview(preset);

  const handleClick = useCallback(() => {
    onSelect(preset);
  }, [onSelect, preset]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'overflow-hidden rounded-lg border text-left',
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-border'
      )}
    >
      <div className="flex h-16">
        <div className="w-1/3" style={{ backgroundColor: preview.rail }} />
        <div
          className="flex-1"
          style={{ backgroundColor: preview.background }}
        />
      </div>
      <div className="bg-sidebar px-2 py-1.5 text-sm font-medium">
        {t(`theme_${preset}`)}
      </div>
    </button>
  );
});

type TAccentSwatchProps = {
  color: string;
  selected: boolean;
  onSelect: (color: string) => void;
};

const AccentSwatch = memo(
  ({ color, selected, onSelect }: TAccentSwatchProps) => {
    const handleClick = useCallback(() => {
      onSelect(color);
    }, [color, onSelect]);

    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'h-8 w-8 rounded-full border-2',
          selected ? 'border-foreground' : 'border-transparent'
        )}
        style={{ backgroundColor: color }}
        title={color}
      />
    );
  }
);

const Appearance = memo(() => {
  const { t } = useTranslation('settings');
  const { preset, accent, setPreset, setAccent } = useTheme();

  const handlePreset = useCallback(
    (next: TThemePreset) => {
      setPreset(next);
    },
    [setPreset]
  );

  const handleAccent = useCallback(
    (next: string) => {
      setAccent(next);
    },
    [setAccent]
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold">{t('appearanceTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('appearanceDesc')}
        </p>
      </div>

      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-faint">
          {t('themePresetLabel')}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {THEME_PRESETS.map((item) => (
            <PresetCard
              key={item}
              preset={item}
              selected={preset === item}
              onSelect={handlePreset}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-faint">
          {t('accentColorLabel')}
        </div>
        <div className="flex flex-wrap gap-2">
          {THEME_ACCENT_SWATCHES.map((color) => (
            <AccentSwatch
              key={color}
              color={color}
              selected={accent.toUpperCase() === color.toUpperCase()}
              onSelect={handleAccent}
            />
          ))}
        </div>
      </div>

      {LIGHT_THEME_PRESETS.has(preset) && (
        <p className="text-xs text-muted-foreground">{t('lightThemeHint')}</p>
      )}
    </div>
  );
});

export { Appearance };
