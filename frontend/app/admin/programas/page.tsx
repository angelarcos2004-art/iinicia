"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Reveal } from "@/components/ui/reveal";
import { SectionBg } from "@/components/ui/section-bg";
import { actualizarPrograma, ApiError, crearPrograma, obtenerProgramas } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Modalidad, Programa, Rol, TipoPrograma } from "@/lib/types";

const ROLES_CON_ACCESO: Rol[] = ["superadmin", "admin_academico"];

const TIPO_LABEL: Record<TipoPrograma, string> = {
  licenciatura: "Licenciatura",
  diplomado: "Diplomado",
  certificacion: "Certificación",
};

const MODALIDAD_LABEL: Record<Modalidad, string> = {
  en_linea: "En línea",
  hibrida: "Híbrida",
};

type NuevoProgramaForm = {
  id: string;
  nombre: string;
  tipo: TipoPrograma;
  modalidad: Modalidad;
  duracion: string;
  descripcion: string;
};

const FORM_INICIAL: NuevoProgramaForm = {
  id: "",
  nombre: "",
  tipo: "licenciatura",
  modalidad: "en_linea",
  duracion: "",
  descripcion: "",
};

export default function AdminProgramasPage() {
  const { sesion, cargando } = useAuth();
  const router = useRouter();

  const [programas, setProgramas] = useState<Programa[] | null>(null);
  const [cargandoProgramas, setCargandoProgramas] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursoEditado, setCursoEditado] = useState<Record<string, string>>({});
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [form, setForm] = useState<NuevoProgramaForm>(FORM_INICIAL);
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    if (cargando) return;
    if (!sesion || !ROLES_CON_ACCESO.includes(sesion.usuario.rol)) {
      router.replace(sesion ? "/mi-iinicia" : "/login");
    }
  }, [cargando, sesion, router]);

  const tieneAcceso = !!sesion && ROLES_CON_ACCESO.includes(sesion.usuario.rol);

  function cargar() {
    setCargandoProgramas(true);
    obtenerProgramas()
      .then((data) => setProgramas(data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el catálogo."))
      .finally(() => setCargandoProgramas(false));
  }

  useEffect(() => {
    if (!tieneAcceso) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tieneAcceso]);

  async function guardarCurso(programa: Programa) {
    if (!sesion) return;
    const nuevoCurso = (cursoEditado[programa.id] ?? "").trim();
    setError(null);
    setGuardandoId(programa.id);
    try {
      const actualizado = await actualizarPrograma(sesion.token, programa.id, {
        moodleCourseShortname: nuevoCurso || null,
      });
      setProgramas((prev) => prev?.map((p) => (p.id === programa.id ? actualizado : p)) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el curso de Moodle.");
    } finally {
      setGuardandoId(null);
    }
  }

  async function handleCrear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sesion) return;
    setErrorForm(null);

    if (!form.id.trim() || !form.nombre.trim() || !form.duracion.trim() || !form.descripcion.trim()) {
      setErrorForm("Completa todos los campos.");
      return;
    }

    setCreando(true);
    try {
      const creado = await crearPrograma(sesion.token, form.id.trim(), {
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        modalidad: form.modalidad,
        duracion: form.duracion.trim(),
        descripcion: form.descripcion.trim(),
        moodleCourseShortname: null,
      });
      setProgramas((prev) => [...(prev ?? []), creado]);
      setForm(FORM_INICIAL);
    } catch (err) {
      setErrorForm(err instanceof ApiError ? err.message : "No se pudo crear el programa.");
    } finally {
      setCreando(false);
    }
  }

  if (cargando || !tieneAcceso) {
    return (
      <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <p className="text-body-md text-ink-muted">Cargando…</p>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden">
      <SectionBg image="/images/bg-abstract-1.png" opacity={0.06} />
      <div className="relative mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <Reveal className="mb-6">
          <h1 className="text-headline-lg font-display font-bold text-primary">Programas</h1>
          <p className="text-body-md text-ink-muted">
            Administra la oferta académica y el curso de Moodle al que se matricula cada
            aspirante admitido en ese programa.
          </p>
        </Reveal>

        {error && <Card className="mb-4 text-body-sm text-error">{error}</Card>}

        {cargandoProgramas ? (
          <p className="text-body-sm text-ink-muted">Consultando programas…</p>
        ) : !programas || programas.length === 0 ? (
          <Card className="mb-8 text-body-sm text-ink-muted">Todavía no hay programas.</Card>
        ) : (
          <Card className="mb-8 overflow-x-auto p-0">
            <table className="w-full min-w-[840px] text-left">
              <thead>
                <tr className="border-b border-border-subtle text-label-sm font-display font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Programa</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Modalidad</th>
                  <th className="px-5 py-3">Duración</th>
                  <th className="px-5 py-3">Curso de Moodle</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {programas.map((programa) => (
                  <tr key={programa.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-5 py-3 text-body-sm font-semibold text-ink">{programa.nombre}</td>
                    <td className="px-5 py-3 text-body-sm text-ink-muted">{TIPO_LABEL[programa.tipo]}</td>
                    <td className="px-5 py-3 text-body-sm text-ink-muted">{MODALIDAD_LABEL[programa.modalidad]}</td>
                    <td className="px-5 py-3 text-body-sm text-ink-muted">{programa.duracion}</td>
                    <td className="px-5 py-3">
                      <input
                        aria-label={`Curso de Moodle para ${programa.nombre}`}
                        placeholder="Sin asignar"
                        value={cursoEditado[programa.id] ?? programa.moodleCourseShortname ?? ""}
                        onChange={(e) =>
                          setCursoEditado((prev) => ({ ...prev, [programa.id]: e.target.value }))
                        }
                        className="h-9 w-40 rounded-md border border-border-subtle bg-surface-canvas px-3 text-body-sm text-ink outline-none focus:border-secondary focus:ring-[3px] focus:ring-secondary/15"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <Button
                        variant="outline"
                        className="h-9 px-3 text-label-sm"
                        disabled={guardandoId === programa.id}
                        onClick={() => guardarCurso(programa)}
                      >
                        {guardandoId === programa.id ? "Guardando…" : "Guardar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <Reveal>
          <Card className="flex flex-col gap-4">
            <h2 className="text-headline-sm font-display font-bold text-primary">Nuevo programa</h2>
            <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleCrear}>
              <Input
                id="nuevo-id"
                label="Id (slug único)"
                placeholder="ej. lic-mercadotecnia-digital"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
              />
              <Input
                id="nuevo-nombre"
                label="Nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <Select
                id="nuevo-tipo"
                label="Tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoPrograma })}
              >
                {Object.entries(TIPO_LABEL).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </Select>
              <Select
                id="nuevo-modalidad"
                label="Modalidad"
                value={form.modalidad}
                onChange={(e) => setForm({ ...form, modalidad: e.target.value as Modalidad })}
              >
                {Object.entries(MODALIDAD_LABEL).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </Select>
              <Input
                id="nuevo-duracion"
                label="Duración"
                placeholder="ej. 6 cuatrimestres"
                value={form.duracion}
                onChange={(e) => setForm({ ...form, duracion: e.target.value })}
              />
              <Input
                id="nuevo-descripcion"
                label="Descripción"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />

              {errorForm && <p className="md:col-span-2 text-body-sm text-error">{errorForm}</p>}

              <Button type="submit" variant="primary" disabled={creando} className="md:col-span-2 mt-1 w-fit">
                {creando ? "Creando…" : "Crear programa"}
              </Button>
            </form>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
