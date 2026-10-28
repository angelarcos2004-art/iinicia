"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { ApiError, restablecerPassword } from "@/lib/api";

function RestablecerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const correo = searchParams.get("correo") ?? "";
  const token = searchParams.get("token") ?? "";

  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [errors, setErrors] = useState<{ nuevaPassword?: string; confirmacion?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!correo || !token) {
    return (
      <Card className="flex flex-col gap-4">
        <h1 className="text-headline-lg font-display font-bold text-primary">Enlace inválido</h1>
        <p className="text-body-md text-ink-muted">
          Este enlace de recuperación está incompleto. Solicita uno nuevo.
        </p>
        <Link href="/recuperar" className="font-semibold text-secondary hover:underline">
          Pedir un enlace nuevo
        </Link>
      </Card>
    );
  }

  function validate(): boolean {
    const nextErrors: { nuevaPassword?: string; confirmacion?: string } = {};
    if (nuevaPassword.length < 8) {
      nextErrors.nuevaPassword = "La contraseña debe tener al menos 8 caracteres.";
    }
    if (confirmacion !== nuevaPassword) {
      nextErrors.confirmacion = "Las contraseñas no coinciden.";
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
      await restablecerPassword({ correo, token, nuevaPassword });
      router.push("/login");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "No se pudo restablecer tu contraseña. Intenta más tarde.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-headline-lg font-display font-bold text-primary">
          Elige una nueva contraseña
        </h1>
        <p className="text-body-md text-ink-muted">Para la cuenta {correo}.</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Input
          id="nuevaPassword"
          type="password"
          label="Nueva contraseña"
          placeholder="Al menos 8 caracteres"
          value={nuevaPassword}
          onChange={(e) => setNuevaPassword(e.target.value)}
          error={errors.nuevaPassword}
          autoComplete="new-password"
        />
        <Input
          id="confirmacion"
          type="password"
          label="Confirma la nueva contraseña"
          placeholder="Repite la contraseña"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          error={errors.confirmacion}
          autoComplete="new-password"
        />

        {submitError && <p className="text-body-sm text-error">{submitError}</p>}

        <Button type="submit" variant="primary" disabled={submitting} className="mt-2">
          {submitting ? "Guardando…" : "Guardar nueva contraseña"}
        </Button>
      </form>
    </Card>
  );
}

export default function RestablecerPage() {
  return (
    <section className="mx-auto max-w-md px-margin-mobile py-space-xl md:px-margin-desktop">
      <Reveal variant="zoom">
        <Suspense fallback={null}>
          <RestablecerForm />
        </Suspense>
      </Reveal>
    </section>
  );
}
