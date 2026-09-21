'use client';
import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { store } from '@/lib/store';

// Blend-mode cursor: a hollow ring that trails the pointer and a dot that
// sits exactly on it. Everything renders in white with mix-blend-mode:
// difference, so it inverts whatever is underneath — paper, clouds, photos.
//  • links / buttons   → ring tightens, dot swells
//  • [data-cursor=X]   → ring fills into a disc with the label X
//  • data-cursor=""    → behaves like a plain link (opts out of a parent's label)
//  • fast movement     → the ring stretches along the direction of travel
// Pointer position and speed are shared via store.mouse, which the cloud
// background uses to swirl and part the clouds around the cursor.
export default function Cursor() {
  const root = useRef(null);

  useGSAP(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const el = root.current;
    const ring = el.querySelector('.cursor__ring');
    const dot = el.querySelector('.cursor__dot');
    const label = el.querySelector('.cursor__label');
    el.classList.add('is-on');

    const mouse = { x: -100, y: -100, vx: 0, vy: 0, burst: 0, active: false };
    store.mouse = mouse;
    const pos = { x: -100, y: -100 };
    const state = { scale: 1 };
    let seen = false;
    let lastT = performance.now();

    const move = (e) => {
      const now = performance.now();
      const dt = Math.max(8, now - lastT); lastT = now;
      mouse.vx = ((e.clientX - mouse.x) / dt) * 16.67;
      mouse.vy = ((e.clientY - mouse.y) / dt) * 16.67;
      mouse.x = e.clientX; mouse.y = e.clientY;
      mouse.active = true;
      if (!seen) { seen = true; pos.x = mouse.x; pos.y = mouse.y; el.classList.add('has-moved'); }
      gsap.set(dot, { x: mouse.x, y: mouse.y });
    };

    // Ring follows with lag; its stretch comes from the lag distance.
    const tick = (_, dt) => {
      const f = dt / 16.67;
      mouse.vx *= Math.pow(0.85, f);
      mouse.vy *= Math.pow(0.85, f);
      mouse.burst *= Math.pow(0.9, f);
      const k = 1 - Math.pow(0.82, f);
      const dx = mouse.x - pos.x;
      const dy = mouse.y - pos.y;
      pos.x += dx * k; pos.y += dy * k;
      const speed = Math.min(Math.hypot(dx, dy), 160);
      const stretch = el.classList.contains('is-label') ? 0 : speed / 600;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      ring.style.transform =
        `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${angle}deg) ` +
        `scale(${state.scale * (1 + stretch)}, ${state.scale * (1 - stretch * 0.6)})`;
      label.style.transform = `rotate(${-angle}deg)`;
    };
    gsap.ticker.add(tick);

    let current;
    const over = (e) => {
      const target = e.target.closest('[data-cursor], a, button, input, textarea');
      if (target === current) return;
      current = target;
      const text = target?.dataset?.cursor;
      el.classList.toggle('is-label', !!text);
      el.classList.toggle('is-link', !!target && !text);
      label.textContent = text || '';
      gsap.to(state, { scale: text ? 1 : target ? 0.6 : 1, duration: 0.6, ease: 'expo.out' });
    };
    const down = () => {
      mouse.burst = 1; // a click gives the clouds an extra push
      gsap.to(state, { scale: '*=0.8', duration: 0.25, ease: 'power3.out' });
    };
    const up = () => { const c = current; current = undefined; over({ target: c || document.body }); };
    const leave = () => { el.classList.remove('has-moved'); mouse.active = false; };
    const enter = () => seen && el.classList.add('has-moved');

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerover', over);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    document.documentElement.addEventListener('pointerleave', leave);
    document.documentElement.addEventListener('pointerenter', enter);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.documentElement.removeEventListener('pointerleave', leave);
      document.documentElement.removeEventListener('pointerenter', enter);
      store.mouse = null;
    };
  });

  return (
    <div className="cursor" ref={root} aria-hidden="true">
      <div className="cursor__ring">
        <span className="cursor__label" />
      </div>
      <div className="cursor__dot" />
    </div>
  );
}