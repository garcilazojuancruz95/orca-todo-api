import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';

async function temporaryDatabase(t) {
  const directory = await mkdtemp(join(tmpdir(), 'tareas-test-'));
  t.after(async () => {
    for (const close of t.serverClosers ?? []) await close();
    await rm(directory, { recursive: true, force: true });
  });
  return join(directory, 'data', 'tareas.sqlite');
}

async function setup(t, databasePath) {
  databasePath ??= await temporaryDatabase(t);
  const app = createApp({ databasePath });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    return new Promise((resolve, reject) => {
      server.close((err) => err ? reject(err) : resolve());
      server.closeAllConnections();
    }).finally(() => app.locals.close());
  };
  t.after(close);
  (t.serverClosers ??= []).push(close);
  const request = (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
  request.close = close;
  return request;
}

test('listar, crear y eliminar tareas sin afectar otras tareas', async (t) => {
  const request = await setup(t);
  const initial = await request('/tareas');
  assert.equal(initial.status, 200);
  assert.deepEqual(await initial.json(), []);
  const create = (titulo) => request('/tareas', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo }),
  });
  const response = await create('  Comprar pan  ');
  assert.equal(response.status, 201);
  const first = await response.json();
  assert.equal(first.titulo, 'Comprar pan');
  assert.equal(typeof first.id, 'string');
  const second = await (await create('Estudiar')).json();
  assert.notEqual(first.id, second.id);
  assert.deepEqual(await (await request('/tareas')).json(), [first, second]);
  const deleted = await request(`/tareas/${first.id}`, { method: 'DELETE' });
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), '');
  assert.deepEqual(await (await request('/tareas')).json(), [second]);
  assert.equal((await request(`/tareas/${first.id}`, { method: 'DELETE' })).status, 404);
});

test('editar, validar y persistir titulos sin afectar otras tareas', async (t) => {
  const databasePath = await temporaryDatabase(t);
  let request = await setup(t, databasePath);
  const send = (path, method, body) => request(path, {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const first = await (await send('/tareas', 'POST', { titulo: 'Primera' })).json();
  const second = await (await send('/tareas', 'POST', { titulo: 'Segunda' })).json();
  for (const body of [{}, { titulo: '' }, { titulo: '   ' }, { titulo: 42 }, { titulo: null }, { titulo: 'a'.repeat(201) }, null]) {
    const response = await send(`/tareas/${first.id}`, 'PUT', body);
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.equal((await request(`/tareas/${first.id}`, { method: 'PUT' })).status, 400);
  assert.deepEqual(await (await request('/tareas')).json(), [first, second]);
  for (const titulo of ['a'.repeat(200), "Leer 'SQLite'; --", "Leer 'SQLite'; --"]) {
    const response = await send(`/tareas/${first.id}`, 'PUT', { titulo: `  ${titulo}  `, id: 'ignorado' });
    assert.equal(response.status, 200);
    first.titulo = titulo;
    assert.deepEqual(await response.json(), first);
  }
  const missing = await send('/tareas/no-existe', 'PUT', { titulo: 'Nueva' });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'Tarea no encontrada.' });
  await request.close();
  request = await setup(t, databasePath);
  assert.deepEqual(await (await request('/tareas')).json(), [first, second]);
});

test('rechazar entradas invalidas y devolver errores JSON', async (t) => {
  const request = await setup(t);
  for (const body of [{}, { titulo: '' }, { titulo: '   ' }, { titulo: 42 }, { titulo: 'a'.repeat(201) }, null]) {
    const response = await request('/tareas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  for (const [body, status] of [['{', 400], [JSON.stringify({ titulo: 'a'.repeat(17000) }), 413]]) {
    const response = await request('/tareas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    assert.equal(response.status, status);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.equal((await request('/tareas', { method: 'POST' })).status, 400);
  const missing = await request('/desconocida');
  assert.equal(missing.status, 404);
  assert.equal(typeof (await missing.json()).error, 'string');
  assert.deepEqual(await (await request('/tareas')).json(), []);
});

test('persistir tareas y eliminaciones al reiniciar con la misma base', async (t) => {
  const databasePath = await temporaryDatabase(t);
  let request = await setup(t, databasePath);
  const tareas = [];
  for (const titulo of ["Leer 'SQLite'; --", 'Segunda tarea']) {
    const response = await request('/tareas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo }),
    });
    assert.equal(response.status, 201);
    tareas.push(await response.json());
  }
  await request.close();
  request = await setup(t, databasePath);
  assert.deepEqual(await (await request('/tareas')).json(), tareas);
  assert.equal((await request(`/tareas/${tareas[0].id}`, { method: 'DELETE' })).status, 204);
  await request.close();
  request = await setup(t, databasePath);
  assert.deepEqual(await (await request('/tareas')).json(), [tareas[1]]);
  assert.equal((await request(`/tareas/${tareas[0].id}`, { method: 'DELETE' })).status, 404);
  await request.close();
});
