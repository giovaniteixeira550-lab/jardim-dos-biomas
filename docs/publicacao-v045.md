# Publicação v0.45 — água e correção do gramado

Autorização do usuário em 19/10/2026: “beleza ta bom pode publicar”. Em seguida, pediu auditoria porque a remoção dos quadrados transparentes parecia ausente.

## O que foi reunido

- Cachoeiras aprovadas do commit `054adcc`: virada curva de 0,85 m, lâmina abaulada, veios, espuma e respingos; lago sem pontos piscantes.
- Atualizações públicas até `8aaba84`: massas pictóricas do lago, reflexos lentos e veios sinuosos do riacho preservados na conciliação.
- Correção do chão extraída de `cbaac7f`/`163b370`, somente `src/solo.js` e `src/pixel.js`: manchas independentes da malha e marca intermediária que retira a grade Bayer do gramado seco e do ombro verde. O resultado final continua opaco e com paleta/contorno.
- Identificação v0.45 e URLs dos módulos alterados atualizadas para evitar cache antigo.

## Auditoria do que ficou fora

| Frente | Estado | Referência |
|---|---|---|
| Remoção do quadriculado/losangos do chão | Incluída nesta publicação | `cbaac7f`, `163b370` |
| Capim em moitas orgânicas e flores completas | Prévia, ainda sem aprovação final de publicação | `163b370` |
| Escada do escorregador com cantaria e muretas | Prévia, ainda sem aprovação final de publicação | `0686203` |
| Fichas das árvores com 278 assuntos | Prévia, sem integração com estudos reais | `14a85cf` |
| Proposta antiga de chão com trevos/folhas secas | Rascunho separado; sem aprovação | `e5b3406` |

As vitórias-régias maiores, fauna, acesso ao escorregador, troncos altos e demais alterações já públicas permanecem na base. Nenhum dado real de estudos foi incluído.

## Verificação

38 testes Node da água e dos percursos passaram na reunião. No navegador, seis verificações do gramado e duas do contorno passaram com WebGL real. Cena completa inspecionada com gramado sem grade e água reunida, sem avisos ou erros observados no console. Captura: `historico/v045-agua-gramado.png`. A confirmação da implantação pública é registrada após o envio.
