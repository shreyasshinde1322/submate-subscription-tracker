const ACCOUNT_COLUMNS = 'id, username, password_salt, password_hash, created_at';

export function createAuthRepository(db) {
  return {
    async getLocalAccount() {
      const result = await db.query(`SELECT ${ACCOUNT_COLUMNS} FROM local_account WHERE id = 1`);
      const row = result.rows[0];
      if (!row) return null;
      return {
        id: Number(row.id),
        username: row.username,
        password_salt: row.password_salt,
        password_hash: row.password_hash,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      };
    },

    async saveLocalAccount(account) {
      await db.query(
        `INSERT INTO local_account (id, username, password_salt, password_hash, created_at)
         VALUES (1, $1, $2, $3, NOW())
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           password_salt = EXCLUDED.password_salt,
           password_hash = EXCLUDED.password_hash`,
        [account.username, account.passwordSalt, account.passwordHash],
      );
      return this.getLocalAccount();
    },

    async createSession(tokenHash, expiresAt) {
      const expiry = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.deleteExpiredSessions();
      await db.query(
        'INSERT INTO auth_sessions (token_hash, expires_at, created_at) VALUES ($1, $2, NOW())',
        [tokenHash, expiry],
      );
    },

    async getSessionByTokenHash(tokenHash) {
      const result = await db.query(
        'SELECT token_hash, expires_at FROM auth_sessions WHERE token_hash = $1',
        [tokenHash],
      );
      const row = result.rows[0];
      if (!row) return null;
      const expiresAt = row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at);
      if (expiresAt.getTime() <= Date.now()) {
        await this.deleteSession(tokenHash);
        return null;
      }
      return { token_hash: row.token_hash, expires_at: expiresAt.toISOString() };
    },

    async deleteSession(tokenHash) {
      await db.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
    },

    async deleteExpiredSessions() {
      await db.query('DELETE FROM auth_sessions WHERE expires_at < $1', [new Date()]);
    },
  };
}
