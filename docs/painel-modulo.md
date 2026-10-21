# Painel "Evolução do módulo" (prévia)

21/10/2026. Pedido do usuário: criar na demo um menu fixo para acompanhar a evolução do módulo, com gráficos e informações úteis sobre os conteúdos estudados, como um apanhado geral. Prévia na branch `claude/painel-evolucao`, sobre `codex/menu-evolucao-demo` (v0.46 + crescimento de longo prazo). Não publicada.

## Brainstorm: o que torna o painel útil

O painel responde a cinco perguntas, nesta ordem de prioridade.

1. **Onde estou no rodízio?** Linha do tempo de 03/11 a 19/12 com duas barras: tempo decorrido e assuntos plantados. Se a segunda fica para trás da primeira, o atraso aparece sem precisar fazer contas.
2. **Como está a floresta?** Quantos dos 278 assuntos estão em semente, broto, muda, jovem e adulta. Há também um gráfico de área com a evolução diária e uma linha de ritmo uniforme até o fim do rodízio.
3. **Estou fixando ou só lendo?** Dias de estudo, taxa de recuperação sem ajuda nos últimos 14 dias comparada às duas semanas anteriores, calendário de dias com estudo e tentativas por semana, separadas pelo resultado (sem ajuda, com pista, após explicação, não recuperou).
4. **Que áreas estão fracas?** Uma linha por área (= espécie), com a barra de estágios e o último estudo. Pode ser ordenada por menos plantadas, mais dificuldades ou estudo mais antigo. Ao abrir uma área, cada assunto vira um quadradinho colorido por estágio, agrupado pelo grupo do catálogo; uma moldura laranja marca dificuldade em aberto.
5. **O que fazer agora?** A aba Próximos tem estas listas:
   - **Perto de crescer:** árvores a um critério da próxima fase, com o que falta e desde quando dá para cumprir; o que já pode ser feito hoje vem primeiro (✓).
   - **Bom momento para recuperar sem ajuda:** assuntos em que uma nova recuperação já conta como espaçada (14 dias desde a última).
   - **Dificuldades em aberto**, por data da última tentativa.
   - **Confusões entre assuntos:** pares A × B; 2 ou mais vezes = frequente, a mesma regra do organizador.
   - **Copa pedindo retorno:** mais de 45 dias ativos sem registro.
   - **Ainda em semente, por área.**

Também há **marcos** (primeiro assunto, 25/50/100… plantados, primeira jovem/adulta, área completa) para dar senso de progresso sem cobrança.

Ideias avaliadas e deixadas para depois:
- Clicar numa área ou num assunto e levar a câmera até a árvore. Depende do vínculo assunto → árvore, que está na prévia separada `14a85cf`.
- Mostrar no mapa os estágios do painel. Depende do adaptador da floresta (ver `docs/crescimento-estudo.md`).
- Sequência de dias seguidos. Foi descartada por contrariar a regra anti-burnout do README: o painel mostra dias nos últimos 14, sem "quebrar" sequência.
- Tempo de estudo em minutos e desempenho em questões por banca. Exigem campos que o organizador ainda não envia para o jardim.

## Decisões de leitura

- **Porte é trajetória, não domínio.** O painel usa o mesmo motor da prévia de crescimento (`crescimento-estudo-0.2`) e repete isso nas notas. Ajuda e erro contam como encontros; só a recuperação sem ajuda leva às fases jovem e adulta.
- **Ritmo informa, não cobra.** O texto mostra a projeção no ritmo das últimas duas semanas e o necessário para plantar todos. Não há alerta vermelho de atraso.
- **Sugestões não mexem no planejador.** As listas são calculadas a partir dos critérios e não gravam nada.

## Dados

Não há registros reais na demo. O seletor tem duas fontes:
- **Exemplo fictício** (`src/exemploModulo.js`): um rodízio simulado e determinístico (semente 2026) de 03/11/2026 a 31/03/2027, com pausa de fim de ano. Um controle de **dia simulado** mostra o painel em qualquer data; os atalhos levam à 1ª semana, ao fim do rodízio e ao fim de março, quando aparecem as árvores adultas. O selo "não são dados seus" fica sempre visível.
- **Início real (vazio):** o estado de hoje sem nenhum registro. O mapa começa do zero.

### Contrato para os registros do site

`window.jardimModulo.carregar(dados)` troca a fonte para os registros informados e devolve o resumo. `window.jardimModulo.limpar()` volta ao seletor.

```js
{
  agora: 'AAAA-MM-DD',                       // opcional; padrão: hoje
  registros: [
    { id: 'único', assunto: '<id da lista v2>', tipo: 'estudo' | 'tentativa' | 'retomada' | 'dificuldade', data: 'AAAA-MM-DD',
      resultado: 'autonomo' | 'pista' | 'apos_explicacao' | 'nao_recuperou' | 'nao_avaliado' },  // resultado só em tentativa
    { id: 'único', assunto: null, tipo: 'pausa', data: 'AAAA-MM-DD', fim: 'AAAA-MM-DD' },        // pausa do módulo inteiro
  ],
  confusoes: [ { a: '<id>', b: '<id>', data: 'AAAA-MM-DD' } ],   // uma linha por ocorrência
}
```

Os ids de assunto são os da lista refinada v2 (`src/catalogoPediatria.js`, copiado sem mudanças da prévia `14a85cf`). A mesma regra de idempotência do motor vale aqui: reenviar um registro com o mesmo id não duplica crescimento.

## Arquivos

- `src/painelModulo.js`: HUD, abas, gráficos SVG e dicas ao passar o mouse.
- `src/resumoModulo.js`: cálculo puro do resumo (sem DOM). A data em que cada assunto alcançou cada estágio é calculada uma vez por lista de registros, porque o porte não depende do relógio.
- `src/exemploModulo.js`: exemplo fictício.
- `src/catalogoPediatria.js`: os 278 assuntos.
- `testes/painel-modulo.mjs`: 6 testes. Cobrem o início vazio, o determinismo, o porte que nunca diminui ao avançar o dia, a coerência das contagens, a lista "perto de crescer" e confusões nos dois sentidos.

## Cores

Os estágios usam um verde só, do escuro (broto) ao claro (adulta); semente é o trilho cinza. Os resultados usam `#568a45`, `#9b80cc`, `#d07a36` e `#a8323a`, da paleta do jardim, validados contra o fundo do painel: separação para daltonismo ≥ 17 e visão normal ≥ 18. O vermelho tem contraste 2,4:1 com o fundo, por isso o gráfico tem legenda, dica e tabela. O calendário usa a rampa da água.

## Verificação

- Testes: 6 novos + 14 do crescimento passaram (`node --test`, com o carregador local do three).
- No navegador: as quatro abas renderizam sem erros no console. A dica do gráfico de área mostra o dia, os estágios e o ritmo. "Fixar" mantém o painel aberto e a aba escolhida depois de recarregar. A fonte vazia esconde a simulação. Em "fim de março" aparecem 85 adultas. Em telas estreitas, o botão e o painel descem quando o título quebra em duas linhas.
- `index.html` não tem `<meta name="viewport">`; por isso, em celular de verdade, a demo inteira (não só o painel) é desenhada como desktop reduzido. A regra de folha inferior em ≤ 560 px fica pronta para quando isso mudar.
