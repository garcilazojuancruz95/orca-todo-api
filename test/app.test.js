import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';

async function setup(t) {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve());
    server.closeAllConnections();
  }));
  return (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
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
