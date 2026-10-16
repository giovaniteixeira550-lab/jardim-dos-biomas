/**
 * Prévia isolada da Pitanga-de-Sol. Mesmo pipeline da vitrine de evolução
 * (evolucao.js): toon de 3 faixas, sombra dura, pixel mínimo 2, contorno e
 * paleta (pixel.js) e o estilo de copa compartilhado. Acrescenta seleção de
 * estágio, giro livre, inclinação e aproximação.
 */
import * as THREE from "three";
import { construirVariacao } from "../../src/arvoreProc.js";
import { ESPECIES } from "../../src/especies.js";
import { verificarPitanga } from "./verificacao.js";
import { RAMPAS } from "../../src/paleta.js";
import { criarMaterialPixel } from "../../src/pixel.js";
import { aplicarEstiloCopa } from "../../src/estiloCopa.js";

const $ = (id) => document.getElementById(id);
const TEXTOS = [
  "Broto — pares de folhas opostas e cruzadas num caule avermelhado; o par mais novo nasce cor de cobre, como as brotações da pitangueira. Sem folhas-semente: a semente fica no solo.",
  "Muda — caule único, ainda fino, com os dois primeiros pares de ramos laterais (opostos e cruzados), folhas aos pares e brotação de cobre no ápice. Estaca e laço, como as demais mudas do jardim.",
  "Jovem — o tronco se divide baixo em três pernadas que começam a arquear. Copa aberta, com ramos à mostra e as primeiras flores brancas de quatro pétalas e pompom de estames.",
  "Adulta — copa baixa e larga sobre quatro pernadas arqueadas e ramos secundários. Frutos com oito gomos e coroa de sépalas, do amarelo ao vermelho, pendurados por pedúnculos em várias alturas e direções.",
];
const NOMES = ["Broto", "Muda", "Jovem", "Adulta"];

const params = new URLSearchParams(location.search);
const semente = Number(params.get("semente")) || 1234;
let renderer, cena, camera, rt, material, pixel, tela, telaCam, sol, ro, variacao;
let modelos = [], modo = 3, giro = 0.6, inclinacao = 32, zoom = 1, encerrado = false;
const direitaCopa = { value: new THREE.Vector2(1, 0) }, eixo = new THREE.Vector3();

function limparModelos() {
  for (const m of modelos) cena.remove(m);
  modelos = [];
}

/** Monta a cena do modo atual: 1 estágio, os 4 lado a lado ou a adulta em 4 ângulos. */
function montar() {
  limparModelos();
  const g = variacao.estagios;
  const lista = modo === "comparar" ? [0, 1, 2, 3] : modo === "angulos" ? [3, 3, 3, 3] : [modo];
  const passo = 8;
  lista.forEach((e, i) => {
    const m = new THREE.Mesh(g[e], material);
    m.castShadow = m.receiveShadow = true;
    if (lista.length > 1) {
      // Escala de comparação (como em evolucao.html): mesma altura, largura limitada.
      const t = g[e].boundingBox.getSize(new THREE.Vector3());
      m.scale.setScalar(Math.min(5.5 / t.y, 7.6 / Math.max(t.x, t.z)));
      m.position.x = (i - 1.5) * passo;
      m.userData.giroExtra = modo === "angulos" ? (i * Math.PI) / 2 : 0;
    } else m.userData.giroExtra = 0;
    cena.add(m);
    modelos.push(m);
  });
  const r = $("rotulos");
  r.style.gridTemplateColumns = `repeat(${lista.length},1fr)`;
  r.replaceChildren(...lista.map((e, i) => Object.assign(document.createElement("span"), { textContent: lista.length === 1 ? "" : modo === "angulos" ? `${i * 90}°` : NOMES[e] })));
  for (const b of document.querySelectorAll("[data-modo]")) b.setAttribute("aria-pressed", String(b.dataset.modo === String(modo)));
  $("descricao").textContent = typeof modo === "number" ? TEXTOS[modo] : modo === "comparar" ? "Os quatro estágios na mesma altura de comparação: observe a mudança de arquitetura — folhas aos pares, ramos laterais, arqueio e copa baixa." : "A adulta girada de 90 em 90 graus: silhueta, pernadas e apoio dos frutos em cada lado.";
  const g3 = g[3].boundingBox;
  $("estado").textContent = `Semente ${semente} · adulta com ${g3.max.y.toFixed(2)} m de altura e ${Math.max(g3.max.x - g3.min.x, g3.max.z - g3.min.z).toFixed(2)} m de copa · ${variacao.info[3].frutos.length} frutos`;
  desenhar();
}

function enquadramento() {
  if (modo === "comparar" || modo === "angulos") return { alvo: new THREE.Vector3(0, 2.4, 0), meia: 16.5 };
  const b = variacao.estagios[modo].boundingBox, s = b.getSize(new THREE.Vector3());
  return { alvo: new THREE.Vector3(0, s.y * 0.45, 0), meia: Math.max(s.y, Math.hypot(s.x, s.z)) * 0.78 + 0.3 };
}

function desenhar() {
  if (encerrado) return;
  const c = $("tela").getBoundingClientRect();
  if (!c.width || !c.height) return;
  renderer.setSize(c.width, c.height, false);
  const w = Math.max(1, Math.floor(c.width / 2)), h = Math.max(1, Math.floor(c.height / 2)); // pixel mínimo 2
  rt.setSize(w, h);
  const { alvo, meia } = enquadramento();
  const mw = meia / zoom, aspect = c.width / c.height;
  Object.assign(camera, { left: -mw, right: mw, top: mw / aspect, bottom: -mw / aspect });
  const inc = THREE.MathUtils.degToRad(inclinacao);
  camera.position.set(alvo.x, alvo.y + Math.sin(inc) * 40, alvo.z + Math.cos(inc) * 40);
  camera.lookAt(alvo);
  camera.updateProjectionMatrix();
  for (const m of modelos) m.rotation.y = giro + m.userData.giroExtra;
  pixel.uniforms.uTam.value.set(w, h);
  pixel.uniforms.uTexel.value = (2 * mw) / w;
  eixo.set(1, 0, 0).applyQuaternion(camera.quaternion);
  direitaCopa.value.set(eixo.x, eixo.z).normalize();
  renderer.setRenderTarget(rt);
  renderer.render(cena, camera);
  renderer.setRenderTarget(null);
  pixel.uniforms.tCor.value = rt.texture;
  pixel.uniforms.tProf.value = rt.depthTexture;
  pixel.uniforms.uNear.value = camera.near;
  pixel.uniforms.uFar.value = camera.far;
  renderer.render(tela, telaCam);
}

function definirModo(m) {
  modo = m;
  zoom = 1;
  montar();
}

try {
  renderer = new THREE.WebGLRenderer({ canvas: $("tela"), antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  cena = new THREE.Scene();
  cena.background = new THREE.Color(RAMPAS.salvia[2]);
  const rampa = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 178, 178, 178, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  rampa.minFilter = rampa.magFilter = THREE.NearestFilter;
  rampa.needsUpdate = true;
  material = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide, gradientMap: rampa });
  cena.add(new THREE.HemisphereLight(0xe4ecd2, 0x6c7a52, 1.25));
  sol = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sol.position.set(-12, 25, 18);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.04;
  Object.assign(sol.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
  cena.add(sol);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshToonMaterial({ color: RAMPAS.salvia[3], gradientMap: rampa }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.04;
  chao.receiveShadow = true;
  cena.add(chao);
  camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 200);
  rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(1, 1) });
  pixel = criarMaterialPixel();
  aplicarEstiloCopa(material, direitaCopa, pixel.uniforms.uTexel);
  tela = new THREE.Scene();
  tela.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pixel));
  telaCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  variacao = construirVariacao(ESPECIES.pitanga, semente);

  const pedido = params.get("modo");
  if (pedido === "comparar" || pedido === "angulos") modo = pedido;
  else if (/^[0-3]$/.test(pedido ?? "")) modo = Number(pedido);
  for (const b of document.querySelectorAll("[data-modo]"))
    b.addEventListener("click", () => definirModo(/^\d$/.test(b.dataset.modo) ? Number(b.dataset.modo) : b.dataset.modo));
  const girar = (d) => { giro += d; desenhar(); };
  const aproximar = (f) => { zoom = THREE.MathUtils.clamp(zoom * f, 0.5, 6); desenhar(); };
  $("esq").onclick = () => girar(-Math.PI / 4);
  $("dir").onclick = () => girar(Math.PI / 4);
  $("mais").onclick = () => aproximar(1.25);
  $("menos").onclick = () => aproximar(0.8);
  $("centro").onclick = () => { giro = 0.6; inclinacao = 32; zoom = 1; desenhar(); };

  // Arraste: horizontal gira, vertical inclina; dois dedos fazem pinça.
  const toques = new Map();
  let pinca = 0;
  const cv = $("tela");
  cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); toques.set(e.pointerId, [e.clientX, e.clientY]); cv.classList.add("arrastando"); });
  cv.addEventListener("pointermove", (e) => {
    const ant = toques.get(e.pointerId);
    if (!ant) return;
    toques.set(e.pointerId, [e.clientX, e.clientY]);
    if (toques.size === 2) {
      const [a, b] = [...toques.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinca) aproximar(d / pinca);
      pinca = d;
      return;
    }
    giro += (e.clientX - ant[0]) * 0.01;
    inclinacao = THREE.MathUtils.clamp(inclinacao + (e.clientY - ant[1]) * 0.25, 20, 75);
    desenhar();
  });
  const soltar = (e) => { toques.delete(e.pointerId); pinca = 0; if (!toques.size) cv.classList.remove("arrastando"); };
  cv.addEventListener("pointerup", soltar);
  cv.addEventListener("pointercancel", soltar);
  cv.addEventListener("wheel", (e) => { e.preventDefault(); aproximar(e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  addEventListener("keydown", (e) => {
    if (e.target.closest?.("button") && (e.key === " " || e.key === "Enter")) return;
    const k = e.key.toLowerCase();
    if ("1234".includes(k) && k) definirModo(Number(k) - 1);
    else if (k === "c") definirModo("comparar");
    else if (k === "q") girar(-Math.PI / 4);
    else if (k === "e") girar(Math.PI / 4);
    else if (k === "+" || k === "=") aproximar(1.25);
    else if (k === "-") aproximar(0.8);
  });

  ro = new ResizeObserver(desenhar);
  ro.observe(cv);
  montar();
  // Acesso para inspeção e capturas: window.pitanga.
  window.pitanga = { variacao, definirModo, girar: (graus) => { giro = THREE.MathUtils.degToRad(graus); desenhar(); }, zoom: (z) => { zoom = z; desenhar(); }, inclinar: (g) => { inclinacao = g; desenhar(); } };
  addEventListener("pagehide", () => {
    encerrado = true;
    ro.disconnect();
    limparModelos();
    for (const g of variacao.estagios) g.dispose();
    cena.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); o.shadow?.dispose(); });
    rampa.dispose(); rt.dispose(); pixel.dispose(); tela.children[0].geometry.dispose(); renderer.dispose();
  });
  addEventListener("pageshow", (e) => { if (e.persisted) location.reload(); });
} catch (e) {
  $("estado").textContent = `Não foi possível abrir a prévia: ${e.message}`;
  console.error(e);
}

$("verificar").addEventListener("click", () => {
  $("verificar").disabled = true;
  try {
    const r = verificarPitanga();
    $("resultado").textContent = r.texto;
  } finally { $("verificar").disabled = false; }
});
