import { Jardim } from "../src/cena.js";

const $ = (id) => document.getElementById(id);
const conferir = (condicao, mensagem) => { if (!condicao) throw new Error(mensagem); };
const quadro = () => new Promise((resolve) => requestAnimationFrame(resolve));
const cancelado = async (promessa) => {
  try { await promessa; } catch (e) {
    conferir(e.name === "AbortError", `Esperado cancelamento, recebido: ${e}`);
    return;
  }
  throw new Error("Carga cancelada terminou como sucesso.");
};
const teclado = (key) => window.dispatchEvent(new KeyboardEvent("keydown", { key }));
async function esperar(condicao) {
  const prazo = performance.now() + 90000;
  while (!condicao()) {
    if (performance.now() > prazo) throw new Error("Tempo esgotado aguardando a demo.");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
const registrar = (texto) => {
  const li = document.createElement("li");
  li.textContent = texto;
  $("resultados").append(li);
};
let atual = null;
let demo = null;
function criar() {
  atual?.dispose();
  const velho = $("canvas"), canvas = velho.cloneNode(false);
  velho.replaceWith(canvas);
  return (atual = new Jardim(canvas));
}

$("executar").addEventListener("click", async () => {
  $("executar").disabled = true;
  $("resultados").replaceChildren();
  demo?.remove();
  try {
    $("estado").textContent = "Testando cancelamento antes da geração…";
    const cedo = criar();
    const cargaCedo = cedo.carregar(1234, () => {});
    cedo.dispose();
    cedo.dispose();
    await cancelado(cargaCedo);
    conferir(!cedo.mundo && cedo.recursosLiberados, "Carga encerrada gerou mundo.");
    registrar("PASSOU — cancelamento imediato e descarte repetido.");

    $("estado").textContent = "Testando saída durante geração das árvores…";
    const parcial = criar();
    let eventosDispose = 0;
    await cancelado(parcial.carregar(1234, (f) => {
      if (f > 0.18 && f < 0.78) {
        const primeira = parcial.variacoes[0];
        for (const geo of primeira.estagios) geo.addEventListener("dispose", () => eventosDispose++);
        parcial.dispose();
      }
    }));
    conferir(eventosDispose === 4 && parcial.variacoes.length === 0, "Os quatro estágios da variação parcial não foram liberados uma vez.");
    registrar("PASSOU — variações ainda não plantadas são liberadas.");

    $("estado").textContent = "Testando saída enquanto a GPU compila…";
    const compilando = criar();
    let resolverCompilacao, avisarCompilacao;
    const iniciouCompilacao = new Promise((resolve) => { avisarCompilacao = resolve; });
    // Barreira controlada: testa a espera assíncrona sem depender da velocidade da GPU.
    compilando.renderer.compileAsync = () => {
      avisarCompilacao();
      return new Promise((resolve) => { resolverCompilacao = resolve; });
    };
    let pronto = false;
    const cargaCompilando = compilando.carregar(1234, (f) => { if (f === 1) pronto = true; });
    const resultadoCancelado = cancelado(cargaCompilando);
    await iniciouCompilacao;
    compilando.dispose();
    conferir(!compilando.recursosLiberados, "GPU foi descartada durante a compilação.");
    resolverCompilacao();
    await resultadoCancelado;
    conferir(compilando.recursosLiberados && !compilando.ro && compilando.raf === null && !pronto,
      "Carga antiga publicou sucesso, observador ou animação.");
    registrar("PASSOU — compilação termina sem reativar a cena encerrada.");

    $("estado").textContent = "Carregando mundo real para testar remontagem e teclado…";
    const vivo = criar();
    await vivo.carregar(1234, (_, etapa) => { $("estado").textContent = etapa; });
    const antigo = vivo.yawAlvo;
    teclado("q");
    conferir(vivo.yawAlvo === antigo - Math.PI / 4, "Teclado da cena ativa não responde.");
    $("texto").dispatchEvent(new KeyboardEvent("keydown", { key: "q", bubbles: true }));
    conferir(vivo.yawAlvo === antigo - Math.PI / 4, "Atalho interferiu com digitação.");
    teclado("w");
    window.dispatchEvent(new Event("blur"));
    conferir(vivo.teclas.size === 0, "Movimento ficou preso ao perder foco.");
    await quadro();
    await quadro();
    conferir(vivo.info().calls > 0, "Cena real não renderizou.");
    const geometriaQuad = vivo.cena2d.children[0].geometry;
    let quadDispose = 0;
    geometriaQuad.addEventListener("dispose", () => quadDispose++);
    vivo.dispose();
    vivo.dispose();
    const giroEncerrado = vivo.yawAlvo;
    teclado("q");
    conferir(vivo.yawAlvo === giroEncerrado && quadDispose === 1 && vivo.cena2d.children.length === 0,
      "Cena descartada respondeu ao teclado ou manteve pós-processamento.");
    registrar("PASSOU — renderização real, teclado, foco e liberação do pós-processamento.");

    // Remonta os controles sem repetir a geração pesada; verifica o mesmo método real.
    const remontado = criar();
    remontado.ligarControles();
    const giroNovo = remontado.yawAlvo;
    teclado("q");
    conferir(remontado.yawAlvo === giroNovo - Math.PI / 4 && vivo.yawAlvo === giroEncerrado,
      "Remontagem duplicou o controle ou atingiu uma cena antiga.");
    remontado.dispose();
    registrar("PASSOU — remontagem responde apenas na instância ativa.");

    $("estado").textContent = "Testando troca rápida de mundos pela página real…";
    demo = document.createElement("iframe");
    demo.title = "Demo real para teste de troca de mundos";
    demo.style.cssText = "width:640px;max-width:100%;height:420px;border:0";
    demo.src = "../index.html";
    document.body.append(demo);
    await esperar(() => demo.contentWindow?.jardim);
    const janela = demo.contentWindow, documento = demo.contentDocument;
    const primeiraCena = janela.jardim;
    documento.getElementById("ver-crescer").click();
    documento.getElementById("novo").click();
    documento.getElementById("novo").click();
    await esperar(() => janela.jardim && documento.getElementById("carregando").hidden);
    conferir(primeiraCena.descartado && primeiraCena.recursosLiberados, "Página manteve o mundo anterior ativo.");
    conferir(documento.querySelectorAll("#mapa").length === 1, "Página acumulou canvas.");
    conferir(documento.getElementById("ver-crescer").textContent === "▶ Ver crescer", "Animação antiga continuou após trocar mundo.");
    const ultimaCena = janela.jardim;
    conferir(documento.getElementById("info").textContent.includes(`Semente ${ultimaCena.mundo.semente}`),
      "Página publicou o resultado de uma carga antiga.");
    const giroAntigo = primeiraCena.yawAlvo, giroAtual = ultimaCena.yawAlvo;
    janela.dispatchEvent(new janela.KeyboardEvent("keydown", { key: "q" }));
    conferir(primeiraCena.yawAlvo === giroAntigo && ultimaCena.yawAlvo === giroAtual - Math.PI / 4,
      "Página respondeu em uma cena antiga.");
    registrar("PASSOU — duas trocas rápidas publicam só o último mundo e param a animação antiga.");
    $("estado").textContent = "Testando restauração da página e do viveiro…";
    documento.getElementById("viveiro").click();
    const sementeFinal = ultimaCena.mundo.semente;
    janela.dispatchEvent(new janela.PageTransitionEvent("pagehide", { persisted: true }));
    conferir(ultimaCena.descartado && janela.jardim === null, "Saída da página manteve a cena ativa.");
    janela.dispatchEvent(new janela.PageTransitionEvent("pageshow", { persisted: true }));
    await esperar(() => janela.jardim);
    conferir(janela.jardim !== ultimaCena && janela.jardim.mundo.semente === sementeFinal,
      "Restauração perdeu a última semente ou reutilizou uma cena encerrada.");
    conferir(documento.getElementById("viveiro").getAttribute("aria-pressed") === "true" && janela.jardim.altura === 46,
      "Restauração perdeu a escolha do viveiro.");
    registrar("PASSOU — eventos de saída/restauração mantêm a semente e a escolha do viveiro.");
    $("estado").textContent = "Todas as 7 verificações passaram.";
  } catch (e) {
    atual?.dispose();
    registrar(`FALHOU — ${e.message}`);
    $("estado").textContent = "Verificação falhou.";
    console.error(e);
  } finally {
    $("executar").disabled = false;
  }
});
window.addEventListener("pagehide", () => atual?.dispose());
