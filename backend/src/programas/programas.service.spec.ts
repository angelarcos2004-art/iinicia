import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Programa } from './programa.entity.js';
import { ProgramasService } from './programas.service.js';

function makeService(items: Programa[] = []) {
  const repo = {
    find: vi.fn().mockImplementation(async () => [...items].sort((a, b) => a.nombre.localeCompare(b.nombre))),
    findOne: vi.fn().mockImplementation(async ({ where: { id } }: { where: { id: string } }) =>
      items.find((p) => p.id === id) ?? null,
    ),
    create: vi.fn().mockImplementation((data: Partial<Programa>) => data as Programa),
    save: vi.fn().mockImplementation(async (programa: Programa) => {
      const i = items.findIndex((p) => p.id === programa.id);
      if (i === -1) items.push(programa);
      else items[i] = programa;
      return programa;
    }),
  } as unknown as Repository<Programa>;
  return { service: new ProgramasService(repo), items };
}

const base = {
  id: 'lic-software-ia',
  tipo: 'licenciatura' as const,
  nombre: 'Ingeniería de Software e IA',
  descripcion: 'desc',
  duracion: '12 cuatrimestres',
  modalidad: 'en_linea' as const,
  moodleCourseShortname: null,
};

describe('ProgramasService', () => {
  it('crear guarda el programa nuevo', async () => {
    const { service, items } = makeService();
    const creado = await service.crear(base);
    expect(creado).toEqual(base);
    expect(items).toHaveLength(1);
  });

  it('crear rechaza un id duplicado', async () => {
    const { service } = makeService([base]);
    await expect(service.crear(base)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('actualizar mezcla solo los campos dados', async () => {
    const { service } = makeService([{ ...base }]);
    const actualizado = await service.actualizar('lic-software-ia', { moodleCourseShortname: 'IINICIA101' });
    expect(actualizado.moodleCourseShortname).toBe('IINICIA101');
    expect(actualizado.nombre).toBe(base.nombre);
  });

  it('actualizar un id inexistente lanza 404', async () => {
    const { service } = makeService([]);
    await expect(service.actualizar('no-existe', { nombre: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('obtenerMoodleCourseShortname', () => {
    it('null si no se da ningún programaId', async () => {
      const { service } = makeService([base]);
      await expect(service.obtenerMoodleCourseShortname(null)).resolves.toBeNull();
    });

    it('null si el programa no existe', async () => {
      const { service } = makeService([base]);
      await expect(service.obtenerMoodleCourseShortname('no-existe')).resolves.toBeNull();
    });

    it('null si el programa existe pero no tiene curso asignado', async () => {
      const { service } = makeService([base]);
      await expect(service.obtenerMoodleCourseShortname('lic-software-ia')).resolves.toBeNull();
    });

    it('devuelve el shortname cuando el programa sí lo tiene', async () => {
      const { service } = makeService([{ ...base, moodleCourseShortname: 'IINICIA101' }]);
      await expect(service.obtenerMoodleCourseShortname('lic-software-ia')).resolves.toBe(
        'IINICIA101',
      );
    });
  });
});
