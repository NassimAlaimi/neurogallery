import "@testing-library/jest-dom";

// jsdom ne fournit pas ces API utilisées par framer-motion (whileInView / useReducedMotion).
class IOStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
if (!("IntersectionObserver" in globalThis)) {
  // @ts-expect-error stub de test
  globalThis.IntersectionObserver = IOStub;
}
if (!("matchMedia" in globalThis)) {
  // @ts-expect-error stub de test
  globalThis.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  });
}
