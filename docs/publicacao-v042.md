# v0.42 — escorregador, vida no bosque e senescência

Autorização do usuário em 19/10/2026: publicar todo o trabalho desta sequência, após corrigir o acesso bloqueado pelo tobogã.

## Conteúdo reunido

- Escorregador em S de 82,7 m até o lago e ramal de terra desviado pelo lado de fora da calha e dos apoios. A escadaria no barranco foi deslocada para antes do brinquedo; a chegada continua no pé da escada da torre.
- Borboletas com quatro padrões, percursos entre diferentes destinos, alturas, velocidades e pousos; quantidade reduzida conforme avaliação do usuário, com até 16 visíveis de perto.
- Primeiros esquilos articulados, com corridas, pequenos saltos e pausas para roer ou observar.
- Amostra de senescência de Carvalho e Freixo, com cinco estados e recuperação reversível, disponível em projetos/senescencia/. A cor muda em toda a copa. Sem dias definidos, sem dados reais de estudo e sem secar automaticamente as árvores do mapa.

A reunião parte da versão pública v0.41.1 (`da489dc`), preservando as margens naturais, os sapos, a Grande Árvore e o jardim surpresa de Pediatria. A reserva da área do brinquedo é aplicada antes de distribuir as vagas, para preservar as 278 árvores de estudo e suas quotas por espécie. O terreno, a água e os percursos anteriores são preservados fora da escadaria de acesso.

## Conferência

O teste do acesso usa raios contra as malhas reais da calha e das ferragens em toda a largura do caminho. Também confere sua conexão, distância da água, degraus e preservação das quotas de Pediatria. As verificações das borboletas, esquilos e senescência fazem parte da conferência de publicação.

Revisão visual do conjunto no navegador antes do envio; capturas e resultado final registrados no histórico da versão. A amostra de senescência continua demonstrativa: não representa integração concluída com estudos.

Conferência da reunião v0.42: 93 dos 94 testes Node passaram. A única falha é a comparação de plantio com a fotografia anterior ao desvio da escada (testes/desvio-escada.mjs, “Remoção fora do corredor”), reproduzida separadamente na v0.41.1 pública, sem esta reunião. O mesmo limite já estava registrado em docs/colaboracao.md. Os 23 testes de escorregador/acesso, borboletas, esquilos e senescência passaram, incluindo os dois novos testes de passagem livre e quotas de Pediatria.
