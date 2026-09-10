import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un entero entre 1 y 65535.');
}

const app = createApp();
const server = app.listen(port, process.env.HOST ?? '127.0.0.1', () => {
  console.log(`API de tareas disponible en http://localhost:${port}/tareas`);
}).on('error', (err) => {
  app.locals.close();
  console.error(`No se pudo iniciar la API: ${err.message}`);
  process.exitCode = 1;
});

server.on('close', () => app.locals.close());
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close());
}
