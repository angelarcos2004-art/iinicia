import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("asocia el label con el input por id/htmlFor", () => {
    render(<Input id="correo" label="Correo electrónico" />);
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
  });

  it("sin error ni hint, no muestra texto de apoyo", () => {
    render(<Input id="correo" label="Correo" />);
    expect(screen.queryByText(/./, { selector: "p" })).not.toBeInTheDocument();
  });

  it("con hint, lo muestra y lo referencia por aria-describedby", () => {
    render(<Input id="correo" label="Correo" hint="Nunca lo compartimos." />);
    const input = screen.getByLabelText("Correo");
    expect(screen.getByText("Nunca lo compartimos.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-describedby", "correo-hint");
  });

  it("con error, lo muestra, marca aria-invalid y prioriza el error sobre el hint", () => {
    render(<Input id="correo" label="Correo" hint="Hint" error="Correo inválido" />);
    const input = screen.getByLabelText("Correo");
    expect(screen.getByText("Correo inválido")).toBeInTheDocument();
    expect(screen.queryByText("Hint")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "correo-error");
  });

  it("acepta texto escrito por el usuario", async () => {
    const onChange = vi.fn();
    render(<Input id="correo" label="Correo" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Correo"), "a");
    expect(onChange).toHaveBeenCalled();
  });
});
