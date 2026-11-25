"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  registrarAspirante as apiRegistrarAspirante,
  verificarCodigo2FA as apiVerificarCodigo2FA,
} from "./api";
import type {
  AuthResponse,
  LoginInput,
  RegistroAspiranteInput,
  Requiere2FAResponse,
  Usuario,
} from "./types";

const STORAGE_KEY = "iinicia.sesion";

type Sesion = { token: string; usuario: Usuario };

type AuthContextValue = {
  sesion: Sesion | null;
  /** true mientras se lee la sesion guardada en localStorage al cargar. */
  cargando: boolean;
  /** Primer factor (correo + contraseña). No abre sesión: el backend manda un código al
   * correo, que se confirma con `verificarCodigo2FA`. */
  login: (input: LoginInput) => Promise<Requiere2FAResponse>;
  /** Segundo factor: el código de 6 dígitos que llegó al correo. Recién aquí se abre sesión. */
  verificarCodigo2FA: (correo: string, codigo: string, recordar?: boolean) => Promise<void>;
  registrarAspirante: (input: RegistroAspiranteInput) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function leerSesionGuardada(): Sesion | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}

// "Recordarme" desmarcado => sessionStorage (la sesion no sobrevive a cerrar
// la pestaña); marcado (default) => localStorage, como antes.
function guardarSesion(sesion: Sesion | null, recordar = true) {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (sesion) {
      (recordar ? window.localStorage : window.sessionStorage).setItem(
        STORAGE_KEY,
        JSON.stringify(sesion),
      );
    }
  } catch {
    // localStorage/sessionStorage no disponible (modo privado, etc.): la
    // sesion solo vive en memoria durante esta pestaña.
  }
}

/**
 * Sesion del usuario para esta primera entrega: vive en localStorage del
 * navegador mientras no exista un backend con JWT/cookies reales
 * (docs/requerimientos.md seccion 10, SSO con Keycloak pendiente). Permite
 * que el header y /mi-iinicia reaccionen a quien inicio sesion y a su rol.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Lectura unica de localStorage al montar: es hidratacion segura de
    // una fuente externa (no hay forma de leerla durante el render en
    // servidor), no un ciclo de renders en cascada.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(leerSesionGuardada());
    setCargando(false);
  }, []);

  function aplicarRespuesta(response: AuthResponse, recordar = true) {
    const nueva: Sesion = { token: response.token, usuario: response.usuario };
    setSesion(nueva);
    guardarSesion(nueva, recordar);
  }

  async function login(input: LoginInput): Promise<Requiere2FAResponse> {
    return apiLogin(input);
  }

  async function verificarCodigo2FA(correo: string, codigo: string, recordar = true) {
    aplicarRespuesta(await apiVerificarCodigo2FA(correo, codigo), recordar);
  }

  async function registrarAspirante(input: RegistroAspiranteInput) {
    aplicarRespuesta(await apiRegistrarAspirante(input));
  }

  function logout() {
    setSesion(null);
    guardarSesion(null, true);
  }

  return (
    <AuthContext.Provider
      value={{ sesion, cargando, login, verificarCodigo2FA, registrarAspirante, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
