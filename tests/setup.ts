import { existsSync } from 'node:fs';
import { preview } from 'vite';

export default async function setup() {
  if (!existsSync('dist/index.html')) throw new Error('Run npm run build before the smoke tests.');
  // An in-process preview avoids Windows shell grandchildren during teardown.
  const server = await preview({
    configFile: false,
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  });
  return async () => {
    server.httpServer.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.httpServer.close(error => error ? reject(error) : resolve());
    });
  };
}
