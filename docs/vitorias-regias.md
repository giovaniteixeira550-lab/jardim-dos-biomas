# Vitórias-régias maiores — prévia de 19/10/2026

Pedido: deixar as vitórias-régias mais bonitas e maiores. Acabamento aprovado pelo usuário em 19/10/2026 (“ficou bom”). Reunião sobre a v0.42 pública; a prévia de identidade e a nova revisão da escada não fazem parte desta versão.

## Alteração visual

As folhas pequenas e planas com uma grande fatia ausente foram substituídas por folhas inteiras em forma de bandeja: superfície verde com variação suave, borda curva levantada, lábio claro, face externa verde-escura e uma faixa vinho discreta na parte inferior. Nervuras radiais e ramificações são geometria em relevo. Seis das 16 plantas têm flores brancas ou rosadas, com sépalas, três coroas de pétalas côncavas e miolo dourado. É uma representação artística modelada para a demo.

Raio nominal de 1,5–2,1 m, com a borda chegando a aproximadamente 1,035 vez esse raio: diâmetro de cerca de 3,1–4,4 m, contra 1,2–1,9 m anteriormente. A borda sobe cerca de 0,34 m para ser legível na cena em pixel art. A folha permanece apoiada sobre a água a −0,485 m; os sapos usam esse nível real.

O módulo `src/vitoriasRegias.js` usa as mesmas 16 posições de partida, deslocando localmente apenas as que precisariam de espaço ou ficariam sobre terra. Há folga entre folhas, checagem de água sob a borda e sob as flores, e reserva em torno da saída do escorregador. A distribuição é determinística pela semente. Uma folha só é omitida se nenhum dos 420 candidatos locais oferecer água e folga suficientes; no jardim padrão, as 16 foram preservadas.

## Preservação e recursos

- Os cinco sorteios de cada folha antiga continuam consumidos na mesma ordem. As taboas e os pontos da beira permanecem nos mesmos lugares.
- Mantidos os sete sapos e suas animações; somente o nível de apoio usa o nível da folha recebida, com alternativa compatível para chamadas antigas.
- Não altera terreno, água, plantio de árvores, fauna terrestre, câmera ou dados de estudo. Mantém quantização da paleta, pixel, contorno e ausência de vento.
- Uma malha por planta, com cores por vértice e menos de 5.000 vértices por modelo. Geometrias e materiais seguem o descarte geral da cena. Não usa imagens externas, texturas novas ou dependências adicionais.

## Verificação

Quatro testes em `testes/vitorias-regias.mjs`: disposição sobre água e passagem livre, folhas separadas, determinismo e sequência de sorteios, geometrias/normais finitas sem triângulos degenerados, borda/flor em volume e apoio dos sete sapos. Inspeção visual e capturas registradas no histórico da prévia.

Resultado final: quatro testes novos passaram; suíte completa com **97 de 98 testes aprovados**. A única falha continua sendo a comparação histórica “Remoção fora do corredor”, em `testes/desvio-escada.mjs`, já documentada antes deste lote. Navegador visível: lago e aproximação das folhas inspecionados, sem avisos ou erros observados no console. Captura: `historico/previa-vitorias-regias-detalhe.jpg`.

Amostra aprovada. A identidade dos assuntos, os vínculos aos estudos e a revisão da escada continuam em frentes separadas.
