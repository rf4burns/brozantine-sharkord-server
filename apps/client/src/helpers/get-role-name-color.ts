import type { TRole } from '@kurier/shared';

const getRoleNameColor = (roles: TRole[]) => {
  const ranked = [...roles]
    .filter((role) => !role.isDefault && role.color)
    .sort((a, b) => b.position - a.position || a.id - b.id);

  return ranked[0]?.color;
};

export { getRoleNameColor };
