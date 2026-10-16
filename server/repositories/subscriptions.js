import { addDays, todayISO } from '../utils/dates.js';

const PUBLIC_COLUMNS = `
  id, service_name, service_key, logo_key, price, currency_code, billing_cycle,
  category, next_renewal_date, status, plan_name, notes, created_at, updated_at
`;

// PostgreSQL returns DATE and NUMERIC values in driver-specific shapes, so every
// row is normalised to the plain strings/numbers the rest of the app expects.
function mapRow(row) {
  if (!row) return row;
  const renewal = row.next_renewal_date;
  return {
    ...row,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    next_renewal_date:
      renewal instanceof Date
        ? renewal.toISOString().slice(0, 10)
        : String(renewal).slice(0, 10),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

export function createSubscriptionsRepository(db) {
  return {
    // Every query is scoped by user_id, so one account can never read or write
    // another account's rows even if it guesses a record id.
    async list(userId, filters = {}, options = {}) {
      const { q, category, status, billingCycle, renewalWindow, sortColumn, sortOrder } = filters;
      const today = options.today || todayISO();
      const clauses = ['user_id = $1'];
      const params = [userId];
      let p = 1;

      if (q) {
        p++;
        const like = `%${q.toLowerCase()}%`;
        clauses.push(
          `(LOWER(service_name) LIKE $${p} OR LOWER(category) LIKE $${p} OR LOWER(COALESCE(plan_name, '')) LIKE $${p})`,
        );
        params.push(like);
      }
      if (category) {
        p++;
        clauses.push(`category = $${p}`);
        params.push(category);
      }
      if (status) {
        p++;
        clauses.push(`status = $${p}`);
        params.push(status);
      }
      if (billingCycle) {
        p++;
        clauses.push(`billing_cycle = $${p}`);
        params.push(billingCycle);
      }
      if (renewalWindow) {
        switch (renewalWindow) {
          case 'today':
            p++;
            clauses.push(`next_renewal_date = $${p}::date`);
            params.push(today);
            break;
          case 'next7':
            p++;
            clauses.push(`next_renewal_date >= $${p}::date`);
            params.push(today);
            p++;
            clauses.push(`next_renewal_date <= $${p}::date`);
            params.push(addDays(today, 7));
            break;
          case 'next30':
            p++;
            clauses.push(`next_renewal_date >= $${p}::date`);
            params.push(today);
            p++;
            clauses.push(`next_renewal_date <= $${p}::date`);
            params.push(addDays(today, 30));
            break;
          case 'overdue':
            p++;
            clauses.push(`next_renewal_date < $${p}::date`);
            params.push(today);
            break;
          default:
            break;
        }
      }

      const where = `WHERE ${clauses.join(' AND ')}`;
      const sql = `SELECT ${PUBLIC_COLUMNS} FROM subscriptions ${where} ORDER BY ${sortColumn} ${sortOrder}`;
      const result = await db.query(sql, params);
      return result.rows.map(mapRow);
    },

    async listAll(userId) {
      const result = await db.query(
        `SELECT ${PUBLIC_COLUMNS} FROM subscriptions WHERE user_id = $1 ORDER BY id`,
        [userId],
      );
      return result.rows.map(mapRow);
    },

    async getById(userId, id) {
      const result = await db.query(
        `SELECT ${PUBLIC_COLUMNS} FROM subscriptions WHERE id = $1 AND user_id = $2`,
        [id, userId],
      );
      return result.rows[0] ? mapRow(result.rows[0]) : null;
    },

    async insert(userId, data) {
      const result = await db.query(
        `INSERT INTO subscriptions (
          user_id, service_name, service_key, logo_key, price, currency_code, billing_cycle,
          category, next_renewal_date, status, plan_name, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10, $11, $12, NOW(), NOW())
        RETURNING ${PUBLIC_COLUMNS}`,
        [
          userId,
          data.service_name,
          data.service_key || null,
          data.logo_key || null,
          data.price,
          data.currency_code,
          data.billing_cycle,
          data.category,
          data.next_renewal_date,
          data.status || 'active',
          data.plan_name || null,
          data.notes || null,
        ],
      );
      return mapRow(result.rows[0]);
    },

    async update(userId, id, data) {
      const result = await db.query(
        `UPDATE subscriptions SET
          service_name = $1, service_key = $2, logo_key = $3, price = $4, currency_code = $5,
          billing_cycle = $6, category = $7, next_renewal_date = $8::date, status = $9,
          plan_name = $10, notes = $11, updated_at = NOW()
        WHERE id = $12 AND user_id = $13
        RETURNING ${PUBLIC_COLUMNS}`,
        [
          data.service_name,
          data.service_key || null,
          data.logo_key || null,
          data.price,
          data.currency_code,
          data.billing_cycle,
          data.category,
          data.next_renewal_date,
          data.status || 'active',
          data.plan_name || null,
          data.notes || null,
          id,
          userId,
        ],
      );
      return result.rows[0] ? mapRow(result.rows[0]) : null;
    },

    async updateStatus(userId, id, status) {
      const result = await db.query(
        `UPDATE subscriptions SET status = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING ${PUBLIC_COLUMNS}`,
        [status, id, userId],
      );
      if (!result.rows[0]) return null;
      return mapRow(result.rows[0]);
    },

    async remove(userId, id) {
      const result = await db.query('DELETE FROM subscriptions WHERE id = $1 AND user_id = $2', [
        id,
        userId,
      ]);
      return result.rowCount > 0;
    },

    async countByStatus(userId) {
      const result = await db.query(
        'SELECT status, COUNT(*) AS count FROM subscriptions WHERE user_id = $1 GROUP BY status',
        [userId],
      );
      const counts = { active: 0, paused: 0, cancelled: 0 };
      for (const row of result.rows) {
        counts[row.status] = Number(row.count);
      }
      return counts;
    },
  };
}
