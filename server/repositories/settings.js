const PUBLIC_COLUMNS = `
  id, preferred_currency, monthly_budget, budget_currency, reminder_thresholds,
  created_at, updated_at
`;

const DEFAULT_SETTINGS = {
  id: 1,
  preferred_currency: 'USD',
  monthly_budget: null,
  budget_currency: null,
  reminder_thresholds: [3, 7],
  created_at: null,
  updated_at: null,
};

function parseThresholds(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return DEFAULT_SETTINGS.reminder_thresholds;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : DEFAULT_SETTINGS.reminder_thresholds;
  } catch {
    return DEFAULT_SETTINGS.reminder_thresholds;
  }
}

function mapRow(row) {
  if (!row) return DEFAULT_SETTINGS;
  return {
    id: Number(row.id),
    preferred_currency: row.preferred_currency,
    monthly_budget:
      row.monthly_budget === null || row.monthly_budget === undefined
        ? null
        : Number(row.monthly_budget),
    budget_currency: row.budget_currency,
    reminder_thresholds: parseThresholds(row.reminder_thresholds),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

export function createSettingsRepository(db) {
  return {
    async get() {
      const result = await db.query(
        `SELECT ${PUBLIC_COLUMNS} FROM settings WHERE id = 1`,
      );
      if (result.rows[0]) return mapRow(result.rows[0]);

      // First run: create the singleton settings row so the UI always has defaults.
      const inserted = await db.query(
        `INSERT INTO settings (id) VALUES (1)
         ON CONFLICT (id) DO UPDATE SET updated_at = settings.updated_at
         RETURNING ${PUBLIC_COLUMNS}`,
      );
      if (inserted.rows[0]) return mapRow(inserted.rows[0]);

      const again = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM settings WHERE id = 1`);
      return mapRow(again.rows[0]);
    },

    async save(data) {
      const thresholds = JSON.stringify(data.reminder_thresholds);
      await db.query(
        `INSERT INTO settings (id, preferred_currency, monthly_budget, budget_currency, reminder_thresholds, created_at, updated_at)
         VALUES (1, $1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           preferred_currency = EXCLUDED.preferred_currency,
           monthly_budget = EXCLUDED.monthly_budget,
           budget_currency = EXCLUDED.budget_currency,
           reminder_thresholds = EXCLUDED.reminder_thresholds,
           updated_at = NOW()`,
        [
          data.preferred_currency,
          data.monthly_budget === undefined ? null : data.monthly_budget,
          data.budget_currency === undefined ? null : data.budget_currency,
          thresholds,
        ],
      );
      return this.get();
    },
  };
}
