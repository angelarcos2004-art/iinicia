import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConAuth } from "@/test-utils/auth";
import * as api from "@/lib/api";
import LoginPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("LoginPage", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
  });

  it("valida correo y contraseña antes de enviar (no llama al backend)", async () => {
    const loginSpy = vi.spyOn(api, "login");
    render(
      <ConAuth>
        <LoginPage />
      </ConAuth>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Ingresa un correo electrónico válido.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tu contraseña.")).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("con credenciales válidas, pasa al paso del código de verificación", async () => {
    vi.spyOn(api, "login").mockResolvedValue({ correo: "ana@correo.com", mensaje: "Enviamos un código" });

    render(
      <ConAuth>
        <LoginPage />
      </ConAuth>,
    );
    await userEvent.type(screen.getByLabelText(/Correo institucional/), "ana@correo.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Secreto123");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByLabelText("Código de verificación")).toBeInTheDocument();
    expect(screen.getByText(/ana@correo.com/)).toBeInTheDocument();
  });

  it("si el primer factor falla, muestra el error y no avanza de paso", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new api.ApiError("Correo o contraseña incorrectos", 401));

    render(
      <ConAuth>
        <LoginPage />
      </ConAuth>,
    );
    await userEvent.type(screen.getByLabelText(/Correo institucional/), "ana@correo.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Secreto123");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Correo o contraseña incorrectos")).toBeInTheDocument();
    expect(screen.queryByLabelText("Código de verificación")).not.toBeInTheDocument();
  });

  it("con el código correcto, abre sesión y navega a Mi IINICIA", async () => {
    vi.spyOn(api, "login").mockResolvedValue({ correo: "ana@correo.com", mensaje: "ok" });
    vi.spyOn(api, "verificarCodigo2FA").mockResolvedValue({
      token: "jwt-x",
      usuario: { id: "u1", nombre: "Ana", correo: "ana@correo.com", rol: "aspirante" },
    });

    render(
      <ConAuth>
        <LoginPage />
      </ConAuth>,
    );
    await userEvent.type(screen.getByLabelText(/Correo institucional/), "ana@correo.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Secreto123");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await userEvent.type(await screen.findByLabelText("Código de verificación"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Verificar" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/mi-iinicia"));
    expect(window.localStorage.getItem("iinicia.sesion")).toContain("jwt-x");
  });

  it('"Volver" regresa al paso 1 y limpia el código', async () => {
    vi.spyOn(api, "login").mockResolvedValue({ correo: "ana@correo.com", mensaje: "ok" });

    render(
      <ConAuth>
        <LoginPage />
      </ConAuth>,
    );
    await userEvent.type(screen.getByLabelText(/Correo institucional/), "ana@correo.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Secreto123");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await screen.findByLabelText("Código de verificación");

    await userEvent.click(screen.getByRole("button", { name: "Volver" }));

    expect(screen.getByLabelText(/Correo institucional/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Código de verificación")).not.toBeInTheDocument();
  });
});
