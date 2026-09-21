'use client';
import { useRef } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { services, copy } from '@/lib/content';

// A wall of mixed type. Lines slide against each other with scroll;
// hovering a line flips its sans words to serif and back.
export default function Services() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // Lines slide against each other on wide screens only. On a phone the
      // words wrap and stay put, so nothing is pushed past the screen edge.
      const mm = gsap.matchMedia();
      mm.add('(min-width: 801px)', () => {
        gsap.utils.toArray('.services__line', root.current).forEach((line, i) => {
          gsap.fromTo(
            line,
            { xPercent: i % 2 ? -6 : 6 },
            {
              xPercent: i % 2 ? 4 : -4,
              ease: 'none',
              scrollTrigger: { trigger: line, start: 'top bottom', end: 'bottom top', scrub: true },
            }
          );
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section className="services" ref={root} aria-labelledby="services-title">
      <h2 id="services-title" className="services__label">{copy.labels.services}</h2>
      <ul className="services__list">
        {services.map((line, i) => (
          <li className="services__line" key={i}>
            {line.map(([word, style]) => (
              <span className={`services__word ${style}`} key={word}>{word}</span>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
