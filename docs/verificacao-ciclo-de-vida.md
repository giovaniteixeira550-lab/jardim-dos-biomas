# Verificação do lote de encerramento da cena

Data: 14/10/2026. Base artística/ecológica: v0.6 do Claude, `84d0aaa50a225b8d4eabb9a0b948aa93c32057ca`.

Teste executado no navegador com servidor local e os módulos reais de three.js, sem instalação de dependências. A página `testes/ciclo-de-vida.html` apresentou **Todas as 7 verificações passaram**.

| Caso | Resultado |
|---|---|
| Descartar imediatamente e chamar dispose novamente | Cancelamento; não gera mundo; liberação idempotente |
| Descartar durante a geração | Os quatro modelos da primeira variação são liberados uma vez |
| Descartar enquanto compila | Liberação aguarda a conclusão; carga antiga não publica sucesso, controles ou animação |
| Cena ativa | Renderiza com WebGL; teclado funciona; digitação não gira câmera; perda de foco limpa movimento |
| Remontagem | Somente a instância ativa responde; pós-processamento da anterior é liberado uma vez |
| Duas trocas rápidas na página real | Só o último mundo é publicado; um canvas; crescimento anterior interrompido |
| Saída e restauração da página | Preserva a última semente e a escolha do viveiro; cria cena nova |

Nenhum aviso ou erro foi retornado pela consulta aos registros capturados pelo navegador durante a execução final do teste e da demo local. Sintaxe dos módulos, diff e referências às imagens do histórico foram conferidos.

Limites: o teste de compilação usa uma promessa controlada para reproduzir a espera; há também carregamento e renderização reais. A restauração usa eventos PageTransitionEvent disparados pelo teste, sem afirmar que todo navegador efetivamente mantém a página em seu cache de navegação. Não houve benchmark, auditoria de memória prolongada, teste em aparelho móvel ou conexão ao banco de estudos.

Conferência visual: a clareira mantém as novidades da v0.6 (gerador próprio, espécies, estágios, viveiro, pixel mínimo e contorno fixos). Este lote altera o comportamento de encerramento/carregamento, não a direção de arte. Captura em `historico/codex-ciclo-de-vida.jpg`.
