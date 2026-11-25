import { ForbiddenException } from '@nestjs/common';
import { Rol } from '../users/rol.enum.js';
import type { UsersService } from '../users/users.service.js';
import type { UsuarioAutenticado } from './jwt.strategy.js';

/**
 * Si `actual` es coordinador con ámbito asignado (ver
 * UsuariosController.asignarProgramaCoordinado), exige que el recurso consultado pertenezca
 * al mismo programa (docs/requerimientos.md §11: "acceso limitado al programa o unidad
 * asignada"). Sin ámbito, o para cualquier otro rol, no restringe — igual que GET /usuarios.
 * Compartido entre UsuariosController y DocumentosController para no duplicar este chequeo
 * (y no repetir el hallazgo de la auditoría: rutas nuevas que lo omitieron).
 */
export async function verificarAmbitoCoordinador(
  users: Pick<UsersService, 'findById'>,
  actual: UsuarioAutenticado,
  programaInteresIdObjetivo: string | null,
): Promise<void> {
  if (actual.rol !== Rol.Coordinador) return;
  const coordinador = await users.findById(actual.id);
  const ambito = coordinador?.programaCoordinadoId ?? null;
  if (ambito && programaInteresIdObjetivo !== ambito) {
    throw new ForbiddenException('Fuera del ámbito asignado');
  }
}
