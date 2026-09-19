'use client';
import { useRef } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { awards } from '@/lib/content';

// Counts roll up once, the first time the list comes into view.
export default function Awards() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.utils.toArray('.awards__num', root.current).forEach((el) => {
        const end = Number(el.dataset.value);
        const o = { v: 0 };
        el.textContent = '0';
        gsap.to(o, {
          v: end,
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: () => (el.textContent = Math.round(o.v)),
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      });
    },
    { scope: root }
  );

  return (
    <section className="awards" id="recognition" ref={root}>
      <h2 className="awards__title">
        <span className="sans">Awards &amp;</span> <span className="serif">recognition</span>
      </h2>
      <div className="awards__table">
        {awards.map((group) => (
          <div className="awards__group" key={group.org}>
            <h3 className="awards__org">{group.org}</h3>
            <dl className="awards__items">
              {group.items.map(([label, value]) => (
                <div className="awards__item" key={label}>
                  <dt>{label}</dt>
                  <dd className="awards__num" data-value={value}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
