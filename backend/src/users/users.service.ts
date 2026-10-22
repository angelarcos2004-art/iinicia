import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from './rol.enum.js';
import { User } from './user.entity.js';

export interface CrearUsuarioData {
  nombre: string;
  correo: string;
  passwordHash: string;
  rol?: Rol;
  programaInteresId?: string | null;
  aceptaAvisoPrivacidad?: boolean;
  deseaInformacionBecas?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findByCorreo(correo: string): Promise<User | null> {
    return this.repo.findOne({ where: { correo: correo.trim().toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: CrearUsuarioData): Promise<User> {
    const user = this.repo.create({
      nombre: data.nombre.trim(),
      correo: data.correo.trim().toLowerCase(),
      passwordHash: data.passwordHash,
      rol: data.rol ?? Rol.Aspirante,
      moodleUserId: null,
      programaInteresId: data.programaInteresId ?? null,
      aceptaAvisoPrivacidad: data.aceptaAvisoPrivacidad ?? false,
      deseaInformacionBecas: data.deseaInformacionBecas ?? false,
    });
    return this.repo.save(user);
  }
}
