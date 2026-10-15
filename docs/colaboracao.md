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

Conferência final: integradas também as versões v0.12–v0.15 do Claude (9f09819), preservando mapa de 260×170m, cache dos campos do mundo, medições de carga, desenho do chão, pontilhado suave e textura de folhas. O plano foi ajustado à dimensão maior; o estilo das copas é compartilhado com o catálogo e a galeria.

## Encostas naturais e publicação solicitada (15/10/2026)

Integradas v0.16–v0.17 do Claude (3599561): novas espécies, formas, filtro de brasileiras e anatomia de folhagem preservados. O material das copas foi extraído para o helper compartilhado, sem restaurar o raio-X circular que o usuário já rejeitou.

Este lote concentra-se na paisagem: `formacaoTerreno.js` define crista/ombro/saia, `solo.js` desenha terra sem fiadas, `bordasBarranco.js` acrescenta volume às bordas; água e escadarias usam seus módulos existentes. O campo de alturas continua sendo a referência de apoio. Paleta, pixel 2, contorno, iluminação toon e modelos do Claude foram mantidos. Em 15/10 o usuário pediu explicitamente que as alterações fossem visíveis na demo pública; a entrega inclui publicação de main e conferência do endereço GitHub Pages. Nenhuma cópia local de outro agente foi editada.

## Paredões gráficos (v0.19)

Escopo limitado ao acabamento dos paredões: `solo.js`, `bordasBarranco.js` e correção de falsas bordas em `pixel.js`. A malha e os campos da topografia, as árvores, a câmera e a água continuam os da versão publicada. As referências originais orientam faces angulares grandes, poucos tons, fraturas interrompidas e capa verde recortada. A correção do contorno mantém as silhuetas e evita tratar o gradiente contínuo de uma parede oblíqua como várias bordas. A força de pontilhado é menor somente nas faces do barranco, marcada no alfa do alvo intermediário; o resultado final continua opaco e quantizado na paleta. Os demais materiais mantêm a força anterior.

## Relevo distribuído (v0.20)

Correção da composição solicitada pelo usuário: seis regiões autorais com curvas suaves e cumes deslocados. Mudanças em formacaoTerreno, lugares da planta e enquadramento inicial. Solo, folhas, água e controles anteriores preservados. Trabalho isolado em codex/relevo-distribuido, sem modificar a cópia do Claude. Publicação na demo autorizada pelo usuário.

## Desvio e ponte inferior — v0.21

Alteração delimitada ao traçado de planoMestre, conforme imagem do usuário. Sem mudanças em materiais, modelos ou topografia autoral. Percursos existentes recalculam escadas, ponte e apoio no terreno. Importações versionadas atualizadas para 0.21 para evitar o cache antigo. Testes cobrem a nova travessia a jusante e a remoção da antiga.

## Refinamento das escadas — v0.22

Escopo: lajes e bordas de relevo.js, modulação de 0,25 m em percursos.js e remoção de dois pontos de inflexão no meio dos lances da margem esquerda. O desvio e a ponte inferior continuam no mesmo lugar. Normais transversais vêm de um corredor comum; quinas em três faixas e subdivisões de 0,125 m refinam as faces. Copas, paleta, solo e água preservados. Importações atualizadas para 0.22.

## Pontes de madeira aprovadas — v0.23

Proposta 5740c6a aprovada pelo usuário; publica a remoção do percurso ocidental e as duas pontes de madeira. Pedido adicional: ponte inferior arqueada. perfilPonte.js compartilha altura e inclinação entre malha e percurso; o caminho mantém entradas planas. Tábuas giram pela tangente, vigas e guarda-corpos subdividem a curva. Atualizados testes, planta e diário. Nenhuma cópia de outro colaborador foi editada.
