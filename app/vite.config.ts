import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base relatif => déployable sous n'importe quel sous-chemin (GitHub Pages, etc.)
export default defineConfig({ plugins: [react()], base: "./" });
