// Fonts are self-hosted from npm (no request to Google at build or runtime).
import '@fontsource-variable/archivo/wdth.css'; // weight 100–900, width 62–125
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import 'lenis/dist/lenis.css';
import './globals.css';

export const metadata = {
  title: 'Offset — Design & development studio',
  description:
    'Offset is a design and development studio building brand systems, websites and motion.',
};

export const viewport = { themeColor: '#f4f5f2' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
