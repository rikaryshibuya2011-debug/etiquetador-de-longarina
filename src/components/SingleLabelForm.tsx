import React, { useState, useEffect } from 'react';
import {
  LongarinaLabel,
  LabelSizeConfig,
  LabelFormatType,
  ArrowDirection,
  PalletType,
  BarcodeSymbology,
  CanvasElement,
  createDefaultBrasilExpressElements,
} from '../types/label';
import { ThermalLabelCard } from './ThermalLabelCard';
import { LabelCanvasEditor } from './LabelCanvasEditor';
import { formatAddressCode } from '../services/barcodeHelper';
import { Printer, Save, Check, Move, SlidersHorizontal, Layers } from 'lucide-react';

interface SingleLabelFormProps {
  initialLabel?: LongarinaLabel | null;
  config: LabelSizeConfig;
  onSaveLabel: (label: LongarinaLabel) => void;
  onPrintDirect: (label: LongarinaLabel) => void;
}

export const SingleLabelForm: React.FC<SingleLabelFormProps> = ({
  initialLabel,
  config,
  onSaveLabel,
  onPrintDirect,
}) => {
  const [street, setStreet] = useState<string>(initialLabel?.street || '20');
  const [bay, setBay] = useState<string>(initialLabel?.bay || '001');
  const [level, setLevel] = useState<string>(initialLabel?.level || '1');
  const [position, setPosition] = useState<string>(initialLabel?.position || '01');
  const [companyName, setCompanyName] = useState<string>(initialLabel?.companyName || 'BRASIL EXPRESS');
  const [formatType, setFormatType] = useState<LabelFormatType>(initialLabel?.formatType || 'brasil_express_4x6');
  const [arrow, setArrow] = useState<ArrowDirection>(initialLabel?.arrow || 'curved_down_left');
  const [loadCapacityKg, setLoadCapacityKg] = useState<number>(initialLabel?.loadCapacityKg || 2200);
  const [palletType, setPalletType] = useState<PalletType>(initialLabel?.palletType || 'PBR');
  const [zone, setZone] = useState<string>(initialLabel?.zone || 'PULMÃO');
  const [barcodeType, setBarcodeType] = useState<BarcodeSymbology>(initialLabel?.barcodeType || 'CODE128');
  const [colorBand, setColorBand] = useState<string>(initialLabel?.colorBand || '#2563eb');
  const [customNotes, setCustomNotes] = useState<string>(initialLabel?.customNotes || 'CONFORME NBR 15524');
  const [copies, setCopies] = useState<number>(initialLabel?.copies || 1);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Editor mode: visual drag and drop is primary
  const [editMode, setEditMode] = useState<'visual_drag' | 'coordinates'>('visual_drag');

  // Dynamic canvas elements
  const [elements, setElements] = useState<CanvasElement[]>(
    initialLabel?.elements && initialLabel.elements.length > 0
      ? initialLabel.elements
      : createDefaultBrasilExpressElements(street, bay, level, position, companyName, `${street}-${bay}-${level}-${position}`)
  );

  // Initialize form when editing an existing label
  useEffect(() => {
    if (initialLabel) {
      setStreet(initialLabel.street);
      setBay(initialLabel.bay);
      setLevel(initialLabel.level);
      setPosition(initialLabel.position);
      setCompanyName(initialLabel.companyName || 'BRASIL EXPRESS');
      setFormatType(initialLabel.formatType);
      setArrow(initialLabel.arrow);
      setLoadCapacityKg(initialLabel.loadCapacityKg);
      setPalletType(initialLabel.palletType);
      setZone(initialLabel.zone);
      setBarcodeType(initialLabel.barcodeType);
      setColorBand(initialLabel.colorBand || '#2563eb');
      setCustomNotes(initialLabel.customNotes || '');
      setCopies(initialLabel.copies || 1);
      if (initialLabel.elements && initialLabel.elements.length > 0) {
        setElements(initialLabel.elements);
      } else {
        const computed =
          initialLabel.formatType === 'brasil_express_4x6'
            ? `${(initialLabel.street || '20').padStart(2, '0')}-${(initialLabel.bay || '001').padStart(3, '0')}-${initialLabel.level || '1'}-${(initialLabel.position || '01').padStart(2, '0')}`
            : formatAddressCode(initialLabel.street, initialLabel.bay, initialLabel.level, initialLabel.position, '.');
        setElements(
          createDefaultBrasilExpressElements(
            initialLabel.street,
            initialLabel.bay,
            initialLabel.level,
            initialLabel.position,
            initialLabel.companyName || 'BRASIL EXPRESS',
            computed
          )
        );
      }
    }
  }, [initialLabel]);

  const handleUpdateStreet = (val: string) => {
    setStreet(val);
    const newCode =
      formatType === 'brasil_express_4x6'
        ? `${(val || '20').padStart(2, '0')}-${(bay || '001').padStart(3, '0')}-${level || '1'}-${(position || '01').padStart(2, '0')}`
        : formatAddressCode(val, bay, level, position, '.');
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === 'elem-num-rua') return { ...el, content: val };
        if (el.type === 'barcode') return { ...el, content: newCode };
        return el;
      })
    );
  };

  const handleUpdateBay = (val: string) => {
    setBay(val);
    const newCode =
      formatType === 'brasil_express_4x6'
        ? `${(street || '20').padStart(2, '0')}-${(val || '001').padStart(3, '0')}-${level || '1'}-${(position || '01').padStart(2, '0')}`
        : formatAddressCode(street, val, level, position, '.');
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === 'elem-num-predio') return { ...el, content: val };
        if (el.type === 'barcode') return { ...el, content: newCode };
        return el;
      })
    );
  };

  const handleUpdateLevel = (val: string) => {
    setLevel(val);
    const newCode =
      formatType === 'brasil_express_4x6'
        ? `${(street || '20').padStart(2, '0')}-${(bay || '001').padStart(3, '0')}-${val || '1'}-${(position || '01').padStart(2, '0')}`
        : formatAddressCode(street, bay, val, position, '.');
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === 'elem-num-andar') return { ...el, content: val };
        if (el.type === 'barcode') return { ...el, content: newCode };
        return el;
      })
    );
  };

  const handleUpdatePosition = (val: string) => {
    setPosition(val);
    const newCode =
      formatType === 'brasil_express_4x6'
        ? `${(street || '20').padStart(2, '0')}-${(bay || '001').padStart(3, '0')}-${level || '1'}-${(val || '01').padStart(2, '0')}`
        : formatAddressCode(street, bay, level, val, '.');
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === 'elem-num-apto') return { ...el, content: val };
        if (el.type === 'barcode') return { ...el, content: newCode };
        return el;
      })
    );
  };

  const handleUpdateCompanyName = (val: string) => {
    setCompanyName(val);
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === 'elem-company') return { ...el, content: val };
        return el;
      })
    );
  };

  // Compute live code
  const currentCode =
    formatType === 'brasil_express_4x6'
      ? `${(street || '20').padStart(2, '0')}-${(bay || '001').padStart(3, '0')}-${level || '1'}-${(position || '01').padStart(2, '0')}`
      : formatAddressCode(street, bay, level, position, '.');

  // Build live label object for preview and canvas
  const liveLabel: LongarinaLabel = {
    id: initialLabel?.id || `lbl-${Date.now()}`,
    street,
    bay,
    level,
    position,
    code: currentCode,
    companyName,
    formatType,
    arrow,
    loadCapacityKg,
    palletType,
    zone,
    barcodeType,
    colorBand,
    customNotes,
    copies,
    createdAt: initialLabel?.createdAt || new Date().toISOString(),
    elements,
    multiLevels:
      formatType === 'multi_level'
        ? [
            { levelNumber: '04', subPosition: '01', code: `${street}.${bay}.04.${position}`, colorName: 'Verde (N4)', colorHex: '#16a34a', arrow: 'up' },
            { levelNumber: '03', subPosition: '01', code: `${street}.${bay}.03.${position}`, colorName: 'Vermelho (N3)', colorHex: '#dc2626', arrow: 'up' },
            { levelNumber: '02', subPosition: '01', code: `${street}.${bay}.02.${position}`, colorName: 'Azul (N2)', colorHex: '#2563eb', arrow: 'up' },
            { levelNumber: '01', subPosition: '01', code: `${street}.${bay}.01.${position}`, colorName: 'Amarelo (N1)', colorHex: '#eab308', arrow: 'ground' },
          ]
        : undefined,
    dualPositions:
      formatType === 'dual_position'
        ? [
            { position: 'A', code: `${street}.${bay}.${level}.A` },
            { position: 'B', code: `${street}.${bay}.${level}.B` },
          ]
        : undefined,
  };

  const handleSave = () => {
    onSaveLabel(liveLabel);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const colorPresets = [
    { label: 'Azul (Nível 2)', hex: '#2563eb' },
    { label: 'Amarelo (Piso / Nível 1)', hex: '#eab308' },
    { label: 'Vermelho (Nível 3)', hex: '#dc2626' },
    { label: 'Verde (Nível 4)', hex: '#16a34a' },
    { label: 'Laranja (Nível 5)', hex: '#ea580c' },
    { label: 'Branco / Neutro', hex: '#f4f4f5' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Switcher */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
            <span>{initialLabel ? 'Editar Etiqueta' : 'Personalizar Etiqueta'}</span>
            <span className="text-xs font-mono font-normal text-amber-400 bg-neutral-950 px-2.5 py-0.5 rounded border border-neutral-800">
              {currentCode}
            </span>
          </h2>
          <p className="text-xs text-neutral-400">
            Arraste os números, legendas, códigos, fotos e linhas diretamente na etiqueta ou edite pelas coordenadas.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => setEditMode('visual_drag')}
              className={`px-3 py-1.5 font-bold rounded-md flex items-center gap-1.5 transition-colors ${
                editMode === 'visual_drag'
                  ? 'bg-amber-500 text-neutral-950 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>Arrastar no Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => setEditMode('coordinates')}
              className={`px-3 py-1.5 font-bold rounded-md flex items-center gap-1.5 transition-colors ${
                editMode === 'coordinates'
                  ? 'bg-amber-500 text-neutral-950 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Coordenadas</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Salvo!' : 'Salvar'}</span>
            </button>

            <button
              type="button"
              onClick={() => onPrintDirect(liveLabel)}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODE 1: VISUAL DRAG-AND-DROP CANVAS EDITOR */}
      {editMode === 'visual_drag' ? (
        <LabelCanvasEditor
          label={liveLabel}
          onChange={(updated) => {
            if (updated.elements) {
              setElements(updated.elements);
            }
          }}
        />
      ) : (
        /* MODE 2: COORDINATES AND PARAMETERS FORM */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Tipo de Etiqueta
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setFormatType('brasil_express_4x6')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-colors ${
                    formatType === 'brasil_express_4x6'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold">Brasil Express (Foto)</div>
                  <div className="text-[10px] text-neutral-400">4x6 Vertical</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormatType('standard')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-colors ${
                    formatType === 'standard'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold">Padrão Horizontal</div>
                  <div className="text-[10px] text-neutral-400">1 posição por viga</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormatType('dual_position')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-colors ${
                    formatType === 'dual_position'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold">Biposição (A / B)</div>
                  <div className="text-[10px] text-neutral-400">2 paletes</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormatType('multi_level')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-colors ${
                    formatType === 'multi_level'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold">Multinível Térreo</div>
                  <div className="text-[10px] text-neutral-400">N1 ao N4</div>
                </button>
              </div>
            </div>

            {/* Coordinates Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Rua
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => handleUpdateStreet(e.target.value.toUpperCase())}
                  placeholder="20"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Prédio
                </label>
                <input
                  type="text"
                  value={bay}
                  onChange={(e) => handleUpdateBay(e.target.value.toUpperCase())}
                  placeholder="001"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Andar
                </label>
                <input
                  type="text"
                  value={level}
                  onChange={(e) => handleUpdateLevel(e.target.value.toUpperCase())}
                  placeholder="1"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Apto
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => handleUpdatePosition(e.target.value.toUpperCase())}
                  placeholder="01"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100"
                />
              </div>
            </div>

            {/* Empresa Lateral */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Nome da Empresa / Armazém (Lateral)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => handleUpdateCompanyName(e.target.value.toUpperCase())}
                placeholder="BRASIL EXPRESS"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm font-bold text-neutral-100 uppercase"
              />
            </div>

            {/* Capacidade de Carga e Palete */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Capacidade de Carga (kg/par)
                </label>
                <input
                  type="number"
                  step={100}
                  value={loadCapacityKg}
                  onChange={(e) => setLoadCapacityKg(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Padrão de Palete
                </label>
                <select
                  value={palletType}
                  onChange={(e) => setPalletType(e.target.value as PalletType)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm font-semibold text-neutral-100"
                >
                  <option value="PBR">PBR (1.000 x 1.200 mm)</option>
                  <option value="EURO">EURO (800 x 1.200 mm)</option>
                  <option value="BOX">BOX / Contentor</option>
                  <option value="GAIOLA">Gaiola Metálica</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: Live Thermal Print Simulation */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Visualização da Etiqueta
                </span>
                <span className="text-[11px] font-mono text-neutral-400">4 x 6 polegadas</span>
              </div>

              <div className="bg-neutral-950 p-6 rounded-lg border border-neutral-800 flex items-center justify-center overflow-x-auto min-h-[360px]">
                <ThermalLabelCard label={liveLabel} config={config} scale={0.9} />
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                <span>Clique em &ldquo;Arrastar no Canvas&rdquo; para mover qualquer item</span>
                <span>{config.dpi} DPI Térmica</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
