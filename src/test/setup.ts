import "@testing-library/jest-dom/vitest";

const noop = () => undefined;

class ResizeObserverMock {
  observe = noop;
  unobserve = noop;
  disconnect = noop;
}

class IntersectionObserverMock {
  observe = noop;
  unobserve = noop;
  disconnect = noop;
  takeRecords() {
    return [];
  }
  root: Element | null = null;
  rootMargin = "0px";
  thresholds = [0];
}

if (typeof window !== "undefined") {
  window.scrollTo = noop;
  window.matchMedia =
    window.matchMedia ||
    (() => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    }));
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
}
