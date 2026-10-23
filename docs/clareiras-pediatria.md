# Clareiras de Pediatria — v0.48.1

Pedido aprovado em 22/10/2026: reduzir e dar menos destaque às árvores de cenário no modelo do site, sem alterar as árvores que nascerão dos estudos.

O filtro visual `src/paisagemPediatria.js` atua após o plantio e a competição por luz originais. Conserva as mesmas entidades de estudo e arbustos; seleciona somente um subconjunto das árvores genéricas existentes. Prioriza bordas de patamares, detectadas pelo desnível do terreno, e deixa poucos exemplares no interior. A folga entre cenário e estudo é de pelo menos 9,5 m entre os centros, ampliada até 13 m conforme a altura adulta das duas árvores. É um critério de composição, não uma garantia geométrica de separação de todas as copas.

Não move nem recria árvores. Não muda o sorteio, as espécies, os modelos, os tons, as escalas, as inclinações, o vigor, o nascimento ou os IDs dos 278 assuntos. A competição histórica é calculada antes de retirar o cenário do desenho para não alterar a aparência das árvores de estudo. A Grande Árvore, construída separadamente, fica preservada, assim como água, casa, trilhas e demais construções.

## Verificação

- Oito testes de cenário: sete sementes (1234, 2468, 9001, 9876, 42, 456789 e 278249951, a distribuição do site), identidade das entidades de estudo, ausência de mutação, determinismo, folga e preservação dos arbustos; mundo sem estudo conserva seu cenário.
- Seis testes das regras do módulo, 14 do caderno e 14 do crescimento passaram. Os testes de geometria usam a cópia local existente de three.js, pelo carregador `.verificacao/three-local.mjs` do projeto, sem instalar dependências.
- Comparação das cenas WebGL reais da v0.48 e desta versão no modo iframe, semente 1234: 278 árvores idênticas em atributos, hashes das geometrias, catálogo de posições e matrizes dos modelos adultos.
- Inspeção visual da abertura e da simulação com as 278 adultas. A simulação fica somente na instrumentação local em `.verificacao/paisagem-pediatria`; não é entregue ao site, não altera o caderno e não grava registros.
- Na cena real conferida, o cenário cai de 202 para 61 árvores. A quantidade varia com a semente; os arbustos e a árvore-marco não entram nessa contagem.

Atualização somente da demo incorporada pelo site. Banco, catálogo, registros, protocolo de mensagens e regras de crescimento permanecem intactos.
