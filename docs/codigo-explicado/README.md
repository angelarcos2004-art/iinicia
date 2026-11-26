# Código explicado (programación literaria)

Un documento por cada archivo de código con lógica real del sistema IINICIA, en español,
pensado para alguien que nunca ha visto el proyecto: qué hace el archivo, por qué existe, un
recorrido por el código real con explicaciones, cómo se conecta con el resto del sistema y qué
detalles no son obvios a primera vista. Varios incluyen diagramas (Mermaid) de los flujos más
complejos (login con 2FA, integración idempotente con Moodle, navegación, notificaciones push).

Si quieres entender el sistema **completo** de un vistazo antes de entrar al detalle de un
archivo, empieza por [`docs/ARQUITECTURA.md`](../ARQUITECTURA.md).

## Índices por módulo

| Módulo | Qué cubre | Índice |
|---|---|---|
| **Backend** | NestJS: auth/2FA, usuarios y roles, documentos de admisión, materias, programas, integración con Moodle, correo, push | [backend/index.md](backend/index.md) |
| **Frontend** | Portal Next.js: páginas, cliente de API, sesión, componentes con lógica | [frontend/index.md](frontend/index.md) |
| **Android** | App Kotlin + Compose: pantallas, ViewModel, almacenamiento cifrado de sesión, push | [android/index.md](android/index.md) |
| **Infraestructura** | Docker Compose (Moodle + Postgres + backend) y el plugin propio de Moodle (`auth_userkey`, SSO) | [infrastructure/index.md](infrastructure/index.md) |

## Qué se dejó fuera (a propósito)

Cada índice de módulo detalla sus propios casos, pero en general no se documentó archivo por
archivo:
- Pruebas (`*.spec.ts`, `*.test.tsx`, `tests/` de PHPUnit): prueban el comportamiento, no lo
  definen; su valor está en correrlas, no en leerlas.
- Boilerplate de NestJS (`*.module.ts`) y de Moodle (`version.php`, `db/upgrade.php`, `lang/`):
  solo conectan piezas, sin lógica de negocio propia.
- DTOs de validación simples (`dto/*.ts`): se explican de paso dentro del archivo que los usa.
- Componentes puramente presentacionales del frontend y archivos de tema visual de Android
  (`Color.kt`, `Theme.kt`, `Type.kt`): sin estado ni lógica.
- `infrastructure/moodle-src/`: es el código fuente completo de Moodle (de terceros, no se
  modifica — ver regla en `CLAUDE.md`), no código propio de IINICIA.
