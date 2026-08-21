import {
  getLocalStorageItem,
  LocalStorageKey,
  setLocalStorageItem
} from '@/helpers/storage';
import {
  applyThemeToDocument,
  DEFAULT_THEME_ACCENT,
  DEFAULT_THEME_PRESET,
  parseThemeAccent,
  parseThemePreset,
  type TThemePreset
} from '@/lib/theme-presets';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultPreset?: TThemePreset;
  defaultAccent?: string;
};

type ThemeProviderState = {
  preset: TThemePreset;
  accent: string;
  setPreset: (preset: TThemePreset) => void;
  setAccent: (accent: string) => void;
};

const initialState: ThemeProviderState = {
  preset: DEFAULT_THEME_PRESET,
  accent: DEFAULT_THEME_ACCENT,
  setPreset: () => undefined,
  setAccent: () => undefined
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const readInitialPreset = (fallback: TThemePreset) => {
  const storedPreset = getLocalStorageItem(LocalStorageKey.THEME_PRESET);
  const legacyTheme = getLocalStorageItem(LocalStorageKey.VITE_UI_THEME);

  return parseThemePreset(storedPreset ?? legacyTheme) || fallback;
};

function ThemeProvider({
  children,
  defaultPreset = DEFAULT_THEME_PRESET,
  defaultAccent = DEFAULT_THEME_ACCENT
}: ThemeProviderProps) {
  const [preset, setPresetState] = useState<TThemePreset>(() => {
    const next = readInitialPreset(defaultPreset);
    applyThemeToDocument(
      next,
      parseThemeAccent(getLocalStorageItem(LocalStorageKey.THEME_ACCENT))
    );
    return next;
  });
  const [accent, setAccentState] = useState(() =>
    parseThemeAccent(
      getLocalStorageItem(LocalStorageKey.THEME_ACCENT) ?? defaultAccent
    )
  );

  const setPreset = useCallback(
    (next: TThemePreset) => {
      setLocalStorageItem(LocalStorageKey.THEME_PRESET, next);
      applyThemeToDocument(next, accent);
      setPresetState(next);
    },
    [accent]
  );

  const setAccent = useCallback(
    (next: string) => {
      const parsed = parseThemeAccent(next);
      setLocalStorageItem(LocalStorageKey.THEME_ACCENT, parsed);
      applyThemeToDocument(preset, parsed);
      setAccentState(parsed);
    },
    [preset]
  );

  const value = useMemo(
    () => ({
      preset,
      accent,
      setPreset,
      setAccent
    }),
    [preset, accent, setPreset, setAccent]
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

export { ThemeProvider, useTheme };
