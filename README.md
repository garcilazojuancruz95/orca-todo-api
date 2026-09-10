# API de tareas

API REST con Node.js, Express y SQLite mediante `better-sqlite3`. Las tareas se guardan en disco y persisten al reiniciar el servidor. No requiere un servidor de base de datos ni credenciales.

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

## Almacenamiento

Al iniciar, se crean automáticamente el directorio `data/`, el archivo `data/tareas.sqlite` y la tabla de tareas si no existen. La ubicación predeterminada es relativa a la raíz del proyecto, independientemente del directorio desde donde se ejecute Node.js. Los archivos de datos están excluidos de Git.

Para elegir otro archivo, configurá `DATABASE_PATH` antes de iniciar (las rutas relativas se resuelven desde el directorio de trabajo):

```powershell
$env:DATABASE_PATH = 'C:/datos/tareas.sqlite'
npm start
```

Usá siempre el mismo archivo para conservar las tareas entre reinicios y un directorio con permisos de escritura. Para hacer una copia de seguridad, detené el servidor y copiá el archivo SQLite. Borrarlo elimina las tareas; el siguiente inicio crea una base vacía.

## Rutas

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/tareas` | `200`: listado de tareas (inicialmente `[]`) |
| POST | `/tareas` | `201`: tarea creada con `id` UUID y `titulo` |
| PUT | `/tareas/:id` | `200`: tarea actualizada con `id` y `titulo`; `404` si no existe |
| DELETE | `/tareas/:id` | `204`: eliminada, sin cuerpo; `404` si no existe |

Para crear o editar una tarea, enviá `Content-Type: application/json` y un cuerpo como `{"titulo":"Comprar pan"}`. El título es obligatorio y debe tener entre 1 y 200 caracteres después de quitar espacios al inicio y al final. Los campos adicionales se ignoran.

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

Las pruebas usan HTTP en puertos temporales y bases SQLite aisladas en directorios temporales que se eliminan al finalizar. Verifican el ciclo de creación, listado y eliminación, la validación, las respuestas de error y la persistencia de tareas y eliminaciones al cerrar y volver a abrir el servidor con el mismo archivo. No modifican la base de uso local.

Referencia: [instalación oficial de Express](https://expressjs.com/en/starter/installing/).
