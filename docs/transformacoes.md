# Transformações de crescimento

Pedido: cada estágio deve transmitir progresso com mudanças de arquitetura, sem exigir realismo botânico estrito.

## Sequências implementadas

| Família | Broto | Muda | Jovem | Adulta |
|---|---|---|---|---|
| Folhosas | Duas folhas separadas | Caule flexível, folhas isoladas e primeiros ramos | Bifurcações expostas, copa descontínua; botões nas floríferas | Copa característica, raízes aparentes, floração/frutificação conforme catálogo |
| Coníferas | Folhas/agulhas abertas | Primeiros braços espaçados | Andares de ramos com tufos nas pontas | Camadas, coluna ou candelabro próprios da espécie |
| Palmeira | Três folhas junto ao chão | Roseta erguida e base curta | Tronco emergente, anéis e folhas em arco | Tronco longo/curvo, frondes pendentes, raízes e cocos |
| Arbusto | Duas folhas sobre caule curto | Um eixo com folhas | Ramos abertos e tufos separados | Moita consolidada com ramos basais, flores ou bagas |
| Baobá | Duas folhas | Caule fino | Tronco começando a engrossar | Tronco em garrafa e raízes |
| Bananeira | Folhas junto ao chão | Duas folhas largas erguidas | Pseudocaule e leque aberto | Folhas arqueadas, bananas e coração |
| Bambu | Brotos fechados | Colmo único com folhas | Três colmos e folhas separadas | Touceira consolidada |
| Cristal | Uma ponta | Núcleo de três cristais | Braços de pedra separados | Coroa radial e raízes de pedra |
| Cogumelo de fantasia | Botão fechado | Pé e chapéu ainda fechado | Chapéu aberto, primeiras pintas | Anel e pequenos cogumelos acompanhantes, formando uma colônia |

São interpretações artísticas; flores, frutos e colônia são elementos de maturidade visual, não evidência de domínio acadêmico. Mantidos os quatro nomes/limiares de estágio, a geração por semente, o catálogo do Claude, sua paleta, os materiais e o estilo sem vento. Bosque e viveiro usam automaticamente os novos modelos pelo mesmo `construirVariacao`.

## Comparação

`evolucao.html` permite escolher as 28 espécies, girar os modelos e alternar entre tamanho de jogo e escala comparativa. Esta última procura igualar a altura, limitando a largura para evitar sobreposição: não representa dimensões botânicas. As legendas explicam o que muda. Em telas estreitas, a vitrine possui rolagem horizontal.

## Verificação realizada

- 28 espécies passaram na verificação da semente 1234: coordenadas finitas, reprodução idêntica pela mesma semente, altura crescente e diferenças entre distribuições espaciais normalizadas dos estágios consecutivos. Esse teste é uma proteção contra modelos simplesmente escalados; não substitui julgamento visual.
- Inspeção visual de carvalho, pinheiro, coqueiro, ipê-amarelo, arbusto de bagas, cogumelo-gigante e das novas famílias baobá, bambu, bananeira e cristal na vitrine.
- As sete verificações de ciclo de vida passaram novamente sobre a versão combinada com a v0.7, sem avisos/erros capturados durante essa execução.
- Carregamento do bosque com 407 indivíduos, execução de “Ver crescer” e conferência do viveiro. Registros do navegador consultados na execução final.
- Sintaxe dos módulos, diff e caminhos das capturas conferidos. Sem benchmark, validação em aparelho móvel ou integração de estudos nesta tarefa.

## Colaboração

Branch `codex/transformacoes-arvores`, com o lote anterior e a v0.7 do Claude (`d0f30c9`). A proposta final concentra preparação e transformações, substituindo a proposta anterior de ciclo de vida. Arquivos de conteúdo deste lote: `src/arvoreProc.js`; apresentação: `evolucao.html`, `src/evolucao.js`, link no `index.html`. Apoio: README, histórico, capturas e este documento. O lote de transformações preserva `src/especies.js`, `src/mundo.js`, `src/ecossistema.js`, `src/paleta.js`, `src/pixel.js` e a lógica de crescimento em `src/cena.js`; os ajustes anteriores de ciclo de vida continuam incluídos.

Antes de combinar com novas mudanças do Claude no gerador, revisar os blocos de broto/juvenil/maturidade e repetir a comparação. Nenhuma alteração substitui a cópia local do Claude ou faz push direto para `main`. Esta anotação informa o escopo; não afirma que outro agente leu o registro.
