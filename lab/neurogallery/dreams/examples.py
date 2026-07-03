"""Données réelles curées pour l'onglet « Rêves ».

Source de vérité unique. Faits et vocabulaire de catégories issus de
Horikawa et al., "Neural Decoding of Visual Imagery During Sleep",
Science, 2013. Les catégories reflètent le VOCABULAIRE décodé par l'étude,
pas la vérité-terrain d'un réveil précis. Les `report_reconstructed` sont
reconstitués à partir de ces catégories (jamais des citations de sujets).
"""
from __future__ import annotations

STUDY: dict = {
    "title": "Neural Decoding of Visual Imagery During Sleep",
    "authors": "Horikawa, Tamaki, Miyawaki, Kamitani",
    "venue": "Science",
    "year": 2013,
    "subjects": 3,
    "awakenings_per_subject": "~200",
    "window_seconds": 9.0,
    "window_volumes": 3,
    "source_url": "https://www.science.org/doi/10.1126/science.1234330",
}

STUDY_METRICS: dict = {
    "pairwise_accuracy_pct": 60,
    "note": (
        "Pairwise identification accuracy measured in the study "
        "(well above chance, 50%). A study measure, not the "
        "decoder's output for a specific awakening."
    ),
}

SOURCES: list[dict] = [
    {"label": "Horikawa et al. 2013, Science",
     "url": "https://www.science.org/doi/10.1126/science.1234330"},
    {"label": "KamitaniLab/HumanDreamDecoding",
     "url": "https://github.com/KamitaniLab/HumanDreamDecoding"},
    {"label": "Making Your Dreams A Reality (2025)",
     "url": "https://arxiv.org/abs/2501.09350"},
]

# Each example: categories drawn from the decoded vocabulary, report reconstructed.
EXAMPLES: list[dict] = [
    {
        "id": "dream-01",
        "featured": True,
        "categories": ["person", "street", "building"],
        "report_reconstructed": "A street lined with buildings; a figure in the distance.",
        "seed": 1013,
    },
    {
        "id": "dream-02",
        "featured": False,
        "categories": ["room", "furniture", "book"],
        "report_reconstructed": "A quiet room; furniture, a book left out.",
        "seed": 2027,
    },
    {
        "id": "dream-03",
        "featured": False,
        "categories": ["car", "street"],
        "report_reconstructed": "A car standing still in a street.",
        "seed": 3041,
    },
]
