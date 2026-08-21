import { randomUUIDv7 } from 'bun';
import fs from 'fs';
import path from 'path';
import * as yazl from 'yazl';
import { snapshotDatabaseTo } from '../db';
import { CONFIG_INI_PATH, PUBLIC_PATH, TMP_PATH } from './paths';

const addDirectoryToZip = (
  zipfile: yazl.ZipFile,
  dir: string,
  zipPrefix: string
) => {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const zipPath = path.posix.join(zipPrefix, entry.name);

    if (entry.isDirectory()) {
      addDirectoryToZip(zipfile, fullPath, zipPath);
      continue;
    }

    zipfile.addFile(fullPath, zipPath);
  }
};

const getBackupFilename = (now = new Date()) => {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  return `sharkord-backup-${year}-${month}-${day}.zip`;
};

const createBackupZip = async (): Promise<{
  zipfile: yazl.ZipFile;
  snapshotPath: string;
  filename: string;
}> => {
  const snapshotPath = path.join(TMP_PATH, `backup-${randomUUIDv7()}.sqlite`);

  snapshotDatabaseTo(snapshotPath);

  const zipfile = new yazl.ZipFile();

  zipfile.addFile(snapshotPath, 'db.sqlite');

  if (fs.existsSync(CONFIG_INI_PATH)) {
    zipfile.addFile(CONFIG_INI_PATH, 'config.ini');
  }

  addDirectoryToZip(zipfile, PUBLIC_PATH, 'public');

  return {
    zipfile,
    snapshotPath,
    filename: getBackupFilename()
  };
};

export { createBackupZip, getBackupFilename };
