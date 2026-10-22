"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { MOCK_DASHBOARD_ESTUDIANTE } from "@/lib/mock-data";
import type { EstadoCurso, Rol } from "@/lib/types";

const ESTADO_BADGE: Record<EstadoCurso, { label: string; variant: "active" | "neutral" | "academic" }> = {
  en_curso: { label: "En curso", variant: "active" },
  por_iniciar: { label: "Por iniciar", variant: "neutral" },
  finalizado: { label: "Finalizado", variant: "academic" },
};

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

export default function MiIiniciaPage() {
  const { sesion, cargando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !sesion) {
      router.replace("/login");
    }
  }, [cargando, sesion, router]);

  if (cargando || !sesion) {
    return (
      <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <p className="text-body-md text-ink-muted">Cargando tu sesión…</p>
      </section>
    );
  }

  // El resto del dashboard (créditos, cursos, avisos) es informacion
  // academica de ejemplo mientras no exista el backend/Moodle; el nombre
  // y el rol sí vienen de la sesión real.
  const { cuatrimestre, creditosObtenidos, creditosTotales, progresoCurricular, cursos, avisos } =
    MOCK_DASHBOARD_ESTUDIANTE;
  const { usuario } = sesion;

  return (
    <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
      <div className="mb-8 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-headline-lg font-display font-bold text-primary">
            ¡Bienvenido de vuelta, {usuario.nombre.split(" ")[0]}! 👋
          </h1>
          <Badge variant="academic">{ROL_LABEL[usuario.rol]}</Badge>
        </div>
        <p className="text-body-md text-ink-muted">{cuatrimestre} · Mi IINICIA</p>
      </div>

      <Card className="mb-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-headline-md font-display font-bold text-primary">
            {creditosObtenidos}
            <span className="text-label-sm font-display font-semibold text-ink-muted">
              {" "}
              / {creditosTotales} créditos
            </span>
          </span>
          <span className="text-label-md font-display font-semibold text-secondary">
            {progresoCurricular}% del plan de estudios
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-semibold text-ink-muted">
            Progreso curricular total
          </span>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-neutral">
            <div
              className="h-full rounded-full bg-secondary"
              style={{ width: `${progresoCurricular}%` }}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-headline-sm font-display font-bold text-primary">Mis cursos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cursos.map((curso) => {
              const estado = ESTADO_BADGE[curso.estado];
              return (
                <Card key={curso.id} hoverable className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-title font-display font-bold text-primary">
                      {curso.nombre}
                    </h3>
                    <Badge variant={estado.variant}>{estado.label}</Badge>
                  </div>
                  <p className="text-body-sm text-ink-muted">{curso.periodo}</p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-neutral">
                    <div
                      className="h-full rounded-full bg-secondary"
                      style={{ width: `${curso.progreso}%` }}
                    />
                  </div>
                  <span className="text-label-sm font-display font-semibold text-ink-muted">
                    {curso.progreso}% completado
                  </span>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-headline-sm font-display font-bold text-primary">
            Avisos institucionales
          </h2>
          <div className="flex flex-col gap-4">
            {avisos.map((aviso) => (
              <Card key={aviso.id}>
                <time className="mb-1 block text-label-sm font-display font-semibold text-ink-muted">
                  {formatFecha(aviso.fecha)}
                </time>
                <h3 className="mb-1 text-body-lg font-display font-bold text-primary">
                  {aviso.titulo}
                </h3>
                <p className="text-body-sm text-ink-muted">{aviso.resumen}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
