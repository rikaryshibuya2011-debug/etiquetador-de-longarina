import { playHardwareSound } from './printerConnectionService';
import { parseScannedAddress } from './barcodeHelper';
import { ScanResult } from '../types/label';

type ScanListener = (result: ScanResult) => void;

class BarcodeScannerService {
  private listeners: Set<ScanListener> = new Set();
  private buffer = '';
  private lastKeyTime = 0;
  private readonly KEY_STROKE_TIMEOUT = 50; // Barcode scanners type very fast (<35ms between keys)
  private readonly MIN_BARCODE_LENGTH = 3;
  private isListeningGlobal = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Subscribe a listener for all detected scans
   */
  public subscribe(listener: ScanListener): () => void {
    this.listeners.add(listener);
    if (!this.isListeningGlobal && typeof window !== 'undefined') {
      this.startGlobalListener();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Start listening to physical USB / Wireless Barcode gun keystrokes globally
   */
  public startGlobalListener() {
    if (this.isListeningGlobal || typeof window === 'undefined') return;
    window.addEventListener('keydown', this.handleKeyDown, true);
    this.isListeningGlobal = true;
  }

  public stopGlobalListener() {
    if (!this.isListeningGlobal || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.handleKeyDown, true);
    this.isListeningGlobal = false;
  }

  private handleKeyDown(e: KeyboardEvent) {
    // If the active element is an input and typing slowly, let the user type normally
    const target = e.target as HTMLElement;
    const isEditingInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastKeyTime;

    // Enter or Tab typically terminates a barcode scanner gun transmission
    if (e.key === 'Enter' || e.key === 'Tab') {
      // Check if buffer contains a barcode read (either fast keystrokes or collected buffer)
      if (this.buffer.length >= this.MIN_BARCODE_LENGTH) {
        const rawCode = this.buffer.trim();
        this.emitScan(rawCode, 'USB_GUN');
        this.buffer = '';

        // If it was captured from a scanner, prevent standard form submit
        if (timeDiff < 100) {
          e.preventDefault();
          e.stopPropagation();
        }
      } else {
        this.buffer = '';
      }
      return;
    }

    // Only record printable single characters
    if (e.key.length === 1) {
      if (timeDiff > this.KEY_STROKE_TIMEOUT && this.buffer.length > 0) {
        // If too much time passed between characters and not focused on input, reset buffer
        if (!isEditingInput) {
          this.buffer = '';
        }
      }

      this.lastKeyTime = currentTime;
      this.buffer += e.key;

      // Automatically reset buffer if it gets excessively long without terminator
      if (this.buffer.length > 80) {
        this.buffer = '';
      }
    }
  }

  /**
   * Manually emit a scan from camera or simulation
   */
  public emitScan(code: string, source: 'USB_GUN' | 'CAMERA' | 'MANUAL' = 'MANUAL') {
    const trimmed = code.trim();
    if (!trimmed) return;

    playHardwareSound('scan_success');

    const parsed = parseScannedAddress(trimmed);
    const result: ScanResult = {
      code: trimmed,
      format: source,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      parsedAddress: parsed,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(result);
      } catch (err) {
        console.error('Error in barcode listener callback:', err);
      }
    });
  }
}

export const barcodeScannerService = new BarcodeScannerService();
