# `backend/src/documentos/storage.ts`

**En una frase:** configuración de Multer (la librería de subida de archivos de Express/NestJS) para los documentos de admisión: dónde se guardan en disco, con qué nombre, y qué tipos/tamaños se aceptan.

## Por qué existe

La subida de archivos necesita reglas de seguridad estrictas antes de tocar el disco: sin esto, un aspirante podría subir un archivo ejecutable disfrazado, un archivo gigante que agote espacio en disco, o un nombre de archivo que colisione con otro (o que intente manipular rutas del sistema). Centralizar esto en una función (`multerOptionsDocumentos`) evita que cada controlador que suba archivos reinvente sus propias reglas, posiblemente de forma inconsistente.

## Recorrido del código

```ts
const EXTENSIONES_PERMITIDAS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
```
La extensión con la que se guarda el archivo en disco se decide por el **mimetype real** (reportado por el navegador en la subida), no por la extensión que traía el nombre original del archivo — así un archivo llamado `foto.exe` renombrado a `foto.pdf` no engaña al sistema para que lo trate como PDF.

```ts
export const DOCUMENTOS_DIR = join(process.env.UPLOADS_DIR ?? './uploads', 'documentos');
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

export function multerOptionsDocumentos(): MulterOptions {
  if (!existsSync(DOCUMENTOS_DIR)) {
    mkdirSync(DOCUMENTOS_DIR, { recursive: true });
  }
  return {
    storage: diskStorage({
      destination: DOCUMENTOS_DIR,
      filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${EXTENSIONES_PERMITIDAS[file.mimetype] ?? ''}`);
      },
    }),
    limits: { fileSize: TAMANO_MAXIMO_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!EXTENSIONES_PERMITIDAS[file.mimetype]) {
        cb(new BadRequestException('Solo se aceptan archivos PDF, JPG o PNG (máx. 5 MB).'), false);
        return;
      }
      cb(null, true);
    },
  };
}
```
- El nombre de archivo en disco siempre es un `randomUUID()` nuevo, nunca el nombre original que subió el usuario. Esto elimina de raíz varios problemas a la vez: colisiones entre archivos con el mismo nombre de dos usuarios distintos, caracteres raros o peligrosos en el nombre original (como `../../etc/passwd`), y que alguien adivine o enumere nombres de archivos de otros usuarios. El nombre original (`archivo.originalname`) solo se guarda como metadato en la base de datos (`Documento.nombreOriginal`), para mostrarlo al usuario, nunca se usa como ruta real.
- El límite de 5 MB (`fileSize`) lo aplica Multer antes de terminar de escribir el archivo completo: una subida que exceda el límite se corta.
- `fileFilter` rechaza cualquier mimetype que no esté en la lista blanca (`EXTENSIONES_PERMITIDAS`), con un mensaje de error claro en español que termina mostrándose tal cual al usuario (vía `AllExceptionsFilter`).
- El directorio de subida se crea automáticamente la primera vez (`mkdirSync({ recursive: true })`) si no existe, para no depender de que alguien lo haya creado manualmente en el servidor.

## Conexión con el resto del sistema

- La usa `AspiranteController.subirDocumento` como `FileInterceptor('archivo', multerOptionsDocumentos())`.
- La ruta resultante del archivo (`archivo.path`, generada por Multer con el nombre UUID) se guarda en `Documento.rutaArchivo` vía `DocumentosService.crear`.
- `DOCUMENTOS_DIR` depende de la variable de entorno `UPLOADS_DIR` (por defecto `./uploads/documentos`), relevante para dónde debe apuntar un volumen persistente en Docker (ver `infrastructure/`).

## Cosas que no son obvias a primera vista

- El tipo de archivo se valida por `mimetype` (lo que declara el navegador en la petición), no inspeccionando el contenido real del archivo (los primeros bytes o "magic numbers"). Es una validación razonable para esta entrega, pero no es una garantía criptográfica de que el contenido sea realmente un PDF/JPG/PNG válido — un atacante podría falsear el `Content-Type` de la subida. La defensa real contra ejecución de contenido malicioso es la Content-Security-Policy restrictiva al servir el archivo (ver `app.setup.ts` y `documentos.controller.md`).
- `DOCUMENTOS_DIR` se calcula una sola vez al cargar el módulo (es una constante a nivel de archivo), así que cambiar `UPLOADS_DIR` en tiempo de ejecución (después de que el proceso ya arrancó) no tiene efecto.
