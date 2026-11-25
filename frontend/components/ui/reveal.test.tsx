import { act, render, screen } from "@testing-library/react";
import { installControllableIntersectionObserver } from "@/test-utils/intersection-observer-mock";
import { Reveal } from "./reveal";

describe("Reveal", () => {
  it("antes de entrar en vista, queda oculto (opacity-0)", () => {
    installControllableIntersectionObserver();
    render(<Reveal>Contenido</Reveal>);
    expect(screen.getByText("Contenido").className).toContain("opacity-0");
  });

  it("al entrar en vista, se vuelve visible (opacity-100) y no vuelve a ocultarse", () => {
    const { dispararInterseccion } = installControllableIntersectionObserver();
    render(<Reveal>Contenido</Reveal>);
    act(() => dispararInterseccion(true));
    expect(screen.getByText("Contenido").className).toContain("opacity-100");
  });

  it("variant zoom usa scale en vez de translate-y", () => {
    installControllableIntersectionObserver();
    render(<Reveal variant="zoom">Imagen</Reveal>);
    expect(screen.getByText("Imagen").className).toContain("scale-110");
  });
});
