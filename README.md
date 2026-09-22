# Wireframe Local

Editor visual local e leve para desenhar wireframes de interfaces sem depender de backend, conta ou banco de dados.

## O que está incluído

- Canvas de wireframe com grade, zoom e tamanhos desktop, tablet e mobile.
- Biblioteca de componentes: título, texto, botão, campo, imagem, card, navegação, divisor, lista, tabela, badge, avatar, busca e ícone.
- Inserção por clique ou arraste a partir da biblioteca.
- Seleção simples e múltipla (`Shift+clique`, `Cmd/Ctrl + A`), com arraste, setas, duplicação e remoção em grupo.
- Alinhamento ao canvas (1 bloco) ou dentro do grupo (2+ blocos), mais distribuição horizontal/vertical (3+ blocos).
- Camadas clicáveis e reordenáveis por arraste, com seleção múltipla por `Shift+clique`.
- Redimensionamento real pelos cantos inferior-direito e inferior-esquerdo.
- Painel de propriedades para conteúdo, posição, tamanho, cores, contorno e raio.
- Duplicação e remoção de blocos.
- Camadas clicáveis para selecionar elementos rapidamente.
- Múltiplas páginas no mesmo projeto, com criação, troca, renomeação inline (duplo clique) e exclusão.
- Modo Design e modo Preview.
- Salvamento automático no `localStorage` do navegador.
- Importação de projetos JSON exportados pelo próprio editor.
- Exportação em PNG, SVG, JSON, HTML/CSS puro e HTML+Tailwind CSS.
- Atalhos de teclado para acelerar o fluxo de trabalho.

## Como executar localmente

Requisitos: Node.js 22 ou superior e pnpm 10 ou superior.

```bash
pnpm install
pnpm dev
```

Depois, abra a URL exibida pelo Vite, normalmente `http://localhost:3000`.

Para gerar a versão de produção:

```bash
pnpm check
pnpm build
pnpm start
```

O comando `pnpm check` valida o TypeScript. O comando `pnpm test` executa os testes unitários (`vitest`) da lógica do editor em `client/src/lib/wireframe.test.ts`. O comando `pnpm build` gera os arquivos finais em `dist/`.

## Como usar

1. Escolha um componente na biblioteca lateral. Um clique cria o elemento no canvas; também é possível arrastar o componente para a área de trabalho.
2. Clique em um elemento para selecioná-lo.
3. Arraste o elemento para reposicionar. Ao aproximar de outro bloco, as bordas fazem snap automaticamente.
4. Use os handles nos cantos inferior-direito ou inferior-esquerdo para redimensionar.
5. Edite conteúdo, coordenadas, tamanho e aparência no painel de propriedades.
6. Use a seção **Alinhamento** para alinhar o bloco selecionado ao primeiro bloco vizinho.
7. Crie páginas pelo botão `+` na seção **Páginas**. Cada página mantém suas próprias camadas e elementos.
8. Use **Preview** para visualizar o wireframe sem seleção e sem handles.
9. O projeto é salvo automaticamente no navegador. O botão **Salvar** grava explicitamente o estado atual.
10. Use **Exportar** para gerar um arquivo final.

## Atalhos

| Atalho | Ação |
| --- | --- |
| `Cmd/Ctrl + S` | Salvar o projeto localmente |
| `Cmd/Ctrl + Z` | Desfazer |
| `Cmd/Ctrl + Shift + Z` | Refazer |
| `Cmd/Ctrl + D` | Duplicar a seleção |
| `Cmd/Ctrl + Shift + D` | Duplicar na mesma posição (variação) |
| `Cmd/Ctrl + C` | Copiar seleção |
| `Cmd/Ctrl + V` | Colar (com offset de 24px) |
| `Delete` ou `Backspace` | Remover a seleção |
| `Shift + Clique` | Adicionar/remover bloco da seleção |
| `Cmd/Ctrl + A` | Selecionar todos os blocos |
| `Setas` | Mover o elemento em 1 px |
| `Shift + Setas` | Mover o elemento em 8 px |
| `Ctrl + Roda` | Zoom in/out |
| `Espaço + Arraste` | Pan (mover tela) |
| `Duplo clique` | Editar texto inline no canvas |
| `V` | Ativar ferramenta de seleção |
| `H` | Ativar ferramenta de mão |
| `G` | Mostrar ou ocultar grade |
| `Esc` | Limpar a seleção / fechar edição inline |

## Exportação

- **PNG:** imagem raster em resolução 2x, adequada para compartilhar rapidamente.
- **Seleção PNG:** exporta apenas os blocos selecionados com padding, útil para peças específicas.
- **SVG:** arquivo vetorial leve, com textos e formas preservados.
- **HTML/CSS puro:** código HTML semântico com CSS inline, pronto para copiar e colar em qualquer projeto. Usa fonte DM Sans do Google Fonts.
- **HTML+Tailwind CSS:** código HTML com classes utilitárias do Tailwind (via CDN), ideal para projetos que usam a stack moderna.
- **JSON:** arquivo editável com todas as páginas, blocos, posições e estilos. Pode ser importado de volta em outro navegador ou cópia local do projeto.

Os arquivos são gerados diretamente pelo navegador usando a API de download. Nenhum arquivo é enviado a um servidor.

## Persistência e privacidade

O editor é uma aplicação frontend estática. O projeto atual é salvo apenas no `localStorage` do navegador. Para mover o trabalho entre computadores, exporte o JSON e importe-o na outra instalação.

Limpar os dados do site ou usar uma janela anônima remove o projeto salvo localmente. Por isso, use o JSON como cópia de segurança para trabalhos importantes.

## Estrutura do projeto

```text
wireframe-local/
├── client/
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── index.css
│       ├── main.tsx
│       ├── lib/
│       │   ├── utils.ts
│       │   ├── wireframe.ts       # lógica pura (alinhar, distribuir, importar, SVG)
│       │   └── wireframe.test.ts  # testes unitários (vitest)
│       └── pages/
│           └── Home.tsx           # editor (canvas, painéis, páginas)
├── server/
│   └── index.ts
├── mcp/
│   └── server.ts
├── package.json
├── pnpm-lock.yaml
└── README.md
```

A lógica testável do editor (alinhamento, distribuição, normalização de import, geração de SVG) fica em `client/src/lib/wireframe.ts`. O projeto usa React, TypeScript, Vite, Tailwind CSS e `lucide-react` para os ícones. As dependências são mínimas de propósito: sem kits de UI, formulários ou gráficos — só o que o editor usa.

## Limitações conhecidas

O editor foi pensado para wireframes rápidos, não para prototipagem de alta fidelidade. Os componentes são blocos visuais simples, sem navegação entre telas, edição tipográfica avançada ou colaboração em tempo real. Essas características podem ser adicionadas em uma próxima versão.

## Servidor MCP (para agentes de IA)

O projeto inclui um servidor [MCP](https://modelcontextprotocol.io) em `mcp/server.ts` que expõe o formato de projeto JSON do editor como ferramentas, para que agentes de IA criem e editem wireframes sem browser. O agente escreve o projeto pelas ferramentas; o utilizador importa o `.json` no editor (**Importar .JSON**) para continuar a editar.

### Ferramentas

- `list_projects` — lista os projetos no diretório (default: `./wireframe-projects`, configurável via `WIREFRAME_PROJECTS_DIR`)
- `read_project` / `create_project` — ler e criar projetos no formato do editor (`version: 1`, blocos `{id, type, x, y, w, h, label, style}`)
- `add_block` / `update_block` / `remove_block` — gerir blocos na página ativa (14 tipos: heading, text, button, input, image, card, navbar, divider, list, table, badge, avatar, search, icon)
- `add_page` / `set_active_page` — páginas múltiplas
- `render_svg` — preview SVG sem browser
- `delete_project` — apaga (exige `confirm: true`)

### Comandos

```bash
pnpm mcp        # arranca o servidor (stdio)
pnpm mcp:test   # teste end-to-end (22 verificações, cliente real via SDK)
```

### Configuração no agente

Exemplo (Claude Desktop, opencode, ou qualquer cliente MCP):

```json
{
  "mcpServers": {
    "wireframe-local": {
      "command": "pnpm",
      "args": ["exec", "tsx", "mcp/server.ts"],
      "cwd": "/caminho/absoluto/para/wireframe-local",
      "env": { "WIREFRAME_PROJECTS_DIR": "/caminho/para/os/projetos" }
    }
  }
}
```

Todos os caminhos de ficheiro ficam confinados ao `WIREFRAME_PROJECTS_DIR` (path traversal é rejeitado).

## Licença

Este projeto é entregue como uma aplicação local para uso e evolução no contexto do usuário.
