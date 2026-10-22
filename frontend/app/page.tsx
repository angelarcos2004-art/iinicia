import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const HIGHLIGHTS = [
  {
    icon: "school",
    title: "Validez oficial SEP",
    description:
      "Programas con Reconocimiento de Validez Oficial de Estudios (RVOE) desde el primer día.",
  },
  {
    icon: "laptop_mac",
    title: "100% en línea",
    description:
      "Estudia a tu propio ritmo desde cualquier lugar, con acompañamiento docente continuo.",
  },
  {
    icon: "groups",
    title: "Comunidad académica",
    description:
      "Profesores, coordinadores y compañeros disponibles durante todo tu programa.",
  },
];

const OFFER_PREVIEW = [
  {
    kind: "Licenciatura RVOE",
    title: "Ingeniería de Software e Inteligencia Artificial",
    description:
      "Forma parte de la próxima generación de ingenieros especializados en IA aplicada.",
  },
  {
    kind: "Diplomado ejecutivo",
    title: "Cloud Architecture & Kubernetes",
    description:
      "Diseña e implementa arquitecturas en la nube listas para producción.",
  },
  {
    kind: "Certificación oficial",
    title: "Ciberseguridad Defensiva y SOC",
    description:
      "Capacítate en detección y respuesta a incidentes de seguridad informática.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-surface-subtle">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-margin-mobile py-16 md:px-margin-desktop lg:grid-cols-12 lg:py-24">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-label-sm font-display font-bold uppercase tracking-wide text-primary">
              Validez oficial SEP · RVOE federal
            </span>
            <h1 className="text-display-mobile font-display font-extrabold tracking-tight text-primary md:text-display">
              Tu educación comienza hoy,{" "}
              <span className="text-secondary">estés donde estés</span>
            </h1>
            <p className="max-w-2xl text-body-lg text-ink-muted">
              Estudia en línea con programas avalados por la SEP. Aprende a tu
              propio ritmo con tecnología educativa de vanguardia y
              acompañamiento docente continuo.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <ButtonLink href="/registro" variant="accent">
                Comenzar mi registro
              </ButtonLink>
              <ButtonLink href="/oferta-academica" variant="outline">
                Ver oferta académica
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <Card key={item.title}>
              <h2 className="mb-2 text-headline-sm font-display font-bold text-primary">
                {item.title}
              </h2>
              <p className="text-body-sm text-ink-muted">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-headline-lg font-display font-bold text-primary">
            Oferta académica destacada
          </h2>
          <p className="text-body-md text-ink-muted">
            Licenciaturas, diplomados y certificaciones con validez oficial.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {OFFER_PREVIEW.map((program) => (
            <Card key={program.title} hoverable className="flex flex-col gap-3">
              <Badge variant="academic">{program.kind}</Badge>
              <h3 className="text-headline-sm font-display font-bold text-primary">
                {program.title}
              </h3>
              <p className="text-body-sm text-ink-muted">{program.description}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/oferta-academica" variant="outline">
            Ver catálogo completo
          </ButtonLink>
        </div>
      </section>

      <section className="bg-primary py-16 text-white">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-margin-mobile text-center md:px-margin-desktop">
          <Badge variant="admission" className="bg-accent/20 text-accent">
            Ciclo escolar 2026 - 2027
          </Badge>
          <h2 className="text-headline-lg font-display font-bold">
            Inicia tu proceso de admisión hoy mismo
          </h2>
          <p className="text-body-lg text-white/80">
            Inscripciones abiertas. Asesoría personalizada sin costo y
            opciones de becas institucionales.
          </p>
          <ButtonLink href="/registro" variant="accent">
            Comenzar registro ahora
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
