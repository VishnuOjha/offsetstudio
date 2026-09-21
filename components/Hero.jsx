'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, useGSAP, SplitText, prefersReducedMotion } from '@/lib/gsap';
import { store } from '@/lib/store';
import { tickWhenVisible } from '@/lib/whenVisible';
import { studio, copy } from '@/lib/content';
import CircleBadge from './CircleBadge';
import Magnetic from './Magnetic';
import ReelModal from './ReelModal';

// Each line of the wordmark is printed three times — cyan, magenta and
// key (black) — stacked with multiply blending. They start out of register,
// snap together on load, and drift apart again with scroll speed and pointer.
function PrintedLine({ text, className }) {
  return (
    <span className={`print ${className}`} aria-hidden="true">
      <span className="print__plate print__plate--c">{text}</span>
      <span className="print__plate print__plate--m">{text}</span>
      <span className="print__plate print__plate--k">{text}</span>
    </span>
  );
}

export default function Hero() {
  const root = useRef(null);
  const [reel, setReel] = useState(false);
  const [reelReady, setReelReady] = useState(false);
  const closeReel = useCallback(() => setReel(false), []);

  // Only offer the reel once the video file is actually there.
  useEffect(() => {
    let alive = true;
    fetch(copy.reel, { method: 'HEAD' })
      .then((r) => alive && setReelReady(r.ok && /video/.test(r.headers.get('content-type') || '')))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useGSAP(
    () => {
      // Reduced motion: the page is simply there, nothing to split or hide.
      if (prefersReducedMotion()) return;

      const q = gsap.utils.selector(root);
      const splits = q('.print__plate').map((el) => new SplitText(el, { type: 'chars', charsClass: 'char' }));
      const small = q('.hero__small');
      const plateC = q('.print__plate--c');
      const plateM = q('.print__plate--m');

      // Pre-load state (the preloader covers the page until this plays).
      splits.forEach((s) => gsap.set(s.chars, { yPercent: 115 }));
      gsap.set(small, { yPercent: 160 });
      gsap.set(plateC, { x: -18, y: 10 });
      gsap.set(plateM, { x: 16, y: -8 });
      gsap.set(q('.hero__badge, .hero__reel, .hero__intro'), { autoAlpha: 0, y: 30 });

      const intro = () => {
        const tl = gsap.timeline({ delay: 0.15 });
        // All three plates of a line rise together, char by char.
        q('.print').forEach((line, li) => {
          const chars = splits
            .filter((s) => line.contains(s.elements[0]))
            .map((s) => s.chars);
          chars[0].forEach((_, ci) => {
            tl.to(chars.map((c) => c[ci]), { yPercent: 0, duration: 1.4, ease: 'expo.out' }, li * 0.18 + ci * 0.05);
          });
        });
        tl.to(small, { yPercent: 0, stagger: 0.05, duration: 1.1 }, 0.35)
          .to([...plateC, ...plateM], { x: 0, y: 0, duration: 1.3, ease: 'elastic.out(1, 0.55)' }, 1.0)
          .to(q('.hero__badge, .hero__reel, .hero__intro'), { autoAlpha: 1, y: 0, stagger: 0.08, duration: 1.2 }, 0.9)
          .add(startDrift, 2.1);
      };

      // After the intro, plates follow scroll velocity and the pointer.
      let driftTick;
      function startDrift() {
        const cx = plateC.map((el) => gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' }));
        const cy = plateC.map((el) => gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' }));
        const mx = plateM.map((el) => gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3' }));
        const my = plateM.map((el) => gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3' }));
        let px = 0, py = 0;
        const onMove = (e) => {
          px = (e.clientX / window.innerWidth - 0.5) * 2;
          py = (e.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('pointermove', onMove);
        driftTick = () => {
          const v = gsap.utils.clamp(-40, 40, store.velocity * 1.4);
          cx.forEach((f) => f(-px * 6 - v * 0.3));
          cy.forEach((f) => f(-py * 4 + v));
          mx.forEach((f) => f(px * 6 + v * 0.3));
          my.forEach((f) => f(py * 4 - v));
        };
        const stopTicking = tickWhenVisible(root.current, driftTick, '0px');
        driftTick.off = () => { stopTicking(); window.removeEventListener('pointermove', onMove); };
      }

      const off = store.onLoaded(intro);

      // Scrolling out: lines part ways at different speeds.
      gsap.to(q('.hero__line--1'), {
        xPercent: -8,
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to(q('.hero__line--2'), {
        xPercent: 10,
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });

      return () => {
        off();
        if (driftTick) driftTick.off();
        splits.forEach((s) => s.revert());
      };
    },
    { scope: root }
  );

  const { lead, stack, tail, since, intro, reel: reelLabel } = copy.hero;

  return (
    <section className="hero" id="top" ref={root}>
      <h1 className="hero__title">
        <span className="sr-only">{studio.name}, a design and development studio</span>

        <span className="hero__row hero__row--1">
          <span className="hero__smalls">
            <span className="mask"><span className="hero__small">{lead}</span></span>
          </span>
          <PrintedLine text={studio.wordmark[0]} className="hero__line hero__line--1" />
          <CircleBadge text={studio.badge} className="hero__badge" />
        </span>

        <span className="hero__row hero__row--2">
          <span className="hero__smalls hero__smalls--stack">
            <span className="mask"><span className="hero__small">{stack[0]}</span></span>
            <span className="mask"><span className="hero__small serif">{stack[1]}</span></span>
          </span>
          <PrintedLine text={studio.wordmark[1]} className="hero__line hero__line--2" />
          <span className="hero__smalls hero__smalls--right">
            <span className="mask"><span className="hero__small">{tail}</span></span>
            <span className="mask"><span className="hero__small serif">{since} {studio.founded}</span></span>
          </span>
        </span>
      </h1>

      <div className="hero__foot">
        <p className="hero__intro">{intro}</p>
        <Magnetic strength={0.4}>
          <button className="hero__reel" data-cursor="Play" hidden={!reelReady} onClick={() => setReel(true)}>
            <span className="hero__reel-icon" aria-hidden="true" />
            {reelLabel}
          </button>
        </Magnetic>
      </div>

      {reelReady && <ReelModal open={reel} onClose={closeReel} />}
    </section>
  );
}
