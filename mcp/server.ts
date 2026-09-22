/**
 * MCP server para o wireframe-local.
 *
 * Expoe o formato de projeto JSON do editor (o mesmo que o botao "Exportar > JSON"
 * gera e que "Importar .JSON" le) como ferramentas MCP, para que agentes de IA
 * criem e editem wireframes sem precisar de browser: listar/ler/criar projetos,
 * acrescentar/alterar/remover blocos, gerir paginas e renderizar SVG.
 *
 * Transporte: stdio (o agente lanca o processo). Diretorio de projetos:
 *   $WIREFRAME_PROJECTS_DIR  (default: ./wireframe-projects relativo ao CWD)
 *
 * Uso:  pnpm mcp          (ou: tsx mcp/server.ts)
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const PROJECTS_DIR = path.resolve(
  process.env.WIREFRAME_PROJECTS_DIR || "./wireframe-projects",
);

const BLOCK_TYPES = [
  "heading",
  "text",
  "button",
  "input",
  "image",
  "card",
  "navbar",
  "divider",
] as const;
type BlockType = (typeof BLOCK_TYPES)[number];

const DEVICES = ["desktop", "tablet", "mobile"] as const;
type Device = (typeof DEVICES)[number];

type BlockStyle = { fill: string; border: string; text: string; radius: number };
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
type WireframePage = { id: string; name: string; blocks: Block[] };
type ProjectFile = {
  version: 1;
  name: string;
  device: Device;
  blocks: Block[];
  pages?: WireframePage[];
  activePageId?: string;
};

const DEFAULT_STYLE: BlockStyle = {
  fill: "#ffffff",
  border: "#d7d9e0",
  text: "#242631",
  radius: 12,
};

const DEFAULT_SIZE: Record<BlockType, { w: number; h: number }> = {
  heading: { w: 420, h: 64 },
  text: { w: 420, h: 88 },
  button: { w: 168, h: 44 },
  input: { w: 280, h: 44 },
  image: { w: 320, h: 200 },
  card: { w: 320, h: 200 },
  navbar: { w: 996, h: 64 },
  divider: { w: 420, h: 2 },
};

/* ---------- helpers de filesystem (confina ao PROJECTS_DIR) ---------- */

function safePath(file: unknown): string {
  if (typeof file !== "string" || file.trim() === "") {
    throw new Error("'file' deve ser uma string nao-vazia");
  }
  const name = file.endsWith(".json") ? file : `${file}.json`;
  const p = path.resolve(PROJECTS_DIR, name);
  const rel = path.relative(PROJECTS_DIR, p);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Caminho fora do diretorio de projetos: ${file}`);
  }
  return p;
}

function fileNameOf(p: string): string {
  return path.relative(PROJECTS_DIR, p);
}

async function loadProject(file: unknown): Promise<{ p: ProjectFile; path: string }> {
  const p = safePath(file);
  let raw: string;
  try {
    raw = await readFile(p, "utf8");
  } catch {
    throw new Error(`Projeto nao encontrado: ${fileNameOf(p)}`);
  }
  let data: ProjectFile;
  try {
    data = JSON.parse(raw) as ProjectFile;
  } catch {
    throw new Error(`JSON invalido em ${fileNameOf(p)}`);
  }
  if (!data || data.version !== 1 || !Array.isArray(data.blocks)) {
    throw new Error(`${fileNameOf(p)} nao e um projeto wireframe-local (version:1)`);
  }
  return { p: data, path: p };
}

async function saveProject(p: ProjectFile, file: string): Promise<string> {
  await mkdir(PROJECTS_DIR, { recursive: true });
  const target = safePath(file);
  await writeFile(target, JSON.stringify(p, null, 2) + "\n", "utf8");
  return fileNameOf(target);
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "projeto"
  );
}

function normalizeBlock(input: Record<string, unknown>, index = 0): Block {
  const type = String(input.type ?? "text") as BlockType;
  if (!BLOCK_TYPES.includes(type)) {
    throw new Error(`Tipo de bloco invalido: ${type} (validos: ${BLOCK_TYPES.join(", ")})`);
  }
  const size = DEFAULT_SIZE[type];
  const style = (input.style ?? {}) as Partial<BlockStyle>;
  return {
    id: typeof input.id === "string" && input.id ? input.id : randomUUID(),
    type,
    x: Number.isFinite(Number(input.x)) ? Number(input.x) : 48,
    y: Number.isFinite(Number(input.y)) ? Number(input.y) : 48 + index * 96,
    w: Number.isFinite(Number(input.w)) ? Number(input.w) : size.w,
    h: Number.isFinite(Number(input.h)) ? Number(input.h) : size.h,
    label: typeof input.label === "string" ? input.label : type,
    style: {
      fill: style.fill ?? DEFAULT_STYLE.fill,
      border: style.border ?? DEFAULT_STYLE.border,
      text: style.text ?? DEFAULT_STYLE.text,
      radius: Number.isFinite(Number(style.radius)) ? Number(style.radius) : DEFAULT_STYLE.radius,
    },
  };
}

/** Blocos alvo: pagina ativa se o projeto usar paginas, senao blocos de raiz. */
function targetBlocks(proj: ProjectFile): Block[] {
  if (proj.pages && proj.pages.length > 0) {
    const active = proj.pages.find((pg) => pg.id === proj.activePageId) ?? proj.pages[0];
    return active.blocks;
  }
  return proj.blocks;
}

function summarize(proj: ProjectFile, file: string) {
  const pageCount = proj.pages?.length ?? 0;
  const blockCount = pageCount
    ? proj.pages!.reduce((n, pg) => n + pg.blocks.length, 0)
    : proj.blocks.length;
  return {
    file,
    name: proj.name,
    device: proj.device,
    blockCount,
    pageCount,
    activePageId: proj.activePageId ?? null,
    types: [...new Set(targetBlocks(proj).map((b) => b.type))],
  };
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function renderSvg(proj: ProjectFile): string {
  const blocks = targetBlocks(proj);
  const width = Math.max(1100, ...blocks.map((b) => b.x + b.w + 48), 480);
  const height = Math.max(700, ...blocks.map((b) => b.y + b.h + 48), 320);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `<rect width="${width}" height="${height}" fill="#f4f6fb"/>`,
  ];
  for (const b of blocks) {
    parts.push(
      `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.style.radius}" fill="${esc(
        b.style.fill,
      )}" stroke="${esc(b.style.border)}" stroke-width="1.5"/>`,
    );
    if (b.type === "divider") continue;
    const lines = b.label.split("\n");
    const lineHeight = b.type === "heading" ? 28 : 18;
    const fontSize = b.type === "heading" ? 24 : b.type === "navbar" ? 14 : 14;
    const startY = b.y + b.h / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize / 3;
    const tspans = lines
      .map(
        (ln, i) =>
          `<tspan x="${b.x + 16}" y="${startY + i * lineHeight}">${esc(ln)}</tspan>`,
      )
      .join("");
    parts.push(
      `<text font-family="ui-sans-serif, system-ui, sans-serif" font-size="${fontSize}" fill="${esc(
        b.style.text,
      )}"${b.type === "heading" ? ' font-weight="700"' : ""}>${tspans}</text>`,
    );
  }
  parts.push("</svg>");
  return parts.join("\n");
}

/* ---------- definicao das ferramentas ---------- */

const TOOLS = [
  {
    name: "list_projects",
    description:
      "Lista os projetos wireframe (ficheiros JSON) disponiveis no diretorio de projetos.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "read_project",
    description:
      "Le um projeto wireframe completo (formato JSON do editor: version 1, blocks com id/type/x/y/w/h/label/style).",
    inputSchema: {
      type: "object",
      properties: { file: { type: "string", description: "Nome do ficheiro, ex. 'landing.json'" } },
      required: ["file"],
      additionalProperties: false,
    },
  },
  {
    name: "create_project",
    description:
      "Cria um novo projeto wireframe. 'blocks' e uma lista opcional de blocos (type obrigatorio: heading|text|button|input|image|card|navbar|divider; x/y/w/h/label/style opcionais). Opcionalmente cria paginas multiplas.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome do projeto" },
        device: { type: "string", enum: [...DEVICES], description: "Default: desktop" },
        file: { type: "string", description: "Nome de ficheiro opcional (sem .json)" },
        blocks: {
          type: "array",
          items: { type: "object", additionalProperties: true },
          description: "Blocos iniciais",
        },
        pages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              blocks: { type: "array", items: { type: "object", additionalProperties: true } },
            },
            required: ["name"],
            additionalProperties: false,
          },
          description: "Paginas (opcional; cria estrutura multi-pagina)",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "add_block",
    description:
      "Acrescenta um bloco ao projeto (na pagina ativa, se o projeto usar paginas). Retorna o bloco criado com id gerado.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string" },
        block: { type: "object", additionalProperties: true, description: "type obrigatorio" },
      },
      required: ["file", "block"],
      additionalProperties: false,
    },
  },
  {
    name: "update_block",
    description:
      "Atualiza campos de um bloco existente por id (patch parcial: x, y, w, h, label, style, type).",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string" },
        id: { type: "string" },
        patch: { type: "object", additionalProperties: true },
      },
      required: ["file", "id", "patch"],
      additionalProperties: false,
    },
  },
  {
    name: "remove_block",
    description: "Remove um bloco por id.",
    inputSchema: {
      type: "object",
      properties: { file: { type: "string" }, id: { type: "string" } },
      required: ["file", "id"],
      additionalProperties: false,
    },
  },
  {
    name: "add_page",
    description:
      "Cria uma pagina nova no projeto e torna-a ativa. Se o projeto ainda nao usa paginas, migra os blocos de raiz para uma pagina 'Inicial'.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string" },
        name: { type: "string" },
        blocks: { type: "array", items: { type: "object", additionalProperties: true } },
      },
      required: ["file", "name"],
      additionalProperties: false,
    },
  },
  {
    name: "set_active_page",
    description: "Troca a pagina ativa do projeto.",
    inputSchema: {
      type: "object",
      properties: { file: { type: "string" }, page: { type: "string", description: "id ou nome da pagina" } },
      required: ["file", "page"],
      additionalProperties: false,
    },
  },
  {
    name: "render_svg",
    description:
      "Renderiza os blocos da pagina ativa como SVG (preview sem browser). Retorna o markup SVG.",
    inputSchema: {
      type: "object",
      properties: { file: { type: "string" } },
      required: ["file"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_project",
    description: "Apaga um projeto. Exige confirm: true.",
    inputSchema: {
      type: "object",
      properties: { file: { type: "string" }, confirm: { type: "boolean" } },
      required: ["file", "confirm"],
      additionalProperties: false,
    },
  },
];

/* ---------- dispatch ---------- */

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_projects": {
      await mkdir(PROJECTS_DIR, { recursive: true });
      const files = (await readdir(PROJECTS_DIR)).filter((f) => f.endsWith(".json"));
      const out = [];
      for (const f of files) {
        try {
          const { p } = await loadProject(f);
          out.push(summarize(p, f));
        } catch {
          out.push({ file: f, error: "nao e um projeto valido" });
        }
      }
      return { dir: PROJECTS_DIR, count: out.length, projects: out };
    }

    case "read_project": {
      const { p } = await loadProject(args.file);
      return p;
    }

    case "create_project": {
      const name = String(args.name ?? "").trim();
      if (!name) throw new Error("'name' e obrigatorio");
      const device = (args.device as Device) ?? "desktop";
      if (!DEVICES.includes(device)) throw new Error(`device invalido: ${device}`);
      const blocksRaw = (args.blocks as Record<string, unknown>[]) ?? [];
      const blocks = blocksRaw.map((b, i) => normalizeBlock(b, i));
      const proj: ProjectFile = { version: 1, name, device, blocks };
      const pagesRaw = args.pages as { name: string; blocks?: Record<string, unknown>[] }[] | undefined;
      if (pagesRaw && pagesRaw.length > 0) {
        proj.pages = pagesRaw.map((pg) => ({
          id: randomUUID(),
          name: pg.name,
          blocks: (pg.blocks ?? []).map((b, i) => normalizeBlock(b, i)),
        }));
        proj.activePageId = proj.pages[0].id;
      }
      const file = await saveProject(proj, args.file ? String(args.file) : slugify(name));
      return { file, ...summarize(proj, file) };
    }

    case "add_block": {
      const { p: proj } = await loadProject(args.file);
      const block = normalizeBlock(args.block as Record<string, unknown>, targetBlocks(proj).length);
      targetBlocks(proj).push(block);
      const file = await saveProject(proj, String(args.file));
      return { file, block };
    }

    case "update_block": {
      const { p: proj } = await loadProject(args.file);
      const id = String(args.id);
      const blocks = targetBlocks(proj);
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx === -1) throw new Error(`Bloco nao encontrado: ${id}`);
      const patch = args.patch as Record<string, unknown>;
      const merged = normalizeBlock({ ...blocks[idx], ...patch, id }, idx);
      blocks[idx] = merged;
      const file = await saveProject(proj, String(args.file));
      return { file, block: merged };
    }

    case "remove_block": {
      const { p: proj } = await loadProject(args.file);
      const id = String(args.id);
      const blocks = targetBlocks(proj);
      const next = blocks.filter((b) => b.id !== id);
      if (next.length === blocks.length) throw new Error(`Bloco nao encontrado: ${id}`);
      if (proj.pages && proj.pages.length > 0) {
        const active = proj.pages.find((pg) => pg.id === proj.activePageId) ?? proj.pages[0];
        active.blocks = next;
      } else {
        proj.blocks = next;
      }
      const file = await saveProject(proj, String(args.file));
      return { file, removed: id, remaining: next.length };
    }

    case "add_page": {
      const { p: proj } = await loadProject(args.file);
      if (!proj.pages || proj.pages.length === 0) {
        const firstId = randomUUID();
        proj.pages = [{ id: firstId, name: "Inicial", blocks: proj.blocks }];
        proj.activePageId = firstId;
      }
      const page: WireframePage = {
        id: randomUUID(),
        name: String(args.name),
        blocks: ((args.blocks as Record<string, unknown>[]) ?? []).map((b, i) => normalizeBlock(b, i)),
      };
      proj.pages.push(page);
      proj.activePageId = page.id;
      const file = await saveProject(proj, String(args.file));
      return { file, page: { id: page.id, name: page.name, blocks: page.blocks.length }, pages: proj.pages.map((pg) => ({ id: pg.id, name: pg.name })) };
    }

    case "set_active_page": {
      const { p: proj } = await loadProject(args.file);
      if (!proj.pages || proj.pages.length === 0) throw new Error("Projeto nao usa paginas");
      const q = String(args.page);
      const page = proj.pages.find((pg) => pg.id === q || pg.name.toLowerCase() === q.toLowerCase());
      if (!page) throw new Error(`Pagina nao encontrada: ${q}`);
      proj.activePageId = page.id;
      const file = await saveProject(proj, String(args.file));
      return { file, activePageId: page.id, activePage: page.name };
    }

    case "render_svg": {
      const { p: proj } = await loadProject(args.file);
      return { svg: renderSvg(proj) };
    }

    case "delete_project": {
      if (args.confirm !== true) throw new Error("delete_project exige confirm: true");
      const target = safePath(args.file);
      await unlink(target);
      return { deleted: fileNameOf(target) };
    }

    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

/* ---------- bootstrap ---------- */

const server = new Server(
  { name: "wireframe-local", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await callTool(name, (args ?? {}) as Record<string, unknown>);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: message }], isError: true };
  }
});

async function main() {
  await mkdir(PROJECTS_DIR, { recursive: true });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[wireframe-mcp] pronto — projetos em ${PROJECTS_DIR}`);
}

main().catch((err) => {
  console.error("[wireframe-mcp] erro fatal:", err);
  process.exit(1);
});