import type { HTMLAttributes } from "react";

type IconProps = {
  /** Nombre del ícono en Google Material Symbols (p.ej. "school", "groups"). */
  name: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

/** Ícono de Material Symbols Outlined (fuente cargada en app/layout.tsx). Decorativo: el texto visible junto a él ya transmite el significado. */
export function Icon({ name, className, ...rest }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={["material-symbols-outlined", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {name}
    </span>
  );
}
