import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConAuth, sembrarSesion } from "@/test-utils/auth";
import * as api from "@/lib/api";
import AdminMateriasPage from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const ADMIN = { id: "u1", nombre: "Admin", correo: "admin@correo.com", rol: "admin_academico" as const };
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

const MATERIA_BASE = {
  id: "soft-induccion",
  programaId: "lic-software-ia",
  nombre: "Inducción a la Licenciatura",
  moodleCourseShortname: "IINICIA101",
  prerequisitos: [] as string[],
};

describe("AdminMateriasPage", () => {
  beforeEach(() => {
    replace.mockClear();
    window.localStorage.clear();
    vi.spyOn(api, "obtenerProgramas").mockResolvedValue([PROGRAMA]);
    vi.spyOn(api, "obtenerMaterias").mockResolvedValue([MATERIA_BASE]);
  });

  it("rol sin acceso (estudiante): redirige fuera del panel", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ESTUDIANTE });
    render(
      <ConAuth>
        <AdminMateriasPage />
      </ConAuth>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/mi-iinicia"));
  });

  it("admin_academico: ve las materias de la carrera seleccionada", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });
    render(
      <ConAuth>
        <AdminMateriasPage />
      </ConAuth>,
    );
    const tabla = await screen.findByRole("table");
    expect(within(tabla).getByText("Inducción a la Licenciatura")).toBeInTheDocument();
    expect(within(tabla).getByText("IINICIA101")).toBeInTheDocument();
  });

  it("crea una materia nueva con prerequisitos", async () => {
    const crearSpy = vi.spyOn(api, "crearMateria").mockResolvedValue({
      id: "soft-fundamentos-ia",
      programaId: "lic-software-ia",
      nombre: "Fundamentos de IA",
      moodleCourseShortname: "IINICIA-SOFT1",
      prerequisitos: ["soft-induccion"],
    });
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });

    render(
      <ConAuth>
        <AdminMateriasPage />
      </ConAuth>,
    );
    await screen.findByRole("table");

    await userEvent.type(screen.getByLabelText("Id (slug único)"), "soft-fundamentos-ia");
    await userEvent.type(screen.getByLabelText("Nombre"), "Fundamentos de IA");
    await userEvent.type(screen.getByLabelText("Curso de Moodle (shortname)"), "IINICIA-SOFT1");
    await userEvent.click(screen.getByLabelText("Inducción a la Licenciatura"));
    await userEvent.click(screen.getByRole("button", { name: "Crear materia" }));

    await waitFor(() =>
      expect(crearSpy).toHaveBeenCalledWith(
        "jwt-x",
        expect.objectContaining({ id: "soft-fundamentos-ia", prerequisitos: ["soft-induccion"] }),
      ),
    );
    await waitFor(() =>
      expect(within(screen.getByRole("table")).getByText("Fundamentos de IA")).toBeInTheDocument(),
    );
  });

  it("al crear sin completar campos, muestra el error sin llamar al backend", async () => {
    const crearSpy = vi.spyOn(api, "crearMateria");
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });
    render(
      <ConAuth>
        <AdminMateriasPage />
      </ConAuth>,
    );
    await screen.findByRole("table");

    await userEvent.click(screen.getByRole("button", { name: "Crear materia" }));

    expect(await screen.findByText("Completa id, nombre y curso de Moodle.")).toBeInTheDocument();
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it("borrar materia pide confirmación y, si se confirma, la quita de la tabla", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const eliminarSpy = vi.spyOn(api, "eliminarMateria").mockResolvedValue(undefined);
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });

    render(
      <ConAuth>
        <AdminMateriasPage />
      </ConAuth>,
    );
    await screen.findByRole("table");

    await userEvent.click(screen.getByRole("button", { name: "Borrar" }));

    await waitFor(() => expect(eliminarSpy).toHaveBeenCalledWith("jwt-x", "soft-induccion"));
    await waitFor(() =>
      expect(screen.queryByText("Esta carrera todavía no tiene materias registradas.")).toBeInTheDocument(),
    );
  });
});
