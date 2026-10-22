"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MOCK_PROGRAMAS } from "@/lib/mock-data";
import type { TipoPrograma } from "@/lib/types";

const TIPO_FILTROS: { value: TipoPrograma; label: string }[] = [
  { value: "licenciatura", label: "Licenciaturas" },
  { value: "diplomado", label: "Diplomados" },
  { value: "certificacion", label: "Certificaciones" },
];

const TIPO_BADGE_LABEL: Record<TipoPrograma, string> = {
  licenciatura: "Licenciatura RVOE",
  diplomado: "Diplomado ejecutivo",
  certificacion: "Certificación oficial",
};

const MODALIDAD_LABEL: Record<string, string> = {
  en_linea: "En línea",
  hibrida: "Híbrida",
};

export default function OfertaAcademicaPage() {
  const [busqueda, setBusqueda] = useState("");
  const [tiposActivos, setTiposActivos] = useState<Set<TipoPrograma>>(new Set());

  function toggleTipo(tipo: TipoPrograma) {
    setTiposActivos((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) {
        next.delete(tipo);
      } else {
        next.add(tipo);
      }
      return next;
    });
  }

  const programasFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return MOCK_PROGRAMAS.filter((programa) => {
      const coincideTexto =
        texto.length === 0 ||
        programa.nombre.toLowerCase().includes(texto) ||
        programa.descripcion.toLowerCase().includes(texto);
      const coincideTipo = tiposActivos.size === 0 || tiposActivos.has(programa.tipo);
      return coincideTexto && coincideTipo;
    });
  }, [busqueda, tiposActivos]);

  return (
    <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-headline-lg font-display font-bold text-primary">
          Oferta académica
        </h1>
        <p className="text-body-md text-ink-muted">
          Licenciaturas, diplomados y certificaciones con validez oficial.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-subtle p-space-lg">
        <label htmlFor="busqueda" className="sr-only">
          Buscar programa
        </label>
        <input
          id="busqueda"
          type="text"
          placeholder="¿Qué te gustaría estudiar hoy? (ej. Inteligencia Artificial, Ciberseguridad...)"
          className="h-12 w-full rounded-md border border-border-subtle bg-surface-canvas px-4 text-body-md text-ink outline-none focus:border-secondary focus:ring-[3px] focus:ring-secondary/15"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de programa">
          {TIPO_FILTROS.map((filtro) => {
            const activo = tiposActivos.has(filtro.value);
            return (
              <button
                key={filtro.value}
                type="button"
                onClick={() => toggleTipo(filtro.value)}
                aria-pressed={activo}
                className={[
                  "rounded-full border px-4 py-2 text-label-md font-display font-semibold transition-colors",
                  activo
                    ? "border-primary bg-primary text-white"
                    : "border-border-subtle bg-surface-canvas text-ink-muted hover:border-secondary hover:text-secondary",
                ].join(" ")}
              >
                {filtro.label}
              </button>
            );
          })}
        </div>
      </div>

      {programasFiltrados.length === 0 ? (
        <p className="py-space-xl text-center text-body-md text-ink-muted">
          No encontramos programas que coincidan con tu búsqueda.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programasFiltrados.map((programa) => (
            <Card key={programa.id} hoverable className="flex flex-col gap-3">
              <Badge variant="academic">{TIPO_BADGE_LABEL[programa.tipo]}</Badge>
              <h2 className="text-headline-sm font-display font-bold text-primary">
                {programa.nombre}
              </h2>
              <p className="flex-1 text-body-sm text-ink-muted">{programa.descripcion}</p>
              <div className="flex items-center justify-between text-label-sm font-display font-semibold text-ink-muted">
                <span>{programa.duracion}</span>
                <span>{MODALIDAD_LABEL[programa.modalidad]}</span>
              </div>
              <ButtonLink href="/registro" variant="outline" className="h-11">
                Solicitar información
              </ButtonLink>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
