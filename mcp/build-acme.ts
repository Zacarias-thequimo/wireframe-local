/**
 * Constrói um dashboard SaaS realista ATRAVÉS do MCP server
 * (o mesmo caminho que um agente de IA usaria): cliente stdio -> ferramentas.
 * 2 páginas: Dashboard (sidebar, cards, badges, tabs, tabela, progresso,
 * alerta) + Login (campos rotulados, checkbox, botão).
 * Uso: pnpm exec tsx mcp/build-acme.ts
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "wireframe-projects");

const CARD = { fill: "#ffffff", border: "#e4e5ea", text: "#242631", radius: 12 };
const PLAIN = { fill: "#f4f4f8", border: "#f4f4f8", text: "#171922", radius: 0 };
const PRIMARY_BTN = { fill: "#7162d9", border: "#7162d9", text: "#ffffff", radius: 10 };
const UP = { fill: "#e8f5e9", border: "#c8e6c9", text: "#2e7d32", radius: 99 };
const DOWN = { fill: "#fdecea", border: "#f5c6c0", text: "#b3261e", radius: 99 };

const dashboardBlocks = [
  {
    type: "sidebar", x: 16, y: 16, w: 200, h: 668,
    label: "ACME\nVisão geral\nAnalytics\nClientes\nRelatórios\nConfigurações",
    style: { fill: "#fafaff", border: "#e4e5ea", text: "#3f414c", radius: 12 },
  },
  { type: "heading", x: 236, y: 20, w: 520, h: 72, label: "Visão geral\nBom dia, Ana — aqui vai o resumo de hoje.", style: PLAIN },
  { type: "search", x: 776, y: 28, w: 220, h: 44, label: "Buscar..." },
  { type: "avatar", x: 1008, y: 28, w: 56, h: 56, label: "AN" },

  { type: "card", x: 236, y: 116, w: 220, h: 120, label: "Receita\nR$ 48,2 mil", style: CARD },
  { type: "card", x: 472, y: 116, w: 220, h: 120, label: "Utilizadores\n12 480", style: CARD },
  { type: "card", x: 708, y: 116, w: 220, h: 120, label: "Conversão\n3,8%", style: CARD },

  { type: "badge", x: 236, y: 244, w: 90, h: 28, label: "▲ +12%", style: UP },
  { type: "badge", x: 472, y: 244, w: 90, h: 28, label: "▲ +8%", style: UP },
  { type: "badge", x: 708, y: 244, w: 90, h: 28, label: "▼ −2%", style: DOWN },

  { type: "tabs", x: 236, y: 288, w: 560, h: 48, label: "Hoje | Semana | Mês | Ano" },
  {
    type: "table", x: 236, y: 348, w: 560, h: 200,
    label:
      "Campanha | Cliques | CTR\n" +
      "Lançamento | 12 400 | 4,2%\n" +
      "Promoção | 8 210 | 3,1%\n" +
      "Newsletter | 5 930 | 2,7%",
  },

  { type: "alert", x: 812, y: 116, w: 272, h: 64, label: "3 campanhas terminam esta semana." },
  { type: "progress", x: 812, y: 192, w: 272, h: 40, label: "72" },
  {
    type: "card", x: 812, y: 244, w: 272, h: 160, style: CARD,
    label: "Top canal\n\nEmail  46%\nSocial  32%\nBusca  22%",
  },
  { type: "button", x: 812, y: 416, w: 272, h: 44, label: "Exportar relatório", style: PRIMARY_BTN },
];

const loginBlocks = [
  { type: "heading", x: 370, y: 110, w: 360, h: 64, label: "Entrar\nAcesse sua conta ACME", style: PLAIN },
  { type: "field", x: 370, y: 190, w: 360, h: 68, label: "Email\nvoce@empresa.com" },
  { type: "field", x: 370, y: 266, w: 360, h: 68, label: "Senha\n••••••••" },
  { type: "checkbox", x: 370, y: 346, w: 240, h: 36, label: "Manter sessão iniciada" },
  { type: "button", x: 370, y: 394, w: 360, h: 48, label: "Entrar", style: PRIMARY_BTN },
  { type: "text", x: 370, y: 452, w: 360, h: 40, label: "Esqueceu a senha? Fale conosco." },
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
  const client = new Client({ name: "acme-builder", version: "1.0.0" });
  await client.connect(transport);

  try {
    const created = unwrap<{ file: string; pageCount: number; blockCount: number }>(
      await client.callTool({
        name: "create_project",
        arguments: {
          name: "ACME — Dashboard SaaS",
          device: "desktop",
          file: "acme-dashboard",
          pages: [
            { name: "Dashboard", blocks: dashboardBlocks },
            { name: "Login", blocks: loginBlocks },
          ],
        },
      }),
    );
    console.log(`criado: ${created.file} | ${created.pageCount} paginas | ${created.blockCount} blocos`);

    const active = unwrap<{ activePage: string }>(
      await client.callTool({ name: "set_active_page", arguments: { file: created.file, page: "Dashboard" } }),
    );
    console.log("pagina ativa:", active.activePage);

    const svg = unwrap<{ svg: string }>(
      await client.callTool({ name: "render_svg", arguments: { file: created.file } }),
    );
    await writeFile(path.join(OUT_DIR, "acme-dashboard.svg"), svg.svg);
    console.log(`svg: ${svg.svg.length} chars`);

    const final = unwrap<{ version: number; name: string; pages?: { name: string; blocks: unknown[] }[] }>(
      await client.callTool({ name: "read_project", arguments: { file: created.file } }),
    );
    console.log(
      `verificacao: version=${final.version} nome="${final.name}" paginas=[${final.pages
        ?.map((p) => `${p.name}:${p.blocks.length}`)
        .join(", ")}]`,
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("FALHA:", err instanceof Error ? err.message : err);
  process.exit(1);
});
