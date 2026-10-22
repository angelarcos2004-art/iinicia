import type { InputHTMLAttributes } from "react";

type InputProps = {
  label: string;
  id: string;
  error?: string;
  hint?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

/** Campo de formulario segun DESIGN.md (seccion Components > Form Inputs &
 * Selectors): altura 48px, radio md (8px), foco con anillo secundario y
 * estado de error en rojo. */
export function Input({ label, id, error, hint, className, ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-md font-display font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        className={[
          "h-12 rounded-md border bg-surface-canvas px-4 text-body-md text-ink placeholder:text-ink-muted/70 outline-none transition-colors",
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
