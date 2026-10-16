# Chão do bosque — proposta em revisão

Frente do Codex separada da criação das espécies de Pediatria. Base: v0.31 (`52ca795`). A Araucária dos Cometas continua com o Claude.

Folhas secas formam pequenos grupos irregulares em torno das posições das árvores; trevos aparecem em manchas na transição entre bosque e clareira. Água, caminhos, encostas íngremes, áreas reservadas e passarela são excluídos. Cada vértice consulta a altitude do mundo e recebe uma pequena dobra em volume, mantendo paleta, contorno, pixel mínimo e iluminação da cena. Não há animação ou novas luzes.

`coberturaSolo.js` escolhe posições com semente independente; não consome o gerador de árvores, modifica o terreno nem altera objetos existentes. `detalhesSolo.js` reúne todos os elementos em duas malhas estáticas, com descarte pelo mecanismo normal da cena. Na semente 1234 são 5.026 folhas e 326 trevos.

Prévia: `projetos/chao-bosque/`, servindo a raiz do repositório. O botão de antes/depois preserva câmera e vegetação; ocultar árvores é um recurso exclusivo da prévia para inspecionar o chão. A mesma cena e os mesmos módulos alimentam a página principal desta branch.

Verificação automática: `node --test testes/cobertura-solo.mjs`. Distribuição também examinada nas sementes 42 (5.305 folhas, 452 trevos) e 2026 (3.893 folhas, 385 trevos). Não há promessa de número fixo para outras sementes. A comparação visual e os vértices são conferidos na página da prévia. Desempenho em aparelhos móveis continua sem medição.

Esta proposta aguarda avaliação artística. Não fecha versão, não altera main nem publica no GitHub Pages.

Conferência visual em 16/10/2026: comparação com e sem detalhes na mesma câmera, trevos, chão com árvores ocultas, giro de 45° e vista geral. Console sem avisos ou erros. A verificação da página passou para 108.072 vértices finitos acima da altitude do terreno. Capturas em `historico/proposta-chao-antes.png` e `historico/proposta-chao-depois.png`. Os dois testes automáticos passaram; não foi feita medição comparável de FPS ou memória.
