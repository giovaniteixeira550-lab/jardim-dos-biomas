# Margens e encostas com leitura natural

Pedido de 18/10/2026: reduzir pontas e irregularidades artificiais em barrancos, margens e transições de terra, usando referências de cenários de jogos. A foto enviada mostra a encosta junto à casa. Trabalho isolado da criação de espécies do Claude.

## Referências consultadas

- [Riverfall, por Tobias Koepp — Unreal Engine](https://www.unrealengine.com/tech-blog/creating-a-stylized-world-with-unreal-engine-4): formas e silhuetas legíveis, biblioteca de elementos naturais e materiais que não competem com a composição. O autor descreve evitar ruído excessivo no terreno. Referência de direção artística, sem copiar modelos ou trocar o motor.
- [Forest Waypoint, por Jaume Rovira](https://80.lv/articles/forest-waypoint-in-ue4-creating-stylized-landscape-and-materials): integração visual entre rochas, terreno, vegetação e rio, com inspiração declarada em Breath of the Wild. O princípio aproveitado é continuidade entre os materiais, não a reprodução daquele cenário.

## Aplicação na demo

As faces do barranco passam a conservar as normais do terreno compartilhadas pelos vértices. Antes, a normal era recalculada por triângulo após separar a parede: uma encosta contínua recebia iluminação fragmentada. A capa de terra e grama fica mais fina, sem avanços largos em pequenas placas, e as transições de musgo usam variação espacial contínua.

As margens do riacho recebem um ombro intermediário, com perfil inclinado em vez de um tampo de canto reto. As normais são compartilhadas nas emendas compatíveis. Nível e percurso da água, cascatas, terreno de apoio, caminhos, casa e árvores permanecem os mesmos. Não se aplica desfoque de tela. A paleta, o contorno e o volume 3D são preservados.

Os ajustes tratam o acabamento geométrico e a iluminação. Não convertem a paisagem em terreno fotorrealista nem mudam o desenho dos platôs.
