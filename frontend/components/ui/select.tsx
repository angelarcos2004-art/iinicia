import type { ReactNode, SelectHTMLAttributes } from "react";

type SelectProps = {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">;

/** Selector con el mismo lenguaje visual que Input (DESIGN.md > Form
 * Inputs & Selectors). */
export function Select({ label, id, error, hint, children, className, ...rest }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-md font-display font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        className={[
          "h-12 rounded-md border bg-surface-canvas px-4 text-body-md text-ink outline-none transition-colors",
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
      >
        {children}
      </select>
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
