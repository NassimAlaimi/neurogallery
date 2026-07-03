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
  category?: string | null;
  input?: string;
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
  if (!cond) throw new Error(`Invalid manifest: ${msg}`);
}

export function validateManifest(data: unknown): Manifest {
  assert(isObject(data), "root is not an object");
  assert(isObject(data.build), "field 'build' missing/invalid");
  const b = data.build;
  assert(typeof b.subject === "string", "build.subject");
  assert(typeof b.test_set === "string", "build.test_set");
  assert(Array.isArray(b.methods) && b.methods.length > 0, "build.methods");
  for (const m of b.methods) {
    assert(m === "brain-diffuser" || m === "mindeye2", "build.methods contains an unknown method");
  }
  assert(b.profile === "local" || b.profile === "public", "build.profile");
  assert(Array.isArray(data.items), "'items' is not an array");

  for (const [i, raw] of data.items.entries()) {
    assert(isObject(raw), `item ${i} is not an object`);
    assert(typeof raw.id === "string", `item ${i}.id`);
    assert(typeof raw.coco_id === "number", `item ${i}.coco_id`);
    assert(Number.isInteger(raw.coco_id), `item ${i}.coco_id must be an integer`);
    assert(isObject(raw.recon), `item ${i}.recon`);
    assert(raw.category === undefined || raw.category === null || typeof raw.category === "string", `item ${i}.category`);
    assert(raw.input === undefined || typeof raw.input === "string", `item ${i}.input`);
    assert(typeof raw.thumb === "string", `item ${i}.thumb`);
    assert(isObject(raw.gt), `item ${i}.gt`);
    assert(typeof raw.gt.displayable === "boolean", `item ${i}.gt.displayable`);
    assert(raw.gt.path === null || typeof raw.gt.path === "string", `item ${i}.gt.path`);
    assert(typeof raw.gt.license_name === "string", `item ${i}.gt.license_name`);
    assert(isObject(raw.metrics), `item ${i}.metrics`);
    // recon: non-empty, values = strings
    const reconObj = raw.recon as Record<string, unknown>;
    assert(Object.keys(reconObj).length >= 1, `item ${i}.recon is empty`);
    for (const k of Object.keys(reconObj)) assert(typeof reconObj[k] === "string", `item ${i}.recon.${k}`);
    // metrics: values = objects of numbers
    for (const [mk, mv] of Object.entries(raw.metrics as Record<string, unknown>)) {
      assert(isObject(mv), `item ${i}.metrics.${mk}`);
      for (const [nk, nv] of Object.entries(mv)) assert(typeof nv === "number", `item ${i}.metrics.${mk}.${nk}`);
    }
  }
  return data as unknown as Manifest;
}

export async function loadManifest(baseUrl: string): Promise<Manifest> {
  const res = await fetch(`${baseUrl}/manifest.json`);
  if (!res.ok) throw new Error(`Failed to load the manifest (${res.status})`);
  return validateManifest(await res.json());
}
