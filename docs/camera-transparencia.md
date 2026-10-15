# Câmera e transparência por árvore

Objetivo: enxergar árvores que ficam atrás de outras, preservando os modelos 3D e o estilo do jardim.

## Controles

- Arraste com o botão esquerdo: desloca o mapa.
- Segure o botão do meio e arraste para os lados: gira livremente em 360°. Shift + arraste também gira.
- Segure o botão direito e arraste verticalmente: muda a inclinação entre 20° e 75°. O ângulo inicial é 38°.
- Rodinha, pinça ou botões +/−: aproxima e afasta (altura visível de 8 a 240 metros).
- Dois dedos: pinça aproxima/afasta; torção gira.
- Botão da casa: restaura posição, giro, inclinação e zoom iniciais.
- Q/E e setas de giro continuam oferecendo passos de 45°.

## Transparência

O raycast identifica a árvore inteira sob o ponteiro. Somente aquele indivíduo é desenhado com 22% de opacidade, permitindo reconhecer sua silhueta e enxergar o fundo. O modelo original é restaurado ao sair do mapa, mover para outro objeto, arrastar ou perder o foco da janela. Não existe círculo, raio de influência ou descarte de pixels em xadrez. O toque não mantém uma área transparente presa ao mapa.

Uma cópia visual reutilizável usa a geometria original e um material translúcido separado. A instância opaca daquele indivíduo fica temporariamente oculta; as demais instâncias conservam material e opacidade. O crescimento pode trocar a geometria durante o efeito. Para evitar alternância com as árvores atrás, a interseção sempre considera o modelo opaco restaurado, nunca a cópia transparente. O clique continua abrindo a ficha da árvore apontada.

O alvo de renderização continua com pixel 2, contornos, paleta, materiais toon e sombras duras. O giro e o zoom não reduzem a resolução nem substituem modelos por versões simplificadas. Quanto maior a distância, menos pixels uma árvore ocupa naturalmente. O modelo translúcido não grava profundidade nem projeta sua sombra enquanto o efeito está ativo, favorecendo a leitura do fundo.

## Verificação

`testes/camera-transparencia.html` usa WebGL e o mundo real da semente 1234. Seis cenários verificam: limites de zoom/resolução; transparência exclusiva de um indivíduo; estabilidade da interseção e ficha; restauração; mudança de estágio; controles de giro/inclinação e gesto de dois dedos. Os eventos de gestos são sintéticos, com captura substituída somente no teste; não equivalem a validação em aparelho móvel físico.

As sete verificações existentes de ciclo de vida também passaram na versão combinada com a v0.9 do Claude. Conferência visual no bosque confirmou uma copa inteira translúcida e árvores vizinhas opacas. Capturas antes/depois ficam em `historico/codex-arvore-opaca.jpg` e `historico/codex-arvore-translucida.jpg`. Sem benchmark de desempenho ou publicação em main neste lote.
