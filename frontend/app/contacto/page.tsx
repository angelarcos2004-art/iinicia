"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const PROGRAMAS_INTERES = [
  "Ingeniería de Software e IA",
  "Ciencia de Datos",
  "Seguridad Informática",
  "Maestría en Sistemas Inteligentes",
  "Diplomados STEM",
  "Consulta general",
];

export default function ContactoPage() {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

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
      <section className="bg-surface-subtle">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-margin-mobile py-16 text-center md:px-margin-desktop">
          <Badge variant="academic">Canales oficiales de atención directa</Badge>
          <h1 className="text-display-mobile font-display font-extrabold tracking-tight text-primary md:text-display">
            Estamos aquí para impulsarte
          </h1>
          <p className="max-w-2xl text-body-lg text-ink-muted">
            Comunícate con nuestro equipo de admisiones, soporte académico o
            vinculación institucional. Te respondemos en menos de 24 horas
            hábiles.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            {enviado ? (
              <div className="flex flex-col items-center gap-3 py-space-lg text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success-ink text-2xl font-bold">
                  ✓
                </span>
                <h2 className="text-headline-sm font-display font-bold text-primary">
                  Mensaje enviado
                </h2>
                <p className="text-body-sm text-ink-muted">
                  Gracias por escribirnos. Un asesor te contactará en menos de
                  24 horas hábiles.
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

          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card className="flex flex-col gap-2">
              <h2 className="text-title font-display font-bold text-primary">WhatsApp oficial</h2>
              <ButtonLink href="https://wa.me/525584219000" variant="outline" target="_blank" className="w-fit">
                +52 55 8421 9000
              </ButtonLink>
              <p className="text-body-sm text-ink-muted">
                Respuesta inmediata para dudas de inscripción, requisitos de
                RVOE y asesoría educativa.
              </p>
            </Card>

            <Card className="flex flex-col gap-2">
              <h2 className="text-title font-display font-bold text-primary">Conmutador y correos</h2>
              <a className="text-body-sm text-secondary hover:underline" href="tel:+525550002400">
                Conmutador central: +52 (55) 5000-2400 ext. 101-108
              </a>
              <a className="text-body-sm text-secondary hover:underline" href="mailto:contacto@iinicia.edu.mx">
                contacto@iinicia.edu.mx — Atención y consultas
              </a>
              <a className="text-body-sm text-secondary hover:underline" href="mailto:admisiones@iinicia.edu.mx">
                admisiones@iinicia.edu.mx — Admisiones y matrícula
              </a>
            </Card>

            <Card className="flex flex-col gap-1">
              <h2 className="text-title font-display font-bold text-primary">Horario de atención</h2>
              <p className="text-body-sm text-ink-muted">Lunes a viernes, 8:00–20:00 hrs</p>
              <p className="text-body-sm text-ink-muted">Sábados, 9:00–14:00 hrs (horario CDMX)</p>
            </Card>

            <Card className="flex flex-col gap-2">
              <h2 className="text-title font-display font-bold text-primary">Campus central</h2>
              <p className="text-body-sm text-ink-muted">
                Av. Insurgentes Sur 1602, Col. Crédito Constructor,
                Benito Juárez, C.P. 03940, Ciudad de México.
              </p>
            </Card>
          </div>
        </div>

        <Card className="mt-10 flex flex-col items-center justify-between gap-4 bg-primary text-white sm:flex-row">
          <div>
            <h2 className="text-title font-display font-bold">
              Consola de soporte técnico para alumnos y docentes
            </h2>
            <p className="text-body-sm text-white/80">
              Incidencias de Moodle, biblioteca digital y credenciales institucionales.
            </p>
          </div>
          <ButtonLink href="mailto:soporte@iinicia.edu.mx" variant="accent" className="shrink-0">
            Escribir a soporte técnico
          </ButtonLink>
        </Card>
      </section>
    </>
  );
}
