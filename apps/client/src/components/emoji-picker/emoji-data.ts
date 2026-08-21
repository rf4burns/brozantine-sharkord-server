import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import type { EmojiItem } from '@tiptap/extension-emoji';
import { gitHubEmojis } from '@tiptap/extension-emoji';
import { getTwemojiUrl } from './twemoji';

const EMOJI_CATEGORIES = [
  { id: 'recent', label: 'Frequently used', icon: '🕐' },
  { id: 'people & body', label: 'People', icon: '😀' },
  { id: 'animals & nature', label: 'Nature', icon: '🐻' },
  { id: 'food & drink', label: 'Food', icon: '🍕' },
  { id: 'activities', label: 'Activities', icon: '⚽' },
  { id: 'travel & places', label: 'Travel', icon: '✈️' },
  { id: 'objects', label: 'Objects', icon: '💡' },
  { id: 'symbols', label: 'Symbols', icon: '💕' },
  { id: 'flags', label: 'Flags', icon: '🏳️' }
];

type EmojiCategoryId = (typeof EMOJI_CATEGORIES)[number]['id'];

const withTwemojiFallback = <
  T extends { emoji?: string; fallbackImage?: string }
>(
  emoji: T
): T => ({
  ...emoji,
  fallbackImage:
    (emoji.emoji ? getTwemojiUrl(emoji.emoji) : undefined) ??
    emoji.fallbackImage
});

const toTEmojiItem = (emoji: EmojiItem): TEmojiItem => {
  const withTwemoji = withTwemojiFallback(emoji);

  return {
    name: withTwemoji.name,
    shortcodes: withTwemoji.shortcodes,
    fallbackImage: withTwemoji.fallbackImage,
    emoji: withTwemoji.emoji
  };
};

// full TipTap catalog with Twemoji image URLs (matches native client style)
const TWEMOJI_GITHUB_EMOJIS = gitHubEmojis.map(withTwemojiFallback);

const emojiByNameOrShortcode = new Map<string, EmojiItem>();

for (const emoji of TWEMOJI_GITHUB_EMOJIS) {
  emojiByNameOrShortcode.set(emoji.name, emoji);

  for (const shortcode of emoji.shortcodes) {
    emojiByNameOrShortcode.set(shortcode, emoji);
  }
}

const resolveUnicodeEmojiImage = (name: string): string | undefined =>
  emojiByNameOrShortcode.get(name)?.fallbackImage;

const processEmojis = () => {
  const grouped: Record<string, TEmojiItem[]> = {};
  const all: TEmojiItem[] = [];

  for (const category of EMOJI_CATEGORIES) {
    grouped[category.id] = [];
  }

  for (const emoji of gitHubEmojis) {
    if (!emoji.emoji || emoji.group === undefined || emoji.group === null)
      continue;
    if (emoji.group === 'components' || emoji.group === 'GitHub') continue;

    if (emoji.group === '' && emoji.name.includes('regional_indicator_'))
      emoji.group = EMOJI_CATEGORIES[7].id;
    if (emoji.group === '') emoji.group = EMOJI_CATEGORIES[1].id;

    const converted = toTEmojiItem(emoji);

    if (grouped[emoji.group]) {
      grouped[emoji.group].push(converted);
      all.push(converted);
    }
  }

  return { grouped, all };
};

const { grouped: GROUPED_EMOJIS, all: ALL_EMOJIS } = processEmojis();

const searchEmojis = (emojis: TEmojiItem[], query: string): TEmojiItem[] => {
  if (!query.trim()) return emojis;

  const lowerQuery = query.toLowerCase();

  return emojis.filter(
    (emoji) =>
      emoji.name.toLowerCase().includes(lowerQuery) ||
      emoji.shortcodes.some((sc) => sc.toLowerCase().includes(lowerQuery))
  );
};

const getEmojisByCategory = (categoryId: EmojiCategoryId): TEmojiItem[] =>
  GROUPED_EMOJIS[categoryId] || [];

const GRID_COLS = 8;
const EMOJI_SIZE = 32; // px
const ROW_HEIGHT = 36; // px (emoji size + gap)

export {
  ALL_EMOJIS,
  EMOJI_CATEGORIES,
  EMOJI_SIZE,
  getEmojisByCategory,
  GRID_COLS,
  GROUPED_EMOJIS,
  resolveUnicodeEmojiImage,
  ROW_HEIGHT,
  searchEmojis,
  toTEmojiItem,
  TWEMOJI_GITHUB_EMOJIS,
  withTwemojiFallback,
  type EmojiCategoryId
};
