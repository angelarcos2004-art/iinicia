import { render, screen } from "@testing-library/react";
import { Card } from "./card";

describe("Card", () => {
  it("renderiza su contenido", () => {
    render(<Card>Contenido</Card>);
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("sin hoverable, no agrega las clases de hover", () => {
    render(<Card>Fijo</Card>);
    expect(screen.getByText("Fijo").className).not.toContain("hover:-translate-y-1");
  });

  it("con hoverable, agrega las clases de hover", () => {
    render(<Card hoverable>Flotante</Card>);
    expect(screen.getByText("Flotante").className).toContain("hover:-translate-y-1");
  });
});
