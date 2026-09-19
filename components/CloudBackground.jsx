'use client';
import { useEffect, useRef } from 'react';
import { store } from '@/lib/store';

// Full-screen WebGL clouds behind the page. Domain-warped fractal noise,
// drawn at reduced resolution (clouds are soft, so nobody can tell).
// Scrolling lifts the clouds (parallax), scroll speed churns them, and the
// tint drifts from cool cyan-grey at the top to warm magenta-grey lower down.
// The cursor drags a wake through the sky: the clouds part under it, swirl
// around its path and slowly close up again behind it.
const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform float uScroll;    // page scroll in px
uniform float uProgress;  // 0..1 down the page
uniform float uSpeed;     // smoothed |scroll velocity|
uniform vec3  uPaper;
uniform vec3  uTintA;
uniform vec3  uTintB;
uniform float uDensity;
const int TRAIL = 14;
uniform vec3  uTrail[TRAIL];  // xy: position in uv (y up), z: strength 0..1

float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
// Fewer octaves than a "hero" shader would use: the clouds are rendered
// small and upscaled, so the finest octaves were never visible anyway.
float fbm4(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for(int i = 0; i < 4; i++){ v += a*noise(p); p = r*p*2.02 + 0.13; a *= 0.5; }
  return v;
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for(int i = 0; i < 5; i++){ v += a*noise(p); p = r*p*2.02 + 0.13; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 asp = vec2(uRes.x/uRes.y, 1.0);

  // Cursor wake: each trail point swirls and pushes the sky around it.
  vec2 warp = vec2(0.0);
  float hole = 0.0;
  float rim = 0.0;
  for (int i = 0; i < TRAIL; i++) {
    vec3 tr = uTrail[i];
    if (tr.z < 0.002) continue;
    vec2 d = (uv - tr.xy) * asp;
    float r2 = dot(d, d);
    float fall = exp(-r2 / 0.010) * tr.z;
    warp += vec2(-d.y, d.x) * fall * 2.4   // swirl
          + d * fall * 1.1;               // push outward
    float h = exp(-r2 / 0.0055) * tr.z;
    hole = max(hole, h);
    rim = max(rim, exp(-r2 / 0.012) * tr.z - h);
  }

  vec2 p = (uv * asp + warp) * 1.6;

  // Scroll moves the sky upward, slower than the page.
  p.y -= uScroll * 0.00045;
  float t = uTime * 0.025;

  // Domain warp: noise bends the coordinates of more noise.
  vec2 q = vec2(fbm4(p + vec2(0.0, t)), fbm4(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm4(p + 3.0*q + vec2(1.7, 9.2) + t*1.3),
                fbm4(p + 3.0*q + vec2(8.3, 2.8) - t*0.9));
  float f = fbm(p + 2.6*r);

  float cloud = smoothstep(0.35, 0.95, f + uDensity);
  cloud *= 1.0 - clamp(hole * 1.2, 0.0, 1.0);     // clouds part under the cursor
  cloud = max(cloud, clamp(rim, 0.0, 1.0) * 0.35); // and bank up around the gap
  float shade = smoothstep(0.2, 0.9, length(q));

  vec3 tint = mix(uTintA, uTintB, smoothstep(0.1, 0.9, uProgress));
  vec3 col = mix(uPaper, tint, cloud * 0.55);
  col = mix(col, col * 0.93, shade * cloud * 0.5);    // soft undersides
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.02; // film grain, kills banding
  gl_FragColor = vec4(col, 1.0);
}`;

const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export default function CloudBackground({
  paper = '#f4f5f2',
  tintA = '#b9d6e6', // cool, cyan-grey
  tintB = '#e3c2d4', // warm, magenta-grey
  density = 0.05,
  quality = 0.4,     // render scale vs CSS pixels; 0.3–0.5 is plenty
  maxWidth = 900,    // hard cap on the render width in pixels
}) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) { canvas.style.display = 'none'; return; }

    // React Strict Mode (dev) mounts → unmounts → mounts again on the SAME
    // canvas. If a previous run lost the context, bring it back first.
    if (gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.restoreContext();

    const compile = (type, src) => {
      const s = gl.createShader(type);
      if (!s) throw new Error('WebGL context unavailable (createShader returned null)');
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s) || 'shader compile failed');
      }
      return s;
    };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link failed');
      gl.useProgram(prog);
    } catch (e) {
      console.warn('Clouds disabled:', e); canvas.style.display = 'none'; return;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n) => gl.getUniformLocation(prog, n);
    const U = {
      res: u('uRes'), time: u('uTime'), scroll: u('uScroll'), progress: u('uProgress'),
      speed: u('uSpeed'), paper: u('uPaper'), a: u('uTintA'), b: u('uTintB'), density: u('uDensity'),
      trail: u('uTrail'),
    };
    // Trail of recent cursor positions, newest first.
    const TRAIL = 14;
    const trail = new Float32Array(TRAIL * 3);
    const head = { x: 0.5, y: 0.5 };
    let sampleClock = 0;
    gl.uniform3fv(U.paper, hex(paper));
    gl.uniform3fv(U.a, hex(tintA));
    gl.uniform3fv(U.b, hex(tintB));
    gl.uniform1f(U.density, density);

    // Clouds are soft, so render them small and let the browser upscale.
    // Device pixel ratio is ignored on purpose: a 2× screen would otherwise
    // cost 4× the pixels for no visible gain.
    let maxScroll = 1;
    const measure = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    const resize = () => {
      const s = Math.min(quality, maxWidth / window.innerWidth);
      canvas.width = Math.max(1, Math.round(window.innerWidth * s));
      canvas.height = Math.max(1, Math.round(window.innerHeight * s));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.res, canvas.width, canvas.height);
      measure();
    };
    resize();
    window.addEventListener('resize', resize);
    // Page height changes (fonts, pinning, images) without a window resize.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0; let speed = 0; let clock = 0; let last = performance.now();
    let calm = false; // true when nothing is moving → draw at ~30 fps
    const draw = () => {
      const now = performance.now();
      if (calm && now - last < 32) return; // idle clouds don't need 60 fps
      const dt = Math.min((now - last) / 1000, 0.1); last = now;
      const y = store.lenis ? store.lenis.animatedScroll : window.scrollY;
      const max = maxScroll;
      speed += (Math.abs(store.velocity || 0) - speed) * 0.05;
      // Scroll speed makes the clouds churn faster, then they settle.
      if (!reduce) clock += dt * (1 + Math.min(speed, 60) * 0.35);
      gl.uniform1f(U.time, clock);
      gl.uniform1f(U.scroll, y);
      gl.uniform1f(U.progress, y / max);
      gl.uniform1f(U.speed, speed * 40);

      // ---- cursor wake ----
      const m = store.mouse;
      const fade = Math.pow(0.955, dt * 60);          // points decay over ~1.5s
      for (let i = 0; i < TRAIL; i++) trail[i * 3 + 2] *= fade;
      if (m && m.active && !reduce) {
        const tx = m.x / window.innerWidth;
        const ty = 1 - m.y / window.innerHeight;
        head.x += (tx - head.x) * Math.min(1, dt * 14);
        head.y += (ty - head.y) * Math.min(1, dt * 14);
        const mv = Math.min(1, Math.hypot(m.vx, m.vy) / 30);
        sampleClock += dt;
        if (sampleClock > 0.035) {                    // drop a new point ~30×/s
          sampleClock = 0;
          trail.copyWithin(3, 0, (TRAIL - 1) * 3);
          trail[0] = head.x; trail[1] = head.y;
          trail[2] = Math.min(1, 0.25 + mv * 0.9 + m.burst);
        } else {
          trail[0] = head.x; trail[1] = head.y;       // newest point rides the cursor
          trail[2] = Math.max(trail[2], 0.25 + m.burst * 0.75); // idle cursor still parts a little
        }
      }
      gl.uniform3fv(U.trail, trail);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const mouseMoving = m && m.active && Math.hypot(m.vx, m.vy) > 0.3;
      calm = speed < 0.3 && trail[2] < 0.3 && !mouseMoving;
    };
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    if (reduce) {
      draw();
      window.addEventListener('scroll', draw, { passive: true });
    } else {
      loop();
    }
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) loop();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', draw);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      // Free GPU objects but keep the context alive: Strict Mode re-runs this
      // effect on the same canvas, and a lost context can't compile shaders.
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [paper, tintA, tintB, density, quality, maxWidth]);

  return <canvas ref={ref} className="clouds" aria-hidden="true" />;
}