"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginConGoogle } = useAuth();
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
      await login({ correo, password }, recordarme);
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

  async function handleGoogleCredential(idToken: string) {
    setSubmitError(null);
    try {
      await loginConGoogle(idToken);
      router.push("/mi-iinicia");
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "No pudimos iniciar tu sesión con Google. Intenta de nuevo.",
      );
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-margin-mobile py-space-xl md:px-margin-desktop">
      <Reveal variant="zoom" className="grid grid-cols-1 overflow-hidden rounded-xl border border-border-subtle shadow-level-2 lg:grid-cols-2">
        <div className="relative hidden lg:block">
          <Image
            src="/images/hero-campus.jpg"
            alt="Estudiantes en el campus de IINICIA"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/80 to-primary/40" />
          <div className="relative z-10 flex h-full flex-col justify-end gap-3 p-space-xl text-white">
            <span className="w-fit rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-label-sm font-display font-bold uppercase tracking-wide">
              Mi Campus
            </span>
            <h2 className="text-headline-md font-display font-bold">Continúa tu formación</h2>
            <p className="text-body-sm text-white/85">
              Accede a tus cursos, avisos y avance curricular en un solo lugar.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-6 bg-surface-canvas p-space-xl">
          <div className="flex flex-col gap-2">
            <h1 className="text-headline-lg font-display font-bold text-primary">
              Mi Campus
            </h1>
            <p className="text-body-md text-ink-muted">
              Inicia sesión con tu identidad IINICIA.
            </p>
          </div>

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
              <Link href="/recuperar" className="font-semibold text-secondary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {submitError && <p className="text-body-sm text-error">{submitError}</p>}

            <Button type="submit" variant="primary" disabled={submitting} className="mt-2">
              {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-body-sm text-ink-muted">
            <span className="h-px flex-1 bg-border-subtle" />
            <span>o</span>
            <span className="h-px flex-1 bg-border-subtle" />
          </div>

          <GoogleLoginButton onCredential={handleGoogleCredential} />

          <p className="text-center text-body-sm text-ink-muted">
            ¿Aún no tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-secondary hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </Reveal>
    </section>
  );
}
