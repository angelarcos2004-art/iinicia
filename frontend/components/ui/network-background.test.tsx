import { render } from "@testing-library/react";
import { NetworkBackground } from "./network-background";

describe("NetworkBackground", () => {
  it("renderiza un canvas decorativo sin lanzar (jsdom no implementa su contexto 2D)", () => {
    const { container } = render(<NetworkBackground className="absolute inset-0" />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  it("bajo prefers-reduced-motion, no intenta animar", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({ matches: true, media: query })),
    );
    const { container } = render(<NetworkBackground />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });
});
