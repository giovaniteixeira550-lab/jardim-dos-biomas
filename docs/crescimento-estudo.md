# Crescimento de longo prazo — conquista e acompanhamento

19/10/2026. Prévia em `codex/crescimento-estudo-longo-prazo`, sobre a v0.45 e a remoção do efeito da saída do tobogã. O usuário autorizou começar o modelo e, depois, pensar em aprimoramentos e avançar. Este lote aprimora a amostra e o motor; a floresta e o site de estudos ainda não recebem esses estados.

## Decisões do modelo

- O porte representa a trajetória acumulada. Erros, ajuda, pausas e ausência não diminuem o estágio conquistado.
- A copa responde ao acompanhamento registrado. Ausência de registro não prova esquecimento, e uma copa acompanhada não certifica domínio.
- Tentativas difíceis e estudo com ajuda também constroem a trajetória. Somente uma tentativa declarada sem ajuda conta como recuperação autônoma. Na amostra o resultado é informado pelo usuário, não observado por um avaliador.
- Crescimento exige encontros reais em datas distintas: o intervalo termina no último encontro, nunca na data do relógio. Esperar não completa uma etapa.
- Retomada e desempenho são sinais separados. Trabalhar uma dificuldade não a resolve automaticamente; a evidência permanece até uma nova tentativa avaliada.
- A condição visual pode melhorar com o retorno ao estudo mesmo quando a tentativa é difícil. Isso representa acompanhamento, não sucesso cognitivo.

## Aprimoramentos da segunda aplicação

A versão inicial permitia completar três recuperações em 28 dias e obter a adulta meses depois apenas com leituras. Nas regras `crescimento-estudo-0.2`, as recuperações sem ajuda também precisam abranger pelo menos 60 dias. Não basta espaçar leituras para satisfazer esse critério.

Antes, cada novo dia de retorno restaurava a copa, e o botão de retomada tinha um bônus maior. Agora as atividades têm o mesmo efeito de acompanhamento e uma nova melhoria visual exige sete dias ativos desde a anterior. Vinte cliques ou retornos diários não repetem a restauração dentro desse intervalo; pausas não o aceleram. A passagem dos sete dias só habilita a próxima melhoria: continua sendo necessário um encontro registrado.

A interface passou a mostrar os critérios cumpridos e pendentes da próxima fase, além da data da última tentativa. O valor percentual de vigor foi substituído por estados descritivos: acompanhada, sem registro recente ou em retomada. A dificuldade continua visível separadamente, inclusive durante ausência ou recuperação da copa.

Há dois exemplos comparáveis: encontros e recuperações distribuídos por quatro meses; encontros distribuídos pelo mesmo período, mas três recuperações limitadas ao primeiro mês. O segundo fica jovem até registrar uma recuperação posterior que complete o intervalo exigido.

## Parâmetros experimentais das novas amostras

| Etapa | Dias distintos de atividade | Intervalo entre primeiro e último encontro | Recuperações sem ajuda espaçadas | Intervalo entre primeira e última recuperação sem ajuda |
|---|---:|---:|---:|---:|
| Muda | 2 | 1 dia | 0 | — |
| Jovem | 5 | 21 dias | 1 | — |
| Adulta | 12 | 90 dias | 3 | 60 dias |

As recuperações contadas precisam estar separadas por pelo menos 14 dias. O intervalo total entre recuperações usa todas as datas de sucesso: inserir um registro antigo não pode reduzir uma conquista por alterar a seleção das datas espaçadas. Critérios são cumulativos; o avanço parcial reconhece as dimensões atendidas dentro da fase.

O motor mantém o teto diário anterior: uma atividade vale um encontro e repetições acrescentam 0,15 até 1,25 por dia. Os mínimos de encontros são 1,8 / 5 / 12 e já são garantidos pelos mínimos de dias distintos dessas regras; por isso a interface não apresenta uma segunda contagem redundante em pontos.

Tolerância sem registro: 45 dias ativos. A alteração visual posterior é gradual, distribuída por 180 dias ativos e limitada a 0,6 no motor. Cada retorno elegível multiplica a perda visual por 0,65, com pelo menos sete dias ativos entre melhorias. O adaptador anatômico suaviza o valor. Esses números são escolhas experimentais de experiência visual, não medidas validadas de conhecimento, memória ou folhas.

Pausas são intervalos de início inclusivo e fim exclusivo, com sobreposições unidas. Suspendem o relógio de acompanhamento e o intervalo da recuperação da copa; não geram atividades nem crescimento. Um estudo voluntariamente registrado durante uma pausa continua sendo uma atividade real.

## Compatibilidade e preservação

A amostra salva continua na chave exclusiva `jardim-amostra-crescimento-v1`, com suas regras registradas. Amostras `crescimento-estudo-0.1` conservam critérios e resposta visual originais. A interface identifica essa versão; novas regras entram ao escolher um exemplo ou começar outra amostra. Não há migração silenciosa que diminua uma conquista anterior.

Salvamento é seguido de releitura antes da mensagem de confirmação. Se um histórico salvo não puder ser lido, o teste temporário não sobrescreve esse conteúdo automaticamente. A substituição acontece somente ao escolher um exemplo ou reiniciar a amostra fictícia. Registros repetidos pelo mesmo ID não duplicam crescimento; o mesmo ID com conteúdo diferente é recusado. Regras desconhecidas, critérios incoerentes e datas inválidas falham explicitamente.

## Visual e verificação

O adaptador `src/visualCrescimentoEstudo.js` usa os estágios reais do gerador. Carvalho e Freixo têm transformação anatômica da copa adulta. A madeira mantém posições, normais e cores originais; geometrias de origem não são alteradas. Nas fases menores há alteração suave de cor da folhagem. Paleta, pixel mínimo, contorno e ausência de vento permanecem.

21 testes passaram: 14 de crescimento/adaptador e sete de senescência. Incluem distribuição das recuperações, espera sem recompensa, teto diário, inserção retroativa de evidência, crescimento monotônico em 80 encontros com erros e pausas, retomada semanal, pausa sem restauração indevida, compatibilidade com regras anteriores, idempotência, validação e madeira preservada.

No navegador foram conferidos: amostra anterior reconhecida sem troca de regras; exemplo concentrado jovem com 28/60 dias de recuperação; nova tentativa posterior permitindo adulta; ausência prolongada sem regressão de fase; retomada mantendo dificuldade pendente; pausa e recarga com preservação do histórico; comparação 3D de Carvalho e Freixo. A conferência final não apresentou avisos ou erros no console observado.

Capturas: `historico/previa-crescimento-criterios.png` e `historico/previa-crescimento-retomada.png`.

## Continuidade

O próximo lote deve ligar históricos individuais aos IDs estáveis dos assuntos, preservando a mesma árvore e os registros originais. Também precisa definir o alcance da evidência dentro de cada assunto: repetir uma única pergunta não comprova cobertura de todos os conteúdos. A atual adulta representa trajetória, não uma avaliação global de competência. Não inferir cobertura que o serviço de estudos não fornece.

Adaptar a copa das 11 espécies de Pediatria exige anatomia própria; não aplicar uma árvore seca genérica. Flores/frutos como marcos de manutenção adulta ainda não foram implementados. A identificação dos 278 assuntos permanece em sua prévia separada, sem incorporar as outras frentes artísticas por arrasto.

Sem sincronização autenticada, alteração de banco, agenda ou dados reais. A publicação pública permanece na v0.45.
