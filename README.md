# Jardim dos Biomas — demo de arte

Demo **independente** do Med Study Flow para definir e lapidar a arte do Jardim antes de aplicá-la ao site. Uma única cena (260 × 170 m desde a v0.12; começou com 180 × 120 m), para acertar a qualidade antes de ampliar mais.

- **Abrir online (sem login):** https://giovaniteixeira550-lab.github.io/jardim-dos-biomas/
- **Código:** https://github.com/giovaniteixeira550-lab/jardim-dos-biomas (cada push na branch `main` republica a página em ~1 min)
- **Diário (painel visual):** https://giovaniteixeira550-lab.github.io/jardim-dos-biomas/historico.html
- **Editar com IA:** Claude Code ou Codex/ChatGPT ligados a este repositório — regras em `AGENTS.md`.
- **Rodar no PC:** nesta pasta, `npx http-server -p 5600 -c-1` e abrir http://localhost:5600 (precisa de internet: three.js e ez-tree vêm do CDN jsDelivr).

---

## 1. Direção de arte (decidida em 14/10/2026)

**Pixel art de cena 3D.** O mundo é 3D de verdade (volume, luz, sombra, câmera que gira), mas é *renderizado como pixel art*: baixa resolução, paleta fixa, dithering e contorno de 1 px. Referências da técnica: t3ssel8r (pixel art 3D), "HD-2D" (Octopath Traveler). Ambição: a leitura de bioma do Dota 2 com o charme de jogo em pixel.

| Pilar | Regra |
|---|---|
| Câmera | Ortográfica em ¾ (38° acima do horizonte), gira em passos de 45°; "snap" ao grid de pixels para não tremer |
| Pixel | Cena renderizada a 1/4 da tela (ajustável 2–7); ampliada sem suavização |
| Luz | Toon em 3 faixas (sombra 105 / meio-tom 178 / luz 255); sombras duras (`BasicShadowMap`) |
| Cor | **Só a paleta** (`src/paleta.js`, ~40 cores em rampas); quantização + Bayer 4×4 no pós-processamento |
| Contorno | 1 px onde há salto de profundidade (cor = pixel escurecido, não preto); brilho de recorte no topo |
| Árvores | Massa sólida da copa (esferas por k-means das folhas) + folhas recortadas na borda; cor chapada da paleta |
| Composição | Bosque denso de um lado, clareira, lago de margem irregular, trilha; acentos raros (outono, cerejeira, bétula dourada) |
| Vida | Vento em folhas/capim, brilhos na água, dia/entardecer/noite, vaga-lumes |
| Regra anti-burnout | Nada morre: erro vira semente; crescimento só para frente |

**Paleta (rampas, escuro → claro):** tinta, mata (7), sálvia (6), água (6), terra (6), outono (5), flor (4), pedra (5), bétula, noite (4), luz. Para ajustar a arte inteira, mexa nas rampas — tudo na tela é quantizado para elas.

## 2. Estrutura

```
index.html        HUD, tela de carregamento, importmap (three 0.186.1, ez-tree 1.1.0)
src/main.js       liga controles da página à cena
src/cena.js       mundo 3D: terreno, água, árvores (ez-tree), capim, flores, pedras, luz, câmera
src/pixel.js      pós-processamento: contorno, brilho de topo, paleta + dithering
src/paleta.js     paleta e cores-base por material
src/mundo.js      geração determinística (Poisson disk, lago irregular, trilha, densidade)
src/presets/      presets de arbustos do ez-tree (MIT)
```

No console do navegador, `jardim` dá acesso à cena (ex.: `jardim.girar(1)`, `jardim.zoom(0.8)`, `jardim.info()`).

## 3. Estado atual (v0.13)

- Carrega em ~2,5 s; ~160 FPS numa placa dedicada; sem erros de console.
- 11 espécies/variações (carvalho, freixo, bétula, pinheiro, salgueiro, outonal, bétula dourada, cerejeira, 3 arbustos).
- **v0.2 — silhuetas:** pinheiro em camadas de cones; carvalho largo e lobado; bétula com casca branca de marcas escuras; salgueiro com cortina de galhos pendentes; tom de cada árvore em degraus (mais escura / normal / mais clara).
- Carregamento continua mesmo com a aba em segundo plano; erros mostram a causa real.
- **Vento em degraus de pixel:** folhas e capim se movem só em passos de 1 pixel inteiro (sem tremor sub-pixel); capim mais lento, sem contorno de tinta (não grava profundidade) e com lâminas mais grossas.
- **v0.13 — chão desenhado:** gramado com manchas e tufinhos no shader do terreno (`materialTerreno`, atributo `aGrama`), sombra de contato e beirada clara nos paredões, pontilhado `uDither` 0,22 em pixel.js.
- **v0.12 — mapa maior:** 260 × 170 m (`gerarMundo`), quantidades proporcionais à área (`areaRel`); campos do mundo (lago, trilha, densidade) calculados uma vez na grade e reaproveitados pelo terreno; `jardim.tempos` mede cada etapa do carregamento.
- **v0.11 — riacho:** curso em `mundo.riacho` (nível da água só desce; leito escavado na grade de alturas), fita de água com cascata animada (`criarRiacho`), vitórias-régias e taboas (`criarPlantasAquaticas`); paredões com padrão de colunas limpo.
- **v0.10 — terraços:** relevo em platôs (mundo.js: `elevacao` fatiada em níveis de 4,5 m, paredão de largura fixa, escadas na trilha, grade de alturas pré-calculada); paredões de pedra em blocos por shader (`materialTerreno` em cena.js).
- **v0.9 — raio-X:** copas na frente do cursor ficam rendadas em xadrez de pixels (shader no material das árvores, `criarRaioX` em cena.js); cliques atravessam a parte rendada.
- **v0.8 — fases com cara própria:** broto no montinho (folhas-semente, coco, pinhão, rebento), muda com estaca, jovem esguia com primeira florada, adulta com raízes e frutos; mudanças por espécie (coqueiro jovem sem tronco, baobá incha, cogumelo abre, pinheiro levanta a saia, bétula embranquece). Novas: jabuticabeira, abacateiro, oliveira, mandacaru (forma cacto); bambuzal refeito em touceira.
- **v0.7 — leva 2:** mangueira, limoeiro, ipê-roxo, bananeira, baobá, bambuzal, árvore-de-cristal e salgueiro-lanterna; formas novas bananeira, garrafa, bambu e cristal; viveiro em 3 fileiras.
- **v0.6 — variedade:** gerador próprio de árvores (src/arvoreProc.js), 16 espécies + 4 arbustos, 4 estágios cada (broto, muda, jovem, adulta), flores e frutos; sem vento; pixel mínimo e contorno fixos; botão Viveiro.
- Crescimento 0–100% (nasce dos núcleos do bosque para as bordas), vento, horas do dia, tamanho do pixel, liga/desliga contorno e paleta (para comparar).

## 4. Próximos passos (um de cada vez, com revisão)

1. **Árvores** — ✅ silhuetas por espécie (v0.2). Pendente: bordas dos cones do pinheiro mais serrilhadas; galhos aparentes nas bétulas.
2. **Chão** — micro-detalhe em pixel (trevos, folhas caídas sob o bosque, pedrinhas na trilha); transição mata/clareira.
3. **Água** — borda com espuma de 1 px, plantas aquáticas (nenúfares, juncos), reflexo das copas.
4. **Atmosfera** — sombras de nuvens, névoa baixa ao amanhecer, pássaros/borboletas (sprites de pixel).
5. **Câmera** — movimento sub-pixel suave (sem tremor) e zoom em degraus inteiros.
6. **Biomas** — só depois da clareira estar "perfeita": variar paleta/espécies por área (GO, CM, CC, PED, Preventiva).
7. **Dados** — ligar crescimento a tópicos/revisões/erros (já planejado em `docs/jardim-pesquisa-e-plano.md` do site).

## 5. Levar para o site

O site (repositório `study-compass-26`, branch `codex/medtermo-claude-context`) já tem a aba `/jardim` com uma versão 3D anterior (`src/lib/jardim/cena3d.ts`) e as dependências `three` e `@dgreenheck/ez-tree`. Para portar:

1. Copiar `paleta.js`, `pixel.js` e a lógica de `cena.js` para `src/lib/jardim/` (convertendo para TypeScript), substituindo `cena3d.ts`.
2. Trocar `mundo.js` pelo `src/lib/jardim/mundo.ts` do site (mesma lógica, com lago irregular) ajustando a escala para metros.
3. Manter o carregamento sob demanda e a tela de carregamento de `src/components/jardim/CenaJardim.tsx`.

## Créditos

- Árvores e presets de arbustos: [ez-tree](https://github.com/dgreenheck/ez-tree), Daniel Greenheck — MIT.
- [three.js](https://threejs.org) — MIT.
