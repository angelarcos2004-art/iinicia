import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, ButtonLink } from "./button";

describe("Button", () => {
  it("renderiza type=button por defecto (no envía formularios por accidente)", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button", { name: "Click" })).toHaveAttribute("type", "button");
  });

  it("respeta un type explícito (p. ej. submit)", () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toHaveAttribute("type", "submit");
  });

  it("dispara onClick al hacer click", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("no dispara onClick cuando está disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Click
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("ButtonLink", () => {
  it("renderiza un link con el href dado", () => {
    render(<ButtonLink href="/registro">Comenzar</ButtonLink>);
    expect(screen.getByRole("link", { name: "Comenzar" })).toHaveAttribute("href", "/registro");
  });
});
