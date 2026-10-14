export type LabelFormatType = 'brasil_express_4x6' | 'standard' | 'multi_level' | 'dual_position' | 'custom_canvas';

export type ArrowDirection = 'curved_down_left' | 'up' | 'down' | 'ground' | 'left' | 'right' | 'none';

export type PalletType = 'PBR' | 'EURO' | 'BOX' | 'GAIOLA' | 'NENHUM';

export type BarcodeSymbology = 'CODE128' | 'QR' | 'BOTH';

export type CanvasElementType = 'text' | 'barcode' | 'line' | 'arrow' | 'image' | 'rect';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  name: string;
  x: number; // 0 to 1000
  y: number; // 0 to 1500
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270 or -90
  content?: string; // Text string or barcode text
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  letterSpacing?: number;
  strokeWidth?: number;
  arrowType?: ArrowDirection;
  barcodeFormat?: 'CODE128' | 'QR';
  barcodeDisplayValue?: boolean;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  textAlign?: 'center' | 'left' | 'right';
  imageData?: string; // Base64 data URL for black and white logo/photo
  isLocked?: boolean;
}

export interface MultiLevelItem {
  levelNumber: string;
  subPosition: string;
  code: string;
  colorName: string;
  colorHex: string;
  arrow: ArrowDirection;
}

export interface DualPositionItem {
  position: string; // 'A' or 'B'
  code: string;
}

export interface LongarinaLabel {
  id: string;
  // Address coordinates
  street: string; // Rua / Corredor (ex: "20")
  bay: string; // Prédio / Módulo / Coluna (ex: "001")
  level: string; // Andar / Nível (ex: "1")
  position: string; // Apto / Vão / Posição (ex: "01")
  code: string; // Full address string (ex: "20-001-1-01")

  formatType: LabelFormatType;
  arrow: ArrowDirection;
  companyName?: string; // e.g. "BRASIL EXPRESS"
  loadCapacityKg: number; // e.g. 2200 kg / par
  palletType: PalletType;
  zone: string; // e.g. "PULMÃO", "PICKING"
  barcodeType: BarcodeSymbology;
  colorBand?: string;
  levelName?: string;

  // Visual Drag-and-Drop canvas elements
  elements?: CanvasElement[];

  // For multi-level labels
  multiLevels?: MultiLevelItem[];

  // For dual position labels
  dualPositions?: DualPositionItem[];

  customNotes?: string;
  copies: number;
  createdAt: string;
}

export interface LabelSizeConfig {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  dpi: 203 | 300;
  description: string;
}

export const PRESET_LABEL_SIZES: LabelSizeConfig[] = [
  {
    id: '4x6',
    name: '4 x 6 (101,6 mm x 152,4 mm)',
    widthMm: 101.6,
    heightMm: 152.4,
    dpi: 203,
    description: 'Padrão térmico 4x6 polegadas vertical conforme layout Brasil Express.',
  },
  {
    id: '100x50',
    name: '100 x 50 mm (Padrão WMS)',
    widthMm: 100,
    heightMm: 50,
    dpi: 203,
    description: 'Tamanho padrão de mercado para porta-paletes com alta visibilidade.',
  },
  {
    id: '100x30',
    name: '100 x 30 mm (Longarina Slim)',
    widthMm: 100,
    heightMm: 30,
    dpi: 203,
    description: 'Ideal para vigas/perfis de longarina com face frontal estreita.',
  },
  {
    id: '150x50',
    name: '150 x 50 mm (Multinível Térreo)',
    widthMm: 150,
    heightMm: 50,
    dpi: 203,
    description: 'Etiqueta ampla para colar na viga baixa com códigos de 3 a 5 níveis.',
  },
  {
    id: '80x40',
    name: '80 x 40 mm (Médio)',
    widthMm: 80,
    heightMm: 40,
    dpi: 203,
    description: 'Compacto para estruturas dinâmicas, mini-porta-paletes ou picking.',
  },
  {
    id: '70x30',
    name: '70 x 30 mm (Mini Porta-Palete)',
    widthMm: 70,
    heightMm: 30,
    dpi: 203,
    description: 'Estruturas leves de armazenagem e prateleiras industriais.',
  },
];

export interface PrinterDevice {
  type: 'browser' | 'webserial' | 'webbluetooth';
  name: string;
  status: 'disconnected' | 'connected' | 'connecting' | 'error';
  baudRate: number;
  protocol: 'zpl' | 'tspl' | 'escpos';
  details?: string;
}

export interface ScanResult {
  code: string;
  format: string;
  timestamp: string;
  matchedLabel?: LongarinaLabel;
  parsedAddress?: {
    street?: string;
    bay?: string;
    level?: string;
    position?: string;
  };
}

/**
 * Creates default draggable canvas elements matching the Brasil Express layout
 */
export function createDefaultBrasilExpressElements(
  street = '20',
  bay = '001',
  level = '1',
  position = '01',
  company = 'BRASIL EXPRESS',
  code = '20-001-1-01'
): CanvasElement[] {
  return [
    // Outer border
    {
      id: 'elem-border',
      type: 'rect',
      name: 'Moldura Externa',
      x: 20,
      y: 20,
      width: 960,
      height: 1460,
      rotation: 0,
      strokeWidth: 6,
      isLocked: false,
    },
    // Rua 20 & label
    {
      id: 'elem-num-rua',
      type: 'text',
      name: 'Número: Rua',
      x: 210,
      y: 240,
      width: 200,
      height: 140,
      rotation: -90,
      content: street,
      fontSize: 180,
      fontWeight: '900',
    },
    {
      id: 'elem-label-rua',
      type: 'text',
      name: 'Legenda: Rua',
      x: 130,
      y: 235,
      width: 100,
      height: 50,
      rotation: -90,
      content: 'Rua',
      fontSize: 40,
      fontWeight: '600',
    },
    // Hyphen 1
    {
      id: 'elem-hif-1',
      type: 'text',
      name: 'Separador -',
      x: 210,
      y: 420,
      width: 60,
      height: 60,
      rotation: -90,
      content: '-',
      fontSize: 180,
      fontWeight: '900',
    },
    // Prédio 001 & label
    {
      id: 'elem-num-predio',
      type: 'text',
      name: 'Número: Prédio',
      x: 210,
      y: 680,
      width: 280,
      height: 140,
      rotation: -90,
      content: bay,
      fontSize: 180,
      fontWeight: '900',
    },
    {
      id: 'elem-label-predio',
      type: 'text',
      name: 'Legenda: Prédio',
      x: 130,
      y: 680,
      width: 120,
      height: 50,
      rotation: -90,
      content: 'Prédio',
      fontSize: 40,
      fontWeight: '600',
    },
    // Hyphen 2
    {
      id: 'elem-hif-2',
      type: 'text',
      name: 'Separador -',
      x: 210,
      y: 930,
      width: 60,
      height: 60,
      rotation: -90,
      content: '-',
      fontSize: 180,
      fontWeight: '900',
    },
    // Andar 1 & label
    {
      id: 'elem-num-andar',
      type: 'text',
      name: 'Número: Andar',
      x: 210,
      y: 1070,
      width: 140,
      height: 140,
      rotation: -90,
      content: level,
      fontSize: 180,
      fontWeight: '900',
    },
    {
      id: 'elem-label-andar',
      type: 'text',
      name: 'Legenda: Andar',
      x: 130,
      y: 1070,
      width: 120,
      height: 50,
      rotation: -90,
      content: 'Andar',
      fontSize: 40,
      fontWeight: '600',
    },
    // Hyphen 3
    {
      id: 'elem-hif-3',
      type: 'text',
      name: 'Separador -',
      x: 210,
      y: 1195,
      width: 60,
      height: 60,
      rotation: -90,
      content: '-',
      fontSize: 180,
      fontWeight: '900',
    },
    // Apto 01 & label
    {
      id: 'elem-num-apto',
      type: 'text',
      name: 'Número: Apto',
      x: 210,
      y: 1370,
      width: 200,
      height: 140,
      rotation: -90,
      content: position,
      fontSize: 180,
      fontWeight: '900',
    },
    {
      id: 'elem-label-apto',
      type: 'text',
      name: 'Legenda: Apto',
      x: 130,
      y: 1370,
      width: 100,
      height: 50,
      rotation: -90,
      content: 'Apto',
      fontSize: 40,
      fontWeight: '600',
    },
    // Barcode Code 128
    {
      id: 'elem-barcode',
      type: 'barcode',
      name: 'Código de Barras (Code 128)',
      x: 610,
      y: 760,
      width: 480,
      height: 250,
      rotation: -90,
      content: code,
      barcodeFormat: 'CODE128',
    },
    // Divider line
    {
      id: 'elem-divider-line',
      type: 'line',
      name: 'Linha Divisória',
      x: 840,
      y: 760,
      width: 4,
      height: 760,
      rotation: 0,
      strokeWidth: 4,
    },
    // Company name
    {
      id: 'elem-company',
      type: 'text',
      name: 'Empresa: Brasil Express',
      x: 885,
      y: 760,
      width: 600,
      height: 80,
      rotation: -90,
      content: company,
      fontSize: 46,
      fontWeight: '800',
      letterSpacing: 3,
    },
    // Curved arrow icon
    {
      id: 'elem-arrow',
      type: 'arrow',
      name: 'Seta Curvada (Posição)',
      x: 770,
      y: 1310,
      width: 160,
      height: 160,
      rotation: 0,
      arrowType: 'curved_down_left',
    },
  ];
}

/**
 * Creates canvas elements with legend placed directly BELOW each number
 */
export function createLegendBelowBrasilExpressElements(
  street = '20',
  bay = '001',
  level = '1',
  position = '01',
  company = 'BRASIL EXPRESS',
  code = '20-001-1-01'
): CanvasElement[] {
  return [
    // Outer border
    {
      id: 'elem-border',
      type: 'rect',
      name: 'Moldura Externa',
      x: 20,
      y: 20,
      width: 960,
      height: 1460,
      rotation: 0,
      strokeWidth: 6,
      isLocked: false,
    },
    // Rua 20 & label BELOW
    {
      id: 'elem-num-rua',
      type: 'text',
      name: 'Número: Rua',
      x: 220,
      y: 160,
      width: 240,
      height: 120,
      rotation: 0,
      content: street,
      fontSize: 140,
      fontWeight: '900',
    },
    {
      id: 'elem-label-rua',
      type: 'text',
      name: 'Legenda: Rua (Embaixo)',
      x: 220,
      y: 260,
      width: 140,
      height: 40,
      rotation: 0,
      content: 'RUA',
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: 2,
    },
    // Separator line
    {
      id: 'elem-sep-1',
      type: 'line',
      name: 'Separador Linha 1',
      x: 220,
      y: 330,
      width: 180,
      height: 4,
      rotation: 90,
      strokeWidth: 3,
    },
    // Prédio 001 & label BELOW
    {
      id: 'elem-num-predio',
      type: 'text',
      name: 'Número: Prédio',
      x: 220,
      y: 470,
      width: 280,
      height: 120,
      rotation: 0,
      content: bay,
      fontSize: 140,
      fontWeight: '900',
    },
    {
      id: 'elem-label-predio',
      type: 'text',
      name: 'Legenda: Prédio (Embaixo)',
      x: 220,
      y: 570,
      width: 180,
      height: 40,
      rotation: 0,
      content: 'PRÉDIO',
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: 2,
    },
    // Separator line
    {
      id: 'elem-sep-2',
      type: 'line',
      name: 'Separador Linha 2',
      x: 220,
      y: 650,
      width: 180,
      height: 4,
      rotation: 90,
      strokeWidth: 3,
    },
    // Andar 1 & label BELOW
    {
      id: 'elem-num-andar',
      type: 'text',
      name: 'Número: Andar',
      x: 220,
      y: 780,
      width: 200,
      height: 120,
      rotation: 0,
      content: level,
      fontSize: 140,
      fontWeight: '900',
    },
    {
      id: 'elem-label-andar',
      type: 'text',
      name: 'Legenda: Andar (Embaixo)',
      x: 220,
      y: 880,
      width: 160,
      height: 40,
      rotation: 0,
      content: 'ANDAR',
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: 2,
    },
    // Separator line
    {
      id: 'elem-sep-3',
      type: 'line',
      name: 'Separador Linha 3',
      x: 220,
      y: 960,
      width: 180,
      height: 4,
      rotation: 90,
      strokeWidth: 3,
    },
    // Apto 01 & label BELOW
    {
      id: 'elem-num-apto',
      type: 'text',
      name: 'Número: Apto',
      x: 220,
      y: 1100,
      width: 240,
      height: 120,
      rotation: 0,
      content: position,
      fontSize: 140,
      fontWeight: '900',
    },
    {
      id: 'elem-label-apto',
      type: 'text',
      name: 'Legenda: Apto (Embaixo)',
      x: 220,
      y: 1200,
      width: 160,
      height: 40,
      rotation: 0,
      content: 'APTO',
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: 2,
    },
    // Barcode Code 128
    {
      id: 'elem-barcode',
      type: 'barcode',
      name: 'Código de Barras (Code 128)',
      x: 620,
      y: 750,
      width: 520,
      height: 280,
      rotation: -90,
      content: code,
      barcodeFormat: 'CODE128',
    },
    // Divider line
    {
      id: 'elem-divider-line',
      type: 'line',
      name: 'Linha Divisória',
      x: 840,
      y: 750,
      width: 4,
      height: 800,
      rotation: 0,
      strokeWidth: 4,
    },
    // Company name
    {
      id: 'elem-company',
      type: 'text',
      name: 'Empresa: Brasil Express',
      x: 885,
      y: 750,
      width: 600,
      height: 80,
      rotation: -90,
      content: company,
      fontSize: 46,
      fontWeight: '800',
      letterSpacing: 3,
    },
    // Curved arrow icon
    {
      id: 'elem-arrow',
      type: 'arrow',
      name: 'Seta Curvada (Posição)',
      x: 770,
      y: 1310,
      width: 160,
      height: 160,
      rotation: 0,
      arrowType: 'curved_down_left',
    },
  ];
}
