# Instruções para agentes de IA (Codex, ChatGPT, Claude e outros)

Este repositório é a **demo de arte do Jardim dos Biomas**, editada por mais de uma IA (Claude e GPT) e pelo dono. Leia o `README.md` antes de qualquer mudança: ele define a direção de arte, a estrutura e o roadmap.

## Regras

1. **Idioma:** responda e comente em **português do Brasil**.
2. **Site estático, sem build:** HTML + módulos JS (ES modules). Bibliotecas só pelo `importmap` do `index.html` (three 0.186.1, ez-tree 1.1.0, via jsDelivr). Nada de bundler, npm install ou frameworks.
3. **Caminhos relativos** (`./src/...`): a demo roda no GitHub Pages, num subcaminho.
4. **Direção de arte é contrato** (README §1): pixel art de cena 3D, câmera ortográfica ¾, toon em 3 faixas, sombras duras, contorno de 1 px, **toda cor quantizada para a paleta de `src/paleta.js`**. Para mudar o visual, ajuste rampas/materiais; não remova a quantização nem o contorno sem pedido explícito.
5. **Determinismo:** o mundo sai da semente (`src/mundo.js`). Não use `Math.random()` na geração; use `criarRng(semente)`.
6. **Escopo pequeno:** uma melhoria por vez (ver README §4). Atualize o README (estado atual / próximos passos) no mesmo commit.
7. **Teste antes de concluir:** sirva a pasta (`npx http-server -p 5600 -c-1`), abra a página, confira que carrega sem erros no console e descreva o que mudou visualmente.
8. **Créditos:** ez-tree e three.js são MIT; mantenha a seção de créditos.

## Mapa rápido

- `index.html` — HUD, tela de carregamento, importmap
- `src/cena.js` — cena 3D, materiais, câmera, controles
- `src/pixel.js` — pós-processamento de pixel art
- `src/paleta.js` — paleta (fonte única de cor)
- `src/mundo.js` — geração do mundo
- `window.jardim` no console — acesso à cena para inspeção
