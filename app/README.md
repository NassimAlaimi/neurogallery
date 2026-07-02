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

## Build & déploiement

`npm run build` lance `tsc -b && vite build`. La config Vite (`vite.config.ts`) fixe
`base: "/"` (absolu) : les routes client à 2+ segments (ex. `/item/0000`) et le fallback
SPA résolvent alors correctement les assets et `sample-artifact/manifest.json` par
rapport à la racine du site.

**Déploiement sous un sous-chemin** (ex. GitHub Pages en tant que *project page*,
servie sous `https://<user>.github.io/<repo>/`) : la base `/` ne suffit plus, il faut
la surcharger via le flag CLI de Vite au build :

```bash
npx vite build --base=/<repo>/
```

Sans ce `--base`, les chemins générés dans `dist/index.html` (JS/CSS) et les appels
`fetch` vers `sample-artifact/manifest.json` pointent vers la racine du domaine au lieu
du sous-dossier du repo → 404 silencieux (le serveur GitHub Pages renvoie souvent une
page HTML de secours à la place du JSON/JS attendu, ce qui casse le parsing côté
client). Adapter `<repo>` au nom réel du dépôt/sous-chemin de déploiement.

**SPA fallback pour les deep links** : Comme c'est une SPA avec routing côté client, les
deep links (`/item/0000`) retourneront 404 lors d'une actualisation ou partage direct sur
un hébergement statique, sauf si un SPA history fallback est configuré. Exemples : GitHub
Pages via `404.html` (copie d'`index.html`), Netlify via `_redirects` (`/*  /index.html  200`),
ou le paramètre SPA fallback de votre hôte.

## Licences
La vérité-terrain n'est affichée que si `gt.displayable`. Citer NSD (Allen et al., 2022) et COCO.
