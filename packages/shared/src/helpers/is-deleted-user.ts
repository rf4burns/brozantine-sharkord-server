import { DELETED_USER_IDENTITY_AND_NAME } from '../statics';

const isDeletedUser = (user: {
  deleted?: boolean | null;
  name?: string | null;
  identity?: string | null;
}) =>
  Boolean(user.deleted) ||
  user.name === DELETED_USER_IDENTITY_AND_NAME ||
  user.identity === DELETED_USER_IDENTITY_AND_NAME;

export { isDeletedUser };
