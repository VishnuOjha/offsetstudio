# Offset — studio site (Next.js + GSAP + Lenis + PixiJS)

## Run
```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Rebrand
- `lib/content.js` — studio name, hero wordmark split, all UI copy (`copy`: hero text, marquees, section labels, badges), services, cases, awards, socials.
- `public/work/` — case images (4:5 works best). Update paths in `content.js`.
- `public/reel.mp4` — showreel for the "Play the reel" modal. The button stays hidden until this file exists.
- `NEXT_PUBLIC_SITE_URL` — production URL, used for social-card links (defaults to `https://offset.studio`).
- `app/icon.svg` (favicon) and `app/opengraph-image.js` (share image) — swap for your own.
- Colours and type scale: tokens at the top of `app/globals.css`.

## Where each interaction lives
| Interaction | File |
|---|---|
| Preloader (real load progress, CMYK bars, wipe) | `components/Preloader.jsx` |
| Smooth scroll (Lenis on GSAP ticker) | `components/SmoothScroll.jsx` |
| Blend-mode ring cursor: stretches with speed, fills with labels (`data-cursor="..."`; an empty value opts out of a parent's label) | `components/Cursor.jsx` |
| Header hide/show + full-screen menu | `components/Header.jsx` |
| Hero CMYK misregistered wordmark | `components/Hero.jsx` |
| Rotating circle badge | `components/CircleBadge.jsx` |
| Scroll-velocity marquee | `components/Marquee.jsx` |
| Scroll-scrubbed word reveal | `components/Statement.jsx` |
| Sliding mixed-type services | `components/Services.jsx` |
| Case showcase: cases stack down the page on alternating sides with a sticky counter; a sticky WebGL layer draws the images with scroll-speed ripple + colour split (desktop only, phones use plain images); explore badges | `components/Work.jsx`, `components/workGL.js` |
| Cloudy WebGL background (parallax + churn on scroll, tint shifts down the page) | `components/CloudBackground.jsx` |
| Count-up awards | `components/Awards.jsx` |
| Magnetic buttons | `components/Magnetic.jsx` |
| Footer wordmark rise | `components/Footer.jsx` |
| Showreel modal (focus-trapped, Esc to close) | `components/ReelModal.jsx` |

Shared state (loader done, Lenis instance, scroll velocity) is in `lib/store.js`.
GSAP plugins are registered once in `lib/gsap.js`.

Reduced-motion users get a still, fully visible page with native scrolling.

## Cloud background
`<CloudBackground />` in `app/page.js` accepts props:
`paper`, `tintA` (top of page), `tintB` (bottom), `density` (−0.2 thin … 0.2 heavy), `quality` (render scale, 0.35–0.6).
