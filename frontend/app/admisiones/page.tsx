import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const CONFIANZA = [
  { icono: "RVOE Federal", detalle: "Validez oficial SEP al 100%" },
  { icono: "48 a 72 horas", detalle: "Tiempo de dictamen de ingreso" },
  { icono: "Virtual e híbrido", detalle: "Estudia desde donde estés" },
];

const PASOS = [
  {
    numero: "01",
    titulo: "Registro en línea",
    descripcion: "Crea tu perfil y elige tu programa de interés. Toma unos 10 minutos.",
  },
  {
    numero: "02",
    titulo: "Carga de expediente",
    descripcion: "Sube tus documentos en PDF; la validación es automática.",
  },
  {
    numero: "03",
    titulo: "Dictamen del comité",
    descripcion: "Recibes la resolución por correo en 48 a 72 horas hábiles.",
  },
  {
    numero: "04",
    titulo: "Matrícula y campus",
    descripcion: "Obtén tu correo institucional y el curso introductorio al campus virtual.",
  },
];

const REQUISITOS = [
  {
    nivel: "Licenciatura",
    items: [
      "Certificado de bachillerato (legalizado)",
      "Acta de nacimiento",
      "CURP oficial",
      "Identificación oficial vigente",
    ],
  },
  {
    nivel: "Maestría",
    items: [
      "Título y cédula de licenciatura",
      "Carta de exposición de motivos",
      "Dos cartas de recomendación académica o laboral",
      "Identificación oficial vigente",
    ],
  },
  {
    nivel: "Diplomado",
    items: [
      "Comprobante de estudios o experiencia afín",
      "Identificación oficial vigente",
      "Formulario de registro completo",
    ],
  },
];

export default function AdmisionesPage() {
  return (
    <>
      <section className="bg-surface-subtle">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-margin-mobile py-16 text-center md:px-margin-desktop">
          <Badge variant="admission">Convocatoria oficial 2026 abierta</Badge>
          <h1 className="text-display-mobile font-display font-extrabold tracking-tight text-primary md:text-display">
            Inicia tu futuro académico en IINICIA
          </h1>
          <p className="max-w-2xl text-body-lg text-ink-muted">
            Admisiones abiertas para la convocatoria 2026. Fórmate en
            programas tecnológicos, científicos y de innovación con validez
            oficial SEP (RVOE), mentorías aplicadas y tecnología de vanguardia.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <ButtonLink href="/registro" variant="accent">
              Registrarme
            </ButtonLink>
            <ButtonLink href="https://wa.me/525584219000" variant="outline" target="_blank">
              Contactar a un asesor por WhatsApp
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {CONFIANZA.map((item) => (
            <Card key={item.icono} className="text-center">
              <p className="text-headline-sm font-display font-bold text-primary">{item.icono}</p>
              <p className="mt-1 text-body-sm text-ink-muted">{item.detalle}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-label-md font-display font-bold uppercase tracking-wide text-secondary">
              Ciclo académico otoño 2026-A
            </p>
            <p className="text-body-sm text-ink-muted">Cupos disponibles: 42%</p>
          </div>
          <Badge variant="admission">Cierre de admisión: 30 de abril</Badge>
        </Card>
      </section>

      <section className="bg-surface-subtle">
        <div className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
          <h2 className="mb-8 text-headline-lg font-display font-bold text-primary">
            El proceso de admisión en 4 pasos
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map((paso) => (
              <Card key={paso.numero}>
                <span className="text-headline-md font-display font-extrabold text-accent-ink/30">
                  {paso.numero}
                </span>
                <h3 className="mt-2 text-title font-display font-bold text-primary">{paso.titulo}</h3>
                <p className="mt-2 text-body-sm text-ink-muted">{paso.descripcion}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <h2 className="mb-8 text-headline-lg font-display font-bold text-primary">
          Requisitos por nivel académico
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {REQUISITOS.map((req) => (
            <Card key={req.nivel}>
              <h3 className="mb-4 text-title font-display font-bold text-primary">{req.nivel}</h3>
              <ul className="flex flex-col gap-2.5">
                {req.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-body-sm text-ink-muted">
                    <span className="mt-0.5 text-success-ink">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/registro" variant="accent">
            Comenzar mi registro
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
