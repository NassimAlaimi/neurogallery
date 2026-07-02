import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base absolue ("/") : les URLs relatives ("./assets/…", fetch relatif à
// ARTIFACT_BASE) sont résolues par le navigateur par rapport au chemin de
// la page courante, pas à la racine du site. Avec une base relative ("./"),
// toute route client à 2+ segments (ex. /item/0000) résout ces chemins vers
// un mauvais dossier (ex. /item/assets/…) => 404 silencieux (fallback SPA
// renvoie l'index.html, qui casse le parsing JS/JSON).
// Pour un déploiement sous un sous-chemin (GitHub Pages, etc.), utiliser le
// flag CLI de Vite : `vite build --base=/mon-sous-chemin/`.
export default defineConfig({ plugins: [react()], base: "/" });
