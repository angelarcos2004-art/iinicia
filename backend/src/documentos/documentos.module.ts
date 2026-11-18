import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Documento } from './documento.entity.js';
import { DocumentosController } from './documentos.controller.js';
import { DocumentosService } from './documentos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Documento]), AuthModule],
  controllers: [DocumentosController],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
