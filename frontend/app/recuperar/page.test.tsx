import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "@/lib/api";
import RecuperarPage from "./page";

describe("RecuperarPage", () => {
  it("rechaza un correo con formato inválido sin llamar al backend", async () => {
    const spy = vi.spyOn(api, "recuperarPassword");
    render(<RecuperarPage />);

    await userEvent.type(screen.getByLabelText(/Correo institucional/), "no-es-correo");
    await userEvent.click(screen.getByRole("button", { name: "Enviar enlace de recuperación" }));

    expect(await screen.findByText("Ingresa un correo electrónico válido.")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("con un correo válido, muestra el mensaje genérico (sin confirmar si existe la cuenta)", async () => {
    vi.spyOn(api, "recuperarPassword").mockResolvedValue(undefined);
    render(<RecuperarPage />);

    await userEvent.type(screen.getByLabelText(/Correo institucional/), "ana@correo.com");
    await userEvent.click(screen.getByRole("button", { name: "Enviar enlace de recuperación" }));

    expect(
      await screen.findByText(/Si ese correo está registrado en IINICIA/),
    ).toBeInTheDocument();
  });

  it("si el backend falla con un error real, lo muestra en vez del mensaje genérico", async () => {
    vi.spyOn(api, "recuperarPassword").mockRejectedValue(
      new api.ApiError("Demasiadas solicitudes, intenta más tarde", 429),
    );
    render(<RecuperarPage />);

    await userEvent.type(screen.getByLabelText(/Correo institucional/), "ana@correo.com");
    await userEvent.click(screen.getByRole("button", { name: "Enviar enlace de recuperación" }));

    expect(await screen.findByText("Demasiadas solicitudes, intenta más tarde")).toBeInTheDocument();
  });
});
