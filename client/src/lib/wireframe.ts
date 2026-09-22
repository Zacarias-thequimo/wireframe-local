/**
 * Lógica pura do editor de wireframes (sem React/DOM).
 * Coberta por testes em `wireframe.test.ts`.
 */

export type BlockType =
  | "heading"
  | "text"
  | "button"
  | "input"
  | "image"
  | "card"
  | "navbar"
  | "divider";

export type Device = "desktop" | "tablet" | "mobile";

export type BlockStyle = {
  fill: string;
  border: string;
  text: string;
  radius: number;
};

export type Block = {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  style: BlockStyle;
};

export type WireframePage = {
  id: string;
  name: string;
  blocks: Block[];
};

export type ProjectFile = {
  version: 1;
  name: string;
  device: Device;
  blocks: Block[];
  pages?: WireframePage[];
  activePageId?: string;
};

export const ARTBOARDS: Record<Device, { width: number; height: number; zoom: number }> = {
  desktop: { width: 1100, height: 700, zoom: 75 },
  tablet: { width: 768, height: 1024, zoom: 56 },
  mobile: { width: 390, height: 844, zoom: 56 },
};

export const BLOCK_TYPES: BlockType[] = [
  "heading",
  "text",
  "button",
  "input",
  "image",
  "card",
  "navbar",
  "divider",
];

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  heading: "Título",
  text: "Texto",
  button: "Botão",
  input: "Campo",
  image: "Imagem",
  card: "Card",
  navbar: "Navegação",
  divider: "Divisor",
};

export const DEVICES: Device[] = ["desktop", "tablet", "mobile"];

export const SNAP_SIZE = 8;
export const STORAGE_KEY = "wireframe-local-project";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function snap(value: number) {
  return Math.round(value / SNAP_SIZE) * SNAP_SIZE;
}

export function parseNum(value: string, fallback: number) {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeHex(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function makeId(prefix = "block") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function defaultStyle(type: BlockType): BlockStyle {
  const styles: Record<BlockType, BlockStyle> = {
    heading: { fill: "#ffffff", border: "#d7d9e0", text: "#171922", radius: 12 },
    text: { fill: "#ffffff", border: "#d7d9e0", text: "#686d7c", radius: 10 },
    button: { fill: "#7162d9", border: "#7162d9", text: "#ffffff", radius: 10 },
    input: { fill: "#ffffff", border: "#b9bdc9", text: "#8a8e9d", radius: 8 },
    image: { fill: "#f1efff", border: "#bdb5f1", text: "#8a7fe1", radius: 16 },
    card: { fill: "#fbfbfd", border: "#e4e5ea", text: "#686d7c", radius: 12 },
    navbar: { fill: "#ffffff", border: "#d7d9e0", text: "#242631", radius: 12 },
    divider: { fill: "#d7d9e0", border: "#d7d9e0", text: "#d7d9e0", radius: 0 },
  };
  return { ...styles[type] };
}

export function defaultLabel(type: BlockType) {
  const labels: Record<BlockType, string> = {
    heading: "Novo título",
    text: "Escreva uma breve descrição para orientar este bloco.",
    button: "Ação principal",
    input: "Digite aqui...",
    image: "Imagem / mockup",
    card: "Título do card\nDescrição complementar",
    navbar: "MARCA  /  Item  Item  Item",
    divider: "",
  };
  return labels[type];
}

export function createBlock(type: BlockType, index: number, maxW = 1100, maxH = 700): Block {
  const sizes: Record<BlockType, [number, number]> = {
    heading: [360, 92],
    text: [330, 84],
    button: [150, 48],
    input: [300, 48],
    image: [280, 200],
    card: [310, 160],
    navbar: [620, 60],
    divider: [440, 3],
  };
  const [rawW, h] = sizes[type];
  const w = Math.min(rawW, maxW - 64);
  return {
    id: makeId(),
    type,
    x: clamp(90 + (index % 3) * 28, 16, Math.max(16, maxW - w - 16)),
    y: Math.min(maxH - h - 32, 130 + (index % 4) * 26),
    w,
    h,
    label: defaultLabel(type),
    style: defaultStyle(type),
  };
}

export function blockTypeLabel(type: BlockType) {
  return BLOCK_TYPE_LABELS[type] ?? "Bloco";
}

export function formatSize(value: number) {
  return `${Math.round(value)} px`;
}

export function escapeXml(value: string) {
  return value.replace(
    /[<>&'"]/g,
    (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] ?? char,
  );
}

export function downloadFilename(title: string, ext: string) {
  const slug = title.toLowerCase().replace(/\s+/g, "-") || "wireframe";
  return `${slug}.${ext}`;
}

// ---------------------------------------------------------------------------
// Importação / normalização
// ---------------------------------------------------------------------------

export function normalizeBlock(raw: unknown, index: number): Block | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<Block> & { style?: Partial<BlockStyle> };
  if (!candidate.type || !BLOCK_TYPES.includes(candidate.type as BlockType)) return null;
  const type = candidate.type as BlockType;
  const fallback = defaultStyle(type);
  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : makeId(),
    type,
    x: Number.isFinite(Number(candidate.x)) ? Number(candidate.x) : 48,
    y: Number.isFinite(Number(candidate.y)) ? Number(candidate.y) : 48 + index * 32,
    w: Number.isFinite(Number(candidate.w)) ? Number(candidate.w) : 200,
    h: Number.isFinite(Number(candidate.h)) ? Number(candidate.h) : 80,
    label: typeof candidate.label === "string" ? candidate.label : defaultLabel(type),
    style: {
      fill: typeof candidate.style?.fill === "string" ? candidate.style.fill : fallback.fill,
      border: typeof candidate.style?.border === "string" ? candidate.style.border : fallback.border,
      text: typeof candidate.style?.text === "string" ? candidate.style.text : fallback.text,
      radius: Number.isFinite(Number(candidate.style?.radius)) ? Number(candidate.style?.radius) : fallback.radius,
    },
  };
}

export type NormalizedProject = {
  name: string;
  device: Device;
  pages: WireframePage[];
  activePageId: string;
  blocks: Block[];
};

export function normalizeProject(data: unknown): NormalizedProject {
  const project = data as Partial<ProjectFile>;
  if (!project || project.version !== 1 || !Array.isArray(project.blocks)) {
    throw new Error("invalid-project");
  }
  const topBlocks = (project.blocks as unknown[])
    .map((raw, index) => normalizeBlock(raw, index))
    .filter((block): block is Block => block !== null);

  let importedPages: WireframePage[];
  if (Array.isArray(project.pages) && project.pages.length > 0) {
    importedPages = project.pages
      .filter((page) => page && typeof page === "object" && typeof (page as WireframePage).name === "string")
      .map((page, pageIndex) => ({
        id: typeof page.id === "string" && page.id ? page.id : makeId("page-imported"),
        name: page.name || `Página ${pageIndex + 1}`,
        blocks: Array.isArray(page.blocks)
          ? (page.blocks as unknown[])
              .map((raw, index) => normalizeBlock(raw, index))
              .filter((block): block is Block => block !== null)
          : [],
      }));
    if (!importedPages.length) throw new Error("invalid-project");
  } else {
    if (!topBlocks.length && project.blocks.length > 0) throw new Error("invalid-project");
    importedPages = [{ id: "page-home", name: "Home", blocks: topBlocks }];
  }

  const importedDevice = DEVICES.includes(project.device as Device) ? (project.device as Device) : "desktop";
  const importedActive =
    project.activePageId && importedPages.some((page) => page.id === project.activePageId)
      ? project.activePageId
      : importedPages[0].id;
  const importedBlocks = importedPages.find((page) => page.id === importedActive)?.blocks ?? topBlocks;
  return {
    name: project.name || "Wireframe importado",
    device: importedDevice,
    pages: importedPages,
    activePageId: importedActive,
    blocks: importedBlocks,
  };
}

// ---------------------------------------------------------------------------
// Seleção: bounds, alinhamento, distribuição, reorder
// ---------------------------------------------------------------------------

export type Bounds = { x: number; y: number; w: number; h: number };

export function selectionBounds(blocks: Block[]): Bounds | null {
  if (!blocks.length) return null;
  const x1 = Math.min(...blocks.map((b) => b.x));
  const y1 = Math.min(...blocks.map((b) => b.y));
  const x2 = Math.max(...blocks.map((b) => b.x + b.w));
  const y2 = Math.max(...blocks.map((b) => b.y + b.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

/**
 * Alinha os blocos selecionados.
 * - 2+ blocos: alinha dentro da bounding box do grupo.
 * - 1 bloco: alinha ao artboard.
 * Retorna mapa id -> patch {x?, y?} (já arredondado e contido no artboard).
 */
export function alignPatches(
  all: Block[],
  ids: string[],
  mode: AlignMode,
  artW: number,
  artH: number,
): Record<string, { x?: number; y?: number }> {
  const selected = all.filter((b) => ids.includes(b.id));
  if (!selected.length) return {};
  const patches: Record<string, { x?: number; y?: number }> = {};
  if (selected.length === 1) {
    const b = selected[0];
    if (mode === "left") patches[b.id] = { x: 0 };
    else if (mode === "center") patches[b.id] = { x: clamp(Math.round((artW - b.w) / 2), 0, artW - b.w) };
    else if (mode === "right") patches[b.id] = { x: Math.max(0, artW - b.w) };
    else if (mode === "top") patches[b.id] = { y: 0 };
    else if (mode === "middle") patches[b.id] = { y: clamp(Math.round((artH - b.h) / 2), 0, artH - b.h) };
    else patches[b.id] = { y: Math.max(0, artH - b.h) };
    return patches;
  }
  const box = selectionBounds(selected);
  if (!box) return {};
  for (const b of selected) {
    if (mode === "left") patches[b.id] = { x: Math.round(box.x) };
    else if (mode === "center") patches[b.id] = { x: Math.round(box.x + (box.w - b.w) / 2) };
    else if (mode === "right") patches[b.id] = { x: Math.round(box.x + box.w - b.w) };
    else if (mode === "top") patches[b.id] = { y: Math.round(box.y) };
    else if (mode === "middle") patches[b.id] = { y: Math.round(box.y + (box.h - b.h) / 2) };
    else patches[b.id] = { y: Math.round(box.y + box.h - b.h) };
  }
  return patches;
}

export function applyPatches(all: Block[], patches: Record<string, { x?: number; y?: number }>): Block[] {
  return all.map((b) => (patches[b.id] ? { ...b, ...patches[b.id] } : b));
}

/**
 * Distribui 3+ blocos com espaçamento igual entre o primeiro e o último
 * (extremos fixos, ordenados por posição no eixo).
 */
export function distributePatches(
  all: Block[],
  ids: string[],
  axis: "x" | "y",
): Record<string, { x?: number; y?: number }> {
  const selected = all.filter((b) => ids.includes(b.id)).sort((a, b) => (axis === "x" ? a.x - b.x : a.y - b.y));
  if (selected.length < 3) return {};
  const patches: Record<string, { x?: number; y?: number }> = {};
  if (axis === "x") {
    const start = selected[0].x;
    const end = selected[selected.length - 1].x;
    const step = (end - start) / (selected.length - 1);
    selected.forEach((b, i) => {
      if (i > 0 && i < selected.length - 1) patches[b.id] = { x: Math.round(start + step * i) };
    });
  } else {
    const start = selected[0].y;
    const end = selected[selected.length - 1].y;
    const step = (end - start) / (selected.length - 1);
    selected.forEach((b, i) => {
      if (i > 0 && i < selected.length - 1) patches[b.id] = { y: Math.round(start + step * i) };
    });
  }
  return patches;
}

/** Move o item `fromId` para a posição do item `toId` (reorder de camadas). */
export function reorderById<T extends { id: string }>(list: T[], fromId: string, toId: string): T[] {
  if (fromId === toId) return list;
  const from = list.findIndex((item) => item.id === fromId);
  const to = list.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ---------------------------------------------------------------------------
// Exportação SVG
// ---------------------------------------------------------------------------

export function buildSvg(blocks: Block[], width: number, height: number): string {
  const body = blocks
    .map((block) => {
      const lines = block.label.split("\n");
      const rx = block.style.radius;
      if (block.type === "divider") {
        return `<rect x="${block.x}" y="${block.y}" width="${block.w}" height="${Math.max(2, block.h)}" fill="${block.style.fill}" />`;
      }
      const base = `<rect x="${block.x}" y="${block.y}" width="${block.w}" height="${block.h}" rx="${rx}" fill="${block.style.fill}" stroke="${block.style.border}" stroke-width="1" />`;
      if (block.type === "image") {
        return `${base}<path d="M ${block.x + 18} ${block.y + block.h - 20} L ${block.x + block.w * 0.42} ${block.y + block.h * 0.46} L ${block.x + block.w * 0.64} ${block.y + block.h * 0.68} L ${block.x + block.w - 18} ${block.y + 32}" fill="none" stroke="${block.style.text}" stroke-width="2" opacity=".7"/><circle cx="${block.x + block.w - 36}" cy="${block.y + 38}" r="10" fill="none" stroke="${block.style.text}" stroke-width="2" opacity=".7"/>`;
      }
      const fontSize = block.type === "heading" ? 30 : block.type === "button" ? 14 : 16;
      const weight = block.type === "heading" ? 700 : 500;
      const text = lines
        .map(
          (line, index) =>
            `<text x="${block.x + (block.type === "button" ? block.w / 2 : 18)}" y="${block.y + 30 + index * (fontSize + 6)}" fill="${block.style.text}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${weight}" ${block.type === "button" ? 'text-anchor="middle"' : ""}>${escapeXml(line)}</text>`,
        )
        .join("");
      return `${base}${text}`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
}
