import { OWNER_ROLE_ID, Permission } from '@kurier/shared';
import { describe, expect, test } from 'bun:test';
import { initTest } from '../../__tests__/helpers';

describe('roles router', () => {
  test('should throw when user lacks permissions (getAll)', async () => {
    const { caller } = await initTest(2);

    await expect(caller.roles.getAll()).rejects.toThrow(
      'Insufficient permissions'
    );
  });

  test('should throw when user lacks permissions (add)', async () => {
    const { caller } = await initTest(2);

    await expect(caller.roles.add()).rejects.toThrow(
      'Insufficient permissions'
    );
  });

  test('should throw when user lacks permissions (update)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.roles.update({
        roleId: 2,
        name: 'Updated Role',
        color: '#ff0000',
        permissions: [Permission.SEND_MESSAGES],
        hoist: false,
        storageQuotaOverrideEnabled: false,
        storageSpaceQuota: 0
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (delete)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.roles.delete({
        roleId: 2
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (setDefault)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.roles.setDefault({
        roleId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should get all roles', async () => {
    const { caller } = await initTest();

    const roles = await caller.roles.getAll();

    expect(roles).toBeDefined();
    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThanOrEqual(2);
  });

  test('should create new role', async () => {
    const { caller } = await initTest();

    const roleId = await caller.roles.add();

    expect(roleId).toBeDefined();
    expect(typeof roleId).toBe('number');
    expect(roleId).toBeGreaterThan(0);

    const roles = await caller.roles.getAll();
    const newRole = roles.find((r) => r.id === roleId);

    expect(newRole).toBeDefined();
    expect(newRole!.name).toBe('New Role');
    expect(newRole!.color).toBe('#ffffff');
    expect(newRole!.isDefault).toBe(false);
    expect(newRole!.isPersistent).toBe(false);
    expect(newRole!.storageQuotaOverrideEnabled).toBe(false);
    expect(newRole!.storageSpaceQuota).toBe(0);
  });

  test('should update existing role', async () => {
    const { caller } = await initTest();

    const roleId = await caller.roles.add();

    await caller.roles.update({
      roleId,
      name: 'Updated Role Name',
      color: '#ff5500',
      permissions: [Permission.SEND_MESSAGES, Permission.UPLOAD_FILES],
      hoist: false,
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0
    });

    const roles = await caller.roles.getAll();
    const updatedRole = roles.find((r) => r.id === roleId);

    expect(updatedRole).toBeDefined();
    expect(updatedRole!.name).toBe('Updated Role Name');
    expect(updatedRole!.color).toBe('#ff5500');
    expect(updatedRole!.permissions).toContain(Permission.SEND_MESSAGES);
    expect(updatedRole!.permissions).toContain(Permission.UPLOAD_FILES);
    expect(updatedRole!.permissions.length).toBe(2);
    expect(updatedRole!.storageQuotaOverrideEnabled).toBe(false);
    expect(updatedRole!.storageSpaceQuota).toBe(0);
  });

  test('should update role storage override settings', async () => {
    const { caller } = await initTest();

    const roleId = await caller.roles.add();

    await caller.roles.update({
      roleId,
      name: 'Storage Role',
      color: '#336699',
      permissions: [Permission.UPLOAD_FILES],
      hoist: false,
      storageQuotaOverrideEnabled: true,
      storageSpaceQuota: 1024 * 1024 * 1024
    });

    const roles = await caller.roles.getAll();
    const updatedRole = roles.find((r) => r.id === roleId);

    expect(updatedRole).toBeDefined();
    expect(updatedRole!.storageQuotaOverrideEnabled).toBe(true);
    expect(updatedRole!.storageSpaceQuota).toBe(1024 * 1024 * 1024);
  });

  test('should reject invalid role storage quota', async () => {
    const { caller } = await initTest();

    const roleId = await caller.roles.add();

    await expect(
      caller.roles.update({
        roleId,
        name: 'Invalid Storage Role',
        color: '#336699',
        permissions: [Permission.UPLOAD_FILES],
        hoist: false,
        storageQuotaOverrideEnabled: true,
        storageSpaceQuota: -1
      })
    ).rejects.toThrow();
  });

  test('should not allow updating Owner role permissions', async () => {
    const { caller } = await initTest();

    await caller.roles.update({
      roleId: 1,
      name: 'Owner',
      color: '#ff0000',
      permissions: [Permission.SEND_MESSAGES],
      hoist: false,
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0
    });

    const roles = await caller.roles.getAll();
    const ownerRole = roles.find((r) => r.id === 1);

    expect(ownerRole).toBeDefined();
    expect(ownerRole!.permissions.length).toBeGreaterThan(1);
  });

  test('should delete non-persistent role', async () => {
    const { caller } = await initTest();

    const roleId = await caller.roles.add();

    const rolesBefore = await caller.roles.getAll();
    expect(rolesBefore.find((r) => r.id === roleId)).toBeDefined();

    await caller.roles.delete({ roleId });

    const rolesAfter = await caller.roles.getAll();
    expect(rolesAfter.find((r) => r.id === roleId)).toBeUndefined();
  });

  test('should throw when deleting persistent role', async () => {
    const { caller } = await initTest();

    await expect(
      caller.roles.delete({
        roleId: 1
      })
    ).rejects.toThrow('Cannot delete a persistent role');
  });

  test('should throw when deleting default role', async () => {
    const { caller } = await initTest();

    const newRoleId = await caller.roles.add();
    await caller.roles.setDefault({ roleId: newRoleId });

    await expect(
      caller.roles.delete({
        roleId: newRoleId
      })
    ).rejects.toThrow('Cannot delete the default role');
  });

  test('should throw when deleting non-existing role', async () => {
    const { caller } = await initTest();

    await expect(
      caller.roles.delete({
        roleId: 999999
      })
    ).rejects.toThrow('Role not found');
  });

  test('should set new default role', async () => {
    const { caller } = await initTest();

    const newRoleId = await caller.roles.add();

    await caller.roles.setDefault({ roleId: newRoleId });

    const roles = await caller.roles.getAll();
    const newDefaultRole = roles.find((r) => r.id === newRoleId);
    const oldDefaultRole = roles.find((r) => r.id === 2);

    expect(newDefaultRole!.isDefault).toBe(true);
    expect(oldDefaultRole!.isDefault).toBe(false);
  });

  test('should throw when setting non-existing role as default', async () => {
    const { caller } = await initTest();

    await expect(
      caller.roles.setDefault({
        roleId: 999999
      })
    ).rejects.toThrow('Role not found');
  });

  test('should create multiple roles', async () => {
    const { caller } = await initTest();

    const initialRoles = await caller.roles.getAll();
    const initialCount = initialRoles.length;

    await caller.roles.add();
    await caller.roles.add();
    await caller.roles.add();

    const finalRoles = await caller.roles.getAll();

    expect(finalRoles.length).toBe(initialCount + 3);
  });

  test('should update role with empty permissions array', async () => {
    const { caller } = await initTest();

    const roleId = await caller.roles.add();

    await caller.roles.update({
      roleId,
      name: 'No Permissions Role',
      color: '#000000',
      permissions: [],
      hoist: false,
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0
    });

    const roles = await caller.roles.getAll();
    const role = roles.find((r) => r.id === roleId);

    expect(role).toBeDefined();
    expect(role!.permissions.length).toBe(0);
  });

  test('should update role with multiple permissions', async () => {
    const { caller } = await initTest();

    const roleId = await caller.roles.add();

    const permissions = [
      Permission.SEND_MESSAGES,
      Permission.UPLOAD_FILES,
      Permission.MANAGE_CHANNELS,
      Permission.MANAGE_ROLES
    ];

    await caller.roles.update({
      roleId,
      name: 'Multi Permission Role',
      color: '#00ff00',
      permissions,
      hoist: false,
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0
    });

    const roles = await caller.roles.getAll();
    const role = roles.find((r) => r.id === roleId);

    expect(role).toBeDefined();
    expect(role!.permissions.length).toBe(permissions.length);
    permissions.forEach((perm) => {
      expect(role!.permissions).toContain(perm);
    });
  });

  test('should persist hoist on a non-default role', async () => {
    const { caller } = await initTest();
    const roleId = await caller.roles.add();

    await caller.roles.update({
      roleId,
      name: 'Hoisted Role',
      color: '#abcdef',
      permissions: [],
      hoist: true,
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0
    });

    const roles = await caller.roles.getAll();
    const role = roles.find((r) => r.id === roleId);

    expect(role?.hoist).toBe(true);
  });

  test('should ignore hoist on the default role', async () => {
    const { caller } = await initTest();

    await caller.roles.update({
      roleId: 2,
      name: 'Member',
      color: '#99aab5',
      permissions: [Permission.SEND_MESSAGES],
      hoist: true,
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0
    });

    const roles = await caller.roles.getAll();
    const defaultRole = roles.find((role) => role.isDefault);

    expect(defaultRole?.hoist).toBe(false);
  });

  test('should ignore hoist on the owner role', async () => {
    const { caller } = await initTest();

    await caller.roles.update({
      roleId: OWNER_ROLE_ID,
      name: 'Owner',
      color: '#ff0000',
      permissions: Object.values(Permission),
      hoist: true,
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0
    });

    const roles = await caller.roles.getAll();
    const ownerRole = roles.find((role) => role.id === OWNER_ROLE_ID);

    expect(ownerRole?.hoist).toBe(false);
  });

  test('should reorder roles below the owner and above the default role', async () => {
    const { caller } = await initTest();
    const newRoleId = await caller.roles.add();

    await caller.roles.reorder({
      roleIds: [OWNER_ROLE_ID, newRoleId, 3, 2]
    });

    const roles = await caller.roles.getAll();

    expect(roles.map((role) => role.id)).toEqual([
      OWNER_ROLE_ID,
      newRoleId,
      3,
      2
    ]);
    expect(roles[0]?.position).toBeGreaterThan(roles[1]!.position);
    expect(roles[roles.length - 1]?.isDefault).toBe(true);
  });

  test('should reject reordering that moves the owner role', async () => {
    const { caller } = await initTest();

    await expect(
      caller.roles.reorder({
        roleIds: [3, OWNER_ROLE_ID, 2]
      })
    ).rejects.toThrow('The owner role must stay at the top of the hierarchy.');
  });

  test('should reject reordering that moves the default role', async () => {
    const { caller } = await initTest();

    await expect(
      caller.roles.reorder({
        roleIds: [OWNER_ROLE_ID, 2, 3]
      })
    ).rejects.toThrow(
      'The default role must stay at the bottom of the hierarchy.'
    );
  });

  test('should throw when user lacks permissions (reorder)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.roles.reorder({
        roleIds: [OWNER_ROLE_ID, 3, 2]
      })
    ).rejects.toThrow('Insufficient permissions');
  });
});
