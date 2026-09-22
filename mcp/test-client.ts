/**
 * Teste end-to-end do MCP server: lanca o servidor via stdio,
 * exercita todas as ferramentas e valida o ficheiro em disco.
 * Uso: pnpm mcp:test
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, ".mcp-test-projects");

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  OK  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : "");
  }
}

async function textOf(res: { content?: { type: string; text?: string }[]; isError?: boolean }) {
  if (res.isError) throw new Error(res.content?.[0]?.text ?? "erro MCP");
  return res.content?.map((c) => c.text ?? "").join("") ?? "";
}

async function jsonOf(res: { content?: { type: string; text?: string }[]; isError?: boolean }) {
  return JSON.parse(await textOf(res));
}

const transport = new StdioClientTransport({
  command: "pnpm",
  args: ["exec", "tsx", "mcp/server.ts"],
  cwd: ROOT,
  env: { ...process.env, WIREFRAME_PROJECTS_DIR: DIR } as Record<string, string>,
  stderr: "inherit",
});

const client = new Client({ name: "wireframe-mcp-test", version: "1.0.0" });
await client.connect(transport);
console.log("— conectado ao servidor MCP —");

try {
  // 1. listTools
  const tools = await client.listTools();
  check(`listTools retorna 10 ferramentas (${tools.tools.length})`, tools.tools.length === 10,
    tools.tools.map((t) => t.name));

  // 2. create_project
  const created = await jsonOf(
    await client.callTool({
      name: "create_project",
      arguments: {
        name: "Teste MCP",
        device: "desktop",
        blocks: [
          { type: "navbar", label: "ACME  /  Produto  Precos" },
          { type: "heading", label: "Titulo criado por agente", x: 48, y: 140 },
          { type: "button", label: "Comecar", x: 48, y: 240, style: { fill: "#143bff", text: "#ffffff" } },
        ],
      },
    }),
  );
  check("create_project devolve ficheiro", created.file === "teste-mcp.json", created);
  check("create_project conta 3 blocos", created.blockCount === 3, created);

  // 3. ficheiro em disco com o formato do editor
  const diskRaw = await readFile(path.join(DIR, "teste-mcp.json"), "utf8");
  const disk = JSON.parse(diskRaw);
  check("disco: version === 1", disk.version === 1);
  check("disco: blocks array com 3 itens", Array.isArray(disk.blocks) && disk.blocks.length === 3);
  const b0 = disk.blocks[0];
  check(
    "disco: bloco tem shape {id,type,x,y,w,h,label,style}",
    typeof b0.id === "string" && b0.type === "navbar" &&
      [b0.x, b0.y, b0.w, b0.h].every((n: number) => Number.isFinite(n)) &&
      typeof b0.label === "string" &&
      ["fill", "border", "text", "radius"].every((k) => k in b0.style),
    b0,
  );
  check("disco: style customizado preservado", disk.blocks[2].style.fill === "#143bff");

  // 4. read_project
  const read = await jsonOf(await client.callTool({ name: "read_project", arguments: { file: "teste-mcp" } }));
  check("read_project aceita nome sem .json", read.name === "Teste MCP");

  // 5. add_block
  const added = await jsonOf(
    await client.callTool({
      name: "add_block",
      arguments: { file: "teste-mcp.json", block: { type: "text", label: "Paragrafo", x: 48, y: 320 } },
    }),
  );
  check("add_block gera id", typeof added.block.id === "string" && added.block.id.length > 10);
  const newId = added.block.id as string;

  // 6. update_block
  const updated = await jsonOf(
    await client.callTool({
      name: "update_block",
      arguments: { file: "teste-mcp.json", id: newId, patch: { label: "Paragrafo editado", w: 600 } },
    }),
  );
  check("update_block aplica patch", updated.block.label === "Paragrafo editado" && updated.block.w === 600);

  // 7. render_svg
  const svgRes = await jsonOf(await client.callTool({ name: "render_svg", arguments: { file: "teste-mcp.json" } }));
  check("render_svg devolve SVG valido", svgRes.svg.startsWith("<svg") && svgRes.svg.endsWith("</svg>"));
  check("render_svg inclui labels", svgRes.svg.includes("Par%C3%A1grafo") || svgRes.svg.includes("Paragrafo editado") || svgRes.svg.includes("Titulo criado"));

  // 8. paginas
  const page = await jsonOf(
    await client.callTool({ name: "add_page", arguments: { file: "teste-mcp.json", name: "Detalhes", blocks: [{ type: "heading", label: "Pagina 2" }] } }),
  );
  check("add_page migra para multi-pagina e ativa a nova", page.page.name === "Detalhes" && page.pages.length === 2);
  const svg2 = await jsonOf(await client.callTool({ name: "render_svg", arguments: { file: "teste-mcp.json" } }));
  check("render_svg usa a pagina ativa", svg2.svg.includes("Pagina 2") && !svg2.svg.includes("Titulo criado"));
  const back = await jsonOf(
    await client.callTool({ name: "set_active_page", arguments: { file: "teste-mcp.json", page: "Inicial" } }),
  );
  check("set_active_page por nome", back.activePage === "Inicial");

  // 9. list_projects
  const list = await jsonOf(await client.callTool({ name: "list_projects", arguments: {} }));
  check("list_projects ve o projeto", list.count === 1 && list.projects[0].file === "teste-mcp.json", list);

  // 10. remove_block
  const removed = await jsonOf(
    await client.callTool({ name: "remove_block", arguments: { file: "teste-mcp.json", id: newId } }),
  );
  check("remove_block elimina e conta restante", removed.remaining === 3, removed);

  // 11. erros: bloco inexistente, path traversal, delete sem confirm
  const errs = await Promise.allSettled([
    client.callTool({ name: "update_block", arguments: { file: "teste-mcp.json", id: "nao-existe", patch: {} } }),
    client.callTool({ name: "read_project", arguments: { file: "../../etc/passwd" } }),
    client.callTool({ name: "delete_project", arguments: { file: "teste-mcp.json", confirm: false } }),
  ]);
  check("update_block id inexistente -> isError", errs[0].status === "fulfilled" && (errs[0].value as { isError?: boolean }).isError === true);
  check("path traversal bloqueado", errs[1].status === "fulfilled" && (errs[1].value as { isError?: boolean }).isError === true);
  check("delete sem confirm bloqueado", errs[2].status === "fulfilled" && (errs[2].value as { isError?: boolean }).isError === true);

  // 12. delete com confirm
  const del = await jsonOf(
    await client.callTool({ name: "delete_project", arguments: { file: "teste-mcp.json", confirm: true } }),
  );
  check("delete_project apaga", del.deleted === "teste-mcp.json");
  const list2 = await jsonOf(await client.callTool({ name: "list_projects", arguments: {} }));
  check("list_projects vazio apos delete", list2.count === 0);
} finally {
  await client.close();
  await rm(DIR, { recursive: true, force: true });
}

console.log(`\n=== ${passed} OK, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);