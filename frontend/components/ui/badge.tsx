import type { ReactNode } from "react";

export type BadgeVariant = "academic" | "admission" | "active" | "neutral";

/** Chips de estado segun DESIGN.md (seccion Components > Badges & Status
 * Chips): pildora de 28px de alto, tipografia label-sm en mayusculas. */
const variantClasses: Record<BadgeVariant, string> = {
  academic: "bg-academic-bg text-academic-ink",
  admission: "bg-admission-bg text-admission-ink",
  active: "bg-success-bg text-success-ink",
  neutral: "bg-surface-neutral text-ink-muted",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex h-7 items-center rounded-full px-3 text-label-sm font-display font-bold uppercase tracking-wide",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
