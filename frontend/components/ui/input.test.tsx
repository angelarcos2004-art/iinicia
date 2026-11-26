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

  it("type=password: el botón de mostrar/ocultar alterna el type del input", async () => {
    render(<Input id="password" label="Contraseña" type="password" />);
    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(input).toHaveAttribute("type", "text");

    await userEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("sin type=password, no muestra el botón de mostrar/ocultar", () => {
    render(<Input id="correo" label="Correo" type="email" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
