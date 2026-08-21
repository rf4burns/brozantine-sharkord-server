import { ActivityLogType, ChannelType, Permission } from '@kurier/shared';
import { describe, expect, test } from 'bun:test';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import {
  activityLog,
  rolePermissions,
  roles,
  userRoles
} from '../../db/schema';

describe('logs router', () => {
  test('should throw when user lacks VIEW_AUDIT_LOG', async () => {
    const { caller } = await initTest(2);

    await expect(caller.activityLog.get({})).rejects.toThrow(
      'Insufficient permissions'
    );
  });

  test('should return activity log entries for a permitted user', async () => {
    await tdb.insert(activityLog).values([
      {
        userId: 1,
        type: ActivityLogType.USER_KICKED,
        details: { reason: 'spam', kickedBy: 1 },
        ip: '10.0.0.1',
        createdAt: Date.now()
      },
      {
        userId: 2,
        type: ActivityLogType.USER_BANNED,
        details: { reason: 'abuse', bannedBy: 1 },
        ip: '10.0.0.2',
        createdAt: Date.now() - 1000
      }
    ]);

    const { caller } = await initTest();
    const result = await caller.activityLog.get({});

    expect(result.items.length).toBeGreaterThanOrEqual(2);
    expect(
      result.items.some((item) => item.type === ActivityLogType.USER_KICKED)
    ).toBe(true);
    expect(result.nextCursor).toBeNull();
  });

  test('should filter activity log by type', async () => {
    await tdb.insert(activityLog).values([
      {
        userId: 1,
        type: ActivityLogType.USER_KICKED,
        details: { reason: undefined, kickedBy: 1 },
        createdAt: Date.now()
      },
      {
        userId: 1,
        type: ActivityLogType.CREATED_CHANNEL,
        details: {
          channelId: 1,
          channelName: 'general',
          type: ChannelType.TEXT
        },
        createdAt: Date.now()
      }
    ]);

    const { caller } = await initTest();
    const result = await caller.activityLog.get({
      types: [ActivityLogType.USER_KICKED]
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every((item) => item.type === ActivityLogType.USER_KICKED)
    ).toBe(true);
  });

  test('should hide ip without VIEW_USER_SENSITIVE_DATA', async () => {
    const [customRole] = await tdb
      .insert(roles)
      .values({
        name: 'Auditor',
        color: '#123456',
        isPersistent: false,
        isDefault: false,
        createdAt: Date.now()
      })
      .returning();

    await tdb.insert(rolePermissions).values({
      roleId: customRole!.id,
      permission: Permission.VIEW_AUDIT_LOG,
      createdAt: Date.now()
    });

    await tdb.insert(userRoles).values({
      userId: 2,
      roleId: customRole!.id,
      createdAt: Date.now()
    });

    await tdb.insert(activityLog).values({
      userId: 1,
      type: ActivityLogType.USER_BANNED,
      details: { reason: 'test', bannedBy: 1 },
      ip: '192.168.0.9',
      createdAt: Date.now()
    });

    const { caller } = await initTest(2);
    const result = await caller.activityLog.get({});

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => item.ip === null)).toBe(true);
  });
});
