# Trabalho conjunto — Claude e Codex

## Publicação solicitada — v0.36, 18/10/2026

O usuário autorizou publicar a reunião da casa, paisagem e câmera na demo, que é a única base visual em trabalho. Base v0.35 com os geradores do Claude intactos. Não alterar nem publicar o Lovable por esta frente. `docs/publicacao-v036.md` registra a origem dos arquivos e a conciliação. A partir desta versão, casa e paisagem fazem parte de main; não continuar a partir da prévia v0.26 nem do mapa antigo do site.

## Frente atual do Codex — definição do mapa (18/10/2026)

Continuação autorizada: navegação em `src/cena.js`, modo Girar em `index.html`/`src/main.js` e painel recolhível. Sem novos atalhos de local. Documentação em `docs/camera-mapa.md`; histórico registra uma proposta separada. Geradores continuam intactos.

Proposta isolada na branch `codex/nitidez-mapa`, worktree `jardim-nitidez-proposta`, base v0.33. O usuário confirmou a demo artística como destino; a prévia F1 do site está fora desta tarefa. Mudanças: resolução e sombras em `src/cena.js`, cálculo novo em `src/qualidade.js`, seletor em `index.html` e evento em `src/main.js`. Geradores e catálogo não foram alterados. Comparação visual, medições e limites em `docs/nitidez-mapa.md`. Não publicada: aguarda revisão visual. Ao integrar novas espécies, preservar seus arquivos e conciliar somente estes blocos, README e histórico.

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

## Água e lago — v0.24

Escopo em aguaLago.js, acabamento de aguaPercurso.js e entradas da ponte em relevo.js. O lago tem malha de 40 anéis seguindo a costa real, atributos de profundidade e distância da margem, material opaco toon e reflexos espaçados. O rio recorta sua superfície pelo contorno real do lago e deixa de construir barrancos no interior. No campo de alturas, a foz não pode elevar o fundo existente. As duas escadas curtas de acesso à ponte passam a madeira; suas muretas de pedra foram removidas. Demais escadas e formações preservadas. Importações versionadas em 0.24.

## Identidade e frutos — v0.25

Correção em arvoreProc.js, especies.js e novo ornamentos.js, no checkout isolado codex/integridade-especies. Paineira deixa de alternar volumes verdes e rosas na adulta; cores juvenis respeitam folhaJovem2. Flores/frutos usam triângulos reais das copas; palmeiras, jabuticabas e bananas mantêm disposição própria. Catálogo congelado, validação de contratos e teste automaticamente extensível às novas espécies. Sem alterar checkout ou branch do Claude. Critérios e limites em docs/integridade-especies.md.

## Integração aprovada — 16/10/2026

Árvore-Catavento adicionada ao catálogo, à evolução e ao viveiro da demo, em `src/arvoreCatavento.js`. A prévia isolada agora reutiliza esse modelo, evitando duas versões da arte. As seis espécies e a prancheta adicionadas pelo Claude na v0.26 foram preservadas. A espécie está aprovada; sua posição no bosque de Pediatria permanece para composição planejada (raridade zero no plantio aleatório).

Verificação após conciliação: 47 espécies, 564 modelos e 1.296 frutos; identidade, atributos finitos, repetição por semente e ordem invertida passaram. O Catavento também verifica as contagens de leques e folhas por fase e a presença das quatro cores. Captura em `historico/v0.28-catavento.png`.
## Pitanga-de-Sol — v0.27 (Claude)

Primeira árvore do mapa de Pediatria, aprovada pelo usuário na prévia isolada `projetos/pitanga-de-sol/`. O gerador próprio fica em `src/pitangaSol.js`. Em `arvoreProc.js`, a única mudança é o desvio `gerador: "pitanga"` no início de `construirVariacao`; as formas genéricas e `ornamentos.js` ficaram intactos. A ficha em `especies.js` usa `disposicao: "proprio"` e é validada por `validarPitanga`. Os modelos registram `userData.arvore` no formato da auditoria (`testes/especies.html` passou com 47 espécies). Os arquivos da Paineira dos Abraços e a integração com o site, do Codex, não foram tocados. Importações versionadas em 0.27 (arvoreProc, especies, pitangaSol, catalogo, evolucao).

## Publicação v0.28 — Catavento e Pitanga preservados

Em 16/10/2026, o usuário autorizou explicitamente a publicação e determinou que toda alteração aprovada entre no projeto e na versão pública. Conciliada a Pitanga-de-Sol publicada pelo Claude na v0.27, sem alterar seu gerador ou suas capturas. A auditoria combinada passou com 48 espécies, 576 modelos e 1.398 frutos. A Árvore-Catavento mantém a arte aprovada e entra no catálogo, evolução e viveiro; a posição no bosque ainda será planejada.

## Correções prioritárias — v0.29

Pedido direto do usuário: corrigir erros das espécies e prioridades do quadro. Ajustado o tamanho exagerado dos brotos genéricos que ultrapassavam a muda; a auditoria Evolução não teve critérios relaxados. Pitanga e Catavento mantêm seus geradores aprovados. Novo módulo viveiro.js organiza os quatro estágios por seus limites geométricos; nomes e seletor ajudam a localizar exemplares e os limites da câmera acompanham as fileiras. As texturas das placas são liberadas no descarte. Alterações concentradas em arvoreProc, cena, main e HUD, sem mudar solo, água, regras de estudo ou plantio. Relatório em docs/correcoes-prioritarias.md; pendências não resolvidas permanecem no quadro.

## Paineira dos Abraços — v0.30 (Claude)

Segunda espécie do bosque de Pediatria aprovada pelo usuário em 16/10/2026, a partir da revisão `propostas-arvores/paineira-abracos-02` (a proposta 01 do Codex foi mantida para comparação). O gerador fica em `src/paineiraAbracos.js`, adaptado da prévia sem alterar a arte. Em `arvoreProc.js`, a forma `paineiraAbracos` usa o mesmo desvio da `catavento` (arquitetura própria, sem enfeites genéricos); `ornamentos.js` recusa enfeites de outra espécie nessa forma. Verificações: `testes/especies.html` (49 espécies, 588 modelos, 1.398 frutos), `testes/crescimento-viveiro.html` e `testes/ciclo-de-vida.html` passaram. A divisão em 11 espécies e os subtemas de cada uma estão em `BASE-ESPECIES-PEDIATRIA.md`, na pasta do projeto.

## Salgueiro das Canções — v0.31 (Claude)

Terceira espécie do bosque de Pediatria, aprovada pelo usuário em 16/10/2026 a partir de `propostas-arvores/salgueiro-cancoes` (três revisões: cortinas trocadas por ramos pendentes com folhas; sinos maiores, dourados e de formato clássico). O gerador fica em `src/salgueiroCancoes.js`. `arvoreProc.js` passou a reunir os geradores próprios aprovados num único mapa `PROPRIOS` (catavento, paineiraAbracos, salgueiroCancoes), em vez de encadear comparações.

**Trabalho paralelo:** o Codex havia preparado, sem commit, outra proposta do Salgueiro neste checkout (branch `codex/salgueiro-cancoes`). Por decisão do usuário, publicou-se a versão aprovada do Claude. A proposta do Codex foi guardada intacta com `git stash` ("Codex: proposta 01 do Salgueiro das Canções…"); recupere com `git stash list` e `git stash show -p`. Para evitar repetição: antes de iniciar uma espécie, confira `PLANO-10-ESPECIES-PEDIATRIA.md` (andamento) e `propostas-arvores/` na pasta do projeto.

## Araucária dos Cometas — v0.32 (Claude)

Quarta espécie do bosque de Pediatria, aprovada pelo usuário em 17/10/2026 a partir de `propostas-arvores/araucaria-cometas` (quatro revisões: cones com luz própria; um cone por pernada; cones aninhados sem simetria; e a reformulação final em copa azul de céu noturno com luas). O gerador fica em `src/araucariaCometas.js` e entra no mapa `PROPRIOS` de `arvoreProc.js`.

**Luz própria (novo recurso compartilhado):** `src/estiloCopa.js` passou a ler o atributo opcional `brilho` (0–1) e a misturar a cor da peça à luz recebida (`outgoingLight`), antes da saída. Isso vale para o material das árvores de `cena.js`, do catálogo e da evolução. Geometrias sem o atributo leem 0 e não mudam. O plano proibia luz por fruto por desempenho; aqui não há luz real, só material, por pedido do usuário. Verificações: `evolucao.html` (51 espécies), `testes/especies.html` (612 modelos, 1.398 frutos) e `testes/crescimento-viveiro.html` (três sementes) passaram; jardim e viveiro conferidos de dia e à noite, sem erros no console. `testes/ciclo-de-vida.html` passa as duas primeiras etapas e fica parado em "Testando saída enquanto a GPU compila…"; a v0.31 publicada para no mesmo ponto neste navegador, então não é efeito desta versão, mas precisa ser investigado.

## Mangue das Pontes — v0.33 (Claude)

Quinta espécie do bosque de Pediatria, aprovada pelo usuário em 17/10/2026 a partir de `propostas-arvores/mangue-pontes`. O gerador fica em `src/manguePontes.js` e entra no mapa `PROPRIOS` de `arvoreProc.js`. O usuário adiantou Mangue e Jabuticabeira, que concentram 6 dos 10 tópicos de Pediatria já estudados; o mapa de árvores e tópicos está em `MAPA-ARVORES-PEDIATRIA.md` e `arvores-pediatria.json`, na pasta do projeto. Verificações: `testes/especies.html` (52 espécies, 624 modelos), `testes/crescimento-viveiro.html` (três sementes) e `evolucao.html` (52 espécies) passaram; viveiro conferido sem erros no console.

**Trabalho paralelo:** a branch `claude/ciclo-de-vida-prazos` (correção dos testes que travavam, sem mudar `src/`) ainda não foi aprovada nem levada ao main. Ela também mexe em `README.md` e `historico.json`, então, ao mesclar, preserve as entradas v0.32 e v0.33.

## Jabuticabeira das Constelações — v0.34 (Claude)

Sexta espécie do bosque de Pediatria, aprovada pelo usuário em 18/10/2026 a partir de `propostas-arvores/jabuticabeira-constelacoes` (quatro revisões: troncos abertos em vaso; copa branca, galhos retorcidos e frutos menores espalhados; tufos nas pontas dos ramos; copa que ilumina à noite). O gerador fica em `src/jabuticabeiraConstelacoes.js` e entra no mapa `PROPRIOS` de `arvoreProc.js`.

**Luz noturna (novo recurso compartilhado):** `src/estiloCopa.js` exporta o uniforme `LUZ_NOTURNA` e lê o atributo opcional `brilhoNoite`; a mistura `brilhoNoite × uNoite` entra depois da luz própria (`brilho`). `cena.js` ajusta o valor em `aplicarHora` (dia 0, entardecer 0,35, noite 1); catálogo e evolução ficam em 0. As chaves de cache dos programas ganharam o sufixo `-noite`. Verificações: `testes/especies.html` (53 espécies, 636 modelos, 1.398 frutos), `testes/crescimento-viveiro.html` (três sementes) e `evolucao.html` (53 espécies) passaram; viveiro conferido à noite com a copa acesa, sem erros no console.

## Árvore dos Ninhos — v0.35 (Claude)

Sétima espécie do bosque de Pediatria, aprovada pelo usuário em 18/10/2026 a partir de `propostas-arvores/arvore-ninhos` (quatro revisões internas e uma com o usuário: o ninho do meio era atravessado pelo braço alto). O gerador fica em `src/arvoreNinhos.js` e entra no mapa `PROPRIOS` de `arvoreProc.js`. O relatório da geometria inclui `atravessados` (galhos que entram nas tigelas), que deve ser zero. Verificações: `testes/especies.html` (54 espécies, 648 modelos), `testes/crescimento-viveiro.html` (três sementes) e `evolucao.html` (54 espécies) passaram; viveiro conferido sem erros no console.

## Árvore dos Segredos — v0.37 (Claude)

Oitava espécie do bosque de Pediatria, aprovada pelo usuário em 18/10/2026 a partir de `propostas-arvores/arvore-segredos` (proposta 02; a 01 foi rejeitada por parecer igual às outras e ter tamanho desproporcional). O gerador fica em `src/arvoreSegredos.js` e entra no mapa `PROPRIOS` de `arvoreProc.js`. **Novo critério do usuário:** cada espécie parte de uma árvore real de referência e copia a arquitetura dela (tronco, ramificação, copa), em vez de mudar só frutos e enfeites. A casca passou por duas revisões: a cor por vértice virava manchas na quantização, e as placas em tijolos desalinhavam os anéis; ficou uma função contínua com cor única por face. Publicada sobre a v0.36 do Codex (casa, paisagem e câmera), sem tocar nesses arquivos além das versões do importmap. Verificações: `testes/especies.html` (55 espécies, 660 modelos), `testes/crescimento-viveiro.html` (três sementes) e `evolucao.html` (55 espécies) passaram; jardim e viveiro carregados sem erros no console. Nota para os testes no painel oculto: `requestAnimationFrame` fica pausado; nesta conferência foi substituído por `setTimeout` só na aba de teste.

## Acabamento de margens — v0.37.1

Reunião com a v0.37 antes da publicação, preservando Árvore dos Segredos, ornamentos e catálogo do Claude. Escopo do Codex: solo, iluminação das encostas, capas de borda e margens do riacho. Nenhuma alteração no Lovable, na posição das árvores ou no campo de alturas.

## Acácia dos Mosaicos — v0.38 (Claude)

Nona espécie do bosque de Pediatria, aprovada pelo usuário em 18/10/2026 a partir de `propostas-arvores/acacia-mosaicos` (quatro revisões internas e uma com o usuário: folhagem amarelo-alaranjada). O gerador fica em `src/acaciaMosaicos.js` e entra no mapa `PROPRIOS` de `arvoreProc.js`. Referência de arquitetura: *Vachellia tortilis*. Publicada sobre a v0.37.1 do Codex, sem tocar no terreno. Verificações: `testes/especies.html` (56 espécies, 672 modelos), `testes/crescimento-viveiro.html` (três sementes) e `evolucao.html` (56 espécies) passaram; jardim e viveiro carregados sem erros no console.

## Oliveira dos Nós — v0.39 (Claude)

Décima primeira e última espécie do bosque de Pediatria, aprovada pelo usuário em 18/10/2026 a partir de `propostas-arvores/oliveira-nos`. O gerador fica em `src/oliveiraNos.js` e entra no mapa `PROPRIOS` de `arvoreProc.js`. Referência: *Olea europaea* centenária. As 11 espécies agora têm arte; falta a composição temática no terreno. Próximo pedido do usuário: uma grande sequoia com balanço, maior que todas, a leste do lago (proposta isolada em `propostas-arvores/sequoia-balanco`).

## Relevo aprovado — v0.39.1

Base v0.39, preservando a Acácia dos Mosaicos e a Oliveira dos Nós. Aprovação do usuário para aplicar a amostra 02 em 18/10/2026. Escopo restrito a geometria visual das bordas, material de parede e registros de versão. Campos do mundo, plantio e geradores de espécies não foram alterados.

## Grande Árvore do balanço — v0.40 (Claude)

Árvore-marco pedida pelo usuário (ele a chama de "sequoia"), aprovada em 18/10/2026 a partir de `propostas-arvores/sequoia-balanco` (proposta 02; a 01, uma sequoia em coluna, foi rejeitada). O gerador fica em `src/grandeArvore.js`: `criarGrandeArvore()` usa a semente aprovada 1859, e `plantarGrandeArvore(m, material)` planta a adulta no local `grande-arvore` do plano mestre (x 129,5, y 36,7 em coordenadas do plano, ou 187 × 52 m no mundo). **Para o Codex:** é um local de tipo `marco` com `raioReserva: 11`. `mundo.js` retira, depois do sorteio, as árvores, arbustos e objetos desse círculo, e a reserva vale para qualquer outro marco futuro. Ao mexer no terreno dessa clareira, mantenha o chão plano num raio de cerca de 12 m: as raízes descem até 0,45 m abaixo do nível. O foco da câmera usa `alturaCamera: 56`. Verificações: o jardim carregou sem erros no console; a árvore ficou a 24 m da trilha, a 45 m do ponto de pesca e fora do lago e do riacho, com o terreno plano no raio de 12 m. As espécies não mudaram, então os testes de espécies não precisaram ser rodados de novo.

## Jardim surpresa, margens naturais e sapos — v0.41 (Claude)

Pedidos do usuário em 19/10/2026, testados na branch `claude/previa-lotacao` e aprovados. **Para o Codex:**

- **Plantio:** `cena.js` chama `aplicarLotacao(m)` logo depois de `gerarMundo` (salvo com `?lotacao=0`). A função troca `m.objetos` e `m.sequenciaPlantio` pelas árvores novas e mantém arbustos, pedras e flores, menos os que caem sob um tronco. Respeita as mesmas reservas do jardim (trilha, água, pontes, quedas, encostas, passarela, casa, marcos) e amplia a área para os platôs fora do retângulo (`AREA` em `lotacao.js`). A semente do jardim é independente da semente do terreno: o terreno continua igual para todos.
- **Margens:** o terreno tem o atributo `aAgua`, a distância em metros até a linha d'água real (o lago por busca radial no nível −0,55; o riacho pela borda do canal), também copiado para as paredes. `solo.js` pinta a beira a partir dele; a chave do programa mudou para `solo-terra-pixel-aprovada-6-margens`. Em `aguaPercurso.js`, as tiras `margens-riacho` e `bordas-grama-riacho` deixaram de receber faces nos trechos comuns (continuam nas cascatas) e foram substituídas pela malha `barranco-natural-riacho` (material do solo, duas faces), que segue o terreno até ~2 m do canal, inclusive dentro da foz (`fatorLago` ≥ 0,99). Ao mexer no corte do canal, mantenha o barranco acima do chão: ele usa a altura máxima numa pequena vizinhança + 7 cm.
- **Lago:** `aguaLago.js` ganhou faixa rasa e espuma pela profundidade real (`vFundo`), com chave `lago-faixas-ondas-2-raso`.
- **Sapos:** `sapos.js` cria sete sapos sobre as posições das vitórias-régias e de pontos secos junto às taboas (registradas em `criarPlantasAquaticas`); `quadroAnim` chama `this.sapos.userData.animar(t)`.

Verificações: `testes/especies.html` (57 espécies) passou; `testes/formacao`, `percursos`, `plantio`, `qualidade` e `trilha-terra` passaram no Node. `testes/desvio-escada.mjs` ("Remoção fora do corredor") e `testes/acabamento-terreno.mjs` (exige o pacote `three` no Node) falham **igualmente na v0.40 publicada**, sem estas mudanças. Jardim carregado com a semente guardada, 7 sapos e o barranco, sem erros do jardim no console.

## Lista refinada de Pediatria — v0.41.1 (Claude)

Pedido do usuário em 19/10/2026: dividir os subtemas grandes em cerca de 270 árvores de uma sessão cada. Resultado: 278 árvores em 118 grupos (os 112 subtemas da v1 com os mesmos ids, mais 6 grupos novos). Arquivos na pasta do projeto, fora do repositório: `arvores-pediatria.json` (v2: `especies[].grupos` e `especies[].arvores`, com `grupo` em cada árvore), `MAPA-ARVORES-PEDIATRIA.md` e o gerador `lista-refinada-pediatria.mjs`, que lê os ids já gravados e não os muda ao renomear. A v1 está guardada em `historico-listas/`. No jardim, só mudou `SUBTEMAS` em `src/lotacao.js`; as árvores de estudo ainda não sabem qual subtema representam.

## Reunião aprovada — v0.42 (Codex)

Escorregador, acesso corrigido pelo lado de fora, borboletas, esquilos e amostra de senescência reunidos sobre v0.41.1 por autorização do usuário. Preservados sapos, margens, jardim surpresa e 278 árvores de estudo. Reserva aplicada antes de distribuir vagas. Detalhes e conferência em docs/publicacao-v042.md. A senescência pública continua demonstrativa, sem dias ou conexão com estudos.

## Vitórias-régias aprovadas — v0.42.1 (Codex)

O usuário aprovou o acabamento em 19/10/2026. Somente o commit visual `900f902` foi conciliado sobre a v0.42 pública. Identidade dos assuntos e revisão da escada continuam em prévias separadas. Detalhes em `docs/vitorias-regias.md`.

## Água em pixel art — v0.43 (Claude)

Pedido do usuário em 19/10/2026: melhorar a qualidade e a arte da água. O shader do lago foi reescrito (faixas chapadas de profundidade, ondinhas de 1 px, espuma na beira, anéis nas folhas, brilhos de sol) e o trecho calmo do riacho seguiu o mesmo estilo; ambos gravam alfa 0,05 para o pós-processamento não pontilhar a água. Geometria, malha e nível da água não mudaram. Proposta na branch `claude/agua-lago`, aprovada e publicada sobre a v0.42.1. Em `testes/agua-lago.html`, a verificação do barranco do riacho procura `bordas-grama-riacho`, que deixou de existir com as margens naturais da v0.41; essa falha já existia antes desta versão.

## Troncos mais altos — v0.44 (Claude)

O usuário apontou que algumas árvores estavam muito baixas e com tronco pequeno. As cinco espécies de Pediatria de arquitetura baixa ganharam fuste mais alto por pós-processamento das geometrias aprovadas (`alongarTronco` em `src/arvoreProc.js`), sem mudar os geradores de cada espécie. `testes/especies.html` passou (57 espécies, 684 modelos, frutos presos). Plantio, posições e as demais espécies não mudaram.

## Roda da fogueira — v0.46 (Claude)

O usuário achou mal aproveitado o platô ao lado da casa e pediu uma fogueira de acampamento para juntar os amigos. Depois de duas revisões dele (bancos de madeira no lugar de troncos e tocos, sem machados, pedras melhores, pilha de toras grossas no lugar do tripé), a roda foi aprovada. Novo local `fogueira` no plano mestre com `raioReserva`; as reservas de `mundo.js` e `lotacao.js` passaram a valer para qualquer local com esse campo. Como as vagas do plantio mudam, árvores perto da clareira podem nascer em outros lugares.
