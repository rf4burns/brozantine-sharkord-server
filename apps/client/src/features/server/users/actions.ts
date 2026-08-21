import { store } from '@/features/store';
import { cacheHostMembers } from '@/helpers/host-members';
import { getActiveHost } from '@/helpers/saved-hosts';
import { UserStatus, type TJoinedPublicUser } from '@kurier/shared';
import { serverSliceActions } from '../slice';
import { userByIdSelector } from './selectors';

export const setUsers = (users: TJoinedPublicUser[]) => {
  store.dispatch(serverSliceActions.setUsers(users));
  cacheHostMembers(getActiveHost(), store.getState().server.users);
};

export const addUser = (user: TJoinedPublicUser) => {
  store.dispatch(serverSliceActions.addUser(user));
  cacheHostMembers(getActiveHost(), store.getState().server.users);
};

export const updateUser = (
  userId: number,
  user: Partial<TJoinedPublicUser>
) => {
  store.dispatch(serverSliceActions.updateUser({ userId, user }));
  cacheHostMembers(getActiveHost(), store.getState().server.users);
};

export const tombstoneUser = (userId: number, wipe: boolean) => {
  store.dispatch(serverSliceActions.tombstoneUser({ userId, wipe }));
  cacheHostMembers(getActiveHost(), store.getState().server.users);
};

export const handleUserJoin = (user: TJoinedPublicUser) => {
  const state = store.getState();
  const foundUser = userByIdSelector(state, user.id);

  if (foundUser) {
    updateUser(user.id, { ...user, status: UserStatus.ONLINE });
  } else {
    addUser(user);
  }
};
