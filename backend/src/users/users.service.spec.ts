import { Rol } from './rol.enum.js';
import { UsersService } from './users.service.js';
import type { User } from './user.entity.js';

function makeRepo(existing: User | null = null) {
  return {
    findOne: vi.fn().mockResolvedValue(existing),
    find: vi.fn().mockResolvedValue(existing ? [existing] : []),
    update: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockImplementation((data) => data),
    save: vi.fn().mockImplementation(async (data) => ({ id: 'u1', createdAt: new Date(), ...data })),
  };
}

describe('UsersService', () => {
  it('findByCorreo normaliza el correo (recorta espacios y pasa a minúsculas)', async () => {
    const repo = makeRepo();
    const service = new UsersService(repo as never);

    await service.findByCorreo('  Ana@Correo.COM  ');

    expect(repo.findOne).toHaveBeenCalledWith({ where: { correo: 'ana@correo.com' } });
  });

  it('create normaliza nombre y correo, y aplica los valores por defecto', async () => {
    const repo = makeRepo();
    const service = new UsersService(repo as never);

    const user = await service.create({
      nombre: '  Ana Pérez  ',
      correo: '  Ana@Correo.COM  ',
      passwordHash: 'hash',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Ana Pérez',
        correo: 'ana@correo.com',
        rol: Rol.Aspirante,
        moodleUserId: null,
        programaInteresId: null,
        aceptaAvisoPrivacidad: false,
        deseaInformacionBecas: false,
      }),
    );
    expect(user.correo).toBe('ana@correo.com');
  });

  it('create respeta un rol explícito en vez del default (p. ej. seed de cuentas de prueba)', async () => {
    const repo = makeRepo();
    const service = new UsersService(repo as never);

    await service.create({
      nombre: 'Admin',
      correo: 'admin@correo.com',
      passwordHash: 'hash',
      rol: Rol.Superadmin,
    });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ rol: Rol.Superadmin }));
  });

  it('listar filtra por rol cuando se da, y devuelve todos si no', async () => {
    const repo = makeRepo();
    const service = new UsersService(repo as never);

    await service.listar(Rol.Estudiante);
    expect(repo.find).toHaveBeenCalledWith({ where: { rol: Rol.Estudiante }, order: { createdAt: 'DESC' } });

    await service.listar();
    expect(repo.find).toHaveBeenCalledWith({ where: {}, order: { createdAt: 'DESC' } });
  });

  it('actualizarRol actualiza solo el campo rol', async () => {
    const repo = makeRepo();
    const service = new UsersService(repo as never);

    await service.actualizarRol('u1', Rol.Estudiante);

    expect(repo.update).toHaveBeenCalledWith('u1', { rol: Rol.Estudiante });
  });

  it('actualizarProgramaCoordinado permite quitar el ámbito con null', async () => {
    const repo = makeRepo();
    const service = new UsersService(repo as never);

    await service.actualizarProgramaCoordinado('u1', null);

    expect(repo.update).toHaveBeenCalledWith('u1', { programaCoordinadoId: null });
  });

  it('guardarCodigo2FA y limpiarCodigo2FA actualizan hash/expiración del código de verificación', async () => {
    const repo = makeRepo();
    const service = new UsersService(repo as never);
    const expira = new Date();

    await service.guardarCodigo2FA('u1', 'hash-del-codigo', expira);
    expect(repo.update).toHaveBeenCalledWith('u1', { twoFactorCodeHash: 'hash-del-codigo', twoFactorCodeExpira: expira });

    await service.limpiarCodigo2FA('u1');
    expect(repo.update).toHaveBeenCalledWith('u1', { twoFactorCodeHash: null, twoFactorCodeExpira: null });
  });
});
