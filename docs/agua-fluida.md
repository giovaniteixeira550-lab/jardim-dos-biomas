# Água — correção da cachoeira e das luzes do lago

Prévia de 19/10/2026, sobre a v0.44 (`2cf1689`), sem publicação.

## Pedido atendido

O lago tinha pontos claros que piscavam sem relação com as ondas. A queda parecia uma parede ligada ao rio por uma quina, com outra linguagem de cor e pouco impacto.

- Removido o mecanismo de pixels de sol piscantes. Permanecem faixas de profundidade, ondas lentas e anéis das vitórias-régias.
- Cada uma das três quedas tem uma virada em arco, tangente à superfície anterior, seguida de uma lâmina subdividida, abaulada e com largura variável.
- Veios se deslocam pela água, a lâmina oscila discretamente e as cores partem da mesma rampa do riacho.
- Espuma no topo, quatro arcos quebrados no impacto e pequenas gotas com trajetórias parabólicas. O progresso é local a cada queda, para posicionar topo e impacto corretamente.

## Preservação

Sem alteração dos dados de terreno, traçado do rio, lago, trilhas, espécies, plantio ou estudos. A superfície anterior recua somente o necessário para encaixar o arco da água. Espuma e gotas usam o relógio e o descarte de recursos existentes.

## Conferência

Quatro testes específicos: atributos finitos nas três quedas e nos respingos; emendas sem fresta e tangente quase horizontal; preservação dos dados e animação da espuma; profundidades/ondas do lago preservadas e mecanismo de piscas removido.

Os 34 testes existentes de percurso passaram, verificando o projeto em cinco sementes, ponte e escadas; com os quatro novos, são 38 verificações aprovadas. A versão final dos quatro testes novos foi executada novamente após ampliar a virada para 0,85 m e acrescentar os respingos.

Cena completa carregada no navegador e inspecionada de frente e em giro de 45 graus, com iluminação diurna e noturna. Nenhum aviso ou erro observado no console nessas vistas. Capturas: `historico/previa-agua-fluida.png` e `historico/previa-agua-fluida-lateral.png`.

Esta é uma animação geométrica e de material adequada à demo, não uma simulação física de fluidos.
