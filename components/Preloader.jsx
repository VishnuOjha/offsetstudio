'use client';
import { useRef, useState } from 'react';
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

  Performance notes (this runs while the page is still booting, often on an
  integrated GPU, so it is built to keep the number of GPU layers small):
  • The cracks are drawn on ONE <canvas>. They used to be ~160 SVG paths whose
    stroke-dashoffset was tweened, which repainted the whole screen every frame.
  • The shards are drawn on ONE <canvas>. They used to be ~170 DOM elements,
    each a separate composited layer with a polygon mask, all created in the
    frame of the break. Now a single tween redraws them. The name is drawn once
    into a bitmap (canvas text matches the DOM name to a fraction of a pixel when
    the width axis is set) and each shard paints its slice of it. Those slices
    are pre-rendered once into a small texture atlas, in slices during the calm
    moments before the impact, so a frame of the shatter is just polygon fills and
    image draws: no clip masks, which is what a weak GPU (or a software renderer)
    is worst at. Pieces that haven't
    been released yet are drawn as one compound path, so the intact sheet has no
    hairline seams. The sheet is pre-drawn while still hidden, so nothing has to
    be built in the frame of the break.
*/

// Deterministic random so the pattern is stable between visits.
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

  const shards = [];
  const add = (pts, ring) => {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    // Pieces that lie completely off-screen are never seen: skip them.
    if (Math.max(...xs) <= 0 || Math.min(...xs) >= 100 || Math.max(...ys) <= 0 || Math.min(...ys) >= 100) return;
    shards.push({
      ring, cx, cy,
      pts: pts.map((p) => [p.x, p.y]),
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

  // Crack lines follow the shard edges. Each is a polyline with its segment
  // lengths, so it can be drawn part-way as it "shoots out".
  const line = (arr, ring) => {
    const pts = arr.map((p) => [p.x, p.y]);
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push(l); total += l;
    }
    return { pts, segs, total, ring };
  };
  const cracks = [];
  const inner = rings.slice(0, -1);
  for (let i = 0; i < rays; i++) cracks.push(line([C, ...inner.map((r) => r[i])], 0));
  inner.forEach((ring, k) => {
    for (let i = 0; i < rays; i++) cracks.push(line([ring[i], ring[(i + 1) % rays]], k + 1));
  });
  diagonals.forEach(([p1, p2, k]) => { if (k < last) cracks.push(line([p1, p2], k)); });
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

      // ---------- Shard + crack layers (client only) ----------------------
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const { shards, cracks } = buildShards();

      // Shard layer (hidden until the break).
      const sh = q('.loader__shatter')[0];
      const sdpr = Math.min(window.devicePixelRatio || 1, 2); // it takes over from the crisp DOM sheet
      sh.width = Math.round(vw * sdpr);
      sh.height = Math.round(vh * sdpr);
      const sc = sh.getContext('2d');
      const css = getComputedStyle(document.documentElement);
      const ink = css.getPropertyValue('--ink').trim() || '#000';
      const paths = shards.map((s) => {
        const p = new Path2D();
        s.pts.forEach(([x, y], i) => (i ? p.lineTo((x * vw) / 100, (y * vh) / 100) : p.moveTo((x * vw) / 100, (y * vh) / 100)));
        p.closePath();
        return p;
      });

      const cv = q('.loader__cracks')[0];
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(vw * dpr);
      cv.height = Math.round(vh * dpr);
      const cx = cv.getContext('2d');
      const paper = css.getPropertyValue('--paper').trim() || '#f4f5f2';

      // t = seconds since the impact. Every crack starts a little later the
      // further out it is, then races along its length with an ease-out.
      const drawCracks = (t) => {
        cx.setTransform(1, 0, 0, 1, 0, 0);
        cx.clearRect(0, 0, cv.width, cv.height);
        cx.setTransform(cv.width / 100, 0, 0, cv.height / 100, 0, 0); // work in % of the screen
        cx.lineWidth = 0.16;
        cx.lineCap = 'round'; cx.lineJoin = 'round';
        cx.strokeStyle = paper;
        cx.beginPath();
        for (const c of cracks) {
          const k = (t - c.ring * 0.04) / (0.12 + c.ring * 0.025);
          if (k <= 0) continue;
          let left = (k >= 1 ? 1 : 1 - (1 - k) * (1 - k)) * c.total; // power2.out
          cx.moveTo(c.pts[0][0], c.pts[0][1]);
          for (let i = 1; i < c.pts.length && left > 0; i++) {
            const seg = c.segs[i - 1];
            if (left >= seg) { cx.lineTo(c.pts[i][0], c.pts[i][1]); left -= seg; }
            else {
              const f = left / seg;
              cx.lineTo(c.pts[i - 1][0] + (c.pts[i][0] - c.pts[i - 1][0]) * f, c.pts[i - 1][1] + (c.pts[i][1] - c.pts[i - 1][1]) * f);
              left = 0;
            }
          }
        }
        cx.stroke();
      };

      // The name, drawn once into a bitmap exactly where the DOM name sits, so the
      // shards carry the very pixels the intact sheet was showing. Returns false if
      // this browser's canvas text doesn't match the page's (then the shards stay
      // plain black and the DOM name fades out by itself).
      let nameCv = null, nameBox = null, textRects = [];
      const buildName = () => {
        const plate = root.current?.querySelector('.loader__whole .lname__plate--k');
        if (!plate) return false;
        const cs = getComputedStyle(plate);
        const rg = document.createRange();
        rg.selectNodeContents(plate);
        const r = rg.getBoundingClientRect();
        const fs = parseFloat(cs.fontSize);
        const pad = Math.ceil(fs * 0.15);
        nameBox = { x: r.left - pad, y: r.top - pad, w: Math.ceil(r.width + pad * 2), h: Math.ceil(r.height + pad * 2) };
        nameCv = document.createElement('canvas');
        nameCv.width = Math.ceil(nameBox.w * sdpr);
        nameCv.height = Math.ceil(nameBox.h * sdpr);
        const n = nameCv.getContext('2d');
        if (!('fontStretch' in n) || !('letterSpacing' in n)) return false;
        n.scale(sdpr, sdpr);
        n.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
        n.fontStretch = 'expanded'; // = the font-variation-settings 'wdth' 125 the name uses
        n.letterSpacing = cs.letterSpacing;
        n.fillStyle = paper;
        n.textBaseline = 'alphabetic';
        const m = n.measureText(studio.name);
        if (Math.abs(m.width - r.width) > 1.5) return false; // different glyph widths: don't trust it
        n.fillText(studio.name, pad, pad + m.fontBoundingBoxAscent);
        // For each shard: the part of the name bitmap it overlaps (or null).
        textRects = paths.map((_, i) => {
          const xs = shards[i].pts.map((p) => (p[0] * vw) / 100);
          const ys = shards[i].pts.map((p) => (p[1] * vh) / 100);
          const x0 = Math.max(Math.min(...xs) - 2, nameBox.x);
          const y0 = Math.max(Math.min(...ys) - 2, nameBox.y);
          const x1 = Math.min(Math.max(...xs) + 2, nameBox.x + nameBox.w);
          const y1 = Math.min(Math.max(...ys) + 2, nameBox.y + nameBox.h);
          return x1 > x0 && y1 > y0 ? { x0, y0, w: x1 - x0, h: y1 - y0 } : null;
        });
        return true;
      };

      // Texture atlas for the shards that carry a slice of the name. A cell holds
      // just the part of the shard that overlaps the name (its ink plus the paper
      // lettering, ~0.4M px in all), packed in rows at CSS-pixel resolution: shards
      // are in motion and shrinking when they are drawn from it. While flying, a
      // shard is its polygon filled in ink, plus (if it has one) its cell drawn on
      // top: no clip masks per frame. Shards without lettering are just filled.
      let atlas = null, actx = null, cells = [], built = 0;
      const prepareAtlas = (textOK) => {
        cells = shards.map((_, i) => {
          const tr = textOK && textRects[i];
          return tr ? { i, ox: tr.x0 - 2, oy: tr.y0 - 2, w: Math.ceil(tr.w) + 4, h: Math.ceil(tr.h) + 4, x: 0, y: 0 } : null;
        });
        const list = cells.filter(Boolean);
        const AW = 2048;
        let x = 0, y = 0, rowH = 0;
        [...list].sort((p, q2) => q2.h - p.h).forEach((cl) => {
          if (x + cl.w > AW) { x = 0; y += rowH; rowH = 0; }
          cl.x = x; cl.y = y; x += cl.w; rowH = Math.max(rowH, cl.h);
        });
        atlas = document.createElement('canvas');
        atlas.width = AW;
        atlas.height = Math.max(1, y + rowH);
        actx = atlas.getContext('2d');
        built = 0;
        const buildCells = (n) => {
          for (let k = 0; k < n && built < list.length; k++, built++) {
            const cl = list[built];
            actx.save();
            actx.beginPath();
            actx.rect(cl.x, cl.y, cl.w, cl.h); // a plain rectangle clip: the polygon can spill past the cell
            actx.clip();
            actx.setTransform(1, 0, 0, 1, cl.x - cl.ox, cl.y - cl.oy); // screen px → atlas cell
            actx.fillStyle = ink;
            actx.fill(paths[cl.i]);
            const tr = textRects[cl.i];
            // 'source-atop' paints the name only where the polygon's ink already is (edges included).
            actx.globalCompositeOperation = 'source-atop';
            actx.drawImage(nameCv, (tr.x0 - nameBox.x) * sdpr, (tr.y0 - nameBox.y) * sdpr, tr.w * sdpr, tr.h * sdpr, tr.x0, tr.y0, tr.w, tr.h);
            actx.restore();
          }
        };
        // A few cells per frame once the number has slid out (that half second is
        // already busy); finished for certain by the impact.
        const chunk = () => { buildCells(5); if (built >= list.length) gsap.ticker.remove(chunk); };
        return {
          start: () => gsap.ticker.add(chunk),
          finish: () => { gsap.ticker.remove(chunk); buildCells(Infinity); },
        };
      };

      // ---------- 2–4. Name → crack → shatter --------------------------
      function sequence() {
        const textOK = buildName();
        const atlasJob = prepareAtlas(textOK);
        const whole = q('.loader__whole')[0];
        const namePlates = q('.loader__whole .lname__plate');
        const [pc, pm, py] = ['c', 'm', 'y'].map((k) => q(`.loader__whole .lname__plate--${k}`));

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
          .add(atlasJob.finish, 'impact')
          .to(whole, { scale: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.3)' }, 'impact')
          .to(root.current, {
            keyframes: { x: [0, -12, 10, -6, 4, 0], y: [0, 7, -6, 3, -2, 0] },
            duration: 0.35, ease: 'none',
          }, 'impact')
          .set(cv, { opacity: 1 }, 'impact')
          .to(q('.loader__flash'), { opacity: 0.85, duration: 0.04 }, 'impact')
          .to(q('.loader__flash'), { opacity: 0, duration: 0.4 }, 'impact+=0.04');

        // The last crack is done ~0.58s after the impact.
        const crackClock = { t: 0 };
        tl.to(crackClock, { t: 0.62, duration: 0.62, ease: 'none', onUpdate: () => drawCracks(crackClock.t) }, 'impact');

        // 4. break: swap the intact sheet for its pre-cut shards and let go
        tl.addLabel('break', 'impact+=0.75');
        if (textOK) {
          tl.set(whole, { autoAlpha: 0 }, 'break'); // opacity too: the name inside has its own visibility
        } else {
          // No trustworthy bitmap of the name: shards are plain black, the name fades on its own.
          tl.set(whole, { backgroundColor: 'transparent' }, 'break')
            .to(q('.loader__whole .lname'), { autoAlpha: 0, scale: 1.04, duration: 0.5, ease: 'power2.in' }, 'break');
        }
        tl.set(sh, { visibility: 'visible' }, 'break')
          .to(cv, { opacity: 0, duration: 0.2 }, 'break')
          .add(release, 'break+=0.35');

        // Shatter into small pieces that drift apart, turn, shrink and fade.
        // The centre goes first and the wave runs outward to the edges.
        // One tween drives every shard (ease-out motion, ease-in fade).
        const px = vw / 100, py2 = vh / 100;
        const S = shards.map((s) => {
          const dx = s.cx - 50, dy = s.cy - 50;
          const len = Math.hypot(dx, dy) || 1;
          const push = 4 + 10 * s.force + len * 0.12;       // small, local drift
          const delay = len * 0.009 + s.jitter * 0.18;       // outward wave
          const dur = 0.9 + s.force * 0.5;
          return {
            ox: s.cx * px, oy: s.cy * py2,
            x: (dx / len) * push * px,
            y: (dy / len) * push * py2 + (3 + 6 * s.force) * py2, // a little gravity
            rot: s.spin * 120 * (Math.PI / 180),
            // A flip is faked by squashing one axis.
            sx: (0.15 + s.jitter * 0.25) * Math.cos(s.tilt * 1.2),
            sy: 0.15 + s.jitter * 0.25,
            delay, dur, fadeAt: delay + dur * 0.2, fadeDur: dur * 0.75, gone: false,
          };
        });
        const total = Math.max(...S.map((p) => Math.max(p.delay + p.dur, p.fadeAt + p.fadeDur)));
        const clock = { t: 0 };
        const step = () => {
          const t = clock.t;
          sc.setTransform(1, 0, 0, 1, 0, 0);
          sc.globalAlpha = 1;
          sc.clearRect(0, 0, sh.width, sh.height);

          // Pieces not released yet: one compound path (no seams), name drawn once across it.
          const rest = new Path2D();
          let anyRest = false;
          for (let i = 0; i < S.length; i++) {
            if (!S[i].gone && t <= S[i].delay) { rest.addPath(paths[i]); anyRest = true; }
          }
          if (anyRest) {
            sc.setTransform(sdpr, 0, 0, sdpr, 0, 0);
            sc.fillStyle = ink;
            sc.fill(rest);
            if (textOK) {
              sc.globalCompositeOperation = 'source-atop'; // name only where the sheet is
              sc.drawImage(nameCv, nameBox.x, nameBox.y, nameBox.w, nameBox.h);
              sc.globalCompositeOperation = 'source-over';
            }
          }

          // Pieces in flight: one transformed image draw each, from the atlas.
          for (let i = 0; i < S.length; i++) {
            const p = S[i];
            if (p.gone || t <= p.delay) continue;
            const k = (t - p.delay) / p.dur;
            const e = k >= 1 ? 1 : 1 - (1 - k) * (1 - k); // power2.out
            const ko = (t - p.fadeAt) / p.fadeDur;
            if (ko >= 1) { p.gone = true; continue; }
            const ang = p.rot * e, sx = 1 + (p.sx - 1) * e, sy = 1 + (p.sy - 1) * e;
            const cs = Math.cos(ang), sn = Math.sin(ang);
            const a = cs * sx, b = sn * sx, c = -sn * sy, d = cs * sy;
            sc.setTransform(
              sdpr * a, sdpr * b, sdpr * c, sdpr * d,
              sdpr * (p.ox + p.x * e - a * p.ox - c * p.oy), sdpr * (p.oy + p.y * e - b * p.ox - d * p.oy)
            );
            sc.globalAlpha = ko > 0 ? 1 - ko * ko : 1; // power1.in
            sc.fillStyle = ink;
            sc.fill(paths[i]);
            const cl = cells[i];
            if (cl) sc.drawImage(atlas, cl.x, cl.y, cl.w, cl.h, cl.ox, cl.oy, cl.w, cl.h);
          }
        };
        step(); // pre-draw the intact sheet now, while the canvas is still hidden: no first-frame cost at the break
        tl.to(clock, { t: total, duration: total, ease: 'none', onUpdate: step }, 'break');

        tl.add(atlasJob.start, 0.55); // absolute time: after the number has slid out
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

      {/* The same sheet, pre-cut into shards (drawn by the effect); shown only at the break */}
      <canvas className="loader__shatter" />

      <canvas className="loader__cracks" />
      <div className="loader__flash" />
    </div>
  );
}
