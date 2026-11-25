import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConAuth, sembrarSesion } from "@/test-utils/auth";
import * as api from "@/lib/api";
import AdminProgramasPage from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const ADMIN = { id: "u1", nombre: "Admin", correo: "admin@correo.com", rol: "admin_academico" as const };
const COORDINADOR = { id: "u2", nombre: "Coord", correo: "coord@correo.com", rol: "coordinador" as const };
const ESTUDIANTE = { id: "u3", nombre: "Est", correo: "est@correo.com", rol: "estudiante" as const };

const PROGRAMA = {
  id: "lic-software-ia",
  tipo: "licenciatura" as const,
  nombre: "Ingeniería de Software e IA",
  descripcion: "d",
  duracion: "12 cuatrimestres",
  modalidad: "en_linea" as const,
  moodleCourseShortname: "IINICIA101",
};

describe("AdminProgramasPage", () => {
  beforeEach(() => {
    replace.mockClear();
    window.localStorage.clear();
    vi.spyOn(api, "obtenerProgramas").mockResolvedValue([PROGRAMA]);
  });

  it("rol sin acceso (estudiante): redirige fuera del panel", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ESTUDIANTE });
    render(
      <ConAuth>
        <AdminProgramasPage />
      </ConAuth>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/mi-iinicia"));
  });

  it("admin_academico: ve la tabla y puede crear un programa", async () => {
    const crearSpy = vi.spyOn(api, "crearPrograma").mockResolvedValue({
      ...PROGRAMA,
      id: "lic-mercadotecnia-digital",
      nombre: "Mercadotecnia Digital",
    });
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });

    render(
      <ConAuth>
        <AdminProgramasPage />
      </ConAuth>,
    );
    expect(await screen.findByText("Ingeniería de Software e IA")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Id (slug único)"), "lic-mercadotecnia-digital");
    await userEvent.type(screen.getByLabelText("Nombre"), "Mercadotecnia Digital");
    await userEvent.type(screen.getByLabelText("Duración"), "9 cuatrimestres");
    await userEvent.type(screen.getByLabelText("Descripción"), "d");
    await userEvent.click(screen.getByRole("button", { name: "Crear programa" }));

    await waitFor(() => expect(crearSpy).toHaveBeenCalled());
    expect(await screen.findByText("Mercadotecnia Digital")).toBeInTheDocument();
  });

  it("coordinador: ve la tabla en solo lectura (sin botón de crear ni de guardar)", async () => {
    sembrarSesion({ token: "jwt-x", usuario: COORDINADOR });

    render(
      <ConAuth>
        <AdminProgramasPage />
      </ConAuth>,
    );
    expect(await screen.findByText("Ingeniería de Software e IA")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crear programa" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
  });

  it("al crear sin llenar campos, muestra el error de validación sin llamar al backend", async () => {
    const crearSpy = vi.spyOn(api, "crearPrograma");
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });

    render(
      <ConAuth>
        <AdminProgramasPage />
      </ConAuth>,
    );
    await screen.findByText("Ingeniería de Software e IA");
    await userEvent.click(screen.getByRole("button", { name: "Crear programa" }));

    expect(await screen.findByText("Completa todos los campos.")).toBeInTheDocument();
    expect(crearSpy).not.toHaveBeenCalled();
  });
});
