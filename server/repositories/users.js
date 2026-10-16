const PUBLIC_COLUMNS = 'id, name, email, created_at, updated_at';

function mapUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function createUsersRepository(db) {
  return {
    async create({ name, email, passwordHash }) {
      const result = await db.query(
        `INSERT INTO users (name, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING ${PUBLIC_COLUMNS}`,
        [String(name).trim(), normalizeEmail(email), passwordHash],
      );
      return mapUser(result.rows[0]);
    },

    async findByEmail(email) {
      const result = await db.query(
        `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = $1`,
        [normalizeEmail(email)],
      );
      return result.rows[0] || null;
    },

    async findById(id) {
      const result = await db.query(
        `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
        [id],
      );
      return mapUser(result.rows[0]);
    },

    async updatePasswordHash(id, passwordHash) {
      await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
        passwordHash,
        id,
      ]);
    },
  };
}
