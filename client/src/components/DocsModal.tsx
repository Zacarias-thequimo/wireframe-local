import { useEffect } from "react";
import { X } from "lucide-react";

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: "Ctrl/⌘ + S", action: "Salvar o projeto localmente" },
  { keys: "Ctrl/⌘ + Z", action: "Desfazer" },
  { keys: "Ctrl/⌘ + Shift + Z", action: "Refazer" },
  { keys: "Ctrl/⌘ + D", action: "Duplicar a seleção (com deslocamento)" },
  { keys: "Ctrl/⌘ + Shift + D", action: "Duplicar na mesma posição" },
  { keys: "Ctrl/⌘ + C", action: "Copiar seleção" },
  { keys: "Ctrl/⌘ + V", action: "Colar (com deslocamento de 24px)" },
  { keys: "Ctrl/⌘ + A", action: "Selecionar todos os blocos" },
  { keys: "Delete / Backspace", action: "Remover a seleção" },
  { keys: "Shift + Clique", action: "Adicionar/remover bloco da seleção" },
  { keys: "Setas", action: "Mover o elemento em 1px" },
  { keys: "Shift + Setas", action: "Mover o elemento em 8px" },
  { keys: "Ctrl + Roda", action: "Zoom in/out (25%–200%)" },
  { keys: "Espaço + Arraste", action: "Pan (mover a tela)" },
  { keys: "Duplo clique", action: "Editar o texto inline no canvas" },
  { keys: "Enter / Esc", action: "Confirmar / cancelar a edição inline" },
  { keys: "V", action: "Ferramenta de seleção" },
  { keys: "H", action: "Ferramenta de mão" },
  { keys: "G", action: "Mostrar/ocultar grade" },
  { keys: "?", action: "Abrir esta documentação" },
  { keys: "Esc", action: "Limpar a seleção / fechar painéis" },
];

const COMPONENTS: Array<{ name: string; hint: string }> = [
  { name: "Título", hint: "Cabeçalho grande da página ou seção." },
  { name: "Texto", hint: "Parágrafo de apoio ou descrição." },
  { name: "Botão", hint: "Chamada para ação." },
  { name: "Campo", hint: "Input de formulário genérico." },
  { name: "Busca", hint: "Campo de busca com ícone de lupa." },
  { name: "Imagem", hint: "Placeholder de imagem ou mockup." },
  { name: "Card", hint: "Container com título e descrição." },
  { name: "Navegação", hint: "Menu superior com marca e itens." },
  { name: "Divisor", hint: "Linha horizontal de separação." },
  { name: "Lista", hint: "Itens em lista — uma linha por item." },
  { name: "Tabela", hint: "Cabeçalho e linhas separados por |." },
  { name: "Badge", hint: "Tag de status (ex.: Ativo, Pendente)." },
  { name: "Avatar", hint: "Foto/perfil — usa as 2 primeiras letras." },
  { name: "Ícone", hint: "Placeholder quadrado de ícone." },
  { name: "Abas", hint: "Abas de navegação separadas por |." },
  { name: "Sidebar", hint: "Menu lateral — 1ª linha é a marca." },
  { name: "Rodapé", hint: "Rodapé com marca e links." },
  { name: "Breadcrumb", hint: "Trilha separada por /." },
  { name: "Campo rotulado", hint: "Label na 1ª linha, placeholder na 2ª." },
  { name: "Checkbox", hint: "Caixa de seleção marcada." },
  { name: "Toggle", hint: "Interruptor ligado/desligado." },
  { name: "Dropdown", hint: "Seleção suspensa com seta." },
  { name: "Modal", hint: "Diálogo com título, texto e botões." },
  { name: "Alerta", hint: "Aviso em destaque âmbar." },
  { name: "Progresso", hint: "Barra — o rótulo é a % (0–100)." },
  { name: "Vídeo", hint: "Player escuro com botão play." },
];

export default function DocsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="docs-overlay" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Documentação">
      <div className="docs-panel">
        <div className="docs-header">
          <div>
            <p className="eyebrow">AJUDA</p>
            <h2>Documentação</h2>
          </div>
          <button className="plain-icon" onClick={onClose} aria-label="Fechar documentação"><X size={16} /></button>
        </div>
        <div className="docs-body">
          <section>
            <h3>Primeiros passos</h3>
            <ol>
              <li>Clique num componente da <strong>Biblioteca</strong> (ou arraste-o para o canvas).</li>
              <li>Clique no bloco para selecionar; arraste para mover (com snap automático).</li>
              <li>Use as alças nos cantos inferiores para <strong>redimensionar com o mouse</strong>.</li>
              <li>Edite conteúdo e aparência no painel <strong>Propriedades</strong> à direita, ou com <strong>duplo clique</strong> direto no canvas.</li>
              <li>Organize em <strong>Camadas</strong>, crie <strong>Páginas</strong> e exporte em PNG, SVG, HTML ou JSON.</li>
            </ol>
          </section>
          <section>
            <h3>Componentes ({COMPONENTS.length})</h3>
            <ul className="docs-list">
              {COMPONENTS.map((c) => <li key={c.name}><strong>{c.name}</strong> — {c.hint}</li>)}
            </ul>
          </section>
          <section>
            <h3>Atalhos de teclado</h3>
            <table className="docs-table">
              <tbody>
                {SHORTCUTS.map((s) => <tr key={s.keys}><td><kbd>{s.keys}</kbd></td><td>{s.action}</td></tr>)}
              </tbody>
            </table>
          </section>
          <section>
            <h3>Seleção múltipla</h3>
            <p>
              <strong>Shift+clique</strong> adiciona/remove blocos da seleção; <strong>Ctrl/⌘+A</strong> seleciona tudo.
              Arrastar qualquer bloco do grupo move todos. O painel mostra alinhamento, distribuição e
              <strong> aparência em grupo</strong> (fundo, contorno, texto e raio aplicados a todos de uma vez).
            </p>
          </section>
          <section>
            <h3>Exportação</h3>
            <ul className="docs-list">
              <li><strong>PNG</strong> — imagem 2x; <strong>Seleção PNG</strong> exporta só os blocos selecionados.</li>
              <li><strong>SVG</strong> — vetor leve com textos e formas.</li>
              <li><strong>HTML</strong> — código com CSS puro, pronto para copiar e colar.</li>
              <li><strong>Tailwind</strong> — HTML com classes utilitárias (via CDN).</li>
              <li><strong>JSON</strong> — projeto editável; use <strong>Importar JSON</strong> para restaurar.</li>
            </ul>
          </section>
          <section>
            <h3>Páginas, preview e salvamento</h3>
            <p>
              Crie páginas com <strong>+</strong>, renomeie com <strong>duplo clique</strong> e troque entre elas sem
              perder o desfazer (histórico por página). O modo <strong>Preview</strong> esconde a interface de edição.
              Tudo é salvo automaticamente no <strong>localStorage</strong> — nada sai do seu navegador.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
