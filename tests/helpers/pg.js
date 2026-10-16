import { newDb, DataType } from 'pg-mem';

// Tests run against an in-memory PostgreSQL engine so the real PostgreSQL SQL,
// parameterisation and migrations are exercised without a running server.
export function createTestMemoryDb() {
  const mem = newDb({ autoCreateForeignKeyIndices: true, noAstCoverageCheck: true });

  // pg-mem ships very few native functions; register the ones SubMate relies on.
  mem.public.registerFunction({
    name: 'trim',
    args: [DataType.text],
    returns: DataType.text,
    implementation: (value) => (value === null || value === undefined ? null : String(value).trim()),
  });
  mem.public.registerFunction({
    name: 'length',
    args: [DataType.text],
    returns: DataType.int,
    implementation: (value) => (value === null || value === undefined ? null : String(value).length),
  });
  mem.public.registerFunction({
    name: 'lower',
    args: [DataType.text],
    returns: DataType.text,
    implementation: (value) => (value === null || value === undefined ? null : String(value).toLowerCase()),
  });

  return mem;
}

function shimPool(pool) {
  if (typeof pool.connect !== 'function') {
    const query = pool.query.bind(pool);
    pool.connect = async () => ({
      query,
      release() {},
      releaseWithError() {},
    });
  }
  if (typeof pool.end !== 'function') {
    pool.end = async () => {};
  }
  return pool;
}

export function createTestPool(mem = createTestMemoryDb()) {
  const { Pool } = mem.adapters.createPg();
  return shimPool(new Pool());
}
