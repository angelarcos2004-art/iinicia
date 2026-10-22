type LogoProps = {
  className?: string;
  /** "light" para fondos claros (texto navy); "dark" para fondos navy (texto blanco). */
  variant?: "light" | "dark";
  showWordmark?: boolean;
};

export function Logo({
  className,
  variant = "light",
  showWordmark = true,
}: LogoProps) {
  const wordmarkColor = variant === "dark" ? "#FFFFFF" : "#0B2A5B";
  const taglineColor = variant === "dark" ? "#D6E3FF" : "#475569";

  return (
    <svg
      viewBox={showWordmark ? "0 0 280 64" : "0 0 56 64"}
      className={className}
      role="img"
      aria-label="IINICIA, Instituto de Innovación y Ciencias Aplicadas"
    >
      <g transform="translate(4, 8)">
        <rect x="0" y="0" width="48" height="48" rx="12" fill="#0B2A5B" />
        <path d="M14 14H20V34H14V14Z" fill="#F2A900" />
        <path d="M28 14H34V34H28V14Z" fill="#1E5AA8" />
        <circle cx="17" cy="10" r="2.5" fill="#F2A900" />
        <circle cx="31" cy="10" r="2.5" fill="#FFFFFF" />
        <path
          d="M14 38C14 36.3431 21.6112 36 24 36C26.3888 36 34 36.3431 34 38C34 39.6569 26.3888 40 24 40C21.6112 40 14 39.6569 14 38Z"
          fill="#F2A900"
          opacity="0.4"
        />
      </g>
      {showWordmark && (
        <>
          <text
            x="62"
            y="34"
            fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
            fontSize="24"
            fontWeight="800"
            letterSpacing="-0.5px"
            fill={wordmarkColor}
          >
            IINICIA
          </text>
          <text
            x="63"
            y="47"
            fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
            fontSize="8.5"
            fontWeight="600"
            letterSpacing="1px"
            fill={taglineColor}
          >
            CIENCIAS APLICADAS
          </text>
        </>
      )}
    </svg>
  );
}
