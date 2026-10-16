# Pitanga-de-Sol — proposta isolada (Claude)

Primeira proposta da espécie do mapa de **Pediatria**, para aprovação. **Fora do mapa, do viveiro e do catálogo:** nenhum arquivo compartilhado foi alterado. Os módulos do jogo são só importados (`juntar` do gerador, `criarRng`/`criarRuido`, paleta, pós-processamento de pixel e estilo de copa).

- **Prévia:** `projetos/pitanga-de-sol/index.html`. Use os botões 1–4, "Comparar os quatro" e "Adulta · 4 ângulos". Arraste para girar ou inclinar a câmera e use a roda ou a pinça para aproximar. Parâmetros: `?modo=0..3|comparar|angulos` e `?semente=N`.
- **Gerador:** `pitanga.js` → `construirPitanga(semente)` devolve os quatro estágios. Cada geometria traz `userData.pitanga`, com o registro anatômico: pares de folhas, ramos, copas, flores e frutos, com seus apoios.
- **Verificações:** `verificacao.js`. Use o botão "Executar verificações" na prévia.
- **Capturas:** `capturas/`. São renders reais da prévia: adulta, adulta de perto, adulta por baixo, comparação, 4 ângulos e cada estágio.

## Estágios

| Estágio | O que é próprio dele |
|---|---|
| Broto | Caule avermelhado e três pares de folhas opostas e cruzadas. O par mais novo é cor de cobre. Não há folhas-semente, porque a semente fica no solo. |
| Muda | Caule único. Tem dois pares de ramos laterais opostos e cruzados, folhas aos pares, brotação de cobre no ápice, estaca e laço. |
| Jovem | Tronco fino que se divide baixo em três pernadas. Os ramos começam a arquear (pontas cerca de 10% abaixo do topo do arco). A copa é aberta e tem as primeiras flores: quatro pétalas brancas e um pompom de estames. |
| Adulta | Copa baixa e larga (largura cerca de 2× a altura) sobre quatro pernadas arqueadas e ramos secundários. Tem 34 frutos com 8 gomos e coroa de 4 sépalas, do amarelo ao vermelho, presos por pedúnculos. Uns saem da folhagem e outros dos trechos expostos dos ramos. |

## Para integrar depois da aprovação

Quando aprovada, a forma passa para `src/arvoreProc.js`/`src/especies.js` pelo fluxo de rascunho. A integração também precisa atualizar `README.md` e `historico.json`. Isso não foi feito agora porque esta etapa entrega só a árvore e a prévia.
