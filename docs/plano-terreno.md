# Jardim dos Patamares — plano de paisagem

O cenário tem um desenho fixo de 260 × 170 metros. A semente muda o plantio e pequenos detalhes de cor, preservando o projeto: colina, patamares, nascente, estrada, travessia, poços, cascatas e lago. O botão agora se chama **Variar plantio**.

## Intenção artística

O passeio sobe da chegada até um mirante. Depois desce por escadas de pedra, atravessa o riacho e se abre para o lago e o futuro pavilhão. A água faz o percurso contrário: nasce no alto e desce pelos patamares. Assim, arquitetura e natureza têm uma relação espacial compreensível; a estrada leva a lugares e a água liga níveis.

Os três patamares principais ficam a 4,5, 9 e 13,5 m, acima da clareira baixa. Desde a v0.18, são desenhados como **crista alta, ombro médio e saia baixa**, cada um com seu contorno próprio. Não são curvas de nível de um cone: a crista sustenta a nascente e o mirante, o ombro recebe a primeira bacia e a saia acompanha o vale até a terceira queda. Promontórios e reentrâncias são largos; não há ilhas isoladas, agulhas ou buracos fechados no campo autoral. O bosque emoldura os lugares; clareiras reservam vistas e construções. A composição é estilizada para o jogo, sem pretensão de simulação hidráulica ou projeto de engenharia real.

As referências de pixel art fornecidas pelo usuário orientam o recorte das quinas, pedra com volumes legíveis, bordas de grama, cortinas verticais de água e escadas que pertencem ao percurso. A última referência orienta especialmente a combinação de escadarias e pequenas intervenções de pedra com vegetação. Nenhuma imagem de referência foi copiada para o jogo.

## Planta e possibilidades de construção

`planejamento.html` mostra o relevo e os percursos do mesmo modelo usado em 3D. As camadas permitem conferir níveis, curvas de altura, água, escadas, ponte, árvores e áreas propostas. Cada local tem posição, área, intenção e link para a câmera do jogo. As áreas propostas ficam livres de árvores e arbustos; ainda não contêm os edifícios descritos abaixo.

| Lugar | Situação e área | Papel na composição e possibilidade arquitetônica |
|---|---|---|
| Jardim de chegada | Proposto, 14 × 12 m | Banco, placa de orientação e canteiros baixos. Abertura antes da subida; preservar a passagem da estrada. |
| Mirante das Pedras | Proposto, 10 × 8 m | Praça pequena com banco de pedra e pérgola leve de cerca de 4 × 3 m. Manter a vista para o vale e o caminho livre. |
| Nascente e poço alto | Água implantada | Preservar o bosque e as pedras; evitar edifícios sobre a nascente. Um futuro banco lateral pode aproveitar a vista sem estreitar a margem. |
| Ponte do vale | Implantada | Tabuleiro e acessos compartilham direção e altura da estrada. Pedra com juntas visíveis, parapeitos baixos e canal livre. |
| Poço do vale e lago | Água implantada | Contemplação e contraste com os paredões. Priorizar margens vegetadas e áreas abertas; um pequeno deque futuro exigirá um acesso próprio. |
| Pavilhão de estudos | Proposto, reserva de 12 × 10 m | Abrigo aberto e baixo, com estrutura leve de madeira, base de pedra e cobertura simples. Implantar a entrada junto à estrada e abrir a vista para o lago. |

Ordem recomendada das próximas obras: chegada e sinalização → praça do mirante → pavilhão → pequenos lugares de descanso junto à água. Um circuito adicional ao redor do lago pode ser desenhado depois, com entradas e destinos definidos antes de gerar sua geometria. Essas são propostas, não construções já concluídas.

## Estudos de paisagem utilizados

- **Villa d’Este:** a ligação entre patamares, escadarias e água movida pela diferença de níveis é o princípio aproveitado. O eixo formal e os edifícios do jardim histórico não foram reproduzidos. Fonte: [UNESCO — Villa d’Este](https://whc.unesco.org/en/list/1025/).
- **Stourhead:** o percurso em torno da paisagem e as vistas para a água e lugares de contemplação orientam a sequência de chegada, mirante e lago. Fonte: [National Trust — história do jardim de Stourhead](https://www.nationaltrust.org.uk/visit/wiltshire/stourhead/history-of-the-garden-at-stourhead).

Essas relações são interpretações de projeto aplicadas ao jardim do jogo. Os estudos históricos orientam composição e percurso; a linguagem visual continua sendo a do projeto e das referências fornecidas pelo usuário.

## Correções implantadas

- A ponte nasce da interseção real entre estrada e água. O trecho de estrada que a cruza é reto; os acessos possuem patamares compartilhados com o tabuleiro.
- Escadas são malhas sólidas com pisos e espelhos, calculadas pelo avanço ao longo da estrada. A subida não depende da direção do gradiente do terreno.
- Água tem patamares e cortinas verticais com os mesmos vértices, largura variável nos poços e foz no nível do lago. A escavação consulta o segmento correto, preservando o lábio superior da queda.
- Barrancos têm quinas com normais próprias e, desde a v0.19, massas angulares largas com três tons principais, fraturas seletivas e capa verde recortada. A interpretação segue a linguagem gráfica das referências: grandes volumes de cor, sem estratos realistas, granulação miúda ou fiadas regulares. Topo e pé locais controlam o encontro da grama e a sombra de apoio. Placas de até 2,2 m dão volume à borda, excluindo canais, circulação e reservas.
- Escadarias distinguem piso claro, espelho escuro e nariz chanfrado; juntas são curtas e desencontradas. Bordas baixas contínuas substituem as antigas caixas laterais seriadas. A textura e os detalhes ficam presos ao mundo quando a câmera gira.
- Vegetação não ocupa as faixas de circulação, o canal, os paredões ou as reservas de construção.

## Cooperação e preservação

O estado atual combina o trabalho do Claude até a v0.17 (`3599561`), mantendo as espécies, anatomia de folhagem, gerador de árvores, plantas aquáticas, paleta, câmeras e transparência já integrados. A composição fica em `src/planoMestre.js`; formações em `src/formacaoTerreno.js`; percursos em `src/percursos.js`; água em `src/aguaPercurso.js`; solo em `src/solo.js`; pedra e travessias em `src/relevo.js`. A separação permite continuar a arte e a ecologia sem reintroduzir duas definições concorrentes para a mesma ponte ou escada. Nenhuma cópia local de outro agente foi editada.

## Verificação

Verificações da v0.18: 31 de percursos em cinco sementes e 12 da formação autoral, além dos cenários de relevo, câmera/transparência e ciclo de vida no navegador. Os testes de formação conferem contornos sem cruzamentos, encaixe com separação mínima de 4 m, uma massa conectada por patamar e ausência de buracos fechados em uma grade de 1 m. Os percursos conferem composição fixa, plantio variável, três quedas, foz, desembarques, degraus, canal livre e reservas de construção. Não houve benchmark de aparelhos. A publicação pública é conferida separadamente do resultado local.
