# IINICIA - Plataforma Digital Universitaria

Plataforma universitaria integral: portal web, backend, integración con
Moodle y app Android para gestionar el ciclo completo de un estudiante
(aspirante → admisión → inscripción → seguimiento académico), con roles
diferenciados para administración, coordinación académica y docentes.

El documento rector del proyecto es [docs/requerimientos.md](docs/requerimientos.md).

## Stack

- **frontend/** — Next.js + TypeScript + Tailwind (App Router): portal web.
- **backend/** — NestJS + PostgreSQL + JWT: API central y única integración con Moodle.
- **infrastructure/** — Docker Compose (Moodle, PostgreSQL, backend). Ver
  [infrastructure/README.md](infrastructure/README.md) para levantar el entorno local.
- **android/** — Kotlin + Jetpack Compose: app para estudiantes.

## Roles

`superadmin`, `admin_academico`, `coordinador`, `profesor`, `estudiante`, `aspirante`

## Integrantes del equipo

- Arcos Yáñez Angel
- Corrales Vargas Esmeralda
- Gomez Fernandez Jesus Raul
- Martinez Tejada Mario Eduardo
- Tah Mendoza Yatzani Ivett
- Tinoco Martinez Silverio Angel
- Vazquez Oropeza Mayra Gabriela
