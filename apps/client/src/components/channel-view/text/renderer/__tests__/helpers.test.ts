import type { TJoinedMessage } from '@kurier/shared';
import { describe, expect, test } from 'bun:test';
import {
  extractMessageOpenGraph,
  isPreviewableMediaExtension
} from '../helpers';
import type { TFoundMedia } from '../types';

const baseMessage = {
  id: 1,
  userId: 1,
  channelId: 1,
  content: '',
  files: [],
  reactions: [],
  createdAt: 0,
  updatedAt: null,
  editedAt: null,
  editedBy: null,
  parentMessageId: null,
  pluginId: null,
  replyCount: 0,
  replyTo: null
} as unknown as TJoinedMessage;

describe('embed helpers', () => {
  test('isPreviewableMediaExtension covers image video and audio', () => {
    expect(isPreviewableMediaExtension('.png')).toBe(true);
    expect(isPreviewableMediaExtension('mp4')).toBe(true);
    expect(isPreviewableMediaExtension('.mp3')).toBe(true);
    expect(isPreviewableMediaExtension('.pdf')).toBe(false);
    expect(isPreviewableMediaExtension('txt')).toBe(false);
  });

  test('keeps non-gif open graph cards when a gif is also present', () => {
    const gifUrl = 'https://media.giphy.com/media/a/giphy.gif';
    const message = {
      ...baseMessage,
      content: `<p>${gifUrl}</p>`,
      metadata: [
        {
          kind: 'open_graph' as const,
          url: 'https://example.com/article',
          title: 'Example',
          siteName: 'Example',
          mediaType: 'website',
          description: 'Hello',
          images: ['https://example.com/cover.png'],
          favicons: ['https://example.com/favicon.ico']
        },
        {
          kind: 'open_graph' as const,
          url: 'https://giphy.com/gifs/hello-abc',
          title: 'Giphy',
          siteName: 'Giphy',
          mediaType: 'website',
          images: [gifUrl]
        }
      ]
    } as TJoinedMessage;

    const media: TFoundMedia[] = [{ key: 'gif:1', type: 'image', url: gifUrl }];

    const previews = extractMessageOpenGraph(message, media);

    expect(previews).toHaveLength(1);
    expect(previews[0]?.url).toBe('https://example.com/article');
  });

  test('skips youtube urls from open graph cards', () => {
    const message = {
      ...baseMessage,
      metadata: [
        {
          kind: 'open_graph' as const,
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          title: 'YouTube',
          siteName: 'YouTube',
          mediaType: 'video',
          images: ['https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg']
        }
      ]
    } as TJoinedMessage;

    expect(extractMessageOpenGraph(message, [])).toEqual([]);
  });

  test('dedupes open graph cards by url', () => {
    const message = {
      ...baseMessage,
      metadata: [
        {
          kind: 'open_graph' as const,
          url: 'https://example.com/a',
          title: 'One',
          mediaType: 'website'
        },
        {
          kind: 'open_graph' as const,
          url: 'https://example.com/a',
          title: 'Two',
          mediaType: 'website'
        }
      ]
    } as TJoinedMessage;

    const previews = extractMessageOpenGraph(message, []);

    expect(previews).toHaveLength(1);
    expect(previews[0]?.title).toBe('One');
  });
});
