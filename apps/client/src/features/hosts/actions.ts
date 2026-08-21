import { loadApp, setSelectedDmChannelId } from '@/features/app/actions';
import { connect, setDmsOpen } from '@/features/server/actions';
import { mentionUnreadTotalSelector } from '@/features/server/selectors';
import { leaveVoice } from '@/features/server/voice/actions';
import { store } from '@/features/store';
import { findSharedHostForUser } from '@/helpers/host-members';
import {
  extractInviteFromLink,
  getActiveHost,
  getSavedHost,
  normalizeHost,
  removeSavedHost,
  setActiveHost,
  upsertSavedHost
} from '@/helpers/saved-hosts';
import {
  getLocalStorageItemBool,
  LocalStorageKey,
  SessionStorageKey,
  setLocalStorageItem,
  setSessionStorageItem
} from '@/helpers/storage';
import {
  beginHostSwitch,
  cleanup,
  endHostSwitch,
  getTRPCClient
} from '@/lib/trpc';
import { getTrpcError, type TJoinedPublicUser } from '@kurier/shared';
import i18next from 'i18next';
import { toast } from 'sonner';

let pendingDmUserId: number | undefined;

const persistActiveMentionBadge = () => {
  upsertSavedHost({
    host: getActiveHost(),
    mentionUnread: mentionUnreadTotalSelector(store.getState())
  });
};

const applyHostToken = (host: string) => {
  const token = getSavedHost(host)?.token;

  if (!token) {
    return false;
  }

  setSessionStorageItem(SessionStorageKey.TOKEN, token);

  if (getLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN)) {
    setLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN, token);
  }

  return true;
};

const openDmOnCurrentHost = async (userId: number) => {
  const trpc = getTRPCClient();
  const result = await trpc.dms.open.mutate({ userId });

  setDmsOpen(true);
  setSelectedDmChannelId(result.channelId);

  return result.channelId;
};

const flushPendingDm = async () => {
  if (pendingDmUserId == null) {
    return;
  }

  const userId = pendingDmUserId;
  pendingDmUserId = undefined;

  try {
    await openDmOnCurrentHost(userId);
  } catch (error) {
    toast.error(getTrpcError(error, i18next.t('couldNotOpenDM')));
  }
};

const reconnectActiveHost = async () => {
  applyHostToken(getActiveHost());
  upsertSavedHost({ host: getActiveHost(), mentionUnread: 0 });
  await loadApp();

  if (getSavedHost(getActiveHost())?.token) {
    await connect();
  }

  await flushPendingDm();
};

const switchHost = async (host: string) => {
  if (host === getActiveHost()) {
    return;
  }

  persistActiveMentionBadge();
  beginHostSwitch();

  try {
    try {
      await leaveVoice({ reason: 'unknown' });
    } catch {
      // host switch continues even if leave fails
    }
    cleanup({ keepAuth: true });
    setActiveHost(host);
    await reconnectActiveHost();
  } finally {
    endHostSwitch();
  }
};

const addHostFromLink = async (link: string) => {
  const host = normalizeHost(link);

  if (!host) {
    return null;
  }

  const invite = extractInviteFromLink(link);

  if (invite) {
    setSessionStorageItem(SessionStorageKey.PENDING_INVITE, invite);
  }

  const existing = getSavedHost(host);

  if (existing) {
    await switchHost(host);
    return host;
  }

  upsertSavedHost({ host });
  await switchHost(host);
  return host;
};

const removeHost = async (host: string) => {
  const wasActive = host === getActiveHost();

  if (wasActive) {
    persistActiveMentionBadge();
  }

  beginHostSwitch();

  try {
    if (wasActive) {
      try {
        await leaveVoice({ reason: 'unknown' });
      } catch {
        // host removal continues even if leave fails
      }
      cleanup({ keepAuth: true });
    }

    removeSavedHost(host);

    if (wasActive) {
      await reconnectActiveHost();
    }
  } finally {
    endHostSwitch();
  }
};

const openDirectMessage = async (user: TJoinedPublicUser) => {
  const settings = store.getState().server.publicSettings;
  const skipCurrent = settings?.directMessagesEnabled === false;
  const match = findSharedHostForUser(user, { skipCurrent });

  if (!match) {
    toast.error(i18next.t('noSharedServerForDm'));
    return;
  }

  if (match.host !== getActiveHost()) {
    pendingDmUserId = match.userId;
    await switchHost(match.host);
    return;
  }

  try {
    await openDmOnCurrentHost(match.userId);
  } catch (error) {
    toast.error(getTrpcError(error, i18next.t('couldNotOpenDM')));
  }
};

export { addHostFromLink, openDirectMessage, removeHost, switchHost };
