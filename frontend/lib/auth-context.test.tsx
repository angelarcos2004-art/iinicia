import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";
import * as api from "./api";

const USUARIO = { id: "u1", nombre: "Ana", correo: "ana@correo.com", rol: "aspirante" as const };

function Sonda() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="correo">{auth.sesion?.usuario.correo ?? "sin-sesion"}</span>
      <button onClick={() => auth.verificarCodigo2FA("ana@correo.com", "123456", false)}>
        verificar
      </button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

describe("auth-context", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("no hay sesión hasta que se verifica el código 2FA (login por sí solo no abre sesión)", async () => {
    vi.spyOn(api, "login").mockResolvedValue({ correo: "ana@correo.com", mensaje: "ok" });

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("correo").textContent).toBe("sin-sesion"));
  });

  it("verificarCodigo2FA abre la sesión y la persiste en sessionStorage cuando recordar=false", async () => {
    vi.spyOn(api, "verificarCodigo2FA").mockResolvedValue({ token: "jwt-x", usuario: USUARIO });

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByText("verificar").click();
    });

    await waitFor(() => expect(screen.getByTestId("correo").textContent).toBe("ana@correo.com"));
    expect(window.sessionStorage.getItem("iinicia.sesion")).toContain("jwt-x");
    expect(window.localStorage.getItem("iinicia.sesion")).toBeNull();
  });

  it("logout limpia la sesión guardada", async () => {
    vi.spyOn(api, "verificarCodigo2FA").mockResolvedValue({ token: "jwt-x", usuario: USUARIO });

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );
    await act(async () => {
      screen.getByText("verificar").click();
    });
    await waitFor(() => expect(screen.getByTestId("correo").textContent).toBe("ana@correo.com"));

    act(() => {
      screen.getByText("logout").click();
    });

    expect(screen.getByTestId("correo").textContent).toBe("sin-sesion");
    expect(window.sessionStorage.getItem("iinicia.sesion")).toBeNull();
  });

  it("useAuth fuera de <AuthProvider> lanza un error claro", () => {
    expect(() => render(<Sonda />)).toThrow("useAuth debe usarse dentro de <AuthProvider>");
  });
});
