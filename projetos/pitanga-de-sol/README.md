# Pitanga-de-Sol — prévia isolada (Claude)

Primeira espécie do mapa de **Pediatria**. Aprovada pelo usuário em 16/10/2026 e integrada na v0.27.

- **Gerador:** `src/pitangaSol.js`. `construirVariacao` (arvoreProc.js) o chama quando a ficha de `src/especies.js` traz `gerador: "pitanga"`. Altura e frutos (tamanho, quantidade e cores) vêm da ficha; `validarPitanga` confere se a ficha casa com o desenho. Cada estágio traz `userData.arvore` (o mesmo registro dos outros modelos) e `userData.pitanga` (pares de folhas, ramos, copas, flores e frutos com os apoios).
- **Prévia:** `projetos/pitanga-de-sol/index.html`. Tem os estágios 1–4, "Comparar os quatro" e "Adulta · 4 ângulos". Arraste para girar ou inclinar a câmera e use a roda ou a pinça para aproximar. Aceita `?modo=0..3|comparar|angulos` e `?semente=N`. Usa a mesma geometria do bosque.
- **Verificações da espécie:** `verificacao.js`, pelo botão da prévia. Confere geometria, repetibilidade, características por estágio, apoio de flores e frutos, silhueta em 8 ângulos e os 8 sulcos do fruto.
- **Capturas da aprovação:** `capturas/`.

| Estágio | O que é próprio dele |
|---|---|
| Broto | Caule avermelhado e três pares de folhas opostas e cruzadas. O par mais novo é cor de cobre. Não há folhas-semente, porque a semente fica no solo. |
| Muda | Caule único. Tem dois pares de ramos laterais opostos, folhas aos pares, brotação de cobre no ápice, estaca e laço. |
| Jovem | Tronco fino dividido baixo em três pernadas que começam a arquear. A copa é aberta e tem 16 flores brancas de quatro pétalas. |
| Adulta | Copa baixa e larga sobre quatro pernadas arqueadas. Tem 34 pitangas de 8 gomos com sépalas, do amarelo ao vermelho, presas por pedúnculos. |

Refinamentos registrados na aprovação:
- A copa pode ficar mais contínua.
- As brotações de cobre na adulta estão discretas.
- As sépalas quase não aparecem nos ângulos comuns.
- Na distância normal do jogo, os gomos viram só cor.
