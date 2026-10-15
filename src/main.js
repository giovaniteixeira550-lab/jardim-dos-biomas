/** Liga a página (HUD, carregamento) à cena. */
import { Jardim } from "./cena.js";

const $ = (id) => document.getElementById(id);
let jardim = null;
let cargaAtual = 0;
let crescendo = null;
let sementeAtual = 1234;

function pararCrescimento() {
  if (crescendo !== null) cancelAnimationFrame(crescendo);
  crescendo = null;
  $("ver-crescer").textContent = "▶ Ver crescer";
}

async function iniciar(semente) {
  sementeAtual = semente;
  const carga = ++cargaAtual;
  pararCrescimento();
  let instancia = null;
  const tela = $("carregando");
  tela.hidden = false;
  $("erro").hidden = true;
  const progresso = (f, etapa) => {
    if (carga !== cargaAtual) return;
    $("barra").style.width = `${Math.max(3, f * 100)}%`;
    tela.querySelector('[role="progressbar"]').setAttribute("aria-valuenow", String(Math.round(f * 100)));
    $("etapa").textContent = etapa;
  };
  try {
    jardim?.dispose();
    jardim = null;
    window.jardim = null;
    // Recomeçar o mundo: o jeito mais limpo é um canvas novo.
    const antigo = $("mapa");
    const canvas = antigo.cloneNode(false);
    antigo.replaceWith(canvas);
    instancia = new Jardim(canvas);
    jardim = instancia;
    jardim.setCrescimento(Number($("crescimento").value));
    // Ficha da árvore clicada (cada árvore é um indivíduo).
    $("ficha").hidden = true;
    jardim.aoSelecionar = (a) => {
      if (carga !== cargaAtual) return;
      $("ficha").hidden = !a;
      if (!a) return;
      $("ficha-nome").textContent = a.nome;
      const cab = a.numero === "viveiro" ? [] : [`Indivíduo nº ${a.numero}`];
      $("ficha-dados").textContent = [...cab, `Estágio: ${a.estagio}`, ...(a.extra ?? [])].join("\n");
    };
    await instancia.carregar(semente, progresso);
    if (carga !== cargaAtual) return;
    jardim.setHora(document.querySelector("[data-hora][aria-pressed='true']").dataset.hora);
    jardim.irAoViveiro($("viveiro").getAttribute("aria-pressed") === "true");
    $("info").textContent = `Semente ${semente} · ${jardim.info().instancias} árvores e arbustos`;
    window.jardim = jardim;
    tela.hidden = true;
  } catch (e) {
    instancia?.dispose();
    if (carga !== cargaAtual || e?.name === "AbortError") return;
    jardim = null;
    window.jardim = null;
    console.error(e);
    $("erro").hidden = false;
    // Mostra a causa real (ajuda a corrigir); sem WebGL a mensagem já diz isso.
    $("erro").textContent = `Não foi possível montar o jardim: ${e?.message ?? e}`;
  }
}

$("crescimento").addEventListener("input", (e) => {
  const v = Number(e.target.value);
  $("v-crescimento").textContent = `${Math.round(v * 100)}%`;
  jardim?.setCrescimento(v);
});
for (const b of document.querySelectorAll("[data-hora]"))
  b.addEventListener("click", () => {
    for (const o of document.querySelectorAll("[data-hora]")) o.setAttribute("aria-pressed", String(o === b));
    jardim?.setHora(b.dataset.hora);
  });
$("girar-esq").addEventListener("click", () => jardim?.girar(-1));
$("girar-dir").addEventListener("click", () => jardim?.girar(1));
$("zoom-mais").addEventListener("click", () => jardim?.zoom(0.8));
$("zoom-menos").addEventListener("click", () => jardim?.zoom(1.25));
$("recentrar").addEventListener("click", () => {
  jardim?.recentrar();
  $("viveiro").setAttribute("aria-pressed", "false");
  $("viveiro").textContent = "Viveiro";
});
$("novo").addEventListener("click", () => iniciar(Math.floor(Math.random() * 1e6)));
// Viveiro: todas as espécies, do broto à adulta, lado a lado.
$("viveiro").addEventListener("click", () => {
  const ir = $("viveiro").getAttribute("aria-pressed") !== "true";
  $("viveiro").setAttribute("aria-pressed", String(ir));
  $("viveiro").textContent = ir ? "Bosque" : "Viveiro";
  jardim?.irAoViveiro(ir);
});

// "Ver crescer": 0 → 100% em ~12 s.
$("ver-crescer").addEventListener("click", () => {
  if (crescendo !== null) {
    pararCrescimento();
    return;
  }
  const t0 = performance.now();
  $("ver-crescer").textContent = "❚❚ Pausar";
  const passo = () => {
    const v = Math.min(1, (performance.now() - t0) / 12000);
    $("crescimento").value = String(v);
    $("crescimento").dispatchEvent(new Event("input"));
    if (v < 1) crescendo = requestAnimationFrame(passo);
    else {
      crescendo = null;
      $("ver-crescer").textContent = "▶ Ver crescer";
    }
  };
  crescendo = requestAnimationFrame(passo);
});

// pagehide também cobre navegação com cache de página (voltar/avançar).
window.addEventListener("pagehide", () => {
  ++cargaAtual;
  pararCrescimento();
  jardim?.dispose();
  jardim = null;
  window.jardim = null;
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) iniciar(sementeAtual);
});

iniciar(1234);
