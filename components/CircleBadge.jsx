'use client';
import { useRef, useId, useState, useEffect } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { store } from '@/lib/store';
import { tickWhenVisible } from '@/lib/whenVisible';

const R = 82;                  // radius of the text path (viewBox is 200 × 200)
const C = 2 * Math.PI * R;     // its circumference
const BASE = 15;               // font-size in .badge__ring text (globals.css)

// ✺ isn't in Archivo, so every device would substitute its own font for it,
// with its own size and baseline: that is the misaligned dot. The bullet comes
// from Archivo itself, so it sits on the same baseline as the words.
const clean = (t) => t.replace(/✺/g, '•').replace(/\s+/g, ' ').trim();

// Circular type that turns slowly and spins up with scroll speed.
// The text is repeated a whole number of times and the font size is nudged so
// the repeats close the circle exactly: no stretched letters, and the same
// gap at the seam as between any two repeats.
export default function CircleBadge({ text, size = 180, className = '' }) {
  const ref = useRef(null);
  const measure = useRef(null);
  const id = useId().replace(/:/g, '');
  // A non-breaking space is not collapsed by SVG, so the seam keeps its gap.
  const unit = `${clean(text)} `;
  const [fit, setFit] = useState({ n: 2, fs: BASE });

  useEffect(() => {
    const m = measure.current;
    if (!m) return;
    let alive = true;
    const run = () => {
      const u = m.getComputedTextLength(); // one repeat at BASE px
      if (!alive || !u) return;
      let best = null;
      for (let n = 1; n <= 12; n++) {
        const fs = (BASE * C) / (n * u);   // size at which n repeats fill the ring
        if (!best || Math.abs(fs - BASE) < Math.abs(best.fs - BASE)) best = { n, fs };
      }
      setFit((f) => (f.n === best.n && Math.abs(f.fs - best.fs) < 0.01 ? f : best));
    };
    run();
    document.fonts?.ready.then(run); // measure again once Archivo has loaded
    return () => { alive = false; };
  }, [unit]);

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

  return (
    <span className={`badge ${className}`} ref={ref} style={{ width: size, height: size }} aria-hidden="true">
      <svg className="badge__ring" viewBox="0 0 200 200">
        <defs>
          <path id={`c-${id}`} d={`M100,100 m-${R},0 a${R},${R} 0 1,1 ${2 * R},0 a${R},${R} 0 1,1 -${2 * R},0`} />
        </defs>
        {/* Unseen: measures one repeat so the ring can be filled exactly. */}
        <text ref={measure} x="0" y="0" style={{ visibility: 'hidden' }}>{unit}</text>
        <text style={{ fontSize: fit.fs }}>
          <textPath href={`#c-${id}`} textLength={C.toFixed(2)} lengthAdjust="spacing">
            {unit.repeat(fit.n)}
          </textPath>
        </text>
      </svg>
      <svg className="badge__star" viewBox="0 0 100 100">
        <path d="M50 4 L57 38 L92 26 L64 50 L92 74 L57 62 L50 96 L43 62 L8 74 L36 50 L8 26 L43 38 Z" />
      </svg>
    </span>
  );
}
