# Identidade e apoio dos enfeites — v0.25

O exemplo enviado era a paineira: sua própria configuração misturava volumes verdes e rosas na adulta. Não foi encontrada mutação entre espécies. Corrigimos a segunda cor adulta para rosa e respeitamos `folhaJovem2` nas jovens floríferas; a primeira florada aparece como flores pequenas, em vez de trocar lóbulos inteiros pela cor adulta. A arquitetura em garrafa e os espinhos continuam próprios da paineira; o baobá mantém suas cores e tronco.

O posicionamento antigo tratava qualquer copa como esfera, inclusive volumes achatados, produzindo enfeites distantes da superfície. `ornamentos.js` agora amostra os triângulos reais, ponderados pela área, e escolhe pontos espaçados. Evita o interior de volumes sobrepostos por uma aproximação conservadora de elipsoide. Essa rejeição é aproximada; não equivale a detecção exata de toda interseção entre frutos e folhas. Se não houver espaço, a contagem pode ser menor para evitar empilhamento.

Cada fruto declara `disposicao`: `copa` para distribuição superficial com pedúnculo; `cacho` para pontos sob palmeiras; `tronco` para jabuticabas apoiadas na curva e afunilamento reais; `proprio` para bananas desenhadas pelo gerador específico. Flores do mandacaru continuam nas pontas dos braços. Formas especiais sem superfície apropriada não recebem frutos genéricos silenciosamente.

## Ao criar uma espécie

1. Declarar forma, altura, cores da paleta e disposição dos frutos. Adicionar suporte no gerador para arquiteturas novas, antes de permitir novos tipos de fruto. Não reutilizar um suporte fictício para contornar a validação.
2. Definir cores juvenis e adultas conscientemente. `folha2` representa variação entre volumes completos da copa; não equivale a flores pequenas sobre folhas verdes.
3. Executar `testes/especies.html`: inclui automaticamente todas as entradas do catálogo, quatro estágios e três sementes; compara novamente cada espécie em ordem inversa. O catálogo é congelado recursivamente para impedir alterações acidentais.
4. Conferir visualmente `evolucao.html?especie=ID`, girando as árvores, e o cartão em `historico.html#catalogo`. Verificar também a leitura em tamanho real no jardim. Não considerar a validação numérica uma aprovação artística.

O teste adicional da copa achatada verifica distância do apoio aos triângulos, separação entre frutos e distribuição nos quatro lados. Configurações incompatíveis são recusadas antes de gerar a árvore, com mensagem identificando a espécie. Os metadados de cada modelo registram espécie, estágio, copas e apoio dos enfeites para permitir novas auditorias. As bananas continuam sendo geometria própria e não entram na contagem dos frutos genéricos.

Nenhuma cópia de trabalho do Claude foi modificada. O gerador e o catálogo compartilhados continuam alimentando bosque, viveiro, diário e evolução; paleta, shader de folhagem, contorno e iluminação foram preservados.

## Verificação realizada

Auditoria no navegador: 480 modelos (40 espécies, quatro estágios, três sementes), 1.011 frutos genéricos e do tronco; repetição em ordem inversa; apoios nos triângulos e espaçamento na copa achatada; rejeição de definições incompatíveis. Todas passaram. Catálogo: 40 de 40 prévias adultas. Conferência visual das quatro fases de paineira, macieira, jabuticabeira, buriti e açaí; macieira também girada. Bosque carregado sem erro no console. Câmera/transparência: seis cenários passaram. Terreno/percursos: 56 testes passaram. Capturas reais anexadas ao diário. A auditoria não cobre toda combinação possível de semente, rotação e sobreposição entre indivíduos; a revisão artística continua necessária.
