import { UploadHeaders } from '@kurier/shared';
import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'fs/promises';
import path from 'path';
import { getMockedToken } from '../../__tests__/helpers';
import { testsBaseUrl } from '../../__tests__/setup';
import { TMP_PATH } from '../../helpers/paths';

describe('/backup', () => {
  afterEach(async () => {
    const files = await fs.readdir(TMP_PATH).catch(() => [] as string[]);

    await Promise.all(
      files
        .filter(
          (file) => file.startsWith('backup-') && file.endsWith('.sqlite')
        )
        .map((file) => fs.unlink(path.join(TMP_PATH, file)).catch(() => {}))
    );
  });

  test('should reject a missing token', async () => {
    const response = await fetch(`${testsBaseUrl}/backup`);

    expect(response.status).toBe(401);
  });

  test('should reject a user without MANAGE_STORAGE', async () => {
    const token = await getMockedToken(2);
    const response = await fetch(`${testsBaseUrl}/backup`, {
      headers: {
        [UploadHeaders.TOKEN]: token
      }
    });

    expect(response.status).toBe(403);
  });

  test('should stream a zip backup for an admin', async () => {
    const token = await getMockedToken(1);
    const response = await fetch(`${testsBaseUrl}/backup`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(response.headers.get('content-disposition')).toContain(
      'sharkord-backup-'
    );

    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
