import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

/**
 * Sanitizes string for Code 128 standard compliance.
 * Removes non-ASCII characters and accents, trims whitespace.
 */
export function sanitizeBarcodeValue(val: string): string {
  if (!val) return '01';
  return val
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents (e.g., É -> E)
    .replace(/[^\x20-\x7E]/g, '') // Keep standard printable ASCII
    .toUpperCase();
}

/**
 * Generates an SVG string representation of a Code 128 barcode
 * Includes standard 15-module quiet zones and solid white background for 100% optical scanner readability
 */
export function generateBarcodeSvg(
  value: string,
  options?: { height?: number; displayValue?: boolean; width?: number; margin?: number }
): string {
  const sanitized = sanitizeBarcodeValue(value);
  if (!sanitized) return '';
  try {
    const xmlSerializer = typeof window !== 'undefined' ? new XMLSerializer() : null;
    const documentObj = typeof document !== 'undefined' ? document : null;

    if (!documentObj || !xmlSerializer) return '';

    const svg = documentObj.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, sanitized, {
      format: 'CODE128',
      width: options?.width || 2,
      height: options?.height || 80,
      displayValue: options?.displayValue ?? false,
      margin: options?.margin ?? 15, // Mandatory 10+ module quiet zone for optical scanners
      background: '#ffffff', // Solid white background required for optical barcode readers
      lineColor: '#000000',
    });

    const origW = svg.getAttribute('width') || '260';
    const origH = svg.getAttribute('height') || '90';

    svg.setAttribute('viewBox', `0 0 ${origW} ${origH}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('style', 'width: 100%; height: 100%; display: block;');

    return xmlSerializer.serializeToString(svg);
  } catch (err) {
    console.error('Failed to generate Code128 SVG:', err);
    return '';
  }
}

export interface BarcodeRenderData {
  innerHtml: string;
  viewBoxWidth: number;
  viewBoxHeight: number;
  dataUrl?: string;
  sanitizedValue: string;
}

/**
 * Generates a high-contrast crisp raster Data URL for Code 128
 * Rendered at high DPI with generous quiet zones so mobile cameras and thermal printers scan instantly
 */
export function generateBarcodeDataUrl(
  value: string,
  options?: { width?: number; height?: number; displayValue?: boolean; margin?: number }
): string {
  const sanitized = sanitizeBarcodeValue(value);
  if (!sanitized) return '';
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, sanitized, {
      format: 'CODE128',
      width: options?.width || 3,
      height: options?.height || 120,
      displayValue: options?.displayValue ?? false,
      margin: options?.margin ?? 20, // 20px quiet zone prevents edge cutoff
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to generate barcode data URL:', err);
    return '';
  }
}

/**
 * Returns native SVG paths/rects and natural viewBox dimensions for Code 128.
 * Provides pure vector scaling with guaranteed ISO/IEC 15417 quiet zones (margin 15)
 * and white backdrop so handheld scanners and phone cameras can read effortlessly.
 */
export function getBarcodeRenderData(value: string): BarcodeRenderData {
  const sanitized = sanitizeBarcodeValue(value);
  if (!sanitized) {
    return { innerHtml: '', viewBoxWidth: 260, viewBoxHeight: 90, sanitizedValue: '' };
  }
  try {
    const documentObj = typeof document !== 'undefined' ? document : null;
    if (!documentObj) return { innerHtml: '', viewBoxWidth: 260, viewBoxHeight: 90, sanitizedValue: sanitized };

    const svg = documentObj.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, sanitized, {
      format: 'CODE128',
      width: 2,
      height: 80,
      displayValue: false,
      margin: 15, // Mandatory 15-module quiet zone on both left and right
      background: '#ffffff', // Crisp white background
      lineColor: '#000000',
    });

    const w = Number(svg.getAttribute('width')) || 260;
    const h = Number(svg.getAttribute('height')) || 90;
    const dataUrl = generateBarcodeDataUrl(sanitized, { width: 3, height: 120, margin: 20 });

    return {
      innerHtml: svg.innerHTML,
      viewBoxWidth: w,
      viewBoxHeight: h,
      dataUrl,
      sanitizedValue: sanitized,
    };
  } catch (err) {
    console.error('Failed to get barcode render data:', err);
    return { innerHtml: '', viewBoxWidth: 260, viewBoxHeight: 90, sanitizedValue: sanitized };
  }
}

/**
 * Generates a QR Code as Data URL with quiet zone
 */
export async function generateQrCodeDataUrl(value: string): Promise<string> {
  const sanitized = sanitizeBarcodeValue(value);
  if (!sanitized) return '';
  try {
    return await QRCode.toDataURL(sanitized, {
      width: 240,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR Code Data URL:', err);
    return '';
  }
}

/**
 * Formats a warehouse address into standard notation or Brasil Express 4x6 style
 * E.g.: "20-001-1-01" or "01.04.02.01"
 */
export function formatBrasilExpressCode(
  street: string,
  bay: string,
  level: string,
  position: string
): string {
  const s = (street || '01').trim().padStart(2, '0');
  const b = (bay || '001').trim().padStart(3, '0');
  const l = (level || '1').trim();
  const p = (position || '01').trim().padStart(2, '0');
  return `${s}-${b}-${l}-${p}`;
}

export function formatAddressCode(
  street: string,
  bay: string,
  level: string,
  position: string,
  separator: '.' | '-' | '/' = '-'
): string {
  const s = street.trim().padStart(2, '0');
  const b = bay.trim().padStart(3, '0');
  const l = level.trim();
  const p = position.trim().padStart(2, '0');

  if (separator === '-') {
    return `${s}-${b}-${l}-${p}`;
  }
  return `${s}${separator}${b}${separator}${l}${separator}${p}`;
}

/**
 * Tries to parse scanned barcode into warehouse coordinates
 */
export function parseScannedAddress(code: string) {
  const clean = code.trim().toUpperCase();

  // Format: R01-P04-N02-V01 or R01-P04-N02-VA
  const structuredRegex = /R(\d+)[-._]P(\d+)[-._]N(\d+)[-._]V([A-Z0-9]+)/i;
  const match1 = clean.match(structuredRegex);
  if (match1) {
    return {
      street: match1[1],
      bay: match1[2],
      level: match1[3],
      position: match1[4],
    };
  }

  // Format: 01.04.02.01 or 01-04-02-A
  const parts = clean.split(/[-./_ ]+/);
  if (parts.length >= 4) {
    return {
      street: parts[0],
      bay: parts[1],
      level: parts[2],
      position: parts[3],
    };
  }

  return undefined;
}
