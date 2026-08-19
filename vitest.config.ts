import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Cấu hình test tối thiểu. Alias `@/` để test có thể import theo đường dẫn dự án.
// Lưu ý: logic đồng hồ (`src/lib/server/clock.ts`) chỉ dùng `import type` nên không
// cần alias lúc chạy, nhưng để sẵn cho các test sau.
export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
