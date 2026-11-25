import { render, screen } from "@testing-library/react";
import { installControllableIntersectionObserver } from "@/test-utils/intersection-observer-mock";
import { CountUp } from "./count-up";

describe("CountUp", () => {
  it("muestra el valor final de entrada antes de animar", () => {
    installControllableIntersectionObserver();
    render(<CountUp value="+5,000" />);
    expect(screen.getByText("+5,000")).toBeInTheDocument();
  });

  it("bajo prefers-reduced-motion, nunca anima: se queda en el valor dado", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({ matches: true, media: query })),
    );
    installControllableIntersectionObserver();
    render(<CountUp value="100%" />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
