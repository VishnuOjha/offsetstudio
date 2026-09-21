import { ImageResponse } from 'next/og';
import { studio } from '@/lib/content';

export const alt = 'Offset — Design & development studio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The wordmark printed three times, out of register: cyan, magenta, black.
export default function OpenGraphImage() {
  const word = studio.name.toLowerCase();
  const plate = (color, dx, dy) => (
    <div
      style={{
        position: 'absolute', left: 80 + dx, top: 130 + dy,
        fontSize: 360, fontWeight: 900, letterSpacing: -20, lineHeight: 1, color,
      }}
    >
      {word}
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#f4f5f2' }}>
        {plate('#00a0e3', -12, 8)}
        {plate('#e4007c', 10, -6)}
        {plate('#000000', 0, 0)}
        <div style={{ position: 'absolute', left: 84, bottom: 56, fontSize: 34, color: '#000' }}>
          Design &amp; development studio
        </div>
      </div>
    ),
    size
  );
}
