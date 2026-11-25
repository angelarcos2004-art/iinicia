import { render } from "@testing-library/react";
import { SectionBg } from "./section-bg";

describe("SectionBg", () => {
  it("es decorativo (aria-hidden) y usa la imagen dada como fondo", () => {
    const { container } = render(<SectionBg image="/images/bg.png" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el.style.backgroundImage).toContain("/images/bg.png");
  });

  it("usa opacity 0.1 por defecto", () => {
    const { container } = render(<SectionBg image="/images/bg.png" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.opacity).toBe("0.1");
  });

  it("acepta una opacity explícita", () => {
    const { container } = render(<SectionBg image="/images/bg.png" opacity={0.18} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.opacity).toBe("0.18");
  });
});
