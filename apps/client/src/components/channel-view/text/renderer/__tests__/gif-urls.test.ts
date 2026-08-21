import { describe, expect, test } from 'bun:test';
import {
  extractEmbeddableGifUrls,
  getDisplayHtmlWithoutGifs,
  isEmbeddableGifUrl,
  isGifProviderPage,
  isVisuallyEmptyHtml
} from '../gif-urls';

describe('gif-urls', () => {
  test('accepts .gif paths and CDN hosts', () => {
    expect(
      isEmbeddableGifUrl('https://media.giphy.com/media/abc/giphy.gif')
    ).toBe(true);
    expect(
      isEmbeddableGifUrl('https://i.giphy.com/media/abc/giphy.gif?cid=1')
    ).toBe(true);
    expect(isEmbeddableGifUrl('https://media.tenor.com/xyz/gif')).toBe(true);
    expect(isEmbeddableGifUrl('https://cdn.example.com/funny.gif')).toBe(true);
    expect(isEmbeddableGifUrl('https://media.klipy.com/x/y.webp')).toBe(true);
  });

  test('rejects landing pages and non-gifs', () => {
    expect(isEmbeddableGifUrl('https://giphy.com/gifs/hello-abc')).toBe(false);
    expect(isEmbeddableGifUrl('https://tenor.com/view/hello-gif')).toBe(false);
    expect(isEmbeddableGifUrl('https://example.com/photo.png')).toBe(false);
  });

  test('detects provider landing pages', () => {
    expect(isGifProviderPage('https://giphy.com/gifs/hello-abc')).toBe(true);
    expect(isGifProviderPage('https://tenor.com/view/hello-gif')).toBe(true);
    expect(
      isGifProviderPage('https://media.giphy.com/media/abc/giphy.gif')
    ).toBe(false);
  });

  test('extracts bare and linked gif urls', () => {
    expect(
      extractEmbeddableGifUrls(
        '<p>https://media.giphy.com/media/a/giphy.gif</p>'
      )
    ).toEqual(['https://media.giphy.com/media/a/giphy.gif']);

    expect(
      extractEmbeddableGifUrls(
        '<p><a href="https://media.tenor.com/x/gif">gif</a></p>'
      )
    ).toEqual(['https://media.tenor.com/x/gif']);
  });

  test('strips gif urls leaving other text', () => {
    const html = '<p>lol https://media.giphy.com/media/a/giphy.gif nice</p>';
    const stripped = getDisplayHtmlWithoutGifs(html);

    expect(stripped.includes('giphy.com')).toBe(false);
    expect(isVisuallyEmptyHtml(stripped)).toBe(false);
    expect(stripped.toLowerCase()).toContain('lol');
    expect(stripped.toLowerCase()).toContain('nice');
  });

  test('gif-only message becomes visually empty', () => {
    const html =
      '<p><a href="https://media.giphy.com/media/a/giphy.gif">https://media.giphy.com/media/a/giphy.gif</a></p>';
    const stripped = getDisplayHtmlWithoutGifs(html);

    expect(isVisuallyEmptyHtml(stripped)).toBe(true);
  });
});
