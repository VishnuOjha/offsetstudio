'use client';
import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { store } from '@/lib/store';
import { cases, copy } from '@/lib/content';
import { createWorkGL } from './workGL';
import CircleBadge from './CircleBadge';

// Vertical case showcase. Cases stack down the page, alternating sides.
// A sticky counter + progress line tracks where you are; each case's
// number and title slide against the image as it passes; the WebGL layer
// ripples and colour-splits the images with scroll speed.
export default function Work() {
  const root = useRef(null);

  useGSAP(
    () => {
      const list = root.current.querySelector('.cases__list');
      const slides = gsap.utils.toArray('.case', root.current);
      const figures = slides.map((s) => s.querySelector('.case__figure'));
      const counter = root.current.querySelector('.cases__current');
      const bar = root.current.querySelector('.cases__progress i');
      const reduce = prefersReducedMotion();

      // Progress line and counter follow the list.
      ScrollTrigger.create({
        trigger: list,
        start: 'top center',
        end: 'bottom center',
        onUpdate: (self) => gsap.set(bar, { scaleY: self.progress }),
      });
      slides.forEach((slide, i) => {
        ScrollTrigger.create({
          trigger: slide,
          start: 'top center',
          end: 'bottom center',
          onToggle: (self) => {
            if (!self.isActive) return;
            counter.textContent = String(i + 1).padStart(2, '0');
            slides.forEach((s, j) => s.classList.toggle('is-active', j === i));
          },
        });
      });

      const mm = gsap.matchMedia();
      if (!reduce) {
        // The title slides sideways on wide screens only; on a phone it would
        // overshoot the screen edge and widen the page.
        mm.add('(min-width: 801px)', () => {
          slides.forEach((slide, i) => {
            const dir = i % 2 ? -1 : 1;
            gsap.fromTo(
              slide.querySelector('.case__title'),
              { xPercent: 10 * dir },
              { xPercent: -6 * dir, ease: 'none', scrollTrigger: { trigger: slide, start: 'top bottom', end: 'bottom top', scrub: true } }
            );
          });
        });
        slides.forEach((slide, i) => {
          const trig = { trigger: slide, start: 'top bottom', end: 'bottom top', scrub: true };
          gsap.fromTo(slide.querySelector('.case__num'), { yPercent: 40 }, { yPercent: -40, ease: 'none', scrollTrigger: trig });
          gsap.fromTo(slide.querySelector('.case__explore'), { y: 80 }, { y: -80, ease: 'none', scrollTrigger: { ...trig } });
          // The picture grows into its frame as it enters. (A transform, not a
          // clip-path, so the WebGL layer — which reads the box — follows it.)
          gsap.fromTo(
            slide.querySelector('.case__figure'),
            { scale: 0.78 },
            { scale: 1, ease: 'none', scrollTrigger: { trigger: slide, start: 'top bottom', end: 'top 25%', scrub: true } }
          );
        });
      }

      // WebGL layer over the page-scrolling images.
      let gl = null; let cancelled = false; let st = null;
      // Phones keep the plain <img> layout: three GL contexts plus filter
      // passes are too heavy there, and the effect is a desktop flourish.
      const smallScreen = window.matchMedia('(max-width: 800px)').matches;
      const canGL = !smallScreen && (() => {
        try {
          const c = document.createElement('canvas');
          const ctx = c.getContext('webgl2') || c.getContext('webgl');
          ctx?.getExtension('WEBGL_lose_context')?.loseContext(); // free the probe context
          return !!ctx;
        } catch { return false; }
      })();
      // Start the WebGL layer on the next tick, not synchronously. In dev,
      // React Strict Mode mounts → unmounts → re-mounts immediately; the
      // short delay lets that first throw-away mount cancel before any GPU
      // work starts, so Pixi is only ever created (and destroyed) once.
      let startTimer = 0;
      if (canGL && !reduce) startTimer = setTimeout(() => {
        if (cancelled) return;
        createWorkGL({
          host: root.current.querySelector('.cases__gl'),
          figures,
          sources: cases.map((c) => c.img),
          getVelocity: () => store.velocity || 0,
        })
          .then((instance) => {
            if (cancelled) { instance.destroy(); return; }
            gl = instance;
            root.current.classList.add('is-gl');
            st = ScrollTrigger.create({
              trigger: root.current, start: 'top bottom', end: 'bottom top',
              onToggle: (self) => (self.isActive ? gl.start() : gl.stop()),
            });
            if (!st.isActive) gl.stop();
          })
          .catch((err) => console.warn('Case WebGL disabled:', err));
      }, 60);

      return () => { cancelled = true; clearTimeout(startTimer); mm.revert(); st?.kill(); gl?.destroy(); };
    },
    { scope: root }
  );

  return (
    <section className="cases" id="work" ref={root}>
      {/* Fixed-size WebGL stage, stuck to the viewport while the section scrolls. */}
      <div className="cases__gl" aria-hidden="true" />

      <header className="cases__head">
        <h2 className="cases__heading">
          <span className="sans">{copy.labels.cases[0]}</span> <span className="serif">{copy.labels.cases[1]}</span>
        </h2>
      </header>

      <div className="cases__body">
        <aside className="cases__aside" aria-hidden="true">
          <p className="cases__count">
            <span className="cases__current">01</span>
            <span className="cases__total">/ {String(cases.length).padStart(2, '0')}</span>
          </p>
          <div className="cases__progress"><i /></div>
        </aside>

        <ol className="cases__list">
          {cases.map((c, i) => (
            <li className={`case ${i % 2 ? 'case--flip' : ''}`} key={c.title}>
              <div className="case__media">
                <a className="case__figure" href={c.href} data-cursor="Explore" aria-label={`Explore ${c.title}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.img} alt="" draggable="false" />
                </a>
              </div>

              <div className="case__text">
                <p className="case__num" aria-hidden="true">{i + 1}</p>
                <h3 className="case__title">
                  {c.title.split(' ').map((w, wi) => (
                    <span key={wi} className={wi % 2 ? 'serif' : 'sans'}>{w}</span>
                  ))}
                </h3>
                <p className="case__kind">{c.kind}</p>
                <p className="case__year">{c.year}</p>
              </div>

              <a className="case__explore" href={c.href} data-cursor="Explore" tabIndex={-1} aria-hidden="true">
                <CircleBadge text={copy.badges.explore} size={124} />
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}