"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { ApiError, obtenerProgramas } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Programa } from "@/lib/types";

type FormState = {
  nombreCompleto: string;
  correo: string;
  password: string;
  confirmarPassword: string;
  programaInteresId: string;
  aceptaAvisoPrivacidad: boolean;
  deseaInformacionBecas: boolean;
};

const INITIAL_STATE: FormState = {
  nombreCompleto: "",
  correo: "",
  password: "",
  confirmarPassword: "",
  programaInteresId: "",
  aceptaAvisoPrivacidad: false,
  deseaInformacionBecas: true,
};

export default function RegistroPage() {
  const router = useRouter();
  const { registrarAspirante } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [programas, setProgramas] = useState<Programa[]>([]);

  useEffect(() => {
    let cancelado = false;
    obtenerProgramas()
      .then((data) => {
        if (!cancelado) setProgramas(data);
      })
      .catch(() => {
        // Si el backend responde con un error real (no "no disponible"), el selector
        // simplemente queda vacío: el usuario no puede enviar el formulario sin elegir uno.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.nombreCompleto.trim()) {
      nextErrors.nombreCompleto = "Ingresa tu nombre completo.";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.correo)) {
      nextErrors.correo = "Ingresa un correo electrónico válido.";
    }
    if (form.password.length < 8) {
      nextErrors.password = "La contraseña debe tener al menos 8 caracteres.";
    }
    if (form.confirmarPassword !== form.password) {
      nextErrors.confirmarPassword = "Las contraseñas no coinciden.";
    }
    if (!form.programaInteresId) {
      nextErrors.programaInteresId = "Selecciona un programa de interés.";
    }
    if (!form.aceptaAvisoPrivacidad) {
      nextErrors.aceptaAvisoPrivacidad = "Debes aceptar el Aviso de Privacidad.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      await registrarAspirante(form);
      setSuccess(true);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "No se pudo completar el registro. Intenta de nuevo más tarde.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="mx-auto max-w-xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <Reveal variant="zoom">
          <Card className="flex flex-col items-center gap-4 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success-ink text-2xl font-bold">
              ✓
            </span>
            <h1 className="text-headline-md font-display font-bold text-primary">
              ¡Cuenta creada con éxito!
            </h1>
            <p className="text-body-md text-ink-muted">
              Hemos registrado tu solicitud como aspirante y ya iniciaste
              sesión. Da seguimiento a tu proceso de admisión desde Mi IINICIA.
            </p>
            <Button variant="primary" onClick={() => router.push("/mi-iinicia")}>
              Ir a Mi IINICIA
            </Button>
          </Card>
        </Reveal>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-margin-mobile py-space-xl md:px-margin-desktop">
      <Reveal variant="zoom" className="grid grid-cols-1 overflow-hidden rounded-xl border border-border-subtle shadow-level-2 lg:grid-cols-2">
        <div className="relative hidden lg:block">
          <Image
            src="/images/vida-estudiantil.jpg"
            alt="Estudiantes de IINICIA en el campus"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/80 to-primary/40" />
          <div className="relative z-10 flex h-full flex-col justify-end gap-3 p-space-xl text-white">
            <span className="w-fit rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-label-sm font-display font-bold uppercase tracking-wide">
              Convocatoria 2026 abierta
            </span>
            <h2 className="text-headline-md font-display font-bold">Da el primer paso</h2>
            <p className="text-body-sm text-white/85">
              Crea tu cuenta de aspirante y recibe el dictamen de tu comité en 48 a 72 horas.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-6 bg-surface-canvas p-space-xl">
          <div className="flex flex-col gap-2">
            <h1 className="text-headline-lg font-display font-bold text-primary">
              Crear cuenta de aspirante
            </h1>
            <p className="text-body-md text-ink-muted">
              Completa tus datos para iniciar tu proceso de admisión en IINICIA.
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            id="nombreCompleto"
            label="Nombre completo del aspirante"
            placeholder="Ej. Valeria Mendoza Sánchez"
            value={form.nombreCompleto}
            onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
            error={errors.nombreCompleto}
            autoComplete="name"
          />

          <Input
            id="correo"
            type="email"
            label="Correo electrónico"
            placeholder="valeria.mendoza@ejemplo.com"
            hint="Aquí recibirás tus claves institucionales."
            value={form.correo}
            onChange={(e) => setForm({ ...form, correo: e.target.value })}
            error={errors.correo}
            autoComplete="email"
          />

          <Input
            id="password"
            type="password"
            label="Contraseña"
            placeholder="Crea una contraseña segura"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            autoComplete="new-password"
          />

          <Input
            id="confirmarPassword"
            type="password"
            label="Confirmar contraseña"
            placeholder="Repite tu contraseña"
            value={form.confirmarPassword}
            onChange={(e) => setForm({ ...form, confirmarPassword: e.target.value })}
            error={errors.confirmarPassword}
            autoComplete="new-password"
          />

          <Select
            id="programaInteresId"
            label="Programa de interés"
            value={form.programaInteresId}
            onChange={(e) => setForm({ ...form, programaInteresId: e.target.value })}
            error={errors.programaInteresId}
          >
            <option value="">Selecciona un programa</option>
            {programas.map((programa) => (
              <option key={programa.id} value={programa.id}>
                {programa.nombre}
              </option>
            ))}
          </Select>

          <label className="flex items-start gap-3 text-body-sm text-ink">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border-subtle text-secondary"
              checked={form.aceptaAvisoPrivacidad}
              onChange={(e) =>
                setForm({ ...form, aceptaAvisoPrivacidad: e.target.checked })
              }
            />
            <span>
              Acepto el Aviso de Privacidad y el Reglamento Institucional de
              IINICIA para aspirantes universitarios.
            </span>
          </label>
          {errors.aceptaAvisoPrivacidad && (
            <p className="text-body-sm text-error">{errors.aceptaAvisoPrivacidad}</p>
          )}

          <label className="flex items-start gap-3 text-body-sm text-ink-muted">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border-subtle text-secondary"
              checked={form.deseaInformacionBecas}
              onChange={(e) =>
                setForm({ ...form, deseaInformacionBecas: e.target.checked })
              }
            />
            <span>
              Deseo recibir información sobre convocatorias de becas y fechas
              clave por correo.
            </span>
          </label>

          {submitError && <p className="text-body-sm text-error">{submitError}</p>}

          <Button type="submit" variant="accent" disabled={submitting} className="mt-2">
            {submitting ? "Creando cuenta…" : "Crear mi cuenta"}
          </Button>
          </form>

          <p className="text-center text-body-sm text-ink-muted">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-secondary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </Reveal>
    </section>
  );
}
