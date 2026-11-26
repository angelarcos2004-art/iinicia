# `backend/src/documentos/documentos.service.ts`

**En una frase:** acceso a la tabla `documentos` (archivos subidos por aspirantes) y la función que traduce una fila completa a lo que es seguro mostrar por API.

## Por qué existe

Centraliza las operaciones sobre documentos de admisión, y separa claramente qué es "seguro de exponer" (`DocumentoListado`) de qué es interno y nunca debe salir de este servicio (la ruta real en disco del archivo).

## Recorrido del código

```ts
export interface DocumentoListado {
  id: string;
  tipo: TipoDocumento;
  nombreOriginal: string;
  estado: string;
  createdAt: Date;
}

export function mapearDocumento(doc: Documento): DocumentoListado {
  return { id: doc.id, tipo: doc.tipo, nombreOriginal: doc.nombreOriginal, estado: doc.estado, createdAt: doc.createdAt };
}
```
`mapearDocumento` es la única función que convierte la entidad completa (`Documento`, que incluye `rutaArchivo` y `userId`) en algo apto para la respuesta HTTP. El comentario en el código lo dice sin rodeos: "nunca incluye `rutaArchivo`". Cualquier controlador que quiera devolver un documento por API debe pasar por aquí, en vez de serializar la entidad directamente — si un controlador nuevo hiciera `return doc` en vez de `return mapearDocumento(doc)`, expondría por accidente la ruta absoluta del archivo en el servidor.

```ts
crear(data: CrearDocumentoData): Promise<Documento> {
  return this.repo.save(this.repo.create({ ...data, estado: 'pendiente' }));
}
```
Todo documento nuevo nace en estado `pendiente`: solo un administrador puede moverlo a `aprobado` o `rechazado` (ver `documentos.controller.ts`).

```ts
async actualizarEstado(id: string, estado: EstadoRevisionDocumento): Promise<Documento> {
  await this.repo.update(id, { estado });
  const doc = await this.findById(id);
  if (!doc) {
    throw new NotFoundException('Documento no encontrado');
  }
  return doc;
}
```
`EstadoRevisionDocumento` (de `dto/actualizar-estado-documento.dto.ts`) solo permite `'aprobado' | 'rechazado'` — no se puede volver a poner `'pendiente'` desde este endpoint, porque ese es el estado inicial automático, no una decisión de revisión.

## Conexión con el resto del sistema

- Lo usan `AspiranteController` (crear y listar los propios documentos) y `DocumentosController` (listar por usuario, cambiar estado, descargar el archivo).
- Opera sobre la entidad `Documento` (`documento.entity.ts`).

## Cosas que no son obvias a primera vista

- `mapearDocumento` es, en la práctica, el límite de seguridad entre "lo que vive en la base de datos" y "lo que puede ver un cliente HTTP" para esta tabla: la ruta del archivo en disco solo se usa internamente, dentro de `DocumentosController.descargar`, para abrir el stream — nunca se devuelve como texto en ninguna respuesta JSON.
