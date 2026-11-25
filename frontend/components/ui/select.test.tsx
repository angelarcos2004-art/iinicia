import { render, screen } from "@testing-library/react";
import { Select } from "./select";

describe("Select", () => {
  it("asocia el label con el select por id/htmlFor y renderiza sus opciones", () => {
    render(
      <Select id="programa" label="Programa">
        <option value="a">Programa A</option>
        <option value="b">Programa B</option>
      </Select>,
    );
    const select = screen.getByLabelText("Programa");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Programa A")).toBeInTheDocument();
    expect(screen.getByText("Programa B")).toBeInTheDocument();
  });

  it("con error, lo muestra y marca aria-invalid", () => {
    render(
      <Select id="programa" label="Programa" error="Selecciona un programa">
        <option value="">—</option>
      </Select>,
    );
    expect(screen.getByText("Selecciona un programa")).toBeInTheDocument();
    expect(screen.getByLabelText("Programa")).toHaveAttribute("aria-invalid", "true");
  });
});
