# Escorregador do lago — proposta 01

Pedido de 19/10/2026: começar os objetos de infância com um escorregador grande, de curvas expressivas, desembocando no lago. Base conferida: v0.40, commit 9e21ba8902633961464a7f242873e534cb4332c3. Proposta em cópia e branch próprias; não integrada nem publicada.

## Forma e implantação

Toboágua aberto de 82,7 m por 2,7 m de largura. Duas grandes mudanças de direção em S, com elevação contínua de 11 m até 0,35 m. A superfície do lago está em -0,55 m: a saída fica 0,9 m acima da água e 0,68 do raio normalizado do lago, dentro do contorno. A torre de partida fica no promontório a sudeste; uma escada de 29 degraus parte do patamar natural de 4,5 m.

A calha tem seção côncava, espessura de 16 cm, laterais de 78 cm, leve inclinação transversal nas curvas e bordas vermelhas arredondadas. A pista usa o amarelo da paleta existente; as ferragens, azul da rampa de água. A torre tem piso de tábuas, guarda-corpos, travamentos diagonais, telhado de duas águas e bandeirinha. Doze pares de apoios sustentam o trajeto; os pés usam a altitude real. A boca é horizontal e tem ondas discretas no plano da água.

## Limites da prévia

Nenhuma mudança nos campos de altura, contorno do lago, rio, escadas, pontes, casa ou Grande Árvore. A abertura visual fica restrita ao corredor do brinquedo: árvores e arbustos próximos são ocultados nesta cópia; o sorteio original das espécies continua sendo consumido. O capim próximo da calha é ocultado sem mudar sua sequência de geração. Não há simulação de pessoas deslizando ou física de brinquedo.

O ponto de câmera da proposta é acrescentado depois da construção do terreno, para não participar das reservas das capas do relevo. O primeiro quadro é desenhado após enquadrar o objeto; o ciclo normal de requestAnimationFrame permanece intacto.

## Verificação

Quatro testes em testes/escorregador.mjs: descida contínua e chegada dentro da água, folga de toda a seção em relação ao chão, separação entre lances e atributos finitos na malha da pista e da estrutura. A menor folga calculada até o terreno é 0,836 m. A malha principal tem 6.786 vértices; ferragens, torre, escada e ondas têm 68.295 vértices, reunidos em uma segunda malha.

Revisão: http://127.0.0.1:5651/jardim-escorregador/?local=escorregador . Captura de aprovação: historico/previa-escorregador-lago.png .

Inspeção final no navegador com o painel visível e o ciclo nativo de animação: pista completa, saída sobre a água e vegetação fora da calha. Nenhum aviso ou erro na carga final.

## Acesso acrescentado

Ramal de terra de 118,3 m, com o mesmo material e máscara da trilha original, desde o ponto 193,56 × 76,5 até o pé da escada em 238 × 158. Contorna o lago por leste e sobe o barranco em 18 degraus de 25 cm. A escavação se restringe à escadaria; a água, os percursos anteriores e a geometria do brinquedo permanecem iguais. O ramal fica sempre fora da água (fator mínimo 1,337). A passagem sob a borda do brinquedo tem folga calculada mínima de 2,016 m. Seis testes passaram. Vista geral em index.html?local=acesso-escorregador.
