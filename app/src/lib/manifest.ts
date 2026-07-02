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
