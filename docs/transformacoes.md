# Transformações de crescimento

Pedido: cada estágio deve transmitir progresso com mudanças de arquitetura, sem exigir realismo botânico estrito.

## Sequências implementadas

| Família | Broto | Muda | Jovem | Adulta |
|---|---|---|---|---|
| Folhosas | Duas folhas separadas | Caule flexível, folhas isoladas e primeiros ramos | Bifurcações expostas, copa descontínua; botões nas floríferas | Copa característica, raízes aparentes, floração/frutificação conforme catálogo |
| Coníferas | Folhas/agulhas abertas | Primeiros braços espaçados | Andares de ramos com tufos nas pontas | Camadas, coluna ou candelabro próprios da espécie |
| Palmeira | Três folhas junto ao chão | Roseta erguida e base curta | Tronco emergente, anéis e folhas em arco | Tronco longo/curvo, frondes pendentes, raízes e cocos |
| Arbusto | Duas folhas sobre caule curto | Um eixo com folhas | Ramos abertos e tufos separados | Moita consolidada com ramos basais, flores ou bagas |
| Cogumelo de fantasia | Botão fechado | Pé e chapéu ainda fechado | Chapéu aberto, primeiras pintas | Anel e pequenos cogumelos acompanhantes, formando uma colônia |

São interpretações artísticas; flores, frutos e colônia são elementos de maturidade visual, não evidência de domínio acadêmico. Mantidos os quatro nomes/limiares de estágio, a geração por semente, o catálogo do Claude, sua paleta, os materiais e o estilo sem vento. Bosque e viveiro usam automaticamente os novos modelos pelo mesmo `construirVariacao`.

## Comparação

`evolucao.html` permite escolher as 20 espécies, girar os modelos e alternar entre tamanho de jogo e escala comparativa. Esta última procura igualar a altura, limitando a largura para evitar sobreposição: não representa dimensões botânicas. As legendas explicam o que muda. Em telas estreitas, a vitrine possui rolagem horizontal.

## Verificação realizada

- 20 espécies passaram na verificação da semente 1234: coordenadas finitas, reprodução idêntica pela mesma semente, altura crescente e diferenças entre distribuições espaciais normalizadas dos estágios consecutivos. Esse teste é uma proteção contra modelos simplesmente escalados; não substitui julgamento visual.
- Inspeção visual de carvalho, pinheiro, coqueiro, ipê-amarelo, arbusto de bagas e cogumelo-gigante na vitrine.
- Carregamento do bosque com 407 indivíduos, execução de “Ver crescer” e conferência do viveiro. Registros do navegador consultados na execução final.
- Sintaxe dos módulos, diff e caminhos das capturas conferidos. Sem benchmark, validação em aparelho móvel ou integração de estudos nesta tarefa.

## Colaboração

Branch `codex/transformacoes-arvores`, sobre `codex/ciclo-de-vida-jardim`. Arquivos de conteúdo: `src/arvoreProc.js`; apresentação: `evolucao.html`, `src/evolucao.js`, link no `index.html`. Apoio: README, histórico, capturas e este documento. Não modifica `src/especies.js`, `src/mundo.js`, `src/ecossistema.js`, `src/paleta.js`, `src/pixel.js` ou `src/cena.js`.

Antes de combinar com novas mudanças do Claude no gerador, revisar os blocos de broto/juvenil/maturidade e repetir a comparação. Nenhuma alteração substitui a cópia local do Claude ou faz push direto para `main`. Esta anotação informa o escopo; não afirma que outro agente leu o registro.
