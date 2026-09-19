'use client';
// Tiny shared state for things many components need without re-renders:
// loader completion, smooth-scroll instance, scroll velocity.
const listeners = new Set();
export const store = {
  loaded: false,
  lenis: null,
  velocity: 0,
  onLoaded(fn) {
    if (this.loaded) { fn(); return () => {}; }
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  setLoaded() {
    this.loaded = true;
    listeners.forEach((fn) => fn());
    listeners.clear();
  },
};
