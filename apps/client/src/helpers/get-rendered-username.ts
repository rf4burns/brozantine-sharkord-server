import { DELETED_USER_IDENTITY_AND_NAME } from '@kurier/shared';

const getRenderedUsername = (user: {
  name: string;
  nickname?: string | null;
}) => {
  if (user.name === DELETED_USER_IDENTITY_AND_NAME) {
    return 'Deleted';
  }

  return user.nickname?.trim() || user.name;
};

export { getRenderedUsername };
