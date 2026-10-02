import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Las pruebas usan el mismo alias «@/» que la aplicación, para que importar
 * un módulo en una prueba se escriba igual que importarlo en una página.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
