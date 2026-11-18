"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { SectionBg } from "@/components/ui/section-bg";
import {
  ApiError,
  enviarNotificacion,
  obtenerMisCursos,
  obtenerMisEstudiantes,
  obtenerProximasActividades,
  obtenerUrlCampus,
  obtenerUrlCampusActividad,
  obtenerUsuarios,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { MOCK_DASHBOARD_ASPIRANTE, MOCK_DASHBOARD_ESTUDIANTE } from "@/lib/mock-data";
import type { ActividadProxima, CursoInscrito, EstudianteDeProfesor, Rol, UsuarioListado } from "@/lib/types";

/** Roles que tienen cursos reales de Moodle propios (como alumno o como profesor). */
const ROLES_CON_CURSOS: Rol[] = ["estudiante", "profesor"];
/** Roles que ven el resumen institucional (GET /usuarios), igual que /admin/usuarios. */
const ROLES_CON_RESUMEN: Rol[] = ["superadmin", "admin_academico", "coordinador"];

const ROL_LABEL: Record<Rol, string> = {
  superadmin: "Superadministrador",
  admin_academico: "Administrador académico",
  coordinador: "Coordinador",
  profesor: "Profesor",
  estudiante: "Estudiante",
  aspirante: "Aspirante",
};

function formatFecha(fechaIso: string) {
  return new Date(fechaIso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Deriva una etiqueta a partir del progreso real; nunca inventa un estado. */
function estadoCurso(progreso: number | null): { label: string; variant: "active" | "neutral" | "academic" } {
  if (progreso === null) return { label: "Inscrito", variant: "neutral" };
  if (progreso >= 100) return { label: "Finalizado", variant: "academic" };
  if (progreso <= 0) return { label: "Por iniciar", variant: "neutral" };
  return { label: "En curso", variant: "active" };
}

export default function MiIiniciaPage() {
  const { sesion, cargando, logout } = useAuth();
  const router = useRouter();

  /** El token JWT expira a la hora (backend/src/auth/auth.module.ts); si una
   * llamada regresa 401 no es un error real, es que la sesión venció. */
  function manejarNoAutorizado(error: unknown): boolean {
    if (error instanceof ApiError && error.status === 401) {
      logout();
      router.replace("/login");
      return true;
    }
    return false;
  }

  const [cursos, setCursos] = useState<CursoInscrito[] | null>(null);
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [errorCursos, setErrorCursos] = useState<string | null>(null);
  const [entrandoACursoId, setEntrandoACursoId] = useState<number | null>(null);
  const [errorCampus, setErrorCampus] = useState<string | null>(null);
  const [actividades, setActividades] = useState<ActividadProxima[] | null>(null);
  const [cargandoActividades, setCargandoActividades] = useState(true);
  const [errorActividades, setErrorActividades] = useState<string | null>(null);
  const [abriendoActividadId, setAbriendoActividadId] = useState<number | null>(null);
  const [usuariosResumen, setUsuariosResumen] = useState<UsuarioListado[] | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);

  /**
   * SSO vía auth_userkey (backend/src/moodle/moodle.service.ts): la url de
   * autologin expira en segundos y sirve una sola vez, así que se pide justo
   * antes de navegar, nunca se guarda ni se reutiliza.
   */
  async function entrarAlCampus(cursoId: number) {
    if (!sesion) return;
    setErrorCampus(null);
    setEntrandoACursoId(cursoId);
    try {
      const url = await obtenerUrlCampus(sesion.token, cursoId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      if (manejarNoAutorizado(error)) return;
      setErrorCampus(
        error instanceof ApiError
          ? error.message
          : "No se pudo generar el acceso a Moodle. Intenta más tarde.",
      );
    } finally {
      setEntrandoACursoId(null);
    }
  }

  /** Misma idea que `entrarAlCampus`, pero aterriza directo en la actividad (no en el curso). */
  async function abrirActividad(actividad: ActividadProxima) {
    if (!sesion || !actividad.url) return;
    setErrorCampus(null);
    setAbriendoActividadId(actividad.id);
    try {
      const url = await obtenerUrlCampusActividad(sesion.token, actividad.url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      if (manejarNoAutorizado(error)) return;
      setErrorCampus(
        error instanceof ApiError
          ? error.message
          : "No se pudo generar el acceso a Moodle. Intenta más tarde.",
      );
    } finally {
      setAbriendoActividadId(null);
    }
  }

  useEffect(() => {
    if (!cargando && !sesion) {
      router.replace("/login");
    }
  }, [cargando, sesion, router]);

  useEffect(() => {
    if (!sesion || !ROLES_CON_CURSOS.includes(sesion.usuario.rol)) return;
    let cancelado = false;

    obtenerMisCursos(sesion.token)
      .then((data) => {
        if (!cancelado) setCursos(data);
      })
      .catch((error) => {
        if (cancelado) return;
        if (manejarNoAutorizado(error)) return;
        setErrorCursos(
          error instanceof ApiError
            ? error.message
            : "No se pudieron cargar tus cursos. Intenta más tarde.",
        );
      })
      .finally(() => {
        if (!cancelado) setCargandoCursos(false);
      });

    return () => {
      cancelado = true;
    };
  }, [sesion]);

  useEffect(() => {
    if (!sesion || !ROLES_CON_CURSOS.includes(sesion.usuario.rol)) return;
    let cancelado = false;

    obtenerProximasActividades(sesion.token)
      .then((data) => {
        if (!cancelado) setActividades(data);
      })
      .catch((error) => {
        if (cancelado) return;
        if (manejarNoAutorizado(error)) return;
        setErrorActividades(
          error instanceof ApiError
            ? error.message
            : "No se pudieron cargar tus próximas actividades. Intenta más tarde.",
        );
      })
      .finally(() => {
        if (!cancelado) setCargandoActividades(false);
      });

    return () => {
      cancelado = true;
    };
  }, [sesion]);

  /** Mismos datos reales que /admin/usuarios (GET /usuarios), para el resumen de admin/coordinador. */
  useEffect(() => {
    if (!sesion || !ROLES_CON_RESUMEN.includes(sesion.usuario.rol)) return;
    let cancelado = false;

    obtenerUsuarios(sesion.token)
      .then((data) => {
        if (!cancelado) setUsuariosResumen(data);
      })
      .catch((error) => {
        if (cancelado) return;
        if (manejarNoAutorizado(error)) return;
        setErrorResumen(
          error instanceof ApiError
            ? error.message
            : "No se pudo cargar el resumen de usuarios. Intenta más tarde.",
        );
      })
      .finally(() => {
        if (!cancelado) setCargandoResumen(false);
      });

    return () => {
      cancelado = true;
    };
  }, [sesion]);

  if (cargando || !sesion) {
    return (
      <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <p className="text-body-md text-ink-muted">Cargando tu sesión…</p>
      </section>
    );
  }

  // Creditos, cuatrimestre y avisos son informacion academica de ejemplo:
  // el backend todavia no expone un endpoint para ellos. Los cursos de
  // abajo SI son reales, consultados a Moodle para este usuario.
  const { cuatrimestre, creditosObtenidos, creditosTotales, progresoCurricular, avisos } =
    MOCK_DASHBOARD_ESTUDIANTE;
  const { usuario } = sesion;
  const rol = usuario.rol;

  return (
    <section className="relative overflow-hidden">
      <SectionBg image="/images/bg-abstract-1.png" opacity={0.06} />
      <div className="relative mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
      <Reveal className="mb-8 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-headline-lg font-display font-bold text-primary">
            ¡Bienvenido de vuelta, {usuario.nombre.split(" ")[0]}! 👋
          </h1>
          <Badge variant="academic">{ROL_LABEL[usuario.rol]}</Badge>
        </div>
        <p className="text-body-md text-ink-muted">
          {rol === "estudiante" ? `${cuatrimestre} · Mi IINICIA` : "Mi IINICIA"}
        </p>
      </Reveal>

      {errorCampus && (
        <Card className="mb-6 text-body-sm text-error">{errorCampus}</Card>
      )}

      {rol === "estudiante" && (
        <Reveal>
          <Card className="mb-8 flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-headline-md font-display font-bold text-primary">
                <CountUp value={`${creditosObtenidos}`} />
                <span className="text-label-sm font-display font-semibold text-ink-muted">
                  {" "}
                  / {creditosTotales} créditos
                </span>
              </span>
              <span className="text-label-md font-display font-semibold text-secondary">
                <CountUp value={`${progresoCurricular}%`} /> del plan de estudios
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-body-sm font-semibold text-ink-muted">
                Progreso curricular total
              </span>
              <ProgressBar value={progresoCurricular} className="h-2.5" />
            </div>
          </Card>
        </Reveal>
      )}

      {rol === "aspirante" && <DashboardAspirante />}
      {ROLES_CON_RESUMEN.includes(rol) && (
        <DashboardResumen
          rol={rol}
          usuarios={usuariosResumen}
          cargando={cargandoResumen}
          error={errorResumen}
        />
      )}

      {ROLES_CON_CURSOS.includes(rol) && (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-headline-sm font-display font-bold text-primary">
            {rol === "profesor" ? "Mis cursos como profesor" : "Mis cursos"}
          </h2>

          {cargandoCursos ? (
            <p className="text-body-sm text-ink-muted">Consultando tus cursos en Moodle…</p>
          ) : errorCursos ? (
            <Card className="text-body-sm text-error">{errorCursos}</Card>
          ) : !cursos || cursos.length === 0 ? (
            <Card className="text-body-sm text-ink-muted">
              {rol === "profesor"
                ? "Todavía no tienes cursos asignados como profesor en Moodle."
                : "Aún no tienes cursos asignados. Cuando tu programa sea autorizado, aparecerán aquí automáticamente."}
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cursos.map((curso, i) => {
                const estado = estadoCurso(curso.progreso);
                return (
                  <Reveal key={curso.id} delay={i * 90}>
                    <Card hoverable className="flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-title font-display font-bold text-primary">
                          {curso.nombre}
                        </h3>
                        {rol !== "profesor" && <Badge variant={estado.variant}>{estado.label}</Badge>}
                      </div>
                      <p className="text-body-sm text-ink-muted">{curso.shortname}</p>
                      {rol === "profesor" ? null : curso.progreso === null ? (
                        <span className="text-label-sm font-display font-semibold text-ink-muted">
                          Sin seguimiento de progreso en este curso
                        </span>
                      ) : (
                        <>
                          <ProgressBar value={curso.progreso} />
                          <span className="text-label-sm font-display font-semibold text-ink-muted">
                            <CountUp value={`${curso.progreso}%`} /> completado
                          </span>
                        </>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => entrarAlCampus(curso.id)}
                        disabled={entrandoACursoId === curso.id}
                        className="mt-1 h-10 w-fit px-4 text-label-sm"
                      >
                        {entrandoACursoId === curso.id ? "Entrando…" : "Entrar al Campus"}
                      </Button>
                    </Card>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-headline-sm font-display font-bold text-primary">
            Próximas actividades
          </h2>
          {cargandoActividades ? (
            <p className="text-body-sm text-ink-muted">Consultando tus actividades en Moodle…</p>
          ) : errorActividades ? (
            <Card className="text-body-sm text-error">{errorActividades}</Card>
          ) : !actividades || actividades.length === 0 ? (
            <Card className="text-body-sm text-ink-muted">
              No tienes actividades con fecha límite próxima.
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {actividades.map((actividad, i) => (
                <Reveal key={actividad.id} delay={i * 90}>
                  <Card>
                    <time className="mb-1 block text-label-sm font-display font-semibold text-ink-muted">
                      {formatFecha(actividad.fecha)}
                    </time>
                    <h3 className="mb-1 text-body-lg font-display font-bold text-primary">
                      {actividad.titulo}
                    </h3>
                    <p className="text-body-sm text-ink-muted">{actividad.curso}</p>
                    {actividad.url && (
                      <Button
                        variant="outline"
                        onClick={() => abrirActividad(actividad)}
                        disabled={abriendoActividadId === actividad.id}
                        className="mt-2 h-9 w-fit px-3 text-label-sm"
                      >
                        {abriendoActividadId === actividad.id ? "Abriendo…" : "Abrir en Moodle"}
                      </Button>
                    )}
                  </Card>
                </Reveal>
              ))}
            </div>
          )}

          <h2 className="mt-4 text-headline-sm font-display font-bold text-primary">
            Avisos institucionales
          </h2>
          <div className="flex flex-col gap-4">
            {avisos.map((aviso, i) => (
              <Reveal key={aviso.id} delay={i * 90}>
                <Card className="flex flex-row gap-3 overflow-hidden p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={aviso.imagen}
                      alt=""
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <time className="mb-1 block text-label-sm font-display font-semibold text-ink-muted">
                      {formatFecha(aviso.fecha)}
                    </time>
                    <h3 className="mb-1 text-body-lg font-display font-bold text-primary">
                      {aviso.titulo}
                    </h3>
                    <p className="text-body-sm text-ink-muted">{aviso.resumen}</p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
      )}

      {rol === "profesor" && (
        <MisEstudiantesProfesor token={sesion.token} manejarNoAutorizado={manejarNoAutorizado} />
      )}
      </div>
    </section>
  );
}

function DashboardAspirante() {
  const { programaNombre, estado, pasos } = MOCK_DASHBOARD_ASPIRANTE;
  const estadoLabel: Record<typeof estado, string> = {
    en_revision: "En revisión",
    admitido: "Admitido",
    rechazado: "No admitido",
  };

  return (
    <div className="mb-8 flex flex-col gap-4">
      <p className="text-label-sm italic text-ink-muted/70">
        Datos de ejemplo — este seguimiento todavía no viene del backend.
      </p>
      <Reveal>
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-label-sm font-display font-semibold uppercase tracking-wide text-ink-muted">
                Tu solicitud
              </p>
              <h2 className="text-headline-sm font-display font-bold text-primary">{programaNombre}</h2>
            </div>
            <Badge variant="admission">{estadoLabel[estado]}</Badge>
          </div>
          <ul className="flex flex-col gap-2.5">
            {pasos.map((paso) => (
              <li key={paso.label} className="flex items-center gap-2 text-body-sm text-ink-muted">
                <Icon
                  name={paso.completado ? "check_circle" : "radio_button_unchecked"}
                  className={`text-body-md ${paso.completado ? "text-success-ink" : "text-ink-muted/60"}`}
                />
                {paso.label}
              </li>
            ))}
          </ul>
          <ButtonLink href="/registro" variant="outline" className="mt-1 w-fit">
            Continuar mi solicitud
          </ButtonLink>
        </Card>
      </Reveal>
    </div>
  );
}

/**
 * Resumen real de superadmin/admin_academico/coordinador, construido a partir de GET /usuarios
 * (los mismos datos que /admin/usuarios). Coordinador todavía no tiene un "ámbito"/programa
 * propio en el backend (ver docs/requerimientos.md §11), así que ve el mismo resumen
 * institucional que admin académico, con enlaces de solo lectura en vez de "Administrar".
 */
function DashboardResumen({
  rol,
  usuarios,
  cargando,
  error,
}: {
  rol: Rol;
  usuarios: UsuarioListado[] | null;
  cargando: boolean;
  error: string | null;
}) {
  if (cargando) {
    return <p className="mb-8 text-body-sm text-ink-muted">Consultando resumen de usuarios…</p>;
  }
  if (error) {
    return <Card className="mb-8 text-body-sm text-error">{error}</Card>;
  }
  if (!usuarios) return null;

  const puedeAdministrar = rol === "superadmin" || rol === "admin_academico";
  const usuariosPorRol = (Object.keys(ROL_LABEL) as Rol[]).map((r) => ({
    rol: r,
    total: usuarios.filter((u) => u.rol === r).length,
  }));
  const solicitudesPendientes = usuarios.filter((u) => u.rol === "aspirante").length;
  const cuentasMoodleVinculadas = usuarios.filter((u) => u.moodleUserId !== null).length;

  return (
    <div className="mb-8 flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-1">
          <span className="text-headline-md font-display font-bold text-primary">
            <CountUp value={`${usuarios.length}`} />
          </span>
          <span className="text-label-sm text-ink-muted">Usuarios totales</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-headline-md font-display font-bold text-primary">
            <CountUp value={`${cuentasMoodleVinculadas}`} />
          </span>
          <span className="text-label-sm text-ink-muted">Cuentas Moodle vinculadas</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-headline-md font-display font-bold text-secondary">
            <CountUp value={`${solicitudesPendientes}`} />
          </span>
          <span className="text-label-sm text-ink-muted">Solicitudes de aspirantes pendientes</span>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-headline-sm font-display font-bold text-primary">Usuarios por rol</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {usuariosPorRol.map((item) => (
            <Card key={item.rol} className="flex flex-col gap-1 text-center">
              <span className="text-title font-display font-bold text-primary">
                <CountUp value={`${item.total}`} />
              </span>
              <span className="text-label-sm text-ink-muted">{ROL_LABEL[item.rol]}</span>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/admin/usuarios" variant="outline" className="w-fit">
          {puedeAdministrar ? "Administrar usuarios" : "Ver usuarios"}
        </ButtonLink>
        <ButtonLink href="/admin/programas" variant="outline" className="w-fit">
          {puedeAdministrar ? "Administrar programas" : "Ver programas"}
        </ButtonLink>
        {rol === "superadmin" && (
          <Badge variant="neutral" className="self-center">
            Acceso de superadministrador
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * Estudiantes reales (GET /usuarios/mis-estudiantes) de los cursos que imparte el profesor, con
 * notificación push directa — sin esto, "notificar" existía en el backend pero el profesor no
 * tenía ninguna pantalla desde la que llegar a usarlo (no tiene acceso a /admin/usuarios).
 */
function MisEstudiantesProfesor({
  token,
  manejarNoAutorizado,
}: {
  token: string;
  manejarNoAutorizado: (error: unknown) => boolean;
}) {
  const [estudiantes, setEstudiantes] = useState<EstudianteDeProfesor[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificandoId, setNotificandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ titulo: "", mensaje: "" });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelado = false;
    obtenerMisEstudiantes(token)
      .then((data) => {
        if (!cancelado) setEstudiantes(data);
      })
      .catch((err) => {
        if (cancelado) return;
        if (manejarNoAutorizado(err)) return;
        setError(err instanceof ApiError ? err.message : "No se pudieron cargar tus estudiantes.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
    // manejarNoAutorizado se recrea en cada render (no es estable); mismo patrón ya usado en
    // los otros efectos de esta página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function alternarNotificar(estudiante: EstudianteDeProfesor) {
    setNotificandoId((prev) => (prev === estudiante.id ? null : estudiante.id));
    setForm({ titulo: "", mensaje: "" });
  }

  async function enviar(estudiante: EstudianteDeProfesor) {
    if (!form.titulo.trim() || !form.mensaje.trim()) {
      setResultado((prev) => ({ ...prev, [estudiante.id]: "Completa el título y el mensaje." }));
      return;
    }
    setEnviando(true);
    try {
      await enviarNotificacion(token, estudiante.id, {
        titulo: form.titulo.trim(),
        mensaje: form.mensaje.trim(),
      });
      setResultado((prev) => ({ ...prev, [estudiante.id]: "Notificación enviada." }));
      setForm({ titulo: "", mensaje: "" });
    } catch (err) {
      setResultado((prev) => ({
        ...prev,
        [estudiante.id]: err instanceof ApiError ? err.message : "No se pudo enviar la notificación.",
      }));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <h2 className="text-headline-sm font-display font-bold text-primary">Mis estudiantes</h2>
      {cargando ? (
        <p className="text-body-sm text-ink-muted">Consultando tus estudiantes en Moodle…</p>
      ) : error ? (
        <Card className="text-body-sm text-error">{error}</Card>
      ) : !estudiantes || estudiantes.length === 0 ? (
        <Card className="text-body-sm text-ink-muted">
          Todavía no tienes estudiantes matriculados en tus cursos.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {estudiantes.map((estudiante) => (
            <Card key={estudiante.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-body-sm font-semibold text-ink">{estudiante.nombre}</p>
                  <p className="text-label-sm text-ink-muted">{estudiante.cursos.join(", ")}</p>
                </div>
                <Button
                  variant="outline"
                  className="h-9 px-3 text-label-sm"
                  disabled={!estudiante.tieneDispositivo}
                  title={
                    estudiante.tieneDispositivo
                      ? undefined
                      : "Este estudiante todavía no abrió la app Android con su sesión"
                  }
                  onClick={() => alternarNotificar(estudiante)}
                >
                  {!estudiante.tieneDispositivo
                    ? "Sin dispositivo"
                    : notificandoId === estudiante.id
                      ? "Cancelar"
                      : "Notificar"}
                </Button>
              </div>
              {notificandoId === estudiante.id && (
                <div className="flex flex-col gap-3 border-t border-border-subtle pt-3 md:flex-row md:items-end">
                  <Input
                    id={`notif-titulo-${estudiante.id}`}
                    label="Título"
                    placeholder="Aviso"
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    className="md:w-56"
                  />
                  <Input
                    id={`notif-mensaje-${estudiante.id}`}
                    label="Mensaje"
                    placeholder="Tu entrega de la Tarea 1 está casi vencida."
                    value={form.mensaje}
                    onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                    className="md:w-80"
                  />
                  <Button
                    variant="primary"
                    disabled={enviando}
                    onClick={() => enviar(estudiante)}
                    className="h-11"
                  >
                    {enviando ? "Enviando…" : "Enviar"}
                  </Button>
                </div>
              )}
              {resultado[estudiante.id] && (
                <p className="text-body-sm text-ink-muted">{resultado[estudiante.id]}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
