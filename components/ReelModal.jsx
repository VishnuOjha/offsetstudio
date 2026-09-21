'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from '@/lib/gsap';
import { store } from '@/lib/store';
import { copy } from '@/lib/content';

// Full-screen reel. Drop your video at /public/reel.mp4.
export default function ReelModal({ open, onClose }) {
  const ref = useRef(null);
  const video = useRef(null);
  const returnFocus = useRef(null);
  // Keep the latest onClose without making it an effect dependency: an inline
  // callback from the parent would otherwise re-run the effect (replaying the
  // open animation and the video) on every parent render.
  const onCloseRef = useRef(onClose);
  const [mounted, setMounted] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      returnFocus.current = document.activeElement;
      store.lenis?.stop();
      gsap.killTweensOf(el);
      gsap.set(el, { visibility: 'visible' });
      gsap.fromTo(el, { clipPath: 'circle(0% at 50% 60%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1.1, ease: 'expo.inOut' });
      video.current?.play().catch(() => {});
      el.querySelector('button')?.focus();

      // Escape closes; Tab stays inside the dialog.
      const onKey = (e) => {
        if (e.key === 'Escape') { onCloseRef.current(); return; }
        if (e.key !== 'Tab') return;
        const items = [...el.querySelectorAll('button, video[controls]')];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (!el.contains(active)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    } else if (el.style.visibility === 'visible') {
      video.current?.pause();
      returnFocus.current?.focus?.({ preventScroll: true });
      returnFocus.current = null;
      gsap.killTweensOf(el);
      gsap.to(el, {
        clipPath: 'circle(0% at 50% 60%)', duration: 0.8, ease: 'expo.inOut',
        onComplete: () => { gsap.set(el, { visibility: 'hidden' }); store.lenis?.start(); },
      });
    }
  }, [open]);

  if (!mounted) return null;
  return createPortal(
    <div className="reel" ref={ref} role="dialog" aria-modal="true" aria-label="Studio reel" data-cursor={copy.labels.reelClose} onClick={onClose}>
      <button className="reel__close" onClick={onClose}>{copy.labels.reelClose}</button>
      {missing ? (
        <p className="reel__missing">Add your reel as <code>public{copy.reel}</code> and it will play here.</p>
      ) : (
        <video
          ref={video}
          className="reel__video"
          src={copy.reel}
          playsInline
          loop
          controls
          data-cursor="" /* plain link-style cursor over the player, not the "Close" disc */
          onClick={(e) => e.stopPropagation()}
          onError={() => setMissing(true)}
        />
      )}
    </div>,
    document.body
  );
}
