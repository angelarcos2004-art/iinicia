import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Exige `Authorization: Bearer <token>` válido. Sin él, 401 `{ message }`. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
