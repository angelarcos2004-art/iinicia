# `backend/src/auth/roles.decorator.ts`

**En una frase:** decorador `@Roles(...)` que marca qué roles pueden usar una ruta o un controlador; por sí solo no hace nada, necesita que `RolesGuard` lo lea.

## Por qué existe

NestJS permite adjuntar "metadata" (datos arbitrarios) a clases y métodos mediante decoradores, y leerla después con `Reflector`. Este archivo define esa metadata de forma declarativa y legible (`@Roles(Rol.Superadmin, Rol.AdminAcademico)` encima de un método) en vez de tener que escribir la lógica de "si el rol no es X ni Y, lanza 403" repetida en cada controlador.

## Recorrido del código

```ts
export const ROLES_KEY = 'roles';

export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
```
- `ROLES_KEY` es la clave con la que se guarda y luego se busca esta metadata; se exporta para que `RolesGuard` use exactamente la misma constante (evita errores de tipeo si la clave se escribiera a mano en dos lugares distintos).
- `Roles(...roles)` es una fábrica de decoradores: recibe uno o varios valores del enum `Rol` y produce el decorador real vía `SetMetadata`.

## Conexión con el resto del sistema

- Lo usan los controladores: `@Roles(Rol.Superadmin, Rol.AdminAcademico)` en `UsuariosController`, `@Roles(Rol.Aspirante)` en `AspiranteController`, etc.
- Lo lee `RolesGuard` con `this.reflector.getAllAndOverride(ROLES_KEY, ...)`.
- Depende del enum `Rol` (`users/rol.enum.ts`), que lista los 6 roles del proyecto (`superadmin`, `admin_academico`, `coordinador`, `profesor`, `estudiante`, `aspirante`).

## Cosas que no son obvias a primera vista

- Este decorador, usado solo, no protege nada: una ruta con `@Roles(...)` pero sin `RolesGuard` en sus `@UseGuards(...)` queda completamente abierta, porque nadie lee esa metadata. La protección real está en `RolesGuard`; este archivo solo declara la intención.
