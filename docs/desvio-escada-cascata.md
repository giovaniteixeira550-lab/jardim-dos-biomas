# Escada afastada da primeira cascata — prévia

Pedido de 18/10/2026: afastar a escada e o caminho que estavam colados ao rio, usando como referência o corredor vermelho desenhado na captura do usuário. Base: v0.39.1. **Prévia local em revisão, sem publicação.**

O lance indicado é o primeiro, entre os patamares de 13,5 m e 9 m, junto à primeira cascata. O lance inferior do vale não faz parte desta alteração.

## Traçado

Os dois pontos que delimitam o primeiro lance foram deslocados 7 m para dentro do terreno, na perpendicular ao seu eixo. A escada continua reta; as ligações com o percurso acontecem nos patamares. O acesso superior ainda parte do mirante e o inferior se reconecta ao mesmo trecho da caminhada. Há uma faixa de grama entre a circulação e o rio.

O chão é reconstruído a partir das alturas naturais antes de abrir o percurso novo. Assim, a escavação antiga e a máscara de terra do caminho antigo desaparecem, devolvendo o gramado junto à água. O curso, os níveis, a largura e as quedas do rio não são movidos; a ponte também permanece onde estava.

## Preservação do plantio

O sorteio da vegetação usa o corredor histórico; depois dele, aplica-se o desvio local. Não há um novo sorteio do bosque inteiro. Somente objetos dentro da passagem nova são retirados. A sequência original de escolha das árvores é preservada, incluindo as entradas eventualmente retiradas, para não trocar as espécies dos indivíduos seguintes. Os postes acompanham as bordas do percurso.

`testes/plantio-antes-escada.json` guarda a referência da semente 1234 extraída da v0.39.1 antes da alteração: objetos, curso e ponte. O teste compara o resultado contra essa referência, exige que os indivíduos restantes mantenham suas propriedades e limita as retiradas ao corredor da passagem.

## Verificação

- 44 testes de percursos, plantio, trilhas e do desvio passaram; mais 24 testes de formação e definição passaram, totalizando **68**.
- A semente 1234 mantém o curso e as quedas do rio idênticos à referência anterior; as coordenadas, o vão, a altura e o arco da ponte também são preservados.
- Na geometria final, foram conferidos **70 pisos, 140 laterais de degraus, 72 margens e três cascatas verticais**, sem invasão do piso pelo chão ou pela capa de grama.
- A vista junto à primeira cascata foi inspecionada no navegador, sem avisos ou erros no console observado. Captura: `historico/previa-escada-afastada.png`.

Prévia: `index.html?local=escada-cascata&previa=desvio`. A nova localização tem um enquadramento que mostra a escada e o espaço até o rio. Os enquadramentos dos locais existentes continuam os mesmos.
