import { defineConfig } from "prisma/config";

export default defineConfig({
  seed: {
    tsx: {
      command: "tsx prisma/seed.ts",
    },
  },
});
