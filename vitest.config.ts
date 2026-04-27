import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./test/setup.ts"],
    // Eval suite excluida del run default — corre solo con `npm run test:eval`.
    // Los evals consumen tokens de Anthropic y créditos sandbox de SMS Masivos.
    exclude: ["**/node_modules/**", "**/dist/**", "test/eval/**"],
  },
});
