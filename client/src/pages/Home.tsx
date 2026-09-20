import {
  AlignLeft,
  ArrowDownToLine,
  ChevronDown,
  Circle,
  Copy,
  Download,
  Eye,
  FileJson,
  FileText,
  Grid3X3,
  Hand,
  Image as ImageIcon,
  Layers3,
  LayoutTemplate,
  Link2,
  Lock,
  Maximize2,
  Minus,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  Move,
  PanelLeft,
  PanelRight,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
  Search,
  Smartphone,
  Sparkles,
  Square,
  Tablet,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type BlockType = "heading" | "text" | "button" | "input" | "image" | "card" | "navbar" | "divider";
type ToolMode = "select" | "hand";
type Device = "desktop" | "tablet" | "mobile";

type BlockStyle = {
  fill: string;
  border: string;
  text: string;
  radius: number;
};

type Block = {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  style: BlockStyle;
};

type WireframePage = {
  id: string;
  name: string;
  blocks: Block[];
};

type ProjectFile = {
  version: 1;
  name: string;
  device: Device;
  blocks: Block[];
  pages?: WireframePage[];
  activePageId?: string;
};

const ARTBOARD = { width: 1100, height: 700 };
const STORAGE_KEY = "wireframe-local-project";
const SNAP_SIZE = 8;

const componentCatalog: Array<{
  type: BlockType;
  label: string;
  hint: string;
  icon: typeof Type;
  accent: string;
}> = [
  { type: "heading", label: "Título", hint: "Cabeçalho", icon: Type, accent: "lavender" },
  { type: "text", label: "Texto", hint: "Parágrafo", icon: AlignLeft, accent: "blue" },
  { type: "button", label: "Botão", hint: "Ação", icon: Square, accent: "orange" },
  { type: "input", label: "Campo", hint: "Input", icon: MoreHorizontal, accent: "pink" },
  { type: "image", label: "Imagem", hint: "Placeholder", icon: ImageIcon, accent: "mint" },
  { type: "card", label: "Card", hint: "Container", icon: LayoutTemplate, accent: "yellow" },
  { type: "navbar", label: "Navegação", hint: "Menu superior", icon: Link2, accent: "lavender" },
  { type: "divider", label: "Divisor", hint: "Linha", icon: Minus, accent: "blue" },
];

const starterBlocks: Block[] = [
  {
    id: "nav-starter",
    type: "navbar",
    x: 52,
    y: 38,
    w: 996,
    h: 64,
    label: "LUMA  /  Produto   Recursos   Preços",
    style: { fill: "#ffffff", border: "#d7d9e0", text: "#242631", radius: 12 },
  },
  {
    id: "heading-starter",
    type: "heading",
    x: 100,
    y: 164,
    w: 525,
    h: 104,
    label: "Transforme ideias\nem experiências.",
    style: { fill: "#ffffff", border: "#d7d9e0", text: "#171922", radius: 12 },
  },
  {
    id: "copy-starter",
    type: "text",
    x: 104,
    y: 294,
    w: 410,
    h: 74,
    label: "Um espaço simples para visualizar, testar e compartilhar o que vem a seguir.",
    style: { fill: "#ffffff", border: "#d7d9e0", text: "#686d7c", radius: 10 },
  },
  {
    id: "button-starter",
    type: "button",
    x: 104,
    y: 398,
    w: 164,
    h: 48,
    label: "Começar agora",
    style: { fill: "#7162d9", border: "#7162d9", text: "#ffffff", radius: 10 },
  },
  {
    id: "image-starter",
    type: "image",
    x: 680,
    y: 172,
    w: 282,
    h: 286,
    label: "Imagem / mockup",
    style: { fill: "#f1efff", border: "#bdb5f1", text: "#8a7fe1", radius: 18 },
  },
  {
    id: "card-starter",
    type: "card",
    x: 98,
    y: 560,
    w: 864,
    h: 76,
    label: "+  Adicione um novo bloco para continuar o fluxo",
    style: { fill: "#fbfbfd", border: "#e4e5ea", text: "#8b8f9e", radius: 12 },
  },
];

function makeId() {
  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultStyle(type: BlockType): BlockStyle {
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

function defaultLabel(type: BlockType) {
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

function createBlock(type: BlockType, index: number): Block {
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
  const [w, h] = sizes[type];
  return {
    id: makeId(),
    type,
    x: Math.min(1100 - w - 32, 90 + (index % 3) * 28),
    y: Math.min(700 - h - 32, 130 + (index % 4) * 26),
    w,
    h,
    label: defaultLabel(type),
    style: defaultStyle(type),
  };
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] ?? char);
}

function blockTypeLabel(type: BlockType) {
  return componentCatalog.find((item) => item.type === type)?.label ?? "Bloco";
}

function formatSize(value: number) {
  return `${Math.round(value)} px`;
}

function snap(value: number) {
  return Math.round(value / SNAP_SIZE) * SNAP_SIZE;
}

function AppMark() {
  return (
    <div className="app-mark" aria-label="Wireframe Local">
      <span className="app-mark-shape app-mark-shape-one" />
      <span className="app-mark-shape app-mark-shape-two" />
      <span className="app-mark-shape app-mark-shape-three" />
    </div>
  );
}

export default function Home() {
  const [projectTitle, setProjectTitle] = useState("Página inicial");
  const [blocks, setBlocks] = useState<Block[]>(starterBlocks);
  const [pages, setPages] = useState<WireframePage[]>([{ id: "page-home", name: "Home", blocks: starterBlocks }]);
  const [activePageId, setActivePageId] = useState("page-home");
  const [selectedId, setSelectedId] = useState("heading-starter");
  const [history, setHistory] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);
  const [zoom, setZoom] = useState(75);
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [device, setDevice] = useState<Device>("desktop");
  const [showGrid, setShowGrid] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    id: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
    origX: number;
    origY: number;
    corner: "se" | "sw";
  } | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const artboardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBlock = useMemo(() => blocks.find((block) => block.id === selectedId) ?? null, [blocks, selectedId]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const project = JSON.parse(stored) as ProjectFile;
      const loadedPages = project.pages?.length ? project.pages : [{ id: "page-home", name: "Home", blocks: project.blocks ?? starterBlocks }];
      const loadedActivePage = project.activePageId && loadedPages.some((page) => page.id === project.activePageId) ? project.activePageId : loadedPages[0].id;
      const loadedBlocks = loadedPages.find((page) => page.id === loadedActivePage)?.blocks ?? loadedPages[0].blocks;
      if (loadedBlocks?.length) {
        setPages(loadedPages);
        setActivePageId(loadedActivePage);
        setBlocks(loadedBlocks);
        setProjectTitle(project.name || "Página inicial");
        setDevice(project.device || "desktop");
        setSelectedId(loadedBlocks[0].id);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const syncedPages = pages.map((page) => page.id === activePageId ? { ...page, blocks } : page);
    const project: ProjectFile = { version: 1, name: projectTitle, device, blocks, pages: syncedPages, activePageId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    setIsSaved(true);
  }, [blocks, pages, activePageId, projectTitle, device]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !isTyping) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveProject();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d" && !isTyping) {
        event.preventDefault();
        duplicateSelected();
      }
      if (!isTyping && selectedBlock && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const step = event.shiftKey ? SNAP_SIZE : 1;
        const delta = { x: event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0, y: event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0 };
        updateSelected({ x: Math.max(0, Math.min(ARTBOARD.width - selectedBlock.w, selectedBlock.x + delta.x)), y: Math.max(0, Math.min(ARTBOARD.height - selectedBlock.h, selectedBlock.y + delta.y)) });
      }
      if (!isTyping && event.key.toLowerCase() === "v") setToolMode("select");
      if (!isTyping && event.key.toLowerCase() === "h") setToolMode("hand");
      if (!isTyping && event.key.toLowerCase() === "g") setShowGrid((show) => !show);
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId && !isTyping && !isPreview) {
        event.preventDefault();
        deleteSelected();
      }
      if (event.key === "Escape") setSelectedId("");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (!dragState) return;
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const deltaX = (event.clientX - dragState.startX) / (zoom / 100);
      const deltaY = (event.clientY - dragState.startY) / (zoom / 100);
      const dragged = blocks.find((block) => block.id === dragState.id);
      if (!dragged) return;
      const rawX = Math.max(0, Math.min(ARTBOARD.width - dragged.w, Math.round(dragState.origX + deltaX)));
      const rawY = Math.max(0, Math.min(ARTBOARD.height - dragged.h, Math.round(dragState.origY + deltaY)));
      const peers = blocks.filter((block) => block.id !== dragged.id);
      const snapX = peers.find((peer) => Math.abs(peer.x - rawX) < 7 || Math.abs(peer.x + peer.w - (rawX + dragged.w)) < 7);
      const snapY = peers.find((peer) => Math.abs(peer.y - rawY) < 7 || Math.abs(peer.y + peer.h - (rawY + dragged.h)) < 7);
      const nextX = snapX ? (Math.abs(snapX.x - rawX) < 7 ? snapX.x : snapX.x + snapX.w - dragged.w) : snap(rawX);
      const nextY = snapY ? (Math.abs(snapY.y - rawY) < 7 ? snapY.y : snapY.y + snapY.h - dragged.h) : snap(rawY);
      setBlocks((current) => current.map((block) => (block.id === dragState.id ? { ...block, x: nextX, y: nextY } : block)));
      setIsSaved(false);
    };
    const onPointerUp = () => {
      setDragState(null);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState, zoom, blocks]);

  useEffect(() => {
    if (!resizeState) return;
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const deltaX = (event.clientX - resizeState.startX) / (zoom / 100);
      const deltaY = (event.clientY - resizeState.startY) / (zoom / 100);
      setBlocks((current) => current.map((block) => {
        if (block.id !== resizeState.id) return block;
        if (resizeState.corner === "sw") {
          const nextW = Math.max(48, Math.min(ARTBOARD.width - resizeState.origX, snap(resizeState.origW - deltaX)));
          return { ...block, x: snap(resizeState.origX + resizeState.origW - nextW), w: nextW, h: Math.max(3, Math.min(ARTBOARD.height - resizeState.origY, snap(resizeState.origH + deltaY))) };
        }
        return { ...block, w: Math.max(48, Math.min(ARTBOARD.width - resizeState.origX, snap(resizeState.origW + deltaX))), h: Math.max(3, Math.min(ARTBOARD.height - resizeState.origY, snap(resizeState.origH + deltaY))) };
      }));
      setIsSaved(false);
    };
    const onPointerUp = () => setResizeState(null);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [resizeState, zoom]);

  function applyBlocks(next: Block[], recordHistory = true) {
    if (recordHistory) {
      setHistory((current) => [...current.slice(-24), blocks]);
      setFuture([]);
    }
    setBlocks(next);
    setIsSaved(false);
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setFuture((current) => [blocks, ...current]);
    setHistory((current) => current.slice(0, -1));
    setBlocks(previous);
    setIsSaved(false);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setHistory((current) => [...current, blocks]);
    setFuture((current) => current.slice(1));
    setBlocks(next);
    setIsSaved(false);
  }

  function addBlock(type: BlockType) {
    const block = createBlock(type, blocks.length);
    applyBlocks([...blocks, block]);
    setSelectedId(block.id);
    toast.success(`${blockTypeLabel(type)} adicionado`, { description: "Arraste o bloco para posicionar." });
  }

  function updateSelected(patch: Partial<Block> | { style: Partial<BlockStyle> }) {
    if (!selectedBlock) return;
    const next = blocks.map((block) => {
      if (block.id !== selectedBlock.id) return block;
      if ("style" in patch) return { ...block, style: { ...block.style, ...patch.style } };
      return { ...block, ...patch };
    });
    applyBlocks(next);
  }

  function deleteSelected() {
    if (!selectedBlock) return;
    applyBlocks(blocks.filter((block) => block.id !== selectedBlock.id));
    setSelectedId("");
    toast("Bloco removido");
  }

  function duplicateSelected() {
    if (!selectedBlock) return;
    const duplicate = { ...selectedBlock, id: makeId(), x: Math.min(ARTBOARD.width - selectedBlock.w, selectedBlock.x + 24), y: Math.min(ARTBOARD.height - selectedBlock.h, selectedBlock.y + 24) };
    applyBlocks([...blocks, duplicate]);
    setSelectedId(duplicate.id);
    toast.success("Bloco duplicado");
  }

  function handleBlockPointerDown(event: PointerEvent<HTMLDivElement>, block: Block) {
    if (isPreview || toolMode === "hand") return;
    event.stopPropagation();
    setSelectedId(block.id);
    setDragState({ id: block.id, startX: event.clientX, startY: event.clientY, origX: block.x, origY: block.y });
  }

  function exportJson() {
    const syncedPages = pages.map((page) => page.id === activePageId ? { ...page, blocks } : page);
    const file: ProjectFile = { version: 1, name: projectTitle, device, blocks, pages: syncedPages, activePageId };
    download(`${projectTitle.toLowerCase().replace(/\s+/g, "-") || "wireframe"}.json`, JSON.stringify(file, null, 2), "application/json");
    setIsExportOpen(false);
    toast.success("Arquivo JSON exportado");
  }

  function createSvg() {
    const body = blocks.map((block) => {
      const lines = block.label.split("\n");
      const rx = block.style.radius;
      if (block.type === "divider") return `<rect x="${block.x}" y="${block.y}" width="${block.w}" height="${Math.max(2, block.h)}" fill="${block.style.fill}" />`;
      const base = `<rect x="${block.x}" y="${block.y}" width="${block.w}" height="${block.h}" rx="${rx}" fill="${block.style.fill}" stroke="${block.style.border}" stroke-width="1" />`;
      if (block.type === "image") {
        return `${base}<path d="M ${block.x + 18} ${block.y + block.h - 20} L ${block.x + block.w * 0.42} ${block.y + block.h * 0.46} L ${block.x + block.w * 0.64} ${block.y + block.h * 0.68} L ${block.x + block.w - 18} ${block.y + 32}" fill="none" stroke="${block.style.text}" stroke-width="2" opacity=".7"/><circle cx="${block.x + block.w - 36}" cy="${block.y + 38}" r="10" fill="none" stroke="${block.style.text}" stroke-width="2" opacity=".7"/>`;
      }
      const fontSize = block.type === "heading" ? 30 : block.type === "button" ? 14 : 16;
      const weight = block.type === "heading" ? 700 : 500;
      const text = lines.map((line, index) => `<text x="${block.x + (block.type === "button" ? block.w / 2 : 18)}" y="${block.y + 30 + index * (fontSize + 6)}" fill="${block.style.text}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${weight}" ${block.type === "button" ? 'text-anchor="middle"' : ""}>${escapeXml(line)}</text>`).join("");
      return `${base}${text}`;
    }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${ARTBOARD.width}" height="${ARTBOARD.height}" viewBox="0 0 ${ARTBOARD.width} ${ARTBOARD.height}"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
  }

  function exportSvg() {
    download(`${projectTitle.toLowerCase().replace(/\s+/g, "-") || "wireframe"}.svg`, createSvg(), "image/svg+xml");
    setIsExportOpen(false);
    toast.success("SVG exportado");
  }

  function exportPng() {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = ARTBOARD.width * scale;
    canvas.height = ARTBOARD.height * scale;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(scale, scale);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, ARTBOARD.width, ARTBOARD.height);
    blocks.forEach((block) => {
      context.fillStyle = block.style.fill;
      context.strokeStyle = block.style.border;
      context.lineWidth = 1;
      context.beginPath();
      context.roundRect(block.x, block.y, block.w, block.h, block.style.radius);
      context.fill();
      context.stroke();
      if (block.type === "image") {
        context.strokeStyle = block.style.text;
        context.globalAlpha = 0.65;
        context.beginPath();
        context.moveTo(block.x + 18, block.y + block.h - 20);
        context.lineTo(block.x + block.w * 0.42, block.y + block.h * 0.46);
        context.lineTo(block.x + block.w * 0.64, block.y + block.h * 0.68);
        context.lineTo(block.x + block.w - 18, block.y + 32);
        context.stroke();
        context.globalAlpha = 1;
        return;
      }
      context.fillStyle = block.style.text;
      context.font = `${block.type === "heading" ? "700 30px" : block.type === "button" ? "500 14px" : "500 16px"} Arial`;
      context.textAlign = block.type === "button" ? "center" : "left";
      block.label.split("\n").forEach((line, index) => context.fillText(line, block.x + (block.type === "button" ? block.w / 2 : 18), block.y + 30 + index * 22));
    });
    canvas.toBlob((blob) => {
      if (blob) download(`${projectTitle.toLowerCase().replace(/\s+/g, "-") || "wireframe"}.png`, blob, "image/png");
      toast.success("PNG exportado");
    });
    setIsExportOpen(false);
  }

  function download(filename: string, content: string | Blob, type: string) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const project = JSON.parse(String(reader.result)) as ProjectFile;
        if (!project.blocks?.length) throw new Error("empty");
        applyBlocks(project.blocks);
        setProjectTitle(project.name || "Wireframe importado");
        setDevice(project.device || "desktop");
        const importedPages = project.pages?.length ? project.pages : [{ id: "page-home", name: "Home", blocks: project.blocks }];
        const importedActive = project.activePageId && importedPages.some((page) => page.id === project.activePageId) ? project.activePageId : importedPages[0].id;
        setPages(importedPages);
        setActivePageId(importedActive);
        const importedBlocks = importedPages.find((page) => page.id === importedActive)?.blocks ?? project.blocks;
        setBlocks(importedBlocks);
        setSelectedId(importedBlocks[0]?.id ?? "");
        toast.success("Wireframe importado");
      } catch {
        toast.error("Não foi possível importar este arquivo", { description: "Use um JSON exportado pelo Wireframe Local." });
      } finally {
        setFileInputKey((key) => key + 1);
      }
    };
    reader.readAsText(file);
  }

  function saveProject() {
    const syncedPages = pages.map((page) => page.id === activePageId ? { ...page, blocks } : page);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, name: projectTitle, device, blocks, pages: syncedPages, activePageId } satisfies ProjectFile));
    setIsSaved(true);
    toast.success("Alterações salvas localmente");
  }

  function updateDevice(nextDevice: Device) {
    setDevice(nextDevice);
    setZoom(nextDevice === "desktop" ? 75 : nextDevice === "tablet" ? 68 : 56);
  }

  function switchPage(pageId: string) {
    const currentPage = pages.find((page) => page.id === activePageId);
    const nextPage = pages.find((page) => page.id === pageId);
    if (!nextPage || !currentPage) return;
    setPages((current) => current.map((page) => page.id === activePageId ? { ...page, blocks } : page));
    setActivePageId(pageId);
    setBlocks(nextPage.blocks);
    setSelectedId(nextPage.blocks[0]?.id ?? "");
    setHistory([]);
    setFuture([]);
  }

  function addPage() {
    const page: WireframePage = { id: makeId(), name: `Página ${pages.length + 1}`, blocks: [] };
    setPages((current) => [...current.map((item) => item.id === activePageId ? { ...item, blocks } : item), page]);
    setActivePageId(page.id);
    setBlocks([]);
    setSelectedId("");
    setHistory([]);
    setFuture([]);
    toast.success("Nova página criada");
  }

  function renamePage(pageId: string) {
    const page = pages.find((item) => item.id === pageId);
    if (!page) return;
    const name = window.prompt("Nome da página", page.name)?.trim();
    if (name) setPages((current) => current.map((item) => item.id === pageId ? { ...item, name } : item));
  }

  function deletePage(pageId: string) {
    if (pages.length <= 1) return toast("Mantenha pelo menos uma página");
    const remaining = pages.filter((page) => page.id !== pageId);
    const nextPage = remaining[0];
    setPages(remaining);
    if (pageId === activePageId) {
      setActivePageId(nextPage.id);
      setBlocks(nextPage.blocks);
      setSelectedId(nextPage.blocks[0]?.id ?? "");
    }
    toast("Página removida");
  }

  function alignSelected(alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") {
    if (!selectedBlock) return;
    const peers = blocks.filter((block) => block.id !== selectedBlock.id);
    if (!peers.length) return toast("Adicione outro elemento para alinhar");
    const patch: Partial<Block> = {};
    const reference = peers[0];
    if (["left", "center", "right"].includes(alignment)) {
      patch.x = alignment === "right" ? reference.x + reference.w - selectedBlock.w : alignment === "center" ? reference.x + (reference.w - selectedBlock.w) / 2 : reference.x;
    } else {
      patch.y = alignment === "bottom" ? reference.y + reference.h - selectedBlock.h : alignment === "middle" ? reference.y + (reference.h - selectedBlock.h) / 2 : reference.y;
    }
    updateSelected(patch);
    toast.success("Elemento alinhado");
  }

  return (
    <main className="studio-shell">
      <header className="topbar">
        <div className="topbar-left">
          <AppMark />
          <div className="brand-copy">
            <div className="brand-name">wireframe<span>.</span></div>
            <div className="brand-subtitle">editor local</div>
          </div>
          <div className="header-divider" />
          <div className="project-name-wrap">
            <span className="project-label">PROJETO</span>
            <input aria-label="Nome do projeto" value={projectTitle} onChange={(event) => { setProjectTitle(event.target.value); setIsSaved(false); }} />
            <ChevronDown size={14} />
          </div>
        </div>
        <div className="topbar-center">
          <div className="segmented-control mode-control" aria-label="Modo de edição">
            <button className={!isPreview ? "active" : ""} onClick={() => setIsPreview(false)}><MousePointer2 size={14} /> Design</button>
            <button className={isPreview ? "active" : ""} onClick={() => setIsPreview(true)}><Eye size={14} /> Preview</button>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" title="Desfazer" onClick={undo} disabled={!history.length}><Undo2 size={16} /></button>
          <button className="icon-button" title="Refazer" onClick={redo} disabled={!future.length}><Redo2 size={16} /></button>
          <span className="header-divider small" />
          <div className="save-state"><span className={isSaved ? "saved-dot" : "unsaved-dot"} />{isSaved ? "Salvo localmente" : "Não salvo"}</div>
          <button className="button-secondary" onClick={saveProject}><span className="save-icon">⌘</span> Salvar</button>
          <div className="export-wrap">
            <button className="button-primary" onClick={() => setIsExportOpen((open) => !open)}><Download size={15} /> Exportar <ChevronDown size={14} /></button>
            {isExportOpen && <div className="export-menu">
              <button onClick={exportPng}><ImageIcon size={15} /><span>Exportar PNG</span><small>imagem</small></button>
              <button onClick={exportSvg}><FileText size={15} /><span>Exportar SVG</span><small>vetor</small></button>
              <button onClick={exportJson}><FileJson size={15} /><span>Exportar JSON</span><small>editável</small></button>
            </div>}
          </div>
          <button className="avatar-button" aria-label="Perfil">ML</button>
        </div>
      </header>

      <div className="workspace">
        {!isPreview && <aside className="left-sidebar">
          <div className="sidebar-heading-row"><div><p className="eyebrow">BIBLIOTECA</p><h2>Componentes</h2></div><button className="plain-icon"><PanelLeft size={15} /></button></div>
          <div className="search-field"><Search size={15} /><input placeholder="Buscar componente" aria-label="Buscar componente" /></div>
          <div className="component-grid">
            {componentCatalog.map((item) => {
              const Icon = item.icon;
              return <button className="component-card" key={item.type} onClick={() => addBlock(item.type)} draggable onDragStart={(event) => event.dataTransfer.setData("application/wireframe-type", item.type)}>
                <span className={`component-icon ${item.accent}`}><Icon size={18} strokeWidth={1.8} /></span>
                <span className="component-label"><strong>{item.label}</strong><small>{item.hint}</small></span>
                <Plus className="component-plus" size={14} />
              </button>;
            })}
          </div>
          <div className="sidebar-tip"><Sparkles size={15} /><div><strong>Dica rápida</strong><p>Clique para adicionar. Arraste para posicionar.</p></div></div>
          <div className="layers-block"><div className="sidebar-heading-row compact"><p className="eyebrow">CAMADAS <span>{blocks.length}</span></p><button className="plain-icon"><MoreHorizontal size={15} /></button></div><div className="layer-list">{blocks.slice().reverse().map((block) => <button key={block.id} className={`layer-row ${selectedId === block.id ? "selected" : ""}`} onClick={() => setSelectedId(block.id)}><span className="layer-type-icon"><Layers3 size={14} /></span><span>{blockTypeLabel(block.type)}</span><span className="layer-dots">···</span></button>)}</div></div>
          <div className="pages-block"><div className="sidebar-heading-row compact"><p className="eyebrow">PÁGINAS <span>{pages.length}</span></p><button className="plain-icon" onClick={addPage} title="Nova página"><Plus size={15} /></button></div><div className="page-list">{pages.map((page) => <div key={page.id} className={`page-row ${page.id === activePageId ? "selected" : ""}`}><button onClick={() => switchPage(page.id)}><FileText size={13} /><span>{page.name}</span><small>{page.blocks.length}</small></button><div className="page-actions"><button onClick={() => renamePage(page.id)} title="Renomear página"><MoreHorizontal size={13} /></button><button onClick={() => deletePage(page.id)} title="Excluir página"><Trash2 size={12} /></button></div></div>)}</div></div>
        </aside>}

        <section className={`canvas-area ${isPreview ? "preview-mode" : ""}`}>
          <div className="canvas-toolbar">
            <div className="breadcrumb"><span>Wireframes</span><span className="breadcrumb-slash">/</span><strong>{projectTitle}</strong></div>
            <div className="canvas-tools">
              <div className="device-switcher" title="Tamanho do wireframe">
                <button className={device === "desktop" ? "active" : ""} onClick={() => updateDevice("desktop")}><Monitor size={15} /></button>
                <button className={device === "tablet" ? "active" : ""} onClick={() => updateDevice("tablet")}><Tablet size={15} /></button>
                <button className={device === "mobile" ? "active" : ""} onClick={() => updateDevice("mobile")}><Smartphone size={15} /></button>
              </div>
              {!isPreview && <>
                <span className="toolbar-divider" />
                <button className={`tool-button ${toolMode === "select" ? "active" : ""}`} onClick={() => setToolMode("select")} title="Selecionar"><MousePointer2 size={15} /></button>
                <button className={`tool-button ${toolMode === "hand" ? "active" : ""}`} onClick={() => setToolMode("hand")} title="Mover tela"><Hand size={15} /></button>
                <button className={`tool-button ${showGrid ? "active" : ""}`} onClick={() => setShowGrid((show) => !show)} title="Alternar grade"><Grid3X3 size={15} /></button>
              </>}
              <span className="toolbar-divider" />
              <button className="tool-button" onClick={() => setZoom((value) => Math.max(40, value - 5))}><Minus size={15} /></button>
              <span className="zoom-value">{zoom}%</span>
              <button className="tool-button" onClick={() => setZoom((value) => Math.min(110, value + 5))}><Plus size={15} /></button>
            </div>
          </div>
          <div className={`canvas-scroller device-${device}`}>
            <div className="canvas-ruler-top"><span>0</span><span>200</span><span>400</span><span>600</span><span>800</span><span>1000</span></div>
            <div className="canvas-stage-wrap" style={{ width: ARTBOARD.width * (zoom / 100), height: ARTBOARD.height * (zoom / 100) }}>
              <div ref={artboardRef} className={`artboard ${showGrid ? "with-grid" : ""}`} style={{ width: ARTBOARD.width, height: ARTBOARD.height, transform: `scale(${zoom / 100})` }} onPointerDown={() => setSelectedId("")} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const type = event.dataTransfer.getData("application/wireframe-type") as BlockType; if (type) addBlock(type); }}>
                <div className="artboard-meta"><span>HOME / DESKTOP</span><span>{ARTBOARD.width} × {ARTBOARD.height}</span></div>
                {blocks.map((block) => <div key={block.id} className={`wire-block block-${block.type} ${selectedId === block.id && !isPreview ? "selected" : ""}`} style={{ left: block.x, top: block.y, width: block.w, height: block.h, backgroundColor: block.style.fill, borderColor: block.style.border, color: block.style.text, borderRadius: block.style.radius }} onPointerDown={(event) => handleBlockPointerDown(event, block)}>
                  {selectedId === block.id && !isPreview && <div className="selection-label"><span>{blockTypeLabel(block.type)}</span><span>{Math.round(block.w)} × {Math.round(block.h)}</span></div>}
                  {block.type === "image" ? <><div className="image-sun" /><div className="image-mountains" /><span className="block-content image-label">{block.label}</span></> : block.type === "input" ? <><span className="input-dot" /> <span className="block-content">{block.label}</span></> : block.type === "divider" ? null : <span className="block-content">{block.label}</span>}
                  {selectedId === block.id && !isPreview && <><span className="resize-handle handle-se" onPointerDown={(event) => { event.stopPropagation(); setResizeState({ id: block.id, startX: event.clientX, startY: event.clientY, origW: block.w, origH: block.h, origX: block.x, origY: block.y, corner: "se" }); }} /><span className="resize-handle handle-sw" onPointerDown={(event) => { event.stopPropagation(); setResizeState({ id: block.id, startX: event.clientX, startY: event.clientY, origW: block.w, origH: block.h, origX: block.x, origY: block.y, corner: "sw" }); }} /></>}
                </div>)}
              </div>
            </div>
            <div className="canvas-hint"><Move size={13} /> Arraste elementos para organizar o fluxo</div>
          </div>
          {isPreview && <div className="preview-badge"><Eye size={14} /> Modo preview <button onClick={() => setIsPreview(false)}><X size={13} /></button></div>}
        </section>

        {!isPreview && <aside className="right-sidebar">
          <div className="inspector-header"><div><p className="eyebrow">PROPRIEDADES</p><h2>{selectedBlock ? blockTypeLabel(selectedBlock.type) : "Nenhuma seleção"}</h2></div><button className="plain-icon"><PanelRight size={15} /></button></div>
          {selectedBlock ? <div className="inspector-content">
            <div className="inspector-section first"><div className="section-title"><span>Conteúdo</span><span className="section-kicker">{selectedBlock.id.slice(0, 8)}</span></div>
              <textarea className="content-input" rows={selectedBlock.type === "heading" ? 3 : 2} value={selectedBlock.label} onChange={(event) => updateSelected({ label: event.target.value })} aria-label="Conteúdo do bloco" />
            </div>
            <div className="inspector-section"><div className="section-title"><span>Posição e tamanho</span><Lock size={13} /></div>
              <div className="field-grid"><label><span>X</span><input type="number" value={Math.round(selectedBlock.x)} onChange={(event) => updateSelected({ x: Number(event.target.value) })} /></label><label><span>Y</span><input type="number" value={Math.round(selectedBlock.y)} onChange={(event) => updateSelected({ y: Number(event.target.value) })} /></label><label><span>W</span><input type="number" value={Math.round(selectedBlock.w)} onChange={(event) => updateSelected({ w: Math.max(8, Number(event.target.value)) })} /></label><label><span>H</span><input type="number" value={Math.round(selectedBlock.h)} onChange={(event) => updateSelected({ h: Math.max(3, Number(event.target.value)) })} /></label></div>
            </div>
            <div className="inspector-section"><div className="section-title"><span>Aparência</span><Palette size={13} /></div>
              <div className="color-row"><span>Fundo</span><label className="color-picker"><input type="color" value={selectedBlock.style.fill} onChange={(event) => updateSelected({ style: { fill: event.target.value } })} /><span style={{ backgroundColor: selectedBlock.style.fill }} /><code>{selectedBlock.style.fill.toUpperCase()}</code></label></div>
              <div className="color-row"><span>Contorno</span><label className="color-picker"><input type="color" value={selectedBlock.style.border} onChange={(event) => updateSelected({ style: { border: event.target.value } })} /><span style={{ backgroundColor: selectedBlock.style.border }} /><code>{selectedBlock.style.border.toUpperCase()}</code></label></div>
              <div className="color-row"><span>Texto</span><label className="color-picker"><input type="color" value={selectedBlock.style.text} onChange={(event) => updateSelected({ style: { text: event.target.value } })} /><span style={{ backgroundColor: selectedBlock.style.text }} /><code>{selectedBlock.style.text.toUpperCase()}</code></label></div>
              <label className="range-row"><span>Raio <strong>{selectedBlock.style.radius}px</strong></span><input type="range" min="0" max="28" value={selectedBlock.style.radius} onChange={(event) => updateSelected({ style: { radius: Number(event.target.value) } })} /></label>
            </div>
            <div className="inspector-section alignment-section"><div className="section-title"><span>Alinhamento</span><Move size={13} /></div><div className="alignment-grid"><button onClick={() => alignSelected("left")} title="Alinhar à esquerda">←</button><button onClick={() => alignSelected("center")} title="Centralizar horizontalmente">↔</button><button onClick={() => alignSelected("right")} title="Alinhar à direita">→</button><button onClick={() => alignSelected("top")} title="Alinhar ao topo">↑</button><button onClick={() => alignSelected("middle")} title="Centralizar verticalmente">↕</button><button onClick={() => alignSelected("bottom")} title="Alinhar à base">↓</button></div><p className="alignment-hint">Arraste perto de outro bloco para encaixar automaticamente.</p></div>
            <div className="inspector-actions"><button onClick={duplicateSelected}><Copy size={14} /> Duplicar</button><button className="danger" onClick={deleteSelected}><Trash2 size={14} /> Remover</button></div>
          </div> : <div className="empty-inspector"><div className="empty-inspector-icon"><Maximize2 size={17} /></div><strong>Selecione um elemento</strong><p>Clique em um bloco no canvas para editar suas propriedades.</p></div>}
          <div className="inspector-footer"><div className="status-line"><span className="online-dot" /> Projeto salvo no navegador</div><button className="plain-icon" title="Mais opções"><MoreHorizontal size={16} /></button></div>
        </aside>}
      </div>
      <input key={fileInputKey} ref={fileInputRef} type="file" accept="application/json,.json" className="sr-only" onChange={importJson} />
      <button className="import-fab" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Importar JSON</button>
    </main>
  );
}
