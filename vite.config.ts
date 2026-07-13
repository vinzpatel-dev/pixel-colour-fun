import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/pixel-colour-fun/",
  plugins: [react()],
  build: { target: "es2022" },
});
