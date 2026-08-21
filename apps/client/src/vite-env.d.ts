/// <reference types="vite/client" />
/// <reference types="zzfx" />

// Extend the Window interface for global functions
declare global {
  interface Window {
    useToken: (token: string) => Promise<void>;
    openSoundsModal?: () => void;
    printVoiceStats?: () => void;
    DEBUG?: boolean;

    // plugin store exposed for plugins to use imperatively
    __KURIER_STORE__: import('@kurier/shared').TPluginStore;

    // libs exposed for plugins to use
    __KURIER_EXPOSED_LIBS__: {
      createSelector: typeof import('@reduxjs/toolkit').createSelector;
      createCachedSelector: typeof import('re-reselect').createCachedSelector;
    };

    // react and react-dom for plugins to use, injected in main.tsx
    __KURIER_REACT__: typeof import('react');
    __KURIER_REACT_JSX__: typeof import('react/jsx-runtime');
    __KURIER_REACT_JSX_DEV__: typeof import('react/jsx-dev-runtime');
    __KURIER_REACT_DOM__: typeof import('react-dom');
    __KURIER_REACT_DOM_CLIENT__: typeof import('react-dom/client');
  }

  const VITE_APP_VERSION: string;
}

// this provides type definitions for i18n setup
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof import('./locales/en/common.json');
      connect: typeof import('./locales/en/connect.json');
      disconnected: typeof import('./locales/en/disconnected.json');
      sidebar: typeof import('./locales/en/sidebar.json');
      topbar: typeof import('./locales/en/topbar.json');
      dialogs: typeof import('./locales/en/dialogs.json');
      settings: typeof import('./locales/en/settings.json');
      permissions: typeof import('./locales/en/permissions.json');
    };
  }
}

export {};
