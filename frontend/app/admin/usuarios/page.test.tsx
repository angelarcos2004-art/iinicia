import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConAuth, sembrarSesion } from "@/test-utils/auth";
import * as api from "@/lib/api";
import type { UsuarioListado } from "@/lib/types";
import AdminUsuariosPage from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const ADMIN = { id: "u1", nombre: "Admin", correo: "admin@correo.com", rol: "admin_academico" as const };
const ESTUDIANTE_SESION = { id: "u9", nombre: "Est", correo: "est@correo.com", rol: "estudiante" as const };

const ASPIRANTE: UsuarioListado = {
  id: "u2",
  nombre: "Luis Soto",
  correo: "luis@correo.com",
  rol: "aspirante",
  moodleUserId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  programaInteresNombre: "Ingeniería de Software e IA",
  programaCoordinadoId: null,
  programaCoordinadoNombre: null,
};

describe("AdminUsuariosPage", () => {
  beforeEach(() => {
    replace.mockClear();
    window.localStorage.clear();
    vi.spyOn(api, "obtenerProgramas").mockResolvedValue([]);
    vi.spyOn(api, "obtenerCursosMoodle").mockResolvedValue([
      { id: 2, shortname: "IINICIA101", fullname: "Inducción General IINICIA" },
    ]);
  });

  it("rol sin acceso (estudiante): redirige fuera del panel", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ESTUDIANTE_SESION });
    vi.spyOn(api, "obtenerUsuarios").mockResolvedValue([]);
    render(
      <ConAuth>
        <AdminUsuariosPage />
      </ConAuth>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/mi-iinicia"));
  });

  it("admin_academico: lista a los usuarios con su rol y programa de interés", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });
    vi.spyOn(api, "obtenerUsuarios").mockResolvedValue([ASPIRANTE]);

    render(
      <ConAuth>
        <AdminUsuariosPage />
      </ConAuth>,
    );

    const tabla = await screen.findByRole("table");
    expect(within(tabla).getByText("Luis Soto")).toBeInTheDocument();
    expect(within(tabla).getByText("Ingeniería de Software e IA")).toBeInTheDocument();
  });

  it("cambia el rol de un usuario", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });
    vi.spyOn(api, "obtenerUsuarios").mockResolvedValue([ASPIRANTE]);
    const cambiarSpy = vi
      .spyOn(api, "actualizarRolUsuario")
      .mockResolvedValue({ ...ASPIRANTE, rol: "estudiante" });

    render(
      <ConAuth>
        <AdminUsuariosPage />
      </ConAuth>,
    );
    await screen.findByRole("table");

    await userEvent.selectOptions(screen.getByLabelText("Cambiar rol de Luis Soto"), "estudiante");

    await waitFor(() => expect(cambiarSpy).toHaveBeenCalledWith("jwt-x", "u2", "estudiante"));
  });

  it("matricula a un aspirante en un curso de Moodle (lista real, no texto libre)", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });
    vi.spyOn(api, "obtenerUsuarios").mockResolvedValue([ASPIRANTE]);
    const matricularSpy = vi
      .spyOn(api, "asignarCursoUsuario")
      .mockResolvedValue({ ...ASPIRANTE, moodleUserId: 42 });

    render(
      <ConAuth>
        <AdminUsuariosPage />
      </ConAuth>,
    );
    await screen.findByRole("table");

    await userEvent.click(screen.getByRole("button", { name: "Matricular" }));
    const selectCurso = await screen.findByLabelText("Curso de Moodle");
    await userEvent.selectOptions(selectCurso, "IINICIA101");
    await userEvent.click(screen.getByRole("button", { name: "Matricular" }));

    await waitFor(() =>
      expect(matricularSpy).toHaveBeenCalledWith("jwt-x", "u2", "IINICIA101"),
    );
    expect(await screen.findByText(/Matriculado en "IINICIA101"/)).toBeInTheDocument();
  });

  it("envía una notificación a un usuario", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });
    vi.spyOn(api, "obtenerUsuarios").mockResolvedValue([ASPIRANTE]);
    const notificarSpy = vi.spyOn(api, "enviarNotificacion").mockResolvedValue(undefined);

    render(
      <ConAuth>
        <AdminUsuariosPage />
      </ConAuth>,
    );
    await screen.findByRole("table");

    await userEvent.click(screen.getByRole("button", { name: "Notificar" }));
    await userEvent.type(screen.getByLabelText("Título"), "Aviso");
    await userEvent.type(screen.getByLabelText("Mensaje"), "Tu documento fue aprobado.");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() =>
      expect(notificarSpy).toHaveBeenCalledWith("jwt-x", "u2", {
        titulo: "Aviso",
        mensaje: "Tu documento fue aprobado.",
        cursoId: undefined,
      }),
    );
    expect(await screen.findByText("Notificación enviada.")).toBeInTheDocument();
  });

  it("si falla enviar la notificación, muestra el error en vez de 'enviada'", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });
    vi.spyOn(api, "obtenerUsuarios").mockResolvedValue([ASPIRANTE]);
    vi.spyOn(api, "enviarNotificacion").mockRejectedValue(
      new api.ApiError("Este usuario no tiene un dispositivo registrado.", 400),
    );

    render(
      <ConAuth>
        <AdminUsuariosPage />
      </ConAuth>,
    );
    await screen.findByRole("table");

    await userEvent.click(screen.getByRole("button", { name: "Notificar" }));
    await userEvent.type(screen.getByLabelText("Título"), "Aviso");
    await userEvent.type(screen.getByLabelText("Mensaje"), "Mensaje");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(
      await screen.findByText("Este usuario no tiene un dispositivo registrado."),
    ).toBeInTheDocument();
  });

  it("filtra la lista por rol (vuelve a pedir el catálogo con ese filtro)", async () => {
    sembrarSesion({ token: "jwt-x", usuario: ADMIN });
    const obtenerSpy = vi.spyOn(api, "obtenerUsuarios").mockResolvedValue([ASPIRANTE]);

    render(
      <ConAuth>
        <AdminUsuariosPage />
      </ConAuth>,
    );
    await screen.findByRole("table");

    await userEvent.selectOptions(screen.getByLabelText("Filtrar por rol"), "aspirante");

    await waitFor(() => expect(obtenerSpy).toHaveBeenLastCalledWith("jwt-x", "aspirante"));
  });
});
