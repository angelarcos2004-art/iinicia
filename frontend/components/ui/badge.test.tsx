import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renderiza su contenido", () => {
    render(<Badge>En curso</Badge>);
    expect(screen.getByText("En curso")).toBeInTheDocument();
  });

  it("usa la variante neutral por defecto", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default").className).toContain("bg-surface-neutral");
  });

  it("aplica las clases de la variante indicada", () => {
    render(<Badge variant="admission">Admisión</Badge>);
    expect(screen.getByText("Admisión").className).toContain("bg-admission-bg");
  });

  it("agrega className adicional sin perder las clases base", () => {
    render(<Badge className="w-fit">Con clase extra</Badge>);
    const el = screen.getByText("Con clase extra");
    expect(el.className).toContain("w-fit");
    expect(el.className).toContain("rounded-full");
  });
});
