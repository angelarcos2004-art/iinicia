"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/ui/reveal";
import { SectionBg } from "@/components/ui/section-bg";
import { Select } from "@/components/ui/select";
import {
  ApiError,
  actualizarRolUsuario,
  asignarCursoUsuario,
  enviarNotificacion,
  obtenerCursosMoodle,
  obtenerUsuarios,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CursoMoodle, Rol, UsuarioListado } from "@/lib/types";

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
const ROLES_QUE_PUEDEN_NOTIFICAR: Rol[] = ["superadmin", "admin_academico", "coordinador", "profesor"];

const FORM_NOTIFICACION_INICIAL = { titulo: "", mensaje: "", cursoId: "" };

/** Roles a los que se puede matricular en un curso de Moodle (ver backend: POST /usuarios/:id/matricula). */
const ROLES_MATRICULABLES: Rol[] = ["aspirante", "estudiante"];

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
  const [notificandoId, setNotificandoId] = useState<string | null>(null);
  const [formNotif, setFormNotif] = useState(FORM_NOTIFICACION_INICIAL);
  const [enviandoNotif, setEnviandoNotif] = useState(false);
  const [resultadoNotif, setResultadoNotif] = useState<Record<string, string>>({});

  const [matriculandoId, setMatriculandoId] = useState<string | null>(null);
  const [cursoShortname, setCursoShortname] = useState("");
  const [asignandoCurso, setAsignandoCurso] = useState(false);
  const [resultadoMatricula, setResultadoMatricula] = useState<Record<string, string>>({});
  const [cursosMoodle, setCursosMoodle] = useState<CursoMoodle[] | null>(null);
  const [errorCursos, setErrorCursos] = useState<string | null>(null);

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

  useEffect(() => {
    if (!sesion || !ROLES_QUE_PUEDEN_CAMBIAR_ROL.includes(sesion.usuario.rol)) return;
    let cancelado = false;
    obtenerCursosMoodle(sesion.token)
      .then((data) => {
        if (!cancelado) setCursosMoodle(data);
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorCursos(err instanceof ApiError ? err.message : "No se pudo cargar el catálogo de cursos de Moodle.");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [sesion]);

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

  function alternarPanelNotificar(usuario: UsuarioListado) {
    if (notificandoId === usuario.id) {
      setNotificandoId(null);
      return;
    }
    setNotificandoId(usuario.id);
    setFormNotif(FORM_NOTIFICACION_INICIAL);
    setResultadoNotif((prev) => ({ ...prev, [usuario.id]: "" }));
  }

  async function handleEnviarNotificacion(usuario: UsuarioListado) {
    if (!sesion) return;
    if (!formNotif.titulo.trim() || !formNotif.mensaje.trim()) {
      setResultadoNotif((prev) => ({ ...prev, [usuario.id]: "Completa el título y el mensaje." }));
      return;
    }
    setEnviandoNotif(true);
    try {
      await enviarNotificacion(sesion.token, usuario.id, {
        titulo: formNotif.titulo.trim(),
        mensaje: formNotif.mensaje.trim(),
        cursoId: formNotif.cursoId.trim() || undefined,
      });
      setResultadoNotif((prev) => ({ ...prev, [usuario.id]: "Notificación enviada." }));
      setFormNotif(FORM_NOTIFICACION_INICIAL);
    } catch (err) {
      setResultadoNotif((prev) => ({
        ...prev,
        [usuario.id]: err instanceof ApiError ? err.message : "No se pudo enviar la notificación.",
      }));
    } finally {
      setEnviandoNotif(false);
    }
  }

  function alternarPanelMatricula(usuario: UsuarioListado) {
    if (matriculandoId === usuario.id) {
      setMatriculandoId(null);
      return;
    }
    setMatriculandoId(usuario.id);
    setCursoShortname("");
    setResultadoMatricula((prev) => ({ ...prev, [usuario.id]: "" }));
  }

  async function handleAsignarCurso(usuario: UsuarioListado) {
    if (!sesion) return;
    if (!cursoShortname.trim()) {
      setResultadoMatricula((prev) => ({ ...prev, [usuario.id]: "Selecciona un curso de Moodle." }));
      return;
    }
    setAsignandoCurso(true);
    try {
      const actualizado = await asignarCursoUsuario(sesion.token, usuario.id, cursoShortname.trim());
      setUsuarios(
        (prev) =>
          prev?.map((u) => (u.id === usuario.id ? { ...u, moodleUserId: actualizado.moodleUserId } : u)) ??
          prev,
      );
      setResultadoMatricula((prev) => ({
        ...prev,
        [usuario.id]: `Matriculado en "${cursoShortname.trim()}".`,
      }));
      setCursoShortname("");
    } catch (err) {
      setResultadoMatricula((prev) => ({
        ...prev,
        [usuario.id]: err instanceof ApiError ? err.message : "No se pudo matricular al usuario.",
      }));
    } finally {
      setAsignandoCurso(false);
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
  const puedeNotificar = ROLES_QUE_PUEDEN_NOTIFICAR.includes(sesion.usuario.rol);

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
                  <th className="px-5 py-3">Programa de interés</th>
                  <th className="px-5 py-3">Moodle</th>
                  <th className="px-5 py-3">Alta</th>
                  {(puedeEditar || puedeNotificar) && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <Fragment key={usuario.id}>
                    <tr className="border-b border-border-subtle last:border-0">
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
                        {usuario.programaInteresNombre ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-body-sm text-ink-muted">
                        {usuario.moodleUserId ? `#${usuario.moodleUserId}` : "—"}
                      </td>
                      <td className="px-5 py-3 text-body-sm text-ink-muted">
                        {formatFecha(usuario.createdAt)}
                      </td>
                      {(puedeEditar || puedeNotificar) && (
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            {puedeEditar && ROLES_MATRICULABLES.includes(usuario.rol) && (
                              <Button
                                variant="outline"
                                className="h-9 px-3 text-label-sm"
                                onClick={() => alternarPanelMatricula(usuario)}
                              >
                                {matriculandoId === usuario.id ? "Cancelar" : "Matricular"}
                              </Button>
                            )}
                            {puedeNotificar && (
                              <Button
                                variant="outline"
                                className="h-9 px-3 text-label-sm"
                                onClick={() => alternarPanelNotificar(usuario)}
                              >
                                {notificandoId === usuario.id ? "Cancelar" : "Notificar"}
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {matriculandoId === usuario.id && (
                      <tr className="border-b border-border-subtle last:border-0 bg-surface-subtle/40">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-end">
                            {cursosMoodle ? (
                              <Select
                                id={`matricula-curso-${usuario.id}`}
                                label="Curso de Moodle"
                                hint="Lista en vivo de Moodle: se actualiza sola si se crean más cursos."
                                value={cursoShortname}
                                onChange={(e) => setCursoShortname(e.target.value)}
                                className="md:w-72"
                              >
                                <option value="">Selecciona un curso…</option>
                                {cursosMoodle.map((curso) => (
                                  <option key={curso.id} value={curso.shortname}>
                                    {curso.fullname}
                                  </option>
                                ))}
                              </Select>
                            ) : (
                              <Input
                                id={`matricula-curso-${usuario.id}`}
                                label="Curso de Moodle (shortname)"
                                hint={errorCursos ?? "Cargando catálogo de Moodle…"}
                                placeholder="Ej. IINICIA101-SOFTWARE"
                                value={cursoShortname}
                                onChange={(e) => setCursoShortname(e.target.value)}
                                className="md:w-64"
                              />
                            )}
                            <Button
                              variant="primary"
                              disabled={asignandoCurso}
                              onClick={() => handleAsignarCurso(usuario)}
                              className="h-12"
                            >
                              {asignandoCurso ? "Matriculando…" : "Matricular"}
                            </Button>
                          </div>
                          {resultadoMatricula[usuario.id] && (
                            <p className="mt-2 text-body-sm text-ink-muted">
                              {resultadoMatricula[usuario.id]}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                    {notificandoId === usuario.id && (
                      <tr className="border-b border-border-subtle last:border-0 bg-surface-subtle/40">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-end">
                            <Input
                              id={`notif-titulo-${usuario.id}`}
                              label="Título"
                              placeholder="Aviso"
                              value={formNotif.titulo}
                              onChange={(e) => setFormNotif({ ...formNotif, titulo: e.target.value })}
                              className="md:w-48"
                            />
                            <Input
                              id={`notif-mensaje-${usuario.id}`}
                              label="Mensaje"
                              placeholder="Tu clase de mañana se reprograma."
                              value={formNotif.mensaje}
                              onChange={(e) => setFormNotif({ ...formNotif, mensaje: e.target.value })}
                              className="md:w-80"
                            />
                            <Input
                              id={`notif-curso-${usuario.id}`}
                              label="Id de curso (opcional)"
                              hint="Abre directo ese curso al tocar la notificación."
                              placeholder="Ej. 2"
                              value={formNotif.cursoId}
                              onChange={(e) => setFormNotif({ ...formNotif, cursoId: e.target.value })}
                              className="md:w-40"
                            />
                            <Button
                              variant="primary"
                              disabled={enviandoNotif}
                              onClick={() => handleEnviarNotificacion(usuario)}
                              className="h-12"
                            >
                              {enviandoNotif ? "Enviando…" : "Enviar"}
                            </Button>
                          </div>
                          {resultadoNotif[usuario.id] && (
                            <p className="mt-2 text-body-sm text-ink-muted">{resultadoNotif[usuario.id]}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </section>
  );
}
