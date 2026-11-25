import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // Corriendo todos los archivos juntos (muchos workers jsdom en paralelo) las pruebas con
    // varios pasos de userEvent.type + espera async pueden pasar de los 5s por defecto en una
    // máquina cargada, aunque la lógica sea correcta (confirmado corriéndolas solas).
    testTimeout: 15000,
  },
});
