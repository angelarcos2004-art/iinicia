import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import type { Rol } from "@/lib/types";

/** Precarga una sesión en localStorage (igual que hace AuthProvider al guardarla) antes de
 * montar <AuthProvider>, para probar páginas que requieren sesión sin mockear el contexto. */
export function sembrarSesion(sesion: {
  token: string;
  usuario: { id: string; nombre: string; correo: string; rol: Rol };
} | null) {
  try {
    if (sesion) window.localStorage.setItem("iinicia.sesion", JSON.stringify(sesion));
    else window.localStorage.clear();
  } catch {
    // no-op
  }
}

export function ConAuth({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
