import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConAuth } from "@/test-utils/auth";
import * as api from "@/lib/api";
import RegistroPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const PROGRAMA = {
  id: "lic-software-ia",
  tipo: "licenciatura" as const,
  nombre: "Ingeniería de Software e IA",
  descripcion: "d",
  duracion: "12 cuatrimestres",
  modalidad: "en_linea" as const,
  moodleCourseShortname: null,
};

describe("RegistroPage", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
    vi.spyOn(api, "obtenerProgramas").mockResolvedValue([PROGRAMA]);
  });

  it("carga el catálogo de programas en el selector", async () => {
    render(
      <ConAuth>
        <RegistroPage />
      </ConAuth>,
    );
    expect(await screen.findByText("Ingeniería de Software e IA")).toBeInTheDocument();
  });

  it("valida todos los campos requeridos antes de enviar", async () => {
    const spy = vi.spyOn(api, "registrarAspirante");
    render(
      <ConAuth>
        <RegistroPage />
      </ConAuth>,
    );
    await screen.findByText("Ingeniería de Software e IA");

    await userEvent.click(screen.getByRole("button", { name: "Crear mi cuenta" }));

    expect(await screen.findByText("Ingresa tu nombre completo.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa un correo electrónico válido.")).toBeInTheDocument();
    expect(screen.getByText("La contraseña debe tener al menos 8 caracteres.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona un programa de interés.")).toBeInTheDocument();
    expect(screen.getByText("Debes aceptar el Aviso de Privacidad.")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("rechaza si las contraseñas no coinciden", async () => {
    render(
      <ConAuth>
        <RegistroPage />
      </ConAuth>,
    );
    await screen.findByText("Ingeniería de Software e IA");
    await userEvent.type(screen.getByLabelText(/Contraseña$/), "Secreto123");
    await userEvent.type(screen.getByLabelText("Confirmar contraseña"), "Otra123456");
    await userEvent.click(screen.getByRole("button", { name: "Crear mi cuenta" }));

    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeInTheDocument();
  });

  it("con datos válidos, crea la cuenta, abre sesión y muestra el mensaje de éxito", async () => {
    vi.spyOn(api, "registrarAspirante").mockResolvedValue({
      token: "jwt-x",
      usuario: { id: "u1", nombre: "Valeria", correo: "valeria@correo.com", rol: "aspirante" },
    });

    render(
      <ConAuth>
        <RegistroPage />
      </ConAuth>,
    );
    await screen.findByText("Ingeniería de Software e IA");

    await userEvent.type(screen.getByLabelText(/Nombre completo/), "Valeria Mendoza");
    await userEvent.type(screen.getByLabelText(/Correo electrónico/), "valeria@correo.com");
    await userEvent.type(screen.getByLabelText(/Contraseña$/), "Secreto123");
    await userEvent.type(screen.getByLabelText("Confirmar contraseña"), "Secreto123");
    await userEvent.selectOptions(screen.getByLabelText("Programa de interés"), "lic-software-ia");
    await userEvent.click(screen.getByText(/Acepto el Aviso de Privacidad/));
    await userEvent.click(screen.getByRole("button", { name: "Crear mi cuenta" }));

    expect(await screen.findByText("¡Cuenta creada con éxito!")).toBeInTheDocument();
    expect(window.localStorage.getItem("iinicia.sesion")).toContain("jwt-x");
  });

  it("si el registro falla (p. ej. correo duplicado), muestra el error del backend", async () => {
    vi.spyOn(api, "registrarAspirante").mockRejectedValue(
      new api.ApiError("Ya existe una cuenta con ese correo", 400),
    );

    render(
      <ConAuth>
        <RegistroPage />
      </ConAuth>,
    );
    await screen.findByText("Ingeniería de Software e IA");
    await userEvent.type(screen.getByLabelText(/Nombre completo/), "Valeria Mendoza");
    await userEvent.type(screen.getByLabelText(/Correo electrónico/), "valeria@correo.com");
    await userEvent.type(screen.getByLabelText(/Contraseña$/), "Secreto123");
    await userEvent.type(screen.getByLabelText("Confirmar contraseña"), "Secreto123");
    await userEvent.selectOptions(screen.getByLabelText("Programa de interés"), "lic-software-ia");
    await userEvent.click(screen.getByText(/Acepto el Aviso de Privacidad/));
    await userEvent.click(screen.getByRole("button", { name: "Crear mi cuenta" }));

    expect(await screen.findByText("Ya existe una cuenta con ese correo")).toBeInTheDocument();
  });
});
