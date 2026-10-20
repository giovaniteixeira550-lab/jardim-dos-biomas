# Crescimento de longo prazo — primeira aplicação

19/10/2026. O usuário escolheu começar a aplicar o modelo discutido: porte/estrutura como conquista permanente e vigor da copa como estado recuperável de acompanhamento. Implementação em `codex/crescimento-estudo-longo-prazo`, sobre a v0.45 e a remoção do efeito do tobogã. Sem publicação e sem alteração do site de estudos.

## O que funciona

- Motor independente da cena em `src/crescimentoEstudo.js`: histórico de um assunto, quatro estágios, retornos em dias distintos, ganho limitado por dia e recuperação espaçada. Esperar sozinho não aumenta o crescimento, pois o intervalo de trajetória termina na última atividade registrada.
- Tentar com pista, após explicação ou sem recuperar acrescenta atividade, preservando a evidência de ajuda; não inventa autonomia. Uma retomada melhora o acompanhamento da copa, mas uma dificuldade permanece pendente de nova avaliação.
- Conquista crescente para um histórico acrescido, sem regressão por erro, tempo sem registro ou mudança de vigor. Reenvios com o mesmo ID não duplicam efeito; conteúdo divergente sob o mesmo ID é recusado.
- Pausas planejadas suspendem somente o relógio de acompanhamento. Intervalos sobrepostos são unidos; pausa e passagem de dias não criam crescimento.
- Copa com perda gradual após tolerância; a volta ao estudo recupera parte do estado. Vinte ações no mesmo dia não restauram a copa vinte vezes. O sinal de ausência de registro não é uma estimativa de esquecimento.
- Adaptador 3D em `src/visualCrescimentoEstudo.js`: estágios reais e pequeno aumento dentro de cada estágio. Na adulta, senescência anatômica preparada para Carvalho e Freixo; madeira original preservada em posições, normais e cores. Nas fases menores, alteração suave de cor da folhagem. Geometrias originais não são modificadas.
- Amostra interativa em `projetos/crescimento-estudo/`: dados fictícios de um assunto, comparação lado a lado, calendário simulado, atividades, ajuda/dificuldade, pausas, configurações para uma nova amostra e salvamento local com releitura. Reabrir restaura o estado. A chave é exclusiva da amostra e não toca o jardim pessoal ou registros de estudo.

## Parâmetros experimentais para avaliação

| Etapa | Dias de estudo distintos | Intervalo entre primeiro e último estudo | Encontros ponderados | Recuperações sem ajuda espaçadas |
|---|---:|---:|---:|---:|
| Muda | 2 | 1 dia | 1,8 | 0 |
| Jovem | 5 | 21 dias | 5 | 1 |
| Adulta | 12 | 90 dias | 12 | 3 |

Uma atividade por dia conta integralmente; cada repetição no mesmo dia acrescenta 0,15, com teto diário de 1,25. Recuperações autônomas precisam de intervalo mínimo de 14 dias entre as contadas. Critérios de etapa são cumulativos, enquanto pequenos avanços dentro da etapa reconhecem dimensões já preenchidas. Os números são parâmetros de protótipo, não limiares cientificamente validados de domínio.

Tolerância inicial sem registro: 45 dias ativos. Depois, perda visual distribuída por 180 dias ativos, limitada a 0,6 no modelo; o adaptador anatômico suaviza esse valor. Cada dia de retorno recupera uma parcela: atividade comum multiplica a perda por 0,55; retomada, por 0,35. O indicador não significa porcentagem de folhas nem porcentagem de conhecimento. Mudanças de ritmo na interface começam uma nova amostra fictícia; migrações de regras de contas reais ainda precisam preservar conquistas existentes.

## Conferência realizada

16 testes passaram: nove novos do modelo/adaptador e sete existentes de senescência. Cobrem espera sem recompensa, teto diário, crescimento em meses, dificuldade sem perda de conquista, pausas sobrepostas, retomada gradual, idempotência, datas/regras inválidas, ordem de evidência no mesmo dia e preservação exata da madeira.

No navegador: primeiro estudo gerou broto; retorno em outro dia gerou muda; encontros distribuídos por quatro semanas geraram jovem; o exemplo de quatro meses chegou à adulta. Depois de 180 dias sem registro, a adulta permaneceu e o vigor visual caiu para 55%. Uma pausa planejada de 30 dias manteve 55%. Tentativa difícil manteve o porte e a contagem de autonomias; a retomada elevou o vigor gradualmente. Recarregar preservou data, registros e estado. Carvalho e Freixo renderizados sem avisos ou erros observados no console.

Captura: `historico/previa-crescimento-estudo.png`.

## Próximo lote

Calibrar os parâmetros com exemplos do usuário; conectar os IDs estáveis dos assuntos e seus registros reais pelo adaptador do site; aplicar estados individuais às árvores da floresta. Expandir senescência para as 11 espécies de Pediatria exige adaptações anatômicas próprias. Floração/frutificação como manutenção adulta ainda não foi implementada.

A amostra local não é acompanhamento autenticado, sincronização com o site nem armazenamento por conta. Eventos reais exigirão validação no serviço de dados, isolamento por usuário e confirmação de persistência. Nenhum banco, agenda, sessão ou regra ativa do site foi alterado.
