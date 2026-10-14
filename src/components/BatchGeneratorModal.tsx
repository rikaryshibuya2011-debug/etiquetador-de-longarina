import React, { useState, useMemo } from 'react';
import {
  LongarinaLabel,
  LabelSizeConfig,
  ArrowDirection,
  CanvasElement,
  createDefaultBrasilExpressElements,
  createLegendBelowBrasilExpressElements,
} from '../types/label';
import { formatAddressCode, sanitizeBarcodeValue } from '../services/barcodeHelper';
import { ThermalLabelCard } from './ThermalLabelCard';
import {
  SlidersHorizontal,
  Check,
  Download,
  Upload,
  Layers,
  ArrowRight,
  ArrowDownUp,
  Sparkles,
  Barcode,
  Printer,
  Eye,
  FileSpreadsheet,
  CheckSquare,
  Building,
  Route,
  Grid3X3,
  ListOrdered,
  RotateCcw,
} from 'lucide-react';

interface BatchGeneratorProps {
  config: LabelSizeConfig;
  labels: LongarinaLabel[];
  onBatchGenerated: (labels: LongarinaLabel[], printImmediately: boolean) => void;
  onClose?: () => void;
}

export const BatchGenerator: React.FC<BatchGeneratorProps> = ({
  config,
  labels,
  onBatchGenerated,
  onClose,
}) => {
  // 1. RUA / CORREDOR (Suporta sequências decrescentes 20..19..18 ou crescentes 18..19..20)
  const [streetStart, setStreetStart] = useState<number>(20);
  const [streetEnd, setStreetEnd] = useState<number>(18);
  const [streetOrder, setStreetOrder] = useState<'desc' | 'asc'>('desc');
  const [streetPadDigits, setStreetPadDigits] = useState<number>(2);

  // 2. PRÉDIOS / MÓDULOS / COLUNAS
  const [bayStart, setBayStart] = useState<number>(1);
  const [bayEnd, setBayEnd] = useState<number>(6);
  const [bayOrder, setBayOrder] = useState<'asc' | 'desc'>('asc');
  const [bayPadDigits, setBayPadDigits] = useState<number>(3); // Ex: '001'

  // 3. ANDAR / NÍVEL (seleção direta: andar 1, 2, 3... sem faixa "de 1 até 2")
  const [levelOrder, setLevelOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['0', '1', '2', '3', '4', '5', '6']);

  // 4. APARTAMENTO / APTO / VÃO (0..1..2..3..4..5..6)
  const [aptMode, setAptMode] = useState<'range' | 'custom'>('range');
  const [aptStart, setAptStart] = useState<number>(1);
  const [aptEnd, setAptEnd] = useState<number>(2);
  const [aptOrder, setAptOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedApts, setSelectedApts] = useState<string[]>(['01', '02']);
  const [aptPadDigits, setAptPadDigits] = useState<number>(2); // '01', '02' ou '1', '2'

  // 5. ORDEM DO LAÇO DA SEQUÊNCIA (PRIORIDADE DE IMPRESSÃO NO ROLO)
  const [sequenceLoopOrder, setSequenceLoopOrder] = useState<'street_bay_level_apt' | 'street_level_bay_apt' | 'street_bay_apt_level'>('street_bay_level_apt');

  // Separador do código de barra no lote: '' = 20001101 | '-' = 20-001-1-01
  const [codeSeparator, setCodeSeparator] = useState<'' | '-'>('');
  const sep = codeSeparator;

  // 6. CONFIGURAÇÕES VISUAIS DA ETIQUETA
  const [companyName, setCompanyName] = useState<string>('BRASIL EXPRESS');
  const [labelLayout, setLabelLayout] = useState<'legend_below' | 'legend_beside' | 'standard'>('legend_below');
  const [loadCapacityKg, setLoadCapacityKg] = useState<number>(2200);
  const [palletType, setPalletType] = useState<'PBR' | 'EURO' | 'BOX'>('PBR');
  const [zone, setZone] = useState<string>('PULMÃO');

  // Modelo de etiqueta = design criado no "Criar Etiqueta" (canvas salvo no catálogo)
  const [templateId, setTemplateId] = useState<string>('');
  const template = useMemo(() => labels.find((l) => l.id === templateId) || null, [labels, templateId]);

  // CSV mode
  const [isCsvMode, setIsCsvMode] = useState<boolean>(false);
  const [customCsvInput, setCustomCsvInput] = useState<string>('');

  // Busca rápida na prévia da sequência
  const [previewFilter, setPreviewFilter] = useState<string>('');

  // Cores de fita por nível
  const LEVEL_COLORS: Record<string, string> = {
    '0': '#64748b',
    '00': '#64748b',
    '1': '#eab308',
    '01': '#eab308',
    '2': '#2563eb',
    '02': '#2563eb',
    '3': '#dc2626',
    '03': '#dc2626',
    '4': '#16a34a',
    '04': '#16a34a',
    '5': '#ea580c',
    '05': '#ea580c',
    '6': '#9333ea',
    '06': '#9333ea',
    '7': '#06b6d4',
    '07': '#06b6d4',
  };

  // Helper to build range array respecting order
  const buildRange = (start: number, end: number, forcedOrder?: 'asc' | 'desc'): number[] => {
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const arr: number[] = [];
    for (let i = min; i <= max; i++) {
      arr.push(i);
    }
    if (forcedOrder === 'desc' || (forcedOrder === undefined && start > end)) {
      return arr.reverse();
    }
    return arr;
  };

  // Computed Street List
  const streetsList = useMemo(() => {
    return buildRange(streetStart, streetEnd, streetOrder).map((s) =>
      String(s).padStart(streetPadDigits, '0')
    );
  }, [streetStart, streetEnd, streetOrder, streetPadDigits]);

  // Computed Bay List
  const baysList = useMemo(() => {
    return buildRange(bayStart, bayEnd, bayOrder).map((b) =>
      String(b).padStart(bayPadDigits, '0')
    );
  }, [bayStart, bayEnd, bayOrder, bayPadDigits]);

  // Computed Level List (Andares marcados nos chips)
  const levelsList = useMemo(() => {
    const list = [...selectedLevels].sort((a, b) => Number(a) - Number(b));
    if (levelOrder === 'desc') list.reverse();
    return list;
  }, [selectedLevels, levelOrder]);

  // Computed Apt List (Apartamentos 0..6)
  const aptsList = useMemo(() => {
    if (aptMode === 'range') {
      return buildRange(aptStart, aptEnd, aptOrder).map((p) =>
        aptPadDigits > 1 ? String(p).padStart(aptPadDigits, '0') : String(p)
      );
    }
    const list = [...selectedApts];
    if (aptOrder === 'desc') list.reverse();
    return list;
  }, [aptMode, aptStart, aptEnd, aptOrder, aptPadDigits, selectedApts]);

  // Total count
  const totalCalculated = useMemo(() => {
    if (isCsvMode) {
      return customCsvInput.trim().split('\n').filter((l) => l.trim().length > 0).length;
    }
    return streetsList.length * baysList.length * levelsList.length * aptsList.length;
  }, [isCsvMode, customCsvInput, streetsList, baysList, levelsList, aptsList]);

  // Generate ordered list of codes respecting chosen loop sequence
  const allOrderedCodes = useMemo(() => {
    if (streetsList.length === 0 || baysList.length === 0 || levelsList.length === 0 || aptsList.length === 0) {
      return [];
    }
    const list: { street: string; bay: string; level: string; apt: string; code: string }[] = [];

    if (sequenceLoopOrder === 'street_bay_level_apt') {
      // Padrão Coluna: Rua -> Prédio -> Andar -> Apto
      for (const s of streetsList) {
        for (const b of baysList) {
          for (const l of levelsList) {
            for (const a of aptsList) {
              list.push({ street: s, bay: b, level: l, apt: a, code: `${s}${sep}${b}${sep}${l}${sep}${a}` });
            }
          }
        }
      }
    } else if (sequenceLoopOrder === 'street_level_bay_apt') {
      // Padrão Longarina: Rua -> Andar -> Prédio -> Apto
      for (const s of streetsList) {
        for (const l of levelsList) {
          for (const b of baysList) {
            for (const a of aptsList) {
              list.push({ street: s, bay: b, level: l, apt: a, code: `${s}${sep}${b}${sep}${l}${sep}${a}` });
            }
          }
        }
      }
    } else {
      // Padrão Apto: Rua -> Prédio -> Apto -> Andar
      for (const s of streetsList) {
        for (const b of baysList) {
          for (const a of aptsList) {
            for (const l of levelsList) {
              list.push({ street: s, bay: b, level: l, apt: a, code: `${s}${sep}${b}${sep}${l}${sep}${a}` });
            }
          }
        }
      }
    }
    return list;
  }, [streetsList, baysList, levelsList, aptsList, sequenceLoopOrder, sep]);

  // Sample sequence preview
  const sequencePreview = useMemo(() => {
    if (allOrderedCodes.length === 0) return [];
    if (!previewFilter.trim()) return allOrderedCodes.slice(0, 16);
    const filter = previewFilter.trim().toLowerCase();
    return allOrderedCodes.filter((item) => item.code.toLowerCase().includes(filter)).slice(0, 24);
  }, [allOrderedCodes, previewFilter]);

  // Toggle level in chips
  const handleToggleLevel = (lvl: string) => {
    if (selectedLevels.includes(lvl)) {
      setSelectedLevels(selectedLevels.filter((item) => item !== lvl));
    } else {
      setSelectedLevels([...selectedLevels, lvl].sort((a, b) => Number(a) - Number(b)));
    }
  };

  // Toggle apt in custom chips
  const handleToggleCustomApt = (apt: string) => {
    if (selectedApts.includes(apt)) {
      if (selectedApts.length > 1) {
        setSelectedApts(selectedApts.filter((item) => item !== apt));
      }
    } else {
      setSelectedApts([...selectedApts, apt].sort((a, b) => Number(a) - Number(b)));
    }
  };

  // Preset Handlers
  const handleApplyPresetUserRequest = () => {
    // Rua 20..19..18 | Prédio 001..006 | Andar 0..6 | Apto 01..02
    setStreetStart(20);
    setStreetEnd(18);
    setStreetOrder('desc');
    setStreetPadDigits(2);

    setBayStart(1);
    setBayEnd(6);
    setBayOrder('asc');
    setBayPadDigits(3);

    setLevelOrder('asc');
    setSelectedLevels(['0', '1', '2', '3', '4', '5', '6']);

    setAptMode('range');
    setAptStart(1);
    setAptEnd(2);
    setAptOrder('asc');
    setAptPadDigits(2);
    setSelectedApts(['01', '02']);

    setSequenceLoopOrder('street_bay_level_apt');
  };

  const handleApplyPresetAllFloorsApts = () => {
    // Andares 0..6 e Aptos 0..6
    setLevelOrder('asc');
    setSelectedLevels(['0', '1', '2', '3', '4', '5', '6']);

    setAptMode('range');
    setAptStart(0);
    setAptEnd(6);
    setAptOrder('asc');
    setAptPadDigits(2);
  };

  // Clona o design (elementos do canvas) do modelo escolhido e troca só os campos dinâmicos
  const buildElementsFromTemplate = (
    tpl: LongarinaLabel,
    vals: { street: string; bay: string; level: string; position: string; code: string; company: string }
  ): CanvasElement[] => {
    const source = tpl.elements || [];
    const byId: Record<string, string> = {
      'elem-num-rua': vals.street,
      'elem-num-predio': vals.bay,
      'elem-num-andar': vals.level,
      'elem-num-apto': vals.position,
      'elem-company': vals.company,
    };
    const byContent: Record<string, string> = {
      [tpl.street]: vals.street,
      [tpl.bay]: vals.bay,
      [tpl.level]: vals.level,
      [tpl.position]: vals.position,
      [tpl.companyName || 'BRASIL EXPRESS']: vals.company,
    };
    const usedFallback = new Set<string>();

    return source.map((el) => {
      if (el.type === 'barcode') return { ...el, content: vals.code };
      if (el.type !== 'text') return { ...el };
      if (byId[el.id] !== undefined) return { ...el, content: byId[el.id] };

      const original = el.content || '';
      if (byContent[original] !== undefined && !usedFallback.has(original)) {
        usedFallback.add(original);
        return { ...el, content: byContent[original] };
      }
      return { ...el };
    });
  };

  const tpl = template;
  const hasTemplateElements = !!(tpl && tpl.elements && tpl.elements.length > 0);

  // Resolve o visual de cada etiqueta gerada: modelo salvo (Criar Etiqueta) ou layout do sistema
  const resolveVisuals = (
    s: string,
    b: string,
    l: string,
    p: string,
    code: string
  ): Pick<
    LongarinaLabel,
    'elements' | 'formatType' | 'arrow' | 'palletType' | 'zone' | 'colorBand' | 'customNotes' | 'barcodeType'
  > => {
    if (tpl) {
      return {
        elements: hasTemplateElements
          ? buildElementsFromTemplate(tpl, {
              street: s,
              bay: b,
              level: l,
              position: p,
              code,
              company: companyName,
            })
          : undefined,
        formatType: tpl.formatType,
        arrow: tpl.arrow,
        palletType: tpl.palletType,
        zone: tpl.zone,
        barcodeType: tpl.barcodeType,
        colorBand: LEVEL_COLORS[l] || tpl.colorBand || '#2563eb',
        customNotes: tpl.customNotes,
      };
    }

    return {
      elements:
        labelLayout === 'legend_below'
          ? createLegendBelowBrasilExpressElements(s, b, l, p, companyName, code)
          : labelLayout === 'legend_beside'
          ? createDefaultBrasilExpressElements(s, b, l, p, companyName, code)
          : undefined,
      formatType: labelLayout === 'standard' ? 'standard' : 'brasil_express_4x6',
      arrow: 'curved_down_left',
      palletType,
      zone,
      barcodeType: 'CODE128',
      colorBand: LEVEL_COLORS[l] || '#2563eb',
      customNotes: undefined,
    };
  };

  // Amostra real usada na prévia do modelo escolhido
  const sampleVals = {
    street: streetsList[0] || '20',
    bay: baysList[0] || '001',
    level: levelsList[0] || '1',
    position: aptsList[0] || '01',
  };
  const sampleCode = `${sampleVals.street}${sep}${sampleVals.bay}${sep}${sampleVals.level}${sep}${sampleVals.position}`;
  const sampleLabel: LongarinaLabel = {
    id: 'batch-sample',
    ...sampleVals,
    code: sampleCode,
    companyName,
    loadCapacityKg,
    copies: 1,
    createdAt: new Date().toISOString(),
    ...resolveVisuals(sampleVals.street, sampleVals.bay, sampleVals.level, sampleVals.position, sampleCode),
  };

  // Generate Batch
  const handleGenerate = (printImmediately = false) => {
    const generated: LongarinaLabel[] = [];
    const now = new Date().toISOString();

    if (isCsvMode && customCsvInput.trim()) {
      const lines = customCsvInput.trim().split('\n');
      lines.forEach((line, idx) => {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        if (parts.length >= 4) {
          const s = parts[0].padStart(2, '0');
          const b = parts[1].padStart(3, '0');
          const l = parts[2];
          const p = parts[3].padStart(2, '0');
          const cap = parts[4] ? Number(parts[4]) : loadCapacityKg;
          const code = `${s}${sep}${b}${sep}${l}${sep}${p}`;

          generated.push({
            id: `csv-${Date.now()}-${idx}`,
            street: s,
            bay: b,
            level: l,
            position: p,
            code,
            companyName,
            loadCapacityKg: isNaN(cap) ? 2200 : cap,
            copies: 1,
            createdAt: now,
            ...resolveVisuals(s, b, l, p, code),
          });
        }
      });
    } else {
      // Use ordered list generated from selected sequence loop order
      allOrderedCodes.forEach((item, idx) => {
        generated.push({
          id: `batch-${item.code}-${Date.now()}-${idx}`,
          street: item.street,
          bay: item.bay,
          level: item.level,
          position: item.apt,
          code: item.code,
          companyName,
          loadCapacityKg,
          copies: 1,
          createdAt: now,
          ...resolveVisuals(item.street, item.bay, item.level, item.apt, item.code),
        });
      });
    }

    if (generated.length > 0) {
      onBatchGenerated(generated, printImmediately);
    }
  };

  // CSV template download
  const handleDownloadCsvTemplate = () => {
    const csvContent =
      'RUA,PREDIO,NIVEL,APTO,CAPACIDADE_KG\n20,001,0,01,2200\n20,001,1,01,2200\n20,001,2,01,2200\n20,001,3,01,2000\n20,001,4,01,2000\n20,001,5,01,2000\n20,001,6,01,2000';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_sequencia_brasil_express.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-neutral-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              <span>Gerador em Lote de Sequências</span>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded border border-amber-500/30 font-mono font-bold">
                Rua · Prédio · Andar · Apto
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Gere sequências completas: rua (20..19..18), prédios (001..006), andares marcados
              individualmente (1, 3, 5...) e apartamentos (01..02).
            </p>
          </div>
        </div>

        {/* Mode switcher: Parametric vs CSV */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setIsCsvMode(false)}
            className={`px-3 py-1.5 font-bold rounded-md transition-colors ${
              !isCsvMode ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Sequencial (Parâmetros)
          </button>
          <button
            type="button"
            onClick={() => setIsCsvMode(true)}
            className={`px-3 py-1.5 font-bold rounded-md transition-colors ${
              isCsvMode ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Importar CSV
          </button>
        </div>
      </div>

      {/* QUICK PRESETS BAR */}
      {!isCsvMode && (
        <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Preenchimento Rápido com 1 Clique:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleApplyPresetUserRequest}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Aplica: Rua 20..19..18, Prédio 001..006, Andar 0..6, Apto 01..02"
            >
              <span>⚡ Padrão: Rua 20..18 | Andares 0..6 | Aptos 01..02</span>
            </button>

            <button
              type="button"
              onClick={handleApplyPresetAllFloorsApts}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Aplica: Andares 0..6 e Aptos 0..6"
            >
              <span>Andares 0..6 & Aptos 0..6</span>
            </button>
          </div>
        </div>
      )}

      {!isCsvMode ? (
        <div className="space-y-6">
          {/* 1. SELEÇÃO DE RUAS E PRÉDIOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CARD 1: RUAS (Ex: 20..19..18 ou 18..19..20) */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Route className="w-4 h-4 text-amber-400" />
                  1. De qual até qual Rua (Corredores)
                </span>
                <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setStreetOrder('desc');
                      if (streetStart < streetEnd) {
                        const tmp = streetStart;
                        setStreetStart(streetEnd);
                        setStreetEnd(tmp);
                      }
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      streetOrder === 'desc' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title="Ordem Decrescente: 20, 19, 18..."
                  >
                    20 → 18 (Decrescente)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStreetOrder('asc');
                      if (streetStart > streetEnd) {
                        const tmp = streetStart;
                        setStreetStart(streetEnd);
                        setStreetEnd(tmp);
                      }
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      streetOrder === 'asc' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title="Ordem Crescente: 18, 19, 20..."
                  >
                    18 → 20 (Crescente)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1 font-semibold">
                    De Rua Inicial:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={streetStart}
                    onChange={(e) => setStreetStart(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1 font-semibold">
                    Até Rua Final:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={streetEnd}
                    onChange={(e) => setStreetEnd(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-900">
                <span>Sequência de Ruas:</span>
                <span className="font-mono text-amber-300 font-bold">
                  {streetsList.join(' → ')} ({streetsList.length} ruas)
                </span>
              </div>
            </div>

            {/* CARD 2: PRÉDIOS (Módulos / Colunas / Bays) */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-400" />
                  2. De qual até qual Prédio (Colunas)
                </span>
                <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setBayOrder('asc')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      bayOrder === 'asc' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    001 → 006 (Crescente)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBayOrder('desc')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      bayOrder === 'desc' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    006 → 001 (Decrescente)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1 font-semibold">
                    De Prédio Inicial:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={bayStart}
                    onChange={(e) => setBayStart(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1 font-semibold">
                    Até Prédio Final:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={bayEnd}
                    onChange={(e) => setBayEnd(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-900">
                <span>Dígitos (Ex: 001):</span>
                <span className="font-mono text-amber-300 font-bold">
                  {baysList.slice(0, 3).join(', ')} ... {baysList[baysList.length - 1]} ({baysList.length} prédios)
                </span>
              </div>
            </div>
          </div>

          {/* 2. SELEÇÃO DE ANDARES E APARTAMENTOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CARD 3: ANDARES (0..1..2..3..4..5..6) */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  3. Quais Andares (marque 1, 2, 3...)
                </span>
                <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setLevelOrder('asc')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      levelOrder === 'asc' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    0 → 6 (Chão p/ Alto)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLevelOrder('desc')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      levelOrder === 'desc' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    6 → 0 (Alto p/ Chão)
                  </button>
                </div>
              </div>

              {/* Seleção direta por andar (sem faixa de início/fim) */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[10px] text-neutral-400 uppercase font-semibold">
                    Clique para marcar apenas os andares que vão no rolo:
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedLevels(['0', '1', '2', '3', '4', '5', '6'])}
                      className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-[10px] font-bold text-neutral-400 hover:text-amber-300 hover:border-amber-500/50 transition-colors"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLevels([])}
                      className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-[10px] font-bold text-neutral-400 hover:text-amber-300 hover:border-amber-500/50 transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['0', '1', '2', '3', '4', '5', '6', '7'].map((lvl) => {
                    const isSelected = levelsList.includes(lvl);
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleToggleLevel(lvl)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        {lvl === '0' ? 'Andar 0 (Piso)' : `Andar ${lvl}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-900">
                <span>Andares Selecionados:</span>
                <span className="font-mono text-amber-300 font-bold">
                  {levelsList.join(', ')} ({levelsList.length} andares)
                </span>
              </div>
            </div>

            {/* CARD 4: APARTAMENTO / APTO (0..1..2..3..4..5..6) */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Grid3X3 className="w-4 h-4 text-amber-400" />
                  4. De qual até qual Apto (0..1..2..3..4..5..6)
                </span>
                <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAptOrder('asc')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      aptOrder === 'asc' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    01 → 06 (Crescente)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAptOrder('desc')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      aptOrder === 'desc' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    06 → 01 (Decrescente)
                  </button>
                </div>
              </div>

              {/* Mode: Faixa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1 font-semibold">
                    Apto Inicial (Ex: 0 ou 1):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={aptStart}
                    onChange={(e) => {
                      setAptMode('range');
                      setAptStart(Number(e.target.value));
                    }}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1 font-semibold">
                    Apto Final (Ex: 2 ou 6):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={aptEnd}
                    onChange={(e) => {
                      setAptMode('range');
                      setAptEnd(Number(e.target.value));
                    }}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Botões rápidos de seleção de aptos */}
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase font-semibold mb-1.5">
                  Clique para marcar ou desmarcar apartamentos:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['00', '01', '02', '03', '04', '05', '06'].map((apt) => {
                    const isSelected = aptsList.includes(apt);
                    return (
                      <button
                        key={apt}
                        type="button"
                        onClick={() => {
                          setAptMode('custom');
                          handleToggleCustomApt(apt);
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        {`Apto ${apt}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-900">
                <span>Aptos Selecionados:</span>
                <span className="font-mono text-amber-300 font-bold">
                  {aptsList.join(', ')} ({aptsList.length} aptos)
                </span>
              </div>
            </div>
          </div>

          {/* 3. ORDEM DE SEQUÊNCIA DE IMPRESSÃO (NO ROLO) */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-amber-400" />
                5. Sequência de Impressão no Rolo (Ordem dos Laços)
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">
                Determina qual etiqueta sai primeiro da impressora
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSequenceLoopOrder('street_bay_level_apt')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  sequenceLoopOrder === 'street_bay_level_apt'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-bold text-xs text-neutral-100 mb-1 flex items-center gap-1">
                  <span>Por Coluna / Prédio (Padrão)</span>
                  {sequenceLoopOrder === 'street_bay_level_apt' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-[11px] text-neutral-400 mb-1">
                  Rua → Prédio → Andar → Apto
                </div>
                <div className="text-[10px] text-amber-400 font-mono">
                  Etiqueta todo o prédio 001 (andar 0 a 6), depois vai para o prédio 002.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSequenceLoopOrder('street_level_bay_apt')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  sequenceLoopOrder === 'street_level_bay_apt'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-bold text-xs text-neutral-100 mb-1 flex items-center gap-1">
                  <span>Por Nível / Longarina</span>
                  {sequenceLoopOrder === 'street_level_bay_apt' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-[11px] text-neutral-400 mb-1">
                  Rua → Andar → Prédio → Apto
                </div>
                <div className="text-[10px] text-amber-400 font-mono">
                  Imprime todos os andares 1 do corredor primeiro, depois todos os andares 2.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSequenceLoopOrder('street_bay_apt_level')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  sequenceLoopOrder === 'street_bay_apt_level'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-bold text-xs text-neutral-100 mb-1 flex items-center gap-1">
                  <span>Por Apto / Palete</span>
                  {sequenceLoopOrder === 'street_bay_apt_level' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-[11px] text-neutral-400 mb-1">
                  Rua → Prédio → Apto → Andar
                </div>
                <div className="text-[10px] text-amber-400 font-mono">
                  Imprime posição Apto 01 de todos os níveis, depois Apto 02.
                </div>
              </button>
            </div>

            {/* Separador do código de barra */}
            <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-amber-400" />
                Código de barra gerado:
              </span>
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setCodeSeparator('')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                    codeSeparator === ''
                      ? 'bg-amber-500 text-neutral-950'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Sem separador <span className="font-mono">20001101</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCodeSeparator('-')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                    codeSeparator === '-'
                      ? 'bg-amber-500 text-neutral-950'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Com separador <span className="font-mono">20-001-1-01</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. MODELO DA ETIQUETA (DESIGN DO CRIAR ETIQUETA) */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                6. Modelo da Etiqueta e Dados Fixos
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                Toda etiqueta do lote sai com o modelo escolhido abaixo
              </span>
            </div>

            {/* Seletor de modelo salvo + prévia */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
              <div className="flex-1 space-y-2">
                <label className="block text-[11px] font-semibold text-neutral-300">
                  Modelo (design criado em &ldquo;Criar Etiqueta&rdquo;):
                </label>
                <select
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value);
                    const chosen = labels.find((l) => l.id === e.target.value);
                    if (chosen?.companyName) setCompanyName(chosen.companyName.toUpperCase());
                  }}
                  className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-bold text-neutral-100 focus:border-amber-500"
                >
                  <option value="">Layout do sistema (Brasil Express padrão)</option>
                  {labels.map((lbl) => (
                    <option key={lbl.id} value={lbl.id}>
                      {lbl.code} — {lbl.companyName || 'SEM EMPRESA'} ({lbl.formatType})
                    </option>
                  ))}
                </select>

                {labels.length === 0 && (
                  <p className="text-[11px] text-neutral-500">
                    Nenhuma etiqueta salva ainda. Crie uma em &ldquo;Criar Etiqueta&rdquo; para usá-la
                    como modelo do lote.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                      Nome da Empresa / Armazém (Lateral):
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value.toUpperCase())}
                      placeholder="BRASIL EXPRESS"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-bold text-neutral-100 uppercase focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                      Capacidade de Carga (kg/par):
                    </label>
                    <input
                      type="number"
                      value={loadCapacityKg}
                      onChange={(e) => setLoadCapacityKg(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-bold text-neutral-100 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Prévia real do que vai sair no rolo */}
              <div className="sm:w-52 flex flex-col items-center justify-center gap-1.5">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">
                  Prévia do modelo
                </span>
                <div className="bg-neutral-900 p-2 rounded-lg border border-neutral-800 flex items-center justify-center">
                  <ThermalLabelCard label={sampleLabel} config={config} scale={0.34} />
                </div>
              </div>
            </div>

            {/* Layout do sistema: só aparece quando nenhum modelo salvo foi escolhido */}
            {!template && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setLabelLayout('legend_below')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    labelLayout === 'legend_below'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-100 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Legenda Embaixo do Número</span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Rua, Prédio, Andar e Apto ficam logo abaixo do número grande.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLabelLayout('legend_beside')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    labelLayout === 'legend_beside'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold text-xs text-neutral-100 mb-1">
                    Legenda ao Lado (Original)
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Subtítulos na lateral esquerda de cada número (padrão Brasil Express).
                  </div>
                </button>
              </div>
            )}

            {template && (
              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">
                  Modelo ativo: <strong className="text-amber-300 font-mono">{template.code}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setTemplateId('')}
                  className="text-neutral-400 hover:text-amber-300 font-semibold underline underline-offset-2"
                >
                  Usar layout do sistema
                </button>
              </div>
            )}
          </div>

          {/* 5. PRÉVIA INTERATIVA DA SEQUÊNCIA (EXEMPLOS REAIS) */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-400" />
                Prévia da Sequência Completa de Impressão:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filtrar código..."
                  value={previewFilter}
                  onChange={(e) => setPreviewFilter(e.target.value)}
                  className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-200 w-36 focus:border-amber-500"
                />
                <span className="text-xs font-bold text-amber-400 font-mono bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                  {totalCalculated} etiquetas no rolo
                </span>
              </div>
            </div>

            {/* Visual Formula */}
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="px-2 py-0.5 rounded bg-neutral-800 font-mono font-bold text-amber-400">
                  {streetsList.length} Ruas ({streetsList.join(',')})
                </span>
                <span>×</span>
                <span className="px-2 py-0.5 rounded bg-neutral-800 font-mono font-bold text-amber-400">
                  {baysList.length} Prédios
                </span>
                <span>×</span>
                <span className="px-2 py-0.5 rounded bg-neutral-800 font-mono font-bold text-amber-400">
                  {levelsList.length} Andares ({levelsList.join(',')})
                </span>
                <span>×</span>
                <span className="px-2 py-0.5 rounded bg-neutral-800 font-mono font-bold text-amber-400">
                  {aptsList.length} Aptos ({aptsList.join(',')})
                </span>
              </div>
              <span className="font-bold text-amber-300 text-sm">
                = {totalCalculated} etiquetas geradas
              </span>
            </div>

            {/* First codes sample chips */}
            <div>
              <span className="text-[11px] text-neutral-400 block mb-1.5 font-semibold">
                Ordem exata que sairá na impressora:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1 bg-neutral-900/50 rounded-lg border border-neutral-850">
                {sequencePreview.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-neutral-200 font-mono text-xs flex items-center justify-between shadow-xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 font-sans font-bold">#{idx + 1}</span>
                      <span className="font-bold text-neutral-100">{item.code}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-amber-400 font-sans">
                      A{item.level} P{item.apt}
                    </span>
                  </div>
                ))}
              </div>
              {totalCalculated > sequencePreview.length && (
                <span className="text-[11px] text-neutral-500 block pt-1 font-mono text-center">
                  ... mais {totalCalculated - sequencePreview.length} etiquetas na sequência
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* CSV Import Mode */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300">
              Cole as linhas no formato: <strong className="text-amber-400 font-mono">RUA,PREDIO,NIVEL,APTO,CAPACIDADE_KG</strong>
            </span>
            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Modelo CSV
            </button>
          </div>

          <textarea
            rows={9}
            value={customCsvInput}
            onChange={(e) => setCustomCsvInput(e.target.value)}
            placeholder={`20,001,0,01,2200\n20,001,1,01,2200\n20,001,2,01,2200\n20,001,3,01,2000\n20,001,4,01,2000\n20,001,5,01,2000\n20,001,6,01,2000\n19,001,0,01,2200\n19,001,1,01,2200`}
            className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-xl text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500 leading-relaxed"
          />
        </div>
      )}

      {/* Summary Box & Actions Footer */}
      <div className="pt-5 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
                Total de Etiquetas
              </span>
              <span className="text-2xl font-bold font-mono text-amber-400">
                {totalCalculated}
              </span>
            </div>
            <span className="text-xs text-neutral-400 border-l border-neutral-800 pl-3">
              Dimensão: {config.widthMm} × {config.heightMm} mm (4x6 pol)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
          )}

          <button
            type="button"
            disabled={totalCalculated === 0}
            onClick={() => handleGenerate(false)}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-bold transition-colors border border-neutral-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckSquare className="w-4 h-4 text-neutral-300" />
            <span>Adicionar ao Catálogo ({totalCalculated})</span>
          </button>

          <button
            type="button"
            disabled={totalCalculated === 0}
            onClick={() => handleGenerate(true)}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Gerar e Imprimir Rolo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
