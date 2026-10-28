"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { SectionBg } from "@/components/ui/section-bg";
import {
  ApiError,
  obtenerMisCursos,
  obtenerProximasActividades,
  obtenerUrlCampus,
  obtenerUrlCampusActividad,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { MOCK_DASHBOARD_ESTUDIANTE } from "@/lib/mock-data";
import type { ActividadProxima, CursoInscrito, Rol } from "@/lib/types";

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
  const { sesion, cargando } = useAuth();
  const router = useRouter();

  const [cursos, setCursos] = useState<CursoInscrito[] | null>(null);
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [errorCursos, setErrorCursos] = useState<string | null>(null);
  const [entrandoACursoId, setEntrandoACursoId] = useState<number | null>(null);
  const [errorCampus, setErrorCampus] = useState<string | null>(null);
  const [actividades, setActividades] = useState<ActividadProxima[] | null>(null);
  const [cargandoActividades, setCargandoActividades] = useState(true);
  const [errorActividades, setErrorActividades] = useState<string | null>(null);
  const [abriendoActividadId, setAbriendoActividadId] = useState<number | null>(null);

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
    if (!sesion) return;
    let cancelado = false;

    obtenerMisCursos(sesion.token)
      .then((data) => {
        if (!cancelado) setCursos(data);
      })
      .catch((error) => {
        if (cancelado) return;
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
    if (!sesion) return;
    let cancelado = false;

    obtenerProximasActividades(sesion.token)
      .then((data) => {
        if (!cancelado) setActividades(data);
      })
      .catch((error) => {
        if (cancelado) return;
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
        <p className="text-body-md text-ink-muted">{cuatrimestre} · Mi IINICIA</p>
      </Reveal>

      {errorCampus && (
        <Card className="mb-6 text-body-sm text-error">{errorCampus}</Card>
      )}

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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-headline-sm font-display font-bold text-primary">Mis cursos</h2>

          {cargandoCursos ? (
            <p className="text-body-sm text-ink-muted">Consultando tus cursos en Moodle…</p>
          ) : errorCursos ? (
            <Card className="text-body-sm text-error">{errorCursos}</Card>
          ) : !cursos || cursos.length === 0 ? (
            <Card className="text-body-sm text-ink-muted">
              Aún no tienes cursos asignados. Cuando tu programa sea
              autorizado, aparecerán aquí automáticamente.
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
                        <Badge variant={estado.variant}>{estado.label}</Badge>
                      </div>
                      <p className="text-body-sm text-ink-muted">{curso.shortname}</p>
                      {curso.progreso === null ? (
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
                <Card>
                  <time className="mb-1 block text-label-sm font-display font-semibold text-ink-muted">
                    {formatFecha(aviso.fecha)}
                  </time>
                  <h3 className="mb-1 text-body-lg font-display font-bold text-primary">
                    {aviso.titulo}
                  </h3>
                  <p className="text-body-sm text-ink-muted">{aviso.resumen}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
