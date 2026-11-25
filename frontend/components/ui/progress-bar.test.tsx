import { act, render } from "@testing-library/react";
import { installControllableIntersectionObserver } from "@/test-utils/intersection-observer-mock";
import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
  it("antes de entrar en vista, el ancho queda en 0", () => {
    installControllableIntersectionObserver();
    const { container } = render(<ProgressBar value={62} />);
    const fill = container.querySelector(".progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("al entrar en vista, crece hasta el valor real", () => {
    const { dispararInterseccion } = installControllableIntersectionObserver();
    const { container } = render(<ProgressBar value={62} />);
    act(() => dispararInterseccion(true));
    const fill = container.querySelector(".progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("62%");
  });
});
