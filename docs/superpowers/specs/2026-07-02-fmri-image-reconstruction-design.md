# NeuroGallery — Reconstruction d'images vues à partir de l'IRMf

**Date :** 2026-07-02
**Statut :** Design validé (en attente de relecture utilisateur avant plan d'implémentation)
**Type :** Projet perso, fun/exploration — NeuroAI / neuroimagerie

---

## 1. Contexte & objectif

Reconstruire l'image naturelle qu'un sujet regardait à partir de son activité
cérébrale (IRMf), dans la lignée des travaux **Brain-Diffuser / MindEye** sur le
**Natural Scenes Dataset (NSD)**, puis présenter ces reconstructions dans une **app
web statique, explorable et partageable**.

Objectif = démonstration marquante ("voici l'image que ton cerveau regardait,
reconstruite par une IA"), pas un produit clinique ni une contribution de recherche
originale.

### Décisions verrouillées (issues du brainstorming)

| Décision | Choix |
|---|---|
| Livrable | App interactive partageable |
| Production des reconstructions | **Galerie pré-calculée** (le modèle ne tourne jamais dans l'app) |
| Ambition qualité | Viser la meilleure qualité (type MindEye) |
| Compute | **100% local** sur RTX 5070 (12 Go, Blackwell sm_120) / WSL2 — pas de cloud |
| Feature identification | **Incluse** (jeu "devine l'image vue") |

### Non-objectifs (YAGNI)

- Pas de backend d'inférence live, pas de serveur GPU hébergé.
- Pas d'entraînement de MindEye2 de zéro (infaisable localement : 8×A100).
- Pas d'usage clinique ; pas de multi-sujets au départ (subj01 seul).
- Pas de rehébergement des données NSD/COCO.

---

## 2. Architecture

Trois blocs nettement séparés, reliés par **un seul contrat de données** (`manifest.json`) :

```
┌─────────────────────┐     ┌───────────────────────┐     ┌─────────────────────┐
│   1. LAB (offline)  │     │  2. ARTEFACT (bundle)  │     │   3. APP (statique) │
│   Python / PyTorch  │ ──> │  images + manifest.json│ ──> │   web, hébergeable  │
│   RTX 5070 / WSL2   │     │  (le seul contrat)     │     │   par simple lien   │
└─────────────────────┘     └───────────────────────┘     └─────────────────────┘
```

- **Lab** : seul bloc qui touche le GPU, PyTorch et les données NSD. Tourne une fois
  hors-ligne pour produire l'artefact.
- **Artefact** : dossier auto-suffisant (reconstructions + `manifest.json` +
  métriques + vignettes). Contrat unique lab↔app.
- **App** : site statique consommant l'artefact. Aucune dépendance PyTorch/GPU/NSD →
  partageable par lien (GitHub Pages / Netlify / Vercel).

**Alternatives écartées :** backend d'inférence live (exclu par le choix "galerie
pré-calculée" + non-partageable) ; monorepo avec backend applicatif (inutile pour une
galerie statique).

### Le "curseur qualité" en contexte 100% local

Comme l'entraînement cloud est exclu, on vise la meilleure qualité **atteignable
localement** via une **échelle de fidélité** :

1. **Plancher garanti — Brain-Diffuser** : régression ridge (minutes, voire CPU) +
   VDVAE + Versatile Diffusion en inférence sur 12 Go. Fait vivre toute la chaîne sans
   risque d'OOM ni de cloud.
2. **Palier qualité — MindEye2 en inférence depuis les poids publiés** : si un
   checkpoint utilisable pour subj01 tient dans 12 Go (avec offload CPU), on remplace
   les reconstructions par du quasi-SOTA. **Inférence pure uniquement** (pas
   d'entraînement).

L'app affiche l'un ou l'autre sans changer de forme.

---

## 3. Bloc 1 — Le Lab (offline)

Quatre étapes, chacune un module isolé.

### 3.0 Validation de la chaîne d'outils (jalon zéro)

Script de sanity-check préalable (la 5070 Blackwell sm_120 est récente ; une roue
PyTorch de mauvaise architecture peut échouer *silencieusement*) :

- `torch.cuda.get_device_capability()` == `(12, 0)` ;
- micro-inférence Stable Diffusion 1.5 → image plausible ;
- rappels WSL2 : pilote NVIDIA **côté Windows uniquement** (jamais de pilote Linux dans
  WSL) ; roues **`cu128`** (PyTorch ≥ 2.7) ; données sur le FS Linux (`~/`), jamais
  `/mnt/c` ; `torch.cuda.is_bf16_supported()` attendu `True` (FP8 non exposé sous WSL,
  mais non pertinent ici).

### 3.1 Acquisition des données (`data/acquire`)

- Cible : **subj01** uniquement (1 des 4 sujets ayant terminé les 40 sessions :
  subj01/02/05/07 — les seuls utilisés par les papers de reconstruction).
- Source : dataset repackagé **`pscotti/mindeyev2`** (HuggingFace) — betas subj01 déjà
  masqués sur la ROI `nsdgeneral` (`betas_all_subj01_fp32_renorm.hdf5` ≈ 1,9 Go ;
  matrice ~30 000 essais × ~15 724 voxels) + images COCO 224px
  (`coco_images_224_float16.hdf5` ≈ 22 Go). Téléchargement **sélectif**
  (`hf_hub_download`) pour sauter checkpoints et `train_logs/`.
  Alternative : webdataset MindEye1 `pscotti/naturalscenesdataset` (bundle voxels +
  image par échantillon).
- Set de test = **shared1000** (1 000 images vues par tous les sujets).
- **On ne rehéberge jamais** NSD/COCO ; données en local hors dépôt (`.gitignore`).
- Pré-requis administratif : signer la *Data Access Agreement* NSD et **lire les
  *Terms & Conditions*** (voir Risques §8).

### 3.2 Moteur de reconstruction (`reconstruct/`) — le cœur

Interface unique (patron *stratégie*), immuable :

```python
class Reconstructor(Protocol):
    def fit(self, betas_train, images_train) -> "Reconstructor": ...  # renvoie une copie ajustée
    def reconstruct(self, betas) -> Image: ...                        # betas → image PIL
```

Implémentations :

- **`BrainDiffuserReconstructor`** (plancher) : régressions ridge
  `fMRI → {latent VDVAE, embeddings CLIP-image, CLIP-texte}`, puis VDVAE (ébauche
  basse-fréquence) + **Versatile Diffusion** (reconstruction sémantique). Corriger le
  défaut connu du repo (suppose 2 GPU) pour tourner sur une carte, en fp16 +
  `enable_attention_slicing()` / `enable_vae_tiling()`.
- **`MindEye2Reconstructor`** (palier) : chargement des **poids publiés**, mapping
  `betas → embeddings unCLIP SDXL`, génération. Inférence pure +
  `enable_model_cpu_offload()` si VRAM juste.
- **`FakeReconstructor`** (tests) : renvoie une image fixe — permet de tester toute
  l'orchestration sans GPU.

Chaque reconstructeur est **piloté par config** (chemins, pas de diffusion, dtype,
flags mémoire) — aucune valeur en dur.

### 3.3 Métriques (`metrics/`)

Fonctions **pures**, une par métrique, calculées en local (où la vérité-terrain est
visible) :

- **Bas niveau** : PixCorr, SSIM, AlexNet(2), AlexNet(5).
- **Haut niveau** : similarité CLIP, EfficientNet.
- **Identification 2-voies** : la reconstruction ressemble-t-elle plus à la bonne image
  qu'à une image aléatoire ? (métrique la plus intuitive, réutilisée par le jeu).

Axes alignés sur le tableau de MindEye2 → chiffres comparables à la littérature.

### 3.4 Construction de l'artefact (`build/`)

Pour chaque image de shared1000 (subj01) → reconstruire → calculer les métriques →
générer les **vignettes** → écrire l'artefact. Propriétés :

- **Idempotent & reprenable** (cache par hash de contenu ; reprise possible en cas de
  coupure).
- Flag `--method brain-diffuser|mindeye2` (on peut générer les deux jeux).
- Flag `--profile local|public` (voir §4).

### 3.5 Gestion d'erreurs / robustesse

- Contrôles d'intégrité au chargement (dimensions des betas, ROI ~15 724 voxels,
  cohérence essai→image).
- **Repli automatique** : OOM de `MindEye2Reconstructor` malgré offload → bascule
  journalisée sur `BrainDiffuser`, pas de crash à mi-parcours.
- Aucun écrasement en place : chaque run d'artefact est horodaté/versionné.

---

## 4. Bloc 2 — Licences & format de l'artefact

**Principe :** les reconstructions (sorties de modèle) sont **toujours** affichables ;
la vérité-terrain (photo COCO) ne l'est **que** si sa licence le permet. La règle est
encodée *dans l'artefact* → l'app ne prend aucune décision juridique.

### 4.1 Module de résolution de licence (`licensing/`)

Fonction pure `resolve_gt_license(coco_id) -> GtLicense` lisant le `license` id des
annotations COCO :

| license id COCO | Nom | Public ? |
|---|---|---|
| 4 | CC BY 2.0 | ✅ avec attribution |
| 5 | CC BY-SA 2.0 | ✅ avec attribution |
| 7 | No known copyright restrictions | ✅ |
| 8 | US Government Work | ✅ |
| 1, 2, 3, 6 | CC BY-NC / BY-ND (variantes) | ❌ |
| autre / inconnu | — | ❌ |

> Note : le mapping des `license` id peut varier légèrement selon l'année de release
> COCO — lire le tableau `licenses` du JSON d'annotations réellement utilisé.

### 4.2 Deux profils de build, un seul schéma

- **`local`** (pour l'auteur) : toutes les vérités-terrain présentes.
- **`public`** (lien partageable) : reconstructions toujours là ; vérité-terrain
  présente **uniquement** pour le sous-ensemble permissif (ids 4/5/7/8) avec
  attribution ; sinon placeholder "source masquée (licence restrictive)".

L'app lit le même `manifest.json` et s'adapte au drapeau `displayable` → un seul
front-end, deux bundles.

### 4.3 Structure de l'artefact

```
artifact_<timestamp>/
├── manifest.json          # le contrat unique
├── recon/                 # reconstructions (toujours publiques)
│   ├── 0001_brain-diffuser.png
│   └── 0001_mindeye2.png
├── gt/                    # vérités-terrain — sous-ensemble permissif en profil public
│   └── 0001.jpg
├── thumbs/                # vignettes (grille légère)
└── metrics_summary.json   # agrégats par méthode (accueil)
```

### 4.4 Schéma d'un item du manifest

```json
{
  "build": { "subject": "subj01", "test_set": "shared1000",
             "methods": ["brain-diffuser", "mindeye2"], "profile": "public" },
  "items": [{
    "id": "0001",
    "coco_id": 123456,
    "category": "animal",
    "recon": { "brain-diffuser": "recon/0001_brain-diffuser.png",
               "mindeye2": "recon/0001_mindeye2.png" },
    "thumb": "thumbs/0001.jpg",
    "gt": { "displayable": true, "path": "gt/0001.jpg",
            "license_name": "CC BY 2.0",
            "attribution": "Photo Flickr, CC BY 2.0",
            "source_url": "https://www.flickr.com/..." },
    "metrics": { "brain-diffuser": { "pixcorr": 0.27, "clip": 0.71 },
                 "mindeye2":       { "pixcorr": 0.32, "clip": 0.79 } }
  }]
}
```

Image non-affichable : `"gt": { "displayable": false, "path": null, "license_name": "CC BY-NC 2.0" }`.

### 4.5 Règles dures (encodées)

- Jamais de copie de données NSD / de l'ensemble complet des stimuli COCO dans le
  dépôt/artefact ; le profil public ne contient que le sous-ensemble permissif + les
  sorties de modèle.
- Citations obligatoires portées par l'app : **NSD (Allen et al., 2022, Nature
  Neuroscience)** et **COCO**.
- Vérification des *Terms & Conditions* NSD = pré-requis **bloquant** avant mise en
  ligne.

---

## 5. Bloc 3 — L'app galerie

Site **statique** consommant l'artefact. Aucun serveur, GPU, ni donnée NSD embarquée.

### 5.1 Direction visuelle

**Galerie éditoriale "laboratoire"** — les images sont les héros, fond sobre,
typographie à fort contraste d'échelle, esthétique quasi-muséale. Chaque paire
**vu → reconstruit** = une "planche" ; la métrique est un élément de design (jauge, pas
un chiffre perdu). Palette réduite, accents sémantiques (vert = haute similarité,
ambre = faible). Hiérarchie par l'échelle, profondeur par superposition légère, états
hover/focus soignés, `prefers-reduced-motion` honoré. (Anti-template : pas de grille de
cartes générique.)

### 5.2 Écrans

- **Accueil** : titre fort + pitch, sujet subj01 / méthode, bandeau héro (strip de
  planches vu→reconstruit), chiffres agrégés (CLIP moy., PixCorr moy. par méthode),
  disclaimer + citations.
- **Galerie** : grille **virtualisée** (~1 000 items). Filtres : méthode · catégorie ·
  "source visible" · tri par métrique (meilleures / pires). Carte : reconstruction
  (+ source si autorisée) + jauge. **État des filtres dans l'URL** (partage d'une vue
  filtrée).
- **Détail** : vu ⇆ reconstruit en grand (les 2 méthodes si dispo), métriques
  complètes, catégorie, licence + attribution (ou placeholder).

### 5.3 Mode identification (inclus)

Jeu : une reconstruction + 4 images candidates → l'utilisateur devine laquelle le sujet
regardait. Rend la métrique d'identification 2-voies *jouable*. Ne fonctionne qu'avec
des images sources affichables (sous-ensemble permissif).

### 5.4 Stack & contraintes

- **Vite + React + TypeScript**, build statique. Déployable GitHub Pages / Netlify /
  Vercel.
- Vignettes générées par le lab (grille légère) + pleines résolutions (détail) → budgets
  perf web respectés.
- Accessibilité : navigation clavier, contraste, alt text, `reduced-motion`.

---

## 6. Structure du projet, isolation & tests

### 6.1 Arborescence

```
neuro/
├── lab/                          # Python — le lab offline
│   ├── neurogallery/
│   │   ├── data/                 # acquisition, chargement, intégrité
│   │   ├── licensing/            # résolution licence COCO (pur, sans I/O)
│   │   ├── reconstruct/          # Reconstructor + brain_diffuser.py + mindeye2.py + fake.py
│   │   ├── metrics/              # métriques (pures)
│   │   ├── build/                # orchestration → artefact (manifest, vignettes)
│   │   └── config.py             # config typée, zéro valeur en dur
│   ├── tests/{unit,integration}/
│   ├── scripts/                  # sanity-check, run du build
│   └── pyproject.toml
├── app/                          # Vite + React + TS — galerie statique
│   ├── src/
│   │   ├── features/{home,gallery,detail,identify}/
│   │   ├── lib/                  # loader manifest, types, état-URL
│   │   ├── components/ui/
│   │   └── styles/               # tokens.css…
│   ├── tests/                    # vitest (unit) + playwright (e2e)
│   └── package.json
├── manifest.schema.json          # LE contrat, partagé lab↔app
├── data/        (gitignored)     # NSD/COCO bruts — jamais commit
├── artifact/    (gitignored)     # sorties (+ petit échantillon commit pour la démo)
├── docs/superpowers/specs/       # ce doc
└── README.md
```

Fichiers petits et ciblés (200-400 lignes typiques), organisés par domaine.

### 6.2 Le contrat unique : `manifest.schema.json`

JSON Schema validé des **deux côtés** : côté lab **à l'écriture** (fail fast si un item
est mal formé) ; côté app **au chargement** (jamais confiance en une donnée externe ;
types TS reflétant le schéma). Le lab peut évoluer sans toucher l'app tant que le schéma
tient.

### 6.3 Frontières des modules (quoi / comment / dépend de)

- **`licensing`** — `coco_id → {displayable, attribution}` ; dépend des annotations COCO.
  Pur, trivial à tester.
- **`reconstruct`** — `betas → image` via `Reconstructor.reconstruct()` ; dépend
  des poids + GPU. Implémentation interchangeable.
- **`build`** — orchestration → artefact ; dépend des modules ci-dessus **via leurs
  interfaces**.
- **`app`** — dépend du manifest, point.

### 6.4 Stratégie de test (pragmatique pour un projet ML)

On teste le **déterministe et porteur de bugs** ; on ne teste pas la sortie stochastique
d'un diffuseur.

- **Unit (lab)** : `licensing` (mapping + attribution), `metrics` (vecteurs connus →
  valeurs connues, schéma AAA), `build` (manifest valide vis-à-vis du schéma).
- **Intégration (lab)** : pipeline complet avec `FakeReconstructor` sur mini-fixture
  synthétique → valide l'orchestration **sans GPU ni diffusion**.
- **Smoke (lab, hors CI)** : les vrais reconstructeurs chargent et sortent une image de
  la bonne forme ; marqué `@gpu`, lancé à la main.
- **Unit (app, vitest)** : parsing manifest, état-URL, placeholder licence, logique du
  jeu d'identification (bonne réponse + distracteurs).
- **E2E (app, Playwright)** : galerie charge, filtre marche, détail s'ouvre, manche
  d'identification jouée ; a11y, régression visuelle (320/768/1024/1440),
  `reduced-motion`.

---

## 7. Jalons ordonnés (portée, pas de calendrier)

0. **M0** — sanity-check chaîne d'outils (sm_120, `cu128`, micro-inférence SD).
1. **M1** — Brain-Diffuser de bout en bout sur une **petite tranche** (~50 images) →
   lab → artefact → app minimale affichant des planches. *Toute la chaîne vit.*
2. **M2** — build complet sur shared1000 + galerie + filtres + détail.
3. **M3** — tentative MindEye2 en inférence (poids publiés) ; repli propre sur
   Brain-Diffuser si OOM.
4. **M4** — mode identification + finitions design + build public (licences) +
   déploiement.

---

## 8. Risques & questions ouvertes (à confirmer avant/pendant l'implémentation)

- **Terms & Conditions NSD (bloquant avant publication)** : le texte exact
  (redistribution des stimuli, publication de reconstructions) n'a pas pu être lu (page
  gatée/JS). À lire après signature de la DAA. Par défaut, supposer la redistribution
  des données NSD interdite.
- **Disponibilité/compat des poids MindEye2 pour subj01 en inférence pure** : à vérifier
  (le palier M3 en dépend ; sinon on reste au plancher Brain-Diffuser).
- **VRAM MindEye2 (unCLIP SDXL) sur 12 Go** : estimée à ~10-14 Go fp16 → probable besoin
  d'attention slicing / CPU offload ; à mesurer. Levier principal : basculer le
  générateur vers SD1.5 si nécessaire.
- **Repos 2023 vs sm_120** : requirements PyTorch épinglés dans Brain-Diffuser/MindEye
  peuvent nécessiter un bump vers `cu128` ; libs annexes (xformers, flash-attn) parfois
  sans roue Blackwell → repli SDPA.
- **Mapping `license` id COCO** : lire le tableau `licenses` du JSON réellement utilisé.

---

## 9. Références

- **NSD** — https://naturalscenesdataset.org/ · https://registry.opendata.aws/nsd/ ·
  Allen et al., 2022, *Nature Neuroscience*.
- **MindEye2** — https://github.com/MedARC-AI/MindEyeV2 ·
  https://huggingface.co/datasets/pscotti/mindeyev2 · https://arxiv.org/abs/2403.11207
- **MindEye1** — https://github.com/MedARC-AI/fMRI-reconstruction-NSD
- **Brain-Diffuser** — https://github.com/ozcelikfu/brain-diffuser ·
  https://arxiv.org/abs/2303.05334
- **Takagi & Nishimoto** — https://github.com/yu-takagi/StableDiffusionReconstruction ·
  https://arxiv.org/abs/2306.11536
- **COCO** — https://cocodataset.org/#termsofuse (images sous ToS Flickr ; annotations
  CC BY 4.0)
- **PyTorch Blackwell/WSL2** — roues `cu128`, PyTorch ≥ 2.7, CUDA 12.8+.
