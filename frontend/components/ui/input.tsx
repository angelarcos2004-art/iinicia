"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/ui/icon";

type InputProps = {
  label: string;
  id: string;
  error?: string;
  hint?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

/** Campo de formulario segun DESIGN.md (seccion Components > Form Inputs &
 * Selectors): altura 48px, radio md (8px), foco con anillo secundario y
 * estado de error en rojo. Un campo type="password" agrega un botón para
 * mostrar/ocultar el texto mientras se escribe. */
export function Input({ label, id, error, hint, className, type, ...rest }: InputProps) {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const esPassword = type === "password";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-md font-display font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={esPassword && mostrarPassword ? "text" : type}
          className={[
            "h-12 w-full rounded-md border bg-surface-canvas px-4 text-body-md text-ink placeholder:text-ink-muted/70 outline-none transition-colors",
            esPassword ? "pr-11" : "",
            error
              ? "border-error focus:border-error focus:ring-[3px] focus:ring-error/15"
              : "border-border-subtle focus:border-secondary focus:ring-[3px] focus:ring-secondary/15",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...rest}
        />
        {esPassword && (
          <button
            type="button"
            onClick={() => setMostrarPassword((v) => !v)}
            aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-muted hover:text-ink"
          >
            <Icon name={mostrarPassword ? "visibility_off" : "visibility"} />
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-body-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-body-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
