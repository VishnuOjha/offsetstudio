'use client';
import { useRef } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { store } from '@/lib/store';
import { tickWhenVisible } from '@/lib/whenVisible';

// Endless strip. Scrolling down pushes it faster; scrolling up reverses it.
export default function Marquee({ text, reverse = false, className = '' }) {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const inner = root.current.querySelector('.marquee__inner');
      let x = 0;
      let dir = reverse ? 1 : -1;
      const base = 0.045; // % per frame-ish
      const tick = (_, dt) => {
        const v = store.velocity;
        if (Math.abs(v) > 0.5) dir = (v > 0 ? -1 : 1) * (reverse ? -1 : 1);
        const speed = base + Math.min(Math.abs(v) * 0.03, 0.9);
        x += dir * speed * (dt / 16.67);
        // Content is two identical halves, so wrap at 50%.
        if (x <= -50) x += 50;
        if (x > 0) x -= 50;
        inner.style.transform = `translate3d(${x}%,0,0)`;
      };
      return tickWhenVisible(root.current, tick);
    },
    { scope: root }
  );

  const group = (key) => (
    <span className="marquee__group" key={key} aria-hidden={key !== 0}>
      {Array.from({ length: 4 }).map((_, i) => (
        <span className="marquee__item" key={i}>
          <span className={i % 2 ? 'serif' : 'sans'}>{text}</span>
          <svg className="marquee__star" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 4 L57 38 L92 26 L64 50 L92 74 L57 62 L50 96 L43 62 L8 74 L36 50 L8 26 L43 38 Z" />
          </svg>
        </span>
      ))}
    </span>
  );

  return (
    <div className={`marquee ${className}`} ref={root}>
      <div className="marquee__inner">{[group(0), group(1)]}</div>
    </div>
  );
}