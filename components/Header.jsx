'use client';
import { useRef, useState } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/gsap';
import { store } from '@/lib/store';
import { nav, studio, socials, copy } from '@/lib/content';
import Magnetic from './Magnetic';

export default function Header() {
  const root = useRef(null);
  const tl = useRef(null);
  const [open, setOpen] = useState(false);

  useGSAP(
    () => {
      const bar = root.current.querySelector('.header__bar');
      gsap.set(bar, { yPercent: -120 });
      const off = store.onLoaded(() => gsap.to(bar, { yPercent: 0, duration: 1.2, delay: 0.6 }));

      // Hide on the way down, return on the way up.
      const st = ScrollTrigger.create({
        start: 'top -120',
        onUpdate: (self) => {
          if (root.current.classList.contains('is-open')) return;
          gsap.to(bar, { yPercent: self.direction === 1 ? -120 : 0, duration: 0.6, ease: 'power3.out', overwrite: true });
        },
      });

      // Menu: the panel wipes down, then each line rises from behind a mask.
      const panel = root.current.querySelector('.menu');
      tl.current = gsap
        .timeline({ paused: true })
        .set(panel, { visibility: 'visible' })
        .fromTo(panel, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'expo.inOut' })
        .from(panel.querySelectorAll('.menu__link span'), { yPercent: 110, rotate: 4, stagger: 0.06, duration: 1 }, '-=0.35')
        .from(panel.querySelectorAll('.menu__foot > *'), { opacity: 0, y: 20, stagger: 0.05, duration: 0.8 }, '<0.2');

      return () => { off(); st.kill(); };
    },
    { scope: root }
  );

  const toggle = (next = !open) => {
    setOpen(next);
    root.current.classList.toggle('is-open', next);
    if (next) { store.lenis?.stop(); tl.current.timeScale(1).play(); }
    else { store.lenis?.start(); tl.current.timeScale(1.6).reverse(); }
  };

  return (
    <header className="header" ref={root}>
      <div className="header__bar">
        <a href="#top" className="header__logo" aria-label={`${studio.name} home`} onClick={() => toggle(false)}>
          {studio.name.toLowerCase()}<sup>®</sup>
        </a>
        <Magnetic>
          <button
            className="header__menu"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => toggle()}
          >
            <span className="header__menu-text">{open ? copy.labels.menuClose : copy.labels.menuOpen}</span>
            <span className="header__burger" aria-hidden="true"><i /><i /></span>
          </button>
        </Magnetic>
      </div>

      <nav className="menu" id="site-menu" aria-label="Main" inert={!open}>
        <ul className="menu__list">
          {nav.map((item) => (
            <li key={item.href}>
              <a className="menu__link" href={item.href} onClick={() => toggle(false)}>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="menu__foot">
          <a href={`mailto:${studio.email}`}>{studio.email}</a>
          {socials.map((s) => <a key={s.label} href={s.href}>{s.label}</a>)}
        </div>
      </nav>
    </header>
  );
}
