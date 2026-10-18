> Atualização de 18/10/2026: esta revisão foi reunida para publicação na demo v0.36. As referências a prévia não publicada abaixo descrevem o histórico anterior.

# Percurso de terra — Pediatria

## Estado atual — banco de pesca, 17/10/2026

Por solicitação do usuário, o largo do pavilhão, os remates de pedra e as flores recentes foram retirados da cena. O gramado voltou a ocupar a área. As versões anteriores permanecem nas capturas do diário e no backup desta revisão.

O banco agora fica na margem norte do lago, a aproximadamente 1,8 m da costa, olhando para o centro da água. O assento fica horizontal; os apoios se ajustam separadamente à altura real do chão. O trecho final da trilha foi redirecionado para chegar por trás do banco. Não foi criado píer, deque ou nova praça. O mirante permanece no início da caminhada.

37 verificações passaram: percursos anteriores e os três cenários atualizados para o ponto de pesca. As novas verificações cobrem proximidade da margem, orientação, apoio fora da água, ausência de barranco, vegetação livre, acesso conectado e retirada do antigo largo. Comparação com a base confirmou o mesmo riacho, lago, ponte, escadas, eixo central até o desvio final e os mesmos 502 indivíduos de árvores/arbustos da semente 1234.

Conferência visual no navegador, sem erros/avisos no console observado. Captura: `historico/ped-banco-pesca.png`. Prévia local, ainda sem publicação.

As seções abaixo descrevem revisões anteriores.

## Revisão do banco e das flores — 17/10/2026

A frente do banco do largo do lago aponta para o centro do lago a partir de sua posição real. A rotação afeta somente o banco, preservando as pedras de remate e o banco do mirante. Grupos baixos de flores brancas, rosas e amarelas foram acrescentados ao gramado em torno do largo. A distribuição usa a semente do mundo e rejeita o piso da trilha, o largo, água, declives e bases de árvores/arbustos. Caules e pétalas são volumes tridimensionais que recebem a iluminação da cena. Passagem central livre; nenhuma árvore foi movida.

Revisão visual da orientação e da composição no navegador, sem erros/avisos no console observado. Verificação de sintaxe passou. Captura em `historico/ped-banco-lago-flores.png`. Nenhuma publicação nesta revisão.

Revisão local de 17/10/2026 sobre o estudo dos postes aprovados. Sem integração ou publicação na versão principal.

## O que mudou

- Terra em tons da paleta existente, com abrasão discreta, manchas de compactação pequenas, grãos e pedrinhas raras. O desenho segue o chão tridimensional e recebe a luz da cena.
- Bordas com pequenas irregularidades e transição para o capim; retirada da faixa escura contínua.
- Duas terminações deliberadas: largo do mirante e largo do lago, dentro da reserva já existente do pavilhão. Cada um recebe banco de madeira e poucos remates de pedra. Nenhum edifício foi implantado.
- Removido o último trecho que seguia de `[153,57]` a `[185,62]` no plano original de 180 × 120; o terreno real usa escala de 260 × 170. A trilha agora termina no centro da reserva do pavilhão. A antiga faixa aparece como gramado.
- Dois atalhos no painel permitem visitar as pontas. A planta compartilha as mesmas formas dos largos.

## Preservação e verificação

34 testes existentes de percursos passaram; três novos cenários verificam destinos conectados, dentro do mapa, apoiados em solo plano, sem vegetação bloqueando e sem invasão de água. Comparação com o estado anterior na semente 1234 confirmou o mesmo riacho, lago, ponte, todas as amostras de escada, pontos do eixo central e os mesmos 502 indivíduos de árvores/arbustos, incluindo posições e parâmetros.

O corredor histórico de plantio foi mantido exclusivamente como reserva de vegetação para não sortear o bosque de novo. Ele não desenha nem cria estrada: a máscara de terra e o perfil de circulação usam somente o percurso atual. A antiga cauda fica coberta de gramado, sem plantar novas árvores nesta revisão.

Postes: os modelos aprovados foram preservados, com a luminária sob a ponta curva. A distribuição passa a 14 postes nas sementes 1234, 2468 e 9001; as três verificações de preservação, determinismo, apoio e iluminação passaram. Postes que ficavam na cauda removida saem junto com ela.

Revisão visual no navegador: largo do lago de dia, mirante de dia e à noite e vista geral. Console da versão final sem erros/avisos observados. Sem medição de desempenho em celular. O acesso do jardim de chegada e a ponte das encostas continuam sendo frentes anteriores independentes, não redesenhadas neste lote.

Capturas em `historico/ped-terra-lago.png`, `historico/ped-terra-mirante.png`, `historico/ped-terra-noite.png` e `historico/ped-terra-geral.png`.
