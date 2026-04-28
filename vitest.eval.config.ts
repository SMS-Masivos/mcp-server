import { defineConfig } from "vitest/config";

// Config separada para la eval suite. Corre con `npm run test:eval`.
// Requiere ANTHROPIC_API_KEY. Cuesta tokens de Anthropic + créditos sandbox.
export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/eval/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
