type TEmojiItem = {
  name: string;
  shortcodes: string[];
  fallbackImage?: string;
  emoji?: string;
};

// always prefer Twemoji / fallback images so the web client matches the native app
const shouldUseFallbackImage = (emoji: TEmojiItem): boolean =>
  !!emoji.fallbackImage;

export { shouldUseFallbackImage, type TEmojiItem };
