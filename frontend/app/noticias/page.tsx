import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const CATEGORIAS = [
  "Vida universitaria",
  "Convocatorias y becas",
  "Investigación e IA",
  "Eventos y webinars",
  "Alianzas estratégicas",
];

const DESTACADA = {
  categoria: "Innovación y tecnología",
  titulo:
    "IINICIA inaugura su Centro de Innovación en Inteligencia Artificial Aplicada y firma convenio con líderes tecnológicos",
  fecha: "28 de marzo de 2026",
  lectura: "5 min de lectura",
  autor: "Dr. Roberto Valenzuela, Director de Investigación y Posgrado",
  resumen:
    "Con una inversión estratégica en infraestructura computacional de alto rendimiento, el Instituto abre las puertas de su nuevo centro enfocado en Machine Learning, Visión Artificial y Procesamiento de Lenguaje Natural, en beneficio de más de 4,000 estudiantes y posgraduados.",
};

const NOTICIAS = [
  {
    categoria: "Becas",
    titulo: "Convocatoria abierta: Becas STEM Mujeres en Tecnología 2026",
  },
  {
    categoria: "Alianzas",
    titulo: "Convenio con proveedores cloud para certificaciones en la nube",
  },
  {
    categoria: "Eventos",
    titulo: "Simposio Internacional de Ciberseguridad y Ética de Datos",
  },
  {
    categoria: "Investigación",
    titulo: "Publicación indexada: diagnóstico médico asistido por redes neuronales",
  },
  {
    categoria: "Vida universitaria",
    titulo: "Hackathon IINICIA 2026: 48 horas de soluciones para ciudades inteligentes",
  },
  {
    categoria: "Institucional",
    titulo: "La SEP actualiza y renueva los RVOE de las maestrías en Ciencia de Datos",
  },
];

const RECIENTES = [
  "Calendario de exámenes de ingreso para el ciclo de otoño",
  "Mentorías con exalumnas líderes en Silicon Valley y Europa",
  "El Laboratorio de Neurocomputación recibe financiamiento internacional",
];

export default function NoticiasPage() {
  return (
    <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
      <div className="mb-8 flex flex-col gap-2">
        <Badge variant="academic" className="w-fit">
          Comunicación institucional
        </Badge>
        <h1 className="text-headline-lg font-display font-bold text-primary md:text-display-mobile">
          Noticias y actualidad académica
        </h1>
        <p className="max-w-2xl text-body-md text-ink-muted">
          Investigación aplicada, acuerdos tecnológicos, eventos académicos,
          convocatorias de becas y logros de nuestra comunidad.
        </p>
        <p className="text-label-sm uppercase tracking-wide text-ink-muted/70">
          Actualizado en octubre de 2026
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <span className="rounded-full bg-primary px-4 py-2 text-label-md font-display font-semibold text-white">
          Todas las noticias
        </span>
        {CATEGORIAS.map((categoria) => (
          <span
            key={categoria}
            className="rounded-full border border-border-subtle px-4 py-2 text-label-md font-display font-semibold text-ink-muted"
          >
            {categoria}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card hoverable className="flex flex-col gap-3">
            <Badge variant="academic" className="w-fit">
              {DESTACADA.categoria}
            </Badge>
            <h2 className="text-headline-md font-display font-bold text-primary">{DESTACADA.titulo}</h2>
            <p className="text-body-sm text-ink-muted">{DESTACADA.resumen}</p>
            <div className="flex flex-wrap items-center gap-3 text-label-sm text-ink-muted/80">
              <time>{DESTACADA.fecha}</time>
              <span>·</span>
              <span>{DESTACADA.lectura}</span>
              <span>·</span>
              <span>{DESTACADA.autor}</span>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {NOTICIAS.map((noticia) => (
              <Card key={noticia.titulo} hoverable className="flex flex-col gap-2">
                <Badge variant="neutral" className="w-fit">
                  {noticia.categoria}
                </Badge>
                <h3 className="text-title font-display font-bold text-primary">{noticia.titulo}</h3>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-headline-sm font-display font-bold text-primary">Artículos recientes</h2>
          <Card className="flex flex-col divide-y divide-border-subtle p-0">
            {RECIENTES.map((titulo) => (
              <p key={titulo} className="p-space-md text-body-sm text-ink">
                {titulo}
              </p>
            ))}
          </Card>
        </div>
      </div>
    </section>
  );
}
