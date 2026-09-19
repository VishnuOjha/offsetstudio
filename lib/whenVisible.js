'use client';
import { gsap } from './gsap';

// Runs `tick` on GSAP's ticker only while `el` is on screen.
// Offscreen marquees, badges and drift loops were still writing styles
// every frame; this keeps them idle until they're actually visible.
export function tickWhenVisible(el, tick, rootMargin = '100px') {
  let on = false;
  const start = () => { if (!on) { on = true; gsap.ticker.add(tick); } };
  const stop = () => { if (on) { on = false; gsap.ticker.remove(tick); } };
  const io = new IntersectionObserver(
    ([entry]) => (entry.isIntersecting ? start() : stop()),
    { rootMargin }
  );
  io.observe(el);
  return () => { io.disconnect(); stop(); };
}