# Caderno do módulo (prévia)

21/10/2026. Prévia na branch `claude/painel-evolucao`, sobre `codex/menu-evolucao-demo` (v0.46 + crescimento de longo prazo). Não publicada.

## Histórico do pedido

1. O usuário pediu um menu fixo para acompanhar a evolução do módulo, com gráficos, como um apanhado geral. A primeira versão era um painel lateral com as abas Resumo, Áreas, Atividade e Próximos, centrado na floresta: estágios, ritmo do rodízio e calendário.
2. Em seguida, ele propôs transformar o menu num **caderno de aprendizado**. O caderno teria uma versão compacta para acompanhar enquanto navega e uma ampliada para consultar. O objetivo era mostrar o que ele consegue fazer com cada conteúdo, e não só quanto estudou. Exemplo dado: "87% de recuperação sem ajuda" precisa dizer quais conteúdos foram avaliados, porque muitas respostas sobre uma mesma parte podem esconder lacunas. A sugestão foi começar pela lista de assuntos e pela ficha de objetivos.

Esta versão implementa a segunda proposta. Os gráficos da primeira foram para a aba Histórico.

## Estrutura

**Cartão compacto** (botão "Caderno do módulo", no canto superior esquerdo):
- Três números: exploração (assuntos), autonomia (objetivos recuperados sem ajuda / objetivos estudados) e retornos em 14 dias.
- A barra de evidências e quantos objetivos estudados ainda não foram avaliados.
- Uma dificuldade em foco, com o próximo passo.
- "Fixar" mantém o cartão aberto ao recarregar a página. "Abrir caderno" abre a versão ampliada.

**Caderno ampliado** (sobre o mapa; Voltar ao jardim ou Esc fecham), com quatro abas:

| Aba | Pergunta | Conteúdo |
|---|---|---|
| Panorama | Como está meu aprendizado nesta área? | Filtro por área; as três dimensões; dificuldades em foco; mudanças com significado; tabela por área; trajetória da floresta |
| Assuntos | O que sei e onde estão minhas lacunas? | Busca (assunto, grupo ou objetivo); filtros por área e situação; ordenação; **Lista** ou **Mapa por áreas**; ficha do assunto |
| Revisar | O que merece minha atenção agora? | Sugestões agrupadas, cada uma com "Por quê" e "Próximo passo"; seleção para o planejador |
| Histórico | Como cheguei até aqui? | Evolução da floresta, tentativas por semana, calendário, sessões por dia e marcos |

### As três dimensões (Panorama)

- **Exploração:** assuntos e objetivos que receberam estudo. Não diz se houve aprendizado.
- **Autonomia demonstrada:** objetivos recuperados sem ajuda pelo menos uma vez, e quantos repetiram isso em encontros separados. Abaixo vem a frase sobre cobertura, por exemplo: "45% das 370 tentativas saíram sem ajuda, mas elas avaliaram só 242 dos 456 objetivos estudados; 172 nunca foram avaliados." É a resposta direta à preocupação com uma taxa alta que esconde lacunas.
- **Acompanhamento:** assuntos com retorno nos últimos 14 dias, assuntos sem retorno há mais de 45 dias e a evidência mais recente.

A árvore continua mostrando a trajetória. Uma árvore adulta pode ter um objetivo que voltou a precisar de ajuda; isso aparece na ficha e não reduz a árvore.

### Evidência por objetivo

Linguagem proposta, sem certificar domínio. Os critérios são operacionais e podem ser revistos:

| Estado | Regra atual |
|---|---|
| Ainda não avaliado | Nenhuma tentativa avaliada neste objetivo (pode ter sido estudado) |
| Recupera com ajuda | A tentativa avaliada mais recente foi com pista, após explicação ou não recuperou |
| Recuperou sem ajuda | A mais recente foi sem ajuda |
| Repetiu a autonomia em encontros separados | A mais recente foi sem ajuda, e houve recuperações sem ajuda em dias separados por pelo menos 14 dias (mesmo intervalo do motor de crescimento) |

O estado segue a evidência **mais recente**. Clicar no estado mostra o motivo, por exemplo: "Na última tentativa (01/12, caso clínico): confundiu com Bronquiolite. Já tinha recuperado sem ajuda em 29/11; essa trajetória continua contando."

### Ficha do assunto

A ficha mostra:
- Área, grupo, estágio da árvore e dias de estudo.
- A tabela de objetivos: objetivo, evidência (com motivo), último contato, encontros e origem ("Observado na atividade" ou "Informado por você").
- **Sua percepção**, em campo próprio: a segurança declarada, de 1 a 5, que não conta como recuperação.
- Sugestões e confusões ligadas ao assunto, e o histórico de registros.

### Revisar

Cada sugestão traz o motivo e uma tentativa concreta:
- **Retomar objetivos que precisaram de ajuda.** O passo depende do resultado: com pista → "tentar um caso diferente antes de consultar a explicação"; após explicação → "explicar com suas palavras e, em outro dia, uma questão nova sem consulta"; não recuperou → "rever o ponto central e tentar de novo em 2 a 3 dias".
- **Comparar assuntos que você confunde:** pares com 2 ou mais confusões, a mesma regra do organizador.
- **Testar o que ainda não foi avaliado:** assunto estudado há 2 dias ou mais com objetivo nunca testado.
- **Repetir a autonomia:** recuperou sem ajuda há 14 dias ou mais, sugerindo uma atividade diferente da última.
- **Árvores a um passo de crescer.**

"Levar ao planejador" monta uma seleção local, só neste navegador. O planejador do site ainda não a recebe, e nada é agendado sozinho.

### Mudanças com significado

São as mudanças dos últimos 14 dias: objetivo que passou a sair sem ajuda depois de precisar de pista ou explicação, autonomia repetida, objetivo que voltou a precisar de ajuda (em tom neutro) e árvore que chegou a jovem ou adulta. Dias estudados e cliques não entram.

## Dados

Fontes no seletor: **Exemplo fictício**, com dia simulado de 03/11/2026 a 31/03/2027, e **Início real (vazio)**. O selo "exemplo fictício" fica sempre visível.

Os **objetivos do exemplo são genéricos**, de 3 a 4 por assunto, escolhidos por palavras do nome: prevenção, conduta, diagnóstico, conceito ou padrão. No site, cada tópico usa seus objetivos cadastrados. No exemplo, as tentativas se concentram nos primeiros objetivos de cada assunto, de propósito, para reproduzir a lacuna que o caderno precisa mostrar.

### Contrato para os registros do site

Os campos seguem o `Evento` de `aprendizado-integrado/src/lib/aprendizado/modelo.ts` (`objetivo_id`, `evidencia`, `atividade`, `confianca`, `fonte`). Na integração, `com_pista` vira `pista` e `estudado` vira `estudo`.

```js
window.jardimModulo.carregar({
  agora: 'AAAA-MM-DD',
  objetivos: [{ id, assunto: '<id da lista v2>', descricao }],
  registros: [
    { id, assunto, objetivo?, tipo: 'estudo' | 'tentativa' | 'retomada' | 'dificuldade', data,
      resultado?: 'autonomo' | 'pista' | 'apos_explicacao' | 'nao_recuperou' | 'nao_avaliado',
      atividade?: 'questão de prova' | 'caso clínico' | ..., fonte?: 'observado' | 'informado',
      evidencia?: 'texto curto do que aconteceu', confianca?: 1..5 },
    { id, assunto: null, tipo: 'pausa', data, fim },
  ],
  confusoes: [{ a, b, data }],
});
```

Um estudo sem `objetivo` conta como contato com todos os objetivos do assunto. Reenviar o mesmo id não duplica crescimento.

## Pendências

- **Localizar a árvore no mapa** e abrir a ficha ao clicar numa árvore. Depende do vínculo assunto → árvore, que está na prévia separada `14a85cf` e ainda não foi aprovado.
- **Planejador:** a seleção é local. Enviar ao planejador do site exige a integração do organizador.
- **Critérios de evidência:** os nomes e regras acima são proposta de interface e ainda precisam ser aprovados.
- `index.html` não tem `<meta name="viewport">`; em celular, a demo inteira aparece como desktop reduzido.

## Arquivos

- `src/painelModulo.js`: cartão compacto, caderno, abas, ficha e gráficos SVG.
- `src/resumoModulo.js`: cálculo puro, com estágios, evidência por objetivo, três dimensões, sugestões, mudanças e sessões.
- `src/exemploModulo.js`: exemplo fictício e objetivos genéricos.
- `src/catalogoPediatria.js`: os 278 assuntos, copiado sem mudanças da prévia `14a85cf`.
- `testes/painel-modulo.mjs`: 12 testes.

## Cores

- Estágios da árvore: um verde só, do escuro (broto) ao claro (adulta).
- Evidência: lilás `#9b80cc` para "com ajuda", verde `#568a45` para "sem ajuda" e verde-claro `#c6dd84` para "repetiu". A separação entre lilás e verde para daltonismo é ≥ 17. "Não avaliado" é um quadrado vazado e tracejado, para não depender só da cor. Todos os estados também aparecem por extenso.
- Resultados das tentativas: os mesmos da versão anterior, validados. O calendário usa a rampa da água.
- Texto de leitura em fonte de sistema, 13–14 px; títulos e moldura continuam em pixel art.

## Verificação

- 26 testes passaram: 14 do crescimento e 12 do caderno. Os do caderno cobrem os estados por objetivo, o intervalo da repetição, ajuda posterior que não apaga a trajetória, a cobertura das tentativas no panorama, as sugestões com motivo, as mudanças e os objetivos do exemplo.
- No navegador, sem erros no console, foram conferidos:
  - o cartão compacto;
  - as quatro abas;
  - a busca ("asma"), a ficha com o motivo aberto e o mapa por áreas;
  - "Levar ao planejador";
  - o Esc, que fecha o caderno e mantém o cartão fixado.
