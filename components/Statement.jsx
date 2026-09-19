'use client';
import { useRef } from 'react';
import { gsap, useGSAP, SplitText, prefersReducedMotion } from '@/lib/gsap';
import { studio } from '@/lib/content';
import CircleBadge from './CircleBadge';

// Words ink in as you read down the page.
export default function Statement() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const split = new SplitText(root.current.querySelector('.statement__text'), { type: 'words', wordsClass: 'word' });
      gsap.fromTo(
        split.words,
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top 75%', end: 'bottom 55%', scrub: true },
        }
      );
      return () => split.revert();
    },
    { scope: root }
  );

  return (
    <section className="statement" id="studio" ref={root}>
      <p className="statement__label">The studio</p>
      <p className="statement__text">{studio.statement}</p>
      <CircleBadge text="read more about us ✺ " size={120} className="statement__badge" />
    </section>
  );
}
