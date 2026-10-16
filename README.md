# Jardim dos Biomas — demo de arte

Demo **independente** do Med Study Flow para definir e lapidar a arte do Jardim antes de aplicá-la ao site. Uma única cena pequena (uma clareira de 260 × 170 m), para acertar qualidade antes de ampliar.

- **Abrir online (sem login):** https://giovaniteixeira550-lab.github.io/jardim-dos-biomas/
- **Código:** https://github.com/giovaniteixeira550-lab/jardim-dos-biomas (cada push na branch `main` republica a página em ~1 min)
- **Diário (painel visual):** https://giovaniteixeira550-lab.github.io/jardim-dos-biomas/historico.html
- **Editar com IA:** Claude Code ou Codex/ChatGPT ligados a este repositório — regras em `AGENTS.md`.
- **Rodar no PC:** nesta pasta, `npx http-server -p 5600 -c-1` e abrir http://localhost:5600 (precisa de internet: three.js vem do CDN jsDelivr).

---

## 1. Direção de arte (decidida em 14/10/2026)

**Pixel art de cena 3D.** O mundo é 3D de verdade (volume, luz, sombra, câmera que gira), mas é *renderizado como pixel art*: baixa resolução, paleta fixa, dithering e contorno de 1 px. Referências da técnica: t3ssel8r (pixel art 3D), "HD-2D" (Octopath Traveler). Ambição: a leitura de bioma do Dota 2 com o charme de jogo em pixel.

| Pilar | Regra |
|---|---|
| Câmera | Ortográfica (38° inicial, inclinação de 20° a 75° pelo arraste vertical com botão direito), gira livremente com botão do meio/Shift + arraste ou torção de dois dedos; Q/E e botões giram 45°; "snap" ao grid de pixels para não tremer |
| Pixel | Cena renderizada com pixel mínimo (2); ampliada sem suavização |
| Luz | Toon em 3 faixas (sombra 105 / meio-tom 178 / luz 255); sombras duras (`BasicShadowMap`) |
| Cor | **Só a paleta** (`src/paleta.js`, ~40 cores em rampas); quantização + Bayer 4×4 no pós-processamento |
| Contorno | 1 px onde há salto de profundidade (cor = pixel escurecido, não preto); brilho de recorte no topo |
| Árvores | Gerador próprio (`src/arvoreProc.js`), quatro modelos por espécie (broto, muda, jovem, adulta), flores e frutos; cores da paleta |
| Composição | Bosque denso de um lado, clareira, lago de margem irregular, trilha; acentos raros (outono, cerejeira, bétula dourada) |
| Vida | Sem vento; brilhos na água, dia/entardecer/noite, vaga-lumes |
| Regra anti-burnout | Nada morre: erro vira semente; crescimento só para frente |

**Paleta (rampas, escuro → claro):** tinta, mata (7), sálvia (6), água (6), terra (6), outono (5), flor (4), pedra (5), bétula, noite (4), luz. Para ajustar a arte inteira, mexa nas rampas — tudo na tela é quantizado para elas.

## 2. Estrutura

```
index.html        HUD, tela de carregamento, importmap (three 0.186.1)
src/main.js       liga controles da página à cena
src/cena.js       mundo 3D: terreno, água, árvores, capim, flores, pedras, luz, câmera
src/pixel.js      pós-processamento: contorno, brilho de topo, paleta + dithering
src/paleta.js     paleta e cores-base por material
src/mundo.js      terreno do plano e plantio por semente
src/planoMestre.js desenho fixo: lugares, percursos, água e reservas de construção
src/percursos.js  perfis compartilhados pelo terreno, escadas, pontes e água
src/relevo.js     pedra, escadarias e ponte com geometrias próprias
src/solo.js       terra natural em camadas, com crosta e afloramentos esparsos
src/formacaoTerreno.js seis regiões de relevo com contornos curvos autorais
src/bordasBarranco.js lábios de terra e capim presos às quinas reais
src/aguaPercurso.js superfícies, cortinas, espuma e margens do riacho
planejamento.html planta interativa do mesmo terreno, com propostas de arquitetura
src/arvoreProc.js gerador próprio dos quatro estágios por espécie
src/pitangaSol.js gerador próprio da Pitanga-de-Sol (folhas opostas, ramos arqueados, pitangas com gomos)
projetos/         prévias isoladas de espécies para aprovação (ex.: projetos/pitanga-de-sol)
src/especies.js   catálogo, nichos e estágios dos indivíduos
src/ecossistema.js umidade, luz, escolha de espécie e competição
testes/          verificações no navegador, sem build ou dependências novas
docs/colaboracao.md escopo e cuidados para combinar mudanças de Claude e Codex
```

No console do navegador, `jardim` dá acesso à cena (ex.: `jardim.girar(1)`, `jardim.zoom(0.8)`, `jardim.info()`).

## 3. Estado atual (v0.28)

- **v0.28 — Árvore-Catavento aprovada:** quatro modelos próprios, folhas vermelhas, amarelas, azuis e verdes com dobras em volume. Disponível no catálogo, evolução e viveiro. Modelo isolado, sem enfeites de outras espécies; plantio aleatório desativado até planejar sua posição no bosque de Pediatria.

- **v0.27 — Pitanga-de-Sol (Claude), primeira árvore do mapa de Pediatria:** aprovada na prévia isolada `projetos/pitanga-de-sol/` e integrada. Gerador próprio em `src/pitangaSol.js`, chamado por `construirVariacao` quando a ficha traz `gerador: "pitanga"`. Broto com pares de folhas opostas e o par novo cor de cobre; muda com ramos laterais aos pares; jovem com pernadas começando a arquear e flores brancas; adulta baixa e larga (≈ 2× mais larga que alta) com 34 pitangas de 8 gomos e sépalas, presas por pedúnculo à folhagem ou aos ramos expostos. Entra no mapa, viveiro, catálogo e Evolução. Verificações da espécie no botão da prévia isolada.
- O histórico acompanha v0.1–v0.25 e o jardim planejado. O tempo de carregamento varia por aparelho/cache; o quadro registra primeiro carregamento lento, ainda pendente de medição comparável.
- **v0.26 — rascunhos (Claude):** campo `rascunho: true` em especies.js (export `TODAS`, congelado; `ESPECIES` = só aprovadas, usadas no mapa, viveiro e catálogo; `RASCUNHOS`). Prancheta em evolucao.html e `?especie=X&ficha=1` para a imagem de aprovação. Fluxo: espécie nova entra como rascunho → imagem das 4 fases → aprovação em lote → apagar o campo. Lote 1: pequizeiro, aroeira, sibipiruna, ipê-branco, carnaúba, guapuruvu.
- **v0.25 — identidade das árvores:** paineira adulta com florada rosa coerente, cores juvenis próprias e frutos apoiados na superfície real das copas. Cachos de palmeiras e jabuticabas têm suportes próprios. Catálogo imutável, validação de espécies novas e auditoria em `testes/especies.html`; critérios em [docs/integridade-especies.md](docs/integridade-especies.md).
- **v0.24 — água e lago:** superfície refinada com profundidade calculada pelo fundo, faixas rasas, reflexos largos e ondulações lentas. O riacho termina na costa exata, sem superfícies competindo ou barrancos dentro do lago; o canal já não eleva o fundo da foz. As plantas aquáticas permanecem visíveis. Entradas da ponte em madeira, sem as muretas de pedra.
- **v0.23 — pontes de madeira:** proposta aprovada, percurso ocidental removido e travessia curta entre as encostas. A ponte do riacho tem arco de 0,8 m, com subida e descida suaves, tábuas inclinadas e guarda-corpos acompanhando o tabuleiro. As duas pontes aparecem na planta; o acesso do jardim de chegada continua marcado para revisão.
- **v0.22 — escadas refinadas:** lances retos com mudanças de direção nos patamares, degraus de 0,25 m em vez de 0,30 m e pisos regulares. Uma referência comum alinha as bordas; quatro pedras por piso, juntas rebaixadas e quinas em três faces substituem as divisões irregulares. Malhas mais densas, com amostras a cada 0,125 m. Atalho para ver a Escada do vale de perto na planta.
- **v0.21 — caminho pela margem esquerda e ponte inferior:** o trecho indicado pelo usuário desce pela encosta, contorna sua base e cruza abaixo da última cascata, conectando novamente à estrada da direita. A travessia alta foi removida. Escadas e cabeceiras continuam seguindo o mesmo perfil do terreno.
- **v0.20 — relevo distribuído:** seis regiões com encostas curvas, espigões alongados e cumes deslocados. Vales entre nascente, norte, leste, chegada, sul e promontório do lago preservam água e circulação. A vista inicial mostra o conjunto; cinco novos lugares na planta permitem visitar as encostas. Materiais, árvores e controles preservados.
- **v0.19 — paredões com leitura de pixel art:** massas angulares grandes com poucos tons substituem os estratos horizontais. Fendas seletivas, sombras nos encaixes e capa verde recortada acompanham as referências. Pontilhado menor só nas paredes; a paleta continua obrigatória. O contorno distingue uma silhueta de um plano oblíquo contínuo, evitando riscar toda a parede. Topografia, árvores, percursos e água preservados.
- **v0.18 — encostas naturais:** crista, ombro e saia com contornos próprios e conectados substituem os anéis de uma colina cônica. Paredes de terra em camadas, crosta sob a grama e pequenos lábios em volume substituem as fiadas repetidas. Escadas têm pisos claros, espelhos escuros, nariz chanfrado e bordas baixas contínuas. Água calma tem poucos arcos; cascatas têm fios variados e espuma de impacto. A vista inicial enquadra encostas e travessia.
- **v0.16–v0.17 do Claude preservadas:** folhagem com anatomia 3D, oito espécies brasileiras, quatro formas novas e filtro de brasileiras no catálogo. O estilo da folhagem também é aplicado às prévias e à galeria.
- **v0.4–v0.5:** indivíduos selecionáveis, estágios, nichos de umidade/luz/altitude, vigor e competição por luz; mata ciliar.
- **v0.2 — silhuetas:** pinheiro em camadas de cones; carvalho largo e lobado; bétula com casca branca de marcas escuras; salgueiro com cortina de galhos pendentes; tom de cada árvore em degraus (mais escura / normal / mais clara).
- Carregamento continua mesmo com a aba em segundo plano; erros mostram a causa real.
- **v0.12–v0.15 do Claude preservadas:** mapa maior, cache do terreno, medições de carga, gramado desenhado, pontilhado suave e copas com escamas de folhas.
- **v0.10 do Claude preservada:** terraços, paredões de pedra, escadas e ecologia adaptada ao relevo.
- **v0.7 — leva 2:** mangueira, limoeiro, ipê-roxo, bananeira, baobá, bambuzal, árvore-de-cristal e salgueiro-lanterna; formas novas bananeira, garrafa, bambu e cristal; viveiro em 3 fileiras.
- **v0.6 — variedade:** gerador próprio de árvores (src/arvoreProc.js), 16 espécies + 4 arbustos, 4 estágios cada (broto, muda, jovem, adulta), flores e frutos; sem vento; pixel mínimo e contorno fixos; botão Viveiro.
- Crescimento 0–100%, dia/entardecer/noite, câmera e viveiro. Estilo fixo: pixel 2, contorno e paleta ligados; sem vento.
- **Preparação para integração:** encerramento idempotente, controles removidos ao descartar a cena, cancelamento entre etapas de geração e proteção contra resultados de cargas antigas. A compilação gráfica em andamento termina antes de liberar seus recursos.
- A troca de mundo interrompe a animação de crescimento anterior. Voltar a uma página restaurada pelo navegador recarrega a última semente da demo.
- Este lote preserva a arte e a ecologia; ainda não vincula plantas a tópicos nem grava progresso de estudos. Coordenação em [docs/colaboracao.md](docs/colaboracao.md).

### Verificação do lote

Servir esta pasta e abrir `testes/ciclo-de-vida.html`; clicar em **Executar verificações**. A página usa o motor real e testa cancelamento imediato, descarte parcial, espera de compilação, renderização/teclado/foco, remontagem, duas trocas rápidas na página real e eventos de saída/restauração com preservação da semente e do viveiro. A compilação cancelada usa uma barreira controlada, e os eventos de restauração são disparados pelo teste; a renderização ativa usa WebGL real. Não grava dados de estudo.

- **v0.8 do Claude preservada:** 28 espécies + 4 arbustos, 15 formas, broto no montinho, mudas com identidade própria, jovem esguia e adulta consolidada. O gerador mais recente substitui a proposta artística anterior; a galeria acompanha os modelos atuais.
- **Evolução:** `evolucao.html` usa as mesmas geometrias do jogo. A escala de comparação destaca a arquitetura (com limite de largura para folhas abertas); desligue-a para ver os tamanhos reais do jogo. Não altera o crescimento no bosque.
- Verificações e limites do lote em [docs/transformacoes.md](docs/transformacoes.md).

- **Catálogo no diário:** `historico.html#catalogo` mostra todas as espécies do mesmo catálogo do jogo, com imagens, busca sem acentos, grupos e estágio da prévia. Cada cartão abre `evolucao.html?especie=...` na planta correspondente. As miniaturas são produzidas pelo gerador atual, usando um único contexto gráfico, sem capturas manuais por espécie.
- Escopo e verificação em [docs/catalogo-diario.md](docs/catalogo-diario.md).

- **Câmera:** giro livre em 360° com o botão do meio/Shift, inclinação de 20° a 75° com o botão direito, zoom de detalhes (8 m) até visão ampla (240 m), roda/pinça, botões +/− e botão de recentrar. Nenhuma redução de resolução durante o movimento.
- **Transparência:** apenas a árvore inteira sob o mouse usa opacidade de 22%; o restante fica opaco. A saída do ponteiro restaura o modelo. Substitui o raio-X circular quadriculado da v0.9 para permitir enxergar as árvores de trás.
- Verificação: seis cenários em `testes/camera-transparencia.html`; detalhes e controles em [docs/camera-transparencia.md](docs/camera-transparencia.md).

### Jardim planejado e continuidade

- O macroterreno de 260 × 170 m tem desenho fixo. **Variar plantio** muda vegetação e detalhes; preserva relevo, lago, riacho, estrada e travessias.
- Estrada da chegada ao mirante, trechos de escada, ponte de pedra alinhada com seus acessos, três cascatas verticais, dois poços e lago principal.
- Paredões em facetas gráficas presas ao mundo, quinas com normais próprias, pisos de pedra sólidos e margens geométricas evitam triângulos de terra atravessando a água. Juntas de alvenaria ficam nas obras de pedra, não no terreno natural.
- **Plano** abre a planta interativa: relevo real, caminhos, sentido da água, vegetação, áreas e oito lugares. Chegada, mirante e pavilhão têm reservas e estudos de construção; os edifícios ainda são propostas.
- Decisões, dimensões e estudos de paisagem em [docs/plano-terreno.md](docs/plano-terreno.md). Testes: `node --test testes/percursos.mjs` e `testes/relevo.html` no navegador.

Acabamento v0.19: `testes/contorno.html` compara pixels reais da GPU em dois cenários — plano oblíquo com interior preservado e cubo com silhueta de exatamente 1 pixel. Quantização é desligada somente nessa fixture para medir o efeito do contorno. Os cinco cenários de relevo e os seis de câmera/transparência também foram conferidos. Capturas em `historico/v0.19-paredoes.jpg` e `historico/v0.19-paredoes-giro.jpg`.

## 4. Próximos passos (um de cada vez, com revisão)

1. **Árvores** — ✅ silhuetas por espécie (v0.2). Pendente: bordas dos cones do pinheiro mais serrilhadas; galhos aparentes nas bétulas.
2. **Chão** — micro-detalhe em pixel (trevos, folhas caídas sob o bosque, pedrinhas na trilha); transição mata/clareira.
3. **Água** — borda com espuma de 1 px, plantas aquáticas (nenúfares, juncos), reflexo das copas.
4. **Atmosfera** — sombras de nuvens, névoa baixa ao amanhecer, pássaros/borboletas (sprites de pixel).
5. **Câmera** — movimento sub-pixel suave (sem tremor) e zoom em degraus inteiros.
6. **Biomas** — só depois da clareira estar "perfeita": variar paleta/espécies por área (GO, CM, CC, PED, Preventiva).
7. **Dados** — ligar crescimento a tópicos/revisões/erros (já planejado em `docs/jardim-pesquisa-e-plano.md` do site).

Na frente de integração, o próximo lote é identidade persistente e crescimento por planta, seguido de inspeção do site e do contrato de dados. A frente artística/ecológica acima continua independente; combinar mudanças antes de publicar, conforme o registro de colaboração.

## 5. Levar para o site

O site (repositório `study-compass-26`, branch `codex/medtermo-claude-context`) já tem a aba `/jardim` com uma versão 3D anterior (`src/lib/jardim/cena3d.ts`) e as dependências `three` e `@dgreenheck/ez-tree`. Para portar:

1. Confirmar primeiro a estrutura atual do site. Portar `paleta.js`, `pixel.js`, `especies.js`, `arvoreProc.js`, `ecossistema.js` e a lógica de `cena.js` para `src/lib/jardim/` (convertendo para TypeScript); comparar com `cena3d.ts` antes de substituí-lo.
2. Trocar `mundo.js` pelo `src/lib/jardim/mundo.ts` do site (mesma lógica, com lago irregular) ajustando a escala para metros.
3. Manter o carregamento sob demanda e a tela de carregamento de `src/components/jardim/CenaJardim.tsx`.

## Créditos

- Árvores e presets de arbustos das versões anteriores à v0.6: [ez-tree](https://github.com/dgreenheck/ez-tree), Daniel Greenheck — MIT. Na v0.6, gerador próprio em `src/arvoreProc.js`.
- [three.js](https://threejs.org) — MIT.

Publicação v0.20: importações do terreno recebem versão no endereço para evitar que o cache misture a cena antiga com o diário novo. A planta usa as mesmas versões dos módulos.
