import { Permission, UploadHeaders } from '@kurier/shared';
import fs from 'fs/promises';
import http from 'http';
import { config } from '../config';
import { userCan } from '../db/queries/roles';
import { getUserByToken } from '../db/queries/users';
import { createBackupZip } from '../helpers/backup';
import { logger } from '../logger';
import {
  createRateLimiter,
  getClientRateLimitKey,
  getRateLimitRetrySeconds
} from '../utils/rate-limiters/rate-limiter';
import { getRequestPathname } from './helpers';

const backupRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.exportBackup.maxRequests,
  windowMs: config.rateLimiters.exportBackup.windowMs
});

const getRequestToken = (req: http.IncomingMessage): string | undefined => {
  const auth = req.headers.authorization;

  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }

  const headerToken = req.headers[UploadHeaders.TOKEN];

  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }

  if (!req.url) {
    return undefined;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const queryToken = url.searchParams.get('token');

    return queryToken?.trim() || undefined;
  } catch {
    return undefined;
  }
};

const backupRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: { info?: { ip?: string } }
) => {
  const key = getClientRateLimitKey(ctx.info?.ip);
  const rateLimit = backupRateLimiter.consume(key);

  if (!rateLimit.allowed) {
    res.setHeader(
      'Retry-After',
      getRateLimitRetrySeconds(rateLimit.retryAfterMs)
    );
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Too many backup requests' }));
    return;
  }

  const user = await getUserByToken(getRequestToken(req));

  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const canManageStorage = await userCan(user.id, Permission.MANAGE_STORAGE);

  if (!canManageStorage) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Insufficient permissions' }));
    return;
  }

  const pathname = getRequestPathname(req);

  if (pathname !== '/backup') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let snapshotPath: string | undefined;

  try {
    const backup = await createBackupZip();

    snapshotPath = backup.snapshotPath;

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${backup.filename}"`
    });

    backup.zipfile.outputStream.pipe(res);

    backup.zipfile.outputStream.on('end', async () => {
      if (!snapshotPath) return;

      try {
        await fs.unlink(snapshotPath);
      } catch {
        // ignore cleanup failures
      }
    });

    backup.zipfile.end();
  } catch (error) {
    logger.error('Failed to create backup: %s', error);

    if (snapshotPath) {
      try {
        await fs.unlink(snapshotPath);
      } catch {
        // ignore cleanup failures
      }
    }

    if (res.headersSent) {
      res.destroy();
      return;
    }

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to create backup' }));
  }
};

export { backupRouteHandler };
