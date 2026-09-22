/**
 * Constrói o wireframe do dashboard do Dispara SMS ATRAVÉS do MCP server
 * (o mesmo caminho que um agente de IA usaria): cliente stdio -> ferramentas.
 * Uso: pnpm exec tsx mcp/build-dispara.ts
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "wireframe-projects");

const BRAND = "#143bff";
const CANVAS = "#f4f6fb";
const CARD = { fill: "#ffffff", border: "#e4e8f0", text: "#242631", radius: 12 };
const PLAIN = { fill: CANVAS, border: CANVAS, text: "#171922", radius: 0 };
const PRIMARY_BTN = { fill: BRAND, border: BRAND, text: "#ffffff", radius: 10 };
const GHOST_BTN = { fill: "#ffffff", border: "#cbd4f5", text: BRAND, radius: 10 };

const NAV = "DISPARA SMS   /   Dashboard   Contactos   Listas   Etiquetas   Importações";

const dashboardBlocks = [
  { type: "navbar", x: 52, y: 24, w: 996, h: 56, label: NAV, style: CARD },

  {
    type: "card", x: 52, y: 100, w: 220, h: 480, style: CARD,
    label: "MENU\n\n●  Dashboard\n●  Contactos\n●  Listas\n●  Etiquetas\n●  Importações\n\nCONTA\n●  Definições\n●  Sair",
  },

  { type: "heading", x: 300, y: 104, w: 360, h: 44, label: "Visão geral", style: PLAIN },
  { type: "button", x: 888, y: 104, w: 148, h: 40, label: "Nova campanha", style: PRIMARY_BTN },

  { type: "card", x: 300, y: 168, w: 172, h: 96, style: CARD, label: "Contactos\n1 248\n+32 esta semana" },
  { type: "card", x: 488, y: 168, w: 172, h: 96, style: CARD, label: "Listas\n14\n2 ativas" },
  { type: "card", x: 676, y: 168, w: 172, h: 96, style: CARD, label: "Etiquetas\n27" },
  { type: "card", x: 864, y: 168, w: 172, h: 96, style: CARD, label: "Opt-outs\n3\n−1 esta semana" },

  { type: "image", x: 300, y: 288, w: 452, h: 200, style: CARD, label: "Gráfico — novos contactos por semana" },
  { type: "card", x: 768, y: 288, w: 268, h: 200, style: CARD, label: "Contactos por país\n\nAO  62%\nMZ  24%\nZA  14%" },

  {
    type: "card", x: 300, y: 512, w: 736, h: 160, style: CARD,
    label: "Últimas importações\n\nCSV · 312 contactos · concluído — há 2 h\nCSV · 48 contactos · concluído — ontem\nManual · 3 contactos — hoje",
  },
];

const contactosBlocks = [
  { type: "navbar", x: 52, y: 24, w: 996, h: 56, label: NAV, style: CARD },
  { type: "heading", x: 52, y: 104, w: 320, h: 44, label: "Contactos  (1 248)", style: PLAIN },
  { type: "input", x: 52, y: 168, w: 320, h: 40, style: CARD, label: "Pesquisar por nome ou número…" },
  { type: "button", x: 388, y: 168, w: 120, h: 40, label: "Filtros ▾", style: GHOST_BTN },
  { type: "button", x: 888, y: 168, w: 160, h: 40, label: "Novo contacto", style: PRIMARY_BTN },
  {
    type: "card", x: 52, y: 232, w: 996, h: 348, style: CARD,
    label:
      "NOME                 TELEFONE           PAÍS   ETIQUETAS       ESTADO\n" +
      "──────────────────────────────────────────────────────────────\n" +
      "Ana Domingos         +244 923 000 111   AO     clientes, vip    ativo\n" +
      "João Muthembwa       +258 84 000 222    MZ     clientes         ativo\n" +
      "Thandi Nkosi         +27 82 000 333     ZA     prospects        ativo\n" +
      "Pedro Cassoma        +244 923 000 444   AO     opt-out          inativo\n\n" +
      "1–4 de 1 248         ‹ Anterior   1 2 3 … 312   Seguinte ›",
  },
];

const importacoesBlocks = [
  { type: "navbar", x: 52, y: 24, w: 996, h: 56, label: NAV, style: CARD },
  { type: "heading", x: 52, y: 104, w: 360, h: 44, label: "Importações", style: PLAIN },
  { type: "button", x: 872, y: 104, w: 176, h: 40, label: "Importar CSV", style: PRIMARY_BTN },
  {
    type: "card", x: 52, y: 168, w: 996, h: 180, style: CARD,
    label:
      "Assistente de importação — passo 1 de 5\n\n" +
      "  Arraste o ficheiro CSV para aqui ou clique para escolher\n\n" +
      "Upload  ›  Mapear colunas  ›  Opções  ›  Processar  ›  Resultado",
  },
  {
    type: "card", x: 52, y: 372, w: 996, h: 208, style: CARD,
    label:
      "Histórico\n\n" +
      "há 2 h     clientes-set.csv     312 importados · 4 ignorados    concluído\n" +
      "ontem      prospects-ao.csv     48 importados · 0 ignorados     concluído\n" +
      "12 set     mala-direta.csv      1 020 importados                concluído",
  },
];

type ToolResult = Awaited<ReturnType<Client["callTool"]>>;

function unwrap<T>(r: ToolResult): T {
  const text = (r.content as { text?: string }[] | undefined)?.map((c) => c.text ?? "").join("");
  if (r.isError) throw new Error(text || "erro MCP");
  return JSON.parse(text || "{}") as T;
}

async function main() {
  const transport = new StdioClientTransport({
    command: "pnpm",
    args: ["exec", "tsx", "mcp/server.ts"],
    cwd: ROOT,
    env: { ...process.env, WIREFRAME_PROJECTS_DIR: OUT_DIR } as Record<string, string>,
    stderr: "inherit",
  });
  const client = new Client({ name: "dispara-builder", version: "1.0.0" });
  await client.connect(transport);

  try {
    const created = unwrap<{ file: string; pageCount: number; blockCount: number }>(
      await client.callTool({
        name: "create_project",
        arguments: {
          name: "Dispara SMS — Dashboard",
          device: "desktop",
          file: "dispara-sms-dashboard",
          pages: [
            { name: "Dashboard", blocks: dashboardBlocks },
            { name: "Contactos", blocks: contactosBlocks },
            { name: "Importações", blocks: importacoesBlocks },
          ],
        },
      }),
    );
    console.log(`criado: ${created.file} | ${created.pageCount} paginas | ${created.blockCount} blocos`);

    const active = unwrap<{ activePage: string }>(
      await client.callTool({
        name: "set_active_page",
        arguments: { file: created.file, page: "Dashboard" },
      }),
    );
    console.log("pagina ativa:", active.activePage);

    const svg = unwrap<{ svg: string }>(
      await client.callTool({ name: "render_svg", arguments: { file: created.file } }),
    );
    await writeFile(path.join(OUT_DIR, "dispara-sms-dashboard.svg"), svg.svg);
    console.log(`svg: ${svg.svg.length} chars`);

    const final = unwrap<{
      version: number;
      name: string;
      pages?: { name: string; blocks: unknown[] }[];
    }>(await client.callTool({ name: "read_project", arguments: { file: created.file } }));
    console.log(
      `verificacao: version=${final.version} nome="${final.name}" paginas=[${final.pages
        ?.map((p) => `${p.name}:${p.blocks.length}`)
        .join(", ")}]`,
    );

    const list = unwrap<{ count: number }>(
      await client.callTool({ name: "list_projects", arguments: {} }),
    );
    console.log(`list_projects: ${list.count} projeto(s)`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("FALHA:", err instanceof Error ? err.message : err);
  process.exit(1);
});