# Correções prioritárias — v0.29

Pedido de 16/10/2026: corrigir erros das espécies novas e as pendências importantes do projeto, preservando o trabalho do Claude e a arte aprovada.

## Crescimento: erro reproduzido e corrigido

A página Evolução interrompia sua auditoria no coqueiro porque o broto media 1,128 m e a muda 0,678 m na semente 1234. A mesma inversão ocorria em bananeira, buriti, açaí, carnaúba e quatro arbustos. O exagero de tamanho aplicado ao broto era fixo em 1,8× e ignorava o tamanho da muda da própria variação.

O gerador genérico agora limita uniformemente apenas os brotos que ultrapassam a muda, preservando suas proporções e deixando margem de crescimento. A auditoria continua exigindo altura progressiva e mudanças de forma: os critérios não foram relaxados para esconder o erro. Pitanga-de-Sol e Árvore-Catavento usam seus geradores próprios e não recebem esse ajuste; seus modelos aprovados foram preservados.

## Viveiro: espaço, identificação e acesso

O espaçamento antigo era fixo: 15 m entre espécies e 17 m entre fileiras, com quatro posições fixas para os estágios. Ignorava as larguras das copas, especialmente a da Pitanga-de-Sol. O novo módulo `src/viveiro.js` usa as caixas reais dos quatro estágios, abre espaço entre exemplares e cria novas fileiras quando necessário. Os testes verificam que suas projeções no chão não se cruzam.

Placas de nomes identificam cada conjunto. Um seletor no modo Viveiro visita diretamente uma espécie, incluindo Pitanga e Catavento. Os limites da câmera acompanham o comprimento real das fileiras, evitando que os últimos conjuntos fiquem inacessíveis. As placas só ficam visíveis no viveiro; suas texturas são liberadas ao descartar a cena.

As árvores continuam 3D e mantêm seus tamanhos reais. Separação física não garante ausência de sobreposição aparente em todo ângulo possível: girar a câmera pode alinhar exemplares em profundidade. O seletor facilita inspecionar um conjunto por vez.

## Verificações

- `testes/crescimento-viveiro.html`: 48 espécies, quatro estágios, três sementes; 576 modelos com crescimento progressivo e sem cruzamento das caixas no chão.
- `testes/especies.html`: identidade, geometria finita, determinismo, enfeites e ordem invertida; 576 modelos e 1.398 frutos.
- Página Evolução: todas as 48 espécies passam, incluindo a verificação de diferenças de forma com tamanho removido.
- `testes/camera-transparencia.html`: inclui nomes, visita direta às duas espécies novas e acesso às fileiras, além da câmera e transparência individuais existentes.
- `testes/ciclo-de-vida.html`: inclui verificação de descarte único das texturas dos nomes e limpeza das posições do viveiro.

## Pendências preservadas

Não foram marcadas como resolvidas as falhas de clique entre lóbulos, a escassez de salgueiros ou a raridade do cristal. Não se alterou o plantio para forçar essas espécies a aparecerem, nem se escolheram posições definitivas para o Catavento. As outras sete espécies do plano de Pediatria continuam conceitos; não receberam modelos ou correções fictícias.
