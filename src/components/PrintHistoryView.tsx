import React from 'react';
import { PrintLogItem } from '../services/storageService';
import { History, Printer, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';

interface PrintHistoryViewProps {
  history: PrintLogItem[];
  onClearHistory: () => void;
  onReprintBatch: (item: PrintLogItem) => void;
}

export const PrintHistoryView: React.FC<PrintHistoryViewProps> = ({
  history,
  onClearHistory,
  onReprintBatch,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-100">
              Histórico de Impressão Térmica
            </h2>
            <p className="text-xs text-neutral-400">
              Registro auditável dos trabalhos enviados à cabeça térmica e spoolers.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Histórico</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center text-neutral-400 space-y-2">
          <Printer className="w-8 h-8 mx-auto text-neutral-600" />
          <div className="text-sm font-semibold text-neutral-300">Nenhum registro de impressão ainda</div>
          <p className="text-xs">
            As etiquetas impressas via Web Serial, Bluetooth ou driver local ficarão registradas aqui.
          </p>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-neutral-800/40 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono-tabular font-bold text-xs text-neutral-200">
                    {new Date(item.timestamp).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {item.method === 'webserial' ? 'Porta Serial ZPL' : item.method === 'webbluetooth' ? 'Bluetooth' : 'Driver Nativo'}
                  </span>
                </div>

                <div className="text-xs text-neutral-300 font-semibold">
                  {item.labelCount} etiqueta(s) · {item.totalCopies} cópia(s) total · {item.sizeName}
                </div>

                {item.codesSample && item.codesSample.length > 0 && (
                  <div className="text-[11px] text-neutral-400 font-mono-tabular truncate max-w-lg">
                    Códigos: {item.codesSample.slice(0, 4).join(', ')}
                    {item.codesSample.length > 4 ? ` e mais ${item.codesSample.length - 4}...` : ''}
                  </div>
                )}
              </div>

              <button
                onClick={() => onReprintBatch(item)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reimprimir Lote</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
