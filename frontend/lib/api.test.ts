import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const API_URL = "http://backend.test";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("lib/api", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("login envía correo/password a POST /auth/login y devuelve la respuesta de 2FA", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ correo: "ana@correo.com", mensaje: "Enviamos un código" }),
    );
    const { login } = await import("./api");

    const res = await login({ correo: "ana@correo.com", password: "secreto123" });

    expect(res).toEqual({ correo: "ana@correo.com", mensaje: "Enviamos un código" });
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/login`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ correo: "ana@correo.com", password: "secreto123" }),
      }),
    );
  });

  it("verificarCodigo2FA envía correo/código a POST /auth/login/verificar", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ token: "jwt-x", usuario: { id: "u1", nombre: "Ana", correo: "ana@correo.com", rol: "aspirante" } }),
    );
    const { verificarCodigo2FA } = await import("./api");

    const res = await verificarCodigo2FA("ana@correo.com", "123456");

    expect(res.token).toBe("jwt-x");
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/login/verificar`,
      expect.objectContaining({
        body: JSON.stringify({ correo: "ana@correo.com", codigo: "123456" }),
      }),
    );
  });

  it("si el backend responde con error, lanza ApiError con el mensaje del body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ message: "Correo o contraseña incorrectos" }, 401),
    );
    const { login, ApiError } = await import("./api");

    const error: unknown = await login({ correo: "ana@correo.com", password: "mala" }).catch(
      (e) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Correo o contraseña incorrectos", status: 401 });
  });

  it("si fetch falla (sin red), lanza BackendUnavailableError", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("fetch failed"));
    const { login, BackendUnavailableError } = await import("./api");

    await expect(login({ correo: "ana@correo.com", password: "x" })).rejects.toBeInstanceOf(
      BackendUnavailableError,
    );
  });

  it("obtenerProgramas cae al catálogo mock si NEXT_PUBLIC_API_URL no está configurado", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const { obtenerProgramas } = await import("./api");
    const { MOCK_PROGRAMAS } = await import("./mock-data");

    const programas = await obtenerProgramas();

    expect(programas).toEqual(MOCK_PROGRAMAS);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("obtenerProgramas no cae al mock si el backend respondió pero con error (p. ej. 500)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "boom" }, 500));
    const { obtenerProgramas, ApiError } = await import("./api");

    await expect(obtenerProgramas()).rejects.toBeInstanceOf(ApiError);
  });

  it("registrarAspirante envía el formulario completo a POST /auth/registro", async () => {
    const input = {
      nombreCompleto: "Ana Pérez",
      correo: "ana@correo.com",
      password: "secreto123",
      programaInteresId: "lic-software-ia",
      aceptaAvisoPrivacidad: true,
      deseaInformacionBecas: false,
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ token: "jwt-x", usuario: { id: "u1", nombre: "Ana", correo: "ana@correo.com", rol: "aspirante" } }),
    );
    const { registrarAspirante } = await import("./api");

    const res = await registrarAspirante(input);

    expect(res.token).toBe("jwt-x");
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/registro`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
  });

  it("crearPrograma manda el id junto con el resto de los datos a POST /programas, con Authorization", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: "lic-x", nombre: "X" }));
    const { crearPrograma } = await import("./api");

    await crearPrograma("jwt-x", "lic-x", { nombre: "X" } as never);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/programas`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer jwt-x" }),
        body: JSON.stringify({ id: "lic-x", nombre: "X" }),
      }),
    );
  });

  it("actualizarPrograma manda PATCH /programas/:id con solo los campos dados", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: "lic-x" }));
    const { actualizarPrograma } = await import("./api");

    await actualizarPrograma("jwt-x", "lic-x", { moodleCourseShortname: "IINICIA101" });

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/programas/lic-x`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ moodleCourseShortname: "IINICIA101" }),
      }),
    );
  });

  it("obtenerMaterias sin programaId no agrega query string", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));
    const { obtenerMaterias } = await import("./api");

    await obtenerMaterias("jwt-x");

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/materias`, expect.anything());
  });

  it("obtenerMaterias con programaId lo agrega como query codificado", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));
    const { obtenerMaterias } = await import("./api");

    await obtenerMaterias("jwt-x", "lic-software-ia");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/materias?programaId=lic-software-ia`,
      expect.anything(),
    );
  });

  it("crearMateria manda el input completo (incluidos prerequisitos) a POST /materias", async () => {
    const input = {
      id: "calculo-2",
      programaId: "lic-software-ia",
      nombre: "Cálculo II",
      moodleCourseShortname: "CALCULO2",
      prerequisitos: ["calculo-1"],
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(input));
    const { crearMateria } = await import("./api");

    await crearMateria("jwt-x", input);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/materias`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
  });

  it("actualizarMateria manda PATCH /materias/:id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: "calculo-1" }));
    const { actualizarMateria } = await import("./api");

    await actualizarMateria("jwt-x", "calculo-1", { nombre: "Cálculo I (nuevo)" });

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/materias/calculo-1`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ nombre: "Cálculo I (nuevo)" }) }),
    );
  });

  it("eliminarMateria manda DELETE /materias/:id con Authorization, sin body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { eliminarMateria } = await import("./api");

    await eliminarMateria("jwt-x", "calculo-1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/materias/calculo-1`,
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer jwt-x" },
      }),
    );
  });

  it("eliminarMateria propaga el error si el backend rechaza el borrado (p. ej. 400)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ message: "Otra materia la tiene como prerequisito" }, 400),
    );
    const { eliminarMateria, ApiError } = await import("./api");

    await expect(eliminarMateria("jwt-x", "calculo-1")).rejects.toBeInstanceOf(ApiError);
  });

  it("recuperarPassword manda el correo a POST /auth/recuperar", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ mensaje: "ok" }));
    const { recuperarPassword } = await import("./api");

    await recuperarPassword("ana@correo.com");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/recuperar`,
      expect.objectContaining({ body: JSON.stringify({ correo: "ana@correo.com" }) }),
    );
  });

  it("restablecerPassword manda correo/token/nuevaPassword a POST /auth/restablecer", async () => {
    const input = { correo: "ana@correo.com", token: "tok-123", nuevaPassword: "NuevaSegura123" };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ mensaje: "ok" }));
    const { restablecerPassword } = await import("./api");

    await restablecerPassword(input);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/restablecer`,
      expect.objectContaining({ body: JSON.stringify(input) }),
    );
  });

  it("obtenerMisCursos pide GET /estudiante/cursos con Authorization", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));
    const { obtenerMisCursos } = await import("./api");

    await obtenerMisCursos("jwt-x");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/estudiante/cursos`,
      expect.objectContaining({ headers: { Authorization: "Bearer jwt-x" } }),
    );
  });

  it("obtenerUrlCampus sin cursoId no agrega query y devuelve la url del body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ url: "http://localhost:8080/login.php?key=abc" }));
    const { obtenerUrlCampus } = await import("./api");

    const url = await obtenerUrlCampus("jwt-x");

    expect(url).toBe("http://localhost:8080/login.php?key=abc");
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/estudiante/moodle-sso`, expect.anything());
  });

  it("obtenerUrlCampus con cursoId lo agrega como query", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ url: "http://localhost:8080/x" }));
    const { obtenerUrlCampus } = await import("./api");

    await obtenerUrlCampus("jwt-x", 2);

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/estudiante/moodle-sso?cursoId=2`, expect.anything());
  });

  it("obtenerUrlCampusActividad codifica la url de la actividad en el query", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ url: "http://localhost:8080/x" }));
    const { obtenerUrlCampusActividad } = await import("./api");

    await obtenerUrlCampusActividad("jwt-x", "http://localhost:8080/mod/assign/view.php?id=5");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/estudiante/moodle-sso?actividadUrl=${encodeURIComponent("http://localhost:8080/mod/assign/view.php?id=5")}`,
      expect.anything(),
    );
  });

  it("obtenerProximasActividades pide GET /estudiante/actividades con Authorization", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));
    const { obtenerProximasActividades } = await import("./api");

    await obtenerProximasActividades("jwt-x");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/estudiante/actividades`,
      expect.objectContaining({ headers: { Authorization: "Bearer jwt-x" } }),
    );
  });

  it("obtenerUsuarios sin rol no agrega query, con rol lo agrega", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([])).mockResolvedValueOnce(jsonResponse([]));
    const { obtenerUsuarios } = await import("./api");

    await obtenerUsuarios("jwt-x");
    await obtenerUsuarios("jwt-x", "aspirante");

    expect(fetch).toHaveBeenNthCalledWith(1, `${API_URL}/usuarios`, expect.anything());
    expect(fetch).toHaveBeenNthCalledWith(2, `${API_URL}/usuarios?rol=aspirante`, expect.anything());
  });

  it("actualizarRolUsuario manda PATCH /usuarios/:id/rol con el rol nuevo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: "u1", rol: "estudiante" }));
    const { actualizarRolUsuario } = await import("./api");

    await actualizarRolUsuario("jwt-x", "u1", "estudiante" as never);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/usuarios/u1/rol`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ rol: "estudiante" }) }),
    );
  });

  it("obtenerSolicitudAspirante pide GET /aspirante/solicitud con Authorization", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ estado: "en_revision" }));
    const { obtenerSolicitudAspirante } = await import("./api");

    await obtenerSolicitudAspirante("jwt-x");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/aspirante/solicitud`,
      expect.objectContaining({ headers: { Authorization: "Bearer jwt-x" } }),
    );
  });

  it("obtenerMisDocumentos pide GET /aspirante/documentos con Authorization", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));
    const { obtenerMisDocumentos } = await import("./api");

    await obtenerMisDocumentos("jwt-x");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/aspirante/documentos`,
      expect.objectContaining({ headers: { Authorization: "Bearer jwt-x" } }),
    );
  });

  it("subirDocumento manda multipart/form-data con tipo+archivo, sin fijar Content-Type a mano", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: "d1", estado: "pendiente" }));
    const { subirDocumento } = await import("./api");
    const archivo = new File(["contenido"], "ine.pdf", { type: "application/pdf" });

    await subirDocumento("jwt-x", "identificacion", archivo);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`${API_URL}/aspirante/documentos`);
    expect(init).toMatchObject({ method: "POST", headers: { Authorization: "Bearer jwt-x" } });
    expect(init?.body).toBeInstanceOf(FormData);
    const body = init!.body as FormData;
    expect(body.get("tipo")).toBe("identificacion");
    expect(body.get("archivo")).toBe(archivo);
    // El Content-Type (con el boundary) lo pone el navegador: nunca debe fijarse a mano.
    expect((init!.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("obtenerDocumentosDeUsuario pide GET /documentos/usuario/:userId", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));
    const { obtenerDocumentosDeUsuario } = await import("./api");

    await obtenerDocumentosDeUsuario("jwt-x", "u1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/documentos/usuario/u1`,
      expect.objectContaining({ headers: { Authorization: "Bearer jwt-x" } }),
    );
  });

  it("revisarDocumento manda PATCH /documentos/:id/estado con el estado dado", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: "d1", estado: "aprobado" }));
    const { revisarDocumento } = await import("./api");

    await revisarDocumento("jwt-x", "d1", "aprobado");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/documentos/d1/estado`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ estado: "aprobado" }) }),
    );
  });

  it("abrirDocumento pide el archivo y lo abre en una pestaña nueva", async () => {
    const blob = new Blob(["contenido"], { type: "application/pdf" });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(blob, { status: 200 }));
    vi.stubGlobal("open", vi.fn());
    const createObjectURLSpy = vi.fn().mockReturnValue("blob:fake-url");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: createObjectURLSpy }));
    const { abrirDocumento } = await import("./api");

    await abrirDocumento("jwt-x", "d1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/documentos/d1/archivo`,
      expect.objectContaining({ headers: { Authorization: "Bearer jwt-x" } }),
    );
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith("blob:fake-url", "_blank");
  });

  it("abrirDocumento lanza ApiError con mensaje fijo si el backend rechaza la descarga", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 403 }));
    const { abrirDocumento, ApiError } = await import("./api");

    const error: unknown = await abrirDocumento("jwt-x", "d1").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "No se pudo abrir el documento.", status: 403 });
  });

  it("asignarProgramaCoordinado manda el programaId (o null para quitar el ámbito)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ id: "u1" }))
      .mockResolvedValueOnce(jsonResponse({ id: "u1" }));
    const { asignarProgramaCoordinado } = await import("./api");

    await asignarProgramaCoordinado("jwt-x", "u1", "lic-software-ia");
    await asignarProgramaCoordinado("jwt-x", "u1", null);

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `${API_URL}/usuarios/u1/programa-coordinado`,
      expect.objectContaining({ body: JSON.stringify({ programaId: "lic-software-ia" }) }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `${API_URL}/usuarios/u1/programa-coordinado`,
      expect.objectContaining({ body: JSON.stringify({ programaId: null }) }),
    );
  });

  it("asignarCursoUsuario manda POST /usuarios/:id/matricula con el shortname del curso", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: "u1", moodleUserId: 42 }));
    const { asignarCursoUsuario } = await import("./api");

    await asignarCursoUsuario("jwt-x", "u1", "IINICIA101");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/usuarios/u1/matricula`,
      expect.objectContaining({ method: "POST", body: JSON.stringify({ cursoShortname: "IINICIA101" }) }),
    );
  });

  it("obtenerCursosMoodle pide GET /usuarios/cursos-moodle con Authorization", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));
    const { obtenerCursosMoodle } = await import("./api");

    await obtenerCursosMoodle("jwt-x");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/usuarios/cursos-moodle`,
      expect.objectContaining({ headers: { Authorization: "Bearer jwt-x" } }),
    );
  });

  it("obtenerMisEstudiantes pide GET /usuarios/mis-estudiantes con Authorization", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));
    const { obtenerMisEstudiantes } = await import("./api");

    await obtenerMisEstudiantes("jwt-x");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/usuarios/mis-estudiantes`,
      expect.objectContaining({ headers: { Authorization: "Bearer jwt-x" } }),
    );
  });

  it("enviarNotificacion manda título/mensaje/cursoId a POST /usuarios/:id/notificar", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ enviado: true }));
    const { enviarNotificacion } = await import("./api");

    await enviarNotificacion("jwt-x", "u1", { titulo: "Aviso", mensaje: "Mensaje", cursoId: "2" });

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/usuarios/u1/notificar`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ titulo: "Aviso", mensaje: "Mensaje", cursoId: "2" }),
      }),
    );
  });
});
