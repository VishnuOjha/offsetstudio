'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from '@/lib/gsap';
import { store } from '@/lib/store';

// Full-screen reel. Drop your video at /public/reel.mp4.
export default function ReelModal({ open, onClose }) {
  const ref = useRef(null);
  const video = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      store.lenis?.stop();
      gsap.set(el, { visibility: 'visible' });
      gsap.fromTo(el, { clipPath: 'circle(0% at 50% 60%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1.1, ease: 'expo.inOut' });
      video.current?.play().catch(() => {});
      el.querySelector('button')?.focus();
      const onKey = (e) => e.key === 'Escape' && onClose();
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    } else if (el.style.visibility === 'visible') {
      video.current?.pause();
      gsap.to(el, {
        clipPath: 'circle(0% at 50% 60%)', duration: 0.8, ease: 'expo.inOut',
        onComplete: () => { gsap.set(el, { visibility: 'hidden' }); store.lenis?.start(); },
      });
    }
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className="reel" ref={ref} role="dialog" aria-modal="true" aria-label="Studio reel" data-cursor="Close" onClick={onClose}>
      <button className="reel__close" onClick={onClose}>Close</button>
      {missing ? (
        <p className="reel__missing">Add your reel as <code>public/reel.mp4</code> and it will play here.</p>
      ) : (
        <video
          ref={video}
          className="reel__video"
          src="/reel.mp4"
          playsInline
          loop
          controls
          onClick={(e) => e.stopPropagation()}
          onError={() => setMissing(true)}
        />
      )}
    </div>,
    document.body
  );
}
