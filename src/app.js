import express from 'express';
import { randomUUID } from 'node:crypto';
import { createStorage } from './storage.js';

export function createApp({ databasePath } = {}) {
  const app = express();
  const tareas = createStorage(databasePath);
  app.locals.close = () => tareas.close();

  app.use(express.json({ limit: '16kb' }));

  app.get('/tareas', (req, res) => {
    res.json(tareas.list());
  });

  app.post('/tareas', (req, res) => {
    const titulo = req.body?.titulo;
    if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 200) {
      return res.status(400).json({ error: 'El titulo debe tener entre 1 y 200 caracteres.' });
    }

    const tarea = { id: randomUUID(), titulo: titulo.trim() };
    tareas.insert(tarea);
    res.status(201).json(tarea);
  });

  app.delete('/tareas/:id', (req, res) => {
    if (!tareas.delete(req.params.id)) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }
    res.status(204).end();
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' });
  });

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'El cuerpo debe ser JSON valido.' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'El cuerpo supera el limite de 16 KB.' });
    }
    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 ? 'Error interno del servidor.' : 'Solicitud no valida.' });
  });

  return app;
}
