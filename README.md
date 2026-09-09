# API de tareas

API REST con Node.js y Express. Las tareas se guardan en memoria: al reiniciar el servidor se pierden. No requiere base de datos ni credenciales.

## Ejecutar localmente

Necesitás Node.js 22 o superior y npm.

```sh
npm install
npm start
```

La API escucha en `http://localhost:3000`. Para reiniciar automáticamente al editar archivos, usá `npm run dev`. Para detenerla, presioná `Ctrl+C`.

El puerto se configura con la variable de entorno `PORT`. En PowerShell:

```powershell
$env:PORT = '3001'
npm start
```

## Rutas

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/tareas` | `200`: listado de tareas (inicialmente `[]`) |
| POST | `/tareas` | `201`: tarea creada con `id` UUID y `titulo` |
| DELETE | `/tareas/:id` | `204`: eliminada, sin cuerpo; `404` si no existe |

Para crear una tarea, enviá `Content-Type: application/json` y un cuerpo como `{"titulo":"Comprar pan"}`. El título es obligatorio y debe tener entre 1 y 200 caracteres después de quitar espacios al inicio y al final. Los campos adicionales se ignoran.

Los errores tienen el formato `{"error":"mensaje"}`: `400` para títulos inválidos o JSON mal formado, `413` para cuerpos mayores de 16 KB y `404` para rutas inexistentes.

### Ejemplo completo en PowerShell

```powershell
Invoke-RestMethod http://localhost:3000/tareas

$tarea = Invoke-RestMethod http://localhost:3000/tareas -Method Post -ContentType 'application/json' -Body '{"titulo":"Comprar pan"}'
$tarea

Invoke-RestMethod http://localhost:3000/tareas
Invoke-RestMethod "http://localhost:3000/tareas/$($tarea.id)" -Method Delete
Invoke-RestMethod http://localhost:3000/tareas
```

## Pruebas

```sh
npm test
```

Las pruebas usan HTTP en un puerto temporal y verifican el ciclo de creación, listado y eliminación, la validación y las respuestas de error.

Referencia: [instalación oficial de Express](https://expressjs.com/en/starter/installing/).
