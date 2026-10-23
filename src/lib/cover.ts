// Generated contour cover for projects without screenshots, seeded by slug. Returns SVG markup.
export function coverSvg(seed: string, accent = '#ff7a66') {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rand = () => (h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296;

  const [cx, cy] = [40 + rand() * 80, 25 + rand() * 40];
  const [p1, p2, p3] = [rand(), rand(), rand()].map((x) => x * Math.PI * 2);
  const rings = Array.from({ length: 16 }, (_, k) => {
    const r = 5 + k * 5.2;
    const pts = Array.from({ length: 96 }, (_, i) => {
      const a = (i / 96) * Math.PI * 2;
      const rr = r * (1 + 0.16 * Math.sin(3 * a + p1 + k * 0.15) + 0.08 * Math.sin(5 * a + p2) + 0.05 * Math.sin(2 * a + p3 - k * 0.2));
      return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a) * 0.8).toFixed(1)}`;
    }).join(' ');
    const ring = k % 5 === 4;
    return `<polygon points="${pts}" fill="none" stroke="${ring ? accent : '#2a3542'}" stroke-width="${ring ? 0.45 : 0.3}"/>`;
  });
  // explicit width/height: WebGL galleries cannot size an SVG texture from a viewBox alone
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice"><rect width="160" height="90" fill="#0d1115"/>${rings.join('')}</svg>`;
}

export const coverDataUri = (seed: string, accent?: string) => `data:image/svg+xml;utf8,${encodeURIComponent(coverSvg(seed, accent))}`;
