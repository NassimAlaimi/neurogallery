# NeuroGallery — Onglet « Rêves » (Design Spec)

**Date :** 2026-07-03
**Statut :** Validé en brainstorming, en attente de revue utilisateur avant plan d'implémentation.
**Portée :** Un onglet unique `/dreams` ajouté à l'app NeuroGallery existante, plus une petite étape lab de génération d'images. Feature autonome, une seule spec → un seul plan.

---

## 1. Objectif

Ajouter un onglet **« Rêves »** qui raconte le décodage de rêve depuis l'IRMf (Horikawa/Kamitani 2013 → état de l'art 2025) et le met en scène de façon spectaculaire, **en s'appuyant sur de vraies données publiées** — sans jamais prétendre avoir reconstruit une image-vérité de rêve.

C'est le prolongement thématique de la page **Explication** : NeuroGallery décode la *perception éveillée* (NSD) ; cet onglet montre la frontière voisine, le *rêve*, et pourquoi c'est le même problème.

## 2. Le contrat d'honnêteté (contrainte transverse — non négociable)

Tout le tab est gouverné par une séparation stricte **réel vs rendu** :

**Réel et sourçable** (affiché tel quel, avec citation Horikawa et al., *Science*, 2013) :
- 3 sujets, endormis en IRMf avec EEG simultané, réveillés au sleep-onset (NREM) ; **~200 réveils avec rapport visuel par sujet**.
- Fenêtre décodée = **3 volumes IRMf ≈ 9 s** immédiatement avant le réveil.
- Rapports verbaux → mots d'objets → **catégories WordNet** ; décodeurs entraînés sur la **perception éveillée** (visionnage d'images ImageNet), appliqués au sommeil.
- Décodage **nettement au-dessus du hasard** (identification par paires significative ; ~60 % rapporté, plus élevé pour certaines catégories).

**Généré par nous** (systématiquement étiqueté « rendu illustratif ») :
- Les **images oniriques** : notre rendu visuel des catégories réellement décodées, produit par diffusion locale.

**Interdits absolus :**
- ❌ Ne PAS inventer de citation de rapport de rêve attribuée à un sujet. Les sources ouvertes n'en publient pas de verbatim. Le « rapport » affiché est **reconstitué à partir des catégories réellement décodées** et **libellé comme reconstitution**, jamais comme transcription.
- ❌ Ne PAS fabriquer de probabilités de confiance par réveil. Les chiffres numériques affichés proviennent **uniquement** de l'étude (précisions de décodage réellement mesurées, présentées comme mesures d'étude — pas comme sortie du décodeur pour ce réveil précis). Si un chiffre par catégorie n'est pas sourçable, la jauge est qualitative ou omise.
- ❌ Ne JAMAIS présenter une image comme « le vrai rêve » ou « l'image vue ».

## 3. Architecture

Extension de l'app React/Vite/TS existante (thème « neural lab » sombre, Framer Motion, react-router déjà en place). Deux moitiés :

- **App (web)** : nouvelle route `/dreams`, feature isolée, données injectées depuis un contrat JSON dédié — **aucune pollution du manifest NSD**.
- **Lab (offline)** : un script de génération qui produit les rendus oniriques en local (RTX 5070), écrits en assets statiques + `dreams.json`.

Les images de rêve sont **notre contenu généré à partir de mots de catégories** — aucun contenu NSD/COCO, donc **committables** (contrairement aux données NSD gitignorées). Le tab reste ainsi 100 % autonome et partageable.

### Fichiers

**App — à créer :**
- `app/src/features/dreams/DreamsPage.tsx` — page + sections narratives
- `app/src/features/dreams/Awakening.tsx` — la séquence « réveil » (pièce maîtresse), machine à états
- `app/src/features/dreams/EegTrace.tsx` — tracé EEG animé (SVG)
- `app/src/features/dreams/DreamPlate.tsx` — carte d'un rêve secondaire (réutilisée par le héro)
- `app/src/features/dreams/dreams.css` — styles dédiés (garde global.css sous contrôle)
- `app/src/lib/dreams.ts` — chargement + validation de `dreams.json`, types
- `app/src/lib/dreams.test.ts` — tests de la garde de validation
- `app/src/features/dreams/DreamsPage.test.tsx` — tests de rendu + honnêteté

**App — à modifier :**
- `app/src/App.tsx` — route `/dreams` + lien nav « Rêves » (après « Explication »)

**Contrat de données — à créer :**
- `dreams.schema.json` (racine dépôt) — schéma JSON, cohérent avec `manifest.schema.json`
- `app/public/dreams/dreams.json` — données
- `app/public/dreams/renders/*.webp` + `app/public/dreams/thumbs/*.jpg` — assets générés

**Lab — à créer :**
- `lab/scripts/make_dreams.py` — génère les rendus + `dreams.json`
- `lab/neurogallery/dreams/` (si utile) — helpers de prompt/aesthetic isolés

## 4. Contrat de données (`dreams.json`)

```json
{
  "study": {
    "title": "Neural Decoding of Visual Imagery During Sleep",
    "authors": "Horikawa, Tamaki, Miyawaki, Kamitani",
    "venue": "Science",
    "year": 2013,
    "subjects": 3,
    "awakenings_per_subject": "~200",
    "window_seconds": 9,
    "window_volumes": 3,
    "source_url": "https://www.science.org/doi/10.1126/science.1234330"
  },
  "examples": [
    {
      "id": "dream-01",
      "featured": true,
      "categories": ["personne", "rue", "bâtiment"],
      "report_reconstructed": "Une rue, des bâtiments, quelqu'un au loin.",
      "render": "renders/dream-01.webp",
      "thumb": "thumbs/dream-01.jpg"
    }
  ],
  "study_metrics": {
    "pairwise_accuracy_pct": 60,
    "note": "Précision de décodage mesurée dans l'étude (identification par paires), pas une sortie par réveil."
  },
  "sources": [
    { "label": "Horikawa et al. 2013, Science", "url": "https://www.science.org/doi/10.1126/science.1234330" },
    { "label": "KamitaniLab/HumanDreamDecoding", "url": "https://github.com/KamitaniLab/HumanDreamDecoding" },
    { "label": "Making Your Dreams A Reality (2025)", "url": "https://arxiv.org/abs/2501.09350" }
  ]
}
```

- `categories` : catégories **réelles** issues de l'étude (à sourcer à l'implémentation depuis le papier / les données GitHub). Champ obligatoire, non vide.
- `report_reconstructed` : reconstitution à partir de `categories`, affichée avec le libellé « Reconstitué à partir des catégories décodées ».
- Pas de champ de confiance par catégorie (voir §2). Les chiffres viennent de `study_metrics`, présentés comme mesures d'étude.
- Validation **fail-fast** au chargement (comme le manifest) ; message d'erreur clair si le JSON est invalide/absent.

## 5. Structure de la page `/dreams`

1. **Hero** — « Et pendant qu'on dort ? » ; accroche : le même cortex visuel s'active en rêvant qu'en percevant → décodage possible.
2. **Le protocole réel** — frise animée : *s'endormir en IRMf → l'EEG détecte le sleep-onset → réveil → « qu'as-tu vu ? » → 9 s d'activité décodées*. Chiffres réels (`study`) en surimpression.
3. **« Un réveil »** — la pièce maîtresse (voir §6). Utilise le rêve `featured`.
4. **Deux autres rêves** — bande de 2 `DreamPlate` secondaires (données identiques, mise en scène plus courte).
5. **Le pont avec ton pipeline** — même chaîne `activité → empreinte → image`, entraînée sur l'éveil, testée sur le sommeil ; renvoi vers `/explain`.
6. **2013 → 2025** — de la catégorie à la « vidéo de rêve » (*Making Your Dreams A Reality*), honnête sur le flou actuel.
7. **Fait / ne fait pas** — bloc honnêteté (même patron que la page Explication) : réel = activité + catégories ; illustratif = le rendu ; pas de vérité-pixel.

## 6. Pièce maîtresse — composant `Awakening`

Séquence cinématique, déclenchée au scroll (IntersectionObserver, déjà utilisé) ou via bouton « Réveiller le dormeur ». Machine à états explicite :

`sleeping → onset → awake → decoding → forming → truth`

1. **sleeping** — `EegTrace` défile, ambiance nuit, coupes cérébrales sombres en respiration lente.
2. **onset** — l'EEG « pique » (signature sleep-onset), flash bref.
3. **awake** — bascule visuelle (nuit → labo).
4. **decoding** — les `categories` réelles apparaissent une à une (stagger), avec la mesure d'étude (`study_metrics`) présentée comme telle.
5. **forming** — le `render` onirique se matérialise en fondu + léger morphing/flou (voir §7).
6. **truth** — carte finale : « activité + catégories = **réelles** (Horikawa 2013) · image = **notre rendu** ».

Contraintes : machine à états pure et testable (les états sont dérivés de props/callbacks, pas de horloge cachée) ; `prefers-reduced-motion` → tous les états visibles d'emblée, sans transitions.

## 7. Direction visuelle & motion

- **Palette** : tokens existants (violet→magenta→cyan) en **déclinaison nocturne** — fonds plus sombres, halos, grain léger.
- **Rendu de rêve** volontairement onirique pour signaler « impression, pas photo » : flou gaussien doux, glow, désaturation partielle, léger breathing/morphing. Effets via `filter`/`transform`/`opacity` uniquement (compositor-friendly), jamais sur des propriétés de layout.
- **EEG** : SVG animé (path `stroke-dashoffset` ou translation), performant.
- **Accessibilité** : `prefers-reduced-motion` respecté ; contraste AA ; images `alt` explicites incluant « rendu illustratif » ; dimensions explicites (pas de CLS).

## 8. Étape lab — `make_dreams.py`

- Entrée : liste curée d'exemples (catégories réelles sourcées de l'étude).
- Modèle : pipeline **text→image** (diffusers, ex. Stable Diffusion) en local sur la RTX 5070 ; prompt construit **à partir des catégories réelles** + style onirique.
- Sortie : `app/public/dreams/renders/<id>.webp` (+ `thumbs/<id>.jpg`) et `app/public/dreams/dreams.json` conforme au schéma.
- 100 % local, cohérent avec l'esprit « galerie pré-calculée ». Idempotent ; réexécutable.
- Aucune donnée NSD/COCO impliquée → sorties committables.

## 9. Tests

- **Unit (Vitest)** :
  - `dreams.ts` : garde de validation (JSON valide accepté ; invalide/absent → erreur claire).
  - `DreamsPage` : rend les sections ; les libellés d'honnêteté sont présents (« rendu illustratif », « Reconstitué à partir des catégories décodées », citation 2013).
  - `Awakening` : progression de la machine à états ; chemin `reduced-motion` (états visibles sans animation).
  - `EegTrace` : rend sans crash.
- **E2E (Playwright, chromium installé)** : page charge, nav « Rêves » active, séquence héro visible ; captures aux breakpoints (375/768/1440) et thèmes.
- Couverture ≥ 80 % sur la logique nouvelle (validation, machine à états).

## 10. Hors scope (explicite)

- **4A — reconstruction complète** (refit d'un décodeur sur les sujets de Kamitani, diffusion sur betas de rêve). Reste un « Plan Max » futur, pas dans cette spec.
- Vidéo de rêve (2025) : évoquée en narratif, pas reproduite.
- Aucune modification du pipeline NSD ni du manifest existant.

## 11. Risques & parades

- **Sourcer les catégories réelles** : dépend du papier/données GitHub. Parade : tâche de recherche dédiée en début de plan ; si une catégorie n'est pas vérifiable, elle n'est pas affichée.
- **Dérive d'honnêteté** : tout libellé « rendu illustratif » est testé (assertions sur le DOM) pour empêcher une régression silencieuse.
- **Poids du bundle** : 3 rendus webp compressés + JSON léger ; négligeable.

## Sources

- [Horikawa et al. 2013, *Science* — Neural Decoding of Visual Imagery During Sleep](https://www.science.org/doi/10.1126/science.1234330)
- [KamitaniLab/HumanDreamDecoding (GitHub)](https://github.com/KamitaniLab/HumanDreamDecoding)
- [Kamitani Lab Open Data](https://kamitanilab.github.io/OpenData/)
- [Hierarchical Neural Representation of Dreamed Objects (PMC5281549)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5281549/)
- [Making Your Dreams A Reality — rêve → vidéo (arXiv 2501.09350, 2025)](https://arxiv.org/abs/2501.09350)
