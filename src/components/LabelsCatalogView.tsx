import React, { useState } from 'react';
import { LongarinaLabel, LabelSizeConfig } from '../types/label';
import { ThermalLabelCard } from './ThermalLabelCard';
import { Printer, Search, Plus, Trash2, Copy, Filter, Download, CheckSquare, Square, Layers } from 'lucide-react';

interface LabelsCatalogViewProps {
  labels: LongarinaLabel[];
  config: LabelSizeConfig;
  onPrintLabels: (labels: LongarinaLabel[]) => void;
  onEditLabel: (label: LongarinaLabel) => void;
  onDeleteLabel: (id: string) => void;
  onDeleteMultipleLabels?: (ids: string[]) => void;
  onDuplicateLabel: (label: LongarinaLabel) => void;
  onOpenCreate: () => void;
  onOpenBatch: () => void;
}

export const LabelsCatalogView: React.FC<LabelsCatalogViewProps> = ({
  labels,
  config,
  onPrintLabels,
  onEditLabel,
  onDeleteLabel,
  onDeleteMultipleLabels,
  onDuplicateLabel,
  onOpenCreate,
  onOpenBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filtered labels
  const filteredLabels = labels.filter((lbl) => {
    const matchesSearch =
      searchTerm === '' ||
      lbl.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lbl.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lbl.bay.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lbl.zone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFormat = selectedFormat === 'all' || lbl.formatType === selectedFormat;
    const matchesLevel = selectedLevel === 'all' || lbl.level === selectedLevel;

    return matchesSearch && matchesFormat && matchesLevel;
  });

  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState<boolean>(false);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredLabels.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLabels.map((l) => l.id)));
    }
  };

  const handlePrintSelected = () => {
    const toPrint = labels.filter((l) => selectedIds.has(l.id));
    if (toPrint.length > 0) {
      onPrintLabels(toPrint);
    }
  };

  const handleExecuteDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const idsArray = Array.from(selectedIds);
    if (onDeleteMultipleLabels) {
      onDeleteMultipleLabels(idsArray);
    } else {
      idsArray.forEach((id) => onDeleteLabel(id));
    }
    setSelectedIds(new Set());
    setConfirmingBulkDelete(false);
  };

  // Export selected or all to CSV
  const handleExportCsv = () => {
    const list = selectedIds.size > 0 ? labels.filter((l) => selectedIds.has(l.id)) : labels;
    const header = 'CODIGO,RUA,PREDIO,NIVEL,VAO,CARGA_KG,FORMATO,ZONA\n';
    const rows = list
      .map(
        (l) =>
          `"${l.code}","${l.street}","${l.bay}","${l.level}","${l.position}",${l.loadCapacityKg},"${l.formatType}","${l.zone}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `etiquetas_longarina_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, rua, módulo..."
            className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono-tabular"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="px-2.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-semibold text-neutral-300"
          >
            <option value="all">Todos os formatos</option>
            <option value="brasil_express_4x6">Brasil Express (Foto 4x6)</option>
            <option value="standard">Padrão individual</option>
            <option value="multi_level">Multinível térreo</option>
            <option value="dual_position">Biposição (A/B)</option>
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-2.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-semibold text-neutral-300"
          >
            <option value="all">Todos os andares</option>
            <option value="0">Andar 0 (Piso)</option>
            <option value="1">Andar 1</option>
            <option value="2">Andar 2</option>
            <option value="3">Andar 3</option>
            <option value="4">Andar 4</option>
            <option value="5">Andar 5</option>
            <option value="6">Andar 6</option>
            <option value="01">Nível 01</option>
            <option value="02">Nível 02</option>
            <option value="03">Nível 03</option>
            <option value="04">Nível 04</option>
          </select>

          <button
            onClick={handleExportCsv}
            title="Exportar listagem para planilha CSV"
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Bulk actions bar if items exist */}
      {filteredLabels.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-neutral-300 hover:text-white font-semibold"
            >
              {selectedIds.size === filteredLabels.length ? (
                <CheckSquare className="w-4 h-4 text-amber-400" />
              ) : (
                <Square className="w-4 h-4 text-neutral-500" />
              )}
              <span>
                {selectedIds.size > 0
                  ? `${selectedIds.size} de ${filteredLabels.length} selecionadas`
                  : 'Selecionar todas'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
                {confirmingBulkDelete ? (
                  <div className="flex items-center gap-2 bg-red-950/80 border border-red-700/80 px-2.5 py-1 rounded-lg">
                    <span className="text-[11px] font-bold text-red-200">
                      Excluir {selectedIds.size} etiqueta{selectedIds.size > 1 ? 's' : ''}?
                    </span>
                    <button
                      onClick={handleExecuteDeleteSelected}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded transition-colors shadow-sm"
                    >
                      Sim, Excluir
                    </button>
                    <button
                      onClick={() => setConfirmingBulkDelete(false)}
                      className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingBulkDelete(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/80 font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Excluir todas as etiquetas selecionadas"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Excluir Várias ({selectedIds.size})</span>
                  </button>
                )}

                <button
                  onClick={handlePrintSelected}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Selecionadas ({selectedIds.size})</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onPrintLabels(filteredLabels)}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-bold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Imprimir Todas ({filteredLabels.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid of Labels */}
      {filteredLabels.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 mx-auto rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-500">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-200">Nenhuma etiqueta encontrada</h3>
            <p className="text-xs text-neutral-400 mt-1">
              {searchTerm
                ? 'Nenhum resultado corresponde à sua pesquisa.'
                : 'Cadastre sua primeira etiqueta de viga ou utilize o gerador em lote para criar um corredor.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenCreate}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors"
            >
              Criar Etiqueta
            </button>
            <button
              onClick={onOpenBatch}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Gerar Corredor
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredLabels.map((lbl) => {
            const isSelected = selectedIds.has(lbl.id);
            return (
              <div
                key={lbl.id}
                className={`bg-neutral-900 border rounded-xl overflow-hidden transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 shadow-md ring-1 ring-amber-500/50'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Header Actions */}
                <div className="px-3 py-2 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleToggleSelect(lbl.id)}
                    className="flex items-center gap-2 text-neutral-300 font-semibold"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-500" />
                    )}
                    <span className="font-mono-tabular text-[11px] text-neutral-400">
                      ID: {lbl.id.slice(-6)}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDuplicateLabel(lbl)}
                      title="Duplicar etiqueta"
                      className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteLabel(lbl.id)}
                      title="Excluir"
                      className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Canvas preview */}
                <div className="p-4 flex items-center justify-center bg-neutral-950/40">
                  <ThermalLabelCard label={lbl} config={config} scale={0.88} />
                </div>

                {/* Footer Controls */}
                <div className="p-3 border-t border-neutral-800 bg-neutral-950/50 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onEditLabel(lbl)}
                    className="text-xs font-semibold text-neutral-300 hover:text-amber-400 transition-colors"
                  >
                    Editar Configurações
                  </button>

                  <button
                    onClick={() => onPrintLabels([lbl])}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
