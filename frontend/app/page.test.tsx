import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "@/lib/api";
import { MOCK_PROGRAMAS } from "@/lib/mock-data";
import HomePage from "./page";

describe("HomePage", () => {
  beforeEach(() => {
    vi.spyOn(api, "obtenerProgramas").mockResolvedValue(MOCK_PROGRAMAS);
  });

  it("muestra el catálogo de programas (del mock mientras carga, o del backend)", async () => {
    render(<HomePage />);
    const oferta = document.getElementById("oferta-academica")!;
    expect(within(oferta).getByText(MOCK_PROGRAMAS[0].nombre)).toBeInTheDocument();
  });

  it("filtra la oferta académica por tipo de programa", async () => {
    render(<HomePage />);
    const oferta = document.getElementById("oferta-academica")!;

    const filtroLicenciaturas = within(oferta).getByRole("button", { name: "Licenciaturas" });
    await userEvent.click(filtroLicenciaturas);

    const nombresVisibles = within(oferta)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    const todasLicenciatura = MOCK_PROGRAMAS.filter((p) => p.tipo === "licenciatura").every((p) =>
      nombresVisibles.includes(p.nombre),
    );
    const algunaNoLicenciatura = MOCK_PROGRAMAS.some(
      (p) => p.tipo !== "licenciatura" && nombresVisibles.includes(p.nombre),
    );
    expect(todasLicenciatura).toBe(true);
    expect(algunaNoLicenciatura).toBe(false);
  });

  it("valida el formulario de contacto (campos requeridos nativos) antes de 'enviar'", async () => {
    render(<HomePage />);
    const contacto = document.getElementById("contacto")!;
    const boton = within(contacto).getByRole("button", { name: "Enviar mensaje" });

    // Sin llenar nada, el submit nativo (campos required) no debe disparar el estado "enviando".
    await userEvent.click(boton);
    expect(within(contacto).queryByText("Enviando…")).not.toBeInTheDocument();
    expect(within(contacto).queryByText("Mensaje enviado")).not.toBeInTheDocument();
  });

  it("con el formulario de contacto completo, simula el envío y muestra el mensaje de éxito", async () => {
    render(<HomePage />);
    const contacto = document.getElementById("contacto")!;

    await userEvent.type(within(contacto).getByLabelText("Nombre completo"), "Ana Pérez");
    await userEvent.type(within(contacto).getByLabelText("Correo electrónico"), "ana@correo.com");
    await userEvent.selectOptions(
      within(contacto).getByLabelText("Programa de interés"),
      "Ciencia de Datos",
    );
    await userEvent.type(within(contacto).getByLabelText("Mensaje"), "Quisiera más información.");
    await userEvent.click(within(contacto).getByLabelText(/Acepto el Aviso de Privacidad/));
    await userEvent.click(within(contacto).getByRole("button", { name: "Enviar mensaje" }));

    expect(await within(contacto).findByText("Mensaje enviado")).toBeInTheDocument();
  });
});
