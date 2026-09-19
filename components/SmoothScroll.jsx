'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { store } from '@/lib/store';

// Lenis drives the scroll; GSAP's ticker drives Lenis so ScrollTrigger
// and smooth scroll stay in the exact same frame.
export default function SmoothScroll({ children }) {
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    if (prefersReducedMotion()) return; // native scrolling

    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1.4 });
    store.lenis = lenis;
    lenis.stop(); // the preloader starts it

    lenis.on('scroll', (e) => {
      store.velocity = e.velocity;
      ScrollTrigger.update();
    });

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // In-page anchor links scroll smoothly.
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { duration: 1.6 });
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(tick);
      lenis.destroy();
      store.lenis = null;
    };
  }, []);

  return children;
}
