import "@testing-library/jest-dom";

// jsdom ne fournit pas ces API utilisées par framer-motion (whileInView / useReducedMotion).
class IOStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
const g = globalThis as unknown as Record<string, unknown>;
if (!("IntersectionObserver" in globalThis)) {
  g.IntersectionObserver = IOStub;
}
if (!("matchMedia" in globalThis)) {
  g.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  });
}
