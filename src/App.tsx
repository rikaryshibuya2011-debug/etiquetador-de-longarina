import React, { useState, useEffect } from 'react';
import { LongarinaLabel, LabelSizeConfig, PrinterDevice } from './types/label';
import {
  getSavedLabels,
  saveLabels,
  getSavedLabelSize,
  saveLabelSize,
  getPrintHistory,
  addPrintHistoryItem,
  PrintLogItem,
} from './services/storageService';
import { thermalPrinterService } from './services/printerConnectionService';
import { barcodeScannerService } from './services/barcodeScannerService';
import { Header } from './components/Header';
import { LabelsCatalogView } from './components/LabelsCatalogView';
import { SingleLabelForm } from './components/SingleLabelForm';
import { BatchGenerator } from './components/BatchGeneratorModal';
import { BarcodeScannerView } from './components/BarcodeScannerView';
import { PrintHistoryView } from './components/PrintHistoryView';
import { PrinterSettingsModal } from './components/PrinterSettingsModal';
import { ThermalLabelCard } from './components/ThermalLabelCard';
import { CheckCircle2, AlertTriangle, Printer, Layers } from 'lucide-react';

export default function App() {
  const [labels, setLabels] = useState<LongarinaLabel[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'single' | 'batch' | 'scanner' | 'history'>('catalog');
  const [editingLabel, setEditingLabel] = useState<LongarinaLabel | null>(null);
  const [config, setConfig] = useState<LabelSizeConfig>(getSavedLabelSize());
  const [printerDevice, setPrinterDevice] = useState<PrinterDevice>(thermalPrinterService.deviceState);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState<boolean>(false);
  const [printHistory, setPrintHistory] = useState<PrintLogItem[]>([]);
  const [labelsToPrint, setLabelsToPrint] = useState<LongarinaLabel[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Initialize data on mount
  useEffect(() => {
    const loaded = getSavedLabels();
    setLabels(loaded);
    setPrintHistory(getPrintHistory());
    setPrinterDevice({ ...thermalPrinterService.deviceState });

    // Start listening to physical barcode gun
    barcodeScannerService.startGlobalListener();

    return () => {
      barcodeScannerService.stopGlobalListener();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Save or update label
  const handleSaveLabel = (label: LongarinaLabel) => {
    const existingIndex = labels.findIndex((l) => l.id === label.id);
    let updated: LongarinaLabel[];

    if (existingIndex >= 0) {
      updated = [...labels];
      updated[existingIndex] = label;
      showToast(`Etiqueta ${label.code} atualizada com sucesso!`);
    } else {
      updated = [label, ...labels];
      showToast(`Nova etiqueta ${label.code} criada!`);
    }

    setLabels(updated);
    saveLabels(updated);
    setEditingLabel(null);
    setActiveTab('catalog');
  };

  // Delete label
  const handleDeleteLabel = (id: string) => {
    const target = labels.find((l) => l.id === id);
    const updated = labels.filter((l) => l.id !== id);
    setLabels(updated);
    saveLabels(updated);
    showToast(`Etiqueta ${target?.code || id} removida.`, 'info');
  };

  // Delete multiple labels in bulk
  const handleDeleteMultipleLabels = (ids: string[]) => {
    if (ids.length === 0) return;
    const count = ids.length;
    const updated = labels.filter((l) => !ids.includes(l.id));
    setLabels(updated);
    saveLabels(updated);
    showToast(`${count} etiqueta${count > 1 ? 's' : ''} removida${count > 1 ? 's' : ''} com sucesso.`, 'info');
  };

  // Duplicate label
  const handleDuplicateLabel = (source: LongarinaLabel) => {
    const copy: LongarinaLabel = {
      ...source,
      id: `lbl-${Date.now()}`,
      position: source.position === '01' ? '02' : `${source.position}B`,
      code: `${source.code}-B`,
      createdAt: new Date().toISOString(),
    };
    const updated = [copy, ...labels];
    setLabels(updated);
    saveLabels(updated);
    showToast(`Etiqueta duplicada como ${copy.code}!`);
  };

  // Print labels action
  const handlePrintLabels = async (targetLabels: LongarinaLabel[]) => {
    if (targetLabels.length === 0) return;

    // Expand copies
    const expandedList: LongarinaLabel[] = [];
    targetLabels.forEach((lbl) => {
      const count = Math.max(1, lbl.copies || 1);
      for (let i = 0; i < count; i++) {
        expandedList.push(lbl);
      }
    });

    setLabelsToPrint(expandedList);

    // Give state a tick to populate #print-area before triggering driver
    setTimeout(async () => {
      const result = await thermalPrinterService.printLabels(targetLabels, config);

      if (result.success) {
        showToast(result.message, 'success');

        // Record history log
        const logItem: PrintLogItem = {
          id: `print-${Date.now()}`,
          timestamp: new Date().toISOString(),
          labelCount: targetLabels.length,
          totalCopies: expandedList.length,
          sizeName: config.name,
          method: result.method,
          codesSample: targetLabels.map((l) => l.code),
        };
        addPrintHistoryItem(logItem);
        setPrintHistory(getPrintHistory());
      } else {
        showToast(result.message, 'error');
      }
    }, 80);
  };

  // Handle batch generated
  const handleBatchGenerated = (generated: LongarinaLabel[], printImmediately: boolean) => {
    const updated = [...generated, ...labels];
    setLabels(updated);
    saveLabels(updated);

    if (printImmediately) {
      handlePrintLabels(generated);
    } else {
      showToast(`${generated.length} etiquetas geradas e adicionadas ao catálogo!`);
    }
    setActiveTab('catalog');
  };

  // Handle create from scanned barcode
  const handleCreateFromScan = (scannedCode: string) => {
    setEditingLabel({
      id: `lbl-${Date.now()}`,
      street: '20',
      bay: '001',
      level: '1',
      position: '01',
      code: scannedCode,
      companyName: 'BRASIL EXPRESS',
      formatType: 'brasil_express_4x6',
      arrow: 'curved_down_left',
      loadCapacityKg: 2200,
      palletType: 'PBR',
      zone: 'PULMÃO',
      barcodeType: 'CODE128',
      copies: 1,
      createdAt: new Date().toISOString(),
    });
    setActiveTab('single');
  };

  // Change active label configuration
  const handleUpdateConfig = (newConfig: LabelSizeConfig) => {
    setConfig(newConfig);
    saveLabelSize(newConfig);
    showToast(`Formato alterado para ${newConfig.name}`);
  };

  // Reprint batch from history
  const handleReprintBatch = (item: PrintLogItem) => {
    const matched = labels.filter((l) => item.codesSample.includes(l.code));
    if (matched.length > 0) {
      handlePrintLabels(matched);
    } else {
      // Re-create temporary labels for print
      const tempLabels = item.codesSample.map((code, idx) => ({
        id: `reprint-${idx}`,
        street: '01',
        bay: '01',
        level: '01',
        position: '01',
        code,
        formatType: 'standard' as const,
        arrow: 'up' as const,
        loadCapacityKg: 2200,
        palletType: 'PBR' as const,
        zone: 'HISTORICO',
        barcodeType: 'CODE128' as const,
        copies: 1,
        createdAt: new Date().toISOString(),
      }));
      handlePrintLabels(tempLabels);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'single') setEditingLabel(null);
          setActiveTab(tab);
        }}
        printerDevice={printerDevice}
        onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
        onOpenScanner={() => setActiveTab('scanner')}
        totalLabelsCount={labels.length}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 no-print">
        {activeTab === 'catalog' && (
          <LabelsCatalogView
            labels={labels}
            config={config}
            onPrintLabels={handlePrintLabels}
            onEditLabel={(lbl) => {
              setEditingLabel(lbl);
              setActiveTab('single');
            }}
            onDeleteLabel={handleDeleteLabel}
            onDeleteMultipleLabels={handleDeleteMultipleLabels}
            onDuplicateLabel={handleDuplicateLabel}
            onOpenCreate={() => {
              setEditingLabel(null);
              setActiveTab('single');
            }}
            onOpenBatch={() => setActiveTab('batch')}
          />
        )}

        {activeTab === 'single' && (
          <SingleLabelForm
            initialLabel={editingLabel}
            config={config}
            onSaveLabel={handleSaveLabel}
            onPrintDirect={(lbl) => handlePrintLabels([lbl])}
          />
        )}

        {activeTab === 'batch' && (
          <BatchGenerator
            config={config}
            labels={labels}
            onBatchGenerated={handleBatchGenerated}
            onClose={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'scanner' && (
          <BarcodeScannerView
            savedLabels={labels}
            onSelectLabel={(lbl) => {
              setEditingLabel(lbl);
              setActiveTab('single');
            }}
            onPrintLabel={(lbl) => handlePrintLabels([lbl])}
            onCreateFromScan={handleCreateFromScan}
          />
        )}

        {activeTab === 'history' && (
          <PrintHistoryView
            history={printHistory}
            onClearHistory={() => {
              localStorage.removeItem('longarinaprint_history_v1');
              setPrintHistory([]);
              showToast('Histórico apagado com sucesso.');
            }}
            onReprintBatch={handleReprintBatch}
          />
        )}
      </main>

      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl text-xs font-semibold text-neutral-100 transition-all no-print">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Printer className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Printer Settings Modal */}
      {isPrinterModalOpen && (
        <PrinterSettingsModal
          currentConfig={config}
          onUpdateConfig={handleUpdateConfig}
          onClose={() => {
            setIsPrinterModalOpen(false);
            setPrinterDevice({ ...thermalPrinterService.deviceState });
          }}
          sampleLabel={labels[0]}
        />
      )}

      {/* PRINT AREA (Hidden in normal screen view, visible only to printer via @media print) */}
      <div id="print-area">
        {labelsToPrint.map((lbl, idx) => (
          <div key={`${lbl.id}-${idx}`} className="break-after-page">
            <ThermalLabelCard label={lbl} config={config} isPrintMode={true} />
          </div>
        ))}
      </div>
    </div>
  );
}
