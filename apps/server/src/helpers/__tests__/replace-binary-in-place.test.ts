import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import {
  binaryDirectoryWriteError,
  replaceBinaryInPlace
} from '../replace-binary-in-place';

describe('binaryDirectoryWriteError', () => {
  test('maps EACCES to a user-facing install-dir message', () => {
    const error = Object.assign(new Error('EACCES: permission denied'), {
      code: 'EACCES'
    });

    expect(binaryDirectoryWriteError('/opt/kurier', error).message).toBe(
      'Cannot write an update into /opt/kurier. Give the Kurier service user write access to that directory, then try again.'
    );
  });

  test('keeps unrelated errors', () => {
    const error = new Error('disk full');

    expect(binaryDirectoryWriteError('/opt/kurier', error)).toBe(error);
  });
});

describe('replaceBinaryInPlace', () => {
  test('swaps in the new bytes and keeps the previous file as .old', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'kurier-replace-'));
    const currentPath = path.join(dir, 'kurier-linux-x64');

    await writeFile(currentPath, 'old-binary');
    await replaceBinaryInPlace(currentPath, Buffer.from('new-binary'));

    expect(await readFile(currentPath, 'utf8')).toBe('new-binary');
    expect(await readFile(`${currentPath}.old`, 'utf8')).toBe('old-binary');
  });
});
