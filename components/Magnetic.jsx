'use client';
import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';

// Pulls its child toward the pointer while hovered, springs back on leave.
export default function Magnetic({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null);
  useGSAP(() => {
    const el = ref.current;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const x = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    const move = (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * strength);
      y((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { x(0); y(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  });
  return <span ref={ref} className={`magnetic ${className}`}>{children}</span>;
}
