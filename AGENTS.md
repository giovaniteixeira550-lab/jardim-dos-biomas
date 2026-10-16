# Instruções para agentes de IA (Codex, ChatGPT, Claude e outros)

Este repositório é a **demo de arte do Jardim dos Biomas**, editada por mais de uma IA (Claude e GPT) e pelo dono. Leia o `README.md` antes de qualquer mudança: ele define a direção de arte, a estrutura e o roadmap.

## Regras

1. **Idioma:** responda e comente em **português do Brasil**.
2. **Site estático, sem build:** HTML + módulos JS (ES modules). Bibliotecas só pelo `importmap` do `index.html` (three 0.186.1 via jsDelivr). As árvores são do gerador próprio (`src/arvoreProc.js`). Nada de bundler, npm install ou frameworks.
3. **Caminhos relativos** (`./src/...`): a demo roda no GitHub Pages, num subcaminho.
4. **Direção de arte é contrato** (README §1): pixel art de cena 3D com pixel MÍNIMO (2) e contorno SEMPRE ligado, câmera ortográfica ¾, toon em 3 faixas, sombras duras, SEM vento, **toda cor quantizada para a paleta de `src/paleta.js`**. Para mudar o visual, ajuste rampas/materiais; não remova a quantização nem o contorno sem pedido explícito.
5. **Determinismo:** o mundo sai da semente (`src/mundo.js`). Não use `Math.random()` na geração; use `criarRng(semente)`.
6. **Escopo pequeno:** uma melhoria por vez (ver README §4). Atualize o README (estado atual / próximos passos) no mesmo commit.
7. **Teste antes de concluir:** sirva a pasta (`npx http-server -p 5600 -c-1`), abra a página, confira que carrega sem erros no console e descreva o que mudou visualmente.
8. **Histórico obrigatório (para o dono do projeto ler):** a cada mudança relevante, atualize `historico.json` — fonte do painel `historico.html`:
   - nova entrada no TOPO de `versoes` (versao, data, titulo, porque em 1 frase, mudancas em até 4 itens curtos, resultado, imagens com uma captura em `historico/`);
   - `quadro` (funciona / corrigir / ideias), `frentes` (status e progresso 0–100) e `proximoPasso`;
   - textos curtos e em linguagem simples (o painel é lido por uma pessoa, não por IA).
   Ao fechar uma versão: `git tag -a vX.Y -m "..." && git push --tags`.
9. **Créditos:** ez-tree e three.js são MIT; mantenha a seção de créditos.
10. **Aprovado = publicado:** toda alteração aprovada pelo dono vai para a branch `main` (com a tag da versão) na mesma hora, para o conteúdo não se perder em branches. Propostas ainda não aprovadas ficam em branches próprias.

## Mapa rápido

- `index.html` — HUD, tela de carregamento, importmap
- `src/cena.js` — cena 3D, materiais, câmera, controles
- `src/pixel.js` — pós-processamento de pixel art
- `src/paleta.js` — paleta (fonte única de cor)
- `src/mundo.js` — geração do mundo (terreno, lago, trilha, posições)
- `src/especies.js` — catálogo de espécies (forma, cores, flores/frutos, nicho)
- `src/arvoreProc.js` — gerador de árvores: formas e os 4 estágios de cada espécie
- `src/ecossistema.js` — umidade, luz, aptidão, competição, vigor
- `historico.json` → `historico.html` — painel visual: progresso por frente, quadro de pendências, linha do tempo com imagens
- `window.jardim` no console — acesso à cena para inspeção
