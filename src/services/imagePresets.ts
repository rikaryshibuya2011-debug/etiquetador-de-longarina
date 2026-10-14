/**
 * High-contrast monochrome SVG presets for thermal warehouse labels
 */

// Helper to convert SVG string to Base64 Data URL
function svgToDataUrl(svgString: string): string {
  if (typeof window === 'undefined') return '';
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

export interface ImagePreset {
  id: string;
  name: string;
  category: string;
  dataUrl: string;
  defaultWidth: number;
  defaultHeight: number;
}

export const MONOCHROME_PRESETS: ImagePreset[] = [
  {
    id: 'preset-logo-brasil-express',
    name: 'Logo Brasil Express (P&B)',
    category: 'Empresa',
    defaultWidth: 260,
    defaultHeight: 120,
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 140" width="300" height="140">
        <rect x="0" y="0" width="300" height="140" fill="#ffffff"/>
        <rect x="8" y="8" width="284" height="124" fill="none" stroke="#000000" stroke-width="8"/>
        <rect x="18" y="18" width="264" height="42" fill="#000000"/>
        <text x="150" y="47" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle" letter-spacing="4">BRASIL</text>
        <text x="150" y="100" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="34" fill="#000000" text-anchor="middle" letter-spacing="3">EXPRESS</text>
        <line x1="28" y1="116" x2="272" y2="116" stroke="#000000" stroke-width="6"/>
      </svg>
    `),
  },
  {
    id: 'preset-empilhadeira',
    name: 'Símbolo Empilhadeira / Logística',
    category: 'Logística',
    defaultWidth: 160,
    defaultHeight: 160,
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect x="0" y="0" width="200" height="200" fill="#ffffff"/>
        <circle cx="100" cy="100" r="92" fill="none" stroke="#000000" stroke-width="8"/>
        <!-- Forklift silhouette -->
        <rect x="40" y="80" width="60" height="50" fill="#000000"/>
        <rect x="65" y="55" width="35" height="30" fill="none" stroke="#000000" stroke-width="8"/>
        <line x1="120" y1="35" x2="120" y2="145" stroke="#000000" stroke-width="12"/>
        <line x1="120" y1="140" x2="165" y2="140" stroke="#000000" stroke-width="10"/>
        <!-- Pallet on forks -->
        <rect x="128" y="95" width="35" height="40" fill="#000000"/>
        <!-- Wheels -->
        <circle cx="55" cy="145" r="16" fill="#000000"/>
        <circle cx="105" cy="145" r="16" fill="#000000"/>
      </svg>
    `),
  },
  {
    id: 'preset-palete-pbr',
    name: 'Selo Palete PBR Padrão',
    category: 'Norma',
    defaultWidth: 180,
    defaultHeight: 120,
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160">
        <rect x="0" y="0" width="240" height="160" fill="#ffffff"/>
        <rect x="6" y="6" width="228" height="148" fill="none" stroke="#000000" stroke-width="8" rx="8"/>
        <text x="120" y="60" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="44" fill="#000000" text-anchor="middle" letter-spacing="4">PBR</text>
        <line x1="20" y1="78" x2="220" y2="78" stroke="#000000" stroke-width="6"/>
        <text x="120" y="112" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="18" fill="#000000" text-anchor="middle">1000 x 1200 mm</text>
        <text x="120" y="136" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="14" fill="#000000" text-anchor="middle">ABRAS / NBR</text>
      </svg>
    `),
  },
  {
    id: 'preset-carga-maxima',
    name: 'Alerta Carga Máxima NBR',
    category: 'Segurança',
    defaultWidth: 200,
    defaultHeight: 120,
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 160" width="260" height="160">
        <rect x="0" y="0" width="260" height="160" fill="#ffffff"/>
        <polygon points="130,12 248,148 12,148" fill="none" stroke="#000000" stroke-width="10" stroke-linejoin="round"/>
        <text x="130" y="90" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="48" fill="#000000" text-anchor="middle">!</text>
        <text x="130" y="135" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="20" fill="#000000" text-anchor="middle">CARGA MÁXIMA</text>
      </svg>
    `),
  },
  {
    id: 'preset-seta-dupla-curva',
    name: 'Seta Posição Brasil Express',
    category: 'Indicação',
    defaultWidth: 160,
    defaultHeight: 160,
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <rect x="0" y="0" width="160" height="160" fill="#ffffff"/>
        <path d="M 66 36 L 46 54 L 72 70" fill="none" stroke="#000000" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 98 100 C 98 62 82 46 64 52 L 68 40 L 36 60 L 66 84 L 62 72 C 76 68 84 76 84 100 Z" fill="none" stroke="#000000" stroke-width="8" stroke-linejoin="round"/>
      </svg>
    `),
  },
];
