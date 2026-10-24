type SectionBgProps = {
  /** Ruta en /public de la imagen de fondo. */
  image: string;
  /** Opacidad de la imagen (el color de fondo de la sección se sigue viendo). */
  opacity?: number;
};

/**
 * Imagen de fondo fija detrás de una sección (background-attachment: fixed):
 * crea un efecto parallax nativo en CSS, sin JS. El padre debe tener
 * `relative overflow-hidden` y el contenido debe llevar su propio `relative`
 * para quedar por encima.
 */
export function SectionBg({ image, opacity = 0.1 }: SectionBgProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-fixed bg-cover bg-center"
      style={{ backgroundImage: `url(${image})`, opacity }}
    />
  );
}
