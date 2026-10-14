import React, { useState, useEffect, useRef } from 'react';
import { LongarinaLabel, ScanResult } from '../types/label';
import { barcodeScannerService } from '../services/barcodeScannerService';
import { playHardwareSound } from '../services/printerConnectionService';
import { Barcode, Camera, Printer, Search, RefreshCw, Volume2, ShieldCheck, ArrowRight, X } from 'lucide-react';

interface BarcodeScannerViewProps {
  savedLabels: LongarinaLabel[];
  onSelectLabel: (label: LongarinaLabel) => void;
  onPrintLabel: (label: LongarinaLabel) => void;
  onCreateFromScan: (code: string) => void;
}

export const BarcodeScannerView: React.FC<BarcodeScannerViewProps> = ({
  savedLabels,
  onSelectLabel,
  onPrintLabel,
  onCreateFromScan,
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [manualInput, setManualInput] = useState<string>('');
  const [scannerDiagnostics, setScannerDiagnostics] = useState<{
    status: string;
    totalScans: number;
    lastDetectedSource: string;
  }>({
    status: 'Ouvindo leitor USB / Bluetooth em segundo plano',
    totalScans: 0,
    lastDetectedSource: 'Nenhum',
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Subscribe to barcodeScannerService (handles physical USB guns and emits)
  useEffect(() => {
    const unsubscribe = barcodeScannerService.subscribe((result) => {
      // Find matching label in current warehouse database
      const matched = savedLabels.find(
        (l) => l.code.toUpperCase() === result.code.toUpperCase()
      );
      result.matchedLabel = matched;

      setLastScan(result);
      setScanHistory((prev) => [result, ...prev].slice(0, 30));
      setScannerDiagnostics((prev) => ({
        ...prev,
        totalScans: prev.totalScans + 1,
        lastDetectedSource: result.format,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [savedLabels]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start Camera Barcode scanning
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Câmera não suportada neste dispositivo.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);

      // Start detection loop using BarcodeDetector if supported, or interval capture
      startDetectionLoop();
    } catch (err: any) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permissão de câmera negada pelo usuário.'
          : `Erro ao inicializar câmera: ${err.message}`
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startDetectionLoop = () => {
    // If BarcodeDetector is available in Chromium
    const hasBarcodeDetector = 'BarcodeDetector' in window;
    let detector: any = null;

    if (hasBarcodeDetector) {
      try {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        detector = new BarcodeDetectorClass({
          formats: ['code_128', 'code_39', 'qr_code', 'ean_13', 'data_matrix'],
        });
      } catch (e) {
        console.warn('BarcodeDetector initialization warning:', e);
      }
    }

    scanIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      if (detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue && rawValue !== lastScan?.code) {
              barcodeScannerService.emitScan(rawValue, 'CAMERA');
            }
          }
        } catch {
          // ignore transient frame read errors
        }
      }
    }, 280);
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    barcodeScannerService.emitScan(manualInput.trim(), 'MANUAL');
    setManualInput('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title & Status Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Barcode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              Leitor de Código de Barras & Consulta WMS
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                Escuta Ativa
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Bipe etiquetas com leitor óptico USB/Bluetooth ou utilize a câmera para auditoria de longarinas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isCameraActive ? (
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Ativar Câmera</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="px-4 py-2 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Desativar Câmera</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewfinder or USB Scanner Receiver */}
        <div className="lg:col-span-7 space-y-4">
          {isCameraActive ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden relative">
              <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Laser Aiming Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-3/4 h-28 border-2 border-amber-400/80 rounded-md relative flex items-center justify-center shadow-lg">
                    <div className="w-full h-0.5 bg-red-500 animate-pulse shadow-sm" />
                    <span className="absolute -bottom-6 text-[10px] font-bold font-mono-tabular bg-neutral-900/90 text-amber-400 px-2 py-0.5 rounded">
                      Posicione a barra de código da longarina aqui
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-neutral-950 flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Câmera ativa (Code 128 / QR Code)
                </span>
                <button
                  onClick={stopCamera}
                  className="text-xs text-neutral-400 hover:text-neutral-200 font-semibold"
                >
                  Fechar Câmera
                </button>
              </div>
            </div>
          ) : (
            /* USB Gun Receiver Card */
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-amber-400">
                <Barcode className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  Leitor Físico USB / Sem Fio Pronto
                </h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                  Aponte seu leitor de código de barras (Honeywell, Zebra, Elgin, Bematech) e aperte o gatilho. O sistema captura o bip instantaneamente de qualquer tela.
                </p>
              </div>

              {cameraError && (
                <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
                  {cameraError}
                </div>
              )}

              {/* Manual Input fallback / Simulator */}
              <form onSubmit={handleManualScanSubmit} className="pt-2 max-w-md mx-auto">
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 text-left">
                  Ou digite / cole o código manualmente para testar:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                    placeholder="Ex: 01.04.02.01 ou R01-P04-N02-V01"
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-mono-tabular font-bold text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black rounded-lg transition-colors"
                  >
                    Simular Bip
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Diagnostic indicators */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Bips registrados nesta sessão:</span>
            <span className="font-mono-tabular font-bold text-amber-400">
              {scannerDiagnostics.totalScans} leituras
            </span>
          </div>
        </div>

        {/* Right Column: Matched Label Result & Immediate Actions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
              Resultado do Último Bip
            </div>

            {lastScan ? (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                    <span>FONTE: {lastScan.format}</span>
                    <span className="font-mono-tabular">{lastScan.timestamp}</span>
                  </div>

                  <div className="text-xl font-black font-mono-tabular text-amber-400 tracking-tight">
                    {lastScan.code}
                  </div>

                  {lastScan.parsedAddress && (
                    <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center gap-3 text-xs text-neutral-300 font-condensed">
                      <span>RUA: <strong className="text-white">{lastScan.parsedAddress.street}</strong></span>
                      <span>·</span>
                      <span>PRÉDIO: <strong className="text-white">{lastScan.parsedAddress.bay}</strong></span>
                      <span>·</span>
                      <span>NÍVEL: <strong className="text-white">{lastScan.parsedAddress.level}</strong></span>
                      <span>·</span>
                      <span>VÃO: <strong className="text-white">{lastScan.parsedAddress.position}</strong></span>
                    </div>
                  )}
                </div>

                {/* Match verification */}
                {lastScan.matchedLabel ? (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Longarina Cadastrada no Sistema</span>
                    </div>
                    <div className="text-xs text-neutral-300 font-mono-tabular">
                      Carga: {lastScan.matchedLabel.loadCapacityKg} kg · Zona: {lastScan.matchedLabel.zone} · Palete: {lastScan.matchedLabel.palletType}
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => onPrintLabel(lastScan.matchedLabel!)}
                        className="flex-1 py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black rounded-md flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Reimprimir Imediatamente</span>
                      </button>

                      <button
                        onClick={() => onSelectLabel(lastScan.matchedLabel!)}
                        className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-md transition-colors"
                      >
                        Abrir Editor
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg space-y-2">
                    <div className="text-xs font-bold text-amber-300">
                      Etiqueta não encontrada no cadastro atual
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Você pode cadastrar esta longarina com as coordenadas bipadas.
                    </p>
                    <button
                      onClick={() => onCreateFromScan(lastScan.code)}
                      className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-md transition-colors"
                    >
                      Criar Nova Etiqueta com este Código
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-neutral-400">
                Aguardando leitura de código... Bipe uma etiqueta de longarina com o leitor óptico.
              </div>
            )}
          </div>

          {/* History of Recent Scans */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
              Histórico Recente de Bips
            </div>

            {scanHistory.length === 0 ? (
              <div className="text-xs text-neutral-400 py-3 text-center">Nenhum bip nesta sessão.</div>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-neutral-800">
                {scanHistory.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono-tabular font-bold text-neutral-200 block">
                        {item.code}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {item.format} · {item.timestamp}
                      </span>
                    </div>

                    {item.matchedLabel && (
                      <button
                        onClick={() => onPrintLabel(item.matchedLabel!)}
                        title="Reimprimir"
                        className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-800"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
