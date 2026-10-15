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

## Catálogo, câmera e transparência (base v0.9)

- Integradas as revisões do Claude até fc697d5, incluindo plano do diário, quatro espécies novas e todas as geometrias da v0.8. O gerador atual do Claude foi adotado integralmente, sem misturar outra implementação artística.
- Codex acrescenta catálogo dinâmico no diário, galeria por espécie, giro livre, zoom ampliado e transparência individual por opacidade. Substitui o círculo quadriculado da v0.9 conforme orientação do usuário.
- Preservados os registros históricos de ambos. Câmera/transparência concentram-se em cena.js e controles da página; não alteram paleta, ecologia ou integração de estudos.
- Branch e PR continuam separados de main. Nenhuma cópia local do Claude foi editada.

Na conferência final, também integrada a v0.10 do Claude (f1a84c9): terraços, texturas de paredões, escadas e ecologia preservados. Câmera e transparência verificadas novamente sobre o novo relevo.

## Jardim planejado e continuidade (base v0.11)

Incorporada a v0.11 do Claude (37d4a9c), preservando plantas aquáticas, catálogo e gerador de árvores. O usuário solicitou substituir a composição aleatória por planejamento de terreno e arquitetura. Os novos módulos planoMestre, percursos, relevo e aguaPercurso definem lugares e conexões compartilhados. Planta em planejamento.html. Escopo e estudos em docs/plano-terreno.md. O lote segue na proposta de integração; não modifica a cópia do Claude nem publica main.
