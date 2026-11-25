import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@/lib/auth-context";
import { SiteHeader } from "./site-header";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/",
}));

function renderConSesion(sesion: { token: string; usuario: { nombre: string; rol: string } } | null) {
  try {
    if (sesion) window.localStorage.setItem("iinicia.sesion", JSON.stringify(sesion));
    else window.localStorage.removeItem("iinicia.sesion");
  } catch {
    // no-op
  }
  return render(
    <AuthProvider>
      <SiteHeader />
    </AuthProvider>,
  );
}

describe("SiteHeader", () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    window.localStorage.clear();
  });

  it("sin sesión, muestra los links de Mi Campus/Registrarme, no los de administración", async () => {
    renderConSesion(null);
    expect(await screen.findAllByRole("link", { name: "Mi Campus" })).not.toHaveLength(0);
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
  });

  it("con sesión de estudiante, saluda por nombre y no muestra paneles admin", async () => {
    renderConSesion({ token: "jwt-x", usuario: { nombre: "Ana Pérez", rol: "estudiante" } });
    expect(await screen.findAllByText(/Hola, Ana/)).not.toHaveLength(0);
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
  });

  it("con sesión de superadmin, muestra los links de administración", async () => {
    renderConSesion({ token: "jwt-x", usuario: { nombre: "Admin", rol: "superadmin" } });
    expect((await screen.findAllByRole("link", { name: "Usuarios" })).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Programas" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Materias" }).length).toBeGreaterThan(0);
  });

  it("cerrar sesión limpia la sesión guardada y navega al inicio", async () => {
    renderConSesion({ token: "jwt-x", usuario: { nombre: "Ana Pérez", rol: "estudiante" } });
    const [logoutBtn] = await screen.findAllByRole("button", { name: "Cerrar sesión" });
    await userEvent.click(logoutBtn);
    expect(window.localStorage.getItem("iinicia.sesion")).toBeNull();
    expect(push).toHaveBeenCalledWith("/");
  });
});
