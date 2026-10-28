"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { ApiError, recuperarPassword } from "@/lib/api";

export default function RecuperarPage() {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!/^\S+@\S+\.\S+$/.test(correo)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    setError(undefined);

    setSubmitting(true);
    try {
      await recuperarPassword(correo);
      // El backend siempre responde igual exista o no la cuenta: este mensaje nunca debe
      // confirmar ni negar si el correo está registrado.
      setEnviado(true);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "No se pudo procesar tu solicitud. Intenta más tarde.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-margin-mobile py-space-xl md:px-margin-desktop">
      <Reveal variant="zoom">
        <Card className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-headline-lg font-display font-bold text-primary">
              Recupera tu contraseña
            </h1>
            <p className="text-body-md text-ink-muted">
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </p>
          </div>

          {enviado ? (
            <p className="text-body-md text-ink">
              Si ese correo está registrado en IINICIA, te enviamos un enlace de recuperación.
              Revisa tu bandeja de entrada (y spam).
            </p>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              <Input
                id="correo"
                type="email"
                label="Correo institucional o de aspirante"
                placeholder="ejemplo@iinicia.edu.mx"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                error={error}
                autoComplete="email"
              />

              {submitError && <p className="text-body-sm text-error">{submitError}</p>}

              <Button type="submit" variant="primary" disabled={submitting} className="mt-2">
                {submitting ? "Enviando…" : "Enviar enlace de recuperación"}
              </Button>
            </form>
          )}

          <p className="text-center text-body-sm text-ink-muted">
            <Link href="/login" className="font-semibold text-secondary hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </Card>
      </Reveal>
    </section>
  );
}
