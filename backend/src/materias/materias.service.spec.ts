import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import type { MoodleService } from '../moodle/moodle.service.js';
import type { User } from '../users/user.entity.js';
import type { Materia } from './materia.entity.js';
import { MateriasService } from './materias.service.js';

function makeService(items: Materia[] = [], aprobados: string[] = []) {
  const repo = {
    find: vi.fn().mockImplementation(async (opts?: { where?: { programaId?: string; id?: unknown } }) => {
      const where = opts?.where;
      return items.filter((m) => {
        if (where?.id) {
          // TypeORM In(...) — extraemos los ids tal como lo hace la query real.
          const ids: string[] = (where.id as ReturnType<typeof In>)['value'] ?? [];
          if (!ids.includes(m.id)) return false;
        }
        if (where?.programaId && m.programaId !== where.programaId) return false;
        return true;
      });
    }),
    findOne: vi.fn().mockImplementation(async (opts: { where: Partial<Materia> }) =>
      items.find((m) =>
        Object.entries(opts.where).every(([k, v]) => (m as unknown as Record<string, unknown>)[k] === v),
      ) ?? null,
    ),
    create: vi.fn().mockImplementation((data: Partial<Materia>) => data as Materia),
    save: vi.fn().mockImplementation(async (materia: Materia) => {
      const i = items.findIndex((m) => m.id === materia.id);
      if (i === -1) items.push(materia);
      else items[i] = materia;
      return materia;
    }),
    delete: vi.fn().mockImplementation(async (id: string) => {
      const i = items.findIndex((m) => m.id === id);
      if (i !== -1) items.splice(i, 1);
    }),
  } as unknown as Repository<Materia>;
  const moodle = {
    obtenerCursosAprobados: vi.fn().mockResolvedValue(new Set(aprobados)),
  } as unknown as MoodleService;
  return { service: new MateriasService(repo, moodle), items, moodle };
}

const calculo1: Materia = {
  id: 'calculo-1',
  programaId: 'lic-software-ia',
  nombre: 'Cálculo I',
  moodleCourseShortname: 'CALCULO1',
  prerequisitos: [],
};

const calculo2: Materia = {
  id: 'calculo-2',
  programaId: 'lic-software-ia',
  nombre: 'Cálculo II',
  moodleCourseShortname: 'CALCULO2',
  prerequisitos: ['calculo-1'],
};

const userBase: User = {
  id: 'u-1',
  nombre: 'Estudiante',
  correo: 'e@correo.com',
  passwordHash: 'x',
  rol: 'estudiante' as User['rol'],
  moodleUserId: 5,
  programaInteresId: 'lic-software-ia',
  aceptaAvisoPrivacidad: true,
  deseaInformacionBecas: false,
  fcmToken: null,
  resetPasswordTokenHash: null,
  resetPasswordExpira: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('MateriasService', () => {
  it('crear guarda la materia nueva', async () => {
    const { service, items } = makeService();
    const creada = await service.crear({ ...calculo1 });
    expect(creada).toEqual(calculo1);
    expect(items).toHaveLength(1);
  });

  it('crear rechaza un id duplicado', async () => {
    const { service } = makeService([calculo1]);
    await expect(service.crear({ ...calculo1 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crear rechaza que una materia sea prerequisito de sí misma', async () => {
    const { service } = makeService([]);
    await expect(
      service.crear({ ...calculo1, prerequisitos: ['calculo-1'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crear rechaza un prerequisito que no existe en esa carrera', async () => {
    const { service } = makeService([]);
    await expect(
      service.crear({ ...calculo2, prerequisitos: ['no-existe'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crear rechaza un prerequisito que existe pero es de otra carrera', async () => {
    const otraCarrera: Materia = { ...calculo1, id: 'otra-1', programaId: 'otra-carrera' };
    const { service } = makeService([otraCarrera]);
    await expect(
      service.crear({ ...calculo2, prerequisitos: ['otra-1'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('actualizar un id inexistente lanza 404', async () => {
    const { service } = makeService([]);
    await expect(service.actualizar('no-existe', { nombre: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('actualizar valida los prerequisitos nuevos igual que crear', async () => {
    const { service } = makeService([calculo1, calculo2]);
    await expect(
      service.actualizar('calculo-2', { prerequisitos: ['calculo-2'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('eliminar', () => {
    it('lanza 404 si la materia no existe', async () => {
      const { service } = makeService([]);
      await expect(service.eliminar('no-existe')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('bloquea el borrado si otra materia la tiene como prerequisito', async () => {
      const { service, items } = makeService([calculo1, calculo2]);
      await expect(service.eliminar('calculo-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(items).toHaveLength(2);
    });

    it('borra la materia si nadie la tiene como prerequisito', async () => {
      const { service, items } = makeService([calculo1, calculo2]);
      await service.eliminar('calculo-2');
      expect(items).toEqual([calculo1]);
    });
  });

  describe('verificarPrerequisitos', () => {
    it('no bloquea si el usuario no eligió ninguna carrera (programaInteresId null)', async () => {
      const { service } = makeService([calculo1, calculo2]);
      await expect(
        service.verificarPrerequisitos({ ...userBase, programaInteresId: null }, 'CALCULO2'),
      ).resolves.toBeUndefined();
    });

    it('no bloquea si el curso no es una materia registrada de esa carrera (curso suelto)', async () => {
      const { service } = makeService([calculo1, calculo2]);
      await expect(
        service.verificarPrerequisitos(userBase, 'IINICIA-CURSO-SUELTO'),
      ).resolves.toBeUndefined();
    });

    it('no bloquea si la materia no tiene prerequisitos', async () => {
      const { service } = makeService([calculo1, calculo2]);
      await expect(service.verificarPrerequisitos(userBase, 'CALCULO1')).resolves.toBeUndefined();
    });

    it('bloquea si falta aprobar un prerequisito', async () => {
      const { service } = makeService([calculo1, calculo2], []);
      await expect(service.verificarPrerequisitos(userBase, 'CALCULO2')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('deja avanzar si ya aprobó el prerequisito (100% de avance en Moodle)', async () => {
      const { service } = makeService([calculo1, calculo2], ['CALCULO1']);
      await expect(service.verificarPrerequisitos(userBase, 'CALCULO2')).resolves.toBeUndefined();
    });

    it('bloquea (sin consultar Moodle) si el usuario todavía no tiene cuenta Moodle vinculada', async () => {
      const { service, moodle } = makeService([calculo1, calculo2], []);
      await expect(
        service.verificarPrerequisitos({ ...userBase, moodleUserId: null }, 'CALCULO2'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(moodle.obtenerCursosAprobados).not.toHaveBeenCalled();
    });
  });
});
