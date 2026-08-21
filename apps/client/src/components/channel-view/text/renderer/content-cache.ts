import { isEmojiOnlyMessage, type TJoinedMessage } from '@kurier/shared';
import parse, { type DOMNode } from 'html-react-parser';
import type { ReactNode } from 'react';
import {
  collectGifUrlsForMessage,
  getDisplayHtmlWithoutGifs,
  isVisuallyEmptyHtml
} from './gif-urls';
import { serializer } from './serializer';

const MAX_CACHE_SIZE = 500;

const parsedMessageCache = new Map<string, ReactNode | null>();
const emojiOnlyCache = new Map<string, boolean>();

const trimCache = (cache: Map<string, unknown>) => {
  if (cache.size < MAX_CACHE_SIZE) {
    return;
  }

  const oldestKey = cache.keys().next().value;

  if (oldestKey) {
    cache.delete(oldestKey);
  }
};

const getMessageContentCacheKey = (message: TJoinedMessage) =>
  `${message.id}:${message.editedAt ?? 0}:${message.content ?? ''}:${JSON.stringify(message.metadata ?? null)}`;

const getParsedMessageHtml = (message: TJoinedMessage) => {
  const cacheKey = getMessageContentCacheKey(message);

  if (parsedMessageCache.has(cacheKey)) {
    return parsedMessageCache.get(cacheKey);
  }

  trimCache(parsedMessageCache);

  const gifUrls = collectGifUrlsForMessage(message);
  const displayHtml = getDisplayHtmlWithoutGifs(message.content ?? '', gifUrls);

  if (isVisuallyEmptyHtml(displayHtml)) {
    parsedMessageCache.set(cacheKey, null);

    return null;
  }

  const parsed = parse(displayHtml, {
    replace: (domNode: DOMNode) => serializer(domNode, message.id)
  });

  parsedMessageCache.set(cacheKey, parsed);

  return parsed;
};

const getIsEmojiOnly = (message: TJoinedMessage) => {
  const cacheKey = getMessageContentCacheKey(message);

  if (emojiOnlyCache.has(cacheKey)) {
    return emojiOnlyCache.get(cacheKey)!;
  }

  trimCache(emojiOnlyCache);

  const emojiOnly = isEmojiOnlyMessage(message.content);

  emojiOnlyCache.set(cacheKey, emojiOnly);

  return emojiOnly;
};

export { getIsEmojiOnly, getParsedMessageHtml };
