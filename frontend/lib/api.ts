import { buildMockAuthResponse } from "./mock-data";
import type {
  ActividadProxima,
  AuthResponse,
  CursoInscrito,
  LoginInput,
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

async function patchJSON<T>(path: string, token: string, body: unknown): Promise<T> {
  if (!API_URL) {
    throw new BackendUnavailableError("NEXT_PUBLIC_API_URL no está configurado");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
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

/**
 * Simula latencia de red para que los estados de carga de la UI sean
 * representativos incluso con datos mock.
 */
function withMockDelay<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Inicia sesión contra el backend IINICIA (NEXT_PUBLIC_API_URL).
 * Si el backend aún no existe o no responde, cae a una respuesta simulada
 * para permitir desarrollar y probar la UI de forma aislada. Una vez que
 * el backend exista, los errores de credenciales que sí respondan (401,
 * 400, etc.) se muestran al usuario en vez de enmascararse.
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  try {
    return await postJSON<AuthResponse>("/auth/login", input);
  } catch (error) {
    if (error instanceof BackendUnavailableError) {
      return withMockDelay(buildMockAuthResponse(input.correo, "Aspirante IINICIA"));
    }
    throw error;
  }
}

/**
 * Registra un aspirante contra el backend IINICIA. Mismo criterio de
 * fallback a datos mock que `login`.
 */
export async function registrarAspirante(
  input: RegistroAspiranteInput,
): Promise<AuthResponse> {
  try {
    return await postJSON<AuthResponse>("/auth/registro", input);
  } catch (error) {
    if (error instanceof BackendUnavailableError) {
      return withMockDelay(buildMockAuthResponse(input.correo, input.nombreCompleto));
    }
    throw error;
  }
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
