import { MOCK_PROGRAMAS } from "./mock-data";
import type {
  ActividadProxima,
  AuthResponse,
  CursoInscrito,
  CursoMoodle,
  EstudianteDeProfesor,
  LoginInput,
  Materia,
  MateriaInput,
  Programa,
  ProgramaInput,
  RegistroAspiranteInput,
  Rol,
  UsuarioListado,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** El backend no responde o NEXT_PUBLIC_API_URL no está configurado. */
export class BackendUnavailableError extends Error {}

/** El backend respondió, pero rechazó la solicitud (credenciales, validación, etc.). */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) {
    throw new BackendUnavailableError("NEXT_PUBLIC_API_URL no está configurado");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (networkError) {
    throw new BackendUnavailableError(
      `No se pudo conectar con el backend (${String(networkError)})`,
    );
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      data?.message ?? `El backend respondió con error ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

async function sendAuthJSON<T>(
  method: "POST" | "PATCH",
  path: string,
  token: string,
  body: unknown,
): Promise<T> {
  if (!API_URL) {
    throw new BackendUnavailableError("NEXT_PUBLIC_API_URL no está configurado");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch (networkError) {
    throw new BackendUnavailableError(
      `No se pudo conectar con el backend (${String(networkError)})`,
    );
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      data?.message ?? `El backend respondió con error ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

function patchJSON<T>(path: string, token: string, body: unknown): Promise<T> {
  return sendAuthJSON<T>("PATCH", path, token, body);
}

function postAuthJSON<T>(path: string, token: string, body: unknown): Promise<T> {
  return sendAuthJSON<T>("POST", path, token, body);
}

async function getJSON<T>(path: string, token: string): Promise<T> {
  if (!API_URL) {
    throw new BackendUnavailableError("NEXT_PUBLIC_API_URL no está configurado");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (networkError) {
    throw new BackendUnavailableError(
      `No se pudo conectar con el backend (${String(networkError)})`,
    );
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      data?.message ?? `El backend respondió con error ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

/** Igual que getJSON, sin Authorization: para endpoints públicos (p. ej. GET /programas). */
async function getPublicJSON<T>(path: string): Promise<T> {
  if (!API_URL) {
    throw new BackendUnavailableError("NEXT_PUBLIC_API_URL no está configurado");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`);
  } catch (networkError) {
    throw new BackendUnavailableError(
      `No se pudo conectar con el backend (${String(networkError)})`,
    );
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      data?.message ?? `El backend respondió con error ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Simula latencia de red para que los estados de carga de la UI sean
 * representativos incluso con datos mock.
 */
function withMockDelay<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Inicia sesión contra el backend IINICIA (NEXT_PUBLIC_API_URL). */
export async function login(input: LoginInput): Promise<AuthResponse> {
  return postJSON<AuthResponse>("/auth/login", input);
}

/** Inicia sesión con el idToken que entrega Google Identity Services. */
export async function loginConGoogle(idToken: string): Promise<AuthResponse> {
  return postJSON<AuthResponse>("/auth/google", { idToken });
}

/** Registra un aspirante contra el backend IINICIA. */
export async function registrarAspirante(
  input: RegistroAspiranteInput,
): Promise<AuthResponse> {
  return postJSON<AuthResponse>("/auth/registro", input);
}

/**
 * Catálogo de oferta académica (home y registro de aspirantes). Si el backend no responde,
 * cae al catálogo de respaldo para que esas páginas sigan funcionando.
 */
export async function obtenerProgramas(): Promise<Programa[]> {
  try {
    return await getPublicJSON<Programa[]>("/programas");
  } catch (error) {
    if (error instanceof BackendUnavailableError) {
      return withMockDelay(MOCK_PROGRAMAS);
    }
    throw error;
  }
}

/** Panel administrativo: crea un programa nuevo. Solo superadmin/admin_academico. */
export async function crearPrograma(
  token: string,
  id: string,
  input: ProgramaInput,
): Promise<Programa> {
  return postAuthJSON<Programa>("/programas", token, { id, ...input });
}

/** Panel administrativo: edita un programa existente (incluido su curso de Moodle). */
export async function actualizarPrograma(
  token: string,
  id: string,
  input: Partial<ProgramaInput>,
): Promise<Programa> {
  return patchJSON<Programa>(`/programas/${id}`, token, input);
}

/** Panel administrativo (/admin/materias): materias de una carrera, para armar su seriación. */
export async function obtenerMaterias(token: string, programaId?: string): Promise<Materia[]> {
  const query = programaId ? `?programaId=${encodeURIComponent(programaId)}` : "";
  return getJSON<Materia[]>(`/materias${query}`, token);
}

/** Crea una materia nueva dentro de una carrera, con sus prerequisitos (ids de otras materias). */
export async function crearMateria(token: string, input: MateriaInput): Promise<Materia> {
  return postAuthJSON<Materia>("/materias", token, input);
}

/** Edita una materia existente (nombre, curso de Moodle o sus prerequisitos). */
export async function actualizarMateria(
  token: string,
  id: string,
  input: Partial<Omit<MateriaInput, "id" | "programaId">>,
): Promise<Materia> {
  return patchJSON<Materia>(`/materias/${id}`, token, input);
}

/**
 * Borra una materia. El backend rechaza (400) borrar una que otra materia todavía tiene
 * como prerequisito, para no dejar un prerequisito fantasma que deje avanzar a cualquiera.
 */
export async function eliminarMateria(token: string, id: string): Promise<void> {
  if (!API_URL) {
    throw new BackendUnavailableError("NEXT_PUBLIC_API_URL no está configurado");
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}/materias/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (networkError) {
    throw new BackendUnavailableError(`No se pudo conectar con el backend (${String(networkError)})`);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(data?.message ?? `El backend respondió con error ${response.status}`, response.status);
  }
}

/**
 * Pide el enlace de recuperación de contraseña. El backend siempre responde igual, exista o
 * no la cuenta (nunca hay que revelar qué correos están registrados), así que esta función no
 * necesita (ni debe) distinguir ese caso.
 */
export async function recuperarPassword(correo: string): Promise<void> {
  await postJSON<{ mensaje: string }>("/auth/recuperar", { correo });
}

/** Usa el token del enlace de recuperación para fijar una nueva contraseña. */
export async function restablecerPassword(input: {
  correo: string;
  token: string;
  nuevaPassword: string;
}): Promise<void> {
  await postJSON<{ mensaje: string }>("/auth/restablecer", input);
}

/**
 * Cursos reales en los que el usuario autenticado está inscrito en
 * Moodle. A diferencia de login/registro, no cae a datos simulados si el
 * backend no responde: es información personal real, no tiene sentido
 * inventarla. El llamador decide cómo mostrar el error.
 */
export async function obtenerMisCursos(token: string): Promise<CursoInscrito[]> {
  return getJSON<CursoInscrito[]>("/estudiante/cursos", token);
}

/**
 * URL de un solo uso para entrar a Moodle ya autenticado (SSO), sin pedir
 * contraseña. Expira en segundos: hay que pedirla justo antes de navegar,
 * nunca guardarla ni reutilizarla.
 */
export async function obtenerUrlCampus(token: string, cursoId?: number): Promise<string> {
  const query = cursoId ? `?cursoId=${cursoId}` : "";
  const { url } = await getJSON<{ url: string }>(`/estudiante/moodle-sso${query}`, token);
  return url;
}

/**
 * Igual que `obtenerUrlCampus`, pero para abrir directo una actividad (la `url` que devuelve
 * `obtenerProximasActividades`) en vez del curso completo.
 */
export async function obtenerUrlCampusActividad(token: string, actividadUrl: string): Promise<string> {
  const query = `?actividadUrl=${encodeURIComponent(actividadUrl)}`;
  const { url } = await getJSON<{ url: string }>(`/estudiante/moodle-sso${query}`, token);
  return url;
}

/**
 * Próximas actividades con fecha límite (tareas, cuestionarios, etc.) de todos los cursos del
 * usuario. Mismo criterio que `obtenerMisCursos`: información real, sin fallback simulado.
 */
export async function obtenerProximasActividades(token: string): Promise<ActividadProxima[]> {
  return getJSON<ActividadProxima[]>("/estudiante/actividades", token);
}

/** Panel administrativo: lista de usuarios, con filtro opcional por rol. */
export async function obtenerUsuarios(token: string, rol?: Rol): Promise<UsuarioListado[]> {
  const query = rol ? `?rol=${rol}` : "";
  return getJSON<UsuarioListado[]>(`/usuarios${query}`, token);
}

/** Cambia el rol de un usuario (admisión, promoción, etc.). Solo superadmin/admin_academico. */
export async function actualizarRolUsuario(
  token: string,
  id: string,
  rol: Rol,
): Promise<UsuarioListado> {
  return patchJSON<UsuarioListado>(`/usuarios/${id}/rol`, token, { rol });
}

/**
 * Matricula a un aspirante o estudiante en el curso de Moodle elegido por el admin: vincula su
 * cuenta Moodle si aún no existe y lo matricula ahí (idempotente, puede repetirse para
 * matricular en más cursos). Solo superadmin/admin_academico.
 */
export async function asignarCursoUsuario(
  token: string,
  id: string,
  cursoShortname: string,
): Promise<UsuarioListado> {
  return postAuthJSON<UsuarioListado>(`/usuarios/${id}/matricula`, token, { cursoShortname });
}

/** Catálogo real de cursos de Moodle, para elegirlo de una lista al matricular. */
export async function obtenerCursosMoodle(token: string): Promise<CursoMoodle[]> {
  return getJSON<CursoMoodle[]>("/usuarios/cursos-moodle", token);
}

/**
 * Estudiantes reales de los cursos que imparte el profesor autenticado, para poder
 * notificarlos sin exponerle la lista completa de usuarios de la plataforma. Solo profesor.
 */
export async function obtenerMisEstudiantes(token: string): Promise<EstudianteDeProfesor[]> {
  return getJSON<EstudianteDeProfesor[]>("/usuarios/mis-estudiantes", token);
}

/**
 * Notificación push controlada a un estudiante (CA-14). `cursoId` es opcional: si se da, la
 * app Android abre directo el detalle de ese curso al tocar la notificación. El backend
 * responde 400 si ese usuario no tiene un dispositivo registrado todavía.
 */
export async function enviarNotificacion(
  token: string,
  id: string,
  input: { titulo: string; mensaje: string; cursoId?: string },
): Promise<void> {
  await postAuthJSON<{ enviado: true }>(`/usuarios/${id}/notificar`, token, input);
}
