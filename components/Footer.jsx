'use client';
import { useRef } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { store } from '@/lib/store';
import { studio, socials, copy } from '@/lib/content';
import Magnetic from './Magnetic';
import Clock from './Clock';
import Marquee from './Marquee';

export default function Footer() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // The giant wordmark rises into place as the page ends.
      gsap.fromTo(
        root.current.querySelector('.footer__mark'),
        { yPercent: 45 },
        {
          yPercent: 0,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom bottom', scrub: true },
        }
      );
    },
    { scope: root }
  );

  const toTop = () => (store.lenis ? store.lenis.scrollTo(0, { duration: 2 }) : window.scrollTo({ top: 0, behavior: 'smooth' }));

  return (
    <footer className="footer" id="contact" ref={root}>
      <Marquee text={copy.marquee.footer} reverse className="marquee--dark" />

      <div className="footer__body">
        <h2 className="footer__title">
          <span className="sans">{copy.labels.footer[0]}</span>
          <span className="serif">{copy.labels.footer[1]}</span>
        </h2>

        <Magnetic strength={0.25} className="footer__cta-wrap">
          <a className="footer__cta" href={`mailto:${studio.email}`} data-cursor="Write">
            {studio.email}
          </a>
        </Magnetic>

        <div className="footer__cols">
          <ul className="footer__social">
            {socials.map((s) => (
              <li key={s.label}><a href={s.href}>{s.label}</a></li>
            ))}
          </ul>
          <p className="footer__meta">
            <Clock /><br />
            © {new Date().getFullYear()} {studio.name} studio
          </p>
          <button className="footer__top" onClick={toTop}>{copy.labels.backToTop}</button>
        </div>
      </div>

      <div className="footer__mark-wrap" aria-hidden="true">
        <p className="footer__mark">{studio.name.toLowerCase()}</p>
      </div>
    </footer>
  );
}
