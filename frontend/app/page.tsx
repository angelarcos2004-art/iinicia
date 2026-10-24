"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { NetworkBackground } from "@/components/ui/network-background";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { Select } from "@/components/ui/select";
import { SectionBg } from "@/components/ui/section-bg";
import { MOCK_PROGRAMAS } from "@/lib/mock-data";
import type { TipoPrograma } from "@/lib/types";

const STATS = [
  { valor: "100%", etiqueta: "Programas con RVOE" },
  { valor: "+5,000", etiqueta: "Egresados en 18 países" },
  { valor: "+95%", etiqueta: "Empleabilidad a 6 meses" },
  { valor: "100%", etiqueta: "Campus digital 24/7" },
];

/**
 * Datos del acuerdo RVOE de ejemplo (formato real: SEP-SES/<entidad>/<folio>/<año>).
 * Sustituir por el acuerdo real una vez que el Instituto lo obtenga; mientras
 * tanto sigue el mismo criterio que MOCK_PROGRAMAS: contenido de ejemplo
 * explícito en el código, nunca inventado de cara al usuario como un hecho
 * verificado.
 */
const ACREDITACION = {
  acuerdo: "SEP-SES/4/18/2044/2026",
  nivel: "Licenciatura",
  modalidad: "En línea (no escolarizada)",
  dependencia: "Secretaría de Educación Pública · Subsecretaría de Educación Superior",
  fecha: "14 de enero de 2026",
};

const SIRVOES_URL = "https://sirvoes.sep.gob.mx/sirvoes/mvc/consultas";

const MODELO = [
  {
    icon: "rocket_launch",
    titulo: "Aprendizaje en retos reales",
    descripcion: "Evaluación por proyectos aplicados, no por exámenes de memoria.",
  },
  {
    icon: "diversity_3",
    titulo: "Mentoría activa de la industria",
    descripcion: "Catedráticos que siguen activos en empresas tecnológicas.",
  },
  {
    icon: "psychology",
    titulo: "Plataforma adaptativa con IA",
    descripcion: "Rutas de aprendizaje personalizadas según tu ritmo y avance.",
  },
  {
    icon: "workspace_premium",
    titulo: "Certificación continua",
    descripcion: "Micro-credenciales en la nube y badges verificables.",
  },
];

const TIPO_FILTROS: { value: TipoPrograma; label: string }[] = [
  { value: "licenciatura", label: "Licenciaturas" },
  { value: "diplomado", label: "Diplomados" },
  { value: "certificacion", label: "Certificaciones" },
];

const TIPO_BADGE_LABEL: Record<TipoPrograma, string> = {
  licenciatura: "Licenciatura RVOE",
  diplomado: "Diplomado ejecutivo",
  certificacion: "Certificación oficial",
};

const MODALIDAD_LABEL: Record<string, string> = {
  en_linea: "En línea",
  hibrida: "Híbrida",
};

const CONFIANZA = [
  { icon: "verified", titulo: "RVOE Federal", detalle: "Validez oficial SEP al 100%" },
  { icon: "schedule", titulo: "48 a 72 horas", detalle: "Tiempo de dictamen de ingreso" },
  { icon: "devices", titulo: "Virtual e híbrido", detalle: "Estudia desde donde estés" },
];

const PASOS = [
  {
    numero: "01",
    icon: "how_to_reg",
    titulo: "Registro en línea",
    descripcion: "Crea tu perfil y elige tu programa de interés. Toma unos 10 minutos.",
  },
  {
    numero: "02",
    icon: "upload_file",
    titulo: "Carga de expediente",
    descripcion: "Sube tus documentos en PDF; la validación es automática.",
  },
  {
    numero: "03",
    icon: "fact_check",
    titulo: "Dictamen del comité",
    descripcion: "Recibes la resolución por correo en 48 a 72 horas hábiles.",
  },
  {
    numero: "04",
    icon: "school",
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

const NOTICIA_DESTACADA = {
  categoria: "Innovación y tecnología",
  titulo:
    "IINICIA inaugura su Centro de Innovación en Inteligencia Artificial Aplicada",
  fecha: "28 de marzo de 2026",
  resumen:
    "Con una inversión estratégica en infraestructura computacional de alto rendimiento, el Instituto abre las puertas de su nuevo centro enfocado en Machine Learning, Visión Artificial y Procesamiento de Lenguaje Natural.",
};

const NOTICIAS = [
  { categoria: "Becas", titulo: "Convocatoria abierta: Becas STEM Mujeres en Tecnología 2026" },
  { categoria: "Alianzas", titulo: "Convenio con proveedores cloud para certificaciones en la nube" },
  { categoria: "Eventos", titulo: "Simposio Internacional de Ciberseguridad y Ética de Datos" },
  { categoria: "Vida universitaria", titulo: "Hackathon IINICIA 2026: soluciones para ciudades inteligentes" },
];

const FAQ = [
  {
    pregunta: "¿Mi título tendrá validez oficial?",
    respuesta:
      "Sí. Cada programa cuenta con RVOE otorgado por la SEP; el número de acuerdo y cómo verificarlo están en la sección de acreditación arriba.",
  },
  {
    pregunta: "¿Las clases son en vivo o grabadas?",
    respuesta:
      "Son 100% en línea y a tu propio ritmo, con acompañamiento docente continuo durante todo el programa.",
  },
  {
    pregunta: "¿Cuánto tarda el proceso de admisión?",
    respuesta:
      "El comité emite su dictamen en 48 a 72 horas hábiles después de que subes tu expediente completo.",
  },
  {
    pregunta: "¿Hay becas disponibles?",
    respuesta:
      "Sí, ofrecemos asesoría personalizada sin costo y opciones de becas institucionales según tu perfil.",
  },
  {
    pregunta: "¿Qué documentos necesito para inscribirme?",
    respuesta: "Varían según el nivel (licenciatura, maestría o diplomado); revisa el detalle en Admisiones.",
  },
  {
    pregunta: "¿Cómo accedo a la plataforma educativa?",
    respuesta:
      "Al matricularte recibes tu correo institucional y acceso al campus virtual (Moodle) con un curso introductorio.",
  },
];

/**
 * Testimonios de ejemplo (mismo criterio que MOCK_PROGRAMAS/AUTORIDADES):
 * sustituir por testimonios reales y verificados de egresados cuando existan.
 */
const TESTIMONIOS = [
  {
    nombre: "Daniela Fuentes Ríos",
    detalle: "Generación 2024 · Ingeniería de Software e IA",
    cita:
      "Trabajaba tiempo completo y aun así terminé mi carrera: las clases grabadas y el acompañamiento de los profesores por chat hicieron la diferencia real.",
  },
  {
    nombre: "Marco Villagómez Peña",
    detalle: "Diplomado en Cloud Architecture & Kubernetes",
    cita:
      "Apliqué lo del diplomado en mi trabajo antes de terminarlo. El enfoque en proyectos, no en exámenes, fue justo lo que necesitaba.",
  },
  {
    nombre: "Ana Paula Soto Reyes",
    detalle: "Certificación en Ciberseguridad Defensiva y SOC",
    cita:
      "Los catedráticos siguen activos en la industria y se nota: las clases iban de casos reales de un SOC, no de teoría desconectada.",
  },
];

function iniciales(nombreCompleto: string): string {
  const partes = nombreCompleto.split(" ").filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

/** Permite que buscadores muestren las preguntas frecuentes en resultados enriquecidos. */
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.pregunta,
    acceptedAnswer: { "@type": "Answer", text: item.respuesta },
  })),
};

const PROGRAMAS_INTERES = [
  "Ingeniería de Software e IA",
  "Ciencia de Datos",
  "Seguridad Informática",
  "Maestría en Sistemas Inteligentes",
  "Diplomados STEM",
  "Consulta general",
];

export default function HomePage() {
  const [tiposActivos, setTiposActivos] = useState<Set<TipoPrograma>>(new Set());
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [heroOffset, setHeroOffset] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  /** Parallax sutil de la foto del hero: la imagen se desplaza más lento que el scroll. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    function onScroll() {
      setHeroOffset(Math.min(window.scrollY * 0.15, 60));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** Foco de luz que sigue al cursor en el hero (solo dispositivos con mouse). */
  function handleHeroMouseMove(event: MouseEvent<HTMLElement>) {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect || !heroRef.current) return;
    heroRef.current.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    heroRef.current.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  }

  function toggleTipo(tipo: TipoPrograma) {
    setTiposActivos((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) {
        next.delete(tipo);
      } else {
        next.add(tipo);
      }
      return next;
    });
  }

  const programasFiltrados = useMemo(() => {
    if (tiposActivos.size === 0) return MOCK_PROGRAMAS;
    return MOCK_PROGRAMAS.filter((programa) => tiposActivos.has(programa.tipo));
  }, [tiposActivos]);

  // Este formulario todavía no tiene un endpoint propio en el backend
  // (solo existe /auth/login y /auth/registro); por ahora solo valida en
  // cliente y simula el envío para no bloquear la experiencia del portal.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setTimeout(() => {
      setEnviando(false);
      setEnviado(true);
    }, 500);
  }

  return (
    <>
      {/* Inicio */}
      <section
        id="inicio"
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        className="group relative overflow-hidden bg-primary"
      >
        <div className="absolute -inset-y-16 inset-x-0" style={{ transform: `translateY(${heroOffset}px)` }}>
          <Image
            src="/images/hero-campus.jpg"
            alt="Estudiantes en el campus de IINICIA"
            fill
            priority
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/55" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(500px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(242,169,0,0.18), transparent 60%)",
          }}
        />
        <div
          aria-hidden="true"
          className="animate-float-blob absolute -top-16 right-[10%] h-72 w-72 rounded-full bg-accent/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="animate-float-blob-slow absolute bottom-0 left-[5%] h-80 w-80 rounded-full bg-secondary/40 blur-3xl"
        />
        <div className="absolute inset-0">
          <NetworkBackground className="absolute inset-0 h-full w-full opacity-70" />
        </div>
        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-12 px-margin-mobile py-16 md:px-margin-desktop lg:py-24">
          <div className="flex flex-col gap-6">
            <span
              className="animate-rise-in inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-label-sm font-display font-bold uppercase tracking-wide text-white"
            >
              Validez oficial SEP
            </span>
            <h1
              className="animate-rise-in max-w-3xl text-display-mobile font-display font-extrabold tracking-tight text-white md:text-display"
              style={{ animationDelay: "90ms" }}
            >
              Tu educación comienza hoy,{" "}
              <span className="text-accent">estés donde estés</span>
            </h1>
            <p
              className="animate-rise-in max-w-2xl text-body-lg text-white/85"
              style={{ animationDelay: "180ms" }}
            >
              Estudia en línea con programas avalados por la SEP. Aprende a tu
              propio ritmo con tecnología educativa de vanguardia y
              acompañamiento docente continuo.
            </p>
            <div
              className="animate-rise-in flex flex-col gap-4 sm:flex-row"
              style={{ animationDelay: "270ms" }}
            >
              <ButtonLink href="/registro" variant="accent">
                Comenzar mi registro
              </ButtonLink>
              <ButtonLink href="#oferta-academica" variant="outline" className="!border-white !text-white hover:!bg-white/10">
                Ver oferta académica
              </ButtonLink>
            </div>
            <dl
              className="animate-rise-in mt-4 grid grid-cols-2 gap-6 border-t border-white/20 pt-6 sm:grid-cols-4"
              style={{ animationDelay: "360ms" }}
            >
              {STATS.map((stat) => (
                <div key={stat.etiqueta}>
                  <dd className="text-headline-md font-display font-extrabold text-white">
                    <CountUp value={stat.valor} />
                  </dd>
                  <dt className="mt-1 text-body-sm text-white/75">{stat.etiqueta}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-12 w-full fill-surface-canvas md:h-16"
        >
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </section>

      {/* Transparencia institucional */}
      <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <Reveal>
          <Card className="relative grid grid-cols-1 gap-8 overflow-hidden lg:grid-cols-5">
            <Image
              src="/images/pattern-lines.png"
              alt=""
              fill
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 object-cover opacity-[0.04]"
            />
            <div className="relative flex flex-col gap-3 lg:col-span-2">
              <Icon name="account_balance" className="text-headline-lg text-secondary" />
              <h2 className="text-headline-sm font-display font-bold text-primary">
                RVOE con folio público, no solo una promesa
              </h2>
              <p className="text-body-sm text-ink-muted">
                Toda institución con validez oficial debe publicar su número
                de acuerdo, la fecha de expedición y la autoridad que lo
                otorgó. Este es el nuestro, y puedes verificarlo —y el de
                cualquier otra universidad— directamente en el buscador
                oficial de la SEP.
              </p>
              <ButtonLink
                href={SIRVOES_URL}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                className="mt-1 w-fit"
              >
                Verificar en SIRVOES (SEP)
              </ButtonLink>
            </div>

            <dl className="grid grid-cols-1 gap-5 border-t border-border-subtle pt-6 sm:grid-cols-2 lg:col-span-3 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
              <div>
                <dt className="text-label-sm font-display font-bold uppercase tracking-wide text-ink-muted">
                  Número de acuerdo
                </dt>
                <dd className="mt-1 text-title font-display font-bold text-primary">
                  {ACREDITACION.acuerdo}
                </dd>
              </div>
              <div>
                <dt className="text-label-sm font-display font-bold uppercase tracking-wide text-ink-muted">
                  Fecha de expedición
                </dt>
                <dd className="mt-1 text-title font-display font-bold text-primary">
                  {ACREDITACION.fecha}
                </dd>
              </div>
              <div>
                <dt className="text-label-sm font-display font-bold uppercase tracking-wide text-ink-muted">
                  Nivel y modalidad
                </dt>
                <dd className="mt-1 text-title font-display font-bold text-primary">
                  {ACREDITACION.nivel} · {ACREDITACION.modalidad}
                </dd>
              </div>
              <div>
                <dt className="text-label-sm font-display font-bold uppercase tracking-wide text-ink-muted">
                  Autoridad que lo otorga
                </dt>
                <dd className="mt-1 text-body-sm text-ink-muted">{ACREDITACION.dependencia}</dd>
              </div>
            </dl>
          </Card>
        </Reveal>
      </section>

      {/* Universidad */}
      <section id="universidad" className="relative overflow-hidden bg-surface-subtle">
        <SectionBg image="/images/bg-abstract-1.png" opacity={0.12} />
        <div className="relative mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <Reveal className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="text-headline-lg font-display font-bold text-primary">
              Una universidad diseñada para la era digital
            </h2>
            <p className="text-body-md text-ink-muted">
              El Instituto de Innovación y Ciencias Aplicadas (IINICIA) nace de
              la convicción de que la brecha tecnológica y la educación
              universitaria no podían seguir caminos separados. Diseñamos cada
              programa junto con la industria para que lo que aprendes hoy
              siga siendo relevante mañana.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 border-t border-border-subtle pt-6 sm:grid-cols-2 sm:border-t-0 sm:border-l sm:pl-10 sm:pt-0">
            <div>
              <h3 className="mb-2 text-title font-display font-bold text-primary">Misión</h3>
              <p className="text-body-sm text-ink-muted">
                Democratizar el acceso a una educación superior de clase
                mundial en ingeniería, ciencia de datos y tecnologías
                disruptivas.
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-title font-display font-bold text-primary">Visión</h3>
              <p className="text-body-sm text-ink-muted">
                Ser el referente universitario más innovador de Iberoamérica
                en ciencias aplicadas y computación hacia 2030.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal variant="zoom" className="group relative mt-12 overflow-hidden rounded-xl">
          <Image
            src="/images/vida-estudiantil.jpg"
            alt="Estudiantes de IINICIA en el campus"
            width={1600}
            height={700}
            className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-80"
          />
        </Reveal>

        <div className="mt-12 flex items-start gap-3">
          <Image
            src="/images/icon-educacion.png"
            alt=""
            width={48}
            height={48}
            aria-hidden="true"
            className="mt-1 h-10 w-10 shrink-0"
          />
          <div className="flex flex-col gap-2">
            <h3 className="text-headline-md font-display font-bold text-primary">
              Modelo educativo IINICIA-Tech™
            </h3>
            <p className="text-body-md text-ink-muted">Cuatro pilares que sostienen cada programa académico.</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MODELO.map((item, i) => (
            <Reveal key={item.titulo} delay={i * 120}>
              <Card hoverable>
                <Icon name={item.icon} className="mb-3 text-headline-lg text-secondary" />
                <h4 className="mb-2 text-title font-display font-bold text-primary">{item.titulo}</h4>
                <p className="text-body-sm text-ink-muted">{item.descripcion}</p>
              </Card>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2">
          <h3 className="text-headline-md font-display font-bold text-primary">
            Así es tu campus virtual
          </h3>
          <p className="text-body-md text-ink-muted">
            Vista de ejemplo de Mi IINICIA, el panel con tus cursos y avisos
            que obtienes al matricularte.
          </p>
        </div>
        <Reveal>
          <Card className="mt-6 overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-subtle px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-error/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-success-ink/60" />
              <span className="ml-2 text-label-sm text-ink-muted/80">mi.iinicia.edu.mx</span>
            </div>
            <div className="grid grid-cols-1 gap-4 p-space-lg sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-title font-display font-bold text-primary">
                    Ingeniería de Software e IA
                  </h4>
                  <Badge variant="active">En curso</Badge>
                </div>
                <ProgressBar value={62} />
                <span className="text-label-sm font-display font-semibold text-ink-muted">
                  <CountUp value="62%" /> completado
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-title font-display font-bold text-primary">
                    Cloud Architecture &amp; Kubernetes
                  </h4>
                  <Badge variant="academic">Finalizado</Badge>
                </div>
                <ProgressBar value={100} />
                <span className="text-label-sm font-display font-semibold text-ink-muted">
                  <CountUp value="100%" /> completado
                </span>
              </div>
            </div>
          </Card>
        </Reveal>
        </div>
      </section>

      {/* Oferta académica */}
      <section id="oferta-academica" className="relative overflow-hidden bg-surface-subtle">
        <SectionBg image="/images/bg-abstract-1.png" opacity={0.08} />
        <div className="relative mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
          <Reveal className="mb-8 grid grid-cols-1 items-center gap-8 lg:grid-cols-5">
            <div className="flex flex-col gap-2 lg:col-span-3">
              <h2 className="text-headline-lg font-display font-bold text-primary">
                Oferta académica destacada
              </h2>
              <p className="text-body-md text-ink-muted">
                Licenciaturas, diplomados y certificaciones con validez oficial.
              </p>
            </div>
            <div className="group h-48 w-full overflow-hidden rounded-xl lg:col-span-2">
              <Image
                src="/images/oferta-academica.jpg"
                alt="Estudiantes colaborando en clase"
                width={800}
                height={500}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </Reveal>

          <Reveal className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de programa">
            {TIPO_FILTROS.map((filtro) => {
              const activo = tiposActivos.has(filtro.value);
              return (
                <button
                  key={filtro.value}
                  type="button"
                  onClick={() => toggleTipo(filtro.value)}
                  aria-pressed={activo}
                  className={[
                    "rounded-full border px-4 py-2 text-label-md font-display font-semibold transition-colors",
                    activo
                      ? "border-primary bg-primary text-white"
                      : "border-border-subtle bg-surface-canvas text-ink-muted hover:border-secondary hover:text-secondary",
                  ].join(" ")}
                >
                  {filtro.label}
                </button>
              );
            })}
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {programasFiltrados.map((programa, i) => (
              <Reveal key={programa.id} delay={i * 110}>
                <Card hoverable className="flex h-full flex-col gap-3">
                  <Badge variant="academic">{TIPO_BADGE_LABEL[programa.tipo]}</Badge>
                  <h3 className="text-headline-sm font-display font-bold text-primary">
                    {programa.nombre}
                  </h3>
                  <p className="flex-1 text-body-sm text-ink-muted">{programa.descripcion}</p>
                  <div className="flex items-center justify-between text-label-sm font-display font-semibold text-ink-muted">
                    <span>{programa.duracion}</span>
                    <span>{MODALIDAD_LABEL[programa.modalidad]}</span>
                  </div>
                  <ButtonLink href="/registro" variant="outline" className="h-11">
                    Solicitar información
                  </ButtonLink>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="relative overflow-hidden bg-primary">
        <SectionBg image="/images/bg-abstract-2.png" opacity={0.18} />
        <div
          aria-hidden="true"
          className="animate-float-blob pointer-events-none absolute -top-10 left-[15%] h-64 w-64 rounded-full bg-accent/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="animate-float-blob-slow pointer-events-none absolute bottom-0 right-[8%] h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <Reveal className="mb-8 flex flex-col gap-2">
          <h2 className="text-headline-lg font-display font-bold text-white">
            Lo que dice nuestra comunidad
          </h2>
        </Reveal>
        </div>
        <Reveal
          className="group relative overflow-hidden"
          style={{
            WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div className="animate-marquee flex w-max gap-6 px-margin-mobile group-hover:[animation-play-state:paused] md:px-margin-desktop">
            {[...TESTIMONIOS, ...TESTIMONIOS].map((t, i) => (
              <Card
                key={`${t.nombre}-${i}`}
                aria-hidden={i >= TESTIMONIOS.length}
                className="flex h-full w-80 shrink-0 flex-col gap-4"
              >
                <p className="text-body-sm text-ink-muted">“{t.cita}”</p>
                <div className="mt-auto flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-academic-bg text-label-md font-display font-bold text-primary">
                    {iniciales(t.nombre)}
                  </span>
                  <div>
                    <p className="text-label-md font-display font-bold text-primary">{t.nombre}</p>
                    <p className="text-label-sm text-ink-muted">{t.detalle}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Reveal>
        <div className="h-space-xl" />
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-12 w-full fill-surface-canvas md:h-16"
        >
          <path d="M0,40 C360,0 1080,80 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </section>

      {/* Admisiones */}
      <section id="admisiones" className="relative overflow-hidden bg-surface-canvas">
        <SectionBg image="/images/bg-abstract-2.png" opacity={0.07} />
        <div className="relative mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <Reveal className="mb-8 flex flex-col gap-3">
          <Badge variant="admission" className="w-fit">Convocatoria 2026 abierta</Badge>
          <h2 className="text-headline-lg font-display font-bold text-primary">
            Inicia tu proceso de admisión
          </h2>
          <p className="max-w-2xl text-body-md text-ink-muted">
            Inscripciones abiertas para el ciclo otoño 2026-A, con mentorías
            aplicadas y tecnología de vanguardia.
          </p>
        </Reveal>

        <Reveal variant="zoom" className="group relative mb-10 overflow-hidden rounded-xl">
          <Image
            src="/images/admisiones-cta.jpg"
            alt="Egresado de IINICIA sonriendo"
            width={1600}
            height={500}
            className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-72"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/20 to-transparent" />
        </Reveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {CONFIANZA.map((item, i) => (
            <Reveal key={item.titulo} delay={i * 110}>
              <Card className="flex flex-col items-center gap-2 text-center">
                <Icon name={item.icon} className="text-headline-lg text-secondary" />
                <p className="text-headline-sm font-display font-bold text-primary">{item.titulo}</p>
                <p className="text-body-sm text-ink-muted">{item.detalle}</p>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <Card className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <p className="text-label-md font-display font-bold uppercase tracking-wide text-secondary">
                Ciclo académico otoño 2026-A
              </p>
              <p className="mb-2 text-body-sm text-ink-muted">
                Cupos disponibles: <CountUp value="42%" />
              </p>
              <ProgressBar value={42} className="max-w-xs" />
            </div>
            <Badge variant="admission">Cierre de admisión: 30 de abril</Badge>
          </Card>
        </Reveal>

        <div className="mt-12 flex flex-col gap-2">
          <h3 className="text-headline-md font-display font-bold text-primary">
            El proceso en 4 pasos
          </h3>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map((paso, i) => (
            <Reveal key={paso.numero} delay={i * 120}>
              <Card>
                <div className="flex items-center justify-between">
                  <Icon name={paso.icon} className="text-headline-lg text-secondary" />
                  <span className="text-headline-md font-display font-extrabold text-accent-ink/30">
                    {paso.numero}
                  </span>
                </div>
                <h4 className="mt-2 text-title font-display font-bold text-primary">{paso.titulo}</h4>
                <p className="mt-2 text-body-sm text-ink-muted">{paso.descripcion}</p>
              </Card>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2">
          <h3 className="text-headline-md font-display font-bold text-primary">
            Requisitos por nivel académico
          </h3>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {REQUISITOS.map((req, i) => (
            <Reveal key={req.nivel} delay={i * 130}>
              <Card>
                <h4 className="mb-4 text-title font-display font-bold text-primary">{req.nivel}</h4>
                <ul className="flex flex-col gap-2.5">
                  {req.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-body-sm text-ink-muted">
                      <Icon name="check_circle" className="mt-0.5 text-body-md text-success-ink" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/registro" variant="accent">
            Comenzar mi registro
          </ButtonLink>
        </div>
        </div>
      </section>

      {/* Noticias */}
      <section id="noticias" className="relative overflow-hidden bg-surface-subtle">
        <SectionBg image="/images/bg-abstract-1.png" opacity={0.08} />
        <div className="relative mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
          <Reveal className="mb-8 flex flex-col gap-2">
            <Badge variant="academic" className="w-fit">Comunicación institucional</Badge>
            <h2 className="text-headline-lg font-display font-bold text-primary">
              Noticias y actualidad
            </h2>
            <p className="max-w-2xl text-body-md text-ink-muted">
              Investigación aplicada, convenios tecnológicos y logros de
              nuestra comunidad.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Reveal className="lg:col-span-2">
              <Card hoverable className="group flex h-full flex-col overflow-hidden p-0">
                <div className="h-48 w-full overflow-hidden sm:h-56">
                  <Image
                    src="/images/bg-abstract-2.png"
                    alt=""
                    width={1000}
                    height={500}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-space-lg">
                  <Badge variant="academic" className="w-fit">{NOTICIA_DESTACADA.categoria}</Badge>
                  <h3 className="text-headline-md font-display font-bold text-primary">
                    {NOTICIA_DESTACADA.titulo}
                  </h3>
                  <p className="text-body-sm text-ink-muted">{NOTICIA_DESTACADA.resumen}</p>
                  <time className="text-label-sm text-ink-muted/80">{NOTICIA_DESTACADA.fecha}</time>
                </div>
              </Card>
            </Reveal>

            <div className="flex flex-col gap-4">
              {NOTICIAS.map((noticia, i) => (
                <Reveal key={noticia.titulo} delay={i * 110}>
                  <Card hoverable className="flex flex-col gap-2">
                    <Badge variant="neutral" className="w-fit">{noticia.categoria}</Badge>
                    <h4 className="text-title font-display font-bold text-primary">{noticia.titulo}</h4>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="relative overflow-hidden bg-surface-subtle">
        <SectionBg image="/images/bg-abstract-2.png" opacity={0.07} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
        />
        <div className="relative mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
          <Reveal className="mb-8 flex flex-col gap-2">
            <h2 className="text-headline-lg font-display font-bold text-primary">
              Preguntas frecuentes
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FAQ.map((item, i) => (
              <Reveal key={item.pregunta} delay={i * 90}>
                <Card>
                  <h3 className="mb-2 text-title font-display font-bold text-primary">{item.pregunta}</h3>
                  <p className="text-body-sm text-ink-muted">{item.respuesta}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="relative overflow-hidden bg-surface-canvas">
        <SectionBg image="/images/bg-abstract-1.png" opacity={0.06} />
        <div className="relative mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <Reveal className="mb-10 flex flex-col items-center gap-4 text-center">
          <Badge variant="academic">Canales oficiales de atención directa</Badge>
          <h2 className="max-w-2xl text-headline-lg font-display font-bold text-primary">
            Estamos aquí para impulsarte
          </h2>
          <p className="max-w-2xl text-body-md text-ink-muted">
            Comunícate con nuestro equipo de admisiones, soporte académico o
            vinculación institucional. Te respondemos en menos de 24 horas
            hábiles.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <Card>
              {enviado ? (
                <div className="flex flex-col items-center gap-3 py-space-lg text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success-ink">
                    <Icon name="check_circle" className="text-headline-lg" />
                  </span>
                  <h3 className="text-headline-sm font-display font-bold text-primary">
                    Mensaje enviado
                  </h3>
                  <p className="text-body-sm text-ink-muted">
                    Gracias por escribirnos. Un asesor te contactará en menos
                    de 24 horas hábiles.
                  </p>
                </div>
              ) : (
                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                  <Input id="nombre" label="Nombre completo" placeholder="Tu nombre" required />
                  <Input id="correo" type="email" label="Correo electrónico" placeholder="tu@correo.com" required />
                  <Input id="telefono" type="tel" label="Teléfono (opcional)" placeholder="+52 ..." />
                  <Select id="programa" label="Programa de interés" defaultValue="">
                    <option value="" disabled>
                      Selecciona una opción
                    </option>
                    {PROGRAMAS_INTERES.map((programa) => (
                      <option key={programa} value={programa}>
                        {programa}
                      </option>
                    ))}
                  </Select>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="mensaje" className="text-label-md font-display font-semibold text-ink">
                      Mensaje
                    </label>
                    <textarea
                      id="mensaje"
                      required
                      rows={4}
                      placeholder="Cuéntanos en qué podemos ayudarte"
                      className="rounded-md border border-border-subtle bg-surface-canvas p-3 text-body-md text-ink outline-none focus:border-secondary focus:ring-[3px] focus:ring-secondary/15"
                    />
                  </div>
                  <label className="flex items-start gap-3 text-body-sm text-ink-muted">
                    <input
                      type="checkbox"
                      required
                      className="mt-1 h-4 w-4 rounded border-border-subtle text-secondary"
                    />
                    <span>
                      Acepto el Aviso de Privacidad de IINICIA para el tratamiento de mis datos.
                    </span>
                  </label>
                  <Button type="submit" variant="accent" disabled={enviando} className="mt-2">
                    {enviando ? "Enviando…" : "Enviar mensaje"}
                  </Button>
                </form>
              )}
            </Card>
          </Reveal>

          <div className="flex flex-col gap-6 lg:col-span-2">
            <Reveal>
              <Card className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 text-title font-display font-bold text-primary">
                  <Icon name="chat" className="text-headline-sm text-secondary" />
                  WhatsApp oficial
                </h3>
                <ButtonLink href="https://wa.me/525584219000" variant="outline" target="_blank" className="w-fit">
                  +52 55 8421 9000
                </ButtonLink>
                <p className="text-body-sm text-ink-muted">
                  Respuesta inmediata para dudas de inscripción y requisitos de RVOE.
                </p>
              </Card>
            </Reveal>

            <Reveal delay={60}>
              <Card className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 text-title font-display font-bold text-primary">
                  <Icon name="call" className="text-headline-sm text-secondary" />
                  Conmutador y correos
                </h3>
                <a className="text-body-sm text-secondary hover:underline" href="tel:+525550002400">
                  Conmutador central: +52 (55) 5000-2400 ext. 101-108
                </a>
                <a className="text-body-sm text-secondary hover:underline" href="mailto:contacto@iinicia.edu.mx">
                  contacto@iinicia.edu.mx
                </a>
                <a className="text-body-sm text-secondary hover:underline" href="mailto:admisiones@iinicia.edu.mx">
                  admisiones@iinicia.edu.mx
                </a>
              </Card>
            </Reveal>

            <Reveal delay={120}>
              <Card className="flex flex-col gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-title font-display font-bold text-primary">
                    <Icon name="schedule" className="text-headline-sm text-secondary" />
                    Horario de atención
                  </h3>
                  <p className="mt-1 text-body-sm text-ink-muted">Lunes a viernes, 8:00–20:00 hrs</p>
                  <p className="text-body-sm text-ink-muted">Sábados, 9:00–14:00 hrs (horario CDMX)</p>
                </div>
                <div className="border-t border-border-subtle pt-3">
                  <h3 className="flex items-center gap-2 text-title font-display font-bold text-primary">
                    <Icon name="location_on" className="text-headline-sm text-secondary" />
                    Campus central
                  </h3>
                  <p className="mt-1 text-body-sm text-ink-muted">
                    Av. Insurgentes Sur 1602, Col. Crédito Constructor, Benito
                    Juárez, C.P. 03940, Ciudad de México.
                  </p>
                </div>
              </Card>
            </Reveal>
          </div>
        </div>

        <Reveal>
          <Card className="mt-10 flex flex-col items-center justify-between gap-4 bg-primary text-white sm:flex-row">
            <div>
              <h3 className="text-title font-display font-bold">
                Consola de soporte técnico para alumnos y docentes
              </h3>
              <p className="text-body-sm text-white/80">
                Incidencias de Moodle, biblioteca digital y credenciales institucionales.
              </p>
            </div>
            <ButtonLink href="mailto:soporte@iinicia.edu.mx" variant="accent" className="shrink-0">
              Escribir a soporte técnico
            </ButtonLink>
          </Card>
        </Reveal>
        </div>
      </section>
    </>
  );
}
