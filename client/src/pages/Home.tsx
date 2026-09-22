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
  List,
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
  Star,
  Tablet,
  Tags,
  Table,
  Trash2,
  Type,
  Undo2,
  Upload,
  UserCircle,
  X,
} from "lucide-react";
import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  alignPatches,
  applyPatches,
  ARTBOARDS,
  Block,
  BlockStyle,
  BlockType,
  blockTypeLabel,
  buildHtml,
  buildSvg,
  buildTailwind,
  clamp,
  createBlock,
  Device,
  distributePatches,
  downloadFilename,
  makeId,
  normalizeHex,
  normalizeProject,
  parseNum,
  ProjectFile,
  reorderById,
  selectionBounds,
  snap,
  SNAP_SIZE,
  STORAGE_KEY,
  WireframePage,
} from "@/lib/wireframe";

type ToolMode = "select" | "hand";
type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

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
  { type: "search", label: "Busca", hint: "Campo de busca", icon: Search, accent: "blue" },
  { type: "image", label: "Imagem", hint: "Placeholder", icon: ImageIcon, accent: "mint" },
  { type: "card", label: "Card", hint: "Container", icon: LayoutTemplate, accent: "yellow" },
  { type: "navbar", label: "Navegação", hint: "Menu superior", icon: Link2, accent: "lavender" },
  { type: "divider", label: "Divisor", hint: "Linha", icon: Minus, accent: "blue" },
  { type: "list", label: "Lista", hint: "Itens", icon: List, accent: "mint" },
  { type: "table", label: "Tabela", hint: "Dados", icon: Table, accent: "yellow" },
  { type: "badge", label: "Badge", hint: "Tag de status", icon: Tags, accent: "orange" },
  { type: "avatar", label: "Avatar", hint: "Foto/perfil", icon: UserCircle, accent: "lavender" },
  { type: "icon", label: "Ícone", hint: "Placeholder de ícone", icon: Star, accent: "pink" },
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
  const [selectedIds, setSelectedIds] = useState<string[]>(["heading-starter"]);
  // Histórico por página: trocar de página não apaga mais o undo/redo.
  const [pageHistory, setPageHistory] = useState<Record<string, { past: Block[][]; future: Block[][] }>>({});
  const [zoom, setZoom] = useState(75);
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [device, setDevice] = useState<Device>("desktop");
  const [showGrid, setShowGrid] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageDraft, setPageDraft] = useState("");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [clipboard, setClipboard] = useState<Block[]>([]);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    members: Array<{ id: string; origX: number; origY: number }>;
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
  const exportWrapRef = useRef<HTMLDivElement>(null);

  // Último selecionado = primário (painel de propriedades, resize, atalhos).
  const selectedId = selectedIds[selectedIds.length - 1] ?? "";
  const selectedBlock = useMemo(() => blocks.find((block) => block.id === selectedId) ?? null, [blocks, selectedId]);
  const selectedBlocks = useMemo(() => blocks.filter((block) => selectedIds.includes(block.id)), [blocks, selectedIds]);

  const artboard = ARTBOARDS[device];
  const ARTBOARD = artboard;
  const history = pageHistory[activePageId]?.past ?? [];
  const future = pageHistory[activePageId]?.future ?? [];

  // Refs espelham o estado para uso dentro de listeners globais (evita
  // re-assinar pointermove/keydown a cada pixel e closures obsoletas).
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const selectedRef = useRef(selectedBlock);
  selectedRef.current = selectedBlock;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const historiesRef = useRef(pageHistory);
  historiesRef.current = pageHistory;
  const activePageIdRef = useRef(activePageId);
  activePageIdRef.current = activePageId;
  const deviceRef = useRef(device);
  deviceRef.current = device;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const isPreviewRef = useRef(isPreview);
  isPreviewRef.current = isPreview;
  const undoRef = useRef(() => {});
  const redoRef = useRef(() => {});
  const saveProjectRef = useRef(() => {});
  const duplicateSelectedRef = useRef(() => {});
  const deleteSelectedRef = useRef(() => {});
  const selectAllRef = useRef(() => {});
  const moveSelectedByRef = useRef((_dx: number, _dy: number) => {});
  const updateSelectedRef = useRef((_patch: Partial<Block> | { style: Partial<BlockStyle> }) => {});
  const editingBlockIdRef = useRef<string | null>(null);
  editingBlockIdRef.current = editingBlockId;
  const copySelectionRef = useRef(() => {});
  const pasteClipboardRef = useRef(() => {});
  const duplicateInPlaceRef = useRef(() => {});
  const commitInlineEditRef = useRef(() => {});
  const editingTextRef = useRef(editingText);
  editingTextRef.current = editingText;
  const spaceHeldRef = useRef(spaceHeld);
  spaceHeldRef.current = spaceHeld;
  const panRef = useRef(panOffset);
  panRef.current = panOffset;

  const leftVisible = !isPreview && !leftCollapsed;
  const rightVisible = !isPreview && !rightCollapsed;

  function isTypingTarget(el: Element | EventTarget | null) {
    if (!el || !(el instanceof HTMLElement)) return false;
    return ["INPUT", "TEXTAREA"].includes(el.tagName) || el.isContentEditable;
  }

  const filteredCatalog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return componentCatalog;
    return componentCatalog.filter((item) => item.label.toLowerCase().includes(query) || item.hint.toLowerCase().includes(query) || item.type.toLowerCase().includes(query));
  }, [searchQuery]);

  // Espaço segurado ativa modo Pan (mão).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
        setToolMode("hand");
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
        setToolMode("select");
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Ctrl+roda do mouse para zoom.
  useEffect(() => {
    const el = artboardRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((prev) => clamp(Math.round(prev + (e.deltaY > 0 ? -4 : 4)), 25, 200));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Pan com Espaço+arraste.
  useEffect(() => {
    if (!spaceHeld) return;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;
    const onDown = (e: globalThis.PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      origX = panRef.current.x;
      origY = panRef.current.y;
    };
    const onMove = (e: globalThis.PointerEvent) => {
      setPanOffset({ x: Math.round(origX + (e.clientX - startX)), y: Math.round(origY + (e.clientY - startY)) });
    };
    window.addEventListener("pointerdown", onDown as EventListener);
    window.addEventListener("pointermove", onMove as EventListener);
    return () => { window.removeEventListener("pointerdown", onDown as EventListener); window.removeEventListener("pointermove", onMove as EventListener); };
  }, [spaceHeld]);

  // Fecha o menu Exportar ao clicar fora ou ao pressionar Escape
  useEffect(() => {
    if (!isExportOpen) return;
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (exportWrapRef.current && !exportWrapRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExportOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [isExportOpen]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const project = JSON.parse(stored) as ProjectFile;
      const loadedPages = project.pages?.length ? project.pages : [{ id: "page-home", name: "Home", blocks: project.blocks ?? starterBlocks }];
      const loadedActivePage = project.activePageId && loadedPages.some((page) => page.id === project.activePageId) ? project.activePageId : loadedPages[0].id;
      const loadedBlocks = loadedPages.find((page) => page.id === loadedActivePage)?.blocks ?? loadedPages[0].blocks ?? [];
      if (loadedPages.length) {
        setPages(loadedPages);
        setActivePageId(loadedActivePage);
        setBlocks(loadedBlocks);
        setProjectTitle(project.name || "Página inicial");
        setDevice(project.device || "desktop");
        setSelectedIds(loadedBlocks[0]?.id ? [loadedBlocks[0].id] : []);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Autosave com debounce: edições marcam "Não salvo" e a persistência
  // acontece 500ms após a última mudança (antes marcava "Salvo" no mesmo frame).
  useEffect(() => {
    setIsSaved(false);
    const timer = window.setTimeout(() => {
      try {
        const currentBlocks = blocksRef.current;
        const syncedPages = pages.map((page) => page.id === activePageId ? { ...page, blocks: currentBlocks } : page);
        const project: ProjectFile = { version: 1, name: projectTitle, device, blocks: currentBlocks, pages: syncedPages, activePageId };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
        setIsSaved(true);
      } catch {
        /* storage cheio/bloqueado: mantém "Não salvo" */
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [blocks, pages, activePageId, projectTitle, device]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !isTyping) {
        event.preventDefault();
        if (event.shiftKey) redoRef.current();
        else undoRef.current();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveProjectRef.current();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d" && !isTyping) {
        event.preventDefault();
        duplicateSelectedRef.current();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a" && !isTyping) {
        event.preventDefault();
        selectAllRef.current();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c" && !isTyping) {
        event.preventDefault();
        copySelectionRef.current();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v" && !isTyping) {
        event.preventDefault();
        pasteClipboardRef.current();
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "d" && !isTyping) {
        event.preventDefault();
        duplicateInPlaceRef.current();
      }
      const currents = selectedIdsRef.current
        .map((id) => blocksRef.current.find((block) => block.id === id))
        .filter((block): block is Block => block !== undefined);
      if (!isTyping && currents.length && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const step = event.shiftKey ? SNAP_SIZE : 1;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        moveSelectedByRef.current(dx, dy);
      }
      if (!isTyping && event.key.toLowerCase() === "v") setToolMode("select");
      if (!isTyping && event.key.toLowerCase() === "h") setToolMode("hand");
      if (!isTyping && event.key.toLowerCase() === "g") setShowGrid((show) => !show);
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIdsRef.current.length && !isTyping && !isPreviewRef.current) {
        event.preventDefault();
        deleteSelectedRef.current();
      }
      if (event.key === "Escape") {
        if (editingBlockIdRef.current) {
          commitInlineEdit();
        } else {
          setSelectedIds([]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!dragState) return;
    const dragId = dragState.id;
    const { startX, startY, members } = dragState;
    const grabbedOrig = members.find((m) => m.id === dragId) ?? members[0];
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const current = blocksRef.current;
      const dragged = current.find((block) => block.id === dragId);
      if (!dragged) return;
      const dims = ARTBOARDS[deviceRef.current];
      const deltaX = (event.clientX - startX) / (zoomRef.current / 100);
      const deltaY = (event.clientY - startY) / (zoomRef.current / 100);
      const rawX = clamp(Math.round(grabbedOrig.origX + deltaX), 0, dims.width - dragged.w);
      const rawY = clamp(Math.round(grabbedOrig.origY + deltaY), 0, dims.height - dragged.h);
      const peers = current.filter((block) => block.id !== dragId && !members.some((m) => m.id === block.id));
      const snapX = peers.find((peer) => Math.abs(peer.x - rawX) < 7 || Math.abs(peer.x + peer.w - (rawX + dragged.w)) < 7);
      const snapY = peers.find((peer) => Math.abs(peer.y - rawY) < 7 || Math.abs(peer.y + peer.h - (rawY + dragged.h)) < 7);
      const nextX = snapX ? (Math.abs(snapX.x - rawX) < 7 ? snapX.x : snapX.x + snapX.w - dragged.w) : snap(rawX);
      const nextY = snapY ? (Math.abs(snapY.y - rawY) < 7 ? snapY.y : snapY.y + snapY.h - dragged.h) : snap(rawY);
      // O grupo acompanha o deslocamento aplicado ao bloco arrastado.
      const shiftX = nextX - grabbedOrig.origX;
      const shiftY = nextY - grabbedOrig.origY;
      const byId = new Map(current.map((block) => [block.id, block] as const));
      setBlocks(current.map((block) => {
        const member = members.find((m) => m.id === block.id);
        if (!member) return block;
        const source = byId.get(block.id);
        if (!source) return block;
        return {
          ...block,
          x: clamp(Math.round(member.origX + shiftX), 0, dims.width - source.w),
          y: clamp(Math.round(member.origY + shiftY), 0, dims.height - source.h),
        };
      }));
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
  }, [dragState]);

  useEffect(() => {
    if (!resizeState) return;
    const { id, startX, startY, origW, origH, origX, origY, corner } = resizeState;
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const dims = ARTBOARDS[deviceRef.current];
      const deltaX = (event.clientX - startX) / (zoomRef.current / 100);
      const deltaY = (event.clientY - startY) / (zoomRef.current / 100);
      setBlocks((current) => current.map((block) => {
        if (block.id !== id) return block;
        if (corner === "sw") {
          const nextW = clamp(snap(origW - deltaX), 48, dims.width - origX);
          return { ...block, x: snap(origX + origW - nextW), w: nextW, h: clamp(snap(origH + deltaY), 3, dims.height - origY) };
        }
        return { ...block, w: clamp(snap(origW + deltaX), 48, dims.width - origX), h: clamp(snap(origH + deltaY), 3, dims.height - origY) };
      }));
    };
    const onPointerUp = () => setResizeState(null);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [resizeState]);

  function applyBlocks(next: Block[], recordHistory = true) {
    if (recordHistory) {
      const pageId = activePageIdRef.current;
      const prev = blocksRef.current;
      setPageHistory((current) => {
        const stack = current[pageId] ?? { past: [], future: [] };
        return { ...current, [pageId]: { past: [...stack.past.slice(-24), prev], future: [] } };
      });
    }
    setBlocks(next);
  }

  function undo() {
    const pageId = activePageIdRef.current;
    const stack = historiesRef.current[pageId]?.past ?? [];
    const previous = stack[stack.length - 1];
    if (!previous) return;
    setPageHistory((current) => {
      const entry = current[pageId] ?? { past: [], future: [] };
      return { ...current, [pageId]: { past: entry.past.slice(0, -1), future: [blocksRef.current, ...entry.future] } };
    });
    setBlocks(previous);
  }

  function redo() {
    const pageId = activePageIdRef.current;
    const stack = historiesRef.current[pageId]?.future ?? [];
    const next = stack[0];
    if (!next) return;
    setPageHistory((current) => {
      const entry = current[pageId] ?? { past: [], future: [] };
      return { ...current, [pageId]: { past: [...entry.past, blocksRef.current], future: entry.future.slice(1) } };
    });
    setBlocks(next);
  }

  function addBlock(type: BlockType) {
    const current = blocksRef.current;
    const dims = ARTBOARDS[deviceRef.current];
    const block = createBlock(type, current.length, dims.width, dims.height);
    applyBlocks([...current, block]);
    setSelectedIds([block.id]);
    toast.success(`${blockTypeLabel(type)} adicionado`, { description: "Arraste o bloco para posicionar." });
  }

  function updateSelected(patch: Partial<Block> | { style: Partial<BlockStyle> }) {
    const current = selectedRef.current;
    if (!current) return;
    const next = blocksRef.current.map((block) => {
      if (block.id !== current.id) return block;
      if ("style" in patch) return { ...block, style: { ...block.style, ...patch.style } };
      return { ...block, ...patch };
    });
    applyBlocks(next);
  }

  function deleteSelected() {
    const ids = selectedIdsRef.current;
    if (!ids.length) return;
    applyBlocks(blocksRef.current.filter((block) => !ids.includes(block.id)));
    setSelectedIds([]);
    toast(ids.length > 1 ? `${ids.length} blocos removidos` : "Bloco removido");
  }

  function duplicateSelected() {
    const ids = selectedIdsRef.current;
    if (!ids.length) return;
    const dims = ARTBOARDS[deviceRef.current];
    const copies = blocksRef.current
      .filter((block) => ids.includes(block.id))
      .map((block) => ({
        ...block,
        id: makeId(),
        x: clamp(block.x + 24, 0, dims.width - block.w),
        y: clamp(block.y + 24, 0, dims.height - block.h),
      }));
    applyBlocks([...blocksRef.current, ...copies]);
    setSelectedIds(copies.map((block) => block.id));
    toast.success(copies.length > 1 ? `${copies.length} blocos duplicados` : "Bloco duplicado");
  }

  function selectAll() {
    const ids = blocksRef.current.map((block) => block.id);
    if (ids.length) setSelectedIds(ids);
  }

  function moveSelectedBy(dx: number, dy: number) {
    const ids = selectedIdsRef.current;
    if (!ids.length || (dx === 0 && dy === 0)) return;
    const dims = ARTBOARDS[deviceRef.current];
    const next = blocksRef.current.map((block) => {
      if (!ids.includes(block.id)) return block;
      return {
        ...block,
        x: clamp(Math.round(block.x + dx), 0, dims.width - block.w),
        y: clamp(Math.round(block.y + dy), 0, dims.height - block.h),
      };
    });
    applyBlocks(next);
  }

  function copySelection() {
    const ids = selectedIdsRef.current;
    const list = blocksRef.current.filter((block) => ids.includes(block.id));
    if (list.length) setClipboard(list.map((b) => ({ ...b })));
  }

  function pasteClipboard() {
    if (!clipboard.length) return;
    const dims = ARTBOARDS[deviceRef.current];
    const offset = 24;
    const copies = clipboard.map((block) => {
      const c = { ...block, id: makeId() };
      // Tenta posicionar ao lado direito; se não cabe, tenta abaixo.
      let nx = clamp(block.x + offset, 0, dims.width - c.w);
      let ny = block.y;
      if (nx + c.w > dims.width) {
        nx = 0;
        ny = clamp(block.y + offset, 0, dims.height - c.h);
      }
      c.x = nx;
      c.y = ny;
      return c;
    });
    applyBlocks([...blocksRef.current, ...copies]);
    setSelectedIds(copies.map((c) => c.id));
    toast.success(copies.length > 1 ? `${copies.length} blocos colados` : "Bloco colado");
  }

  function duplicateInPlace() {
    const ids = selectedIdsRef.current;
    if (!ids.length) return;
    const copies = blocksRef.current
      .filter((block) => ids.includes(block.id))
      .map((block) => ({ ...block, id: makeId() }));
    applyBlocks([...blocksRef.current, ...copies]);
    setSelectedIds(copies.map((c) => c.id));
    toast.success(copies.length > 1 ? `${copies.length} blocos duplicados` : "Bloco duplicado");
  }

  function startInlineEdit(blockId: string) {
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (!block) return;
    setEditingBlockId(blockId);
    setEditingText(block.label);
  }

  function commitInlineEdit() {
    const id = editingBlockIdRef.current;
    if (!id) return;
    const text = editingTextRef.current;
    applyBlocks(blocksRef.current.map((b) => (b.id === id ? { ...b, label: text } : b)));
    setEditingBlockId(null);
  }

  function cancelInlineEdit() {
    setEditingBlockId(null);
  }

  // Expõe as ações aos listeners globais registrados uma única vez.
  undoRef.current = undo;
  redoRef.current = redo;
  saveProjectRef.current = saveProject;
  duplicateSelectedRef.current = duplicateSelected;
  deleteSelectedRef.current = deleteSelected;
  updateSelectedRef.current = updateSelected;
  selectAllRef.current = selectAll;
  moveSelectedByRef.current = moveSelectedBy;
  copySelectionRef.current = copySelection;
  pasteClipboardRef.current = pasteClipboard;
  duplicateInPlaceRef.current = duplicateInPlace;
  commitInlineEditRef.current = commitInlineEdit;

  function handleBlockPointerDown(event: PointerEvent<HTMLDivElement>, block: Block) {
    if (isPreview || toolMode === "hand") return;
    event.stopPropagation();
    if (event.shiftKey) {
      // Shift+clique alterna o bloco no grupo sem iniciar arraste.
      setSelectedIds((current) =>
        current.includes(block.id) ? current.filter((id) => id !== block.id) : [...current, block.id],
      );
      return;
    }
    const group = selectedIds.includes(block.id) && selectedIds.length > 1
      ? blocks.filter((item) => selectedIds.includes(item.id))
      : [block];
    if (!selectedIds.includes(block.id)) setSelectedIds([block.id]);
    setDragState({
      id: block.id,
      startX: event.clientX,
      startY: event.clientY,
      members: group.map((item) => ({ id: item.id, origX: item.x, origY: item.y })),
    });
  }

  function exportJson() {
    const syncedPages = pages.map((page) => page.id === activePageId ? { ...page, blocks } : page);
    const file: ProjectFile = { version: 1, name: projectTitle, device, blocks, pages: syncedPages, activePageId };
    download(downloadFilename(projectTitle, "json"), JSON.stringify(file, null, 2), "application/json");
    setIsExportOpen(false);
    toast.success("Arquivo JSON exportado");
  }

  function createSvg() {
    return buildSvg(blocks, ARTBOARD.width, ARTBOARD.height);
  }

  function exportSvg() {
    download(downloadFilename(projectTitle, "svg"), createSvg(), "image/svg+xml");
    setIsExportOpen(false);
    toast.success("SVG exportado");
  }

  function exportHtml() {
    download(downloadFilename(projectTitle, "html"), buildHtml(blocks, ARTBOARD.width, ARTBOARD.height, projectTitle), "text/html");
    setIsExportOpen(false);
    toast.success("HTML exportado");
  }

  function exportTailwind() {
    download(downloadFilename(projectTitle, "html"), buildTailwind(blocks, ARTBOARD.width, ARTBOARD.height, projectTitle), "text/html");
    setIsExportOpen(false);
    toast.success("HTML+Tailwind exportado");
  }

  function exportPng() {
    exportPngFromBlocks(blocksRef.current, ARTBOARD.width, ARTBOARD.height, 0, 0, downloadFilename(projectTitle, "png"));
  }

  function exportSelectionPng() {
    const ids = selectedIdsRef.current;
    const list = blocksRef.current.filter((block) => ids.includes(block.id));
    if (!list.length) return toast("Selecione ao menos um bloco");
    const box = selectionBounds(list);
    if (!box) return;
    const pad = 16;
    const ox = Math.max(0, Math.round(box.x - pad));
    const oy = Math.max(0, Math.round(box.y - pad));
    const w = Math.min(ARTBOARD.width - ox, Math.ceil(box.w + pad * 2));
    const h = Math.min(ARTBOARD.height - oy, Math.ceil(box.h + pad * 2));
    exportPngFromBlocks(list, w, h, ox, oy, downloadFilename(`${projectTitle}-selecao`, "png"));
  }

  function exportPngFromBlocks(list: Block[], width: number, height: number, offsetX: number, offsetY: number, filename: string) {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = Math.max(1, width * scale);
    canvas.height = Math.max(1, height * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      const radius = Math.max(0, Math.min(r, w / 2, h / 2));
      context.beginPath();
      // Usa a API nativa quando disponível, com fallback manual para browsers antigos
      const native = (context as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect;
      if (typeof native === "function") {
        native.call(context, x, y, w, h, radius);
        return;
      }
      context.moveTo(x + radius, y);
      context.lineTo(x + w - radius, y);
      context.arcTo(x + w, y, x + w, y + radius, radius);
      context.lineTo(x + w, y + h - radius);
      context.arcTo(x + w, y + h, x + w - radius, y + h, radius);
      context.lineTo(x + radius, y + h);
      context.arcTo(x, y + h, x, y + h - radius, radius);
      context.lineTo(x, y + radius);
      context.arcTo(x, y, x + radius, y, radius);
      context.closePath();
    };
    context.scale(scale, scale);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    list.forEach((block) => {
      const bx = block.x - offsetX;
      const by = block.y - offsetY;
      context.fillStyle = block.style.fill;
      context.strokeStyle = block.style.border;
      context.lineWidth = 1;
      drawRoundRect(bx, by, block.w, block.h, block.style.radius);
      context.fill();
      context.stroke();
      if (block.type === "image") {
        context.strokeStyle = block.style.text;
        context.globalAlpha = 0.65;
        context.beginPath();
        context.moveTo(bx + 18, by + block.h - 20);
        context.lineTo(bx + block.w * 0.42, by + block.h * 0.46);
        context.lineTo(bx + block.w * 0.64, by + block.h * 0.68);
        context.lineTo(bx + block.w - 18, by + 32);
        context.stroke();
        context.globalAlpha = 1;
        return;
      }
      context.fillStyle = block.style.text;
      context.font = `${block.type === "heading" ? "700 30px" : block.type === "button" ? "500 14px" : "500 16px"} Arial`;
      context.textAlign = block.type === "button" ? "center" : "left";
      block.label.split("\n").forEach((line, index) => context.fillText(line, bx + (block.type === "button" ? block.w / 2 : 18), by + 30 + index * 22));
    });
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Não foi possível gerar o PNG");
        return;
      }
      download(filename, blob, "image/png");
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
        const imported = normalizeProject(JSON.parse(String(reader.result)));
        setProjectTitle(imported.name);
        setDevice(imported.device);
        setZoom(ARTBOARDS[imported.device].zoom);
        setPages(imported.pages);
        setActivePageId(imported.activePageId);
        setBlocks(imported.blocks);
        setSelectedIds(imported.blocks[0]?.id ? [imported.blocks[0].id] : []);
        setPageHistory({});
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
    try {
      const current = blocksRef.current;
      const syncedPages = pages.map((page) => page.id === activePageId ? { ...page, blocks: current } : page);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, name: projectTitle, device, blocks: current, pages: syncedPages, activePageId } satisfies ProjectFile));
      setIsSaved(true);
      toast.success("Alterações salvas localmente");
    } catch {
      toast.error("Não foi possível salvar", { description: "Armazenamento local indisponível ou cheio." });
    }
  }

  function updateDevice(nextDevice: Device) {
    setDevice(nextDevice);
    setZoom(ARTBOARDS[nextDevice].zoom);
  }

  function switchPage(pageId: string) {
    const nextPage = pages.find((page) => page.id === pageId);
    if (!nextPage || pageId === activePageId) return;
    setPages((current) => current.map((page) => page.id === activePageId ? { ...page, blocks: blocksRef.current } : page));
    setActivePageId(pageId);
    setBlocks(nextPage.blocks);
    setSelectedIds(nextPage.blocks[0]?.id ? [nextPage.blocks[0].id] : []);
    // O histórico da página anterior é preservado em pageHistory.
  }

  function addPage() {
    const page: WireframePage = { id: makeId("page"), name: `Página ${pages.length + 1}`, blocks: [] };
    setPages((current) => [...current.map((item) => item.id === activePageId ? { ...item, blocks: blocksRef.current } : item), page]);
    setActivePageId(page.id);
    setBlocks([]);
    setSelectedIds([]);
    toast.success("Nova página criada");
    setEditingPageId(page.id);
    setPageDraft(page.name);
  }

  function commitPageRename(pageId: string) {
    const name = pageDraft.trim();
    if (name) {
      setPages((current) => current.map((item) => item.id === pageId ? { ...item, name: name.slice(0, 40) } : item));
    }
    setEditingPageId(null);
  }

  function deletePage(pageId: string) {
    if (pages.length <= 1) return toast("Mantenha pelo menos uma página");
    const remaining = pages.filter((page) => page.id !== pageId);
    const nextPage = remaining[0];
    setPages(remaining);
    if (pageId === activePageId) {
      setActivePageId(nextPage.id);
      setBlocks(nextPage.blocks);
      setSelectedIds(nextPage.blocks[0]?.id ? [nextPage.blocks[0].id] : []);
    }
    if (editingPageId === pageId) setEditingPageId(null);
    setPageHistory((current) => {
      const { [pageId]: _removed, ...rest } = current;
      return rest;
    });
    toast("Página removida");
  }

  function moveLayer(fromId: string, toId: string) {
    const current = blocksRef.current;
    const next = reorderById(current, fromId, toId);
    if (next === current) return;
    applyBlocks(next);
  }

  function alignSelected(alignment: AlignMode) {
    const ids = selectedIdsRef.current;
    if (!ids.length) return;
    const dims = ARTBOARDS[deviceRef.current];
    const patches = alignPatches(blocksRef.current, ids, alignment, dims.width, dims.height);
    if (!Object.keys(patches).length) return;
    applyBlocks(applyPatches(blocksRef.current, patches));
    toast.success(ids.length > 1 ? "Elementos alinhados" : "Elemento alinhado ao canvas");
  }

  function distributeSelected(axis: "x" | "y") {
    const ids = selectedIdsRef.current;
    if (ids.length < 3) return toast("Selecione 3 ou mais elementos para distribuir");
    const patches = distributePatches(blocksRef.current, ids, axis);
    if (!Object.keys(patches).length) return;
    applyBlocks(applyPatches(blocksRef.current, patches));
    toast.success("Elementos distribuídos");
  }

  return (
    <main className={`studio-shell ${toolMode === "hand" || spaceHeld ? "tool-hand" : ""} ${spaceHeld ? "panning" : ""}`}>
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
          <div className="export-wrap" ref={exportWrapRef}>
            <button className="button-primary" onClick={() => setIsExportOpen((open) => !open)} aria-expanded={isExportOpen} aria-haspopup="menu"><Download size={15} /> Exportar <ChevronDown size={14} /></button>
            {isExportOpen && <div className="export-menu" role="menu">
              <button onClick={exportPng}><ImageIcon size={15} /><span>Exportar PNG</span><small>imagem</small></button>
              {selectedIds.length > 0 && <button onClick={exportSelectionPng}><ImageIcon size={15} /><span>Seleção PNG</span><small>{selectedIds.length} bloco(s)</small></button>}
              <button onClick={exportSvg}><FileText size={15} /><span>Exportar SVG</span><small>vetor</small></button>
              <button onClick={exportHtml}><FileText size={15} /><span>Exportar HTML</span><small>CSS puro</small></button>
              <button onClick={exportTailwind}><FileText size={15} /><span>Exportar Tailwind</span><small>HTML+CSS</small></button>
              <button onClick={exportJson}><FileJson size={15} /><span>Exportar JSON</span><small>editável</small></button>
            </div>}
          </div>
          <button className="avatar-button" aria-label="Perfil" title="Projeto local — sem conta" onClick={() => toast("Projeto 100% local", { description: "Nenhuma conta necessária. Use Exportar para backup." })}>ML</button>
        </div>
      </header>

      <div className={`workspace ${isPreview ? "is-preview" : ""} ${!leftVisible ? "hide-left" : ""} ${!rightVisible ? "hide-right" : ""}`}>
        {leftVisible ? <aside className="left-sidebar">
          <div className="sidebar-heading-row"><div><p className="eyebrow">BIBLIOTECA</p><h2>Componentes</h2></div><button className="plain-icon" onClick={() => setLeftCollapsed(true)} title="Fechar painel lateral"><PanelLeft size={15} /></button></div>
          <div className="search-field"><Search size={15} /><input placeholder="Buscar componente" aria-label="Buscar componente" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />{searchQuery && <button className="search-clear" onClick={() => setSearchQuery("")} aria-label="Limpar busca"><X size={13} /></button>}</div>
          <div className="component-grid">
            {filteredCatalog.length === 0 ? <p className="search-empty">Nenhum componente para “{searchQuery}”.</p> : filteredCatalog.map((item) => {
              const Icon = item.icon;
              return <button className="component-card" key={item.type} onClick={() => addBlock(item.type)} draggable onDragStart={(event) => event.dataTransfer.setData("application/wireframe-type", item.type)}>
                <span className={`component-icon ${item.accent}`}><Icon size={18} strokeWidth={1.8} /></span>
                <span className="component-label"><strong>{item.label}</strong><small>{item.hint}</small></span>
                <Plus className="component-plus" size={14} />
              </button>;
            })}
          </div>
          <div className="sidebar-tip"><Sparkles size={15} /><div><strong>Dica rápida</strong><p>Clique para adicionar. Arraste para posicionar.</p></div></div>
          <div className="layers-block"><div className="sidebar-heading-row compact"><p className="eyebrow">CAMADAS <span>{blocks.length}</span></p><button className="plain-icon" onClick={() => setSelectedIds([])} title="Limpar seleção"><X size={14} /></button></div><div className="layer-list">{blocks.length === 0 ? <p className="search-empty">Canvas vazio — adicione um componente.</p> : blocks.slice().reverse().map((block) => <button key={block.id} className={`layer-row ${selectedIds.includes(block.id) ? "selected" : ""}`} draggable onDragStart={(event) => { event.dataTransfer.setData("application/wireframe-layer", block.id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const fromId = event.dataTransfer.getData("application/wireframe-layer"); if (fromId) moveLayer(fromId, block.id); }} onClick={(event) => { if (event.shiftKey) setSelectedIds((current) => current.includes(block.id) ? current.filter((id) => id !== block.id) : [...current, block.id]); else setSelectedIds([block.id]); }} title="Arraste para reordenar. Shift+clique para seleção múltipla"><span className="layer-type-icon"><Layers3 size={14} /></span><span>{blockTypeLabel(block.type)}</span><span className="layer-dots">···</span></button>)}</div></div>
          <div className="pages-block"><div className="sidebar-heading-row compact"><p className="eyebrow">PÁGINAS <span>{pages.length}</span></p><button className="plain-icon" onClick={addPage} title="Nova página"><Plus size={15} /></button></div><div className="page-list">{pages.map((page) => <div key={page.id} className={`page-row ${page.id === activePageId ? "selected" : ""}`}>{editingPageId === page.id ? <input className="page-rename-input" autoFocus value={pageDraft} onChange={(event) => setPageDraft(event.target.value)} onBlur={() => commitPageRename(page.id)} onKeyDown={(event) => { if (event.key === "Enter") commitPageRename(page.id); if (event.key === "Escape") setEditingPageId(null); }} onClick={(event) => event.stopPropagation()} aria-label="Nome da página" maxLength={40} /> : <button onClick={() => switchPage(page.id)} onDoubleClick={() => { setEditingPageId(page.id); setPageDraft(page.name); }} title="Duplo clique para renomear"><FileText size={13} /><span>{page.name}</span><small>{page.blocks.length}</small></button>}<div className="page-actions"><button onClick={() => { setEditingPageId(page.id); setPageDraft(page.name); }} title="Renomear página"><MoreHorizontal size={13} /></button><button onClick={() => deletePage(page.id)} title="Excluir página"><Trash2 size={12} /></button></div></div>)}</div></div>
        </aside> : null}
        {!leftVisible && !isPreview && <button className="sidebar-rail left" onClick={() => setLeftCollapsed(false)} title="Abrir biblioteca"><PanelLeft size={15} /></button>}

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
            <div className="canvas-stage-wrap" style={{ width: ARTBOARD.width * (zoom / 100), height: ARTBOARD.height * (zoom / 100), transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
              <div ref={artboardRef} className={`artboard ${showGrid && !isPreview ? "with-grid" : ""}`} style={{ width: ARTBOARD.width, height: ARTBOARD.height, transform: `scale(${zoom / 100})` }} onPointerDown={() => { if (!isPreview) setSelectedIds([]); }} onDragOver={(event) => { if (!isPreview) event.preventDefault(); }} onDrop={(event) => { if (isPreview) return; const type = event.dataTransfer.getData("application/wireframe-type") as BlockType; if (type) addBlock(type); }}>
                {!isPreview && <div className="artboard-meta"><span>{projectTitle.toUpperCase()} / {device.toUpperCase()}</span><span>{ARTBOARD.width} × {ARTBOARD.height}</span></div>}
                {blocks.map((block) => <div key={block.id} className={`wire-block block-${block.type} ${selectedIds.includes(block.id) && !isPreview ? "selected" : ""}`} style={{ left: block.x, top: block.y, width: block.w, height: block.h, backgroundColor: block.style.fill, borderColor: block.style.border, color: block.style.text, borderRadius: block.style.radius }} onPointerDown={(event) => handleBlockPointerDown(event, block)} onDoubleClick={() => { if (!isPreview) startInlineEdit(block.id); }}>
                  {editingBlockId === block.id ? <textarea className="inline-edit" autoFocus value={editingText} onChange={(event) => setEditingText(event.target.value)} onBlur={commitInlineEdit} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); commitInlineEdit(); } if (event.key === "Escape") cancelInlineEdit(); }} style={{ fontSize: block.type === "heading" ? 30 : block.type === "button" ? 14 : 16, fontWeight: block.type === "heading" ? 700 : 500, color: block.style.text, textAlign: block.type === "button" ? "center" : "left" }} aria-label="Editar conteúdo do bloco" /> : <>
                  {selectedIds.length === 1 && selectedId === block.id && !isPreview && <div className="selection-label"><span>{blockTypeLabel(block.type)}</span><span>{Math.round(block.w)} × {Math.round(block.h)}</span></div>}
                  {block.type === "image" ? <><div className="image-sun" /><div className="image-mountains" /><span className="block-content image-label">{block.label}</span></>
                    : block.type === "input" ? <><span className="input-dot" /> <span className="block-content">{block.label}</span></>
                    : block.type === "divider" ? null
                    : block.type === "search" ? <div className="block-content search-content"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={block.style.text} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>{block.label}</div>
                    : block.type === "badge" ? <div className="block-content badge-content">{block.label}</div>
                    : block.type === "avatar" ? <div className="block-content avatar-content">{block.label.slice(0, 2).toUpperCase()}</div>
                    : block.type === "icon" ? <div className="block-content icon-content">{block.label}</div>
                    : block.type === "list" ? <div className="block-content list-content">{block.label.split("\n").filter(Boolean).map((item, i) => <div key={i} className="list-item"><span className="list-bullet" />{item}</div>)}</div>
                    : block.type === "table" ? (() => { const rows = block.label.split("\n").filter(Boolean); const headers = rows[0]?.split("|").map((c) => c.trim()) ?? []; return <div className="block-content table-content"><div className="table-head">{headers.map((h, i) => <span key={i}>{h}</span>)}</div>{rows.slice(1).map((row, ri) => <div key={ri} className="table-row">{row.split("|").map((c, ci) => <span key={ci}>{c.trim()}</span>)}</div>)}</div>; })()
                    : <span className="block-content">{block.label}</span>}
                  {selectedIds.length === 1 && selectedId === block.id && !isPreview && <><span className="resize-handle handle-se" onPointerDown={(event) => { event.stopPropagation(); setResizeState({ id: block.id, startX: event.clientX, startY: event.clientY, origW: block.w, origH: block.h, origX: block.x, origY: block.y, corner: "se" }); }} /><span className="resize-handle handle-sw" onPointerDown={(event) => { event.stopPropagation(); setResizeState({ id: block.id, startX: event.clientX, startY: event.clientY, origW: block.w, origH: block.h, origX: block.x, origY: block.y, corner: "sw" }); }} /></>}
                </>}
                </div>)}
              </div>
            </div>
            {!isPreview && <div className="canvas-hint"><Move size={13} /> Arraste para mover · Shift+clique para seleção múltipla</div>}
          </div>
          {isPreview && <div className="preview-badge"><Eye size={14} /> Modo preview — {blocks.length} bloco(s) <button onClick={() => setIsPreview(false)} aria-label="Sair do preview"><X size={13} /></button></div>}
        </section>

        {rightVisible ? <aside className="right-sidebar">
          <div className="inspector-header"><div><p className="eyebrow">PROPRIEDADES</p><h2>{selectedBlocks.length > 1 ? `${selectedBlocks.length} elementos` : selectedBlock ? blockTypeLabel(selectedBlock.type) : "Nenhuma seleção"}</h2></div><button className="plain-icon" onClick={() => setRightCollapsed(true)} title="Fechar propriedades"><PanelRight size={15} /></button></div>
          {selectedBlocks.length > 1 ? <div className="inspector-content">
            <div className="inspector-section first"><div className="section-title"><span>Seleção múltipla</span><span className="section-kicker">{selectedBlocks.length} blocos</span></div>
              <p className="alignment-hint">Arraste qualquer bloco do grupo para mover todos. Shift+clique remove um bloco do grupo.</p>
            </div>
            <div className="inspector-section alignment-section"><div className="section-title"><span>Alinhamento</span><Move size={13} /></div><div className="alignment-grid"><button onClick={() => alignSelected("left")} title="Alinhar à esquerda">←</button><button onClick={() => alignSelected("center")} title="Centralizar horizontalmente">↔</button><button onClick={() => alignSelected("right")} title="Alinhar à direita">→</button><button onClick={() => alignSelected("top")} title="Alinhar ao topo">↑</button><button onClick={() => alignSelected("middle")} title="Centralizar verticalmente">↕</button><button onClick={() => alignSelected("bottom")} title="Alinhar à base">↓</button></div><div className="section-title" style={{ marginTop: 8 }}><span>Distribuir</span></div><div className="alignment-grid distribute-grid"><button onClick={() => distributeSelected("x")} title="Distribuir horizontalmente">⇹</button><button onClick={() => distributeSelected("y")} title="Distribuir verticalmente">⇅</button></div><p className="alignment-hint">Alinha dentro do grupo. Com 1 bloco, alinha ao canvas.</p></div>
            <div className="inspector-actions"><button onClick={duplicateSelected}><Copy size={14} /> Duplicar ({selectedBlocks.length})</button><button className="danger" onClick={deleteSelected}><Trash2 size={14} /> Remover ({selectedBlocks.length})</button></div>
          </div> : selectedBlock ? <div className="inspector-content">
            <div className="inspector-section first"><div className="section-title"><span>Conteúdo</span><span className="section-kicker">{selectedBlock.id.slice(0, 8)}</span></div>
              <textarea className="content-input" rows={selectedBlock.type === "heading" ? 3 : 2} value={selectedBlock.label} onChange={(event) => updateSelected({ label: event.target.value })} aria-label="Conteúdo do bloco" />
            </div>
            <div className="inspector-section"><div className="section-title"><span>Posição e tamanho</span><Lock size={13} /></div>
              <div className="field-grid"><label><span>X</span><input type="number" value={Math.round(selectedBlock.x)} onChange={(event) => updateSelected({ x: clamp(parseNum(event.target.value, selectedBlock.x), 0, ARTBOARD.width - selectedBlock.w) })} /></label><label><span>Y</span><input type="number" value={Math.round(selectedBlock.y)} onChange={(event) => updateSelected({ y: clamp(parseNum(event.target.value, selectedBlock.y), 0, ARTBOARD.height - selectedBlock.h) })} /></label><label><span>W</span><input type="number" min={8} value={Math.round(selectedBlock.w)} onChange={(event) => updateSelected({ w: clamp(parseNum(event.target.value, selectedBlock.w), 8, ARTBOARD.width - selectedBlock.x) })} /></label><label><span>H</span><input type="number" min={3} value={Math.round(selectedBlock.h)} onChange={(event) => updateSelected({ h: clamp(parseNum(event.target.value, selectedBlock.h), 3, ARTBOARD.height - selectedBlock.y) })} /></label></div>
            </div>
            <div className="inspector-section"><div className="section-title"><span>Aparência</span><Palette size={13} /></div>
              <div className="color-row"><span>Fundo</span><label className="color-picker"><input type="color" value={normalizeHex(selectedBlock.style.fill, "#ffffff")} onChange={(event) => updateSelected({ style: { fill: event.target.value } })} /><span style={{ backgroundColor: selectedBlock.style.fill }} /><code>{selectedBlock.style.fill.toUpperCase()}</code></label></div>
              <div className="color-row"><span>Contorno</span><label className="color-picker"><input type="color" value={normalizeHex(selectedBlock.style.border, "#d7d9e0")} onChange={(event) => updateSelected({ style: { border: event.target.value } })} /><span style={{ backgroundColor: selectedBlock.style.border }} /><code>{selectedBlock.style.border.toUpperCase()}</code></label></div>
              <div className="color-row"><span>Texto</span><label className="color-picker"><input type="color" value={normalizeHex(selectedBlock.style.text, "#242631")} onChange={(event) => updateSelected({ style: { text: event.target.value } })} /><span style={{ backgroundColor: selectedBlock.style.text }} /><code>{selectedBlock.style.text.toUpperCase()}</code></label></div>
              <label className="range-row"><span>Raio <strong>{selectedBlock.style.radius}px</strong></span><input type="range" min="0" max="28" value={selectedBlock.style.radius} onChange={(event) => updateSelected({ style: { radius: Number(event.target.value) } })} /></label>
            </div>
            <div className="inspector-section alignment-section"><div className="section-title"><span>Alinhamento</span><Move size={13} /></div><div className="alignment-grid"><button onClick={() => alignSelected("left")} title="Alinhar à esquerda do canvas">←</button><button onClick={() => alignSelected("center")} title="Centralizar no canvas">↔</button><button onClick={() => alignSelected("right")} title="Alinhar à direita do canvas">→</button><button onClick={() => alignSelected("top")} title="Alinhar ao topo do canvas">↑</button><button onClick={() => alignSelected("middle")} title="Centralizar verticalmente no canvas">↕</button><button onClick={() => alignSelected("bottom")} title="Alinhar à base do canvas">↓</button></div><p className="alignment-hint">Com 1 bloco, alinha ao canvas. Selecione vários (Shift+clique) para alinhar em grupo.</p></div>
            <div className="inspector-actions"><button onClick={duplicateSelected}><Copy size={14} /> Duplicar</button><button className="danger" onClick={deleteSelected}><Trash2 size={14} /> Remover</button></div>
          </div> : <div className="empty-inspector"><div className="empty-inspector-icon"><Maximize2 size={17} /></div><strong>Selecione um elemento</strong><p>Clique em um bloco no canvas para editar suas propriedades.</p></div>}
          <div className="inspector-footer"><div className="status-line"><span className="online-dot" /> Projeto salvo no navegador</div><button className="plain-icon" title="Salvar agora" onClick={saveProject}><Download size={15} /></button></div>
        </aside> : null}
        {!rightVisible && !isPreview && <button className="sidebar-rail right" onClick={() => setRightCollapsed(false)} title="Abrir propriedades"><PanelRight size={15} /></button>}
      </div>
      <input key={fileInputKey} ref={fileInputRef} type="file" accept="application/json,.json" className="sr-only" onChange={importJson} />
      <button className={`import-fab ${!rightVisible ? "fab-full" : ""}`} onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Importar JSON</button>
    </main>
  );
}
