import { render } from "@testing-library/react";
import { ScrollProgress } from "./scroll-progress";

describe("ScrollProgress", () => {
  it("renderiza la barra en 0% cuando la página no es desplazable", () => {
    const { container } = render(<ScrollProgress />);
    const bar = container.querySelector(".bg-gradient-to-r") as HTMLElement;
    expect(bar.style.width).toBe("0%");
  });
});
