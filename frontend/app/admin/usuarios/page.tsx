"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { SectionBg } from "@/components/ui/section-bg";
import { ApiError, actualizarRolUsuario, obtenerUsuarios } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Rol, UsuarioListado } from "@/lib/types";

const ROL_LABEL: Record<Rol, string> = {
  superadmin: "Superadministrador",
  admin_academico: "Administrador académico",
  coordinador: "Coordinador",
  profesor: "Profesor",
  estudiante: "Estudiante",
  aspirante: "Aspirante",
};

const ROLES_CON_ACCESO: Rol[] = ["superadmin", "admin_academico", "coordinador"];
const ROLES_QUE_PUEDEN_CAMBIAR_ROL: Rol[] = ["superadmin", "admin_academico"];

function formatFecha(fechaIso: string) {
  return new Date(fechaIso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUsuariosPage() {
  const { sesion, cargando } = useAuth();
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<UsuarioListado[] | null>(null);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroRol, setFiltroRol] = useState<Rol | "">("");
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  useEffect(() => {
    if (cargando) return;
    if (!sesion || !ROLES_CON_ACCESO.includes(sesion.usuario.rol)) {
      router.replace(sesion ? "/mi-iinicia" : "/login");
    }
  }, [cargando, sesion, router]);

  const tieneAcceso = !!sesion && ROLES_CON_ACCESO.includes(sesion.usuario.rol);

  useEffect(() => {
    if (!tieneAcceso || !sesion) return;
    let cancelado = false;
    setCargandoUsuarios(true);
    obtenerUsuarios(sesion.token, filtroRol || undefined)
      .then((data) => {
        if (!cancelado) setUsuarios(data);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista de usuarios.");
      })
      .finally(() => {
        if (!cancelado) setCargandoUsuarios(false);
      });
    return () => {
      cancelado = true;
    };
  }, [tieneAcceso, sesion, filtroRol]);

  async function cambiarRol(usuario: UsuarioListado, nuevoRol: Rol) {
    if (!sesion || nuevoRol === usuario.rol) return;
    setError(null);
    setGuardandoId(usuario.id);
    try {
      const actualizado = await actualizarRolUsuario(sesion.token, usuario.id, nuevoRol);
      setUsuarios(
        (prev) => prev?.map((u) => (u.id === usuario.id ? { ...u, rol: actualizado.rol } : u)) ?? prev,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el rol.");
    } finally {
      setGuardandoId(null);
    }
  }

  if (cargando || !tieneAcceso) {
    return (
      <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <p className="text-body-md text-ink-muted">Cargando…</p>
      </section>
    );
  }

  const puedeEditar = ROLES_QUE_PUEDEN_CAMBIAR_ROL.includes(sesion.usuario.rol);

  return (
    <section className="relative overflow-hidden">
      <SectionBg image="/images/bg-abstract-1.png" opacity={0.06} />
      <div className="relative mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <Reveal className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-headline-lg font-display font-bold text-primary">Usuarios</h1>
            <p className="text-body-md text-ink-muted">
              {puedeEditar
                ? "Administra roles y accesos de la plataforma."
                : "Consulta de usuarios (solo lectura para tu rol)."}
            </p>
          </div>
          <select
            aria-label="Filtrar por rol"
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value as Rol | "")}
            className="h-11 rounded-md border border-border-subtle bg-surface-canvas px-4 text-body-sm text-ink outline-none focus:border-secondary focus:ring-[3px] focus:ring-secondary/15"
          >
            <option value="">Todos los roles</option>
            {Object.entries(ROL_LABEL).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </Reveal>

        {error && (
          <Card className="mb-4 text-body-sm text-error">{error}</Card>
        )}

        {cargandoUsuarios ? (
          <p className="text-body-sm text-ink-muted">Consultando usuarios…</p>
        ) : !usuarios || usuarios.length === 0 ? (
          <Card className="text-body-sm text-ink-muted">No hay usuarios con ese filtro.</Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-border-subtle text-label-sm font-display font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Correo</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3">Moodle</th>
                  <th className="px-5 py-3">Alta</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-5 py-3 text-body-sm font-semibold text-ink">{usuario.nombre}</td>
                    <td className="px-5 py-3 text-body-sm text-ink-muted">{usuario.correo}</td>
                    <td className="px-5 py-3">
                      {puedeEditar ? (
                        <select
                          aria-label={`Cambiar rol de ${usuario.nombre}`}
                          value={usuario.rol}
                          disabled={guardandoId === usuario.id}
                          onChange={(e) => cambiarRol(usuario, e.target.value as Rol)}
                          className="h-9 rounded-md border border-border-subtle bg-surface-canvas px-3 text-body-sm text-ink outline-none focus:border-secondary focus:ring-[3px] focus:ring-secondary/15 disabled:opacity-50"
                        >
                          {Object.entries(ROL_LABEL).map(([valor, etiqueta]) => (
                            <option key={valor} value={valor}>
                              {etiqueta}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant="academic">{ROL_LABEL[usuario.rol]}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-body-sm text-ink-muted">
                      {usuario.moodleUserId ? `#${usuario.moodleUserId}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-body-sm text-ink-muted">
                      {formatFecha(usuario.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </section>
  );
}
