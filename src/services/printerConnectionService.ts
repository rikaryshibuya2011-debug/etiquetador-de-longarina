import { PrinterDevice, LabelSizeConfig, LongarinaLabel } from '../types/label';
import { generateZpl } from './zplGenerator';

// Audio feedback for print/hardware actions
export function playHardwareSound(type: 'print_start' | 'print_done' | 'scan_success' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'scan_success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } else if (type === 'print_done') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(240, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Ignore audio permission restrictions
  }
}

class ThermalPrinterManager {
  private serialPort: any = null;
  private serialWriter: any = null;
  private bluetoothDevice: any = null;
  private bluetoothCharacteristic: any = null;

  public deviceState: PrinterDevice = {
    type: 'browser',
    name: 'Driver do Sistema (Nativo / Spooler)',
    status: 'connected',
    baudRate: 9600,
    protocol: 'zpl',
    details: 'Pronto para imprimir via spooler do Windows/Linux/Mac ou diálogo térmico.',
  };

  /**
   * Check if Web Serial is supported
   */
  public isSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Check if Web Bluetooth is supported
   */
  public isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Connect to thermal printer via Web Serial API (COM Port / USB-to-Serial)
   */
  public async connectSerial(baudRate = 9600): Promise<{ success: boolean; message: string }> {
    if (!this.isSerialSupported()) {
      return {
        success: false,
        message: 'A API Web Serial não é suportada neste navegador. Use Google Chrome ou Microsoft Edge.',
      };
    }

    try {
      const nav = navigator as any;
      this.serialPort = await nav.serial.requestPort();
      await this.serialPort.open({ baudRate });

      const info = this.serialPort.getInfo ? this.serialPort.getInfo() : {};
      const portName = info.usbVendorId ? `USB COM (VID: 0x${info.usbVendorId.toString(16).toUpperCase()})` : 'Porta Serial COM';

      this.deviceState = {
        type: 'webserial',
        name: portName,
        status: 'connected',
        baudRate,
        protocol: 'zpl',
        details: `Conectado em ${baudRate} bps. Comandos ZPL enviados diretamente à cabeça térmica.`,
      };

      playHardwareSound('print_done');
      return { success: true, message: `Conectado com sucesso à impressora em ${portName} (${baudRate} bps)!` };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return { success: false, message: 'Nenhuma porta selecionada.' };
      }
      return { success: false, message: `Erro ao conectar na porta serial: ${err.message}` };
    }
  }

  /**
   * Connect to portable thermal printer via Web Bluetooth
   */
  public async connectBluetooth(): Promise<{ success: boolean; message: string }> {
    if (!this.isBluetoothSupported()) {
      return {
        success: false,
        message: 'A API Web Bluetooth não é suportada neste navegador. Use Google Chrome ou Bluefy no iOS.',
      };
    }

    try {
      const nav = navigator as any;
      this.bluetoothDevice = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455'],
      });

      const server = await this.bluetoothDevice.gatt.connect();
      const services = await server.getPrimaryServices();
      if (services.length > 0) {
        const characteristics = await services[0].getCharacteristics();
        this.bluetoothCharacteristic = characteristics[0];
      }

      this.deviceState = {
        type: 'webbluetooth',
        name: this.bluetoothDevice.name || 'Impressora Térmica Bluetooth',
        status: 'connected',
        baudRate: 9600,
        protocol: 'zpl',
        details: 'Conexão sem fio Bluetooth ativa.',
      };

      playHardwareSound('print_done');
      return { success: true, message: `Impressora Bluetooth "${this.deviceState.name}" conectada!` };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return { success: false, message: 'Nenhum dispositivo Bluetooth selecionado.' };
      }
      return { success: false, message: `Falha ao parear Bluetooth: ${err.message}` };
    }
  }

  /**
   * Disconnect any direct hardware port
   */
  public async disconnect(): Promise<void> {
    if (this.serialWriter) {
      try {
        await this.serialWriter.close();
      } catch {}
      this.serialWriter = null;
    }
    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch {}
      this.serialPort = null;
    }
    if (this.bluetoothDevice && this.bluetoothDevice.gatt?.connected) {
      this.bluetoothDevice.gatt.disconnect();
      this.bluetoothDevice = null;
      this.bluetoothCharacteristic = null;
    }

    this.deviceState = {
      type: 'browser',
      name: 'Driver do Sistema (Nativo / Spooler)',
      status: 'connected',
      baudRate: 9600,
      protocol: 'zpl',
      details: 'Pronto para impressão via spooler térmico do sistema.',
    };
  }

  /**
   * Send raw string (ZPL / ESC-POS / TSPL) directly to the connected thermal printer
   */
  public async sendRawCommand(rawCommand: string): Promise<{ success: boolean; message: string }> {
    if (this.deviceState.type === 'webserial' && this.serialPort) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(rawCommand);
        const writer = this.serialPort.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
        playHardwareSound('print_done');
        return { success: true, message: 'Comando enviado diretamente à porta serial!' };
      } catch (err: any) {
        playHardwareSound('error');
        return { success: false, message: `Erro ao enviar dados via Serial: ${err.message}` };
      }
    }

    if (this.deviceState.type === 'webbluetooth' && this.bluetoothCharacteristic) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(rawCommand);
        // Bluetooth packets are usually limited to 20-512 bytes
        const chunkSize = 64;
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          await this.bluetoothCharacteristic.writeValue(chunk);
        }
        playHardwareSound('print_done');
        return { success: true, message: 'Comando enviado via Bluetooth!' };
      } catch (err: any) {
        playHardwareSound('error');
        return { success: false, message: `Erro ao enviar dados via Bluetooth: ${err.message}` };
      }
    }

    return {
      success: false,
      message: 'Nenhuma impressora direta conectada. Use o modo de Impressão Nativa (Spooler do Sistema).',
    };
  }

  /**
   * Prints an array of labels
   */
  public async printLabels(
    labels: LongarinaLabel[],
    config: LabelSizeConfig
  ): Promise<{ success: boolean; message: string; method: string }> {
    if (labels.length === 0) {
      return { success: false, message: 'Nenhuma etiqueta selecionada para impressão.', method: 'none' };
    }

    // Direct hardware printing if Serial or Bluetooth is active
    if (this.deviceState.type === 'webserial' || this.deviceState.type === 'webbluetooth') {
      let combinedZpl = '';
      for (const label of labels) {
        const copies = Math.max(1, label.copies || 1);
        for (let c = 0; c < copies; c++) {
          combinedZpl += generateZpl(label, config) + '\n';
        }
      }

      const res = await this.sendRawCommand(combinedZpl);
      return {
        success: res.success,
        message: res.message,
        method: this.deviceState.type,
      };
    }

    // Default: Browser Thermal Spooler Print
    try {
      playHardwareSound('print_done');
      window.print();
      return {
        success: true,
        message: `${labels.length} etiqueta(s) enviada(s) para a fila do driver térmico.`,
        method: 'browser',
      };
    } catch (err: any) {
      playHardwareSound('error');
      return {
        success: false,
        message: `Falha ao acionar spooler de impressão: ${err.message}`,
        method: 'browser',
      };
    }
  }
}

export const thermalPrinterService = new ThermalPrinterManager();
