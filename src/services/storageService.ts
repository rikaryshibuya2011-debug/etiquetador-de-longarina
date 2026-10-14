import {
  LongarinaLabel,
  LabelSizeConfig,
  PRESET_LABEL_SIZES,
  createDefaultBrasilExpressElements,
} from '../types/label';

const STORAGE_KEYS = {
  SAVED_LABELS: 'longarinaprint_saved_labels_v1',
  PRINT_HISTORY: 'longarinaprint_history_v1',
  LABEL_SIZE: 'longarinaprint_label_size_v1',
  COLOR_CODING_ENABLED: 'longarinaprint_color_coding_v1',
};

// Default sample beam labels for immediate warehouse preview
const INITIAL_DEMO_LABELS: LongarinaLabel[] = [
  {
    id: 'demo-brasil-express',
    street: '20',
    bay: '001',
    level: '1',
    position: '01',
    code: '20-001-1-01',
    formatType: 'brasil_express_4x6',
    companyName: 'BRASIL EXPRESS',
    arrow: 'curved_down_left',
    loadCapacityKg: 2200,
    palletType: 'PBR',
    zone: 'PULMÃO',
    barcodeType: 'CODE128',
    copies: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-brasil-express-2',
    street: '20',
    bay: '001',
    level: '2',
    position: '01',
    code: '20-001-2-01',
    formatType: 'brasil_express_4x6',
    companyName: 'BRASIL EXPRESS',
    arrow: 'curved_down_left',
    loadCapacityKg: 2200,
    palletType: 'PBR',
    zone: 'PULMÃO',
    barcodeType: 'CODE128',
    copies: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    street: '01',
    bay: '04',
    level: '01',
    position: '01',
    code: '01.04.01.01',
    formatType: 'standard',
    arrow: 'ground',
    loadCapacityKg: 2500,
    palletType: 'PBR',
    zone: 'PICKING',
    barcodeType: 'BOTH',
    colorBand: '#eab308', // Yellow
    levelName: 'NÍVEL 01 (PISO)',
    customNotes: 'PICKING DINÂMICO',
    copies: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    street: '02',
    bay: '08',
    level: '01',
    position: '01',
    code: '02.08.MULTI',
    formatType: 'multi_level',
    arrow: 'none',
    loadCapacityKg: 2000,
    palletType: 'PBR',
    zone: 'PULMÃO',
    barcodeType: 'CODE128',
    levelName: 'MULTINÍVEL TÉRREO (1 AO 4)',
    copies: 1,
    createdAt: new Date().toISOString(),
    multiLevels: [
      { levelNumber: '04', subPosition: '01', code: '02.08.04.01', colorName: 'Verde (N4)', colorHex: '#16a34a', arrow: 'up' },
      { levelNumber: '03', subPosition: '01', code: '02.08.03.01', colorName: 'Vermelho (N3)', colorHex: '#dc2626', arrow: 'up' },
      { levelNumber: '02', subPosition: '01', code: '02.08.02.01', colorName: 'Azul (N2)', colorHex: '#2563eb', arrow: 'up' },
      { levelNumber: '01', subPosition: '01', code: '02.08.01.01', colorName: 'Amarelo (N1)', colorHex: '#eab308', arrow: 'ground' },
    ],
  },
  {
    id: 'demo-4',
    street: '03',
    bay: '12',
    level: '03',
    position: 'AB',
    code: '03.12.03',
    formatType: 'dual_position',
    arrow: 'up',
    loadCapacityKg: 2400,
    palletType: 'PBR',
    zone: 'PULMÃO',
    barcodeType: 'CODE128',
    colorBand: '#dc2626', // Red
    levelName: 'NÍVEL 03 (VÃO DUPLO)',
    copies: 1,
    createdAt: new Date().toISOString(),
    dualPositions: [
      { position: 'A', code: '03.12.03.A' },
      { position: 'B', code: '03.12.03.B' },
    ],
  },
];

export function getSavedLabels(): LongarinaLabel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_LABELS);
    let list: LongarinaLabel[] = raw ? JSON.parse(raw) : INITIAL_DEMO_LABELS;

    // Ensure every Brasil Express label has elements initialized for WYSIWYG editor
    list = list.map((l) => {
      if ((!l.elements || l.elements.length === 0) && l.formatType === 'brasil_express_4x6') {
        return {
          ...l,
          elements: createDefaultBrasilExpressElements(
            l.street || '20',
            l.bay || '001',
            l.level || '1',
            l.position || '01',
            l.companyName || 'BRASIL EXPRESS',
            l.code || '20-001-1-01'
          ),
        };
      }
      return l;
    });

    return list;
  } catch {
    return INITIAL_DEMO_LABELS;
  }
}

export function saveLabels(labels: LongarinaLabel[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_LABELS, JSON.stringify(labels));
  } catch (err) {
    console.error('Failed to save labels to localStorage:', err);
  }
}

export function getSavedLabelSize(): LabelSizeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LABEL_SIZE);
    if (!raw) return PRESET_LABEL_SIZES[0];
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return PRESET_LABEL_SIZES[0];
  }
}

export function saveLabelSize(size: LabelSizeConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LABEL_SIZE, JSON.stringify(size));
  } catch (err) {
    console.error('Failed to save label size:', err);
  }
}

export interface PrintLogItem {
  id: string;
  timestamp: string;
  labelCount: number;
  totalCopies: number;
  sizeName: string;
  method: string;
  codesSample: string[];
}

export function getPrintHistory(): PrintLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRINT_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addPrintHistoryItem(item: PrintLogItem): void {
  try {
    const history = getPrintHistory();
    const updated = [item, ...history].slice(0, 50); // Keep last 50
    localStorage.setItem(STORAGE_KEYS.PRINT_HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to record print history:', err);
  }
}
