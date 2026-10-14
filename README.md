# LongarinaPrint — Módulo de Etiquetas da Torre de Controle Brex

Aplicação React/Vite para criar, editar e imprimir etiquetas térmicas (4x6) de longarina e porta-paletes, com leitor de código de barras (Web Serial / câmera) e geração em lote.

## Requisitos

- Node.js 20+
- Impressora térmica com suporte a ZPL (conexão via Web Serial)
- Navegador com Web Serial (Chrome/Edge) — exige contexto seguro (HTTPS ou localhost)

## Comandos

```bash
npm install        # dependências
npm run dev        # desenvolvimento em http://localhost:3000
npm run lint       # checagem de tipos (tsc --noEmit)
npm run build      # build de produção em dist/
npm run preview    # serve o dist/ localmente
```

## Funcionalidades

- **Etiqueta única**: edição visual por arrastar-e-soltar no canvas ou por coordenadas.
- **Gerador em lote**: sequências rua × prédio × andar × apto, com 3 ordens de impressão, importação CSV e **código de barra com ou sem separador** (`20001101` ou `20-001-1-01`).
- **Catálogo**: modelos salvos, histórico de impressão e reimpressão.
- **Impressão**: geração de ZPL e envio direto via Web Serial, com prévia térmica em tempo real.

## Deploy como módulo da Torre de Controle Brex

O build usa `base: './'` (`vite.config.ts`), então o conteúdo de `dist/` pode ser publicado em **qualquer subpasta** sem recompilar:



Os caminhos de assets são relativos (`./assets/...`), então a mesma pasta funciona em qualquer host/subpasta.

## Dados

Tudo é persistido no `localStorage` do navegador (etiquetas, catálogo, histórico e configurações de impressão) — sem backend.
