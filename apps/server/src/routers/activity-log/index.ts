import { t } from '../../utils/trpc';
import { getActivityLogRoute } from './get-activity-log';

export const activityLogRouter = t.router({
  get: getActivityLogRoute
});
