import { createApp } from './app.js';
import { getDatabase } from './db/connection.js';
import { HOST, PORT, DATABASE_URL } from './config.js';

async function start() {
  let db;
  try {
    db = await getDatabase();
  } catch (error) {
    console.error('SubMate could not initialize the PostgreSQL database.');
    console.error(`Reason: ${error.message}`);
    if (!DATABASE_URL) {
      console.error('');
      console.error('DATABASE_URL is not set. Create a .env file next to package.json:');
      console.error('  DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require');
      console.error('Or export DATABASE_URL before running npm run dev / npm start.');
    }
    process.exit(1);
  }

  const app = createApp({ db });

  const server = app.listen(PORT, HOST, () => {
    console.log(`SubMate backend running at http://${HOST}:${PORT}`);
    console.log(`Database URL configured: ${DATABASE_URL ? 'yes' : 'no'}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Set SUBMATE_PORT to choose another port.`);
    } else {
      console.error(`Failed to start the server: ${error.message}`);
    }
    process.exit(1);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
