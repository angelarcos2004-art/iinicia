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
  loginConGoogle as apiLoginConGoogle,
  registrarAspirante as apiRegistrarAspirante,
} from "./api";
import type { AuthResponse, LoginInput, RegistroAspiranteInput, Usuario } from "./types";

const STORAGE_KEY = "iinicia.sesion";

type Sesion = { token: string; usuario: Usuario };

type AuthContextValue = {
  sesion: Sesion | null;
  /** true mientras se lee la sesion guardada en localStorage al cargar. */
  cargando: boolean;
  login: (input: LoginInput) => Promise<void>;
  loginConGoogle: (idToken: string) => Promise<void>;
  registrarAspirante: (input: RegistroAspiranteInput) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function leerSesionGuardada(): Sesion | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}

function guardarSesion(sesion: Sesion | null) {
  try {
    if (sesion) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage no disponible (modo privado, etc.): la sesion solo
    // vive en memoria durante esta pestaña.
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

  function aplicarRespuesta(response: AuthResponse) {
    const nueva: Sesion = { token: response.token, usuario: response.usuario };
    setSesion(nueva);
    guardarSesion(nueva);
  }

  async function login(input: LoginInput) {
    aplicarRespuesta(await apiLogin(input));
  }

  async function loginConGoogle(idToken: string) {
    aplicarRespuesta(await apiLoginConGoogle(idToken));
  }

  async function registrarAspirante(input: RegistroAspiranteInput) {
    aplicarRespuesta(await apiRegistrarAspirante(input));
  }

  function logout() {
    setSesion(null);
    guardarSesion(null);
  }

  return (
    <AuthContext.Provider
      value={{ sesion, cargando, login, loginConGoogle, registrarAspirante, logout }}
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
