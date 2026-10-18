# Acabamento aprovado do relevo — v0.39.1

Em 18/10/2026 o usuário aprovou a forma limpa da amostra 01, solicitou terra com aparência de pixel art como nas imagens de referência e aprovou a textura da amostra 02 com “ótimo, pode aplicar”. Esta versão leva esse acabamento à demo artística, sobre a v0.39. Preserva também as espécies publicadas depois da base da amostra: Acácia dos Mosaicos e Oliveira dos Nós.

## O que foi aplicado

A textura autoral de 96 × 64 pixels é a mesma da amostra, com quatro tons da paleta de terra, torrões assimétricos, realces curtos e recortes escuros esparsos. Não usa sprites extraídos dos jogos citados pelo usuário. O filtro é de vizinho mais próximo. A distância ao longo das curvas ancora a textura ao volume; a escala foi ajustada proporcionalmente do barranco de 2 m da amostra ao degrau de 4,5 m do mapa. Pequenos cortes sem um contorno completo usam coordenadas fixas do mundo.

As faixas de tampo, chanfro e parede ganham costuras compartilhadas na geometria. Somente vértices novos das costuras recebem um ajuste lateral limitado a 0,10 m; a orientação dos triângulos é conferida e movimentos que a inverteriam são revertidos. As alturas existentes e os campos do mundo não mudam. Corredores de trilha, riacho, lago e locais reservados ficam protegidos desse ajuste.

O antigo conjunto de caixas independentes na borda é substituído por uma capa contínua. A curva é reamostrada por distância e suavizada antes do remate, para a grade não voltar a aparecer como dentes. O remate se afina e se recolhe junto aos percursos, água e construções. A capa é acabamento visual; não altera a função de altitude do mundo.

O material classifica explicitamente as faces de parede, evitando triângulos de gramado decorrentes da normal misturada com o tampo. Mantém a paleta, quantização, pixelização, contorno e iluminação do jardim. A textura pertence à instância do material e é liberada quando ele é descartado.

## Preservação e verificação

- 64 testes existentes passaram: planta, percursos, água, plantio, trilhas e definição de renderização.
- 3 testes específicos passaram: costuras sem fendas internas/inversões na malha de controle; proteção dos corredores; textura determinística em quatro tons e filtro nítido.
- Na geometria real da semente 1234, foram conferidos 69 pisos, 138 bordas laterais de escada, 72 pontos de margem e três cascatas verticais. O descarte da textura foi conferido.
- A integração foi inspecionada no navegador em ângulos diferentes junto à casa e no encontro com a água. Capturas em `historico/v0.39.1-casa.png` e `historico/v0.39.1-riacho.png`.

Não foram modificados `mundo.js`, `percursos.js`, `planoMestre.js`, os geradores de espécies, os materiais das árvores, casa, pontes ou água. O plantio e o estado de estudo permanecem os mesmos. A amostra isolada continua preservada fora do repositório público.

O refinamento acrescenta triângulos locais, em vez de aumentar a resolução da grade inteira. A inspeção de desempenho desta etapa é de desktop; ainda não há medição específica em aparelho móvel. Esta revisão não introduz animação ou desenho por quadro adicional: a textura é uma amostra de uma imagem pequena no material existente.
