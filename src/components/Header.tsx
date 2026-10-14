import React from 'react';
import { PrinterDevice } from '../types/label';
import { Printer, Barcode, PlusCircle, Layers, History, SlidersHorizontal, Radio } from 'lucide-react';

interface HeaderProps {
  activeTab: 'catalog' | 'single' | 'batch' | 'scanner' | 'history';
  setActiveTab: (tab: 'catalog' | 'single' | 'batch' | 'scanner' | 'history') => void;
  printerDevice: PrinterDevice;
  onOpenPrinterSettings: () => void;
  onOpenScanner: () => void;
  totalLabelsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  printerDevice,
  onOpenPrinterSettings,
  onOpenScanner,
  totalLabelsCount,
}) => {
  const getStatusBadge = () => {
    if (printerDevice.type === 'webserial') {
      return {
        label: 'Serial COM Conectada',
        color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
      };
    }
    if (printerDevice.type === 'webbluetooth') {
      return {
        label: 'Bluetooth Conectado',
        color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800',
      };
    }
    return {
      label: 'Spooler Nativo Ativo',
      color: 'text-amber-300 bg-amber-950/50 border-amber-800/80',
    };
  };

  const status = getStatusBadge();

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark / Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-md bg-amber-500 text-neutral-950 flex items-center justify-center font-black text-xl shadow-xs">
            LP
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-neutral-100 flex items-center gap-2">
              LongarinaPrint
              <span className="hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-xs bg-neutral-800 text-neutral-300 border border-neutral-700">
                WMS Térmica
              </span>
            </span>
            <span className="text-[11px] text-neutral-400 font-mono-tabular leading-none">
              Porta-Paletes · Zebra / ZPL / ESC
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-neutral-950/80 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'bg-neutral-800 text-amber-400 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Etiquetas ({totalLabelsCount})
          </button>

          <button
            onClick={() => setActiveTab('single')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'single'
                ? 'bg-neutral-800 text-amber-400 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Nova Etiqueta
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'batch'
                ? 'bg-neutral-800 text-amber-400 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Gerador em Lote
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'scanner'
                ? 'bg-neutral-800 text-amber-400 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            Leitor de Código
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-neutral-800 text-amber-400 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Histórico
          </button>
        </nav>

        {/* Zone 3: Hardware Connection Status & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Scanner launcher */}
          <button
            onClick={onOpenScanner}
            title="Abrir leitor de código de barras ou bipar pistola USB"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
          >
            <Barcode className="w-4 h-4 text-amber-400" />
            <span>Bipar Código</span>
          </button>

          {/* Printer status & config trigger */}
          <button
            onClick={onOpenPrinterSettings}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${status.color}`}
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">{status.label}</span>
            <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="lg:hidden flex items-center justify-around border-t border-neutral-800 px-2 py-1.5 bg-neutral-950">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTab === 'catalog' ? 'text-amber-400 font-bold' : 'text-neutral-400'
          }`}
        >
          Etiquetas ({totalLabelsCount})
        </button>
        <button
          onClick={() => setActiveTab('single')}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTab === 'single' ? 'text-amber-400 font-bold' : 'text-neutral-400'
          }`}
        >
          Nova
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTab === 'batch' ? 'text-amber-400 font-bold' : 'text-neutral-400'
          }`}
        >
          Lote
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTab === 'scanner' ? 'text-amber-400 font-bold' : 'text-neutral-400'
          }`}
        >
          Leitor
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTab === 'history' ? 'text-amber-400 font-bold' : 'text-neutral-400'
          }`}
        >
          Histórico
        </button>
      </div>
    </header>
  );
};
