"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Reveal } from "@/components/ui/reveal";
import { SectionBg } from "@/components/ui/section-bg";
import {
  actualizarMateria,
  ApiError,
  crearMateria,
  eliminarMateria,
  obtenerMaterias,
  obtenerProgramas,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Materia, Programa, Rol } from "@/lib/types";

const ROLES_CON_ACCESO: Rol[] = ["superadmin", "admin_academico"];

type NuevaMateriaForm = {
  id: string;
  nombre: string;
  moodleCourseShortname: string;
  prerequisitos: string[];
};

const FORM_INICIAL: NuevaMateriaForm = {
  id: "",
  nombre: "",
  moodleCourseShortname: "",
  prerequisitos: [],
};

type EdicionMateriaForm = {
  nombre: string;
  moodleCourseShortname: string;
  prerequisitos: string[];
};

export default function AdminMateriasPage() {
  const { sesion, cargando } = useAuth();
  const router = useRouter();

  const [programas, setProgramas] = useState<Programa[]>([]);
  const [programaId, setProgramaId] = useState("");
  const [materias, setMaterias] = useState<Materia[] | null>(null);
  const [cargandoMaterias, setCargandoMaterias] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<NuevaMateriaForm>(FORM_INICIAL);
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<EdicionMateriaForm>({ nombre: "", moodleCourseShortname: "", prerequisitos: [] });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  useEffect(() => {
    if (cargando) return;
    if (!sesion || !ROLES_CON_ACCESO.includes(sesion.usuario.rol)) {
      router.replace(sesion ? "/mi-iinicia" : "/login");
    }
  }, [cargando, sesion, router]);

  const tieneAcceso = !!sesion && ROLES_CON_ACCESO.includes(sesion.usuario.rol);

  useEffect(() => {
    if (!tieneAcceso) return;
    obtenerProgramas()
      .then((data) => {
        setProgramas(data);
        setProgramaId((prev) => prev || data[0]?.id || "");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el catálogo de carreras."));
  }, [tieneAcceso]);

  function cargarMaterias() {
    if (!sesion || !programaId) return;
    setCargandoMaterias(true);
    obtenerMaterias(sesion.token, programaId)
      .then((data) => setMaterias(data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar las materias."))
      .finally(() => setCargandoMaterias(false));
  }

  useEffect(() => {
    cargarMaterias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion, programaId]);

  function togglePrerequisito(id: string) {
    setForm((prev) => ({
      ...prev,
      prerequisitos: prev.prerequisitos.includes(id)
        ? prev.prerequisitos.filter((p) => p !== id)
        : [...prev.prerequisitos, id],
    }));
  }

  function abrirEdicion(materia: Materia) {
    setEditandoId(materia.id);
    setErrorEdicion(null);
    setEdicion({
      nombre: materia.nombre,
      moodleCourseShortname: materia.moodleCourseShortname,
      prerequisitos: materia.prerequisitos,
    });
  }

  function toggleEdicionPrerequisito(id: string) {
    setEdicion((prev) => ({
      ...prev,
      prerequisitos: prev.prerequisitos.includes(id)
        ? prev.prerequisitos.filter((p) => p !== id)
        : [...prev.prerequisitos, id],
    }));
  }

  async function guardarEdicion() {
    if (!sesion || !editandoId) return;
    if (!edicion.nombre.trim() || !edicion.moodleCourseShortname.trim()) {
      setErrorEdicion("El nombre y el curso de Moodle son obligatorios.");
      return;
    }
    setErrorEdicion(null);
    setGuardandoEdicion(true);
    try {
      const actualizada = await actualizarMateria(sesion.token, editandoId, {
        nombre: edicion.nombre.trim(),
        moodleCourseShortname: edicion.moodleCourseShortname.trim(),
        prerequisitos: edicion.prerequisitos,
      });
      setMaterias((prev) => prev?.map((m) => (m.id === editandoId ? actualizada : m)) ?? prev);
      setEditandoId(null);
    } catch (err) {
      setErrorEdicion(err instanceof ApiError ? err.message : "No se pudo guardar la materia.");
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function borrarMateria(materia: Materia) {
    if (!sesion) return;
    if (!window.confirm(`¿Borrar "${materia.nombre}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    setBorrandoId(materia.id);
    try {
      await eliminarMateria(sesion.token, materia.id);
      setMaterias((prev) => prev?.filter((m) => m.id !== materia.id) ?? prev);
      if (editandoId === materia.id) setEditandoId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo borrar la materia.");
    } finally {
      setBorrandoId(null);
    }
  }

  async function handleCrear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sesion || !programaId) return;
    setErrorForm(null);

    if (!form.id.trim() || !form.nombre.trim() || !form.moodleCourseShortname.trim()) {
      setErrorForm("Completa id, nombre y curso de Moodle.");
      return;
    }

    setCreando(true);
    try {
      const creada = await crearMateria(sesion.token, {
        id: form.id.trim(),
        programaId,
        nombre: form.nombre.trim(),
        moodleCourseShortname: form.moodleCourseShortname.trim(),
        prerequisitos: form.prerequisitos,
      });
      setMaterias((prev) => [...(prev ?? []), creada]);
      setForm(FORM_INICIAL);
    } catch (err) {
      setErrorForm(err instanceof ApiError ? err.message : "No se pudo crear la materia.");
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

  const nombrePorId = new Map(materias?.map((m) => [m.id, m.nombre]));

  return (
    <section className="relative overflow-hidden">
      <SectionBg image="/images/bg-abstract-1.png" opacity={0.06} />
      <div className="relative mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <Reveal className="mb-6">
          <h1 className="text-headline-lg font-display font-bold text-primary">Materias</h1>
          <p className="text-body-md text-ink-muted">
            Seriación por carrera: si una materia tiene prerequisitos, el admin no podrá
            matricular a un estudiante en ella hasta que apruebe esos cursos en Moodle. Solo
            aplica a quien eligió esa carrera como programa de interés; un curso suelto nunca
            se bloquea.
          </p>
        </Reveal>

        <Reveal className="mb-6 max-w-sm">
          <Select
            id="filtro-programa"
            label="Carrera"
            value={programaId}
            onChange={(e) => setProgramaId(e.target.value)}
          >
            {programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Reveal>

        {error && <Card className="mb-4 text-body-sm text-error">{error}</Card>}

        {cargandoMaterias ? (
          <p className="text-body-sm text-ink-muted">Consultando materias…</p>
        ) : !materias || materias.length === 0 ? (
          <Card className="mb-8 text-body-sm text-ink-muted">Esta carrera todavía no tiene materias registradas.</Card>
        ) : (
          <Card className="mb-8 overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-border-subtle text-label-sm font-display font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Materia</th>
                  <th className="px-5 py-3">Curso de Moodle</th>
                  <th className="px-5 py-3">Prerequisitos</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {materias.map((materia) => (
                  <Fragment key={materia.id}>
                    <tr className="border-b border-border-subtle last:border-0">
                      <td className="px-5 py-3 text-body-sm font-semibold text-ink">{materia.nombre}</td>
                      <td className="px-5 py-3 text-body-sm text-ink-muted">{materia.moodleCourseShortname}</td>
                      <td className="px-5 py-3 text-body-sm text-ink-muted">
                        {materia.prerequisitos.length === 0
                          ? "—"
                          : materia.prerequisitos.map((id) => nombrePorId.get(id) ?? id).join(", ")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="h-9 px-3 text-label-sm"
                            onClick={() => (editandoId === materia.id ? setEditandoId(null) : abrirEdicion(materia))}
                          >
                            {editandoId === materia.id ? "Cancelar" : "Editar"}
                          </Button>
                          <Button
                            variant="outline"
                            className="h-9 px-3 text-label-sm text-error"
                            disabled={borrandoId === materia.id}
                            onClick={() => borrarMateria(materia)}
                          >
                            {borrandoId === materia.id ? "Borrando…" : "Borrar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {editandoId === materia.id && (
                      <tr className="border-b border-border-subtle last:border-0 bg-surface-subtle/40">
                        <td colSpan={4} className="px-5 py-4">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-end">
                              <Input
                                id={`edicion-nombre-${materia.id}`}
                                label="Nombre"
                                value={edicion.nombre}
                                onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })}
                                className="md:w-64"
                              />
                              <Input
                                id={`edicion-curso-${materia.id}`}
                                label="Curso de Moodle (shortname)"
                                value={edicion.moodleCourseShortname}
                                onChange={(e) => setEdicion({ ...edicion, moodleCourseShortname: e.target.value })}
                                className="md:w-64"
                              />
                              <Button
                                variant="primary"
                                className="h-10 px-4"
                                disabled={guardandoEdicion}
                                onClick={guardarEdicion}
                              >
                                {guardandoEdicion ? "Guardando…" : "Guardar"}
                              </Button>
                            </div>
                            <div>
                              <p className="mb-2 text-label-sm font-display font-semibold text-ink">
                                Prerequisitos
                              </p>
                              <div className="flex flex-wrap gap-3">
                                {materias
                                  .filter((m) => m.id !== materia.id)
                                  .map((m) => (
                                    <label key={m.id} className="flex items-center gap-2 text-body-sm text-ink">
                                      <input
                                        type="checkbox"
                                        checked={edicion.prerequisitos.includes(m.id)}
                                        onChange={() => toggleEdicionPrerequisito(m.id)}
                                      />
                                      {m.nombre}
                                    </label>
                                  ))}
                              </div>
                            </div>
                            {errorEdicion && <p className="text-body-sm text-error">{errorEdicion}</p>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <Reveal>
          <Card className="flex flex-col gap-4">
            <h2 className="text-headline-sm font-display font-bold text-primary">Nueva materia</h2>
            <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleCrear}>
              <Input
                id="nueva-materia-id"
                label="Id (slug único)"
                placeholder="ej. calculo-2"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
              />
              <Input
                id="nueva-materia-nombre"
                label="Nombre"
                placeholder="ej. Cálculo II"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <Input
                id="nueva-materia-curso"
                label="Curso de Moodle (shortname)"
                placeholder="ej. CALCULO2"
                value={form.moodleCourseShortname}
                onChange={(e) => setForm({ ...form, moodleCourseShortname: e.target.value })}
              />

              <div className="md:col-span-2">
                <p className="mb-2 text-label-sm font-display font-semibold text-ink">
                  Prerequisitos (hay que aprobarlos antes de matricularse aquí)
                </p>
                {!materias || materias.length === 0 ? (
                  <p className="text-body-sm text-ink-muted">Todavía no hay otras materias en esta carrera.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {materias.map((materia) => (
                      <label key={materia.id} className="flex items-center gap-2 text-body-sm text-ink">
                        <input
                          type="checkbox"
                          checked={form.prerequisitos.includes(materia.id)}
                          onChange={() => togglePrerequisito(materia.id)}
                        />
                        {materia.nombre}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {errorForm && <p className="md:col-span-2 text-body-sm text-error">{errorForm}</p>}

              <Button type="submit" variant="primary" disabled={creando} className="md:col-span-2 mt-1 w-fit">
                {creando ? "Creando…" : "Crear materia"}
              </Button>
            </form>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
