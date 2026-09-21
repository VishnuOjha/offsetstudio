// Fonts are self-hosted from npm (no request to Google at build or runtime).
import '@fontsource-variable/archivo/wdth.css'; // weight 100–900, width 62–125
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import 'lenis/dist/lenis.css';
import './globals.css';
import { studio, copy } from '@/lib/content';

export const metadata = {
  // Absolute base for social-card URLs. Set NEXT_PUBLIC_SITE_URL in production.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://offset.studio'),
  title: copy.meta.title,
  description: copy.meta.description,
  openGraph: {
    type: 'website',
    siteName: studio.name,
    title: copy.meta.title,
    description: copy.meta.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: copy.meta.title,
    description: copy.meta.description,
  },
};

export const viewport = { themeColor: '#f4f5f2' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* The preloader is JS-driven; without JS it would cover the page forever. */}
        <noscript>
          <style>{'.loader{display:none}'}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
