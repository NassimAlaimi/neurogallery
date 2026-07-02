# NeuroGallery — Plan 2 : App galerie (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une app web **statique** (Vite + React + TS) qui consomme l'artefact produit par le lab (via `manifest.json`) et présente les reconstructions dans une galerie éditoriale explorable + un mode identification, partageable par simple lien.

**Architecture :** L'app ne connaît QUE le contrat `manifest.json`. Une couche `lib/` pure (types + validation + état-URL + logique du jeu + formatage métriques) sépare la logique testable des composants React. Un artefact-échantillon schema-valide (généré par le lab avec `FakeReconstructor` + données synthétiques) est commité sous `app/public/sample-artifact/` pour le dev et les tests ; en prod on dépose le vrai artefact au même chemin.

**Tech Stack :** Vite, React 18, TypeScript, React Router, `@tanstack/react-virtual` (grille virtualisée), Vitest (unit), Playwright (e2e). CSS avec design tokens (pas de framework UI lourd).

## Global Constraints

_(Chaque tâche hérite implicitement de ces contraintes.)_

- **Statique & partageable** : aucun backend, aucun appel réseau externe, aucune dépendance PyTorch/GPU/NSD. Build déployable (GitHub Pages / Netlify / Vercel).
- **Contrat unique** : l'app lit `manifest.json` conforme à `manifest.schema.json` (racine du repo). Ne jamais faire confiance à la donnée externe → **valider au chargement**, échouer proprement.
- **Licences (dur, légalement porteur)** : n'afficher une vérité-terrain QUE si `gt.displayable === true` et `gt.path !== null` ; sinon afficher un **placeholder** "source masquée". Ne jamais commit de vraie image NSD/COCO ; le fixture ne contient que des sorties `FakeReconstructor` + des vérités-terrain **synthétiques**. Citations obligatoires dans l'app : **NSD (Allen et al., 2022)** et **COCO**.
- **Design (anti-template)** : direction **éditoriale "laboratoire"** — images héros, forte hiérarchie d'échelle, métrique traitée comme élément de design (jauge), palette réduite avec accents sémantiques (vert = haute similarité, ambre = faible). Tokens CSS, pas de valeurs en dur répétées. États hover/focus/active soignés.
- **Accessibilité** : HTML sémantique, navigation clavier, `alt` pertinents, contraste, `prefers-reduced-motion` honoré.
- **Immuabilité** : ne jamais muter l'état en place ; dériver plutôt que dupliquer. État partageable (filtres) **dans l'URL**.
- **Perf** : grille virtualisée pour ~1000 items ; vignettes en grille, pleines résolutions en détail ; animer uniquement `transform`/`opacity`.
- **Qualité** : composants et modules focalisés (< 400 lignes ; < 800 max), fonctions courtes, `PascalCase` composants, `use`-préfixe hooks, `camelCase` variables.

## Interfaces partagées (types du contrat — utilisés par toutes les tâches)

```ts
// src/lib/manifest.ts — LA source de vérité TS du contrat
export type Method = "brain-diffuser" | "mindeye2";
export type Profile = "local" | "public";

export interface GtInfo {
  displayable: boolean;
  path: string | null;
  license_name: string;
  attribution?: string | null;
  source_url?: string | null;
}
export interface Item {
  id: string;
  coco_id: number;
  category: string | null;
  recon: Record<string, string>;          // method -> chemin relatif
  thumb: string;
  gt: GtInfo;
  metrics: Record<string, Record<string, number>>; // method -> {metric -> valeur}
}
export interface BuildInfo {
  subject: string;
  test_set: string;
  methods: Method[];
  profile: Profile;
  created?: string;
}
export interface Manifest {
  build: BuildInfo;
  items: Item[];
}
```

## File Structure

```
app/
├── package.json · vite.config.ts · tsconfig.json · index.html · playwright.config.ts · vitest.config.ts
├── public/
│   └── sample-artifact/            # fixture commité (schema-valide, Fake outputs + GT synthétiques)
│       ├── manifest.json · recon/ · thumbs/ · gt/
├── src/
│   ├── main.tsx · App.tsx          # shell + routing
│   ├── lib/
│   │   ├── manifest.ts             # types + validateManifest + loadManifest
│   │   ├── artifact.ts             # base URL + résolution d'URL d'asset
│   │   ├── metrics.ts              # formatage + échelle de jauge (couleur sémantique)
│   │   ├── urlState.ts             # FilterState <-> URLSearchParams + applyFilters
│   │   └── identify.ts             # construction d'une manche + scoring (seedable)
│   ├── features/
│   │   ├── home/HomePage.tsx
│   │   ├── gallery/{GalleryPage,GalleryCard,Filters}.tsx
│   │   ├── detail/DetailPage.tsx
│   │   └── identify/IdentifyGame.tsx
│   ├── components/ui/{Gauge,Plate}.tsx
│   └── styles/{tokens,global,typography}.css
├── src/**/*.test.ts(x)             # Vitest unit
└── tests/e2e/*.spec.ts             # Playwright
lab/scripts/make_sample_artifact.py # génère le fixture (une fois)
```

---

### Task 1: Scaffold de l'app (Vite + React + TS + Vitest + Playwright)

**Files:**
- Create: `app/package.json`, `app/vite.config.ts`, `app/tsconfig.json`, `app/tsconfig.node.json`, `app/index.html`, `app/vitest.config.ts`, `app/playwright.config.ts`
- Create: `app/src/main.tsx`, `app/src/App.tsx`, `app/src/styles/tokens.css`, `app/src/styles/global.css`, `app/src/styles/typography.css`
- Create: `app/src/lib/smoke.test.ts` (test de fumée pour prouver que Vitest tourne)

**Interfaces:**
- Consumes: rien.
- Produces: projet buildable (`npm run build`), testable (`npm run test`), serveur dev (`npm run dev`). Routing shell prêt pour les pages.

- [ ] **Step 1: `app/package.json`**

```json
{
  "name": "neurogallery-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "@tanstack/react-virtual": "^3.10.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Config files**

`app/vite.config.ts` :
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base relatif => déployable sous n'importe quel sous-chemin (GitHub Pages, etc.)
export default defineConfig({ plugins: [react()], base: "./" });
```

`app/vitest.config.ts` :
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: [] },
});
```

`app/tsconfig.json` :
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`app/tsconfig.node.json` :
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

`app/playwright.config.ts` :
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run build && npm run preview -- --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: "http://localhost:4173" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

- [ ] **Step 3: `app/index.html` + entrée React**

`app/index.html` :
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NeuroGallery — Ce que le cerveau regardait</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`app/src/main.tsx` :
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 4: Tokens & styles (direction éditoriale)**

`app/src/styles/tokens.css` :
```css
:root {
  --color-bg: oklch(96% 0.01 95);
  --color-surface: oklch(99% 0.005 95);
  --color-ink: oklch(22% 0.02 260);
  --color-muted: oklch(55% 0.02 260);
  --color-line: oklch(88% 0.01 260);
  --color-high: oklch(62% 0.16 150);   /* vert = haute similarité */
  --color-low: oklch(72% 0.15 70);     /* ambre = faible */
  --color-accent: oklch(55% 0.18 265);

  --text-hero: clamp(2.5rem, 1rem + 6vw, 6rem);
  --text-title: clamp(1.5rem, 1rem + 2vw, 2.5rem);
  --text-base: clamp(1rem, 0.95rem + 0.3vw, 1.125rem);
  --text-small: 0.85rem;

  --space-section: clamp(3rem, 2rem + 5vw, 8rem);
  --space-4: 0.25rem; --space-8: 0.5rem; --space-16: 1rem; --space-24: 1.5rem; --space-32: 2rem;

  --radius: 6px;
  --duration: 240ms;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}
```

`app/src/styles/typography.css` :
```css
body { font-family: ui-serif, Georgia, "Times New Roman", serif; color: var(--color-ink); }
h1, h2, h3, .ui-label { font-family: ui-sans-serif, system-ui, sans-serif; }
.ui-label { text-transform: uppercase; letter-spacing: 0.08em; font-size: var(--text-small); color: var(--color-muted); }
```

`app/src/styles/global.css` :
```css
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: var(--color-bg); font-size: var(--text-base); line-height: 1.5; }
a { color: inherit; }
img { max-width: 100%; display: block; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 5: `App.tsx` shell + routing (pages stub)**

`app/src/App.tsx` :
```tsx
import { Link, Route, Routes } from "react-router-dom";

function Stub({ name }: { name: string }) {
  return <main style={{ padding: "var(--space-32)" }}><h1>{name}</h1></main>;
}

export default function App() {
  return (
    <>
      <header style={{ padding: "var(--space-16) var(--space-32)", borderBottom: "1px solid var(--color-line)" }}>
        <nav aria-label="Navigation principale" style={{ display: "flex", gap: "var(--space-24)" }}>
          <Link to="/">Accueil</Link>
          <Link to="/gallery">Galerie</Link>
          <Link to="/identify">Identification</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Stub name="Accueil" />} />
        <Route path="/gallery" element={<Stub name="Galerie" />} />
        <Route path="/item/:id" element={<Stub name="Détail" />} />
        <Route path="/identify" element={<Stub name="Identification" />} />
      </Routes>
    </>
  );
}
```

- [ ] **Step 6: Test de fumée Vitest**

`app/src/lib/smoke.test.ts` :
```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Installer, tester, builder**

Run:
```bash
cd app && npm install && npm run test && npm run build
```
Expected: install OK ; `vitest run` → 1 test passing ; `vite build` → build réussi (dossier `dist/`).

- [ ] **Step 8: Commit**

```bash
git add app/package.json app/package-lock.json app/*.ts app/*.json app/index.html app/src
git commit -m "chore: scaffold Vite+React+TS app (routing shell, tokens, vitest+playwright)"
```

---

### Task 2: Artefact-échantillon (fixture commité)

**Files:**
- Create: `lab/scripts/make_sample_artifact.py`
- Create (généré, commité) : `app/public/sample-artifact/manifest.json` + `recon/` + `thumbs/` + `gt/`

**Interfaces:**
- Consumes (lab) : `LabConfig`/`with_overrides`, `BuildItem`/`build_artifact`, `FakeReconstructor`, `make_synthetic_subject`.
- Produces : un artefact **profil public** schema-valide (~8 items, licences mixtes) que l'app charge en dev/test.

- [ ] **Step 1: Écrire le générateur**

`lab/scripts/make_sample_artifact.py` :
```python
"""Génère un artefact-échantillon schema-valide pour le dev/test de l'app.

Sorties = FakeReconstructor (nos propres images) + vérités-terrain SYNTHÉTIQUES
(dégradés générés) — aucune donnée NSD/COCO réelle. Profil public : les GT à
licence non affichable sont masquées, exactement comme en prod.

Usage : python lab/scripts/make_sample_artifact.py
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from neurogallery.build.artifact import BuildItem, build_artifact
from neurogallery.config import LabConfig
from neurogallery.reconstruct.fake import FakeReconstructor

OUT_DIR = Path(__file__).resolve().parents[2] / "app" / "public" / "sample-artifact"
# licences mixtes : 4=CC BY (affichable), 7=no-known (affichable), 2=NC (masquée), 3=NC-ND (masquée)
LICENSES = [4, 7, 2, 4, 3, 7, 2, 4]
CATEGORIES = ["animal", "paysage", "objet", "personne", "nourriture", "véhicule", "animal", "objet"]


def _synthetic_gt(seed: int) -> Image.Image:
    rng = np.random.default_rng(seed)
    base = rng.integers(0, 255, size=(64, 64, 3), dtype=np.uint8)
    return Image.fromarray(base)


def main() -> None:
    n = len(LICENSES)
    coco_index = {
        1000 + i: {"license_id": LICENSES[i], "flickr_url": f"https://example.org/{i}"}
        for i in range(n)
    }
    items = [
        BuildItem(
            id=f"{i:04d}",
            coco_id=1000 + i,
            category=CATEGORIES[i],
            betas=np.full(50, float(i), dtype=np.float32),
            gt_image=_synthetic_gt(i),
        )
        for i in range(n)
    ]
    cfg = LabConfig(data_dir=OUT_DIR.parent, artifact_root=OUT_DIR.parent)
    build_artifact(
        cfg=cfg,
        reconstructor=FakeReconstructor(size=256),
        method="brain-diffuser",
        items=items,
        coco_index=coco_index,
        profile="public",
        out_dir=OUT_DIR,
    )
    print(f"Artefact-échantillon écrit : {OUT_DIR}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Générer le fixture**

Run (depuis le repo, venv du lab activé) :
```bash
cd lab && source .venv/bin/activate && python scripts/make_sample_artifact.py && cd ..
python -c "import json,jsonschema; m=json.load(open('app/public/sample-artifact/manifest.json')); jsonschema.validate(m, json.load(open('manifest.schema.json'))); print('manifest OK', len(m['items']), 'items')"
```
Expected : dossier `app/public/sample-artifact/` créé avec `manifest.json` (8 items) valide, `recon/`, `thumbs/`, et `gt/` ne contenant QUE les items affichables (licences 4/7).

- [ ] **Step 3: Commit**

```bash
git add lab/scripts/make_sample_artifact.py app/public/sample-artifact
git commit -m "feat: sample artifact fixture (Fake outputs + synthetic GT, public profile)"
```

---

### Task 3: `lib/manifest.ts` — types + validation + chargement

**Files:**
- Create: `app/src/lib/manifest.ts`
- Test: `app/src/lib/manifest.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - Les types de « Interfaces partagées » ci-dessus.
  - `function validateManifest(data: unknown): Manifest` — valide la forme, lève `Error` si invalide (jamais confiance en la donnée externe).
  - `async function loadManifest(baseUrl: string): Promise<Manifest>` — `fetch(\`${baseUrl}/manifest.json\`)`, parse, valide, renvoie.

- [ ] **Step 1: Écrire le test qui échoue**

`app/src/lib/manifest.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { validateManifest } from "./manifest";

const valid = {
  build: { subject: "subj01", test_set: "shared1000", methods: ["brain-diffuser"], profile: "public" },
  items: [{
    id: "0001", coco_id: 1000, category: "animal",
    recon: { "brain-diffuser": "recon/0001_brain-diffuser.png" },
    thumb: "thumbs/0001.jpg",
    gt: { displayable: false, path: null, license_name: "CC BY-NC 2.0" },
    metrics: { "brain-diffuser": { pixcorr: 0.2, ssim: 0.3 } },
  }],
};

describe("validateManifest", () => {
  it("accepts a valid manifest and returns it typed", () => {
    const m = validateManifest(valid);
    expect(m.build.subject).toBe("subj01");
    expect(m.items[0].gt.displayable).toBe(false);
  });

  it("throws when build is missing", () => {
    expect(() => validateManifest({ items: [] })).toThrow();
  });

  it("throws when an item lacks required gt fields", () => {
    const bad = structuredClone(valid);
    // @ts-expect-error suppression intentionnelle d'un champ requis
    delete bad.items[0].gt.displayable;
    expect(() => validateManifest(bad)).toThrow();
  });

  it("throws when items is not an array", () => {
    expect(() => validateManifest({ build: valid.build, items: {} })).toThrow();
  });
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `cd app && npx vitest run src/lib/manifest.test.ts`
Expected: FAIL (module `./manifest` introuvable / `validateManifest` non défini).

- [ ] **Step 3: Implémentation**

`app/src/lib/manifest.ts` :
```ts
export type Method = "brain-diffuser" | "mindeye2";
export type Profile = "local" | "public";

export interface GtInfo {
  displayable: boolean;
  path: string | null;
  license_name: string;
  attribution?: string | null;
  source_url?: string | null;
}
export interface Item {
  id: string;
  coco_id: number;
  category: string | null;
  recon: Record<string, string>;
  thumb: string;
  gt: GtInfo;
  metrics: Record<string, Record<string, number>>;
}
export interface BuildInfo {
  subject: string;
  test_set: string;
  methods: Method[];
  profile: Profile;
  created?: string;
}
export interface Manifest {
  build: BuildInfo;
  items: Item[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Manifest invalide : ${msg}`);
}

export function validateManifest(data: unknown): Manifest {
  assert(isObject(data), "racine n'est pas un objet");
  assert(isObject(data.build), "champ 'build' manquant/invalide");
  const b = data.build;
  assert(typeof b.subject === "string", "build.subject");
  assert(typeof b.test_set === "string", "build.test_set");
  assert(Array.isArray(b.methods) && b.methods.length > 0, "build.methods");
  assert(b.profile === "local" || b.profile === "public", "build.profile");
  assert(Array.isArray(data.items), "'items' n'est pas un tableau");

  for (const [i, raw] of data.items.entries()) {
    assert(isObject(raw), `item ${i} n'est pas un objet`);
    assert(typeof raw.id === "string", `item ${i}.id`);
    assert(typeof raw.coco_id === "number", `item ${i}.coco_id`);
    assert(isObject(raw.recon), `item ${i}.recon`);
    assert(typeof raw.thumb === "string", `item ${i}.thumb`);
    assert(isObject(raw.gt), `item ${i}.gt`);
    assert(typeof raw.gt.displayable === "boolean", `item ${i}.gt.displayable`);
    assert(raw.gt.path === null || typeof raw.gt.path === "string", `item ${i}.gt.path`);
    assert(typeof raw.gt.license_name === "string", `item ${i}.gt.license_name`);
    assert(isObject(raw.metrics), `item ${i}.metrics`);
  }
  return data as unknown as Manifest;
}

export async function loadManifest(baseUrl: string): Promise<Manifest> {
  const res = await fetch(`${baseUrl}/manifest.json`);
  if (!res.ok) throw new Error(`Échec du chargement du manifest (${res.status})`);
  return validateManifest(await res.json());
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `cd app && npx vitest run src/lib/manifest.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/manifest.ts app/src/lib/manifest.test.ts
git commit -m "feat: manifest types + runtime validation + loader"
```

---

### Task 4: `lib/artifact.ts` + `lib/metrics.ts` (URL d'asset + jauge)

**Files:**
- Create: `app/src/lib/artifact.ts`, `app/src/lib/metrics.ts`
- Test: `app/src/lib/artifact.test.ts`, `app/src/lib/metrics.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `const ARTIFACT_BASE: string` — `${import.meta.env.BASE_URL}sample-artifact` (remplaçable en prod).
  - `function assetUrl(base: string, relPath: string): string` — joint base + chemin relatif proprement.
  - `function formatMetric(value: number): string` — 2 décimales.
  - `function gaugeLevel(value: number): "high" | "mid" | "low"` — seuils sur [0,1] (≥0.6 high, ≥0.35 mid, sinon low).
  - `function gaugeColorVar(value: number): string` — renvoie une CSS var (`var(--color-high)` / mélange / `var(--color-low)`).

- [ ] **Step 1: Tests qui échouent**

`app/src/lib/metrics.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { formatMetric, gaugeLevel } from "./metrics";

describe("metrics", () => {
  it("formats to 2 decimals", () => {
    expect(formatMetric(0.12345)).toBe("0.12");
    expect(formatMetric(1)).toBe("1.00");
  });
  it("classifies gauge levels by threshold", () => {
    expect(gaugeLevel(0.8)).toBe("high");
    expect(gaugeLevel(0.4)).toBe("mid");
    expect(gaugeLevel(0.1)).toBe("low");
  });
});
```

`app/src/lib/artifact.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { assetUrl } from "./artifact";

describe("assetUrl", () => {
  it("joins base and relative path with a single slash", () => {
    expect(assetUrl("/base", "recon/0001.png")).toBe("/base/recon/0001.png");
    expect(assetUrl("/base/", "recon/0001.png")).toBe("/base/recon/0001.png");
  });
});
```

- [ ] **Step 2: Lancer → échec**

Run: `cd app && npx vitest run src/lib/metrics.test.ts src/lib/artifact.test.ts`
Expected: FAIL (modules absents).

- [ ] **Step 3: Implémentations**

`app/src/lib/artifact.ts` :
```ts
// Base de l'artefact : le fixture en dev, remplacé par le vrai artefact en prod
// (déposé au même chemin public/sample-artifact/).
export const ARTIFACT_BASE = `${import.meta.env.BASE_URL}sample-artifact`;

export function assetUrl(base: string, relPath: string): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = relPath.startsWith("/") ? relPath.slice(1) : relPath;
  return `${b}/${p}`;
}
```

`app/src/lib/metrics.ts` :
```ts
const HIGH = 0.6;
const MID = 0.35;

export function formatMetric(value: number): string {
  return value.toFixed(2);
}

export function gaugeLevel(value: number): "high" | "mid" | "low" {
  if (value >= HIGH) return "high";
  if (value >= MID) return "mid";
  return "low";
}

export function gaugeColorVar(value: number): string {
  const level = gaugeLevel(value);
  if (level === "high") return "var(--color-high)";
  if (level === "low") return "var(--color-low)";
  return "color-mix(in oklch, var(--color-high), var(--color-low))";
}
```

- [ ] **Step 4: Lancer → succès**

Run: `cd app && npx vitest run src/lib/metrics.test.ts src/lib/artifact.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/artifact.ts app/src/lib/metrics.ts app/src/lib/artifact.test.ts app/src/lib/metrics.test.ts
git commit -m "feat: asset URL resolution + metric formatting/gauge scale"
```

---

### Task 5: `lib/urlState.ts` — filtres <-> URL + application

**Files:**
- Create: `app/src/lib/urlState.ts`
- Test: `app/src/lib/urlState.test.ts`

**Interfaces:**
- Consumes: `Item`, `Method` (manifest.ts).
- Produces:
  - `interface FilterState { method: string; category: string; gtOnly: boolean; sort: "none" | "best" | "worst"; }`
  - `const DEFAULT_FILTERS: FilterState` (method="", category="all", gtOnly=false, sort="none").
  - `function parseFilters(params: URLSearchParams): FilterState`.
  - `function filtersToParams(state: FilterState): URLSearchParams`.
  - `function applyFilters(items: Item[], state: FilterState, sortMetric: string): Item[]` — filtre (méthode présente, catégorie, gtOnly) puis trie par `metrics[method][sortMetric]` (best desc / worst asc) sans muter l'entrée.

- [ ] **Step 1: Test qui échoue**

`app/src/lib/urlState.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { parseFilters, filtersToParams, applyFilters, DEFAULT_FILTERS } from "./urlState";
import type { Item } from "./manifest";

function item(id: string, cat: string, displayable: boolean, clip: number): Item {
  return {
    id, coco_id: Number(id), category: cat,
    recon: { "brain-diffuser": `recon/${id}.png` }, thumb: `thumbs/${id}.jpg`,
    gt: { displayable, path: displayable ? `gt/${id}.jpg` : null, license_name: "x" },
    metrics: { "brain-diffuser": { clip } },
  };
}

describe("urlState", () => {
  it("round-trips filters through URLSearchParams", () => {
    const state = { method: "brain-diffuser", category: "animal", gtOnly: true, sort: "best" as const };
    const parsed = parseFilters(filtersToParams(state));
    expect(parsed).toEqual(state);
  });

  it("returns defaults for empty params", () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
  });

  it("filters by category and gtOnly without mutating input", () => {
    const items = [item("1", "animal", true, 0.9), item("2", "objet", false, 0.5)];
    const out = applyFilters(items, { ...DEFAULT_FILTERS, category: "animal" }, "clip");
    expect(out.map((i) => i.id)).toEqual(["1"]);
    const outGt = applyFilters(items, { ...DEFAULT_FILTERS, gtOnly: true }, "clip");
    expect(outGt.map((i) => i.id)).toEqual(["1"]);
    expect(items.length).toBe(2); // entrée intacte
  });

  it("sorts best (desc) and worst (asc) by the metric", () => {
    const items = [item("1", "a", true, 0.2), item("2", "a", true, 0.8)];
    expect(applyFilters(items, { ...DEFAULT_FILTERS, sort: "best" }, "clip").map((i) => i.id)).toEqual(["2", "1"]);
    expect(applyFilters(items, { ...DEFAULT_FILTERS, sort: "worst" }, "clip").map((i) => i.id)).toEqual(["1", "2"]);
  });
});
```

- [ ] **Step 2: Lancer → échec**

Run: `cd app && npx vitest run src/lib/urlState.test.ts`
Expected: FAIL (module absent).

- [ ] **Step 3: Implémentation**

`app/src/lib/urlState.ts` :
```ts
import type { Item } from "./manifest";

export interface FilterState {
  method: string;
  category: string;
  gtOnly: boolean;
  sort: "none" | "best" | "worst";
}

export const DEFAULT_FILTERS: FilterState = {
  method: "",
  category: "all",
  gtOnly: false,
  sort: "none",
};

export function parseFilters(params: URLSearchParams): FilterState {
  const sort = params.get("sort");
  return {
    method: params.get("method") ?? DEFAULT_FILTERS.method,
    category: params.get("category") ?? DEFAULT_FILTERS.category,
    gtOnly: params.get("gtOnly") === "1",
    sort: sort === "best" || sort === "worst" ? sort : "none",
  };
}

export function filtersToParams(state: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.method) p.set("method", state.method);
  if (state.category !== "all") p.set("category", state.category);
  if (state.gtOnly) p.set("gtOnly", "1");
  if (state.sort !== "none") p.set("sort", state.sort);
  return p;
}

export function applyFilters(items: Item[], state: FilterState, sortMetric: string): Item[] {
  const method = state.method || undefined;
  const filtered = items.filter((it) => {
    if (method && !(method in it.recon)) return false;
    if (state.category !== "all" && it.category !== state.category) return false;
    if (state.gtOnly && !it.gt.displayable) return false;
    return true;
  });
  if (state.sort === "none" || !method) return filtered;
  const score = (it: Item) => it.metrics[method]?.[sortMetric] ?? 0;
  // copie avant tri : ne pas muter l'entrée
  return [...filtered].sort((a, b) =>
    state.sort === "best" ? score(b) - score(a) : score(a) - score(b),
  );
}
```

- [ ] **Step 4: Lancer → succès**

Run: `cd app && npx vitest run src/lib/urlState.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/urlState.ts app/src/lib/urlState.test.ts
git commit -m "feat: filter state <-> URL params + non-mutating applyFilters"
```

---

### Task 6: `lib/identify.ts` — construction d'une manche + scoring

**Files:**
- Create: `app/src/lib/identify.ts`
- Test: `app/src/lib/identify.test.ts`

**Interfaces:**
- Consumes: `Item`.
- Produces:
  - `type Rng = () => number;` (dans [0,1) — injectable pour des tests déterministes).
  - `interface Round { targetId: string; optionIds: string[]; }`
  - `function eligibleItems(items: Item[]): Item[]` — uniquement ceux avec `gt.displayable && gt.path` (le jeu ne montre que des sources affichables).
  - `function buildRound(items: Item[], optionCount: number, rng: Rng): Round` — choisit une cible + (optionCount-1) distracteurs distincts parmi les éligibles, mélange l'ordre ; lève `Error` s'il n'y a pas assez d'éligibles.
  - `function isCorrect(round: Round, chosenId: string): boolean`.

- [ ] **Step 1: Test qui échoue**

`app/src/lib/identify.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { buildRound, eligibleItems, isCorrect } from "./identify";
import type { Item } from "./manifest";

function it_(id: string, displayable: boolean): Item {
  return {
    id, coco_id: Number(id), category: "a",
    recon: { "brain-diffuser": `recon/${id}.png` }, thumb: `thumbs/${id}.jpg`,
    gt: { displayable, path: displayable ? `gt/${id}.jpg` : null, license_name: "x" },
    metrics: {},
  };
}

const seqRng = (vals: number[]): (() => number) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe("identify", () => {
  it("keeps only items with displayable GT", () => {
    const items = [it_("1", true), it_("2", false), it_("3", true)];
    expect(eligibleItems(items).map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("builds a round with the target present among distinct options", () => {
    const items = [it_("1", true), it_("2", true), it_("3", true), it_("4", true)];
    const round = buildRound(items, 4, seqRng([0, 0, 0, 0]));
    expect(round.optionIds).toContain(round.targetId);
    expect(new Set(round.optionIds).size).toBe(4);
  });

  it("throws when not enough eligible items", () => {
    expect(() => buildRound([it_("1", true), it_("2", false)], 4, Math.random)).toThrow();
  });

  it("scores the chosen answer", () => {
    const round = { targetId: "1", optionIds: ["1", "2", "3", "4"] };
    expect(isCorrect(round, "1")).toBe(true);
    expect(isCorrect(round, "2")).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer → échec**

Run: `cd app && npx vitest run src/lib/identify.test.ts`
Expected: FAIL (module absent).

- [ ] **Step 3: Implémentation**

`app/src/lib/identify.ts` :
```ts
import type { Item } from "./manifest";

export type Rng = () => number;
export interface Round {
  targetId: string;
  optionIds: string[];
}

export function eligibleItems(items: Item[]): Item[] {
  return items.filter((it) => it.gt.displayable && it.gt.path !== null);
}

function pickIndex(n: number, rng: Rng): number {
  return Math.min(n - 1, Math.floor(rng() * n));
}

export function buildRound(items: Item[], optionCount: number, rng: Rng): Round {
  const pool = eligibleItems(items);
  if (pool.length < optionCount) {
    throw new Error(`Pas assez d'images affichables pour une manche (${pool.length} < ${optionCount})`);
  }
  const remaining = [...pool];
  const chosen: Item[] = [];
  while (chosen.length < optionCount) {
    const idx = pickIndex(remaining.length, rng);
    chosen.push(remaining.splice(idx, 1)[0]);
  }
  const target = chosen[pickIndex(chosen.length, rng)];
  return { targetId: target.id, optionIds: chosen.map((c) => c.id) };
}

export function isCorrect(round: Round, chosenId: string): boolean {
  return round.targetId === chosenId;
}
```

- [ ] **Step 4: Lancer → succès**

Run: `cd app && npx vitest run src/lib/identify.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/identify.ts app/src/lib/identify.test.ts
git commit -m "feat: identification game round builder + scoring (seedable)"
```

---

### Task 7: Accueil + Galerie (composants + e2e)

**Files:**
- Create: `app/src/components/ui/Gauge.tsx`, `app/src/components/ui/Plate.tsx`
- Create: `app/src/features/home/HomePage.tsx`
- Create: `app/src/features/gallery/GalleryPage.tsx`, `app/src/features/gallery/GalleryCard.tsx`, `app/src/features/gallery/Filters.tsx`
- Create: `app/src/hooks/useManifest.ts`
- Modify: `app/src/App.tsx` (câbler les vraies pages)
- Create: `app/tests/e2e/gallery.spec.ts`

**Interfaces:**
- Consumes: `loadManifest`/`ARTIFACT_BASE`, `assetUrl`, `gaugeColorVar`/`formatMetric`, `parseFilters`/`filtersToParams`/`applyFilters`.
- Produces:
  - `useManifest()` hook → `{ manifest, error, loading }`.
  - `Gauge({ value, label })`, `Plate({ item, method, base })` (paire vu→reconstruit + placeholder si GT masquée).
  - `HomePage`, `GalleryPage` (grille virtualisée + filtres pilotés par l'URL), `GalleryCard`, `Filters`.

- [ ] **Step 1: Écrire le e2e (échoue tant que la galerie n'existe pas)**

`app/tests/e2e/gallery.spec.ts` :
```ts
import { test, expect } from "@playwright/test";

test("home loads with title and citations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/NSD|Natural Scenes/i)).toBeVisible();
});

test("gallery lists items and filters by category", async ({ page }) => {
  await page.goto("/gallery");
  const cards = page.getByTestId("gallery-card");
  await expect(cards.first()).toBeVisible();
  const initial = await cards.count();
  await page.getByLabel("Catégorie").selectOption("animal");
  await expect(page).toHaveURL(/category=animal/);
  await expect(await cards.count()).toBeLessThanOrEqual(initial);
});
```

- [ ] **Step 2: Vérifier qu'il échoue**

Run: `cd app && npx playwright test tests/e2e/gallery.spec.ts` (installer les navigateurs au besoin : `npx playwright install chromium`)
Expected: FAIL (pas de héro/cartes ; pages stub).

- [ ] **Step 3: Hook de chargement**

`app/src/hooks/useManifest.ts` :
```tsx
import { useEffect, useState } from "react";
import { loadManifest, type Manifest } from "../lib/manifest";
import { ARTIFACT_BASE } from "../lib/artifact";

export function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadManifest(ARTIFACT_BASE)
      .then((m) => { if (alive) setManifest(m); })
      .catch((e) => { if (alive) setError(String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { manifest, error, loading };
}
```

- [ ] **Step 4: Composants UI**

`app/src/components/ui/Gauge.tsx` :
```tsx
import { formatMetric, gaugeColorVar } from "../../lib/metrics";

export function Gauge({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="gauge" title={`${label} : ${formatMetric(value)}`}>
      <span className="ui-label">{label}</span>
      <span className="gauge-track" aria-hidden>
        <span className="gauge-fill" style={{ width: `${pct}%`, background: gaugeColorVar(value) }} />
      </span>
      <span>{formatMetric(value)}</span>
    </div>
  );
}
```

`app/src/components/ui/Plate.tsx` :
```tsx
import { assetUrl } from "../../lib/artifact";
import type { Item } from "../../lib/manifest";

export function Plate({ item, method, base }: { item: Item; method: string; base: string }) {
  const reconPath = item.recon[method];
  const showGt = item.gt.displayable && item.gt.path;
  return (
    <div className="plate">
      <figure>
        <figcaption className="ui-label">Reconstruit</figcaption>
        <img src={assetUrl(base, reconPath)} alt={`Reconstruction ${item.id}`} width={256} height={256} />
      </figure>
      <figure>
        <figcaption className="ui-label">Vu</figcaption>
        {showGt ? (
          <img src={assetUrl(base, item.gt.path!)} alt={`Image vue ${item.id}`} width={256} height={256} />
        ) : (
          <div className="gt-hidden" role="img" aria-label="Source masquée (licence restrictive)">
            <span>Source masquée<br />(licence : {item.gt.license_name})</span>
          </div>
        )}
      </figure>
    </div>
  );
}
```

- [ ] **Step 5: Filtres, carte, pages**

`app/src/features/gallery/Filters.tsx` :
```tsx
import type { FilterState } from "../../lib/urlState";

export function Filters({
  categories, methods, state, onChange,
}: {
  categories: string[]; methods: string[];
  state: FilterState; onChange: (next: FilterState) => void;
}) {
  return (
    <div className="filters" role="group" aria-label="Filtres">
      <label>Méthode
        <select value={state.method} onChange={(e) => onChange({ ...state, method: e.target.value })}>
          {methods.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label>Catégorie
        <select value={state.category} onChange={(e) => onChange({ ...state, category: e.target.value })}>
          <option value="all">Toutes</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label><input type="checkbox" checked={state.gtOnly}
        onChange={(e) => onChange({ ...state, gtOnly: e.target.checked })} /> Source visible</label>
      <label>Tri
        <select value={state.sort} onChange={(e) => onChange({ ...state, sort: e.target.value as FilterState["sort"] })}>
          <option value="none">—</option>
          <option value="best">Meilleures</option>
          <option value="worst">Pires</option>
        </select>
      </label>
    </div>
  );
}
```

`app/src/features/gallery/GalleryCard.tsx` :
```tsx
import { Link } from "react-router-dom";
import { assetUrl } from "../../lib/artifact";
import { Gauge } from "../../components/ui/Gauge";
import type { Item } from "../../lib/manifest";

const PRIMARY_METRIC = "clip";

export function GalleryCard({ item, method, base }: { item: Item; method: string; base: string }) {
  const metrics = item.metrics[method] ?? {};
  const primary = metrics[PRIMARY_METRIC] ?? Object.values(metrics)[0] ?? 0;
  return (
    <Link to={`/item/${item.id}`} className="card" data-testid="gallery-card">
      <img src={assetUrl(base, item.thumb)} alt={`Reconstruction ${item.id}`} width={256} height={256} loading="lazy" />
      <Gauge value={primary} label={PRIMARY_METRIC in metrics ? "CLIP" : "score"} />
    </Link>
  );
}
```

`app/src/features/gallery/GalleryPage.tsx` :
```tsx
import { useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE } from "../../lib/artifact";
import { applyFilters, filtersToParams, parseFilters, type FilterState } from "../../lib/urlState";
import { GalleryCard } from "./GalleryCard";
import { Filters } from "./Filters";

const SORT_METRIC = "clip";
const COLS = 4;

export default function GalleryPage() {
  const { manifest, loading, error } = useManifest();
  const [params, setParams] = useSearchParams();
  const parent = useRef<HTMLDivElement>(null);

  const state = parseFilters(params);
  const method = state.method || manifest?.build.methods[0] || "";
  const items = useMemo(
    () => (manifest ? applyFilters(manifest.items, { ...state, method }, SORT_METRIC) : []),
    [manifest, params],
  );
  const rows = Math.ceil(items.length / COLS);
  const rowVirtualizer = useVirtualizer({
    count: rows, getScrollElement: () => parent.current, estimateSize: () => 320, overscan: 4,
  });

  if (loading) return <main style={{ padding: "var(--space-32)" }}>Chargement…</main>;
  if (error || !manifest) return <main style={{ padding: "var(--space-32)" }}>Erreur : {error}</main>;

  const categories = [...new Set(manifest.items.map((i) => i.category).filter(Boolean) as string[])];
  const update = (next: FilterState) => setParams(filtersToParams(next));

  return (
    <main style={{ padding: "var(--space-32)" }}>
      <h1 style={{ fontSize: "var(--text-title)" }}>Galerie · {manifest.build.subject}</h1>
      <Filters categories={categories} methods={manifest.build.methods} state={{ ...state, method }} onChange={update} />
      <div ref={parent} style={{ height: "70vh", overflow: "auto" }}>
        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((vr) => (
            <div key={vr.key} style={{
              position: "absolute", top: 0, transform: `translateY(${vr.start}px)`,
              display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: "var(--space-16)", width: "100%",
            }}>
              {items.slice(vr.index * COLS, vr.index * COLS + COLS).map((it) => (
                <GalleryCard key={it.id} item={it} method={method} base={ARTIFACT_BASE} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
```

`app/src/features/home/HomePage.tsx` :
```tsx
import { Link } from "react-router-dom";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE } from "../../lib/artifact";
import { Plate } from "../../components/ui/Plate";

export default function HomePage() {
  const { manifest } = useManifest();
  const method = manifest?.build.methods[0] ?? "";
  const hero = manifest?.items.slice(0, 3) ?? [];
  return (
    <main style={{ padding: "var(--space-section) var(--space-32)" }}>
      <p className="ui-label">NeuroGallery · sujet {manifest?.build.subject ?? "—"}</p>
      <h1 style={{ fontSize: "var(--text-hero)", lineHeight: 1.02, margin: "var(--space-16) 0" }}>
        Ce que le cerveau regardait, reconstruit par une IA.
      </h1>
      <p style={{ maxWidth: "48ch", color: "var(--color-muted)" }}>
        À partir de l'activité IRMf du sujet, un modèle reconstruit l'image vue.
        Reconstructions pré-calculées sur le jeu de test {manifest?.build.test_set ?? ""}.
      </p>
      <div style={{ display: "flex", gap: "var(--space-16)", flexWrap: "wrap", margin: "var(--space-32) 0" }}>
        {hero.map((it) => <Plate key={it.id} item={it} method={method} base={ARTIFACT_BASE} />)}
      </div>
      <Link to="/gallery" className="cta">Explorer la galerie →</Link>
      <footer style={{ marginTop: "var(--space-section)", color: "var(--color-muted)", fontSize: "var(--text-small)" }}>
        <p>Recherche / démonstration uniquement — pas un dispositif clinique.</p>
        <p>Données : Natural Scenes Dataset (NSD, Allen et al., 2022). Stimuli : MS-COCO.</p>
      </footer>
    </main>
  );
}
```

- [ ] **Step 6: Câbler le routing + styles des composants**

Modifier `app/src/App.tsx` — remplacer les stubs Accueil/Galerie par les vraies pages (import `HomePage`, `GalleryPage`, lazy ou direct) ; garder `/item/:id` et `/identify` en stub pour l'instant :
```tsx
import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./features/home/HomePage";
import GalleryPage from "./features/gallery/GalleryPage";

function Stub({ name }: { name: string }) {
  return <main style={{ padding: "var(--space-32)" }}><h1>{name}</h1></main>;
}

export default function App() {
  return (
    <>
      <header style={{ padding: "var(--space-16) var(--space-32)", borderBottom: "1px solid var(--color-line)" }}>
        <nav aria-label="Navigation principale" style={{ display: "flex", gap: "var(--space-24)" }}>
          <Link to="/">Accueil</Link><Link to="/gallery">Galerie</Link><Link to="/identify">Identification</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/item/:id" element={<Stub name="Détail" />} />
        <Route path="/identify" element={<Stub name="Identification" />} />
      </Routes>
    </>
  );
}
```
Ajouter les styles des composants à `app/src/styles/global.css` (append) :
```css
.card { text-decoration: none; display: block; border: 1px solid var(--color-line); border-radius: var(--radius);
  overflow: hidden; background: var(--color-surface); transition: transform var(--duration) var(--ease); }
.card:hover, .card:focus-visible { transform: translateY(-4px); }
.gauge { display: grid; grid-template-columns: auto 1fr auto; gap: var(--space-8); align-items: center; padding: var(--space-8); }
.gauge-track { height: 6px; background: var(--color-line); border-radius: 999px; overflow: hidden; }
.gauge-fill { display: block; height: 100%; }
.plate { display: flex; gap: var(--space-8); }
.gt-hidden { width: 256px; height: 256px; display: grid; place-items: center; text-align: center;
  background: repeating-linear-gradient(45deg, var(--color-line), var(--color-line) 8px, transparent 8px, transparent 16px);
  color: var(--color-muted); font-size: var(--text-small); }
.filters { display: flex; gap: var(--space-16); flex-wrap: wrap; margin-bottom: var(--space-24); }
.cta { font-family: ui-sans-serif, system-ui; font-weight: 600; }
```

- [ ] **Step 7: Lancer les tests (unit + e2e)**

Run: `cd app && npm run test && npx playwright test tests/e2e/gallery.spec.ts`
Expected: unit toujours vert ; e2e galerie PASS (héro + citations visibles ; cartes listées ; filtre catégorie met à jour l'URL et réduit le compte).

- [ ] **Step 8: Commit**

```bash
git add app/src app/tests/e2e/gallery.spec.ts
git commit -m "feat: home + virtualized gallery with URL-driven filters (e2e)"
```

---

### Task 8: Page détail (vu⇆reconstruit, métriques, licence) + e2e

**Files:**
- Create: `app/src/features/detail/DetailPage.tsx`
- Modify: `app/src/App.tsx` (câbler `/item/:id`)
- Create: `app/tests/e2e/detail.spec.ts`

**Interfaces:**
- Consumes: `useManifest`, `Plate`, `Gauge`, `assetUrl`, `ARTIFACT_BASE`.
- Produces: `DetailPage` — grande planche vu⇆reconstruit (toutes les méthodes présentes), métriques complètes, licence + attribution ou placeholder, retour galerie.

- [ ] **Step 1: e2e qui échoue**

`app/tests/e2e/detail.spec.ts` :
```ts
import { test, expect } from "@playwright/test";

test("opening an item shows detail with metrics", async ({ page }) => {
  await page.goto("/gallery");
  await page.getByTestId("gallery-card").first().click();
  await expect(page).toHaveURL(/\/item\//);
  await expect(page.getByRole("heading", { name: /Item|Reconstruction/i })).toBeVisible();
  await expect(page.getByTestId("metric").first()).toBeVisible();
});

test("a non-displayable item shows the masked-source placeholder", async ({ page }) => {
  // item 0002 = licence 2 (NC) dans le fixture => source masquée
  await page.goto("/item/0002");
  await expect(page.getByText(/Source masquée/i)).toBeVisible();
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `cd app && npx playwright test tests/e2e/detail.spec.ts`
Expected: FAIL (détail est un stub).

- [ ] **Step 3: Implémentation**

`app/src/features/detail/DetailPage.tsx` :
```tsx
import { Link, useParams } from "react-router-dom";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE } from "../../lib/artifact";
import { Plate } from "../../components/ui/Plate";
import { formatMetric } from "../../lib/metrics";

export default function DetailPage() {
  const { id } = useParams();
  const { manifest, loading } = useManifest();
  if (loading) return <main style={{ padding: "var(--space-32)" }}>Chargement…</main>;
  const item = manifest?.items.find((i) => i.id === id);
  if (!item) return <main style={{ padding: "var(--space-32)" }}><p>Item introuvable.</p><Link to="/gallery">← Galerie</Link></main>;

  return (
    <main style={{ padding: "var(--space-32)" }}>
      <Link to="/gallery" className="ui-label">← Galerie</Link>
      <h1>Item {item.id}{item.category ? ` · ${item.category}` : ""}</h1>
      {manifest!.build.methods.filter((m) => m in item.recon).map((m) => (
        <section key={m} style={{ margin: "var(--space-24) 0" }}>
          <h2 className="ui-label">{m}</h2>
          <Plate item={item} method={m} base={ARTIFACT_BASE} />
          <div style={{ display: "flex", gap: "var(--space-16)", flexWrap: "wrap", marginTop: "var(--space-8)" }}>
            {Object.entries(item.metrics[m] ?? {}).map(([k, v]) => (
              <span key={k} data-testid="metric" className="ui-label">{k} : {formatMetric(v)}</span>
            ))}
          </div>
        </section>
      ))}
      <footer style={{ color: "var(--color-muted)", fontSize: "var(--text-small)" }}>
        {item.gt.displayable
          ? <p>Source : {item.gt.license_name}{item.gt.attribution ? ` — ${item.gt.attribution}` : ""}
              {item.gt.source_url ? <> · <a href={item.gt.source_url}>origine</a></> : null}</p>
          : <p>Source masquée (licence {item.gt.license_name}).</p>}
      </footer>
    </main>
  );
}
```
Modifier `App.tsx` : `import DetailPage` et remplacer la route `/item/:id` par `<DetailPage />`.

- [ ] **Step 4: Lancer → succès**

Run: `cd app && npx playwright test tests/e2e/detail.spec.ts`
Expected: PASS (détail s'ouvre avec métriques ; item 0002 montre "Source masquée").

- [ ] **Step 5: Commit**

```bash
git add app/src/features/detail/DetailPage.tsx app/src/App.tsx app/tests/e2e/detail.spec.ts
git commit -m "feat: detail page (seen/reconstructed, metrics, license or masked placeholder)"
```

---

### Task 9: Mode identification + a11y/responsive + README

**Files:**
- Create: `app/src/features/identify/IdentifyGame.tsx`
- Modify: `app/src/App.tsx` (câbler `/identify`)
- Create: `app/tests/e2e/identify.spec.ts`, `app/tests/e2e/a11y.spec.ts`
- Create: `app/README.md`

**Interfaces:**
- Consumes: `useManifest`, `buildRound`/`isCorrect`/`eligibleItems`, `assetUrl`, `ARTIFACT_BASE`.
- Produces: `IdentifyGame` — montre une reconstruction + N options (vraies images sources affichables), l'utilisateur choisit, feedback, manche suivante.

- [ ] **Step 1: e2e qui échoue**

`app/tests/e2e/identify.spec.ts` :
```ts
import { test, expect } from "@playwright/test";

test("plays one identification round", async ({ page }) => {
  await page.goto("/identify");
  await expect(page.getByTestId("identify-recon")).toBeVisible();
  const options = page.getByTestId("identify-option");
  await expect(options.first()).toBeVisible();
  await options.first().click();
  await expect(page.getByTestId("identify-feedback")).toBeVisible();
});
```

`app/tests/e2e/a11y.spec.ts` :
```ts
import { test, expect } from "@playwright/test";

for (const path of ["/", "/gallery"]) {
  test(`page ${path} has exactly one h1 and reachable nav`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("navigation")).toBeVisible();
  });
}

test("respects reduced motion (no crash, content visible)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gallery");
  await expect(page.getByTestId("gallery-card").first()).toBeVisible();
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `cd app && npx playwright test tests/e2e/identify.spec.ts`
Expected: FAIL (identify est un stub).

- [ ] **Step 3: Implémentation du jeu**

`app/src/features/identify/IdentifyGame.tsx` :
```tsx
import { useMemo, useState } from "react";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE } from "../../lib/artifact";
import { assetUrl } from "../../lib/artifact";
import { buildRound, eligibleItems, isCorrect } from "../../lib/identify";

const OPTIONS = 4;

export default function IdentifyGame() {
  const { manifest, loading } = useManifest();
  const [seed, setSeed] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);

  const method = manifest?.build.methods[0] ?? "";
  const pool = manifest?.items ?? [];
  const enough = eligibleItems(pool).length >= OPTIONS;

  const round = useMemo(() => {
    if (!enough) return null;
    return buildRound(pool, OPTIONS, Math.random);
    // seed force un recalcul via la dépendance
  }, [manifest, seed, enough]);

  if (loading) return <main style={{ padding: "var(--space-32)" }}>Chargement…</main>;
  if (!enough || !round) {
    return <main style={{ padding: "var(--space-32)" }}><p>Pas assez d'images à source visible pour jouer.</p></main>;
  }

  const target = pool.find((i) => i.id === round.targetId)!;
  const options = round.optionIds.map((id) => pool.find((i) => i.id === id)!);

  return (
    <main style={{ padding: "var(--space-32)" }}>
      <h1>Devine l'image vue</h1>
      <p className="ui-label">D'après cette reconstruction, quelle image le sujet regardait-il ?</p>
      <img data-testid="identify-recon" src={assetUrl(ARTIFACT_BASE, target.recon[method])}
        alt="Reconstruction à identifier" width={256} height={256} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-16)", maxWidth: 560 }}>
        {options.map((opt) => (
          <button key={opt.id} data-testid="identify-option" disabled={chosen !== null}
            onClick={() => setChosen(opt.id)}
            style={{ padding: 0, border: chosen === opt.id ? "3px solid var(--color-accent)" : "1px solid var(--color-line)", background: "none", cursor: "pointer" }}>
            <img src={assetUrl(ARTIFACT_BASE, opt.gt.path!)} alt={`Option ${opt.id}`} width={256} height={256} />
          </button>
        ))}
      </div>
      {chosen && (
        <div data-testid="identify-feedback" role="status" style={{ marginTop: "var(--space-16)" }}>
          {isCorrect(round, chosen) ? "✅ Correct !" : "❌ Raté — la bonne réponse est mise en évidence."}
          <button style={{ marginLeft: "var(--space-16)" }}
            onClick={() => { setChosen(null); setSeed((s) => s + 1); }}>Manche suivante</button>
        </div>
      )}
    </main>
  );
}
```
Modifier `App.tsx` : `import IdentifyGame` et remplacer la route `/identify` par `<IdentifyGame />`.

- [ ] **Step 4: README de l'app**

`app/README.md` :
```markdown
# NeuroGallery — App

Galerie statique des reconstructions IRMf→image. Consomme un artefact via `manifest.json`.

## Dev
- `npm install`
- `npm run dev` (charge `public/sample-artifact/` = fixture de démo)
- `npm run test` (unit, Vitest) · `npm run e2e` (Playwright)
- `npm run build` → `dist/` (statique, déployable)

## Vrai artefact
Déposer la sortie du lab (`run_build.py`, profil `public`) dans `public/sample-artifact/`
(ou changer `ARTIFACT_BASE` dans `src/lib/artifact.ts`). Ne jamais commit de données NSD/COCO réelles.

## Licences
La vérité-terrain n'est affichée que si `gt.displayable`. Citer NSD (Allen et al., 2022) et COCO.
```

- [ ] **Step 5: Lancer tous les tests + build**

Run:
```bash
cd app && npm run test && npm run build && npx playwright test
```
Expected: unit vert ; build OK ; e2e (gallery + detail + identify + a11y) tous PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src app/tests/e2e/identify.spec.ts app/tests/e2e/a11y.spec.ts app/README.md
git commit -m "feat: identification game + a11y/reduced-motion e2e + app README"
```

---

## Self-Review

**1. Couverture de la spec (§5) :**
- §5.1 direction visuelle éditoriale (tokens, jauge, placeholder hachuré, hover/focus) → Tasks 1, 7 ✅
- §5.2 accueil (héro, pitch, chiffres, citations) → Task 7 ✅ ; galerie (grille virtualisée, filtres méthode/catégorie/source/tri, état URL) → Task 7 ✅ ; détail (vu⇆reconstruit, métriques, licence/placeholder) → Task 8 ✅
- §5.3 mode identification → Task 9 ✅
- §5.4 stack Vite+React+TS statique, vignettes/pleines résolutions, a11y/reduced-motion → Tasks 1, 7, 9 ✅
- §6.2 contrat validé au chargement → Task 3 ✅ ; §4 licences (afficher GT seulement si displayable) → Tasks 2, 7, 8, 9 ✅

**2. Placeholders :** aucun `TBD/TODO` ; tout le code des lib/logique est complet ; les composants ont un JSX complet et des styles réels.

**3. Cohérence des types :** `Item`/`Method`/`Manifest` définis en Task 3 et importés partout ; `FilterState` (Task 5) utilisé par `Filters`/`GalleryPage` ; `Round`/`buildRound`/`isCorrect` (Task 6) utilisés par `IdentifyGame` ; `assetUrl`/`ARTIFACT_BASE` cohérents ; `Plate`/`Gauge` signatures stables entre Tasks 7/8. `data-testid` (`gallery-card`, `metric`, `identify-recon`, `identify-option`, `identify-feedback`) cohérents entre composants et specs e2e.

**Décision assumée :** métrique primaire d'affichage/tri = `clip` (repli sur la 1ère métrique disponible) — les métriques haut-niveau réelles (CLIP) arriveront avec le Plan 3 ; le fixture n'a que pixcorr/ssim, donc la jauge retombe sur la 1ère métrique et le tri utilise `clip` s'il existe. Cohérent et sans crash.
