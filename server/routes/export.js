import { buildSubscriptionsCsv } from '../services/csv.js';
import { todayISO } from '../utils/dates.js';

export function createExportHandler(subscriptionsService) {
  return async (req, res, next) => {
    try {
      const subscriptions = await subscriptionsService.listAll(req.user.id);
      const csv = buildSubscriptionsCsv(subscriptions);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="submate-subscriptions-${todayISO()}.csv"`,
      );
      res.send(csv);
    } catch (error) {
      next(error);
    }
  };
}
