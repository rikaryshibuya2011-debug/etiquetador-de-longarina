import React, { useEffect, useState } from 'react';
import { LongarinaLabel, LabelSizeConfig } from '../types/label';
import { generateBarcodeSvg, getBarcodeRenderData } from '../services/barcodeHelper';
import { ArrowUp, ArrowDown, Square, ChevronRight, ShieldAlert } from 'lucide-react';

interface ThermalLabelCardProps {
  label: LongarinaLabel;
  config: LabelSizeConfig;
  isPrintMode?: boolean;
  scale?: number;
}

export const ThermalLabelCard: React.FC<ThermalLabelCardProps> = ({
  label,
  config,
  isPrintMode = false,
  scale = 1,
}) => {
  const [barcodeSvg, setBarcodeSvg] = useState<string>('');

  // Extract address coordinates
  const street = label.street || '20';
  const bay = label.bay || '001';
  const level = label.level || '1';
  const position = label.position || '01';
  const code = label.code || `${street}-${bay}-${level}-${position}`;
  const companyName = label.companyName || 'BRASIL EXPRESS';

  useEffect(() => {
    // Generate barcode SVG with horizontal bars (rotated for Brasil Express style)
    const isBrasilExpress = label.formatType === 'brasil_express_4x6';
    const svg = generateBarcodeSvg(code, {
      height: isBrasilExpress ? 54 : label.formatType === 'multi_level' ? 24 : 36,
      width: isBrasilExpress ? 2.4 : 1.7,
      displayValue: false,
    });
    setBarcodeSvg(svg);
  }, [code, label.formatType]);

  // Physical mm dimensions style
  const printStyle: React.CSSProperties = isPrintMode
    ? {
        width: `${config.widthMm}mm`,
        height: `${config.heightMm}mm`,
        pageBreakAfter: 'always',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: '#ffffff',
        color: '#000000',
      }
    : {
        width: `${Math.round(config.widthMm * 3.6 * scale)}px`,
        height: `${Math.round(config.heightMm * 3.6 * scale)}px`,
      };

  // ==========================================
  // SE HOUVER ELEMENTOS DINÂMICOS CUSTOMIZADOS (DRAG & DROP)
  // ==========================================
  if (label.elements && label.elements.length > 0) {
    return (
      <div
        style={printStyle}
        className={`relative bg-white text-black font-sans select-none overflow-hidden ${
          !isPrintMode ? 'rounded-xs shadow-xl transition-all' : ''
        }`}
      >
        <svg
          viewBox="0 0 1000 1500"
          className="w-full h-full block"
          style={{ width: '100%', height: '100%' }}
        >
          <rect x="0" y="0" width="1000" height="1500" fill="#ffffff" />
          {label.elements.map((el) => {
            if (el.type === 'rect') {
              return (
                <rect
                  key={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  fill="none"
                  stroke="#000000"
                  strokeWidth={el.strokeWidth || 4}
                />
              );
            }
            if (el.type === 'text') {
              return (
                <g key={el.id} transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0})`}>
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={el.fontSize || 40}
                    fontWeight={el.fontWeight || '700'}
                    fontFamily="'Barlow Condensed', 'Plus Jakarta Sans', sans-serif"
                    letterSpacing={el.letterSpacing || 0}
                    fill="#000000"
                  >
                    {el.content}
                  </text>
                </g>
              );
            }
            if (el.type === 'barcode') {
              const bData = getBarcodeRenderData(el.content || code);
              return (
                <g key={el.id} transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0})`}>
                  {/* Solid white quiet zone backdrop for 100% optical readability */}
                  <rect
                    x={-el.width / 2}
                    y={-el.height / 2}
                    width={el.width}
                    height={el.height}
                    fill="#ffffff"
                  />
                  {bData.innerHtml ? (
                    <svg
                      x={-el.width / 2}
                      y={-el.height / 2}
                      width={el.width}
                      height={el.height}
                      viewBox={`0 0 ${bData.viewBoxWidth} ${bData.viewBoxHeight}`}
                      preserveAspectRatio="none"
                      shapeRendering="crispEdges"
                      style={{ overflow: 'visible', width: el.width, height: el.height, shapeRendering: 'crispEdges' }}
                      dangerouslySetInnerHTML={{ __html: bData.innerHtml }}
                    />
                  ) : bData.dataUrl ? (
                    <image
                      href={bData.dataUrl}
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
                      {bData.sanitizedValue || el.content || code}
                    </text>
                  )}
                </g>
              );
            }
            if (el.type === 'line') {
              return (
                <g key={el.id} transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0})`}>
                  <line
                    x1={0}
                    y1={-el.height / 2}
                    x2={0}
                    y2={el.height / 2}
                    stroke="#000000"
                    strokeWidth={el.strokeWidth || 4}
                    strokeDasharray={el.lineStyle === 'dashed' ? '14 8' : el.lineStyle === 'dotted' ? '4 6' : undefined}
                  />
                </g>
              );
            }
            if (el.type === 'arrow') {
              const arrowScale = Math.max(0.4, (el.width || 140) / 110);
              return (
                <g
                  key={el.id}
                  transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0}) scale(${arrowScale})`}
                >
                  {el.arrowType === 'curved_down_left' ? (
                    <g transform="translate(-60, -60)">
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
                  ) : el.arrowType === 'up' ? (
                    <path d="M 0 -35 L 35 20 L -35 20 Z" fill="#000000" />
                  ) : (
                    <path d="M 0 35 L 35 -20 L -35 -20 Z" fill="#000000" />
                  )}
                </g>
              );
            }
            if (el.type === 'image' && el.imageData) {
              return (
                <g key={el.id} transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0})`}>
                  <image
                    href={el.imageData}
                    x={-el.width / 2}
                    y={-el.height / 2}
                    width={el.width}
                    height={el.height}
                    preserveAspectRatio="none"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </g>
              );
            }
            return null;
          })}
        </svg>
      </div>
    );
  }

  // ==========================================
  // FORMATO 1: MODELO BRASIL EXPRESS (4x6 VERTICAL) - EXATO DA FOTO
  // ==========================================
  if (label.formatType === 'brasil_express_4x6') {
    return (
      <div
        style={printStyle}
        className={`relative bg-white text-black font-sans select-none overflow-hidden ${
          !isPrintMode ? 'rounded-xs shadow-xl transition-all' : ''
        }`}
      >
        {/* SVG Container para fidelidade milimétrica exata da imagem do usuário */}
        <svg
          viewBox="0 0 1016 1524"
          className="w-full h-full block"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Fundo Branco */}
          <rect x="0" y="0" width="1016" height="1524" fill="#ffffff" />

          {/* Borda Externa Fina (conforme imagem) */}
          <rect
            x="20"
            y="20"
            width="976"
            height="1484"
            fill="none"
            stroke="#000000"
            strokeWidth="6"
          />

          {/* ========================================================= */}
          {/* COLUNA ESQUERDA: CÓDIGO VERTICAL 20-001-1-01 + SUBTÍTULOS  */}
          {/* ========================================================= */}
          {/* 
            Na imagem original:
            - Rua 20 no topo
            - Prédio 001
            - Andar 1
            - Apto 01 na base
            Texto gigante com rotação -90 graus, lido de cima para baixo.
          */}
          <g transform="translate(40, 0)">
            {/* Bloco 1: RUA 20 */}
            <g transform="translate(180, 240) rotate(-90)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="185"
                fontWeight="900"
                fontFamily="'Barlow Condensed', 'Plus Jakarta Sans', sans-serif"
                letterSpacing="-4"
                fill="#000000"
              >
                {street}
              </text>
            </g>
            <g transform="translate(98, 235) rotate(-90)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="38"
                fontWeight="600"
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fill="#000000"
              >
                Rua
              </text>
            </g>

            {/* Separador hífen 1 */}
            <g transform="translate(180, 420) rotate(-90)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="185"
                fontWeight="900"
                fontFamily="'Barlow Condensed', sans-serif"
                fill="#000000"
              >
                -
              </text>
            </g>

            {/* Bloco 2: PRÉDIO 001 */}
            <g transform="translate(180, 680) rotate(-90)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="185"
                fontWeight="900"
                fontFamily="'Barlow Condensed', 'Plus Jakarta Sans', sans-serif"
                letterSpacing="-4"
                fill="#000000"
              >
                {bay}
              </text>
            </g>
            <g transform="translate(98, 680) rotate(-90)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="38"
                fontWeight="600"
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fill="#000000"
              >
                Prédio
              </text>
            </g>

            {/* Separador hífen 2 */}
            <g transform="translate(180, 930) rotate(-90)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="185"
                fontWeight="900"
                fontFamily="'Barlow Condensed', sans-serif"
                fill="#000000"
              >
                -
              </text>
            </g>

            {/* Bloco 3: ANDAR 1 */}
            <g transform="translate(180, 1070) rotate(-90)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="185"
                fontWeight="900"
                fontFamily="'Barlow Condensed', 'Plus Jakarta Sans', sans-serif"
                letterSpacing="-4"
                fill="#000000"
              >
                {level}
              </text>
            </g>
            <g transform="translate(98, 1070) rotate(-90)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="38"
                fontWeight="600"
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fill="#000000"
              >
                Andar
              </text>
            </g>

            {/* Separador hífen 3 */}
            <g transform="translate(180, 1195) rotate(-90)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="185"
                fontWeight="900"
                fontFamily="'Barlow Condensed', sans-serif"
                fill="#000000"
              >
                -
              </text>
            </g>

            {/* Bloco 4: APTO 01 */}
            <g transform="translate(180, 1370) rotate(-90)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="185"
                fontWeight="900"
                fontFamily="'Barlow Condensed', 'Plus Jakarta Sans', sans-serif"
                letterSpacing="-4"
                fill="#000000"
              >
                {position}
              </text>
            </g>
            <g transform="translate(98, 1370) rotate(-90)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="38"
                fontWeight="600"
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fill="#000000"
              >
                Apto
              </text>
            </g>
          </g>

          {/* ========================================================= */}
          {/* ÁREA CENTRAL: CÓDIGO DE BARRAS COM BARRAS HORIZONTAIS     */}
          {/* ========================================================= */}
          {/* O código de barras é rotacionado para ter barras horizontais na etiqueta 4x6 */}
          <g transform="translate(615, 762) rotate(-90)">
            {/* Renderização do código de barras SVG gerado */}
            <foreignObject x="-230" y="-140" width="460" height="280">
              <div
                className="w-full h-full flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: barcodeSvg }}
              />
            </foreignObject>
          </g>

          {/* ========================================================= */}
          {/* LINHA VERTICAL + BRASIL EXPRESS                           */}
          {/* ========================================================= */}
          {/* Linha vertical divisória */}
          <line
            x1="840"
            y1="380"
            x2="840"
            y2="1140"
            stroke="#000000"
            strokeWidth="3.5"
          />

          {/* Texto da Empresa: BRASIL EXPRESS rotacionado 90 graus */}
          <g transform="translate(880, 760) rotate(-90)">
            <text
              x="0"
              y="0"
              textAnchor="middle"
              fontSize="44"
              fontWeight="800"
              fontFamily="'Plus Jakarta Sans', sans-serif"
              letterSpacing="2"
              fill="#000000"
            >
              {companyName}
            </text>
          </g>

          {/* ========================================================= */}
          {/* CANTO INFERIOR DIREITO: SETA CURVADA COM CHEVRON DUPLO   */}
          {/* ========================================================= */}
          {label.arrow !== 'none' && (
            <g transform="translate(710, 1220) scale(1.4)">
              {/* Chevron superior / acento da seta */}
              <path
                d="M 66 36 L 46 54 L 72 70"
                fill="none"
                stroke="#000000"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Corpo da seta curvada vazada apontando para baixo/esquerda */}
              <path
                d="M 98 100 C 98 62 82 46 64 52 L 68 40 L 36 60 L 66 84 L 62 72 C 76 68 84 76 84 100 Z"
                fill="none"
                stroke="#000000"
                strokeWidth="5"
                strokeLinejoin="round"
              />
            </g>
          )}
        </svg>
      </div>
    );
  }

  // ==========================================
  // FORMATO 2: MULTINÍVEL TÉRREO
  // ==========================================
  if (label.formatType === 'multi_level') {
    return (
      <div
        style={printStyle}
        className={`relative border-2 border-black bg-white text-black font-mono-tabular select-none flex flex-col justify-between ${
          !isPrintMode ? 'rounded-xs shadow-md transition-all' : ''
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-black px-2 py-0.5 bg-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold font-condensed tracking-wider">
            <span>RUA {street}</span>
            <span>·</span>
            <span>PRÉDIO {bay}</span>
            <span>·</span>
            <span className="uppercase">{label.zone || 'PULMÃO'}</span>
          </div>
          <div className="text-[11px] font-bold">
            CARGA MÁX: {label.loadCapacityKg.toLocaleString('pt-BR')} KG
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-around py-1 px-2 divide-y divide-black/30">
          {(label.multiLevels || []).map((lvl, idx) => {
            const rowSvg = generateBarcodeSvg(lvl.code, { height: 20, width: 1.4, displayValue: false });
            return (
              <div key={idx} className="flex items-center justify-between py-1 gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div
                    className="w-3.5 h-3.5 rounded-xs border border-black/40 flex items-center justify-center text-[9px] font-black text-white"
                    style={{ backgroundColor: lvl.colorHex }}
                  >
                    {lvl.levelNumber}
                  </div>
                  <span className="font-condensed font-black text-sm tracking-tight">
                    NÍVEL {lvl.levelNumber}
                  </span>
                </div>
                <div className="font-mono-tabular font-bold text-xs tracking-wider">
                  {lvl.code}
                </div>
                <div
                  className="shrink-0 flex items-center"
                  dangerouslySetInnerHTML={{ __html: rowSvg }}
                />
              </div>
            );
          })}
        </div>

        <div className="border-t border-black bg-neutral-100 px-2 py-0.5 flex justify-between text-[9px] font-bold text-neutral-800">
          <span>PORTA-PALETES WMS</span>
          <span>LONGARINA MULTINÍVEL TÉRREA</span>
        </div>
      </div>
    );
  }

  // ==========================================
  // FORMATO 3: PADRÃO HORIZONTAL
  // ==========================================
  return (
    <div
      style={printStyle}
      className={`relative border-2 border-black bg-white text-black font-mono-tabular select-none flex flex-col justify-between ${
        !isPrintMode ? 'rounded-xs shadow-md transition-all' : ''
      }`}
    >
      <div className="flex items-center justify-between border-b-2 border-black px-2.5 py-1 bg-neutral-50">
        <div className="flex items-center gap-2">
          <span className="font-condensed font-bold text-sm tracking-wide">
            RUA <strong className="text-base">{street}</strong>
          </span>
          <span className="text-black/40">/</span>
          <span className="font-condensed font-bold text-sm tracking-wide">
            PRÉDIO <strong className="text-base">{bay}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="font-mono-tabular bg-black text-white px-1.5 py-0.5 rounded-xs font-bold text-[11px]">
            {companyName}
          </span>
        </div>
      </div>

      <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 flex-1">
        <div className="flex-1">
          <div className="text-[9px] uppercase tracking-wider text-neutral-600 font-bold">
            Endereço Logístico
          </div>
          <div className="font-mono-tabular font-extrabold text-2xl lg:text-3xl tracking-tight leading-none text-black">
            {code}
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-2 border-black px-2 py-1 rounded-xs bg-neutral-50 shrink-0">
          <div className="text-center">
            <div className="text-[8px] font-bold uppercase leading-none">ANDAR</div>
            <div className="text-xl font-black font-mono-tabular leading-none">{level}</div>
          </div>
        </div>
      </div>

      <div className="px-2.5 py-1 flex items-center justify-center border-t border-black/40">
        {barcodeSvg && (
          <div className="w-full flex justify-center" dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
        )}
      </div>

      <div className="border-t-2 border-black bg-neutral-100 px-2.5 py-0.5 flex items-center justify-between text-[10px] font-bold">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 text-black shrink-0" />
          <span>CAPACIDADE: {label.loadCapacityKg.toLocaleString('pt-BR')} KG / PAR</span>
        </div>
        <div className="text-[9px] font-semibold text-neutral-600">
          {label.customNotes || 'PORTA-PALETES'}
        </div>
      </div>
    </div>
  );
};
