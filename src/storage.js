import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultPath = fileURLToPath(new URL('../data/tareas.sqlite', import.meta.url));

export function createStorage(databasePath = process.env.DATABASE_PATH ?? defaultPath) {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS tareas (
      id TEXT PRIMARY KEY NOT NULL,
      titulo TEXT NOT NULL
    )`);
    const list = db.prepare('SELECT id, titulo FROM tareas ORDER BY rowid');
    const insert = db.prepare('INSERT INTO tareas (id, titulo) VALUES (?, ?)');
    const remove = db.prepare('DELETE FROM tareas WHERE id = ?');
    const update = db.prepare('UPDATE tareas SET titulo = ? WHERE id = ?');
    return {
      list: () => list.all(),
      insert: (tarea) => insert.run(tarea.id, tarea.titulo),
      update: (id, titulo) => update.run(titulo, id).changes > 0,
      delete: (id) => remove.run(id).changes > 0,
      close: () => db.close(),
    };
  } catch (err) {
    db.close();
    throw err;
  }
}
