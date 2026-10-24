import type { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  hoverable?: boolean;
} & HTMLAttributes<HTMLDivElement>;

/** Card segun DESIGN.md (seccion Components > Cards): superficie blanca,
 * borde sutil, radio xl (16px) y elevacion nivel 1, con hover opcional a
 * nivel 2. */
export function Card({
  children,
  hoverable = false,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-border-subtle bg-surface-canvas p-space-lg shadow-level-1",
        hoverable &&
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-1 hover:shadow-level-2 hover:border-secondary/40",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
