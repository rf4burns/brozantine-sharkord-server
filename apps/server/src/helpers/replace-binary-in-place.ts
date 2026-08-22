import { getErrorMessage } from '@kurier/shared';
import { chmod, rename, unlink, writeFile } from 'fs/promises';
import path from 'path';

const fsErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined;
  }

  const { code } = error as { code?: unknown };

  return typeof code === 'string' ? code : undefined;
};

const binaryDirectoryWriteError = (
  installDir: string,
  error: unknown
): Error => {
  const code = fsErrorCode(error);

  if (code === 'EACCES' || code === 'EPERM') {
    return new Error(
      `Cannot write an update into ${installDir}. Give the Kurier service user write access to that directory, then try again.`
    );
  }

  return error instanceof Error ? error : new Error(getErrorMessage(error));
};

const replaceBinaryInPlace = async (
  currentPath: string,
  fileData: Uint8Array
): Promise<void> => {
  const installDir = path.dirname(currentPath);
  const newPath = path.join(installDir, `${path.basename(currentPath)}.new`);
  const oldPath = `${currentPath}.old`;

  const fail = (error: unknown): never => {
    throw binaryDirectoryWriteError(installDir, error);
  };

  try {
    await writeFile(newPath, fileData);
    await chmod(newPath, 0o755);
  } catch (error) {
    await unlink(newPath).catch(() => undefined);
    fail(error);
  }

  try {
    await rename(currentPath, oldPath);
  } catch (error) {
    await unlink(newPath).catch(() => undefined);
    fail(error);
  }

  try {
    await rename(newPath, currentPath);
  } catch (error) {
    await rename(oldPath, currentPath).catch(() => undefined);
    await unlink(newPath).catch(() => undefined);
    fail(error);
  }
};

export { binaryDirectoryWriteError, replaceBinaryInPlace };
