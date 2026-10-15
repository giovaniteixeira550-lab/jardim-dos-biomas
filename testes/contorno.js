/** Compara imagens renderizadas; não reproduz a fórmula de profundidade. */
import * as THREE from "three";
import { criarMaterialPixel } from "../src/pixel.js";
import { RAMPAS } from "../src/paleta.js";

const $ = (id) => document.getElementById(id);
const TAM = 64;
const afirmar = (ok, mensagem) => { if (!ok) throw new Error(mensagem); };
const somaRGB = (pixels, i) => pixels[i * 4] + pixels[i * 4 + 1] + pixels[i * 4 + 2];
const diferencaRGB = (a, b, i) => Math.max(...[0, 1, 2].map((c) => Math.abs(a[i * 4 + c] - b[i * 4 + c])));

function registrar(mensagem) {
  const li = document.createElement("li");
  li.textContent = `PASSOU — ${mensagem}`;
  $("resultados").append(li);
}

function mostrar(id, pixels) {
  // readRenderTargetPixels entrega a primeira linha na base da imagem.
  const imagem = new ImageData(TAM, TAM);
  for (let y = 0; y < TAM; y++) {
    const inicio = (TAM - 1 - y) * TAM * 4;
    imagem.data.set(pixels.subarray(inicio, inicio + TAM * 4), y * TAM * 4);
  }
  $(id).getContext("2d").putImageData(imagem, 0, 0);
}

function criarFixture() {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(TAM, TAM, false);
  renderer.toneMapping = THREE.NoToneMapping;
  const entrada = new THREE.WebGLRenderTarget(TAM, TAM, {
    type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    depthTexture: new THREE.DepthTexture(TAM, TAM),
  });
  const saida = new THREE.WebGLRenderTarget(TAM, TAM, {
    type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    depthBuffer: false,
  });
  const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 1, 100);
  camera.position.set(0, 0, 50);
  camera.lookAt(0, 0, 0);
  const pixel = criarMaterialPixel();
  pixel.uniforms.uTam.value.set(TAM, TAM);
  pixel.uniforms.uNear.value = camera.near;
  pixel.uniforms.uFar.value = camera.far;
  pixel.uniforms.uTexel.value = 8 / TAM;
  // Só a fixture desativa estes efeitos para isolar a alteração do contorno.
  pixel.uniforms.uQuant.value = 0;
  pixel.uniforms.uDither.value = 0;
  pixel.uniforms.tCor.value = entrada.texture;
  pixel.uniforms.tProf.value = entrada.depthTexture;
  const quad = new THREE.PlaneGeometry(2, 2), tela = new THREE.Scene();
  tela.add(new THREE.Mesh(quad, pixel));
  const cameraTela = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometriaPlano = new THREE.PlaneGeometry(160, 160);
  const geometriaCubo = new THREE.BoxGeometry(3, 3, 3);
  const materialPlano = new THREE.MeshBasicMaterial({ color: RAMPAS.salvia[3], side: THREE.DoubleSide });
  const materialCubo = new THREE.MeshBasicMaterial({ color: RAMPAS.terra[3] });
  function comparar(cena) {
    renderer.setRenderTarget(entrada);
    renderer.render(cena, camera);
    const imagens = [];
    for (const contorno of [0, 1]) {
      pixel.uniforms.uContorno.value = contorno;
      renderer.setRenderTarget(saida);
      renderer.render(tela, cameraTela);
      const pixels = new Uint8Array(TAM * TAM * 4);
      renderer.readRenderTargetPixels(saida, 0, 0, TAM, TAM, pixels);
      imagens.push(pixels);
    }
    renderer.setRenderTarget(null);
    return imagens;
  }
  return {
    plano() {
      const cena = new THREE.Scene();
      const plano = new THREE.Mesh(geometriaPlano, materialPlano);
      plano.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(80));
      plano.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(23)));
      cena.add(plano);
      return comparar(cena);
    },
    cubo() {
      const cena = new THREE.Scene(), fundo = new THREE.Mesh(geometriaPlano, materialPlano);
      fundo.position.z = -4;
      const cubo = new THREE.Mesh(geometriaCubo, materialCubo);
      cubo.position.z = 3;
      cena.add(fundo, cubo);
      return comparar(cena);
    },
    dispose() {
      geometriaPlano.dispose(); geometriaCubo.dispose(); materialPlano.dispose(); materialCubo.dispose();
      entrada.dispose(); saida.dispose(); pixel.dispose(); quad.dispose(); renderer.dispose();
    },
  };
}

$("executar").onclick = async () => {
  $("executar").disabled = true;
  $("resultados").replaceChildren();
  $("estado").textContent = "Renderizando e lendo os pixels da GPU…";
  $("estado").dataset.resultado = "executando";
  let fixture;
  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    fixture = criarFixture();
    const [planoSem, planoCom] = fixture.plano();
    mostrar("plano-sem", planoSem); mostrar("plano-com", planoCom);
    let diferentes = 0, amostrados = 0;
    const referencia = somaRGB(planoSem, 32 * TAM + 32);
    afirmar(referencia > 90, "Plano não renderizou uma superfície visível");
    for (let y = 7; y < TAM - 7; y++) for (let x = 7; x < TAM - 7; x++) {
      const i = y * TAM + x;
      afirmar(Math.abs(somaRGB(planoSem, i) - referencia) <= 2, "Plano de controle tem interrupção ou mudança de cor");
      if (diferencaRGB(planoSem, planoCom, i) > 2) diferentes++;
      amostrados++;
    }
    afirmar(diferentes === 0, `${diferentes}/${amostrados} pixels interiores do plano ganharam riscos ou brilho falso`);
    registrar(`Plano contínuo inclinado e oblíquo: ${amostrados} pixels interiores preservados, sem riscos.`);

    const [cuboSem, cuboCom] = fixture.cubo();
    mostrar("cubo-sem", cuboSem); mostrar("cubo-com", cuboCom);
    const centro = (32 * TAM + 32) * 4;
    const mascara = Uint8Array.from({ length: TAM * TAM }, (_, i) =>
      Number([0, 1, 2].every((c) => Math.abs(cuboSem[i * 4 + c] - cuboSem[centro + c]) <= 2)));
    const area = mascara.reduce((s, v) => s + v, 0);
    afirmar(area >= 400 && area <= 700, `Cubo não formou a silhueta esperada (${area} pixels)`);
    let faixa = 0, escuros = 0, faltantes = 0, foraDaFaixa = 0;
    for (let y = 2; y < TAM - 2; y++) for (let x = 2; x < TAM - 2; x++) {
      const i = y * TAM + x;
      if (mascara[i]) {
        const interior = mascara[i - 2] && mascara[i + 2] && mascara[i - TAM * 2] && mascara[i + TAM * 2];
        if (interior) afirmar(diferencaRGB(cuboSem, cuboCom, i) <= 2, "Contorno atingiu o interior plano do cubo");
        continue;
      }
      const adjacente = mascara[i - 1] || mascara[i + 1] || mascara[i - TAM] || mascara[i + TAM];
      const escureceu = somaRGB(cuboSem, i) - somaRGB(cuboCom, i) > 20;
      if (adjacente) { faixa++; if (!escureceu) faltantes++; }
      if (escureceu) { escuros++; if (!adjacente) foraDaFaixa++; }
    }
    afirmar(faixa >= 80, "Silhueta não possui bordas suficientes para medir o contorno");
    afirmar(faltantes === 0, `${faltantes}/${faixa} pixels da borda perderam o contorno escuro`);
    afirmar(foraDaFaixa === 0, `${foraDaFaixa} pixels foram escurecidos além da faixa de 1 pixel`);
    afirmar(escuros === faixa, "Espessura do contorno diverge da silhueta renderizada");
    registrar(`Cubo preserva ${escuros} pixels de contorno escuro: exatamente uma faixa externa de 1 pixel.`);
    $("estado").textContent = "As 2 verificações de contorno passaram com WebGL real.";
    $("estado").dataset.resultado = "passou";
  } catch (erro) {
    $("estado").textContent = `FALHOU — ${erro.message}`;
    $("estado").dataset.resultado = "falhou";
    console.error(erro);
  } finally {
    fixture?.dispose();
    $("executar").disabled = false;
  }
};
