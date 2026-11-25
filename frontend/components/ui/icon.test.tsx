import { render, screen } from "@testing-library/react";
import { Icon } from "./icon";

describe("Icon", () => {
  it("renderiza el nombre del ícono como texto (fuente Material Symbols)", () => {
    render(<Icon name="school" />);
    expect(screen.getByText("school")).toBeInTheDocument();
  });

  it("es decorativo: aria-hidden siempre true", () => {
    render(<Icon name="school" />);
    expect(screen.getByText("school")).toHaveAttribute("aria-hidden", "true");
  });
});
