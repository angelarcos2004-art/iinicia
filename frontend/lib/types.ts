/** Roles definidos en CLAUDE.md. El backend valida estos mismos roles. */
export type Rol =
  | "superadmin"
  | "admin_academico"
  | "coordinador"
  | "profesor"
  | "estudiante"
  | "aspirante";

export type TipoPrograma = "licenciatura" | "diplomado" | "certificacion";

export type Modalidad = "en_linea" | "hibrida";

export interface Programa {
  id: string;
  tipo: TipoPrograma;
  nombre: string;
  descripcion: string;
  duracion: string;
  modalidad: Modalidad;
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}

/** Fila del panel administrativo (GET /usuarios). */
export interface UsuarioListado extends Usuario {
  moodleUserId: number | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

export interface LoginInput {
  correo: string;
  password: string;
}

export interface RegistroAspiranteInput {
  nombreCompleto: string;
  correo: string;
  password: string;
  programaInteresId: string;
  aceptaAvisoPrivacidad: boolean;
  deseaInformacionBecas: boolean;
}

export type EstadoCurso = "en_curso" | "por_iniciar" | "finalizado";

export interface CursoEstudiante {
  id: string;
  nombre: string;
  periodo: string;
  progreso: number;
  estado: EstadoCurso;
}

/**
 * Curso real de Moodle (GET /estudiante/cursos), tal como lo devuelve el
 * backend. `progreso` es null cuando el curso no tiene seguimiento de
 * finalización activado en Moodle: no se inventa un valor.
 */
export interface CursoInscrito {
  id: number;
  nombre: string;
  shortname: string;
  progreso: number | null;
}

export interface AvisoInstitucional {
  id: string;
  titulo: string;
  fecha: string;
  resumen: string;
}

export interface DashboardEstudiante {
  usuario: Usuario;
  cuatrimestre: string;
  creditosObtenidos: number;
  creditosTotales: number;
  progresoCurricular: number;
  cursos: CursoEstudiante[];
  avisos: AvisoInstitucional[];
}
