import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  LongarinaLabel,
  CanvasElement,
  CanvasElementType,
  ArrowDirection,
  createDefaultBrasilExpressElements,
  createLegendBelowBrasilExpressElements,
} from '../types/label';
import {
  getBarcodeRenderData,
  generateQrCodeDataUrl,
  BarcodeRenderData,
} from '../services/barcodeHelper';
import { convertImageToMonochrome } from '../services/imageHelper';
import { MONOCHROME_PRESETS } from '../services/imagePresets';
import {
  Type,
  Barcode,
  Minus,
  Image as ImageIcon,
  Navigation,
  Trash2,
  Copy,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Upload,
  RefreshCw,
  Move,
  Check,
  CheckSquare,
  Square,
  SlidersHorizontal,
  MousePointer,
  Sparkles,
  ShieldCheck,
  Volume2,
  RotateCw,
} from 'lucide-react';

interface LabelCanvasEditorProps {
  label: LongarinaLabel;
  onChange: (updatedLabel: LongarinaLabel) => void;
}

export const LabelCanvasEditor: React.FC<LabelCanvasEditorProps> = ({ label, onChange }) => {
  // Ensure elements list exists
  const initialElements =
    label.elements && label.elements.length > 0
      ? label.elements
      : createDefaultBrasilExpressElements(
          label.street || '20',
          label.bay || '001',
          label.level || '1',
          label.position || '01',
          label.companyName || 'BRASIL EXPRESS',
          label.code || '20-001-1-01'
        );

  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  // Multi-selection: array of selected element IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([initialElements[1]?.id || 'elem-num-rua']);
  const [barcodesData, setBarcodesData] = useState<Record<string, BarcodeRenderData>>({});

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{
    clientX: number;
    clientY: number;
    initialPositions: Record<string, { x: number; y: number }>;
  } | null>(null);

  // Distinguish true drag from click to prevent click from deselecting multi-selection
  const hasMovedDuringPointerDown = useRef<boolean>(false);

  // Resizing state for SINGLE element or GROUP of elements
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | 'e' | 's' | null>(null);
  const [isGroupResizing, setIsGroupResizing] = useState<boolean>(false);

  // Single resize start state
  const [resizeStart, setResizeStart] = useState<{
    clientX: number;
    clientY: number;
    startW: number;
    startH: number;
    startFontSize?: number;
    targetId: string;
  } | null>(null);

  // Group resize start state
  const [groupResizeStart, setGroupResizeStart] = useState<{
    clientX: number;
    clientY: number;
    startBox: { x: number; y: number; width: number; height: number; centerX: number; centerY: number };
    initialElements: CanvasElement[];
  } | null>(null);

  // Marquee box selection state
  const [isMarquee, setIsMarquee] = useState<boolean>(false);
  const [marqueeBox, setMarqueeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Modal for photo / monochrome logos
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [imageThreshold, setImageThreshold] = useState<number>(128);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [originalUploadFile, setOriginalUploadFile] = useState<File | null>(null);

  // Panel tabs
  const [sidebarTab, setSidebarTab] = useState<'properties' | 'elements_list' | 'presets'>('properties');

  // Interactive barcode scanner test state
  const [scannerTestInput, setScannerTestInput] = useState<string>('');
  const [scannerLastScanned, setScannerLastScanned] = useState<string | null>(null);

  const playScannerBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio context requires user interaction
    }
  }, []);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mutable ref to always have latest elements for dragging/resizing callbacks
  const elementsRef = useRef<CanvasElement[]>(elements);
  elementsRef.current = elements;

  const selectedIdsRef = useRef<string[]>(selectedIds);
  selectedIdsRef.current = selectedIds;

  // Sync elements to parent label
  const notifyChanges = useCallback(
    (newElements: CanvasElement[]) => {
      setElements(newElements);
      elementsRef.current = newElements;
      onChange({
        ...label,
        elements: newElements,
      });
    },
    [label, onChange]
  );

  // Re-generate SVG/DataURL barcode data whenever barcode elements or code change
  useEffect(() => {
    const map: Record<string, BarcodeRenderData> = {};
    elements.forEach((el) => {
      if (el.type === 'barcode') {
        const val = el.content || label.code || '20-001-1-01';
        if (el.barcodeFormat === 'QR') {
          generateQrCodeDataUrl(val).then((url) => {
            setBarcodesData((prev) => ({
              ...prev,
              [el.id]: {
                innerHtml: '',
                viewBoxWidth: 160,
                viewBoxHeight: 160,
                dataUrl: url,
                sanitizedValue: val,
              },
            }));
          });
        } else {
          map[el.id] = getBarcodeRenderData(val);
        }
      }
    });
    setBarcodesData((prev) => ({ ...prev, ...map }));
  }, [elements, label.code]);

  // Primary selected element (first in selection)
  const primarySelected = elements.find((el) => el.id === selectedIds[0]) || null;
  const isMultiSelection = selectedIds.length > 1;

  // Compute unified group bounding box for multiple selected items
  const groupBoundingBox = useMemo(() => {
    if (selectedIds.length < 2) return null;
    const selectedItems = elements.filter((el) => selectedIds.includes(el.id));
    if (selectedItems.length < 2) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    selectedItems.forEach((el) => {
      const halfW = el.width / 2;
      const halfH = el.height / 2;
      minX = Math.min(minX, el.x - halfW);
      maxX = Math.max(maxX, el.x + halfW);
      minY = Math.min(minY, el.y - halfH);
      maxY = Math.max(maxY, el.y + halfH);
    });

    const pad = 12;
    const boxX = minX - pad;
    const boxY = minY - pad;
    const boxW = Math.max(40, maxX - minX + pad * 2);
    const boxH = Math.max(30, maxY - minY + pad * 2);

    return {
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }, [elements, selectedIds]);

  // Selection toggle helper
  const handleSelectElement = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // If the user just dragged, do NOT interpret as a click that resets selection!
    if (hasMovedDuringPointerDown.current) return;

    if (e && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      // Toggle in multi-select
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      // Single select
      setSelectedIds([id]);
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(elements.map((el) => el.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Convert client coordinates to SVG canvas coordinates (0-1000 X, 0-1500 Y)
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const scaleY = 1500 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Drag handling on element pointer down
  const handleElementPointerDown = (el: CanvasElement, e: React.PointerEvent) => {
    e.stopPropagation();
    hasMovedDuringPointerDown.current = false;

    // Determine current selection:
    let activeSelection = selectedIdsRef.current;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (!activeSelection.includes(el.id)) {
        activeSelection = [...activeSelection, el.id];
        setSelectedIds(activeSelection);
      }
    } else {
      // If clicked item is ALREADY part of the multi-selection, KEEP the whole selection!
      // Do not collapse to a single item!
      if (!activeSelection.includes(el.id)) {
        activeSelection = [el.id];
        setSelectedIds(activeSelection);
      }
    }

    if (el.isLocked) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    const initialPositions: Record<string, { x: number; y: number }> = {};
    elementsRef.current.forEach((item) => {
      if (activeSelection.includes(item.id)) {
        initialPositions[item.id] = { x: item.x, y: item.y };
      }
    });

    setIsDragging(true);
    setDragStart({
      clientX: coords.x,
      clientY: coords.y,
      initialPositions,
    });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Single element resize handle pointer down
  const handleSingleResizePointerDown = (
    el: CanvasElement,
    handle: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 's',
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    setSelectedIds([el.id]);

    const coords = getCanvasCoords(e.clientX, e.clientY);
    setIsResizing(true);
    setIsGroupResizing(false);
    setResizeHandle(handle);
    setResizeStart({
      clientX: coords.x,
      clientY: coords.y,
      startW: el.width,
      startH: el.height,
      startFontSize: el.fontSize || 40,
      targetId: el.id,
    });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // GROUP resize handle pointer down (SCALES ALL SELECTED ITEMS SIMULTANEOUSLY)
  const handleGroupResizePointerDown = (
    handle: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 's',
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    if (!groupBoundingBox) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    setIsResizing(true);
    setIsGroupResizing(true);
    setResizeHandle(handle);

    const initialElements = elementsRef.current
      .filter((el) => selectedIdsRef.current.includes(el.id))
      .map((el) => ({ ...el }));

    setGroupResizeStart({
      clientX: coords.x,
      clientY: coords.y,
      startBox: { ...groupBoundingBox },
      initialElements,
    });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Canvas pointer down (for background marquee selection or clicking empty space)
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'rect') {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (!e.shiftKey && !e.ctrlKey) {
        setSelectedIds([]);
      }
      setIsMarquee(true);
      setMarqueeBox({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  // Pointer move handler
  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    // 1. GROUP RESIZING: SCALES ALL SELECTED ELEMENTS PROPORTIONALLY IN REAL TIME
    if (isResizing && isGroupResizing && groupResizeStart) {
      hasMovedDuringPointerDown.current = true;
      const dx = coords.x - groupResizeStart.clientX;
      const dy = coords.y - groupResizeStart.clientY;

      const origW = groupResizeStart.startBox.width;
      const origH = groupResizeStart.startBox.height;
      const centerX = groupResizeStart.startBox.centerX;
      const centerY = groupResizeStart.startBox.centerY;

      // Scale factors from group center
      let scaleX = 1;
      let scaleY = 1;

      if (resizeHandle === 'se') {
        scaleX = Math.max(0.2, (origW + dx * 2) / origW);
        scaleY = Math.max(0.2, (origH + dy * 2) / origH);
      } else if (resizeHandle === 'e') {
        scaleX = Math.max(0.2, (origW + dx * 2) / origW);
        scaleY = 1;
      } else if (resizeHandle === 's') {
        scaleX = 1;
        scaleY = Math.max(0.2, (origH + dy * 2) / origH);
      } else {
        scaleX = Math.max(0.2, (origW + dx * 2) / origW);
        scaleY = Math.max(0.2, (origH + dy * 2) / origH);
      }

      const initialMap = new Map<string, CanvasElement>(
        groupResizeStart.initialElements.map((item) => [item.id, item])
      );

      const updated = elementsRef.current.map((el) => {
        const init = initialMap.get(el.id);
        if (!init) return el;

        // Position expands/contracts relative to group center
        const newX = Math.round(centerX + (init.x - centerX) * scaleX);
        const newY = Math.round(centerY + (init.y - centerY) * scaleY);
        const newW = Math.max(15, Math.round(init.width * scaleX));
        const newH = Math.max(15, Math.round(init.height * scaleY));

        let newFontSize = init.fontSize;
        if (init.type === 'text' && init.fontSize) {
          newFontSize = Math.max(12, Math.min(380, Math.round(init.fontSize * scaleY)));
        }

        let newStroke = init.strokeWidth;
        if (init.strokeWidth) {
          newStroke = Math.max(1, Math.min(40, Math.round(init.strokeWidth * Math.min(scaleX, scaleY))));
        }

        return {
          ...el,
          x: newX,
          y: newY,
          width: newW,
          height: newH,
          ...(newFontSize !== undefined ? { fontSize: newFontSize } : {}),
          ...(newStroke !== undefined ? { strokeWidth: newStroke } : {}),
        };
      });

      setElements(updated);
      elementsRef.current = updated;
      return;
    }

    // 2. SINGLE ELEMENT RESIZING (PROPORTIONALLY SCALES TEXT, BARCODE, ARROWS, LINES)
    if (isResizing && !isGroupResizing && resizeStart) {
      hasMovedDuringPointerDown.current = true;
      const target = elementsRef.current.find((item) => item.id === resizeStart.targetId);
      if (!target) return;

      const dx = coords.x - resizeStart.clientX;
      const dy = coords.y - resizeStart.clientY;

      let newW = resizeStart.startW;
      let newH = resizeStart.startH;

      if (resizeHandle === 'se') {
        newW = Math.max(30, Math.round(resizeStart.startW + dx * 2));
        newH = Math.max(20, Math.round(resizeStart.startH + dy * 2));
      } else if (resizeHandle === 'e') {
        newW = Math.max(30, Math.round(resizeStart.startW + dx * 2));
      } else if (resizeHandle === 's') {
        newH = Math.max(20, Math.round(resizeStart.startH + dy * 2));
      } else {
        newW = Math.max(30, Math.round(resizeStart.startW + dx * 2));
        newH = Math.max(20, Math.round(resizeStart.startH + dy * 2));
      }

      // If TEXT element: scale font size proportionally so numbers/letters visually expand
      let newFontSize = target.fontSize;
      if (target.type === 'text') {
        const scaleFactor = Math.max(0.2, newH / resizeStart.startH);
        newFontSize = Math.max(14, Math.min(360, Math.round((resizeStart.startFontSize || 40) * scaleFactor)));
      }

      const updated = elementsRef.current.map((el) =>
        el.id === target.id
          ? {
              ...el,
              width: newW,
              height: newH,
              ...(target.type === 'text' ? { fontSize: newFontSize } : {}),
            }
          : el
      );

      setElements(updated);
      elementsRef.current = updated;
      return;
    }

    // 3. DRAGGING ACTIVE SELECTION (MOVES ALL SELECTED ITEMS TOGETHER RIGIDLY, PRESERVING DISTANCE)
    if (isDragging && dragStart) {
      const dist = Math.hypot(coords.x - dragStart.clientX, coords.y - dragStart.clientY);
      if (dist > 3) {
        hasMovedDuringPointerDown.current = true;
      }

      const dx = Math.round(coords.x - dragStart.clientX);
      const dy = Math.round(coords.y - dragStart.clientY);

      const updated = elementsRef.current.map((el) => {
        const init = dragStart.initialPositions[el.id];
        if (init) {
          return {
            ...el,
            x: init.x + dx,
            y: init.y + dy,
          };
        }
        return el;
      });

      setElements(updated);
      elementsRef.current = updated;
      return;
    }

    // 4. Marquee box selection
    if (isMarquee && marqueeBox) {
      setMarqueeBox((prev) => (prev ? { ...prev, x2: coords.x, y2: coords.y } : null));
    }
  };

  // Pointer up handler
  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      notifyChanges(elementsRef.current);
    }
    if (isResizing) {
      setIsResizing(false);
      setIsGroupResizing(false);
      setResizeStart(null);
      setGroupResizeStart(null);
      setResizeHandle(null);
      notifyChanges(elementsRef.current);
    }
    if (isMarquee && marqueeBox) {
      setIsMarquee(false);
      const minX = Math.min(marqueeBox.x1, marqueeBox.x2);
      const maxX = Math.max(marqueeBox.x1, marqueeBox.x2);
      const minY = Math.min(marqueeBox.y1, marqueeBox.y2);
      const maxY = Math.max(marqueeBox.y1, marqueeBox.y2);

      // Select elements inside or touching marquee box
      const hitIds = elementsRef.current
        .filter((el) => {
          return el.x >= minX - 80 && el.x <= maxX + 80 && el.y >= minY - 80 && el.y <= maxY + 80;
        })
        .map((el) => el.id);

      if (hitIds.length > 0) {
        setSelectedIds(hitIds);
      }
      setMarqueeBox(null);
    }
  };

  // Property update helper for SINGLE active element
  const updateSingleProperty = (patch: Partial<CanvasElement>) => {
    if (!primarySelected) return;
    const updated = elements.map((el) =>
      el.id === primarySelected.id ? { ...el, ...patch } : el
    );
    notifyChanges(updated);
  };

  // Scale SINGLE element with proportional zoom (+30%, +15%, -15%, -30%)
  const handleScaleSingleElement = (factor: number) => {
    if (!primarySelected) return;
    const target = primarySelected;
    const newW = Math.max(30, Math.round(target.width * factor));
    const newH = Math.max(20, Math.round(target.height * factor));
    const newFontSize =
      target.fontSize ? Math.max(14, Math.min(360, Math.round(target.fontSize * factor))) : undefined;
    const newStroke =
      target.strokeWidth ? Math.max(1, Math.min(40, Math.round(target.strokeWidth * factor))) : undefined;

    const updated = elements.map((el) => {
      if (el.id === target.id) {
        return {
          ...el,
          width: newW,
          height: newH,
          ...(newFontSize !== undefined ? { fontSize: newFontSize } : {}),
          ...(newStroke !== undefined ? { strokeWidth: newStroke } : {}),
        };
      }
      return el;
    });
    notifyChanges(updated);
  };

  // SCALE GROUP PROPORTIONALLY: ALL selected elements enlarge/shrink, preserving distance and relative layout
  const handleScaleGroup = (factor: number) => {
    if (selectedIds.length === 0) return;
    const targets = elements.filter((el) => selectedIds.includes(el.id));
    if (targets.length === 0) return;

    // Center point of group
    const avgX = Math.round(targets.reduce((acc, t) => acc + t.x, 0) / targets.length);
    const avgY = Math.round(targets.reduce((acc, t) => acc + t.y, 0) / targets.length);

    const updated = elements.map((el) => {
      if (selectedIds.includes(el.id)) {
        // Expand/contract distance from center
        const newX = Math.round(avgX + (el.x - avgX) * factor);
        const newY = Math.round(avgY + (el.y - avgY) * factor);
        const newW = Math.max(20, Math.round(el.width * factor));
        const newH = Math.max(15, Math.round(el.height * factor));
        const newFontSize = el.fontSize
          ? Math.max(14, Math.min(360, Math.round(el.fontSize * factor)))
          : undefined;
        const newStroke = el.strokeWidth
          ? Math.max(1, Math.min(40, Math.round(el.strokeWidth * factor)))
          : undefined;

        return {
          ...el,
          x: newX,
          y: newY,
          width: newW,
          height: newH,
          ...(newFontSize !== undefined ? { fontSize: newFontSize } : {}),
          ...(newStroke !== undefined ? { strokeWidth: newStroke } : {}),
        };
      }
      return el;
    });

    notifyChanges(updated);
  };

  // NUDGE GROUP/SELECTION: moves all selected items by dx, dy without changing their relative distance
  const handleNudge = (dx: number, dy: number) => {
    if (selectedIds.length === 0) return;
    const updated = elements.map((el) => {
      if (selectedIds.includes(el.id)) {
        return {
          ...el,
          x: el.x + dx,
          y: el.y + dy,
        };
      }
      return el;
    });
    notifyChanges(updated);
  };

  // Quick font size change for ALL selected text elements
  const handleSetGroupFontSize = (newSize: number) => {
    const updated = elements.map((el) => {
      if (selectedIds.includes(el.id) && el.type === 'text') {
        return { ...el, fontSize: newSize };
      }
      return el;
    });
    notifyChanges(updated);
  };

  // Add new elements
  const handleAddElement = (type: CanvasElementType) => {
    const id = `elem-${Date.now()}`;
    let newEl: CanvasElement;

    if (type === 'text') {
      newEl = {
        id,
        type: 'text',
        name: 'Descrição / Texto',
        x: 500,
        y: 750,
        width: 380,
        height: 80,
        rotation: 0,
        content: 'DESCRIÇÃO WMS',
        fontSize: 54,
        fontWeight: '800',
      };
    } else if (type === 'barcode') {
      newEl = {
        id,
        type: 'barcode',
        name: 'Código de Barras (Code 128)',
        x: 500,
        y: 750,
        width: 520,
        height: 240,
        rotation: 0,
        content: label.code || '20-001-1-01',
        barcodeFormat: 'CODE128',
        barcodeDisplayValue: true,
      };
    } else if (type === 'line') {
      newEl = {
        id,
        type: 'line',
        name: 'Linha Divisória',
        x: 500,
        y: 750,
        width: 4,
        height: 500,
        rotation: 0,
        strokeWidth: 4,
        lineStyle: 'solid',
      };
    } else if (type === 'arrow') {
      newEl = {
        id,
        type: 'arrow',
        name: 'Seta de Posição',
        x: 500,
        y: 750,
        width: 140,
        height: 140,
        rotation: 0,
        arrowType: 'curved_down_left',
      };
    } else {
      newEl = {
        id,
        type: 'rect',
        name: 'Moldura / Caixa',
        x: 500,
        y: 750,
        width: 400,
        height: 240,
        rotation: 0,
        strokeWidth: 4,
      };
    }

    const updated = [...elements, newEl];
    notifyChanges(updated);
    setSelectedIds([id]);
  };

  // Duplicate selected elements
  const handleDuplicate = () => {
    if (selectedIds.length === 0) return;
    const newItems: CanvasElement[] = [];
    const newSelectedIds: string[] = [];

    elements.forEach((el) => {
      if (selectedIds.includes(el.id)) {
        const copy: CanvasElement = {
          ...el,
          id: `elem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: `${el.name} (Cópia)`,
          x: el.x + 30,
          y: el.y + 30,
        };
        newItems.push(copy);
        newSelectedIds.push(copy.id);
      }
    });

    const updated = [...elements, ...newItems];
    notifyChanges(updated);
    setSelectedIds(newSelectedIds);
  };

  // Delete selected elements
  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    const updated = elements.filter((el) => !selectedIds.includes(el.id));
    notifyChanges(updated);
    setSelectedIds(updated.length > 0 ? [updated[0].id] : []);
  };

  // Keyboard shortcut: Delete or Backspace removes selected elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIdsRef.current.length > 0) {
          e.preventDefault();
          const currentIds = selectedIdsRef.current;
          const updated = elements.filter((el) => !currentIds.includes(el.id));
          notifyChanges(updated);
          setSelectedIds(updated.length > 0 ? [updated[0].id] : []);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [elements, notifyChanges]);

  // Reset to original preset layout (legend beside)
  const handlePresetLegendBeside = () => {
    const fresh = createDefaultBrasilExpressElements(
      label.street,
      label.bay,
      label.level,
      label.position,
      label.companyName,
      label.code
    );
    notifyChanges(fresh);
    setSelectedIds([fresh[1]?.id || 'elem-num-rua']);
  };

  // Switch to layout with legend placed directly BELOW the number
  const handlePresetLegendBelow = () => {
    const fresh = createLegendBelowBrasilExpressElements(
      label.street,
      label.bay,
      label.level,
      label.position,
      label.companyName,
      label.code
    );
    notifyChanges(fresh);
    setSelectedIds([fresh[1]?.id || 'elem-num-rua']);
  };

  // Handle image upload and threshold conversion
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOriginalUploadFile(file);
    try {
      const monoDataUrl = await convertImageToMonochrome(file, imageThreshold);
      setUploadedPreview(monoDataUrl);
    } catch (err) {
      console.error('Error converting image:', err);
    }
  };

  const handleThresholdChange = async (newVal: number) => {
    setImageThreshold(newVal);
    if (originalUploadFile) {
      try {
        const monoDataUrl = await convertImageToMonochrome(originalUploadFile, newVal);
        setUploadedPreview(monoDataUrl);
      } catch (err) {
        console.error('Error updating threshold:', err);
      }
    }
  };

  const handleAddUploadedImageToCanvas = () => {
    if (!uploadedPreview) return;
    const id = `elem-img-${Date.now()}`;
    const newEl: CanvasElement = {
      id,
      type: 'image',
      name: 'Foto / Logo P&B',
      x: 500,
      y: 750,
      width: 240,
      height: 180,
      rotation: 0,
      imageData: uploadedPreview,
    };
    const updated = [...elements, newEl];
    notifyChanges(updated);
    setSelectedIds([id]);
    setIsImageModalOpen(false);
    setUploadedPreview(null);
    setOriginalUploadFile(null);
  };

  const handleAddPresetImage = (preset: (typeof MONOCHROME_PRESETS)[0]) => {
    const id = `elem-img-${Date.now()}`;
    const newEl: CanvasElement = {
      id,
      type: 'image',
      name: preset.name,
      x: 500,
      y: 750,
      width: preset.defaultWidth,
      height: preset.defaultHeight,
      rotation: 0,
      imageData: preset.dataUrl,
    };
    const updated = [...elements, newEl];
    notifyChanges(updated);
    setSelectedIds([id]);
    setIsImageModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Main Toolbar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Add Elements Group */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
            Adicionar:
          </span>

          <button
            type="button"
            onClick={() => handleAddElement('text')}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Type className="w-3.5 h-3.5 text-amber-400" />
            <span>Texto / Número</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddElement('barcode')}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Barcode className="w-3.5 h-3.5 text-amber-400" />
            <span>Código de Barras</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddElement('line')}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Minus className="w-3.5 h-3.5 text-amber-400" />
            <span>Linha</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImageModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Foto / Logo P&B</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddElement('arrow')}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 text-amber-400" />
            <span>Seta</span>
          </button>
        </div>

        {/* Quick Layout Presets & Multi-Select Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Preset: LEGENDA EMBAIXO */}
          <button
            type="button"
            onClick={handlePresetLegendBelow}
            title="Aplica layout com legendas (Rua, Prédio, Andar, Apto) posicionadas diretamente abaixo do número"
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Legenda Embaixo do Número</span>
          </button>

          <button
            type="button"
            onClick={handlePresetLegendBeside}
            title="Restaura layout com legendas ao lado do número"
            className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs font-semibold"
          >
            Legenda ao Lado
          </button>

          <button
            type="button"
            onClick={handleSelectAll}
            title="Selecionar todos os elementos para mover ou redimensionar em conjunto"
            className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs font-semibold flex items-center gap-1"
          >
            <CheckSquare className="w-3.5 h-3.5 text-neutral-400" />
            <span>Selecionar Todos</span>
          </button>

          {selectedIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleDeselectAll}
                title="Desmarcar seleção"
                className="px-2 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 border border-neutral-800 text-xs font-semibold"
              >
                Desmarcar
              </button>

              <button
                type="button"
                onClick={handleDelete}
                title={`Excluir os ${selectedIds.length} elementos selecionados`}
                className="px-3 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Excluir Selecionados ({selectedIds.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Split Grid: Left Canvas + Right Property Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive WYSIWYG Canvas */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col items-center">
            {/* Canvas Sub-Header */}
            <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-neutral-800 text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-neutral-200 font-bold">
                  <Move className="w-4 h-4 text-amber-400" />
                  Arraste elementos para mover juntos ou use os puxadores para aumentar
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                  {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
                </span>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    title="Excluir selecionados"
                    className="px-2 py-0.5 rounded bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-800 flex items-center gap-1 text-[10px] font-bold transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                    <span>Excluir</span>
                  </button>
                )}
              </div>
              <span className="font-mono text-neutral-400">4 x 6 pol (1000 x 1500 px)</span>
            </div>

            {/* SVG Interactive Canvas */}
            <div className="relative bg-neutral-950 p-4 rounded-lg border border-neutral-800 overflow-hidden shadow-inner flex items-center justify-center select-none w-full max-w-[460px]">
              <svg
                ref={svgRef}
                viewBox="0 0 1000 1500"
                className="w-full h-auto bg-white rounded-xs shadow-2xl cursor-default"
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                {/* Canvas Background */}
                <rect x="0" y="0" width="1000" height="1500" fill="#ffffff" />

                {/* Marquee Selection Rectangle */}
                {isMarquee && marqueeBox && (
                  <rect
                    x={Math.min(marqueeBox.x1, marqueeBox.x2)}
                    y={Math.min(marqueeBox.y1, marqueeBox.y2)}
                    width={Math.abs(marqueeBox.x2 - marqueeBox.x1)}
                    height={Math.abs(marqueeBox.y2 - marqueeBox.y1)}
                    fill="rgba(245, 158, 11, 0.15)"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    className="pointer-events-none"
                  />
                )}

                {/* Render All Elements */}
                {elements.map((el) => {
                  const isSelected = selectedIds.includes(el.id);
                  const isPrimarySingle = selectedIds.length === 1 && primarySelected?.id === el.id;

                  // Dynamic arrow scale factor
                  const arrowScale = Math.max(0.3, (el.width || 140) / 110);

                  return (
                    <g
                      key={el.id}
                      onClick={(e) => handleSelectElement(el.id, e)}
                      onPointerDown={(e) => handleElementPointerDown(el, e)}
                      className="cursor-move group"
                      style={{ touchAction: 'none' }}
                    >
                      {/* Individual dashed outline when selected */}
                      {isSelected && (
                        <rect
                          x={el.x - el.width / 2 - 8}
                          y={el.y - el.height / 2 - 8}
                          width={el.width + 16}
                          height={el.height + 16}
                          fill="none"
                          stroke={isMultiSelection ? '#f59e0b' : '#f59e0b'}
                          strokeWidth="3"
                          strokeDasharray="6 4"
                          className="pointer-events-none opacity-80"
                        />
                      )}

                      {/* Single element resize handles (shown only when 1 element is selected) */}
                      {isPrimarySingle && (
                        <>
                          {/* Bottom-Right SE Handle */}
                          <circle
                            cx={el.x + el.width / 2 + 8}
                            cy={el.y + el.height / 2 + 8}
                            r={15}
                            fill="#f59e0b"
                            stroke="#ffffff"
                            strokeWidth="3.5"
                            className="cursor-nwse-resize hover:scale-125 transition-transform"
                            onPointerDown={(e) => handleSingleResizePointerDown(el, 'se', e)}
                          />
                          {/* Right E Handle (Width expander) */}
                          <rect
                            x={el.x + el.width / 2 + 3}
                            y={el.y - 14}
                            width={13}
                            height={28}
                            rx={4}
                            fill="#f59e0b"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            className="cursor-ew-resize hover:scale-125 transition-transform"
                            onPointerDown={(e) => handleSingleResizePointerDown(el, 'e', e)}
                          />
                          {/* Bottom S Handle (Height expander) */}
                          <rect
                            x={el.x - 14}
                            y={el.y + el.height / 2 + 3}
                            width={28}
                            height={13}
                            rx={4}
                            fill="#f59e0b"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            className="cursor-ns-resize hover:scale-125 transition-transform"
                            onPointerDown={(e) => handleSingleResizePointerDown(el, 's', e)}
                          />
                        </>
                      )}

                      {/* 1. TEXT ELEMENT */}
                      {el.type === 'text' && (
                        <g transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0})`}>
                          <text
                            x="0"
                            y="0"
                            textAnchor={el.textAlign === 'left' ? 'start' : el.textAlign === 'right' ? 'end' : 'middle'}
                            dominantBaseline="central"
                            fontSize={el.fontSize || 40}
                            fontWeight={el.fontWeight || '700'}
                            fontFamily={el.fontFamily || "'Barlow Condensed', 'Plus Jakarta Sans', sans-serif"}
                            letterSpacing={el.letterSpacing || 0}
                            fill="#000000"
                          >
                            {el.content}
                          </text>
                        </g>
                      )}

                      {/* 2. BARCODE ELEMENT (PURE VECTOR SVG + 100% QUIET ZONE FOR OPTICAL SCANNER READABILITY) */}
                      {el.type === 'barcode' && (
                        <g transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0})`}>
                          {/* Solid white quiet zone card for 100% optical readability */}
                          <rect
                            x={-el.width / 2}
                            y={-el.height / 2}
                            width={el.width}
                            height={el.height}
                            fill="#ffffff"
                          />
                          {barcodesData[el.id]?.innerHtml ? (
                            <svg
                              x={-el.width / 2}
                              y={-el.height / 2}
                              width={el.width}
                              height={el.height}
                              viewBox={`0 0 ${barcodesData[el.id]?.viewBoxWidth || 260} ${barcodesData[el.id]?.viewBoxHeight || 90}`}
                              preserveAspectRatio="none"
                              shapeRendering="crispEdges"
                              style={{ overflow: 'visible', width: el.width, height: el.height, shapeRendering: 'crispEdges' }}
                              dangerouslySetInnerHTML={{ __html: barcodesData[el.id]?.innerHtml || '' }}
                            />
                          ) : barcodesData[el.id]?.dataUrl ? (
                            <image
                              href={barcodesData[el.id]?.dataUrl}
                              x={-el.width / 2}
                              y={-el.height / 2}
                              width={el.width}
                              height={el.height}
                              preserveAspectRatio="none"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          ) : null}
                          {el.barcodeDisplayValue && (
                            <text
                              x="0"
                              y={el.height / 2 + 22}
                              textAnchor="middle"
                              fontSize={22}
                              fontWeight="700"
                              fontFamily="'JetBrains Mono', monospace"
                              fill="#000000"
                            >
                              {barcodesData[el.id]?.sanitizedValue || el.content || label.code || '20-001-1-01'}
                            </text>
                          )}
                        </g>
                      )}

                      {/* 3. LINE ELEMENT */}
                      {el.type === 'line' && (
                        <g transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0})`}>
                          <line
                            x1="0"
                            y1={-el.height / 2}
                            x2="0"
                            y2={el.height / 2}
                            stroke="#000000"
                            strokeWidth={el.strokeWidth || 4}
                            strokeDasharray={
                              el.lineStyle === 'dashed' ? '12 8' : el.lineStyle === 'dotted' ? '4 6' : undefined
                            }
                          />
                        </g>
                      )}

                      {/* 4. RECT ELEMENT */}
                      {el.type === 'rect' && (
                        <rect
                          x={el.x - el.width / 2}
                          y={el.y - el.height / 2}
                          width={el.width}
                          height={el.height}
                          fill="none"
                          stroke="#000000"
                          strokeWidth={el.strokeWidth || 4}
                        />
                      )}

                      {/* 5. ARROW ELEMENT (AUTÊNTICA SETA CURVADA COM CHEVRON DUPLO BRASIL EXPRESS) */}
                      {el.type === 'arrow' && (
                        <g transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0}) scale(${arrowScale})`}>
                          {el.arrowType === 'up' ? (
                            <path d="M 0 -45 L 45 25 L -45 25 Z" fill="#000000" />
                          ) : el.arrowType === 'down' ? (
                            <path d="M 0 45 L 45 -25 L -45 -25 Z" fill="#000000" />
                          ) : (
                            /* Seta curvada com duplo chevron original Brasil Express */
                            <g transform="translate(-64, -70)">
                              <path
                                d="M 66 36 L 46 54 L 72 70"
                                fill="none"
                                stroke="#000000"
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M 98 100 C 98 62 82 46 64 52 L 68 40 L 36 60 L 66 84 L 62 72 C 76 68 84 76 84 100 Z"
                                fill="none"
                                stroke="#000000"
                                strokeWidth="5"
                                strokeLinejoin="round"
                              />
                            </g>
                          )}
                        </g>
                      )}

                      {/* 6. IMAGE / LOGO ELEMENT */}
                      {el.type === 'image' && el.imageData && (
                        <g transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0})`}>
                          <image
                            href={el.imageData}
                            x={-el.width / 2}
                            y={-el.height / 2}
                            width={el.width}
                            height={el.height}
                            preserveAspectRatio="none"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* UNIFIED GROUP BOUNDING BOX & GROUP RESIZE HANDLES (WHEN MULTIPLE ELEMENTS ARE SELECTED) */}
                {groupBoundingBox && (
                  <g className="pointer-events-auto">
                    {/* Outer Box Enclosing All Selected Items */}
                    <rect
                      x={groupBoundingBox.x}
                      y={groupBoundingBox.y}
                      width={groupBoundingBox.width}
                      height={groupBoundingBox.height}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="4"
                      strokeDasharray="10 6"
                      className="pointer-events-none"
                    />

                    {/* Group Badge Tag */}
                    <g transform={`translate(${groupBoundingBox.x}, ${Math.max(10, groupBoundingBox.y - 28)})`}>
                      <rect
                        x="0"
                        y="0"
                        width={Math.min(groupBoundingBox.width, 240)}
                        height="26"
                        rx="6"
                        fill="#f59e0b"
                      />
                      <text
                        x="10"
                        y="18"
                        fontSize="14"
                        fontWeight="800"
                        fontFamily="sans-serif"
                        fill="#000000"
                      >
                        {`Grupo: ${selectedIds.length} itens juntos`}
                      </text>
                    </g>

                    {/* Group Corner Resize Handle SE: SCALES ENTIRE GROUP PROPORTIONALLY */}
                    <circle
                      cx={groupBoundingBox.x + groupBoundingBox.width}
                      cy={groupBoundingBox.y + groupBoundingBox.height}
                      r={18}
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="4"
                      className="cursor-nwse-resize hover:scale-125 transition-transform"
                      onPointerDown={(e) => handleGroupResizePointerDown('se', e)}
                    />

                    {/* Group Width Expander Handle (Right E) */}
                    <rect
                      x={groupBoundingBox.x + groupBoundingBox.width - 6}
                      y={groupBoundingBox.centerY - 16}
                      width={16}
                      height={32}
                      rx="4"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="3"
                      className="cursor-ew-resize hover:scale-125 transition-transform"
                      onPointerDown={(e) => handleGroupResizePointerDown('e', e)}
                    />

                    {/* Group Height Expander Handle (Bottom S) */}
                    <rect
                      x={groupBoundingBox.centerX - 16}
                      y={groupBoundingBox.y + groupBoundingBox.height - 6}
                      width={32}
                      height={16}
                      rx="4"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="3"
                      className="cursor-ns-resize hover:scale-125 transition-transform"
                      onPointerDown={(e) => handleGroupResizePointerDown('s', e)}
                    />
                  </g>
                )}
              </svg>
            </div>

            {/* Quick Movement Nudge Buttons */}
            <div className="w-full mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold text-neutral-300">
                {isMultiSelection ? 'Mover Itens Selecionados Juntos:' : 'Ajuste de Posição:'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleNudge(-25, 0)}
                  className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-200 font-semibold"
                  title="Mover para esquerda"
                >
                  ← 25px
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(25, 0)}
                  className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-200 font-semibold"
                  title="Mover para direita"
                >
                  → 25px
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(0, -25)}
                  className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-200 font-semibold"
                  title="Mover para cima"
                >
                  ↑ 25px
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(0, 25)}
                  className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-200 font-semibold"
                  title="Mover para baixo"
                >
                  ↓ 25px
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Properties Inspector & Element List */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSidebarTab('properties')}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                sidebarTab === 'properties'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {isMultiSelection ? `Grupo (${selectedIds.length})` : 'Propriedades'}
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('elements_list')}
              className={`flex-1 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1 ${
                sidebarTab === 'elements_list'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>Lista de Elementos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-200">
                {elements.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('presets')}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                sidebarTab === 'presets'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Modelos Prontos
            </button>
          </div>

          {/* TAB 1: PROPERTIES INSPECTOR */}
          {sidebarTab === 'properties' && (
            <div>
              {/* CASE A: MULTIPLE ELEMENTS SELECTED (DEDICATED GROUP CONTROLS) */}
              {isMultiSelection ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-amber-950/30 border border-amber-600/50 rounded-xl space-y-1">
                    <span className="font-bold text-amber-300 text-sm block">
                      {selectedIds.length} Itens Selecionados no Grupo
                    </span>
                    <p className="text-[11px] text-neutral-300">
                      Mova para os lados ou altere o tamanho mantendo a distância exata entre eles.
                      Os elementos não se juntam em um ponto só!
                    </p>
                  </div>

                  {/* 1. MOVER PARA OS LADOS / CIMA / BAIXO */}
                  <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                    <span className="font-bold text-neutral-200 block">
                      1. Mover Grupo para os Lados (Eixo X):
                    </span>

                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleNudge(-80, 0)}
                        className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                      >
                        ← 80px
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudge(-20, 0)}
                        className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                      >
                        ← 20px
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudge(20, 0)}
                        className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                      >
                        20px →
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudge(80, 0)}
                        className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                      >
                        80px →
                      </button>
                    </div>

                    <div className="pt-2 border-t border-neutral-800">
                      <span className="font-bold text-neutral-200 block mb-1.5">
                        Mover para Cima / Baixo (Eixo Y):
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleNudge(0, -80)}
                          className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                        >
                          ↑ 80px
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNudge(0, -20)}
                          className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                        >
                          ↑ 20px
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNudge(0, 20)}
                          className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                        >
                          20px ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNudge(0, 80)}
                          className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                        >
                          80px ↓
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. AUMENTAR / REDUZIR TAMANHO DO GRUPO (PROPORTIONAL SCALE) */}
                  <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">
                        2. Aumentar Todos os Itens do Grupo:
                      </span>
                      <span className="text-[10px] text-neutral-400">Escala Proporcional</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Aumenta números, textos, código de barras, setas e linhas ao mesmo tempo, mantendo a proporção de cada um.
                    </p>

                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleScaleGroup(1.3)}
                        className="py-2 px-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-lg text-center shadow-xs"
                      >
                        + 30%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScaleGroup(1.15)}
                        className="py-2 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold rounded-lg text-center"
                      >
                        + 15%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScaleGroup(0.85)}
                        className="py-2 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold rounded-lg text-center"
                      >
                        - 15%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScaleGroup(0.7)}
                        className="py-2 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold rounded-lg text-center"
                      >
                        - 30%
                      </button>
                    </div>
                  </div>

                  {/* 3. TAMANHO DA FONTE DOS NÚMEROS E TEXTOS DO GRUPO */}
                  <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                    <span className="font-bold text-neutral-200 block">
                      3. Ajustar Fonte dos Textos Selecionados:
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetGroupFontSize(220)}
                        className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                      >
                        Gigante (220)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetGroupFontSize(180)}
                        className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                      >
                        Padrão (180)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetGroupFontSize(140)}
                        className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                      >
                        Médio (140)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetGroupFontSize(90)}
                        className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold rounded-lg text-center"
                      >
                        Compacto (90)
                      </button>
                    </div>
                  </div>

                  {/* Group Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleDuplicate}
                      className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-lg border border-neutral-700 flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Duplicar Grupo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex-1 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 font-bold rounded-lg border border-red-800 flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir Grupo</span>
                    </button>
                  </div>
                </div>
              ) : primarySelected ? (
                /* CASE B: SINGLE ELEMENT SELECTED */
                <div className="space-y-4 text-xs">
                  {/* Header of selected element */}
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <div>
                      <span className="font-bold text-neutral-200 text-sm block">
                        {primarySelected.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 uppercase font-mono">
                        Tipo: {primarySelected.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleDuplicate}
                        title="Duplicar elemento"
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        title="Excluir elemento"
                        className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 1. Content for Text and Barcode */}
                  {(primarySelected.type === 'text' || primarySelected.type === 'barcode') && (
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                        Conteúdo / Texto Exibido
                      </label>
                      <input
                        type="text"
                        value={primarySelected.content || ''}
                        onChange={(e) => updateSingleProperty({ content: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-100 font-bold font-mono text-sm"
                      />
                    </div>
                  )}

                  {/* 2. SPECIALIZED TEXT/NUMBER SIZING CONTROLS */}
                  {primarySelected.type === 'text' && (
                    <div className="p-3.5 bg-amber-950/20 border border-amber-600/40 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Type className="w-4 h-4 text-amber-400" />
                          Tamanho do Texto / Número
                        </span>
                        <span className="text-[11px] text-amber-400 font-mono font-bold">
                          {primarySelected.fontSize || 40} px
                        </span>
                      </div>

                      {/* Font Size Slider */}
                      <div>
                        <input
                          type="range"
                          min={18}
                          max={280}
                          value={primarySelected.fontSize || 40}
                          onChange={(e) => updateSingleProperty({ fontSize: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {/* Quick Zoom Buttons for Text */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(1.3)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          + 30%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(1.15)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          + 15%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(0.85)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          - 15%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(0.7)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          - 30%
                        </button>
                      </div>

                      {/* Text Style and Alignment */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                            Peso / Negrito
                          </label>
                          <select
                            value={primarySelected.fontWeight || '700'}
                            onChange={(e) => updateSingleProperty({ fontWeight: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200"
                          >
                            <option value="400">Regular (400)</option>
                            <option value="600">Semibold (600)</option>
                            <option value="800">Extra Bold (800)</option>
                            <option value="900">Black Pesado (900)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                            Alinhamento
                          </label>
                          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                            <button
                              type="button"
                              onClick={() => updateSingleProperty({ textAlign: 'left' })}
                              className={`flex-1 p-1 rounded text-center ${
                                primarySelected.textAlign === 'left'
                                  ? 'bg-amber-500 text-neutral-950'
                                  : 'text-neutral-400'
                              }`}
                            >
                              <AlignLeft className="w-3.5 h-3.5 mx-auto" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSingleProperty({ textAlign: 'center' })}
                              className={`flex-1 p-1 rounded text-center ${
                                !primarySelected.textAlign || primarySelected.textAlign === 'center'
                                  ? 'bg-amber-500 text-neutral-950'
                                  : 'text-neutral-400'
                              }`}
                            >
                              <AlignCenter className="w-3.5 h-3.5 mx-auto" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSingleProperty({ textAlign: 'right' })}
                              className={`flex-1 p-1 rounded text-center ${
                                primarySelected.textAlign === 'right'
                                  ? 'bg-amber-500 text-neutral-950'
                                  : 'text-neutral-400'
                              }`}
                            >
                              <AlignRight className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. SPECIALIZED BARCODE SIZING CONTROLS & SCANNER VALIDATION */}
                  {primarySelected.type === 'barcode' && (
                    <div className="p-3.5 bg-amber-950/20 border border-amber-600/40 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Barcode className="w-4 h-4 text-amber-400" />
                          Código de Barras (Leitura Garantida)
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Quiet Zone OK
                        </span>
                      </div>

                      {/* Width & Height Sliders */}
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-[11px] text-neutral-300 mb-1">
                            <span>Comprimento / Largura (Barras):</span>
                            <span className="font-mono font-bold text-amber-400">{primarySelected.width} px</span>
                          </div>
                          <input
                            type="range"
                            min={120}
                            max={1200}
                            step={10}
                            value={primarySelected.width}
                            onChange={(e) => updateSingleProperty({ width: Number(e.target.value) })}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-neutral-300 mb-1">
                            <span>Altura das Barras:</span>
                            <span className="font-mono font-bold text-amber-400">{primarySelected.height} px</span>
                          </div>
                          <input
                            type="range"
                            min={40}
                            max={700}
                            step={5}
                            value={primarySelected.height}
                            onChange={(e) => updateSingleProperty({ height: Number(e.target.value) })}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Quick Zoom Buttons */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(1.3)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          + 30%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(1.15)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          + 15%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(0.85)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          - 15%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(0.7)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          - 30%
                        </button>
                      </div>

                      {/* Display text toggle */}
                      <div className="flex items-center justify-between pt-2 border-t border-amber-900/40">
                        <span className="text-[11px] text-neutral-300">Mostrar número legível abaixo das barras:</span>
                        <input
                          type="checkbox"
                          checked={primarySelected.barcodeDisplayValue ?? false}
                          onChange={(e) => updateSingleProperty({ barcodeDisplayValue: e.target.checked })}
                          className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                        />
                      </div>

                      {/* Orientação do Código (Girar 90°) */}
                      <div className="pt-2 border-t border-amber-900/40 space-y-1.5">
                        <span className="text-[11px] text-neutral-300 font-semibold block">
                          Orientação das Barras (Girar):
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateSingleProperty({ rotation: -90 })}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                              (primarySelected.rotation || 0) === -90 || (primarySelected.rotation || 0) === 270
                                ? 'bg-amber-500 text-neutral-950 border-amber-400'
                                : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                            }`}
                          >
                            Barras Horizontais (-90°)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSingleProperty({ rotation: 0 })}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                              (primarySelected.rotation || 0) === 0
                                ? 'bg-amber-500 text-neutral-950 border-amber-400'
                                : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                            }`}
                          >
                            Barras Verticais (0°)
                          </button>
                        </div>
                        <p className="text-[10px] text-neutral-400 leading-tight">
                          💡 Dica para bipar na tela: se as barras estiverem horizontais, aponte o feixe laser inclinado a 90° para cruzar as barras pretas.
                        </p>
                      </div>

                      {/* SIMULADOR / TESTE DE LEITURA COM BIPADOR */}
                      <div className="pt-2 border-t border-amber-900/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Testar Bipador Óptico:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              playScannerBeep();
                              setScannerLastScanned(primarySelected.content || label.code || '20-001-1-01');
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-bold hover:bg-emerald-900 flex items-center gap-1"
                          >
                            <span>Ouvir Bip Sonoro</span>
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Clique aqui e bipe com seu leitor..."
                            value={scannerTestInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setScannerTestInput(val);
                              if (val.trim()) {
                                playScannerBeep();
                                setScannerLastScanned(val.trim());
                                setTimeout(() => setScannerTestInput(''), 400);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && scannerTestInput.trim()) {
                                playScannerBeep();
                                setScannerLastScanned(scannerTestInput.trim());
                                setScannerTestInput('');
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500"
                          />
                        </div>

                        {scannerLastScanned && (
                          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800 text-[11px] text-emerald-300 flex items-center justify-between">
                            <span className="font-mono font-bold">✔ Bipado: {scannerLastScanned}</span>
                            <span className="text-[9px] bg-emerald-900 px-1.5 py-0.5 rounded text-emerald-200">100% Legível</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. ARROW SIZING */}
                  {primarySelected.type === 'arrow' && (
                    <div className="p-3.5 bg-amber-950/20 border border-amber-600/40 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Navigation className="w-4 h-4 text-amber-400" />
                          Tamanho da Seta
                        </span>
                        <span className="font-mono text-amber-400 font-bold">{primarySelected.width} px</span>
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={400}
                        step={5}
                        value={primarySelected.width}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateSingleProperty({ width: val, height: val });
                        }}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(1.3)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          + 30%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(1.15)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          + 15%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(0.85)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          - 15%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScaleSingleElement(0.7)}
                          className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-700 text-[10px] font-bold"
                        >
                          - 30%
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 5. LINE SIZING */}
                  {primarySelected.type === 'line' && (
                    <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-neutral-300 mb-1">
                          <span>Comprimento da Linha:</span>
                          <span className="font-mono font-bold text-amber-400">{primarySelected.height} px</span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={1200}
                          value={primarySelected.height}
                          onChange={(e) => updateSingleProperty({ height: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                            Espessura ({primarySelected.strokeWidth} px)
                          </label>
                          <input
                            type="range"
                            min={1}
                            max={24}
                            value={primarySelected.strokeWidth || 4}
                            onChange={(e) => updateSingleProperty({ strokeWidth: Number(e.target.value) })}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                            Estilo
                          </label>
                          <select
                            value={primarySelected.lineStyle || 'solid'}
                            onChange={(e) => updateSingleProperty({ lineStyle: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200"
                          >
                            <option value="solid">Sólida</option>
                            <option value="dashed">Tracejada</option>
                            <option value="dotted">Pontilhada</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6. IMAGE SIZING */}
                  {primarySelected.type === 'image' && (
                    <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-200 text-xs">Tamanho da Imagem / Logo</span>
                        <span className="font-mono text-amber-400">
                          {primarySelected.width} x {primarySelected.height} px
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Largura</label>
                          <input
                            type="range"
                            min={40}
                            max={800}
                            value={primarySelected.width}
                            onChange={(e) => updateSingleProperty({ width: Number(e.target.value) })}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Altura</label>
                          <input
                            type="range"
                            min={40}
                            max={800}
                            value={primarySelected.height}
                            onChange={(e) => updateSingleProperty({ height: Number(e.target.value) })}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 7. Position X and Y Sliders */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                        <span>Posição X</span>
                        <span className="font-mono">{primarySelected.x} px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1000}
                        value={primarySelected.x}
                        onChange={(e) => updateSingleProperty({ x: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                        <span>Posição Y</span>
                        <span className="font-mono">{primarySelected.y} px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1500}
                        value={primarySelected.y}
                        onChange={(e) => updateSingleProperty({ y: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 8. Rotation */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Rotação
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 90, 180, -90].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => updateSingleProperty({ rotation: deg })}
                          className={`py-1.5 px-2 rounded-lg border text-center font-bold transition-colors ${
                            primarySelected.rotation === deg
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          {deg === -90 ? '270° (-90°)' : `${deg}°`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-400 space-y-2">
                  <MousePointer className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p className="font-bold text-neutral-300">Nenhum elemento selecionado</p>
                  <p className="text-xs">
                    Clique em qualquer item na etiqueta para arrastá-lo, redimensioná-lo ou alterar seu conteúdo.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ELEMENTS CHECKLIST & MULTI-SELECT MANAGER */}
          {sidebarTab === 'elements_list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-xs font-bold text-neutral-300">
                  Marque para mover múltiplos itens juntos:
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-amber-400 hover:underline text-[11px]"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-neutral-600">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-neutral-400 hover:underline text-[11px]"
                  >
                    Desmarcar
                  </button>
                  {selectedIds.length > 0 && (
                    <>
                      <span className="text-neutral-600">|</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="text-red-400 hover:text-red-300 hover:underline text-[11px] font-bold flex items-center gap-1"
                        title="Excluir todos os elementos marcados"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                        <span>Excluir ({selectedIds.length})</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {elements.map((el) => {
                  const isChecked = selectedIds.includes(el.id);
                  return (
                    <div
                      key={el.id}
                      onClick={() => {
                        setSelectedIds((prev) =>
                          prev.includes(el.id) ? prev.filter((id) => id !== el.id) : [...prev, el.id]
                        );
                      }}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-amber-950/30 border-amber-500/60 text-amber-200'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked
                              ? 'bg-amber-500 border-amber-400 text-neutral-950'
                              : 'border-neutral-600 bg-neutral-900'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="font-bold text-xs block">{el.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {el.type === 'text'
                              ? `Texto: "${el.content}" (${el.fontSize}px)`
                              : el.type === 'barcode'
                              ? `Código: ${el.content || label.code}`
                              : `Pos: (${el.x}, ${el.y})`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 uppercase font-mono">
                          {el.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: READY-TO-USE PRESETS */}
          {sidebarTab === 'presets' && (
            <div className="space-y-4 text-xs">
              <div>
                <span className="font-bold text-neutral-200 text-sm block mb-1">
                  Modelos Prontos de Layout
                </span>
                <p className="text-neutral-400 text-[11px]">
                  Troque a disposição dos números e legendas com um único clique.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handlePresetLegendBelow}
                  className="w-full p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-left transition-colors flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-300 text-sm block">
                      Legendas Embaixo do Número
                    </span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      "Rua", "Prédio", "Andar" e "Apto" ficam logo abaixo de cada número grande, facilitando a identificação rápida.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handlePresetLegendBeside}
                  className="w-full p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left transition-colors flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-neutral-200 text-sm block">
                      Legendas ao Lado (Modelo Original)
                    </span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Subtítulos alinhados na coluna lateral esquerda ao lado de cada número.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Black & White Photo / Logo Inserter */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-neutral-100 text-base">
                  Inserir Foto ou Logo Preto e Branco
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200 text-sm font-bold"
              >
                ✕ Fechar
              </button>
            </div>

            {/* Presets List */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-2 uppercase tracking-wider">
                1. Escolher Logo / Ícone de Armazém Pronto:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MONOCHROME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleAddPresetImage(preset)}
                    className="p-2.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500 text-left flex items-center gap-2.5 transition-colors"
                  >
                    <div className="w-10 h-10 bg-white rounded p-1 flex items-center justify-center shrink-0">
                      <img src={preset.dataUrl} alt={preset.name} className="max-w-full max-h-full" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-neutral-200 block">{preset.name}</span>
                      <span className="text-[10px] text-neutral-400">Inserir na etiqueta</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Custom Image */}
            <div className="pt-2 border-t border-neutral-800 space-y-3">
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">
                2. Ou Enviar do Computador (Converte para P&B térmico):
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-neutral-950 hover:bg-neutral-800 border-2 border-dashed border-neutral-700 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-neutral-200 hover:border-amber-400 transition-colors"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Clique para selecionar imagem (PNG, JPG, SVG)</span>
              </button>

              {uploadedPreview && (
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-300">Prévia Preto e Branco:</span>
                    <span className="font-mono text-amber-400">Limiar: {imageThreshold}</span>
                  </div>

                  <div className="w-full h-32 bg-white rounded-lg flex items-center justify-center p-2 overflow-hidden">
                    <img
                      src={uploadedPreview}
                      alt="Prévia P&B"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Ajuste de Limiar Preto e Branco:</span>
                      <span className="font-mono">{imageThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={235}
                      value={imageThreshold}
                      onChange={(e) => handleThresholdChange(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddUploadedImageToCanvas}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Inserir Esta Foto na Etiqueta</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
