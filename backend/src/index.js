import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { ensureRuntimeArtifacts } from './db/ensureRuntimeArtifacts.js';

const app = createApp();

async function startServer() {
  await ensureRuntimeArtifacts();

  const server = app.listen(env.port, () => {
    console.log(`Backend running on http://localhost:${env.port}`);
  });

  async function shutdown() {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch(async (error) => {
  console.error('Backend startup failed:', error.message || error);
  await pool.end();
  process.exit(1);
});
