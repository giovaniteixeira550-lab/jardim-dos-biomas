> Atualização de 18/10/2026: esta revisão foi reunida para publicação na demo v0.36. As referências a prévia não publicada abaixo descrevem o histórico anterior.

# Distribuição visual das árvores — 17/10/2026

## Refinamento atual — concentração variável e capacidade

O usuário aprovou a primeira distribuição, mas pediu alguns grupos mais próximos e menos árvores excessivamente afastadas. O novo campo tem núcleos de maior concentração e transições mais abertas. A distância entre troncos varia com a posição, com piso de 7,8 m nesta simulação, preservando as exclusões de caminhos, água, barrancos, banco e travessias.

Na semente 1234, a revisão tem 208 árvores e 206 arbustos. A distância mínima entre troncos é 7,91 m; os quartis da distância até o vizinho mais próximo são 8,86 / 10,49 / 13,79 m. É um estudo artístico de concentração, não a contagem final de árvores de estudo ou uma garantia de acesso a todos os cliques.

A lista canônica foi recuperada em `BASE-ESPECIES-PEDIATRIA.md` no projeto Jardim e site. Ela soma 113 subtópicos em 11 famílias, com quantidades de 6 a 14 por família. A capacidade e os critérios de legibilidade foram registrados em `docs/capacidade-pediatria.md`. Os vínculos com estudos e a localização das famílias ainda não foram implantados.

40 testes passaram. A prancha continua simulando as copas adultas para avaliação visual. As seções seguintes registram a primeira distribuição e seus números anteriores.

Escopo autorizado: composição artística antes da divisão em áreas e temas. Prévia local sobre o mapa em elaboração, sem integração ou publicação na versão principal.

## Direção da composição

O desenho anterior concentrava o plantio em quatro manchas. O limiar de aceitação deixava grandes regiões sem árvores; nas manchas densas, os troncos podiam ficar separados por apenas 3,3 m na semente 1234.

A revisão espalha massas vegetais de proporções e intensidades diferentes por oito pontos da paisagem, sem atribuir significado médico a esses locais. Árvores esparsas ligam os grupos. A distribuição usa sorteio determinístico com distância mínima variável, sem fileiras ou grade de plantio. O campo recebe pequenos deslocamentos e ruído para evitar bordas elípticas regulares.

O plantio passa a aceitar os platôs antes excluídos. Os pontos próximos de paredões são rejeitados. Caminhos, reservas futuras, água e travessia das encostas continuam livres de bases de árvores. Ponte, cascatas e banco recebem afastamentos próprios para preservar a leitura desses lugares. Arbustos também são redistribuídos com mais espaço junto aos troncos.

## Verificação e limites

Na semente 1234 há 200 árvores, antes 274, e 244 arbustos, antes 228. A menor distância entre troncos aumentou de 3,30 para 9,92 m. Uma auditoria em 12 retângulos de mesma área encontrou antes regiões com nenhuma árvore e outra com 63; depois, cada região contém de 12 a 20 árvores. Esses retângulos não participam da geração e não serão áreas temáticas.

Em pontos de solo plantável amostrados a cada 4 m, o percentil 95 da distância até a árvore mais próxima caiu de 51,7 para 9,6 m. Isso comprova a ocupação mais ampla; não substitui a avaliação artística. As sementes 2468 e 9001 também melhoraram sua cobertura.

Comparação com o backup anterior: mesmas altitudes em toda a amostragem de 3 m, mesmo lago, riacho, ponte, escadas, traçado e ponto de pesca nas três sementes. O plantio mudou deliberadamente; números, espécies sorteadas e posições dos indivíduos não devem ser comparados como identidades persistentes de estudo.

40 testes de percursos, destinos e distribuição passaram. A prancha `composicao.html` mostra todos os indivíduos adultos para inspecionar as copas. Essa simulação não muda o crescimento no mapa e não define uma regra de evolução por estudo. O espaçamento é um recurso de composição, não uma garantia matemática de ausência de toda sobreposição entre copas largas.

Sem mudança de modelos, novas espécies ou divisão temática. A reunião com as espécies da versão principal mais recente continua pendente. Sem medição de desempenho em celular nesta etapa.

Capturas: `historico/ped-plantio-geral.png` e `historico/ped-plantio-giro.png`.
