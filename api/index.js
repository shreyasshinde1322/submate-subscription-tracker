import { createApp } from '../server/app.js';
import { getDatabase } from '../server/db/connection.js';

let cachedDb = null;
let cachedApp = null;

async function getApp() {
  if (!cachedApp) {
    if (!cachedDb) {
      cachedDb = await getDatabase();
    }
    cachedApp = createApp({ db: cachedDb });
  }
  return cachedApp;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
