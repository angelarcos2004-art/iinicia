import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

export type ButtonVariant = "accent" | "primary" | "outline" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg h-12 px-space-lg text-label-lg font-display transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

/** Variantes de boton segun DESIGN.md (seccion Components > Buttons). */
const variantClasses: Record<ButtonVariant, string> = {
  accent:
    "bg-accent text-accent-ink font-bold hover:brightness-95 hover:shadow-level-2",
  primary: "bg-primary text-white font-bold hover:bg-primary-hover",
  outline:
    "bg-transparent text-secondary border-[1.5px] border-secondary font-semibold hover:bg-surface-subtle",
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
