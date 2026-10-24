import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

export type ButtonVariant = "accent" | "primary" | "outline" | "ghost";

const base =
  "relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-lg h-12 px-space-lg text-label-lg font-display transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] active:duration-100 disabled:opacity-50 disabled:pointer-events-none";

/** Variantes de boton segun DESIGN.md (seccion Components > Buttons). */
const variantClasses: Record<ButtonVariant, string> = {
  // El brillo diagonal (before:) es la única micro-interacción de hover de
  // todo el sitio: reservada al CTA principal para que destaque.
  accent:
    "btn-accent-shine bg-accent text-accent-ink font-bold hover:brightness-95 hover:shadow-level-2 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full",
  primary: "bg-primary text-white font-bold hover:bg-primary-hover hover:shadow-level-2",
  outline:
    "bg-transparent text-secondary border-[1.5px] border-secondary font-semibold hover:bg-surface-subtle hover:shadow-level-1",
  ghost:
    "bg-transparent text-secondary font-semibold hover:bg-surface-neutral",
};

function buttonClasses(variant: ButtonVariant, className?: string) {
  return [base, variantClasses[variant], className].filter(Boolean).join(" ");
}

type ButtonProps = {
  variant?: ButtonVariant;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, className)} {...rest}>
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  variant?: ButtonVariant;
  children: ReactNode;
} & ComponentProps<typeof Link>;

export function ButtonLink({
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, className)} {...rest}>
      {children}
    </Link>
  );
}
