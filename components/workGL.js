// WebGL layer for the work slider.
// The DOM keeps the layout (and the <img> fallback); Pixi reads each
// figure's box every frame and draws the image there, so the canvas
// always matches the draggable DOM exactly. Drag speed feeds a
// displacement ripple and a CMYK-style channel split.

function makeNoiseCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  // Smooth-ish value noise: layered sines, tileable.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const n =
        Math.sin(u * 2 + Math.cos(v * 3)) * 0.5 +
        Math.sin(v * 4 + Math.sin(u * 2)) * 0.35 +
        Math.sin((u + v) * 3) * 0.15;
      const g = Math.round((n * 0.5 + 0.5) * 255);
      const i = (y * size + x) * 4;
      img.data[i] = g;
      img.data[i + 1] = Math.round((Math.cos(u * 3 + v) * 0.5 + 0.5) * 255);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export async function createWorkGL({ host, figures, sources, getVelocity, axis = 'x' }) {
  const vertical = axis === 'y';
  const PIXI = await import('pixi.js');
  const { RGBSplitFilter } = await import('pixi-filters');
  const { gsap } = await import('gsap');

  const app = new PIXI.Application();
  await app.init({
    resizeTo: host,
    backgroundAlpha: 0,
    antialias: false,                                      // image edges only; not worth MSAA
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 1.5), // 2× costs ~1.8× the pixels
    preference: 'webgl',
    autoStart: false,                                      // we render from GSAP's ticker
  });
  app.canvas.className = 'work__canvas';
  app.canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(app.canvas);

  const textures = await Promise.all(sources.map((src) => PIXI.Assets.load(src)));

  const scene = new PIXI.Container();
  app.stage.addChild(scene);

  // Displacement map (repeat-wrapped so we can scroll it forever).
  const noiseTex = PIXI.Texture.from(makeNoiseCanvas());
  noiseTex.source.addressMode = 'repeat';
  const noise = new PIXI.Sprite(noiseTex);
  noise.width = noise.height = 512;
  noise.renderable = false; // used by the filter only
  app.stage.addChild(noise);

  const displace = new PIXI.DisplacementFilter({ sprite: noise, scale: 0 });
  const split = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  const FILTERS = [displace, split];
  scene.filters = null; // filters are full-screen passes: only switch them on while moving
  let filtersOn = false;

  const items = figures.map((fig, i) => {
    const holder = new PIXI.Container();
    const sprite = new PIXI.Sprite(textures[i]);
    sprite.anchor.set(0.5);
    const mask = new PIXI.Graphics().rect(0, 0, 1, 1).fill(0xffffff);
    holder.addChild(sprite, mask);
    holder.mask = mask;
    scene.addChild(holder);
    return { fig, sprite, mask, hover: 0, hoverTarget: 0 };
  });

  figures.forEach((fig, i) => {
    fig.addEventListener('pointerenter', () => (items[i].hoverTarget = 1));
    fig.addEventListener('pointerleave', () => (items[i].hoverTarget = 0));
  });

  let v = 0;
  let t = 0;
  // Warm up the GPU now (this runs while the preloader is still showing):
  // one render with the filters on uploads every texture and compiles every
  // shader, so the first scroll into the cases doesn't hitch.
  scene.filters = FILTERS;
  app.render();
  scene.filters = null;

  let running = true;
  let hostBox = host.getBoundingClientRect();
  const onResize = () => { hostBox = host.getBoundingClientRect(); };
  window.addEventListener('resize', onResize);

  // Runs inside GSAP's ticker, i.e. in the same frame and after Lenis and
  // ScrollTrigger have moved the DOM — so the canvas never lags a frame
  // behind the page (that one-frame lag reads as "jank" while scrolling).
  const update = (_, deltaMs) => {
    if (!running) return;
    const dt = deltaMs / 16.67;
    t += dt;
    hostBox = host.getBoundingClientRect(); // sticky host: cheap, one read per frame
    v += (getVelocity() - v) * 0.12;
    const speed = Math.min(Math.abs(v), 40);

    const wantFilters = speed > 0.4;
    if (wantFilters !== filtersOn) {
      filtersOn = wantFilters;
      scene.filters = wantFilters ? FILTERS : null;
    }

    // Ripple and channel split run along the direction of travel.
    displace.scale.x = speed * (vertical ? 0.35 : 0.9);
    displace.scale.y = speed * (vertical ? 0.6 : 0.35);
    noise.x = t * 1.2;
    noise.y = t * 0.4;

    const s = Math.sign(v) * Math.min(speed * 0.3, 10);
    if (vertical) {
      split.redY = -s; split.greenY = s * 0.5; split.blueY = s;
    } else {
      split.redX = -s; split.greenX = s * 0.5; split.blueX = s;
    }

    for (const it of items) {
      const r = it.fig.getBoundingClientRect();
      const x = r.left - hostBox.left;
      const y = r.top - hostBox.top;
      const visible = vertical
        ? y + r.height > -50 && y < hostBox.height + 50
        : x + r.width > -50 && x < hostBox.width + 50;
      it.sprite.parent.visible = visible;
      if (!visible) continue;

      it.mask.position.set(x, y);
      it.mask.scale.set(r.width, r.height);

      it.hover += (it.hoverTarget - it.hover) * 0.08;
      const tex = it.sprite.texture;
      const cover = Math.max(r.width / tex.width, r.height / tex.height);
      const zoom = 1.12 + it.hover * 0.08; // extra room for parallax
      it.sprite.scale.set(cover * zoom);
      // Inner parallax: the picture lags behind its frame while moving.
      if (vertical) {
        const off = (y + r.height / 2 - hostBox.height / 2) / hostBox.height;
        it.sprite.position.set(x + r.width / 2, y + r.height / 2 - off * r.height * 0.1);
      } else {
        const off = (x + r.width / 2 - hostBox.width / 2) / hostBox.width;
        it.sprite.position.set(x + r.width / 2 - off * r.width * 0.08, y + r.height / 2);
      }
    }
  };
  const frame = (time, deltaMs) => {
    if (!running) return;
    update(time, deltaMs);
    app.render();
  };
  gsap.ticker.add(frame);

  return {
    start: () => { running = true; },
    stop: () => { running = false; },
    destroy: () => {
      running = false;
      gsap.ticker.remove(frame);
      window.removeEventListener('resize', onResize);
      // Unbind the filters before tearing down, so Pixi doesn't warn about
      // destroying textures that a shader still references (seen in dev,
      // where React Strict Mode creates and destroys this once on mount).
      scene.filters = null;
      displace.destroy();
      split.destroy();
      app.destroy(true, { children: true });
    },
  };
}