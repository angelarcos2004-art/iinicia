# `backend/src/users/users.service.ts`

**En una frase:** capa de acceso a la tabla `users`: buscar, listar y actualizar usuarios (rol, contraseña, token de recuperación, código 2FA, vínculo con Moodle, token push).

## Por qué existe

Centraliza todas las operaciones sobre `User` en un solo servicio inyectable, para que ningún otro módulo construya consultas de TypeORM directamente sobre esta tabla. Así, si cambia la forma de guardar (por ejemplo, agregar un índice o cambiar cómo se normaliza el correo), solo hay un lugar que tocar.

## Recorrido del código

```ts
findByCorreo(correo: string): Promise<User | null> {
  return this.repo.findOne({ where: { correo: correo.trim().toLowerCase() } });
}
```
El correo siempre se normaliza (quita espacios, pasa a minúsculas) antes de buscar — y también antes de guardar, en `create`. Esto evita que `Usuario@Ejemplo.com` y `usuario@ejemplo.com` se traten como cuentas distintas, lo cual rompería tanto el login como la restricción `unique: true` sobre la columna (ver `user.entity.md`).

```ts
listar(rol?: Rol): Promise<User[]> {
  return this.repo.find({ where: rol ? { rol } : {}, order: { createdAt: 'DESC' } });
}
```
Usado por los paneles administrativos. El comentario en el código aclara que no pagina todavía porque no hace falta con el volumen actual de usuarios de la primera entrega; es un punto a revisar si la base de usuarios crece.

```ts
async actualizarMoodleUserId(id: string, moodleUserId: number): Promise<void> {
  await this.repo.update(id, { moodleUserId });
}
```
Este y los demás métodos `actualizar*` son todos actualizaciones de un solo campo (rol, ámbito de coordinador, hash de contraseña, nombre, token FCM, token/código de recuperación o 2FA). Mantenerlos como métodos separados y nombrados por intención (en vez de un `update(id, data: Partial<User>)` genérico) hace explícito, al leer quien los llama, *qué* se está cambiando y *por qué* — por ejemplo, `actualizarFcmToken` solo lo usa `EstudianteController` cuando la app Android registra un dispositivo nuevo.

```ts
create(data: CrearUsuarioData): Promise<User> {
  const user = this.repo.create({
    nombre: data.nombre.trim(),
    correo: data.correo.trim().toLowerCase(),
    passwordHash: data.passwordHash,
    rol: data.rol ?? Rol.Aspirante,
    moodleUserId: null,
    ...
  });
  return this.repo.save(user);
}
```
Por defecto, un usuario nuevo nace como `Rol.Aspirante` y sin vínculo a Moodle (`moodleUserId: null`) — coherente con la regla de que una cuenta nueva no implica acceso automático a los cursos (ver `auth.service.md`).

## Conexión con el resto del sistema

- Lo usan `AuthService` (login, registro, 2FA, recuperación), `UsuariosController` (administración de usuarios), `EstudianteController` (push token, consulta del propio usuario), `AspiranteController`, `DocumentosController` y `moodle-onboarding.ts`, y `seed.ts`.
- Opera sobre la entidad `User` (`users/user.entity.ts`) vía el repositorio de TypeORM inyectado con `@InjectRepository(User)`.

## Cosas que no son obvias a primera vista

- El correo se normaliza en dos puntos distintos (`findByCorreo` y `create`) de forma independiente: si se agregara un tercer punto de entrada que guarde o busque usuarios sin pasar por este servicio, perdería esa normalización y podría crear una cuenta "duplicada" con mayúsculas distintas.
- Ningún método de este servicio hashea contraseñas ni genera tokens: siempre recibe el hash o el token ya calculado (por `AuthService`, usando `bcrypt`/`randomBytes`/`randomInt`). Este servicio solo persiste, nunca decide la criptografía.
