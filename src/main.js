/** Liga a página (HUD, carregamento) à cena. */
import { Jardim } from "./cena.js";

const $ = (id) => document.getElementById(id);
let jardim = null;

async function iniciar(semente) {
  const tela = $("carregando");
  tela.hidden = false;
  $("erro").hidden = true;
  const progresso = (f, etapa) => {
    $("barra").style.width = `${Math.max(3, f * 100)}%`;
    tela.querySelector('[role="progressbar"]').setAttribute("aria-valuenow", String(Math.round(f * 100)));
    $("etapa").textContent = etapa;
  };
  try {
    // Recomeçar o mundo: o jeito mais limpo é um canvas novo.
    const antigo = $("mapa");
    const canvas = antigo.cloneNode(false);
    antigo.replaceWith(canvas);
    jardim?.dispose?.();
    jardim = new Jardim(canvas);
    jardim.setCrescimento(Number($("crescimento").value));
    jardim.setVento(Number($("vento").value));
    jardim.tamPixel = Number($("pixel").value);
    // Ficha da árvore clicada (cada árvore é um indivíduo).
    $("ficha").hidden = true;
    jardim.aoSelecionar = (a) => {
      $("ficha").hidden = !a;
      if (!a) return;
      $("ficha-nome").textContent = a.nome;
      $("ficha-dados").textContent = [`Indivíduo nº ${a.numero}`, `Estágio: ${a.estagio}`, ...(a.extra ?? [])].join("\n");
    };
    await jardim.carregar(semente, progresso);
    jardim.setHora(document.querySelector("[data-hora][aria-pressed='true']").dataset.hora);
    jardim.setContorno($("contorno").checked);
    jardim.setPaleta($("paleta").checked);
    $("info").textContent = `Semente ${semente} · ${jardim.info().instancias} árvores e arbustos`;
    window.jardim = jardim;
    tela.hidden = true;
  } catch (e) {
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
$("vento").addEventListener("input", (e) => {
  const v = Number(e.target.value);
  $("v-vento").textContent = `${Math.round(v * 100)}%`;
  jardim?.setVento(v);
});
$("pixel").addEventListener("input", (e) => {
  $("v-pixel").textContent = e.target.value;
  jardim?.setTamPixel(Number(e.target.value));
});
$("contorno").addEventListener("change", (e) => jardim?.setContorno(e.target.checked));
$("paleta").addEventListener("change", (e) => jardim?.setPaleta(e.target.checked));
for (const b of document.querySelectorAll("[data-hora]"))
  b.addEventListener("click", () => {
    for (const o of document.querySelectorAll("[data-hora]")) o.setAttribute("aria-pressed", String(o === b));
    jardim?.setHora(b.dataset.hora);
  });
$("girar-esq").addEventListener("click", () => jardim?.girar(-1));
$("girar-dir").addEventListener("click", () => jardim?.girar(1));
$("zoom-mais").addEventListener("click", () => jardim?.zoom(0.8));
$("zoom-menos").addEventListener("click", () => jardim?.zoom(1.25));
$("novo").addEventListener("click", () => iniciar(Math.floor(Math.random() * 1e6)));

// "Ver crescer": 0 → 100% em ~12 s.
let crescendo = null;
$("ver-crescer").addEventListener("click", () => {
  if (crescendo) {
    cancelAnimationFrame(crescendo);
    crescendo = null;
    $("ver-crescer").textContent = "▶ Ver crescer";
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

// Telas pequenas: pixel um pouco menor para caber mais detalhe.
if (window.innerWidth < 560) {
  $("pixel").value = "3";
  $("v-pixel").textContent = "3";
}
iniciar(1234);
