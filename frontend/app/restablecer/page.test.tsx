import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "@/lib/api";
import RestablecerPage from "./page";

const push = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

describe("RestablecerPage", () => {
  beforeEach(() => {
    push.mockClear();
    searchParams = new URLSearchParams({ correo: "ana@correo.com", token: "tok-123" });
  });

  it("sin correo/token en la url, muestra 'Enlace inválido'", () => {
    searchParams = new URLSearchParams();
    render(<RestablecerPage />);
    expect(screen.getByText("Enlace inválido")).toBeInTheDocument();
  });

  it("valida la contraseña nueva (mínimo 8 caracteres) y que coincida con la confirmación", async () => {
    render(<RestablecerPage />);

    await userEvent.type(screen.getByLabelText("Nueva contraseña"), "corta");
    await userEvent.type(screen.getByLabelText("Confirma la nueva contraseña"), "otra-cosa");
    await userEvent.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));

    expect(
      await screen.findByText("La contraseña debe tener al menos 8 caracteres."),
    ).toBeInTheDocument();
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
  });

  it("con datos válidos, restablece la contraseña y navega a /login", async () => {
    const spy = vi.spyOn(api, "restablecerPassword").mockResolvedValue(undefined);
    render(<RestablecerPage />);

    await userEvent.type(screen.getByLabelText("Nueva contraseña"), "NuevaSegura123");
    await userEvent.type(screen.getByLabelText("Confirma la nueva contraseña"), "NuevaSegura123");
    await userEvent.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(spy).toHaveBeenCalledWith({
      correo: "ana@correo.com",
      token: "tok-123",
      nuevaPassword: "NuevaSegura123",
    });
  });

  it("si el token venció o es inválido, muestra el error del backend", async () => {
    vi.spyOn(api, "restablecerPassword").mockRejectedValue(
      new api.ApiError("El enlace de recuperación ya venció", 400),
    );
    render(<RestablecerPage />);

    await userEvent.type(screen.getByLabelText("Nueva contraseña"), "NuevaSegura123");
    await userEvent.type(screen.getByLabelText("Confirma la nueva contraseña"), "NuevaSegura123");
    await userEvent.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));

    expect(await screen.findByText("El enlace de recuperación ya venció")).toBeInTheDocument();
  });
});
