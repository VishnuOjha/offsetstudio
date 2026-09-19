# Offset — studio site (Next.js + GSAP + Lenis + PixiJS)

## Run
```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Rebrand
- `lib/content.js` — studio name, hero wordmark split, copy, services, cases, awards, socials.
- `public/work/` — case images (4:5 works best). Update paths in `content.js`.
- `public/reel.mp4` — showreel for the "Play the reel" modal.
- Colours and type scale: tokens at the top of `app/globals.css`.

## Where each interaction lives
| Interaction | File |
|---|---|
| Preloader (real load progress, CMYK bars, wipe) | `components/Preloader.jsx` |
| Smooth scroll (Lenis on GSAP ticker) | `components/SmoothScroll.jsx` |
| Blend-mode ring cursor: stretches with speed, fills with labels (`data-cursor="..."`), arrows on `Drag` | `components/Cursor.jsx` |
| Header hide/show + full-screen menu | `components/Header.jsx` |
| Hero CMYK misregistered wordmark | `components/Hero.jsx` |
| Rotating circle badge | `components/CircleBadge.jsx` |
| Scroll-velocity marquee | `components/Marquee.jsx` |
| Scroll-scrubbed word reveal | `components/Statement.jsx` |
| Sliding mixed-type services | `components/Services.jsx` |
| Case showcase: pinned, scroll/drag moves full-height slides sideways, WebGL ripple + colour split, explore badges | `components/Work.jsx`, `components/workGL.js` |
| Cloudy WebGL background (parallax + churn on scroll, tint shifts down the page) | `components/CloudBackground.jsx` |
| Count-up awards | `components/Awards.jsx` |
| Magnetic buttons | `components/Magnetic.jsx` |
| Footer wordmark rise | `components/Footer.jsx` |

Shared state (loader done, Lenis instance, scroll velocity) is in `lib/store.js`.
GSAP plugins are registered once in `lib/gsap.js`.

Reduced-motion users get a still, fully visible page with native scrolling.

## Cloud background
`<CloudBackground />` in `app/page.js` accepts props:
`paper`, `tintA` (top of page), `tintB` (bottom), `density` (−0.2 thin … 0.2 heavy), `quality` (render scale, 0.35–0.6).
