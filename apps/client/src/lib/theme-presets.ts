export const THEME_PRESETS = [
  'dark',
  'midnight',
  'slate',
  'charcoal',
  'ocean',
  'forest',
  'dusk',
  'crimson',
  'light',
  'sand',
  'paper',
  'arctic'
] as const;

export type TThemePreset = (typeof THEME_PRESETS)[number];

export const DEFAULT_THEME_PRESET: TThemePreset = 'dark';
export const DEFAULT_THEME_ACCENT = '#5865F2';

export const THEME_ACCENT_SWATCHES = [
  '#5865F2',
  '#3BA55D',
  '#EB459E',
  '#FAA61A',
  '#ED4245',
  '#00A8FC',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#2ECC71',
  '#F1C40F',
  '#3498DB',
  '#E91E63',
  '#00BCD4',
  '#795548',
  '#607D8B'
] as const;

export const LIGHT_THEME_PRESETS = new Set<TThemePreset>([
  'light',
  'sand',
  'paper',
  'arctic'
]);

type TThemePalette = {
  background: string;
  sidebar: string;
  rail: string;
  card: string;
  online: string;
  idle: string;
  dnd: string;
  offline: string;
  foreground: string;
  muted: string;
  faint: string;
  divider: string;
};

const THEME_PALETTES: Record<TThemePreset, TThemePalette> = {
  dark: {
    background: '#313338',
    sidebar: '#2B2D31',
    rail: '#1E1F22',
    card: '#383A40',
    online: '#23A55A',
    idle: '#F0B232',
    dnd: '#F23F43',
    offline: '#80848E',
    foreground: '#F2F3F5',
    muted: '#B5BAC1',
    faint: '#949BA4',
    divider: '#3F4147'
  },
  midnight: {
    background: '#111214',
    sidebar: '#0B0C0E',
    rail: '#000000',
    card: '#1A1B1E',
    online: '#23A55A',
    idle: '#F0B232',
    dnd: '#F23F43',
    offline: '#80848E',
    foreground: '#EDEEF0',
    muted: '#B5BAC1',
    faint: '#949BA4',
    divider: '#232428'
  },
  slate: {
    background: '#2A3038',
    sidebar: '#222830',
    rail: '#171C22',
    card: '#333A44',
    online: '#23A55A',
    idle: '#F0B232',
    dnd: '#F23F43',
    offline: '#80848E',
    foreground: '#E8ECF1',
    muted: '#A8B0BC',
    faint: '#8A93A0',
    divider: '#3A424D'
  },
  charcoal: {
    background: '#2C2A28',
    sidebar: '#242220',
    rail: '#1A1816',
    card: '#353230',
    online: '#23A55A',
    idle: '#F0B232',
    dnd: '#F23F43',
    offline: '#80848E',
    foreground: '#F3EFEA',
    muted: '#B8B0A6',
    faint: '#9A9288',
    divider: '#403C38'
  },
  ocean: {
    background: '#1B2838',
    sidebar: '#152232',
    rail: '#0E1724',
    card: '#243448',
    online: '#23A55A',
    idle: '#F0B232',
    dnd: '#F23F43',
    offline: '#80848E',
    foreground: '#E6EEF7',
    muted: '#A4B4C8',
    faint: '#8494A8',
    divider: '#2C3E52'
  },
  forest: {
    background: '#1E2A24',
    sidebar: '#18221D',
    rail: '#101814',
    card: '#27352E',
    online: '#2ECC71',
    idle: '#F0B232',
    dnd: '#F23F43',
    offline: '#80848E',
    foreground: '#E8F0EB',
    muted: '#A8B8AE',
    faint: '#889890',
    divider: '#2F3F36'
  },
  dusk: {
    background: '#26242E',
    sidebar: '#201E2C',
    rail: '#16141F',
    card: '#302E3C',
    online: '#23A55A',
    idle: '#F0B232',
    dnd: '#F23F43',
    offline: '#80848E',
    foreground: '#EDEAF5',
    muted: '#B0AAC0',
    faint: '#908AA0',
    divider: '#3A3748'
  },
  crimson: {
    background: '#2E2224',
    sidebar: '#261C1E',
    rail: '#1A1214',
    card: '#3A2A2C',
    online: '#23A55A',
    idle: '#F0B232',
    dnd: '#F23F43',
    offline: '#80848E',
    foreground: '#F5EAEA',
    muted: '#C0A8A8',
    faint: '#A08888',
    divider: '#443436'
  },
  light: {
    background: '#FFFFFF',
    sidebar: '#F2F3F5',
    rail: '#E3E5E8',
    card: '#EBEDEF',
    online: '#248A45',
    idle: '#B8860B',
    dnd: '#D83C3E',
    offline: '#80848E',
    foreground: '#060607',
    muted: '#4E5058',
    faint: '#5C5E66',
    divider: '#D7D9DC'
  },
  sand: {
    background: '#F7F1E8',
    sidebar: '#EDE4D6',
    rail: '#E0D4C2',
    card: '#E8DDCF',
    online: '#248A45',
    idle: '#B8860B',
    dnd: '#D83C3E',
    offline: '#80848E',
    foreground: '#2A241C',
    muted: '#5C5348',
    faint: '#6E6458',
    divider: '#D4C8B6'
  },
  paper: {
    background: '#FAFAF8',
    sidebar: '#F0F0EC',
    rail: '#E4E4DE',
    card: '#ECECE6',
    online: '#248A45',
    idle: '#B8860B',
    dnd: '#D83C3E',
    offline: '#80848E',
    foreground: '#1A1A18',
    muted: '#555550',
    faint: '#6A6A64',
    divider: '#D8D8D0'
  },
  arctic: {
    background: '#F2F6FA',
    sidebar: '#E6EEF5',
    rail: '#D5E0EB',
    card: '#DDE7F0',
    online: '#248A45',
    idle: '#B8860B',
    dnd: '#D83C3E',
    offline: '#80848E',
    foreground: '#121820',
    muted: '#4A5868',
    faint: '#5C6A7A',
    divider: '#C8D4E0'
  }
};

const isThemePreset = (value: string | null): value is TThemePreset =>
  !!value && (THEME_PRESETS as readonly string[]).includes(value);

const isHexColor = (value: string) =>
  /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);

const parseThemePreset = (value: string | null): TThemePreset => {
  if (isThemePreset(value)) {
    return value;
  }

  return DEFAULT_THEME_PRESET;
};

const parseThemeAccent = (value: string | null): string => {
  if (value && isHexColor(value)) {
    return value;
  }

  return DEFAULT_THEME_ACCENT;
};

const applyThemeToDocument = (preset: TThemePreset, accent: string) => {
  const root = document.documentElement;
  const palette = THEME_PALETTES[preset];
  const isLight = LIGHT_THEME_PRESETS.has(preset);

  root.classList.toggle('dark', !isLight);
  root.classList.toggle('light', isLight);
  root.dataset.theme = preset;

  root.style.setProperty('--background', palette.background);
  root.style.setProperty('--foreground', palette.foreground);
  root.style.setProperty('--card', palette.card);
  root.style.setProperty('--card-foreground', palette.foreground);
  root.style.setProperty('--popover', palette.sidebar);
  root.style.setProperty('--popover-foreground', palette.foreground);
  root.style.setProperty('--primary', accent);
  root.style.setProperty('--primary-foreground', '#FFFFFF');
  root.style.setProperty('--secondary', palette.card);
  root.style.setProperty('--secondary-foreground', palette.foreground);
  root.style.setProperty('--muted', palette.card);
  root.style.setProperty('--muted-foreground', palette.muted);
  root.style.setProperty('--accent', palette.card);
  root.style.setProperty('--accent-foreground', palette.foreground);
  root.style.setProperty('--destructive', palette.dnd);
  root.style.setProperty('--border', palette.divider);
  root.style.setProperty('--input', palette.divider);
  root.style.setProperty('--ring', accent);
  root.style.setProperty('--sidebar', palette.sidebar);
  root.style.setProperty('--sidebar-foreground', palette.foreground);
  root.style.setProperty('--sidebar-primary', accent);
  root.style.setProperty('--sidebar-primary-foreground', '#FFFFFF');
  root.style.setProperty('--sidebar-accent', palette.card);
  root.style.setProperty('--sidebar-accent-foreground', palette.foreground);
  root.style.setProperty('--sidebar-border', palette.divider);
  root.style.setProperty('--sidebar-ring', accent);
  root.style.setProperty('--rail', palette.rail);
  root.style.setProperty('--user-area', palette.rail);
  root.style.setProperty('--faint', palette.faint);
  root.style.setProperty('--status-online', palette.online);
  root.style.setProperty('--status-idle', palette.idle);
  root.style.setProperty('--status-dnd', palette.dnd);
  root.style.setProperty('--status-offline', palette.offline);
  root.style.setProperty('--scrollbar-track-color', palette.sidebar);
  root.style.setProperty('--scrollbar-thumb-color', palette.rail);
  root.style.setProperty('--scrollbar-thumb-hover-color', palette.divider);
};

const getThemePresetPreview = (preset: TThemePreset) => {
  const palette = THEME_PALETTES[preset];

  return {
    background: palette.background,
    rail: palette.rail
  };
};

export {
  applyThemeToDocument,
  getThemePresetPreview,
  parseThemeAccent,
  parseThemePreset
};
