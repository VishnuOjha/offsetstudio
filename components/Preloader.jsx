'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { store } from '@/lib/store';
import { cases, studio } from '@/lib/content';

/*
  Preloader sequence
  1. Count 1 → 100, following real image + font loading.
  2. The number slides out; the studio name prints in as C / M / Y plates
     that start out of register and snap together.
  3. Impact: cracks shoot out from the centre of the name, the sheet shakes.
  4. Break: the black sheet shatters into shards that fly apart and fall,
     revealing the home page underneath (the hero intro starts mid-break).
*/

// Deterministic random so server and client build identical shards.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Radial crack pattern, fine-grained: many rays × many rings give lots of
// small pieces. Coordinates are % of the viewport. Outer quads are split
// into two triangles along a random diagonal so the pieces read as glass,
// not a dartboard. The last ring sits past the corners so nothing is left.
const NAME_BOX = { x0: 14, x1: 86, y0: 38, y1: 62 }; // where the name can be

function buildShards({ rays = 14, radii = [7, 14, 22, 31, 42, 55, 72, 95], seed = 7 } = {}) {
  const rand = rng(seed);
  const C = { x: 50, y: 50 };
  const last = radii.length - 1;
  const angles = Array.from({ length: rays }, (_, i) => ((i + (rand() - 0.5) * 0.6) / rays) * Math.PI * 2);
  const rings = radii.map((r, k) =>
    angles.map((a) => {
      const jr = k === last ? 0 : (rand() - 0.5) * (radii[1] - radii[0]) * 0.9;
      const ja = k === last ? 0 : (rand() - 0.5) * 0.16;
      return { x: C.x + Math.cos(a + ja) * (r + jr), y: C.y + Math.sin(a + ja) * (r + jr) };
    })
  );
  const fmt = (p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;

  const shards = [];
  const add = (pts, ring) => {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const hasText =
      Math.max(...xs) > NAME_BOX.x0 && Math.min(...xs) < NAME_BOX.x1 &&
      Math.max(...ys) > NAME_BOX.y0 && Math.min(...ys) < NAME_BOX.y1;
    // Each shard element is only as big as its own bounding box (clamped to
    // the screen), NOT full-screen. 180 full-screen layers meant ~180 screen-
    // sized GPU textures at the moment of the break — that was the freeze
    // right after the preloader. Small boxes add up to roughly one screen.
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    // Pieces that lie completely off-screen are never seen: skip them.
    if (maxX <= 0 || minX >= 100 || maxY <= 0 || minY >= 100) return;
    const r3 = (n) => Math.round(n * 1000) / 1000;
    const bx = r3(Math.max(0, minX)), by = r3(Math.max(0, minY));
    const bw = r3(Math.max(0.5, Math.min(100, maxX) - bx));
    const bh = r3(Math.max(0.5, Math.min(100, maxY) - by));
    shards.push({
      ring, hasText, cx, cy, bx, by, bw, bh,
      clip: `polygon(${pts
        .map((p) => `${(((p.x - bx) / bw) * 100).toFixed(2)}% ${(((p.y - by) / bh) * 100).toFixed(2)}%`)
        .join(',')})`,
      origin: `${(((cx - bx) / bw) * 100).toFixed(2)}% ${(((cy - by) / bh) * 100).toFixed(2)}%`,
      spin: (rand() - 0.5) * 2,
      tilt: (rand() - 0.5) * 2,
      force: 0.5 + rand(),
      jitter: rand(),
    });
  };

  const diagonals = [];
  for (let k = 0; k < rings.length; k++) {
    for (let i = 0; i < rays; i++) {
      const j = (i + 1) % rays;
      if (k === 0) { add([C, rings[0][i], rings[0][j]], 0); continue; }
      const a = rings[k - 1][i], b = rings[k - 1][j], c = rings[k][j], d = rings[k][i];
      if (k >= 2 && k < last) {
        // split the quad into two triangles (the outermost ring is mostly
        // off-screen, so it stays whole to keep the element count down)
        if (rand() < 0.5) { add([a, b, c], k); add([a, c, d], k); diagonals.push([a, c, k]); }
        else { add([a, b, d], k); add([b, c, d], k); diagonals.push([b, d, k]); }
      } else {
        add([a, b, c, d], k);
      }
    }
  }

  // Crack lines follow the shard edges.
  const cracks = [];
  const inner = rings.slice(0, -1);
  for (let i = 0; i < rays; i++) {
    cracks.push({ d: 'M' + [C, ...inner.map((r) => r[i])].map(fmt).join(' L'), ring: 0 });
  }
  inner.forEach((ring, k) => {
    for (let i = 0; i < rays; i++) {
      cracks.push({ d: `M${fmt(ring[i])} L${fmt(ring[(i + 1) % rays])}`, ring: k + 1 });
    }
  });
  diagonals.forEach(([p1, p2, k]) => {
    if (k < last) cracks.push({ d: `M${fmt(p1)} L${fmt(p2)}`, ring: k });
  });
  return { shards, cracks };
}

function preload(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = src;
  });
}

// The printed name: C, M, Y plates under a paper-white top plate.
function PrintedName() {
  return (
    <span className="lname">
      <span className="lname__plate lname__plate--c">{studio.name}</span>
      <span className="lname__plate lname__plate--m">{studio.name}</span>
      <span className="lname__plate lname__plate--y">{studio.name}</span>
      <span className="lname__plate lname__plate--k">{studio.name}</span>
    </span>
  );
}

export default function Preloader() {
  const root = useRef(null);
  const [done, setDone] = useState(false);
  // Shards are rendered on the client only. They're invisible until the
  // break (seconds after load), and rendering 170+ inline-styled elements on
  // the server just invites hydration mismatches: browsers re-serialise
  // numbers and clip-path strings slightly differently than React writes them.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { shards, cracks } = useMemo(() => buildShards(), []);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const counter = q('.loader__count')[0];
      const bar = q('.loader__bar i')[0];

      const release = () => {
        document.documentElement.classList.remove('is-loading');
        store.lenis?.start();
        store.setLoaded();
      };

      if (prefersReducedMotion()) { release(); setDone(true); return; }
      document.documentElement.classList.add('is-loading');

      // ---------- 1. Count 1 → 100 --------------------------------------
      // The counter follows a "loading curve" rather than a straight line:
      // quick bursts, short stalls, a slow crawl through the 90s — the way a
      // real download feels. It can never run ahead of what has actually
      // loaded (target), so on a slow connection it simply waits longer.
      const DURATION = 2600; // ms for the curve on a fast connection
      const jit = () => (Math.random() - 0.5) * 0.06; // a little variety per visit
      const CURVE = [
        [0.0, 0], [0.08, 6], [0.16, 14], [0.22, 17],   // start, first stall
        [0.34, 31], [0.4, 38], [0.47, 41],             // burst, stall
        [0.58, 57], [0.64, 63], [0.7, 66],             // burst, stall
        [0.78, 78], [0.85, 88], [0.9, 91],             // burst
        [0.95, 96], [0.98, 99], [1.0, 100],            // slow crawl to the end
      ].map(([t, v], i, arr) => [i && i < arr.length - 1 ? t + jit() * 0.5 : t, v]);
      const curve = (u) => {
        if (u >= 1) return 100;
        for (let i = 1; i < CURVE.length; i++) {
          const [t1, v1] = CURVE[i];
          const [t0c, v0] = CURVE[i - 1];
          if (u <= t1) {
            const k = (u - t0c) / Math.max(0.0001, t1 - t0c);
            return v0 + (v1 - v0) * (k * k * (3 - 2 * k)); // ease within each step
          }
        }
        return 100;
      };

      const t0 = performance.now();
      let target = 0, value = 0, shown = 1, finished = false;

      const tick = (_, dt) => {
        const cap = Math.min(target, curve((performance.now() - t0) / DURATION));
        value += (cap - value) * (1 - Math.pow(0.86, dt / 16.67)); // frame-rate independent
        const n = Math.max(1, Math.min(100, Math.round(value)));
        if (n !== shown) {
          shown = n;
          counter.textContent = n;
          bar.style.transform = `scaleX(${n / 100})`;
        }
        if (cap >= 100 && value > 99.5 && !finished) {
          finished = true;
          counter.textContent = 100;
          bar.style.transform = 'scaleX(1)';
          gsap.ticker.remove(tick);
          sequence();
        }
      };
      gsap.ticker.add(tick);

      const srcs = cases.map((c) => c.img);
      let loaded = 0;
      const loads = srcs.map((src) =>
        preload(src).then(() => { loaded += 1; target = (loaded / srcs.length) * 92; })
      );
      Promise.all([...loads, document.fonts?.ready]).then(() => { target = 100; });
      const safety = setTimeout(() => { target = 100; }, 8000); // slow network

      // ---------- 2–4. Name → crack → shatter --------------------------
      function sequence() {
        const whole = q('.loader__whole')[0];
        const namePlates = q('.loader__whole .lname__plate');
        const [pc, pm, py] = ['c', 'm', 'y'].map((k) => q(`.loader__whole .lname__plate--${k}`));
        const shardEls = q('.loader__shard');
        const crackEls = q('.loader__cracks path');
        // Paths use pathLength="1", so every crack draws from 1 → 0.
        gsap.set(crackEls, { strokeDasharray: 1, strokeDashoffset: 1 });

        const tl = gsap.timeline();

        // 2. number out, name prints in out of register, then snaps together
        tl.to(counter, { yPercent: -110, duration: 0.5, ease: 'expo.in' })
          .to(q('.loader__bar, .loader__label'), { opacity: 0, duration: 0.3 }, '<')
          .set(q('.loader__whole .lname'), { visibility: 'visible' })
          .from(namePlates, { yPercent: 110, duration: 0.8, ease: 'expo.out', stagger: 0.05 })
          .fromTo(pc, { x: -26, y: 8 }, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' }, '-=0.4')
          .fromTo(pm, { x: 22, y: -10 }, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' }, '<')
          .fromTo(py, { x: 6, y: 16 }, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' }, '<')

          // wind-up
          .to(whole, { scale: 0.965, duration: 0.3, ease: 'power2.in' }, '+=0.05')

          // 3. impact
          .addLabel('impact')
          .to(whole, { scale: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.3)' }, 'impact')
          .to(root.current, {
            keyframes: { x: [0, -12, 10, -6, 4, 0], y: [0, 7, -6, 3, -2, 0] },
            duration: 0.35, ease: 'none',
          }, 'impact')
          .set(q('.loader__cracks'), { opacity: 1 }, 'impact')
          .to(q('.loader__flash'), { opacity: 0.85, duration: 0.04 }, 'impact')
          .to(q('.loader__flash'), { opacity: 0, duration: 0.4 }, 'impact+=0.04');

        crackEls.forEach((p) => {
          const ring = Number(p.dataset.ring);
          tl.to(p, { strokeDashoffset: 0, duration: 0.12 + ring * 0.025, ease: 'power2.out' }, `impact+=${(ring * 0.04).toFixed(3)}`);
        });

        // 4. break: swap the intact sheet for its pre-cut shards and let go
        tl.addLabel('break', 'impact+=0.75')
          .set(whole, { autoAlpha: 0 }, 'break') // opacity too: the name inside has its own visibility
          .set(shardEls, { visibility: 'visible' }, 'break')
          .to(q('.loader__cracks'), { opacity: 0, duration: 0.2 }, 'break')
          .add(release, 'break+=0.35');

        // Shatter into small pieces that drift apart, turn, shrink and fade.
        // The centre goes first and the wave runs outward to the edges.
        const vw = window.innerWidth / 100;
        const vh = window.innerHeight / 100;
        shardEls.forEach((el, i) => {
          const s = shards[i];
          const dx = s.cx - 50, dy = s.cy - 50;
          const len = Math.hypot(dx, dy) || 1;
          const push = 4 + 10 * s.force + len * 0.12;       // small, local drift
          const delay = len * 0.009 + s.jitter * 0.18;       // outward wave
          const dur = 0.9 + s.force * 0.5;
          const at = `break+=${delay.toFixed(3)}`;
          gsap.set(el, { transformOrigin: s.origin });
          tl.to(el, {
            x: (dx / len) * push * vw,
            y: (dy / len) * push * vh + (3 + 6 * s.force) * vh, // a little gravity
            // 2D only: a flip is faked by squashing one axis, which looks the
            // same at this size but avoids 180 3D-composited layers.
            rotation: s.spin * 120,
            scaleX: (0.15 + s.jitter * 0.25) * Math.cos(s.tilt * 1.2),
            scaleY: 0.15 + s.jitter * 0.25,
            force3D: true,
            duration: dur,
            ease: 'power2.out',
          }, at)
            .to(el, { opacity: 0, duration: dur * 0.75, ease: 'power1.in' }, `break+=${(delay + dur * 0.2).toFixed(3)}`);
        });

        tl.add(() => setDone(true));
      }

      return () => { gsap.ticker.remove(tick); clearTimeout(safety); };
    },
    { scope: root }
  );

  if (done) return null;

  return (
    <div className="loader" ref={root} aria-hidden="true">
      {/* Intact sheet: the counter, then the name */}
      <div className="loader__whole">
        <p className="loader__label">{studio.name} studio</p>
        <div className="loader__center">
          <span className="loader__mask"><span className="loader__count">1</span></span>
          <PrintedName />
        </div>
        <div className="loader__bar"><i /></div>
      </div>

      {/* The same sheet, pre-cut into shards; shown only at the break */}
      {mounted && shards.map((s, i) => (
        <div
          className="loader__shard"
          key={i}
          style={{
            left: `${s.bx}vw`, top: `${s.by}vh`, width: `${s.bw}vw`, height: `${s.bh}vh`,
            clipPath: s.clip, WebkitClipPath: s.clip,
          }}
        >
          {/* Final, registered state only — plain white, no blend modes.
              The name layer is full-screen but shifted back by the shard's
              offset, so each piece shows exactly its slice of the name. */}
          {s.hasText && (
            <div className="loader__slice" style={{ left: `${-s.bx}vw`, top: `${-s.by}vh` }}>
              <div className="loader__center">
                <span className="lname"><span className="lname__plate lname__plate--k">{studio.name}</span></span>
              </div>
            </div>
          )}
        </div>
      ))}

      <svg className="loader__cracks" viewBox="0 0 100 100" preserveAspectRatio="none">
        {cracks.map((c, i) => <path key={i} d={c.d} data-ring={c.ring} pathLength="1" />)}
      </svg>
      <div className="loader__flash" />
    </div>
  );
}