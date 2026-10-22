# Crescimento no tamanho do módulo (regras 0.3)

21/10/2026, a pedido do usuário. Branch `claude/crescimento-modulo`. Aprovada e publicada como **v0.48** no mesmo dia.

## Problema

Com as regras 0.2, a adulta exigia 90 dias entre o primeiro e o último encontro e 60 dias entre as recuperações sem ajuda, e a jovem exigia 21 dias. O rodízio de Pediatria (03/11 a 19/12/2026) tem 47 dias: nenhuma árvore chegaria a adulta durante o módulo.

O usuário pediu que a árvore possa crescer dentro de um só rodízio. Depois do módulo, sem retomar, ela deve ir perdendo folhas e secando, e voltar quando o assunto for retomado.

## Regras 0.3 (`regrasDoModulo` em `src/crescimentoEstudo.js`)

As metas de tempo são proporcionais à duração **D** do módulo, com mínimos para módulos curtos. Para Pediatria, D = 47:

| Fase | Dias de estudo | Intervalo entre o 1º e o último encontro | Recuperações sem ajuda |
|---|---|---|---|
| Muda | 2 | 1 dia | — |
| Jovem | 4 | 0,2·D → **9 dias** (mín. 7) | 1 |
| Adulta | 6 | 0,4·D → **19 dias** (mín. 14) | 2, espaçadas ≥ 0,15·D → **7 dias**, e a 1ª e a última ≥ 0,3·D → **14 dias** |

- **Exemplo de adulta em 23 dias:** estudo no dia 0, revisão no 2, volta no 7, recuperação sem ajuda no 9, revisão no 16 e nova recuperação sem ajuda no 23.
- **Até quando dá:** um assunto começado até mais ou menos a metade do rodízio pode virar adulta antes do fim. Os começados depois continuam crescendo quando forem retomados.
- **O que não mudou:**
  - estudar tudo num dia só não pula fases;
  - o relógio sozinho não faz crescer;
  - o porte conquistado nunca diminui.

## Copa: amarela, cai e seca; volta com retornos

O porte é conquista permanente. A copa mostra se o assunto está sendo acompanhado.

- **Quando começa:** a copa começa a perder vigor 0,4·D dias depois do último encontro com o assunto (**19 dias** em Pediatria).
- **Até secar:** chega a seca em mais 3·D dias (**141 dias**).
- **Estados mostrados:** copa cheia → amarelando → copa rala → últimas folhas → seca.
- **Exemplo:** um assunto visto pela última vez em 26/11 fica amarelando em janeiro, com copa rala em fevereiro e março, e seco em maio de 2027.
- **Retomada:** cada retorno, desde que espaçado ≥ 0,1·D dias (**5 dias**) do anterior, reduz a secura a 55%. Com isso, três retornos semanais levam uma árvore seca de 1,00 a 0,17. Retornos no mesmo dia ou colados não aceleram.
- **Pausas:** pausas planejadas continuam suspendendo o relógio da copa.

O caderno do módulo usa essas regras. Na ficha de cada assunto aparecem:
- o estado da copa e a data em que ela começa a amarelar;
- o que falta para a próxima fase, com as metas do módulo.

Na ficha da árvore no mapa aparece "Copa: …" quando ela está secando.

## No mapa (todas as espécies)

`cena.js` passa a secura de cada árvore de estudo como atributo por instância (`secura`). O estilo compartilhado (`estiloCopa.js`) faz o efeito, com as cores da paleta, sem mudar geometria nem porte:
- tinge a folhagem de oliva e depois de ocre e castanho;
- tira tufos da copa em células fixas no modelo;
- na seca, tira os volumes inteiros, um de cada vez, até ficarem tronco e galhos;
- madeira, flores e frutos só desbotam na seca avançada.

As árvores de paisagem não têm secura.

**Limitações conhecidas:**
- flores e frutos continuam presos na árvore seca (só desbotam);
- a sombra projetada ainda é a da copa cheia;
- ao passar o mouse, o fantasma translúcido usa a secura de outra árvore da mesma variação.

## Verificação

- `testes/crescimento-modulo.mjs`: 6 testes, cobrindo as metas proporcionais, a adulta dentro do rodízio, os estudos concentrados, a secura depois do módulo, a retomada espaçada contra a colada e o caderno entregando porte e secura.
- Passaram também `crescimento-estudo` (14) e `painel-modulo` (14).
- **No navegador:** 60 assuntos adultos com o último retorno em datas diferentes mostraram copa rala, últimas folhas e seca. A ficha do caderno e a da árvore exibem o estado. Nenhum erro no console.
- **Capturas:** `historico/previa-copa-*.jpg`.
- A demonstração fictícia estuda tudo três vezes por semana até março. Com as regras 0.3, quase todas as árvores dela chegam a adulta e nenhuma seca.
