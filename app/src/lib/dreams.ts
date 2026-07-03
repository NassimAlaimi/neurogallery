import { assetUrl } from "./artifact";

export interface DreamStudy {
  title: string;
  authors: string;
  venue: string;
  year: number;
  subjects: number;
  awakenings_per_subject: string;
  window_seconds: number;
  window_volumes: number;
  source_url: string;
}

export interface DreamExample {
  id: string;
  featured: boolean;
  categories: string[];
  report_reconstructed: string;
  render: string;
  thumb: string;
}

export interface DreamMetrics {
  pairwise_accuracy_pct: number;
  note: string;
}

export interface DreamSource {
  label: string;
  url: string;
}

export interface Dreams {
  study: DreamStudy;
  examples: DreamExample[];
  study_metrics: DreamMetrics;
  sources: DreamSource[];
}

export const DREAMS_BASE = `${import.meta.env.BASE_URL}dreams`;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Invalid dreams: ${msg}`);
}

export function validateDreams(data: unknown): Dreams {
  assert(isObject(data), "root is not an object");

  const s = data.study;
  assert(isObject(s), "field 'study' missing/invalid");
  assert(typeof s.title === "string", "study.title");
  assert(typeof s.authors === "string", "study.authors");
  assert(typeof s.venue === "string", "study.venue");
  assert(typeof s.year === "number", "study.year");
  assert(typeof s.subjects === "number", "study.subjects");
  assert(typeof s.awakenings_per_subject === "string", "study.awakenings_per_subject");
  assert(typeof s.window_seconds === "number", "study.window_seconds");
  assert(typeof s.window_volumes === "number", "study.window_volumes");
  assert(typeof s.source_url === "string", "study.source_url");

  assert(Array.isArray(data.examples) && data.examples.length > 0, "examples must be a non-empty array");
  for (const [i, raw] of data.examples.entries()) {
    assert(isObject(raw), `example ${i} is not an object`);
    assert(typeof raw.id === "string", `example ${i}.id`);
    assert(typeof raw.featured === "boolean", `example ${i}.featured`);
    assert(Array.isArray(raw.categories) && raw.categories.length > 0, `example ${i}.categories must be non-empty`);
    for (const c of raw.categories) assert(typeof c === "string", `example ${i}.categories`);
    assert(typeof raw.report_reconstructed === "string" && raw.report_reconstructed.length > 0, `example ${i}.report_reconstructed`);
    assert(typeof raw.render === "string" && raw.render.length > 0, `example ${i}.render`);
    assert(typeof raw.thumb === "string" && raw.thumb.length > 0, `example ${i}.thumb`);
  }

  const m = data.study_metrics;
  assert(isObject(m), "field 'study_metrics' missing/invalid");
  assert(
    typeof m.pairwise_accuracy_pct === "number" && m.pairwise_accuracy_pct >= 0 && m.pairwise_accuracy_pct <= 100,
    "study_metrics.pairwise_accuracy_pct must be between 0 and 100"
  );
  assert(typeof m.note === "string", "study_metrics.note");

  assert(Array.isArray(data.sources) && data.sources.length > 0, "sources must be a non-empty array");
  for (const [i, raw] of data.sources.entries()) {
    assert(isObject(raw), `source ${i} is not an object`);
    assert(typeof raw.label === "string", `source ${i}.label`);
    assert(typeof raw.url === "string", `source ${i}.url`);
  }

  return data as unknown as Dreams;
}

export async function loadDreams(baseUrl: string): Promise<Dreams> {
  const res = await fetch(`${baseUrl}/dreams.json`);
  if (!res.ok) throw new Error(`Failed to load the dreams (${res.status})`);
  return validateDreams(await res.json());
}

/** URL of a dream asset (render/thumb) relative to the dreams base. */
export function dreamAsset(relPath: string): string {
  return assetUrl(DREAMS_BASE, relPath);
}
