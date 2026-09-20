# Wireframe Local

Editor visual local e leve para desenhar wireframes de interfaces sem depender de backend, conta ou banco de dados.

## O que está incluído

- Canvas de wireframe com grade, zoom e tamanhos desktop, tablet e mobile.
- Biblioteca de componentes: título, texto, botão, campo, imagem, card, navegação e divisor.
- Inserção por clique ou arraste a partir da biblioteca.
- Seleção, movimentação livre e alinhamento magnético com outros blocos.
- Redimensionamento real pelos cantos inferior-direito e inferior-esquerdo.
- Painel de propriedades para conteúdo, posição, tamanho, cores, contorno e raio.
- Duplicação e remoção de blocos.
- Camadas clicáveis para selecionar elementos rapidamente.
- Múltiplas páginas no mesmo projeto, com criação, troca, renomeação e exclusão.
- Modo Design e modo Preview.
- Salvamento automático no `localStorage` do navegador.
- Importação de projetos JSON exportados pelo próprio editor.
- Exportação em PNG, SVG e JSON editável.
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

O comando `pnpm check` valida o TypeScript. O comando `pnpm build` gera os arquivos finais em `dist/`.

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
| `Cmd/Ctrl + D` | Duplicar o elemento selecionado |
| `Delete` ou `Backspace` | Remover o elemento selecionado |
| `Setas` | Mover o elemento em 1 px |
| `Shift + Setas` | Mover o elemento em 8 px |
| `V` | Ativar ferramenta de seleção |
| `H` | Ativar ferramenta de mão |
| `G` | Mostrar ou ocultar grade |
| `Esc` | Limpar a seleção |

## Exportação

- **PNG:** imagem raster em resolução 2x, adequada para compartilhar rapidamente.
- **SVG:** arquivo vetorial leve, com textos e formas preservados.
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
│       └── pages/
│           └── Home.tsx
├── server/
│   └── index.ts
├── package.json
├── pnpm-lock.yaml
└── README.md
```

A implementação principal fica em `client/src/pages/Home.tsx`. O projeto usa React, TypeScript, Vite, Tailwind CSS e `lucide-react` para os ícones.

## Limitações conhecidas

O editor foi pensado para wireframes rápidos, não para prototipagem de alta fidelidade. Os componentes são blocos visuais simples, sem navegação entre telas, edição tipográfica avançada ou colaboração em tempo real. Essas características podem ser adicionadas em uma próxima versão.

## Licença

Este projeto é entregue como uma aplicação local para uso e evolução no contexto do usuário.
