import { newDb, DataType } from 'pg-mem';

const mem = newDb({ autoCreateForeignKeyIndices: true, noAstCoverageCheck: true });
mem.public.registerFunction({ name: 'trim', args: [DataType.text], returns: DataType.text, implementation: (v) => (v == null ? null : String(v).trim()) });
mem.public.registerFunction({ name: 'length', args: [DataType.text], returns: DataType.int, implementation: (v) => (v == null ? null : String(v).length) });
mem.public.registerFunction({ name: 'lower', args: [DataType.text], returns: DataType.text, implementation: (v) => (v == null ? null : String(v).toLowerCase()) });

const wire = await mem.adapters.bindServer({ port: 55432 });
console.log(`WIRE_READY ${wire.postgresConnectionString}`);
setInterval(() => {}, 1000);
