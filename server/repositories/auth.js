export function createAuthRepository(db) {
  return {
    async createSession({ tokenHash, userId, expiresAt }) {
      await this.deleteExpiredSessions();
      await db.query(
        `INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [tokenHash, userId, expiresAt],
      );
    },

    async getSessionByTokenHash(tokenHash) {
      const result = await db.query(
        `SELECT s.token_hash, s.user_id, s.expires_at,
                u.id AS uid, u.name, u.email, u.created_at AS user_created_at,
                u.updated_at AS user_updated_at
           FROM auth_sessions s
           JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = $1`,
        [tokenHash],
      );
      const row = result.rows[0];
      if (!row) return null;
      const expiresAt = row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at);
      if (expiresAt.getTime() <= Date.now()) {
        await this.deleteSession(tokenHash);
        return null;
      }
      return {
        token_hash: row.token_hash,
        user_id: Number(row.user_id),
        expires_at: expiresAt.toISOString(),
        user: {
          id: Number(row.uid),
          name: row.name,
          email: row.email,
          created_at:
            row.user_created_at instanceof Date
              ? row.user_created_at.toISOString()
              : row.user_created_at,
          updated_at:
            row.user_updated_at instanceof Date
              ? row.user_updated_at.toISOString()
              : row.user_updated_at,
        },
      };
    },

    async deleteSession(tokenHash) {
      await db.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
    },

    async deleteExpiredSessions() {
      await db.query('DELETE FROM auth_sessions WHERE expires_at < $1', [new Date()]);
    },
  };
}
