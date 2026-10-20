# Saída do tobogã — ondulações em movimento

Prévia de 19/10/2026, sobre a v0.45 (`d7d449d`). O usuário apontou uma “poça estática” na boca do brinquedo.

## Causa e correção

O desenho vinha de nove tubos em arcos incorporados à malha da estrutura. Esses tubos tinham posição, espessura e raio constantes, sem qualquer animação.

Os tubos foram retirados. O efeito agora pertence à própria superfície do lago: três frentes de onda avançam na direção da saída, afinam e perdem contraste antes de desaparecer. O ponto de origem vem da posição e direção finais do percurso do tobogã, com avanço de 1,3 m. A extensão máxima é de 2,85 m e cada ciclo dura 3,125 s. O efeito usa tons vizinhos de azul da paleta, sem o branco fixo dos arcos antigos.

Não cria uma malha de água sobreposta nem acrescenta objetos, intervalos de execução ou recursos por quadro. Usa o uniforme de tempo que já anima o lago. Preserva trajeto, torre, apoios, escadas, vitórias-régias e sapos.

## Conferência

Os 12 testes existentes de água e escorregador passaram, incluindo geometria do brinquedo, percurso/acesso livres e preservação das 278 árvores de estudo. Cena completa conferida no navegador, com aproximação da boca do brinquedo e sem avisos ou erros observados no console. Os arcos rígidos desapareceram e as ondulações ficam integradas ao lago. Registro em `historico/previa-saida-toboga.png`.

Esta revisão fica em prévia, sem publicação, para avaliação do movimento.
