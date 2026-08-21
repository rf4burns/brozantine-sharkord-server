export enum LocalStorageKey {
  IDENTITY = 'kurier-identity',
  REMEMBER_CREDENTIALS = 'kurier-remember-identity',
  USER_PASSWORD = 'kurier-user-password',
  SERVER_PASSWORD = 'kurier-server-password',
  VITE_UI_THEME = 'vite-ui-theme',
  THEME_PRESET = 'kurier-theme-preset',
  THEME_ACCENT = 'kurier-theme-accent',
  DEVICES_SETTINGS = 'kurier-devices-settings',
  FLOATING_CARD_POSITION = 'kurier-floating-card-position',
  RIGHT_SIDEBAR_STATE = 'kurier-right-sidebar-state',
  VOICE_CHAT_SIDEBAR_STATE = 'kurier-voice-chat-sidebar-state',
  VOICE_CHAT_SIDEBAR_CHANNEL_ID = 'kurier-voice-chat-sidebar-channel-id',
  VOICE_CHAT_SIDEBAR_WIDTH = 'kurier-voice-chat-sidebar-width',
  VOICE_CHAT_SHOW_USER_BANNERS = 'kurier-voice-chat-show-user-banners',
  VOLUME_SETTINGS = 'kurier-volume-settings',
  STREAM_QUALITY_SETTINGS = 'kurier-stream-quality-settings',
  RECENT_EMOJIS = 'kurier-recent-emojis',
  GIPHY_API_KEY = 'giphy_api_key',
  FAVORITE_GIFS = 'kurier-favorite-gifs',
  DEBUG = 'kurier-debug',
  DRAFT_MESSAGES = 'kurier-draft-messages',
  HIDE_NON_VIDEO_PARTICIPANTS = 'kurier-hide-non-video-participants',
  THREAD_SIDEBAR_WIDTH = 'kurier-thread-sidebar-width',
  LEFT_SIDEBAR_WIDTH = 'kurier-left-sidebar-width',
  RIGHT_SIDEBAR_WIDTH = 'kurier-right-sidebar-width',
  CATEGORIES_EXPANDED = 'kurier-categories-expanded',
  AUTO_LOGIN = 'kurier-auto-login',
  AUTO_LOGIN_TOKEN = 'kurier-auto-login-token',
  LAST_SELECTED_CHANNEL = 'kurier-last-selected-channel',
  AUTO_JOIN_LAST_CHANNEL = 'kurier-auto-join-last-channel',
  BROWSER_NOTIFICATIONS = 'kurier-browser-notifications',
  BROWSER_NOTIFICATIONS_FOR_MENTIONS = 'kurier-browser-notifications-for-mentions',
  BROWSER_NOTIFICATIONS_FOR_DMS = 'kurier-browser-notifications-for-dms',
  CHAT_INPUT_HEIGHT_VH = 'kurier-chat-input-height-vh',
  THREAD_INPUT_HEIGHT_VH = 'kurier-thread-input-height-vh',
  BROWSER_NOTIFICATIONS_FOR_REPLIES = 'kurier-browser-notifications-for-replies',
  LANGUAGE = 'kurier-language',
  PLUGIN_SLOT_DEBUG = 'kurier-plugin-slot-debug',
  HIDE_OWN_SCREEN_SHARE = 'kurier-hide-own-screen-share',
  ALWAYS_SHOW_VOICE_CONTROLS = 'kurier-always-show-voice-controls',
  SAVED_SERVERS = 'kurier-saved-servers',
  ACTIVE_HOST = 'kurier-active-host',
  HOST_MEMBERS = 'kurier-host-members'
}

export enum SessionStorageKey {
  TOKEN = 'kurier-token',
  PENDING_INVITE = 'kurier-pending-invite'
}

const getLocalStorageItem = (key: LocalStorageKey): string | null => {
  return localStorage.getItem(key);
};

const getLocalStorageItemBool = (
  key: LocalStorageKey,
  defaultValue: boolean = false
): boolean => {
  const item = localStorage.getItem(key);

  if (item === null) {
    return defaultValue ?? false;
  }

  return item === 'true';
};

const setLocalStorageItemBool = (
  key: LocalStorageKey,
  value: boolean
): void => {
  localStorage.setItem(key, value.toString());
};

const getLocalStorageItemAsNumber = (
  key: LocalStorageKey,
  defaultValue?: number
): number | undefined => {
  const item = localStorage.getItem(key);

  if (item === null) {
    return defaultValue;
  }

  const parsed = parseInt(item, 10);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const getLocalStorageItemAsJSON = <T>(
  key: LocalStorageKey,
  defaultValue: T | undefined = undefined
): T | undefined => {
  const item = localStorage.getItem(key);

  if (item) {
    return JSON.parse(item) as T;
  }

  return defaultValue;
};

const setLocalStorageItemAsJSON = <T>(key: LocalStorageKey, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const setLocalStorageItem = (key: LocalStorageKey, value: string): void => {
  localStorage.setItem(key, value);
};

const removeLocalStorageItem = (key: LocalStorageKey): void => {
  localStorage.removeItem(key);
};

const getSessionStorageItem = (key: SessionStorageKey): string | null => {
  return sessionStorage.getItem(key);
};

const setSessionStorageItem = (key: SessionStorageKey, value: string): void => {
  sessionStorage.setItem(key, value);
};

const removeSessionStorageItem = (key: SessionStorageKey): void => {
  sessionStorage.removeItem(key);
};

export {
  getLocalStorageItem,
  getLocalStorageItemAsJSON,
  getLocalStorageItemAsNumber,
  getLocalStorageItemBool,
  getSessionStorageItem,
  removeLocalStorageItem,
  removeSessionStorageItem,
  setLocalStorageItem,
  setLocalStorageItemAsJSON,
  setLocalStorageItemBool,
  setSessionStorageItem
};
