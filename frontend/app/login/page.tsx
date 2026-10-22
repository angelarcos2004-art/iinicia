"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [recordarme, setRecordarme] = useState(true);
  const [errors, setErrors] = useState<{ correo?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const nextErrors: { correo?: string; password?: string } = {};
    if (!/^\S+@\S+\.\S+$/.test(correo)) {
      nextErrors.correo = "Ingresa un correo electrónico válido.";
    }
    if (!password) {
      nextErrors.password = "Ingresa tu contraseña.";
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
      await login({ correo, password });
      router.push("/mi-iinicia");
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "No pudimos iniciar tu sesión. Verifica tus datos e intenta de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-margin-mobile py-space-xl md:px-margin-desktop">
      <div className="mb-8 flex flex-col gap-2 text-center">
        <h1 className="text-headline-lg font-display font-bold text-primary">
          Mi Campus
        </h1>
        <p className="text-body-md text-ink-muted">
          Inicia sesión con tu identidad IINICIA.
        </p>
      </div>

      <Card>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <Input
            id="correo"
            type="email"
            label="Correo institucional o de aspirante"
            placeholder="ejemplo@iinicia.edu.mx"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            error={errors.correo}
            autoComplete="email"
          />

          <Input
            id="password"
            type="password"
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between text-body-sm">
            <label className="flex items-center gap-2 text-ink-muted">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border-subtle text-secondary"
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
              />
              Recordarme
            </label>
            <Link href="#" className="font-semibold text-secondary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {submitError && <p className="text-body-sm text-error">{submitError}</p>}

          <Button type="submit" variant="primary" disabled={submitting} className="mt-2">
            {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-body-sm text-ink-muted">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-secondary hover:underline">
          Regístrate
        </Link>
      </p>
    </section>
  );
}
