import { LongarinaLabel, LabelSizeConfig } from '../types/label';
import { sanitizeBarcodeValue } from './barcodeHelper';

/**
 * Generates raw ZPL (Zebra Programming Language) string for a Longarina Label.
 * Can be sent directly via Web Serial/USB to thermal printers (Zebra, Argox, Elgin, etc.)
 */
export function generateZpl(label: LongarinaLabel, config: LabelSizeConfig): string {
  const dotsPerMm = config.dpi === 300 ? 12 : 8;
  const widthDots = Math.round(config.widthMm * dotsPerMm);
  const heightDots = Math.round(config.heightMm * dotsPerMm);

  let zpl = '';
  zpl += `^XA\n`; // Start format
  zpl += `^PW${widthDots}\n`; // Set print width
  zpl += `^LL${heightDots}\n`; // Set label length
  zpl += `^LH0,0\n`; // Set label home
  zpl += `^CI28\n`; // UTF-8 character encoding

  if (label.elements && label.elements.length > 0) {
    // Dynamic Drag-and-Drop Canvas Elements
    zpl += generateCanvasElementsZpl(label, widthDots, heightDots, dotsPerMm);
  } else if (label.formatType === 'brasil_express_4x6') {
    // Exact Brasil Express 4x6 Vertical Layout
    zpl += generateBrasilExpressZpl(label, widthDots, heightDots, dotsPerMm);
  } else if (label.formatType === 'multi_level') {
    // Multi-level Ground Beam Label (Multiple barcodes stacked)
    zpl += generateMultiLevelZpl(label, widthDots, heightDots, dotsPerMm);
  } else if (label.formatType === 'dual_position') {
    // Dual Position Label (A & B side-by-side or stacked)
    zpl += generateDualPositionZpl(label, widthDots, heightDots, dotsPerMm);
  } else {
    // Standard Single Longarina Label
    zpl += generateStandardZpl(label, widthDots, heightDots, dotsPerMm);
  }

  zpl += `^XZ\n`; // End format
  return zpl;
}

function generateCanvasElementsZpl(
  label: LongarinaLabel,
  widthDots: number,
  heightDots: number,
  dotsPerMm: number
): string {
  let commands = '';
  const scaleX = widthDots / 1000;
  const scaleY = heightDots / 1500;

  (label.elements || []).forEach((el) => {
    const x = Math.round(el.x * scaleX);
    const y = Math.round(el.y * scaleY);
    const w = Math.round(el.width * scaleX);
    const h = Math.round(el.height * scaleY);

    if (el.type === 'rect') {
      const stroke = Math.round((el.strokeWidth || 4) * dotsPerMm * 0.25);
      commands += `^FO${x},${y}^GB${w},${h},${stroke}^FS\n`;
    } else if (el.type === 'text') {
      const fontSize = Math.round((el.fontSize || 40) * scaleX * 1.5);
      const rot = el.rotation === -90 || el.rotation === 270 ? 'R' : el.rotation === 90 ? 'B' : el.rotation === 180 ? 'I' : 'N';
      commands += `^FO${x},${y}^A0${rot},${fontSize},${fontSize}^FD${el.content || ''}^FS\n`;
    } else if (el.type === 'barcode') {
      const barH = Math.round(h * 0.85);
      const rot = el.rotation === -90 || el.rotation === 270 ? 'R' : el.rotation === 90 ? 'B' : el.rotation === 180 ? 'I' : 'N';
      const originX = rot === 'R' ? Math.max(0, x - Math.round(barH / 2)) : Math.max(0, x - Math.round(w / 2));
      const originY = rot === 'R' ? Math.max(0, y - Math.round(w / 2)) : Math.max(0, y - Math.round(h / 2));
      const cleanVal = sanitizeBarcodeValue(el.content || label.code || '20-001-1-01');
      commands += `^FO${originX},${originY}^BY3,3,${barH}^BC${rot},${barH},N,N,N^FD${cleanVal}^FS\n`;
    } else if (el.type === 'line') {
      const stroke = Math.round((el.strokeWidth || 4) * dotsPerMm * 0.25);
      commands += `^FO${x},${y - Math.round(h / 2)}^GB${Math.max(2, stroke)},${h},${stroke}^FS\n`;
    } else if (el.type === 'arrow') {
      commands += `^FO${x},${y}^A0R,${Math.round(8 * dotsPerMm)},${Math.round(8 * dotsPerMm)}^FD<\\^FS\n`;
    }
  });

  return commands;
}

function generateBrasilExpressZpl(
  label: LongarinaLabel,
  widthDots: number,
  heightDots: number,
  dotsPerMm: number
): string {
  let commands = '';
  const street = label.street || '20';
  const bay = label.bay || '001';
  const level = label.level || '1';
  const position = label.position || '01';
  const code = label.code || `${street}-${bay}-${level}-${position}`;
  const companyName = label.companyName || 'BRASIL EXPRESS';

  // Outer border frame
  const margin = Math.round(2.5 * dotsPerMm);
  commands += `^FO${margin},${margin}^GB${widthDots - margin * 2},${heightDots - margin * 2},4^FS\n`;

  // Left Column: Massive Vertical Address: 20-001-1-01
  const codeFontSize = Math.round(18 * dotsPerMm);
  commands += `^FO${Math.round(16 * dotsPerMm)},${Math.round(10 * dotsPerMm)}^A0R,${codeFontSize},${Math.round(codeFontSize * 0.85)}^FD${code}^FS\n`;

  // Sublabels aligned with segments: Rua, Prédio, Andar, Apto
  const sublabelFontSize = Math.round(4.5 * dotsPerMm);
  commands += `^FO${Math.round(30 * dotsPerMm)},${Math.round(14 * dotsPerMm)}^A0R,${sublabelFontSize},${sublabelFontSize}^FDRua^FS\n`;
  commands += `^FO${Math.round(30 * dotsPerMm)},${Math.round(44 * dotsPerMm)}^A0R,${sublabelFontSize},${sublabelFontSize}^FDPredio^FS\n`;
  commands += `^FO${Math.round(30 * dotsPerMm)},${Math.round(79 * dotsPerMm)}^A0R,${sublabelFontSize},${sublabelFontSize}^FDAndar^FS\n`;
  commands += `^FO${Math.round(30 * dotsPerMm)},${Math.round(106 * dotsPerMm)}^A0R,${sublabelFontSize},${sublabelFontSize}^FDApto^FS\n`;

  // Central Barcode with horizontal bars (rotated 90 degrees)
  const barcodeHeight = Math.round(28 * dotsPerMm);
  commands += `^FO${Math.round(46 * dotsPerMm)},${Math.round(45 * dotsPerMm)}^BY3,3,${barcodeHeight}^BCR,${barcodeHeight},N,N,N^FD${code}^FS\n`;

  // Vertical Divider Line next to Company Name
  commands += `^FO${Math.round(70 * dotsPerMm)},${Math.round(35 * dotsPerMm)}^GB3,${Math.round(76 * dotsPerMm)},3^FS\n`;

  // Company Name (e.g. BRASIL EXPRESS)
  const compFontSize = Math.round(5.5 * dotsPerMm);
  commands += `^FO${Math.round(75 * dotsPerMm)},${Math.round(48 * dotsPerMm)}^A0R,${compFontSize},${compFontSize}^FD${companyName}^FS\n`;

  // Corner Arrow Graphic (Curved down-left)
  if (label.arrow !== 'none') {
    const arrowX = Math.round(70 * dotsPerMm);
    const arrowY = Math.round(124 * dotsPerMm);
    commands += `^FO${arrowX},${arrowY}^A0R,${Math.round(8 * dotsPerMm)},${Math.round(8 * dotsPerMm)}^FD<\\^FS\n`;
  }

  return commands;
}

function generateStandardZpl(
  label: LongarinaLabel,
  widthDots: number,
  heightDots: number,
  dotsPerMm: number
): string {
  let commands = '';

  // Outer border frame (high contrast industrial border)
  const margin = Math.round(2 * dotsPerMm);
  commands += `^FO${margin},${margin}^GB${widthDots - margin * 2},${heightDots - margin * 2},3^FS\n`;

  // Top header bar (Street, Bay, Zone)
  const headerY = margin + Math.round(3 * dotsPerMm);
  const streetX = margin + Math.round(4 * dotsPerMm);
  commands += `^FO${streetX},${headerY}^A0N,${Math.round(4.5 * dotsPerMm)},${Math.round(4.5 * dotsPerMm)}^FDRUA ${label.street} | PREDIO ${label.bay}^FS\n`;

  // Zone & Pallet type on top right
  const rightHeaderX = widthDots - Math.round(35 * dotsPerMm);
  commands += `^FO${rightHeaderX},${headerY}^A0N,${Math.round(3.8 * dotsPerMm)},${Math.round(3.8 * dotsPerMm)}^FD${label.zone} [${label.palletType}]^FS\n`;

  // Divider line
  const divY1 = headerY + Math.round(7 * dotsPerMm);
  commands += `^FO${margin},${divY1}^GB${widthDots - margin * 2},2,2^FS\n`;

  // Giant Address Display (e.g. 01.04.02.01 or R01-P04-N02-V01)
  const codeY = divY1 + Math.round(4 * dotsPerMm);
  const addressFontSize = Math.round(11 * dotsPerMm);
  commands += `^FO${streetX},${codeY}^A0N,${addressFontSize},${addressFontSize}^FD${label.code}^FS\n`;

  // Level & Arrow indicator badge on middle-right
  const badgeX = widthDots - Math.round(28 * dotsPerMm);
  const badgeY = codeY;
  const arrowChar = label.arrow === 'up' ? '▲' : label.arrow === 'down' ? '▼' : label.arrow === 'ground' ? '■' : '►';
  commands += `^FO${badgeX},${badgeY}^A0N,${Math.round(5 * dotsPerMm)},${Math.round(5 * dotsPerMm)}^FDNIV ${label.level}^FS\n`;
  commands += `^FO${badgeX + Math.round(16 * dotsPerMm)},${badgeY}^A0N,${Math.round(5.5 * dotsPerMm)},${Math.round(5.5 * dotsPerMm)}^FD${arrowChar}^FS\n`;

  // Barcode 1D (Code 128)
  const barcodeY = codeY + Math.round(14 * dotsPerMm);
  const barcodeHeight = Math.max(Math.round(12 * dotsPerMm), heightDots - barcodeY - Math.round(11 * dotsPerMm));
  commands += `^FO${streetX},${barcodeY}^BY2,2.8,${barcodeHeight}^BCN,${barcodeHeight},Y,N,N^FD${label.code}^FS\n`;

  // QR Code on right if configured
  if (label.barcodeType === 'QR' || label.barcodeType === 'BOTH') {
    const qrX = widthDots - Math.round(22 * dotsPerMm);
    commands += `^FO${qrX},${barcodeY}^BQN,2,4^FDMM,A${label.code}^FS\n`;
  }

  // Footer: Load capacity & Safety notice
  const footerY = heightDots - Math.round(6 * dotsPerMm);
  commands += `^FO${streetX},${footerY}^A0N,${Math.round(3.2 * dotsPerMm)},${Math.round(3.2 * dotsPerMm)}^FDCARGA MAX: ${label.loadCapacityKg.toLocaleString('pt-BR')} KG/PAR^FS\n`;

  if (label.customNotes) {
    commands += `^FO${widthDots - Math.round(45 * dotsPerMm)},${footerY}^A0N,${Math.round(3.2 * dotsPerMm)},${Math.round(3.2 * dotsPerMm)}^FD${label.customNotes.substring(0, 20)}^FS\n`;
  }

  return commands;
}

function generateDualPositionZpl(
  label: LongarinaLabel,
  widthDots: number,
  heightDots: number,
  dotsPerMm: number
): string {
  let commands = '';
  const margin = Math.round(2 * dotsPerMm);
  commands += `^FO${margin},${margin}^GB${widthDots - margin * 2},${heightDots - margin * 2},3^FS\n`;

  // Header
  const headerY = margin + Math.round(3 * dotsPerMm);
  commands += `^FO${margin + 10},${headerY}^A0N,${Math.round(4 * dotsPerMm)},${Math.round(4 * dotsPerMm)}^FDRUA ${label.street} | PREDIO ${label.bay} | NIV ${label.level} [${label.zone}]^FS\n`;
  commands += `^FO${widthDots - Math.round(36 * dotsPerMm)},${headerY}^A0N,${Math.round(3.5 * dotsPerMm)},${Math.round(3.5 * dotsPerMm)}^FDCAP: ${label.loadCapacityKg} KG^FS\n`;

  const divY1 = headerY + Math.round(6 * dotsPerMm);
  commands += `^FO${margin},${divY1}^GB${widthDots - margin * 2},2,2^FS\n`;

  // Split in half horizontally for Position A and Position B
  const halfWidth = Math.floor((widthDots - margin * 2) / 2);
  const midX = margin + halfWidth;
  commands += `^FO${midX},${divY1}^GB2,${heightDots - divY1 - margin},2^FS\n`;

  // Position A (Left half)
  const posA = label.dualPositions?.[0] || { position: 'A', code: `${label.code}.A` };
  const leftX = margin + Math.round(4 * dotsPerMm);
  const contentY = divY1 + Math.round(4 * dotsPerMm);
  commands += `^FO${leftX},${contentY}^A0N,${Math.round(6 * dotsPerMm)},${Math.round(6 * dotsPerMm)}^FDVAO ${posA.position}: ${posA.code}^FS\n`;
  commands += `^FO${leftX},${contentY + Math.round(8 * dotsPerMm)}^BY2,2.5,${Math.round(14 * dotsPerMm)}^BCN,${Math.round(14 * dotsPerMm)},Y,N,N^FD${posA.code}^FS\n`;

  // Position B (Right half)
  const posB = label.dualPositions?.[1] || { position: 'B', code: `${label.code}.B` };
  const rightX = midX + Math.round(4 * dotsPerMm);
  commands += `^FO${rightX},${contentY}^A0N,${Math.round(6 * dotsPerMm)},${Math.round(6 * dotsPerMm)}^FDVAO ${posB.position}: ${posB.code}^FS\n`;
  commands += `^FO${rightX},${contentY + Math.round(8 * dotsPerMm)}^BY2,2.5,${Math.round(14 * dotsPerMm)}^BCN,${Math.round(14 * dotsPerMm)},Y,N,N^FD${posB.code}^FS\n`;

  return commands;
}

function generateMultiLevelZpl(
  label: LongarinaLabel,
  widthDots: number,
  heightDots: number,
  dotsPerMm: number
): string {
  let commands = '';
  const margin = Math.round(2 * dotsPerMm);
  commands += `^FO${margin},${margin}^GB${widthDots - margin * 2},${heightDots - margin * 2},3^FS\n`;

  // Left header banner: Rack Coordinates
  const leftColWidth = Math.round(30 * dotsPerMm);
  commands += `^FO${margin + leftColWidth},${margin}^GB2,${heightDots - margin * 2},2^FS\n`;

  // In the left column: Street and Bay info
  const startX = margin + Math.round(3 * dotsPerMm);
  commands += `^FO${startX},${margin + Math.round(4 * dotsPerMm)}^A0N,${Math.round(4 * dotsPerMm)},${Math.round(4 * dotsPerMm)}^FDRUA^FS\n`;
  commands += `^FO${startX},${margin + Math.round(9 * dotsPerMm)}^A0N,${Math.round(9 * dotsPerMm)},${Math.round(9 * dotsPerMm)}^FD${label.street}^FS\n`;
  commands += `^FO${startX},${margin + Math.round(20 * dotsPerMm)}^A0N,${Math.round(4 * dotsPerMm)},${Math.round(4 * dotsPerMm)}^FDPREDIO^FS\n`;
  commands += `^FO${startX},${margin + Math.round(25 * dotsPerMm)}^A0N,${Math.round(9 * dotsPerMm)},${Math.round(9 * dotsPerMm)}^FD${label.bay}^FS\n`;
  commands += `^FO${startX},${heightDots - Math.round(6 * dotsPerMm)}^A0N,${Math.round(3 * dotsPerMm)},${Math.round(3 * dotsPerMm)}^FD${label.loadCapacityKg}KG^FS\n`;

  // Right area: Each level with code and barcode
  const levels = label.multiLevels || [
    { levelNumber: '04', subPosition: '01', code: `${label.street}.${label.bay}.04.01`, colorName: 'VERDE', colorHex: '#16a34a', arrow: 'up' },
    { levelNumber: '03', subPosition: '01', code: `${label.street}.${label.bay}.03.01`, colorName: 'VERMELHO', colorHex: '#dc2626', arrow: 'up' },
    { levelNumber: '02', subPosition: '01', code: `${label.street}.${label.bay}.02.01`, colorName: 'AZUL', colorHex: '#2563eb', arrow: 'up' },
    { levelNumber: '01', subPosition: '01', code: `${label.street}.${label.bay}.01.01`, colorName: 'AMARELO', colorHex: '#eab308', arrow: 'ground' },
  ];

  const availableHeight = heightDots - margin * 2;
  const rowHeight = Math.floor(availableHeight / levels.length);
  const rightX = margin + leftColWidth + Math.round(4 * dotsPerMm);

  levels.forEach((lvl, idx) => {
    const rowY = margin + idx * rowHeight + Math.round(2 * dotsPerMm);
    const arrow = lvl.arrow === 'ground' ? '■' : '▲';

    commands += `^FO${rightX},${rowY}^A0N,${Math.round(4.5 * dotsPerMm)},${Math.round(4.5 * dotsPerMm)}^FDNIV ${lvl.levelNumber} [${arrow}] - ${lvl.code}^FS\n`;
    commands += `^FO${rightX + Math.round(45 * dotsPerMm)},${rowY}^BY1.6,2,${Math.round(rowHeight * 0.55)}^BCN,${Math.round(rowHeight * 0.55)},N,N,N^FD${lvl.code}^FS\n`;

    if (idx < levels.length - 1) {
      commands += `^FO${margin + leftColWidth},${margin + (idx + 1) * rowHeight}^GB${widthDots - margin * 2 - leftColWidth},1,1^FS\n`;
    }
  });

  return commands;
}

/**
 * Download ZPL string as a .zpl file
 */
export function downloadZplFile(zplContent: string, filename = 'etiquetas_longarina.zpl') {
  const blob = new Blob([zplContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
