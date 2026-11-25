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
});
