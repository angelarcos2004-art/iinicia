import { SetMetadata } from '@nestjs/common';
import type { Rol } from '../users/rol.enum.js';

export const ROLES_KEY = 'roles';

/** Restringe una ruta a los roles indicados. Requiere RolesGuard en la ruta/controlador. */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
