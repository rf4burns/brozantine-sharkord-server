import { Permission } from '@kurier/shared';
import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { rolePermissions } from '../../db/schema';
import { getYoutubeVideoIdFromUrl } from '../../helpers/youtube-urls';

describe('youtube urls', () => {
  test('parses watch, short, and bare ids', () => {
    expect(
      getYoutubeVideoIdFromUrl('https://www.youtube.com/watch?v=dQw4w9wgGcQ')
    ).toBe('dQw4w9wgGcQ');
    expect(getYoutubeVideoIdFromUrl('https://youtu.be/dQw4w9wgGcQ')).toBe(
      'dQw4w9wgGcQ'
    );
    expect(getYoutubeVideoIdFromUrl('dQw4w9wgGcQ')).toBe('dQw4w9wgGcQ');
  });

  test('rejects non-youtube urls', () => {
    expect(
      getYoutubeVideoIdFromUrl('https://example.com/watch?v=dQw4w9wgGcQ')
    ).toBeUndefined();
  });
});

describe('others.resolveYoutube', () => {
  test('rejects invalid video input', async () => {
    const { caller } = await initTest(1);

    await expect(
      caller.others.resolveYoutube({ video: 'https://example.com/nope' })
    ).rejects.toThrow('That is not a valid YouTube video.');
  });

  test('rejects missing embed permission', async () => {
    await tdb
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, 2),
          eq(rolePermissions.permission, Permission.EMBED_LINKS)
        )
      );

    const { caller } = await initTest(2);

    await expect(
      caller.others.resolveYoutube({ video: 'dQw4w9wgGcQ' })
    ).rejects.toThrow('Insufficient permissions');
  });
});
