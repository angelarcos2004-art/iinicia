# Proyecto IINICIA

Plataforma universitaria: portal Next.js + backend NestJS + Moodle + app Android.
Documento rector: docs/requerimientos.md (copia en PDF: docs/requerimientos.pdf).
Diseño de referencia: docs/stitch/.

## Stack
- frontend/: Next.js + TypeScript + Tailwind (App Router)
- backend/: NestJS + PostgreSQL + JWT
- infrastructure/: Docker Compose (Moodle, PostgreSQL, backend)
- android/: Kotlin + Jetpack Compose

## Reglas
- No modificar el core de Moodle.
- Ningún token de Moodle en React ni en Android; solo en el backend (.env).
- Integración con Moodle idempotente: UUID interno + moodleUserId.
- Los permisos se validan en el backend, no solo en la interfaz.
- Nunca subir .env al repositorio.
- TypeScript estricto; ejecutar build y pruebas al terminar cada módulo.

## Roles
superadmin, admin_academico, coordinador, profesor, estudiante, aspirante

## Primera entrega (29 oct 2026)
Estructura, diseño del portal, registro/login, roles básicos, integración
inicial con Moodle, curso y usuarios de prueba, avance de Android.
