import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STATS = [
  { valor: "100%", etiqueta: "Programas RVOE", detalle: "Validez oficial SEP en licenciaturas y maestrías." },
  { valor: "+5,000", etiqueta: "Egresados de impacto", detalle: "Liderando equipos técnicos en más de 18 países." },
  { valor: "+95%", etiqueta: "Tasa de empleabilidad", detalle: "Inserción laboral calificada antes de los 6 meses." },
  { valor: "100%", etiqueta: "Campus digital", detalle: "Infraestructura interactiva disponible 24/7." },
];

const MODELO = [
  {
    titulo: "Aprendizaje en retos reales",
    descripcion: "Evaluación por proyectos aplicados, no por exámenes de memoria.",
  },
  {
    titulo: "Mentoría activa de la industria",
    descripcion: "Catedráticos que siguen activos en empresas tecnológicas.",
  },
  {
    titulo: "Plataforma adaptativa con IA",
    descripcion: "Rutas de aprendizaje personalizadas según tu ritmo y avance.",
  },
  {
    titulo: "Certificación continua",
    descripcion: "Micro-credenciales en la nube y badges verificables.",
  },
];

const AUTORIDADES = [
  {
    nombre: "Dr. Alejandro Morales V.",
    cargo: "Rector",
    credencial: "PhD en Computación Cuántica, MIT",
  },
  {
    nombre: "Dra. Beatriz Sandoval R.",
    cargo: "Vicerrectora Académica",
    credencial: "PhD, Stanford University",
  },
  {
    nombre: "Mtro. Carlos Estrada L.",
    cargo: "Director de Innovación y Posgrados",
    credencial: "M.Sc. en Inteligencia Artificial, Oxford",
  },
  {
    nombre: "Lic. Javier Ramos Mendoza",
    cargo: "Secretario General",
    credencial: "Maestría en Derecho Corporativo y TIC, UNAM",
  },
];

export default function UniversidadPage() {
  return (
    <>
      <section className="bg-surface-subtle">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-margin-mobile py-16 text-center md:px-margin-desktop">
          <Badge variant="academic">Excelencia y vanguardia educativa</Badge>
          <h1 className="text-display-mobile font-display font-extrabold tracking-tight text-primary md:text-display">
            Formando líderes en tecnología y ciencias aplicadas
          </h1>
          <p className="max-w-2xl text-body-lg text-ink-muted">
            IINICIA nace para transformar la educación superior en América
            Latina mediante investigación rigurosa, pedagogía inmersiva y un
            ecosistema de innovación conectado con la industria digital global.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <ButtonLink href="#quienes-somos" variant="accent">
              Conoce nuestra historia
            </ButtonLink>
            <ButtonLink href="#modelo" variant="outline">
              Modelo de aprendizaje
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {STATS.map((stat) => (
            <Card key={stat.etiqueta} className="text-center">
              <p className="text-headline-lg font-display font-extrabold text-primary">{stat.valor}</p>
              <p className="mt-1 text-label-md font-display font-bold uppercase tracking-wide text-secondary">
                {stat.etiqueta}
              </p>
              <p className="mt-2 text-body-sm text-ink-muted">{stat.detalle}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="quienes-somos" className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="text-headline-lg font-display font-bold text-primary">
              Una universidad diseñada para resolver las demandas de la era digital
            </h2>
            <p className="text-body-md text-ink-muted">
              El Instituto de Innovación y Ciencias Aplicadas (IINICIA) fue
              fundado con la convicción de que la brecha tecnológica y la
              educación universitaria no podían continuar en vías paralelas.
              Diseñamos cada programa junto con la industria para que lo que
              aprendes hoy siga siendo relevante mañana.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <h3 className="mb-2 text-title font-display font-bold text-primary">Vanguardia técnica</h3>
              <p className="text-body-sm text-ink-muted">
                Currículas actualizadas anualmente junto con especialistas de la industria.
              </p>
            </Card>
            <Card>
              <h3 className="mb-2 text-title font-display font-bold text-primary">Alcance global</h3>
              <p className="text-body-sm text-ink-muted">
                Metodologías internacionales con reconocimiento oficial en toda la región.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-surface-subtle">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-margin-mobile py-space-xl md:grid-cols-2 md:px-margin-desktop">
          <Card>
            <h2 className="mb-2 text-headline-sm font-display font-bold text-primary">Misión</h2>
            <p className="text-body-sm text-ink-muted">
              Democratizar el acceso a una educación superior de clase mundial
              en ingeniería, ciencias de datos y tecnologías disruptivas.
              Formamos profesionales éticos, críticos y altamente competentes
              para resolver los problemas reales de su comunidad y su industria.
            </p>
          </Card>
          <Card>
            <h2 className="mb-2 text-headline-sm font-display font-bold text-primary">Visión</h2>
            <p className="text-body-sm text-ink-muted">
              Consolidarnos como el referente universitario más innovador de
              Iberoamérica en ciencias aplicadas y computación, con una
              comunidad académica que lidera la transformación digital de la
              región hacia 2030.
            </p>
          </Card>
        </div>
      </section>

      <section id="modelo" className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-headline-lg font-display font-bold text-primary">
            Modelo educativo IINICIA-Tech™
          </h2>
          <p className="text-body-md text-ink-muted">Cuatro pilares que sostienen cada programa académico.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MODELO.map((item) => (
            <Card key={item.titulo} hoverable>
              <h3 className="mb-2 text-title font-display font-bold text-primary">{item.titulo}</h3>
              <p className="text-body-sm text-ink-muted">{item.descripcion}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-surface-subtle">
        <div className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
          <h2 className="mb-8 text-headline-lg font-display font-bold text-primary">Autoridades</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {AUTORIDADES.map((persona) => (
              <Card key={persona.nombre}>
                <h3 className="text-title font-display font-bold text-primary">{persona.nombre}</h3>
                <p className="mt-1 text-label-md font-display font-semibold text-secondary">{persona.cargo}</p>
                <p className="mt-2 text-body-sm text-ink-muted">{persona.credencial}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
