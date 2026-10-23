# Modo do site sem viveiro — v0.48.2

A correção anterior escondia o viveiro apenas quando `parent !== window`. O parâmetro `incorporado=1`, usado no endereço apresentado ao usuário, não ativava essa proteção quando aberto diretamente. Assim, as fileiras de revisão da arte apareciam fora do mapa.

`src/modoSite.js` unifica a detecção: iframe ou parâmetro explícito ativam o modo do site. `montarViveiro` não cria suas malhas e placas nesse modo; `irAoViveiro(true)` fica bloqueado. O atributo que esconde botão e seletor também usa essa detecção, sem alterar origens, mensagens ou recebimento de registros da conta. A demo direta sem o parâmetro conserva o viveiro para revisão artística.

Não há modificação em plantio, indivíduos, geometrias das árvores de estudo, crescimento, clareiras ou banco. Testes executam os métodos reais de criação e navegação, verificando listas vazias de modelos e rótulos, limite da câmera e recusa de visita. A conferência visual deve cobrir o endereço direto com o parâmetro e o iframe do site.

Validação local concluída: 16 testes passaram (dois do modo do site e 14 do caderno). Na cena WebGL direta com `incorporado=1`, a instrumentação confirmou zero malhas de viveiro, zero rótulos, controle oculto e 278 árvores de estudo. Os atributos, hashes geométricos, matrizes adultas e catálogo/posições coincidiram integralmente com a comparação anterior da mesma distribuição (278249951). Captura em `historico/v0.48.2-site-sem-viveiro.png`; sem erros ou avisos observados no console.
