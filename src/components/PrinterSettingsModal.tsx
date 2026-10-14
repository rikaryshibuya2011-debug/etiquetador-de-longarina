import React, { useState } from 'react';
import { LabelSizeConfig, PRESET_LABEL_SIZES, PrinterDevice, LongarinaLabel } from '../types/label';
import { thermalPrinterService } from '../services/printerConnectionService';
import { downloadZplFile, generateZpl } from '../services/zplGenerator';
import { Printer, Radio, Sliders, Terminal, Download, Check, AlertCircle, X, RefreshCw } from 'lucide-react';

interface PrinterSettingsModalProps {
  currentConfig: LabelSizeConfig;
  onUpdateConfig: (config: LabelSizeConfig) => void;
  onClose: () => void;
  sampleLabel?: LongarinaLabel;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  currentConfig,
  onUpdateConfig,
  onClose,
  sampleLabel,
}) => {
  const [deviceState, setDeviceState] = useState<PrinterDevice>(thermalPrinterService.deviceState);
  const [selectedBaudRate, setSelectedBaudRate] = useState<number>(9600);
  const [customZpl, setCustomZpl] = useState<string>('^XA\n^FO50,50^A0N,40,40^FDTESTE TERMICO LONGARINAPRINT^FS\n^FO50,110^BY2,2.5,40^BCN,40,Y,N,N^FDTEST-01.04^FS\n^XZ');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Connect Web Serial
  const handleConnectSerial = async () => {
    setIsConnecting(true);
    setStatusMessage({ text: 'Aguardando seleção da porta COM/USB...', type: 'info' });
    const res = await thermalPrinterService.connectSerial(selectedBaudRate);
    setIsConnecting(false);
    setDeviceState({ ...thermalPrinterService.deviceState });
    setStatusMessage({
      text: res.message,
      type: res.success ? 'success' : 'error',
    });
  };

  // Connect Web Bluetooth
  const handleConnectBluetooth = async () => {
    setIsConnecting(true);
    setStatusMessage({ text: 'Buscando impressoras térmicas Bluetooth...', type: 'info' });
    const res = await thermalPrinterService.connectBluetooth();
    setIsConnecting(false);
    setDeviceState({ ...thermalPrinterService.deviceState });
    setStatusMessage({
      text: res.message,
      type: res.success ? 'success' : 'error',
    });
  };

  // Disconnect
  const handleDisconnect = async () => {
    await thermalPrinterService.disconnect();
    setDeviceState({ ...thermalPrinterService.deviceState });
    setStatusMessage({ text: 'Desconectado da porta direta. Spooler nativo ativado.', type: 'info' });
  };

  // Send raw command
  const handleSendRaw = async () => {
    if (!customZpl.trim()) return;
    setStatusMessage({ text: 'Transmitindo comando à impressora...', type: 'info' });
    const res = await thermalPrinterService.sendRawCommand(customZpl);
    setStatusMessage({
      text: res.message,
      type: res.success ? 'success' : 'error',
    });
  };

  // Download ZPL
  const handleDownloadZpl = () => {
    const code = sampleLabel ? generateZpl(sampleLabel, currentConfig) : customZpl;
    downloadZplFile(code, `etiqueta_${sampleLabel?.code || 'teste'}.zpl`);
    setStatusMessage({ text: 'Arquivo .ZPL gerado e baixado!', type: 'success' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">
                Central de Conexão com Impressora Térmica
              </h3>
              <p className="text-xs text-neutral-400">
                Configure portas Web Serial, Bluetooth, driver nativo e dimensões de etiqueta.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert if any */}
        {statusMessage && (
          <div
            className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-red-950/60 border-red-800 text-red-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            ) : (
              <Radio className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Connection Modes */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Modo de Conexão com a Impressora
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Web Serial (COM / USB) */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  deviceState.type === 'webserial'
                    ? 'bg-emerald-950/20 border-emerald-500'
                    : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-neutral-200">Porta Serial / USB</span>
                    {deviceState.type === 'webserial' && (
                      <span className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                        ATIVO
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Comunicação direta ZPL via COM/Virtual COM (Zebra, Elgin, Argox).
                  </p>
                </div>

                <div className="mt-3">
                  {deviceState.type === 'webserial' ? (
                    <button
                      onClick={handleDisconnect}
                      className="w-full py-1.5 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg"
                    >
                      Desconectar
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectSerial}
                      disabled={isConnecting}
                      className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors"
                    >
                      Conectar Serial
                    </button>
                  )}
                </div>
              </div>

              {/* Web Bluetooth */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  deviceState.type === 'webbluetooth'
                    ? 'bg-cyan-950/20 border-cyan-500'
                    : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-neutral-200">Bluetooth Térmica</span>
                    {deviceState.type === 'webbluetooth' && (
                      <span className="text-[10px] bg-cyan-900 text-cyan-300 px-1.5 py-0.2 rounded font-bold">
                        ATIVO
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Impressoras móveis portáteis de cintura para empilhadeiras.
                  </p>
                </div>

                <div className="mt-3">
                  {deviceState.type === 'webbluetooth' ? (
                    <button
                      onClick={handleDisconnect}
                      className="w-full py-1.5 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg"
                    >
                      Desconectar
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectBluetooth}
                      disabled={isConnecting}
                      className="w-full py-1.5 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors border border-neutral-700"
                    >
                      Parear Bluetooth
                    </button>
                  )}
                </div>
              </div>

              {/* Native Driver (Spooler) */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  deviceState.type === 'browser'
                    ? 'bg-amber-950/20 border-amber-500'
                    : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-neutral-200">Driver do Windows / CUPS</span>
                    {deviceState.type === 'browser' && (
                      <span className="text-[10px] bg-amber-900 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                        PADRÃO
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Utiliza o driver instalado no computador com corte e avanço automático.
                  </p>
                </div>

                <div className="mt-3">
                  <button
                    onClick={() => {
                      thermalPrinterService.disconnect();
                      setDeviceState({ ...thermalPrinterService.deviceState });
                    }}
                    className="w-full py-1.5 px-2 bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-lg"
                  >
                    Selecionar Padrão
                  </button>
                </div>
              </div>
            </div>

            {/* Baud Rate selector for Serial */}
            <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
              <span className="text-xs text-neutral-300">Velocidade Baud Rate (Serial COM):</span>
              <div className="flex items-center gap-2">
                {[9600, 19200, 38400, 115200].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setSelectedBaudRate(rate)}
                    className={`px-2 py-1 text-xs font-mono-tabular rounded ${
                      selectedBaudRate === rate
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {rate}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calibração de Tamanho de Etiqueta Térmica */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Dimensões do Rolo de Etiquetas
              </span>
              <span className="text-xs font-mono-tabular text-amber-400">
                Ativo: {currentConfig.widthMm}x{currentConfig.heightMm} mm ({currentConfig.dpi} DPI)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_LABEL_SIZES.map((size) => {
                const isSelected = currentConfig.id === size.id;
                return (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => onUpdateConfig(size)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{size.name}</span>
                      <span className="font-mono-tabular text-[11px] text-neutral-400">
                        {size.widthMm} x {size.heightMm} mm
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">{size.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Terminal & Raw ZPL Test */}
          <div className="space-y-3 pt-3 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                Terminal ZPL / Diagnóstico Direto
              </span>
              <button
                type="button"
                onClick={handleDownloadZpl}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Arquivo .ZPL
              </button>
            </div>

            <textarea
              rows={4}
              value={customZpl}
              onChange={(e) => setCustomZpl(e.target.value)}
              className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-mono-tabular text-neutral-200 focus:outline-none focus:border-amber-500"
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-400">
                Pressione para enviar teste de alinhamento e calibração de salto à cabeça térmica.
              </span>
              <button
                type="button"
                onClick={handleSendRaw}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-bold transition-colors border border-neutral-700 whitespace-nowrap"
              >
                Enviar Comando Direto
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors"
          >
            Concluir Configurações
          </button>
        </div>
      </div>
    </div>
  );
};
