import { describe, expect, it } from "vitest";
import {
  alignPatches,
  applyPatches,
  ARTBOARDS,
  Block,
  buildSvg,
  clamp,
  createBlock,
  distributePatches,
  downloadFilename,
  escapeXml,
  normalizeBlock,
  normalizeHex,
  normalizeProject,
  parseNum,
  reorderById,
  selectionBounds,
  snap,
} from "./wireframe";

function block(over: Partial<Block> = {}): Block {
  return {
    id: "a",
    type: "text",
    x: 10,
    y: 20,
    w: 100,
    h: 50,
    label: "x",
    style: { fill: "#ffffff", border: "#000000", text: "#111111", radius: 4 },
    ...over,
  };
}

describe("snap/clamp/parse", () => {
  it("snap arredonda para múltiplos de 8", () => {
    expect(snap(10)).toBe(8);
    expect(snap(13)).toBe(16);
    expect(snap(0)).toBe(0);
  });
  it("clamp contém o valor", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
  it("parseNum usa fallback quando inválido", () => {
    expect(parseNum("42", 0)).toBe(42);
    expect(parseNum("", 7)).toBe(7);
    expect(parseNum("abc", 7)).toBe(7);
  });
  it("normalizeHex rejeita valores inválidos (input color não crasha)", () => {
    expect(normalizeHex("#aabbcc", "#ffffff")).toBe("#aabbcc");
    expect(normalizeHex("red", "#ffffff")).toBe("#ffffff");
    expect(normalizeHex(undefined, "#ffffff")).toBe("#ffffff");
  });
});

describe("escapeXml/downloadFilename", () => {
  it("escapa caracteres especiais", () => {
    expect(escapeXml('<a>&"\'')).toBe("&lt;a&gt;&amp;&quot;&apos;");
  });
  it("gera slug de arquivo", () => {
    expect(downloadFilename("Minha Página", "svg")).toBe("minha-página.svg");
    expect(downloadFilename("", "json")).toBe("wireframe.json");
  });
});

describe("createBlock", () => {
  it("cabe no artboard mobile", () => {
    const b = createBlock("navbar", 0, ARTBOARDS.mobile.width, ARTBOARDS.mobile.height);
    expect(b.x + b.w).toBeLessThanOrEqual(ARTBOARDS.mobile.width);
    expect(b.y + b.h).toBeLessThanOrEqual(ARTBOARDS.mobile.height);
  });
});

describe("normalizeBlock/normalizeProject", () => {
  it("rejeita tipo inválido", () => {
    expect(normalizeBlock({ type: "foguete" }, 0)).toBeNull();
    expect(normalizeBlock(null, 0)).toBeNull();
  });
  it("preenche defaults quando campos faltam", () => {
    const b = normalizeBlock({ type: "button" }, 2);
    expect(b).not.toBeNull();
    expect(b!.w).toBe(200);
    expect(b!.y).toBe(48 + 2 * 32);
    expect(b!.label).toBe("Ação principal");
  });
  it("rejeita projeto sem version/blocks", () => {
    expect(() => normalizeProject({})).toThrow("invalid-project");
    expect(() => normalizeProject({ version: 1, blocks: {} })).toThrow("invalid-project");
  });
  it("normaliza projeto com páginas e device inválido", () => {
    const p = normalizeProject({
      version: 1,
      name: "T",
      device: "relógio",
      blocks: [],
      pages: [{ id: "p1", name: "Home", blocks: [{ type: "text" }] }],
      activePageId: "p1",
    });
    expect(p.device).toBe("desktop");
    expect(p.blocks).toHaveLength(1);
    expect(p.activePageId).toBe("p1");
  });
  it("aceita projeto vazio válido", () => {
    const p = normalizeProject({ version: 1, name: "V", device: "mobile", blocks: [] });
    expect(p.pages).toHaveLength(1);
    expect(p.blocks).toHaveLength(0);
  });
});

describe("selectionBounds/align", () => {
  const a = block({ id: "a", x: 0, y: 0, w: 100, h: 50 });
  const b = block({ id: "b", x: 200, y: 100, w: 100, h: 50 });

  it("bounds cobre o grupo", () => {
    expect(selectionBounds([a, b])).toEqual({ x: 0, y: 0, w: 300, h: 150 });
    expect(selectionBounds([])).toBeNull();
  });
  it("1 bloco alinha ao artboard", () => {
    const all = [a];
    expect(alignPatches(all, ["a"], "right", 1100, 700)).toEqual({ a: { x: 1000 } });
    expect(alignPatches(all, ["a"], "center", 1100, 700)).toEqual({ a: { x: 500 } });
    expect(alignPatches(all, ["a"], "middle", 1100, 700)).toEqual({ a: { y: 325 } });
  });
  it("2+ blocos alinham dentro do grupo", () => {
    const all = [a, b];
    const patches = alignPatches(all, ["a", "b"], "left", 1100, 700);
    expect(patches).toEqual({ a: { x: 0 }, b: { x: 0 } });
    const applied = applyPatches(all, patches);
    expect(applied[1].x).toBe(0);
  });
  it("distribute exige 3+ e mantém extremos", () => {
    const c = block({ id: "c", x: 400, y: 0, w: 100, h: 50 });
    const all = [a, b, c];
    expect(distributePatches(all, ["a", "b"], "x")).toEqual({});
    const patches = distributePatches(all, ["a", "b", "c"], "x");
    expect(patches).toEqual({ b: { x: 200 } });
    const d = block({ id: "d", x: 300, y: 0, w: 100, h: 50 });
    const p2 = distributePatches([a, d, c], ["a", "d", "c"], "x");
    expect(p2).toEqual({ d: { x: 200 } });
  });
});

describe("reorderById", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
  it("move item para posição do alvo", () => {
    expect(reorderById(list, "a", "c").map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(reorderById(list, "c", "a").map((i) => i.id)).toEqual(["c", "a", "b"]);
  });
  it("ids iguais ou inexistentes não mudam nada", () => {
    expect(reorderById(list, "a", "a")).toBe(list);
    expect(reorderById(list, "z", "a")).toBe(list);
  });
});

describe("buildSvg", () => {
  it("gera svg válido com escape", () => {
    const svg = buildSvg([block({ label: "<oi>" })], 1100, 700);
    expect(svg).toContain("<svg");
    expect(svg).toContain("&lt;oi&gt;");
    expect(svg).toContain('viewBox="0 0 1100 700"');
  });
  it("divider vira rect simples", () => {
    const svg = buildSvg([block({ type: "divider", h: 1 })], 1100, 700);
    expect(svg).not.toContain("<text");
  });
});
