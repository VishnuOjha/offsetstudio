'use client';
import { useRef, useId } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { store } from '@/lib/store';
import { tickWhenVisible } from '@/lib/whenVisible';

// Circular type that turns slowly and spins up with scroll speed.
export default function CircleBadge({ text, size = 180, className = '' }) {
  const ref = useRef(null);
  const id = useId().replace(/:/g, '');

  useGSAP(() => {
    const ring = ref.current.querySelector('.badge__ring');
    const star = ref.current.querySelector('.badge__star');
    let rot = 0;
    const tick = (_, dt) => {
      const boost = Math.min(Math.abs(store.velocity) * 0.6, 12);
      rot += (0.012 + boost * 0.01) * dt;
      ring.style.transform = `rotate(${rot}deg)`;
      star.style.transform = `rotate(${-rot * 0.6}deg)`;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    return tickWhenVisible(ref.current, tick);
  });

  const repeated = text.repeat(2);
  return (
    <span className={`badge ${className}`} ref={ref} style={{ width: size, height: size }} aria-hidden="true">
      <svg className="badge__ring" viewBox="0 0 200 200">
        <defs>
          <path id={`c-${id}`} d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0" />
        </defs>
        <text>
          <textPath href={`#c-${id}`} textLength="515">{repeated}</textPath>
        </text>
      </svg>
      <svg className="badge__star" viewBox="0 0 100 100">
        <path d="M50 4 L57 38 L92 26 L64 50 L92 74 L57 62 L50 96 L43 62 L8 74 L36 50 L8 26 L43 38 Z" />
      </svg>
    </span>
  );
}