import { t } from '../../utils/trpc';
import { addChannelRoute } from './add-channel';
import { deleteChannelRoute } from './delete-channel';
import { deletePermissionsRoute } from './delete-permissions';
import {
  onChannelCreateRoute,
  onChannelDeleteRoute,
  onChannelNotificationOverrideRoute,
  onChannelPermissionsUpdateRoute,
  onChannelReadStatesDeltaRoute,
  onChannelReadStatesUpdateRoute,
  onChannelUpdateRoute
} from './events';
import { getChannelRoute } from './get-channel';
import { getPermissionsRoute } from './get-permissions';
import { markAsReadRoute } from './mark-as-read';
import { reorderChannelsRoute } from './reorder-channels';
import { setNotificationOverrideRoute } from './set-notification-override';
import { updateChannelRoute } from './update-channel';
import { updatePermissionsRoute } from './update-permission';
import { updateVoiceStatusRoute } from './update-voice-status';

export const channelsRouter = t.router({
  add: addChannelRoute,
  update: updateChannelRoute,
  delete: deleteChannelRoute,
  get: getChannelRoute,
  updatePermissions: updatePermissionsRoute,
  getPermissions: getPermissionsRoute,
  deletePermissions: deletePermissionsRoute,
  reorder: reorderChannelsRoute,
  markAsRead: markAsReadRoute,
  setNotificationOverride: setNotificationOverrideRoute,
  updateVoiceStatus: updateVoiceStatusRoute,
  onCreate: onChannelCreateRoute,
  onDelete: onChannelDeleteRoute,
  onUpdate: onChannelUpdateRoute,
  onPermissionsUpdate: onChannelPermissionsUpdateRoute,
  onReadStateUpdate: onChannelReadStatesUpdateRoute,
  onReadStateDelta: onChannelReadStatesDeltaRoute,
  onNotificationOverride: onChannelNotificationOverrideRoute
});
