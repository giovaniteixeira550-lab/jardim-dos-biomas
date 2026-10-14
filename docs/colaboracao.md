# Trabalho conjunto — Claude e Codex

Este registro comunica o escopo desta proposta. Não prova que outro agente leu ou aceitou uma divisão de trabalho.

## Lote do Codex: encerramento e carregamento da cena

- Branch: `codex/ciclo-de-vida-jardim`.
- Base inicial: `54473ef86feffd8647816562969eb92cb8174fc7`; lote combinado com a v0.6 do Claude, `84d0aaa50a225b8d4eabb9a0b948aa93c32057ca`.
- Arquivos de execução: `src/cena.js` (ciclo de vida e controles) e `src/main.js` (troca de carga e encerramento da página).
- Apoio: `testes/ciclo-de-vida.*`, README, histórico e este registro.
- Preservados: geração do mundo, ecologia, espécies, paleta, shaders e direção de arte.
- O lote não conecta o banco de estudos nem fecha uma nova versão de arte. O histórico o registra como preparação para integração.

## Como integrar sem perder trabalho

1. Trabalhar em branches próprias a partir de uma revisão conhecida.
2. Antes de integrar, atualizar a referência de `main` e inspecionar o diff. Não sobrescrever um arquivo inteiro com uma cópia antiga.
3. Caso o Claude altere `cena.js`, aplicar somente os blocos de ciclo de vida e revisar conflitos preservando o trabalho visual/ecológico.
4. Conciliar entradas do histórico por identificador, preservando entradas de ambos; não diminuir os indicadores de frentes artísticas.
5. Testar a versão combinada no navegador antes de atualizar a demo pública.

## Continuidade

A frente artística/ecológica continua independente. A próxima frente de integração do Codex é identidade persistente e crescimento por planta. Antes dela, inspecionar a versão atual do site e combinar o contrato de plantas com seus identificadores reais. Evitar criar duas implementações concorrentes de dados.

As propostas devem permanecer revisáveis. Sem push direto em `main`, sem force-push e sem edição da cópia local usada por outro agente.

A v0.6 do Claude foi incorporada durante a conferência final: gerador próprio, 16 espécies, quatro arbustos, quatro estágios, viveiro e estilo fixo preservados. O descarte foi adaptado para liberar os quatro modelos de cada variação.
