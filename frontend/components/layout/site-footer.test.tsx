import { render, screen } from "@testing-library/react";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("renderiza los links institucionales y de cuenta", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Registrarme" })).toHaveAttribute("href", "/registro");
    expect(screen.getByRole("link", { name: "Mi Campus" })).toHaveAttribute("href", "/login");
  });

  it("muestra el año vigente en el aviso de derechos", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/2026 Instituto de Innovación/)).toBeInTheDocument();
  });
});
