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
  /** Curso de Moodle (shortname) al que se matricula a quien sea admitido en este programa.
   * Null = todavía no tiene uno asignado (panel admin /admin/programas). */
  moodleCourseShortname: string | null;
}

/** Datos editables de un programa (todo excepto el id, que no cambia). */
export type ProgramaInput = Omit<Programa, "id">;

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

/**
 * Próxima actividad con fecha límite (GET /estudiante/actividades), tal como la devuelve el
 * backend desde Moodle (`core_calendar_get_action_events_by_timesort`).
 */
export interface ActividadProxima {
  id: number;
  titulo: string;
  curso: string;
  fecha: string;
  url: string | null;
}

export interface AvisoInstitucional {
  id: string;
  titulo: string;
  fecha: string;
  resumen: string;
  imagen: string;
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

/** Datos simulados (ver mock-data.ts): el backend aún no expone un reporte de grupos. */
export interface GrupoProfesor {
  id: string;
  curso: string;
  periodo: string;
  estudiantes: number;
  entregasPendientes: number;
}

export interface SolicitudAspirante {
  programaNombre: string;
  estado: "en_revision" | "admitido" | "rechazado";
  pasos: { label: string; completado: boolean }[];
}

export interface ResumenCoordinacion {
  programa: string;
  estudiantesActivos: number;
  profesores: number;
  avancePromedio: number;
  alertas: { id: string; mensaje: string }[];
}

export interface ResumenAdmin {
  usuariosPorRol: { rol: Rol; total: number }[];
  solicitudesPendientes: number;
  cuentasMoodleVinculadas: number;
}
