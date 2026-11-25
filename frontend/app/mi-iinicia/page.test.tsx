import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConAuth, sembrarSesion } from "@/test-utils/auth";
import * as api from "@/lib/api";
import MiIiniciaPage from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const ESTUDIANTE = { id: "u1", nombre: "Ana Pérez", correo: "ana@correo.com", rol: "estudiante" as const };
const ASPIRANTE = { id: "u2", nombre: "Luis Soto", correo: "luis@correo.com", rol: "aspirante" as const };
const PROFESOR = { id: "u3", nombre: "Marco Villagómez", correo: "marco@correo.com", rol: "profesor" as const };
const ADMIN = { id: "u4", nombre: "Admin Académico", correo: "admin@correo.com", rol: "admin_academico" as const };

describe("MiIiniciaPage", () => {
  beforeEach(() => {
    replace.mockClear();
    window.localStorage.clear();
    vi.spyOn(api, "obtenerMisCursos").mockResolvedValue([]);
    vi.spyOn(api, "obtenerProximasActividades").mockResolvedValue([]);
  });

  it("sin sesión, redirige a /login", async () => {
    sembrarSesion(null);
    render(
      <ConAuth>
        <MiIiniciaPage />
      </ConAuth>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("estudiante: saluda por nombre y muestra sus cursos reales de Moodle", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ESTUDIANTE });
    vi.spyOn(api, "obtenerMisCursos").mockResolvedValue([
      { id: 2, nombre: "Fundamentos de IA", shortname: "IA1", progreso: 40 },
    ]);

    render(
      <ConAuth>
        <MiIiniciaPage />
      </ConAuth>,
    );

    expect(await screen.findByText(/Bienvenido de vuelta, Ana/)).toBeInTheDocument();
    expect(await screen.findByText("Fundamentos de IA")).toBeInTheDocument();
  });

  it("estudiante: si fallan los cursos, muestra el error en vez de '0 cursos'", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ESTUDIANTE });
    vi.spyOn(api, "obtenerMisCursos").mockRejectedValue(
      new api.ApiError("No se pudieron cargar tus cursos. Intenta más tarde.", 502),
    );

    render(
      <ConAuth>
        <MiIiniciaPage />
      </ConAuth>,
    );

    expect(await screen.findByText("No se pudieron cargar tus cursos. Intenta más tarde.")).toBeInTheDocument();
  });

  it("estudiante: un 401 cierra la sesión y redirige a /login (JWT expirado)", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ESTUDIANTE });
    vi.spyOn(api, "obtenerMisCursos").mockRejectedValue(new api.ApiError("Expirado", 401));

    render(
      <ConAuth>
        <MiIiniciaPage />
      </ConAuth>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(window.localStorage.getItem("iinicia.sesion")).toBeNull();
  });

  it("aspirante: muestra el seguimiento de su solicitud y sus documentos", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ASPIRANTE });
    vi.spyOn(api, "obtenerSolicitudAspirante").mockResolvedValue({
      programaNombre: "Ingeniería de Software e IA",
      estado: "en_revision",
      pasos: [
        { label: "Cuenta creada", completado: true },
        { label: "Documentos cargados", completado: false },
      ],
    });
    vi.spyOn(api, "obtenerMisDocumentos").mockResolvedValue([]);

    render(
      <ConAuth>
        <MiIiniciaPage />
      </ConAuth>,
    );

    expect(await screen.findByText("Ingeniería de Software e IA")).toBeInTheDocument();
    expect(screen.getByText("En revisión")).toBeInTheDocument();
    expect(screen.getByText("Cuenta creada")).toBeInTheDocument();
  });

  it("profesor: ve sus cursos (sin progreso) y puede notificar a sus estudiantes", async () => {
    sembrarSesion({ token: "jwt-x", usuario: PROFESOR });
    vi.spyOn(api, "obtenerMisCursos").mockResolvedValue([
      { id: 2, nombre: "Fundamentos de IA", shortname: "IA1", progreso: null },
    ]);
    vi.spyOn(api, "obtenerMisEstudiantes").mockResolvedValue([
      { id: "e1", nombre: "Luis Soto", correo: "luis@correo.com", cursos: ["Fundamentos de IA"], tieneDispositivo: true },
    ]);
    const notificarSpy = vi.spyOn(api, "enviarNotificacion").mockResolvedValue(undefined);

    render(
      <ConAuth>
        <MiIiniciaPage />
      </ConAuth>,
    );

    expect(await screen.findByText("Mis cursos como profesor")).toBeInTheDocument();
    expect(screen.getAllByText("Fundamentos de IA").length).toBeGreaterThan(0);
    expect(await screen.findByText("Luis Soto")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Notificar" }));
    await userEvent.type(screen.getByLabelText("Título"), "Aviso");
    await userEvent.type(screen.getByLabelText("Mensaje"), "Tu tarea está casi vencida.");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() =>
      expect(notificarSpy).toHaveBeenCalledWith("jwt-x", "e1", {
        titulo: "Aviso",
        mensaje: "Tu tarea está casi vencida.",
      }),
    );
    expect(await screen.findByText("Notificación enviada.")).toBeInTheDocument();
  });

  it("admin_academico: ve el resumen institucional con enlaces para administrar", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });
    vi.spyOn(api, "obtenerUsuarios").mockResolvedValue([
      { ...ESTUDIANTE, moodleUserId: 1, createdAt: "2026-01-01T00:00:00.000Z", programaInteresNombre: null, programaCoordinadoId: null, programaCoordinadoNombre: null },
      { ...ASPIRANTE, moodleUserId: null, createdAt: "2026-01-02T00:00:00.000Z", programaInteresNombre: "Ingeniería de Software e IA", programaCoordinadoId: null, programaCoordinadoNombre: null },
    ]);

    render(
      <ConAuth>
        <MiIiniciaPage />
      </ConAuth>,
    );

    expect(await screen.findByText("Usuarios totales")).toBeInTheDocument();
    expect(screen.getByText("Usuarios por rol")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Administrar usuarios" })).toHaveAttribute(
      "href",
      "/admin/usuarios",
    );
    expect(screen.getByRole("link", { name: "Administrar programas" })).toHaveAttribute(
      "href",
      "/admin/programas",
    );
  });
});
