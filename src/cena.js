/**
 * Cena do Jardim (demo): mundo 3D renderizado como pixel art.
 *
 * Pipeline: cena 3D (materiais toon de 3 faixas, sombras duras) → alvo de
 * render em baixa resolução → shader de pixel (contorno, brilho de topo,
 * paleta + dithering) → tela com pixels nítidos.
 * Câmera ortográfica em ¾, girando em passos de 45°, com "snap" ao grid de
 * pixels para o cenário não tremeluzir ao mover.
 */
import * as THREE from "three";
import { BarkType, LeafType, Tree } from "ez-tree";

import { BASE, RAMPAS } from "./paleta.js";
import { criarRng, criarRuido, gerarMundo, suave } from "./mundo.js";
import { criarMaterialPixel } from "./pixel.js";
import { ESPECIES, especieDoLugar, estagioDe } from "./especies.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// Cede a vez ao navegador entre etapas do carregamento (atualiza a barra).
// setTimeout em vez de requestAnimationFrame: rAF pausa com a aba em segundo
// plano, e o carregamento ficaria parado até o usuário voltar.
const quadro = () => new Promise((r) => setTimeout(r, 0));
const cor = (hex) => new THREE.Color(hex);

// ---------------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------------

let rampaLuz = null;
/** 3 faixas de luz (sombra, meio-tom, luz) com transição seca. */
function rampa() {
  if (rampaLuz) return rampaLuz;
  rampaLuz = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 178, 178, 178, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  rampaLuz.minFilter = rampaLuz.magFilter = THREE.NearestFilter;
  rampaLuz.generateMipmaps = false;
  rampaLuz.needsUpdate = true;
  return rampaLuz;
}
const toon = (p) => new THREE.MeshToonMaterial({ gradientMap: rampa(), ...p });

/** Casca de bétula: marcas escuras horizontais (lenticelas), em coordenadas locais. Ajuste de shader. */
function marcasDeBetula(shader) {
  shader.vertexShader = "varying vec3 vLocal;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocal = position;");
  shader.fragmentShader =
    "varying vec3 vLocal;\n" +
    shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float faixa = fract(vLocal.y * 0.55 + sin(vLocal.x * 3.1 + vLocal.z * 2.3) * 0.35);
      float marca = step(0.86, faixa) * step(0.35, fract(atan(vLocal.z, vLocal.x) * 0.95 + vLocal.y * 0.13));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.12, 0.11), marca);`,
    );
}

/**
 * Vento em instâncias (adaptado do ez-tree, MIT). Amplitude pela altura:
 * relativa ao topo (`alturaRef` > 0, folhas) ou absoluta (capim).
 * `soAlfa`: a textura só recorta o formato; a cor vem da paleta.
 */
function vento(material, forca, alturaRef = 0, soAlfa = false, vel = 1, ajuste = null) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uForca = { value: forca };
    shader.uniforms.uAltura = { value: alturaRef };
    shader.uniforms.uVel = { value: vel };
    shader.uniforms.uPasso = { value: 0.25 };
    shader.vertexShader =
      `uniform float uTime; uniform float uForca; uniform float uAltura; uniform float uVel; uniform float uPasso;
      float ondaV(vec2 p){ return sin(p.x*0.11 + p.y*0.07) * 0.5 + sin(p.x*0.05 - p.y*0.13 + 1.7) * 0.5; }
      ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
      float fase = 6.28 * ondaV((modelMatrix * mvPosition).xz);
      float h = uAltura > 0.0 ? clamp(position.y / uAltura, 0.0, 1.0) : position.y;
      float s = sin(uTime * 1.1 * uVel + fase) * cos(uTime * 1.55 * uVel + fase);
      // Balanço em DEGRAUS de pixel inteiro (uPasso = 1 pixel no mundo): como
      // animação desenhada à mão. Sem isso, deslocamentos menores que 1 pixel
      // fazem lâminas finas "crescerem e encolherem" a cada quadro.
      vec2 desl = h * uForca * vec2(s, s * 0.6);
      mvPosition.xz += floor(desl / uPasso + 0.5) * uPasso;
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`,
    );
    if (soAlfa) shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "diffuseColor.a *= texture2D(map, vMapUv).a;");
    ajuste?.(shader);
    material.userData.shader = shader;
  };
  material.customProgramCacheKey = () => `vento3-${soAlfa ? 1 : 0}-${ajuste ? ajuste.name : ""}`;
  material.userData.forcaBase = forca;
  return material;
}

// ---------------------------------------------------------------------------
// Espécies (ez-tree + paleta). Menos folhas e maiores ⇒ leitura de "tufos".
// ---------------------------------------------------------------------------

function economizar(o, folhas = 0.7, galhos = 0.5) {
  o.leaves.count = Math.max(1, Math.round(o.leaves.count * folhas));
  o.leaves.size *= 1 / Math.sqrt(folhas);
  for (const k of Object.keys(o.branch.segments)) o.branch.segments[k] = Math.max(Number(k) >= 2 ? 3 : 5, Math.round(o.branch.segments[k] * galhos));
  for (const k of Object.keys(o.branch.sections)) o.branch.sections[k] = Math.max(3, Math.round(o.branch.sections[k] * (0.5 + galhos / 2)));
}

// ---------------------------------------------------------------------------
// Geometrias procedurais pequenas
// ---------------------------------------------------------------------------

/** Touceira de capim: lâminas curvas com gradiente (base escura → ponta clara). */
function touceira(rng) {
  const pos = [], cores = [], idx = [];
  const baseC = cor(RAMPAS.mata[2]), pontaC = cor(RAMPAS.mata[5]), c = new THREE.Color();
  // Menos lâminas, mais largas e menos inclinadas: touceira firme, que lê bem em pixel.
  for (let b = 0; b < 6; b++) {
    const ang = rng() * 6.28, incl = 0.12 + rng() * 0.3, alt = 0.35 + rng() * 0.3, larg = 0.06 + rng() * 0.03;
    const ox = (rng() - 0.5) * 0.25, oz = (rng() - 0.5) * 0.25, dx = Math.cos(ang), dz = Math.sin(ang);
    const i0 = pos.length / 3;
    for (let k = 0; k <= 3; k++) {
      const t = k / 3, cv = incl * t * t, w = larg * (1 - t * 0.9);
      const cx = ox + dx * cv, cz = oz + dz * cv, y = alt * t;
      pos.push(cx - dz * w, y, cz + dx * w, cx + dz * w, y, cz - dx * w);
      c.copy(baseC).lerp(pontaC, t);
      cores.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (k < 3) idx.push(i0 + k * 2, i0 + k * 2 + 1, i0 + k * 2 + 2, i0 + k * 2 + 1, i0 + k * 2 + 3, i0 + k * 2 + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Pedra: icosaedro deformado por ruído, facetado, com musgo no topo. */
function pedraGeo(semente) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const r = criarRuido(semente);
  const p = g.attributes.position;
  const cores = [];
  const cPedra = cor(BASE.pedra), cMusgo = cor(BASE.musgo);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const k = 0.75 + r(v.x * 1.3 + 5, v.z * 1.3 + v.y, 2) * 0.55;
    v.multiplyScalar(k);
    v.y = v.y * 0.6;
    p.setXYZ(i, v.x, v.y, v.z);
    const musgo = v.y > 0.25 && r(v.x * 3, v.z * 3) > 0.45;
    const c = musgo ? cMusgo : cPedra;
    cores.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
  const plano = g.index ? g.toNonIndexed() : g;
  plano.computeVertexNormals(); // normais por face: pedra facetada
  return plano;
}

/**
 * Volume irregular de folhagem: icosaedro com saliências (ruído). Reentrâncias
 * mais escuras, saliências mais claras (cor por vértice) — lê como copa densa.
 * Vértices fundidos ⇒ normais suaves (sem facetas de "pedra").
 */
function volumeIrregular(raio, cx, cy, cz, semente, achatar = 0.85) {
  let g = new THREE.IcosahedronGeometry(1, 2);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const r = criarRuido(semente);
  const p = g.attributes.position;
  const cores = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = r(x * 1.7 + z * 0.8 + 3, y * 1.7 + z * 1.2 + 7, 2);
    const k = raio * (0.8 + n * 0.4);
    p.setXYZ(i, cx + x * k, cy + y * k * achatar, cz + z * k);
    const l = 0.84 + n * 0.26 + y * 0.05;
    cores.set([l, l, l], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(cores, 3));
  g.computeVertexNormals();
  return g.toNonIndexed();
}

/**
 * Copa lobada: agrupa os pontos das folhas geradas pelo ez-tree (k-means) e põe
 * um volume irregular em cada grupo. As folhas em si NÃO são desenhadas: a copa
 * é um corpo só, que balança junto com o tronco.
 */
function copaLobada(folhas, k, rng, fator) {
  const p = folhas.attributes.position;
  const pts = [];
  for (let i = 0; i < p.count; i += 4) pts.push(new THREE.Vector3().fromBufferAttribute(p, i));
  if (pts.length < k) return null;
  const centros = Array.from({ length: k }, () => pts[Math.floor(rng() * pts.length)].clone());
  const grupo = new Int32Array(pts.length);
  for (let it = 0; it < 10; it++) {
    pts.forEach((v, i) => {
      let m = Infinity;
      centros.forEach((c, j) => {
        const d = v.distanceToSquared(c);
        if (d < m) { m = d; grupo[i] = j; }
      });
    });
    const soma = centros.map(() => [new THREE.Vector3(), 0]);
    pts.forEach((v, i) => { soma[grupo[i]][0].add(v); soma[grupo[i]][1]++; });
    soma.forEach(([v, n], j) => n && centros[j].copy(v.divideScalar(n)));
  }
  const partes = [];
  centros.forEach((c, j) => {
    let d = 0, n = 0;
    pts.forEach((v, i) => { if (grupo[i] === j) { d += v.distanceTo(c); n++; } });
    if (n < 6) return;
    partes.push(volumeIrregular((d / n) * fator, c.x, c.y, c.z, Math.floor(rng() * 1e6)));
  });
  return partes.length ? juntar(partes) : null;
}

/** Junta geometrias não indexadas (posição, normal, cor) num só buffer, sem dependências extras. */
function juntar(partes) {
  const total = partes.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), cor = new Float32Array(total * 3).fill(1);
  let o = 0;
  for (const g of partes) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) cor.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3));
  return geo;
}

/**
 * Pinheiro: cones empilhados com a BORDA SERRILHADA (pontas para fora/dentro),
 * a base de cada camada mais escura (sombra da camada de cima).
 */
function copaEmCamadas(folhas, camadas, rng) {
  const bb = folhas.boundingBox;
  const base = bb.min.y + (bb.max.y - bb.min.y) * 0.12;
  const topo = bb.max.y;
  const raioBase = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.42;
  const partes = [];
  for (let i = 0; i < camadas; i++) {
    const t = i / camadas;
    const alt = (topo - base) * (0.34 - t * 0.04);
    const r = raioBase * (1 - t * 0.78) * (0.92 + rng() * 0.16);
    let g = new THREE.ConeGeometry(r, alt, 14, 2, true);
    g.deleteAttribute("normal");
    g.deleteAttribute("uv");
    g = mergeVertices(g);
    const p = g.attributes.position;
    const cores = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      const naBorda = y < -alt / 2 + 1e-3;
      if (naBorda) {
        // Serrilhado: vértices alternam para fora e um pouco para baixo.
        const a = Math.atan2(z, x);
        const dente = Math.round((a / (Math.PI * 2)) * 14) % 2 === 0 ? 1.12 : 0.9;
        p.setXYZ(k, x * dente, y - (dente > 1 ? alt * 0.08 : 0), z * dente);
      }
      const l = naBorda ? 0.82 : 0.95 + (y / alt) * 0.15;
      cores.set([l, l, l], k * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(cores, 3));
    g.computeVertexNormals();
    g.rotateY(rng() * 6.28);
    g.translate((rng() - 0.5) * r * 0.12, base + (topo - base) * t * 0.82 + alt / 2, (rng() - 0.5) * r * 0.12);
    partes.push(g.toNonIndexed());
  }
  return juntar(partes);
}

/** Salgueiro: lâminas pendentes saindo da borda externa da copa (riscos caindo, em pixel). */
function cortinaPendente(folhas, rng) {
  const p = folhas.attributes.position;
  const bb = folhas.boundingBox;
  const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
  const raio = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2;
  const meio = (bb.min.y + bb.max.y) / 2;
  const partes = [];
  for (let i = 0; i < p.count && partes.length < 70; i += 7) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < meio || Math.hypot(x - cx, z - cz) < raio * 0.55 || rng() < 0.4) continue;
    const comp = (bb.max.y - bb.min.y) * (0.35 + rng() * 0.3);
    const g = new THREE.PlaneGeometry(raio * 0.1, comp, 1, 3);
    const q = g.attributes.position;
    const cores = new Float32Array(q.count * 3);
    for (let k = 0; k < q.count; k++) {
      const v = (q.getY(k) + comp / 2) / comp;
      q.setZ(k, (1 - v) * (1 - v) * raio * 0.12);
      const l = 0.82 + v * 0.18;
      cores.set([l, l, l], k * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(cores, 3));
    g.rotateY(Math.atan2(x - cx, z - cz));
    g.translate(x, y - comp / 2, z);
    partes.push(g.index ? g.toNonIndexed() : g);
  }
  return partes.length ? juntar(partes) : null;
}

/** Arbusto: 2–4 volumes baixos agrupados, sem tronco aparente. */
function moita(rng) {
  const n = 2 + Math.floor(rng() * 3);
  const partes = [];
  for (let i = 0; i < n; i++) {
    const a = rng() * 6.28, d = i === 0 ? 0 : 0.35 + rng() * 0.35;
    const r = 0.55 + rng() * 0.35;
    partes.push(volumeIrregular(r, Math.cos(a) * d, r * 0.7, Math.sin(a) * d, Math.floor(rng() * 1e6), 0.75));
  }
  return juntar(partes);
}

// ---------------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------------

export class Jardim {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    // Sombras duras: bordas de 1 pixel, como pixel art desenhada.
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
    this.alvo = new THREE.Vector3();
    this.yaw = Math.PI / 4;
    this.yawAlvo = this.yaw;
    this.pitch = THREE.MathUtils.degToRad(38);
    this.altura = 70; // metros visíveis na vertical
    this.tamPixel = 4;
    this.crescimento = 0.9;
    this.cresceVisto = -1;
    this.forcaVento = 0.55;
    this.hora = "dia";
    this.relogio = new THREE.Timer();
    this.materiaisVento = [];
    this.individuos = [];
    this.grupos = [];
    this.pixel = criarMaterialPixel();
    this.cena2d = new THREE.Scene();
    this.cena2d.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.pixel));
    this.cam2d = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.rt = null;
  }

  async carregar(semente, progresso) {
    progresso(0.04, "Semeando o mundo…");
    await quadro();
    const m = (this.mundo = gerarMundo(semente));
    this.alvo.set(m.largura * 0.55, 0, m.altura * 0.55);

    progresso(0.1, "Moldando o terreno…");
    await quadro();
    this.criarTerreno();
    this.criarAgua();

    const lista = Object.entries(ESPECIES);
    const total = lista.reduce((n, [, e]) => n + e.variacoes, 0);
    let feitas = 0;
    this.variacoes = [];
    for (const [id, e] of lista)
      for (let v = 0; v < e.variacoes; v++) {
        progresso(0.18 + (feitas / total) * 0.55, `Desenhando árvores (${feitas + 1}/${total})…`);
        await quadro();
        this.variacoes.push(this.gerarVariacao(id, e, semente * 31 + feitas * 977));
        feitas++;
      }

    progresso(0.78, "Plantando o bosque…");
    await quadro();
    this.plantar();
    this.criarDetalhes();

    progresso(0.9, "Acendendo a luz…");
    await quadro();
    this.criarLuz();
    this.aplicarHora();
    this.redimensionar();
    this.atualizarCrescimento(true);
    await this.renderer.compileAsync(this.scene, this.camera);

    progresso(1, "Pronto");
    this.ro = new ResizeObserver(() => this.redimensionar());
    this.ro.observe(this.canvas);
    this.ligarControles();
    this.relogio.reset();
    this.loop = () => {
      this.quadroAnim();
      this.raf = requestAnimationFrame(this.loop);
    };
    this.raf = requestAnimationFrame(this.loop);
  }

  // --- Terreno e água -----------------------------------------------------

  alturaEm(x, z) {
    const m = this.mundo;
    let h = (m.ruido(x / 60 + 3, z / 60, 3) - 0.5) * 3.2;
    const f = m.fatorLago(x, z);
    h = h * suave(0.9, 1.5, f) - (1 - suave(0.6, 1.08, f)) * 2.4;
    return h;
  }

  criarTerreno() {
    const m = this.mundo;
    const borda = 50, passo = 0.5;
    const L = m.largura + borda * 2, P = m.altura + borda * 2;
    const g = new THREE.PlaneGeometry(L, P, Math.round(L / passo), Math.round(P / passo));
    g.rotateX(-Math.PI / 2);
    g.translate(m.largura / 2, 0, m.altura / 2);
    const pos = g.attributes.position;
    const cores = new Float32Array(pos.count * 3);
    const S = RAMPAS.salvia, T = RAMPAS.terra;
    const c = new THREE.Color(), tmp = new THREE.Color();
    const rng = criarRng(m.semente ^ 0x77);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, this.alturaEm(x, z));
      const n1 = m.ruido(x / 22, z / 22 + 9, 3), n2 = m.fino(x / 6, z / 6, 2);
      const d = m.densidade(x, z), f = m.fatorLago(x, z);
      const trilha = m.distTrilha(x, z) / m.trilha.largura;
      // Gramado: sálvia com manchas; salpicos pontuais viram textura após o dither.
      let idx = n1 < 0.38 ? 2 : n1 < 0.62 ? 3 : 4;
      if (n2 > 0.72) idx += 1;
      if (rng() < 0.025) idx += rng() < 0.5 ? -1 : 1;
      c.set(S[Math.max(0, Math.min(S.length - 1, idx))]);
      // Chão de mata: mais escuro e terroso sob o bosque.
      c.lerp(tmp.set(S[1]), suave(0.25, 0.9, d) * 0.8);
      // Trilha: terra batida com borda mais escura.
      if (trilha < 0.55) c.set(T[n2 > 0.6 ? 5 : 4]);
      else if (trilha < 0.75) c.set(T[3]);
      // Margem e fundo do lago.
      if (f < 1.0) c.set(RAMPAS.agua[f < 0.85 ? 0 : 1]);
      else if (f < 1.035 + n2 * 0.03) c.set(S[1]).lerp(tmp.set(T[2]), 0.45);
      cores.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(cores, 3));
    g.computeVertexNormals();
    const t = new THREE.Mesh(g, toon({ vertexColors: true }));
    t.receiveShadow = true;
    this.scene.add(t);
  }

  criarAgua() {
    const L = this.mundo.lago;
    const forma = new THREE.Shape(L.contorno.map((p) => new THREE.Vector2(p.x, -p.y)));
    const g = new THREE.ShapeGeometry(forma, 6);
    g.rotateX(-Math.PI / 2);
    const mat = toon({ color: BASE.agua, transparent: true, opacity: 0.9 });
    // Reflexos: faixas que andam e viram pixels claros depois da quantização.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uBrilho = { value: 1 };
      mat.userData.shader = shader;
      shader.vertexShader = "varying vec3 vMundo;\n" + shader.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      shader.fragmentShader =
        "uniform float uTime; uniform float uBrilho; varying vec3 vMundo;\n" +
        shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          // Brilhos curtos e esparsos (1–2 pixels), que andam devagar.
          float onda = sin(vMundo.x * 3.1 + vMundo.z * 1.1 + uTime * 0.8) * sin(vMundo.z * 3.7 - vMundo.x * 1.3 - uTime * 0.6) * sin(vMundo.x * 0.9 + vMundo.z * 0.7 + uTime * 0.25);
          totalEmissiveRadiance += vec3(0.5, 0.7, 0.7) * uBrilho * step(0.8, onda);`,
        );
    };
    this.agua = new THREE.Mesh(g, mat);
    this.agua.position.y = -0.55;
    this.agua.receiveShadow = true;
    this.scene.add(this.agua);
  }

  // --- Árvores ------------------------------------------------------------

  /**
   * Uma VARIAÇÃO é um modelo pronto de uma espécie (galhos + copa num corpo só).
   * Vários indivíduos podem usar a mesma variação (instancing): leve para a GPU,
   * mas cada indivíduo tem seus próprios dados (ver plantar()).
   */
  gerarVariacao(id, e, semente) {
    const rng = criarRng(semente);
    if (e.arbusto) {
      const copa = moita(rng);
      copa.computeBoundingBox();
      const alvo = e.altura[0] + rng() * (e.altura[1] - e.altura[0]);
      const topo = copa.boundingBox.max.y;
      return { especie: id, galhos: null, copa, matGalhos: null, matCopa: this.materialCopa(e, topo, true), escala: alvo / topo };
    }
    const tree = new Tree();
    tree.loadPreset(e.preset);
    tree.options.seed = Math.floor(rng() * 1e6);
    economizar(tree.options, 0.7, 0.5);
    if (e.barkType) tree.options.bark.type = BarkType[e.barkType];
    if (e.pendente) {
      tree.options.leaves.type = LeafType.Aspen;
      tree.options.branch.force.strength = -0.05;
      tree.options.branch.angle[2] = 75;
    }
    tree.generate();
    const galhos = tree.branchesMesh.geometry, folhas = tree.leavesMesh.geometry;
    galhos.computeBoundingBox();
    folhas.computeBoundingBox();
    const topo = Math.max(galhos.boundingBox.max.y, folhas.boundingBox.max.y);
    const alvo = e.altura[0] + rng() * (e.altura[1] - e.altura[0]);
    let copa;
    if (e.copa.forma === "camadas") copa = copaEmCamadas(folhas, e.copa.camadas, rng);
    else {
      copa = copaLobada(folhas, e.copa.grupos, rng, e.copa.fator);
      if (e.copa.forma === "pendente") {
        const cortina = cortinaPendente(folhas, rng);
        if (copa && cortina) copa = juntar([copa, cortina]);
      }
    }
    // Galhos e copa com o MESMO vento (mesma altura de referência): a árvore
    // inteira se inclina como um corpo; a base do tronco fica parada.
    const matGalhos = vento(
      toon({ color: e.casca === "betula" ? BASE.cascaBetula : e.casca }),
      0.35, topo, false, 1, e.casca === "betula" ? marcasDeBetula : null,
    );
    this.materiaisVento.push(matGalhos);
    folhas.dispose();
    return { especie: id, galhos, copa, matGalhos, matCopa: this.materialCopa(e, topo, false), escala: alvo / Math.max(1, topo) };
  }

  materialCopa(e, topo, arbusto) {
    const mat = vento(
      toon({ color: e.cor, vertexColors: true, side: e.copa.forma === "pendente" ? THREE.DoubleSide : THREE.FrontSide }),
      arbusto ? 0.1 : 0.35, topo,
    );
    this.materiaisVento.push(mat);
    return mat;
  }

  /**
   * Indivíduos: cada árvore/arbusto do mapa é uma entidade própria — número,
   * espécie, posição, crescimento, estágio e tom. O desenho agrupa por variação
   * (instancing), e cada indivíduo sabe o seu lugar ("vaga") nesse grupo.
   */
  plantar() {
    const rng = criarRng(this.mundo.semente ^ 0x1234567);
    const porEspecie = new Map();
    for (const v of this.variacoes) porEspecie.set(v.especie, [...(porEspecie.get(v.especie) ?? []), v]);
    const DEGRAUS = [0.86, 1, 1, 1.13];
    const porVariacao = new Map();
    this.individuos = [];
    for (const o of this.mundo.objetos) {
      if (o.tipo !== "arvore" && o.tipo !== "arbusto") continue;
      const especie = especieDoLugar({ tipo: o.tipo, lago: o.lago ?? 9, zona: o.zona ?? 0.5 }, rng);
      const opcoes = porEspecie.get(especie);
      const variacao = opcoes[Math.floor(rng() * opcoes.length)];
      const ind = {
        numero: this.individuos.length + 1,
        especie,
        nome: ESPECIES[especie].nome,
        x: o.x,
        z: o.y,
        y: this.alturaEm(o.x, o.y) - 0.15,
        giro: o.giro,
        inclinacao: [(rng() - 0.5) * 0.08, (rng() - 0.5) * 0.08],
        escala: variacao.escala * o.escala,
        nasce: o.nasce,
        tom: DEGRAUS[Math.floor(rng() * DEGRAUS.length)],
        estagio: null,
        variacao,
      };
      this.individuos.push(ind);
      porVariacao.set(variacao, [...(porVariacao.get(variacao) ?? []), ind]);
    }
    this.grupos = [];
    const tom = new THREE.Color();
    for (const [variacao, membros] of porVariacao) {
      const copa = new THREE.InstancedMesh(variacao.copa, variacao.matCopa, membros.length);
      const galhos = variacao.galhos ? new THREE.InstancedMesh(variacao.galhos, variacao.matGalhos, membros.length) : null;
      const grupo = { variacao, membros, copa, malhas: [copa, galhos].filter(Boolean) };
      membros.forEach((ind, vaga) => {
        ind.grupo = grupo;
        ind.vaga = vaga;
        copa.setColorAt(vaga, tom.setScalar(ind.tom));
      });
      for (const im of grupo.malhas) {
        im.castShadow = im.receiveShadow = true;
        im.frustumCulled = false;
        this.scene.add(im);
      }
      this.grupos.push(grupo);
    }
  }

  /** Aplica a regra de crescimento a cada indivíduo (estágio + tamanho). */
  atualizarCrescimento(forcar = false) {
    if (this.cresceVisto < 0) this.cresceVisto = this.crescimento;
    const delta = this.crescimento - this.cresceVisto;
    if (!forcar && Math.abs(delta) < 0.001) return;
    if (!forcar) this.cresceVisto += delta * 0.08;
    const g = this.cresceVisto;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (const grupo of this.grupos) {
      for (const ind of grupo.membros) {
        const gf = ind.nasce === 0 ? 1 : suave(ind.nasce, ind.nasce + 0.22, g);
        const { estagio, escala } = estagioDe(gf);
        ind.estagio = estagio;
        q.setFromEuler(e.set(ind.inclinacao[0], ind.giro, ind.inclinacao[1]));
        m.compose(p.set(ind.x, ind.y, ind.z), q, s.setScalar(ind.escala * escala));
        for (const im of grupo.malhas) im.setMatrixAt(ind.vaga, m);
      }
      for (const im of grupo.malhas) {
        im.instanceMatrix.needsUpdate = true;
        im.boundingSphere = null; // recalculado sob demanda (clique)
      }
    }
  }

  /** Clique numa árvore: seleciona o indivíduo e devolve sua ficha. */
  selecionarEm(clienteX, clienteY) {
    const caixa = this.canvas.getBoundingClientRect();
    const r = caixa.width && caixa.height ? caixa : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    this.selecionarNDC(new THREE.Vector2(((clienteX - r.left) / r.width) * 2 - 1, -((clienteY - r.top) / r.height) * 2 + 1));
  }

  /** Seleção a partir de coordenadas normalizadas da tela (-1..1). */
  selecionarNDC(ndc) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const alvos = this.grupos.map((g) => g.copa);
    const hit = ray.intersectObjects(alvos, false)[0];
    const anterior = this.selecionado;
    if (anterior) anterior.grupo.copa.setColorAt(anterior.vaga, new THREE.Color().setScalar(anterior.tom));
    this.selecionado = null;
    if (hit && hit.instanceId !== undefined) {
      const grupo = this.grupos.find((g) => g.copa === hit.object);
      const ind = grupo.membros[hit.instanceId];
      if (ind.estagio) {
        this.selecionado = ind;
        grupo.copa.setColorAt(ind.vaga, new THREE.Color().setScalar(ind.tom * 1.35));
      }
    }
    for (const g of this.grupos) g.copa.instanceColor.needsUpdate = true;
    const i = this.selecionado;
    this.aoSelecionar?.(i ? { numero: i.numero, nome: i.nome, especie: i.especie, estagio: i.estagio.nome } : null);
  }

  // --- Capim, flores, pedras, troncos -------------------------------------

  criarDetalhes() {
    const m = this.mundo;
    const rng = criarRng(m.semente ^ 0x99);
    const d = new THREE.Object3D();

    // Capim: 3 formatos, agrupado por manchas, fora da trilha e da água.
    // Capim balança devagar (uVel 0.5) e não grava profundidade: o contorno de
    // tinta não o enxerga, então as lâminas não ganham riscos que piscam; ele se
    // lê pela cor (base escura, ponta clara). Desenhado depois dos opacos, ainda
    // fica corretamente atrás de troncos e pedras.
    const matCapim = vento(toon({ vertexColors: true, side: THREE.DoubleSide, depthWrite: false }), 0.16, 0, false, 0.5);
    this.materiaisVento.push(matCapim);
    for (let f = 0; f < 3; f++) {
      const max = 2600;
      const im = new THREE.InstancedMesh(touceira(criarRng(m.semente + f)), matCapim, max);
      let n = 0;
      for (let t = 0; t < max * 5 && n < max; t++) {
        const x = rng() * m.largura, z = rng() * m.altura;
        if (m.fatorLago(x, z) < 1.05 || m.distTrilha(x, z) < m.trilha.largura * 0.6) continue;
        const mancha = m.fino(x / 9, z / 9, 3);
        const margem = 1 - suave(1.05, 1.4, m.fatorLago(x, z));
        if (rng() > Math.min(1, suave(0.35, 0.65, mancha) * (1 - m.densidade(x, z) * 0.5) + margem)) continue;
        d.position.set(x, this.alturaEm(x, z), z);
        d.rotation.set(0, rng() * 6.28, 0);
        const s = 0.8 + rng() * 0.8 + margem * 0.5;
        d.scale.set(s, s * (0.8 + rng() * 0.6), s);
        d.updateMatrix();
        im.setMatrixAt(n++, d.matrix);
      }
      im.count = n;
      im.receiveShadow = true;
      im.frustumCulled = false;
      im.renderOrder = 1;
      this.scene.add(im);
    }

    // Flores: miolo colorido sobre um caule curto (viram 1–2 pixels de cor).
    const coresFlor = [RAMPAS.betula[0], RAMPAS.outono[4], RAMPAS.flor[2], RAMPAS.flor[3]];
    const flores = m.objetos.filter((o) => o.tipo === "flor");
    const geoFlor = new THREE.IcosahedronGeometry(0.16, 0);
    geoFlor.translate(0, 0.32, 0);
    const imFlor = new THREE.InstancedMesh(geoFlor, toon({ color: 0xffffff }), flores.length * 4);
    let nf = 0;
    for (const f of flores)
      for (let k = 0; k < 4; k++) {
        const x = f.x + (rng() - 0.5) * 1.6, z = f.y + (rng() - 0.5) * 1.6;
        d.position.set(x, this.alturaEm(x, z), z);
        d.rotation.set(0, 0, 0);
        d.scale.setScalar(0.8 + rng() * 0.5);
        d.updateMatrix();
        imFlor.setMatrixAt(nf, d.matrix);
        imFlor.setColorAt(nf++, cor(coresFlor[(f.cor + (k === 3 ? 1 : 0)) % coresFlor.length]));
      }
    imFlor.count = nf;
    imFlor.castShadow = true;
    this.scene.add(imFlor);

    // Pedras (facetadas, com musgo) e madeira caída.
    const pedras = m.objetos.filter((o) => o.tipo === "pedra");
    const matPedra = toon({ vertexColors: true });
    [pedraGeo(m.semente + 1), pedraGeo(m.semente + 2), pedraGeo(m.semente + 3)].forEach((geo, k) => {
      const minhas = pedras.filter((_, i) => i % 3 === k);
      const im = new THREE.InstancedMesh(geo, matPedra, minhas.length);
      minhas.forEach((p, i) => {
        d.position.set(p.x, this.alturaEm(p.x, p.y) - 0.15, p.y);
        d.rotation.set(0, p.giro, 0);
        d.scale.setScalar(p.escala * (0.7 + rng() * 0.6));
        d.updateMatrix();
        im.setMatrixAt(i, d.matrix);
      });
      im.castShadow = im.receiveShadow = true;
      this.scene.add(im);
    });
    const madeira = toon({ color: RAMPAS.terra[2] });
    for (const o of m.objetos) {
      if (o.tipo !== "toco" && o.tipo !== "tronco") continue;
      const caido = o.tipo === "tronco";
      const g = caido ? new THREE.CylinderGeometry(0.28, 0.34, 4 * o.escala, 7) : new THREE.CylinderGeometry(0.42, 0.55, 0.7, 7);
      const malha = new THREE.Mesh(g, madeira);
      malha.position.set(o.x, this.alturaEm(o.x, o.y) + (caido ? 0.2 : 0.3), o.y);
      if (caido) malha.rotation.set(Math.PI / 2, 0, o.giro);
      malha.castShadow = malha.receiveShadow = true;
      this.scene.add(malha);
    }

    // Vaga-lumes (noite): pontos de 1 pixel que piscam.
    const n = 140, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = rng() * m.largura, z = rng() * m.altura;
      pos.set([x, this.alturaEm(x, z) + 0.6 + rng() * 2.5, z], i * 3);
    }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.vagalumes = new THREE.Points(gp, new THREE.PointsMaterial({ color: RAMPAS.luz[0], size: 1.5, sizeAttenuation: false, transparent: true }));
    this.scene.add(this.vagalumes);
  }

  // --- Luz e hora ---------------------------------------------------------

  criarLuz() {
    this.ceu = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    this.sol = new THREE.DirectionalLight(0xffffff, 2);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    const ext = 115;
    Object.assign(this.sol.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 400 });
    this.sol.shadow.bias = -0.0006;
    this.sol.shadow.normalBias = 0.04;
    this.sol.target.position.set(this.mundo.largura / 2, 0, this.mundo.altura / 2);
    this.scene.add(this.ceu, this.sol, this.sol.target);
  }

  aplicarHora() {
    if (!this.sol) return;
    const H = {
      dia: { sol: 0xfff1d6, i: 2.2, dir: [-0.6, 1, -0.35], ceu: 0xe4ecd2, chao: 0x6c7a52, ic: 1.25, fundo: RAMPAS.salvia[1], exp: 1.0 },
      entardecer: { sol: 0xffa060, i: 2.0, dir: [-0.95, 0.45, -0.2], ceu: 0xffc89c, chao: 0x45352c, ic: 0.85, fundo: RAMPAS.terra[1], exp: 1.0 },
      noite: { sol: 0x8fa8ff, i: 0.7, dir: [-0.3, 1, 0.4], ceu: 0x3a4d80, chao: 0x101422, ic: 0.55, fundo: RAMPAS.noite[0], exp: 1.15 },
    }[this.hora];
    const c = new THREE.Vector3(this.mundo.largura / 2, 0, this.mundo.altura / 2);
    const dir = new THREE.Vector3(...H.dir).normalize();
    this.sol.position.copy(c).addScaledVector(dir, 200);
    this.sol.color.setHex(H.sol);
    this.sol.intensity = H.i;
    this.ceu.color.setHex(H.ceu);
    this.ceu.groundColor.setHex(H.chao);
    this.ceu.intensity = H.ic;
    this.scene.background = cor(H.fundo);
    this.renderer.toneMappingExposure = H.exp;
    this.vagalumes.visible = this.hora === "noite";
  }

  // --- Câmera e controles -------------------------------------------------

  redimensionar() {
    // Sem tamanho ainda (aba/painel oculto): usa a janela; o ResizeObserver corrige depois.
    const caixa = this.canvas.getBoundingClientRect();
    const r = caixa.width && caixa.height ? caixa : { width: window.innerWidth || 800, height: window.innerHeight || 600 };
    this.renderer.setSize(r.width, r.height, false);
    const w = Math.max(64, Math.floor(r.width / this.tamPixel));
    const h = Math.max(64, Math.floor(r.height / this.tamPixel));
    if (!this.rt) {
      const dt = new THREE.DepthTexture(w, h);
      dt.minFilter = dt.magFilter = THREE.NearestFilter;
      this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: dt });
    } else this.rt.setSize(w, h);
    this.pixel.uniforms.uTam.value.set(w, h);
    this.aspecto = w / h;
  }

  posicionarCamera() {
    const meia = this.altura / 2;
    this.camera.top = meia;
    this.camera.bottom = -meia;
    this.camera.left = -meia * this.aspecto;
    this.camera.right = meia * this.aspecto;
    this.camera.updateProjectionMatrix();
    const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    // "Snap" ao grid de pixels: o alvo anda em múltiplos exatos de 1 pixel na tela.
    this.camera.position.copy(this.alvo).addScaledVector(dir, 250);
    this.camera.lookAt(this.alvo);
    const texel = this.altura / this.rt.height;
    const dirX = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const dirY = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const px = this.alvo.dot(dirX), py = this.alvo.dot(dirY);
    const ajuste = dirX.multiplyScalar(Math.round(px / texel) * texel - px).add(dirY.multiplyScalar(Math.round(py / texel) * texel - py));
    this.camera.position.add(ajuste);
    this.pixel.uniforms.uTexel.value = texel;
  }

  ligarControles() {
    const c = this.canvas;
    const ponteiros = new Map();
    let pinca = 0;
    const mover = (dx, dy) => {
      // Arrastar move o chão sob o cursor (direita/frente da câmera projetadas no plano).
      const mpp = this.altura / c.clientHeight;
      const dir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const lado = new THREE.Vector3(dir.z, 0, -dir.x);
      this.alvo.addScaledVector(lado, -dx * mpp);
      this.alvo.addScaledVector(dir, (-dy * mpp) / Math.sin(this.pitch));
      this.limitar();
    };
    let inicio = null;
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      inicio = ponteiros.size === 1 ? { x: e.clientX, y: e.clientY } : null;
    });
    c.addEventListener("pointermove", (e) => {
      const a = ponteiros.get(e.pointerId);
      if (!a) return;
      const b = { x: e.clientX, y: e.clientY };
      if (ponteiros.size === 1) mover(b.x - a.x, b.y - a.y);
      ponteiros.set(e.pointerId, b);
      if (ponteiros.size === 2) {
        const [p, q] = [...ponteiros.values()];
        const dd = Math.hypot(p.x - q.x, p.y - q.y);
        if (pinca) this.zoom(pinca / dd);
        pinca = dd;
      }
    });
    const soltar = (e) => {
      ponteiros.delete(e.pointerId);
      pinca = 0;
      // Toque/clique curto (sem arrastar) seleciona a árvore sob o cursor.
      if (inicio && e.type === "pointerup" && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < 5) this.selecionarEm(e.clientX, e.clientY);
      inicio = null;
    };
    c.addEventListener("pointerup", soltar);
    c.addEventListener("pointercancel", soltar);
    c.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.zoom(Math.exp(e.deltaY * 0.0012));
    }, { passive: false });
    this.teclas = new Set();
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "q" || e.key === "Q") this.girar(-1);
      else if (e.key === "e" || e.key === "E") this.girar(1);
      else this.teclas.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e) => this.teclas.delete(e.key.toLowerCase()));
    this._mover = mover;
  }

  limitar() {
    this.alvo.x = THREE.MathUtils.clamp(this.alvo.x, 0, this.mundo.largura);
    this.alvo.z = THREE.MathUtils.clamp(this.alvo.z, 0, this.mundo.altura);
  }

  zoom(f) {
    this.altura = THREE.MathUtils.clamp(this.altura * f, 22, 130);
  }
  girar(sentido) {
    this.yawAlvo += (sentido * Math.PI) / 4;
  }

  // --- API da página ------------------------------------------------------

  setCrescimento(v) { this.crescimento = v; }
  setVento(v) { this.forcaVento = v; }
  setHora(h) { this.hora = h; this.aplicarHora(); }
  setTamPixel(p) { this.tamPixel = p; this.redimensionar(); }
  setContorno(on) { this.pixel.uniforms.uContorno.value = on ? 1 : 0; }
  setPaleta(on) { this.pixel.uniforms.uQuant.value = on ? 1 : 0; }

  quadroAnim() {
    this.relogio.update();
    const t = this.relogio.getElapsed();
    const dt = Math.min(0.05, this.relogio.getDelta());
    this.atualizarCrescimento();
    // Teclado: WASD / setas movem; giro animado até o próximo passo de 45°.
    const k = this.teclas, v = 280 * dt;
    if (k.has("w") || k.has("arrowup")) this._mover(0, v);
    if (k.has("s") || k.has("arrowdown")) this._mover(0, -v);
    if (k.has("a") || k.has("arrowleft")) this._mover(v, 0);
    if (k.has("d") || k.has("arrowright")) this._mover(-v, 0);
    this.yaw += (this.yawAlvo - this.yaw) * Math.min(1, dt * 7);
    for (const mat of this.materiaisVento) {
      const sh = mat.userData.shader;
      if (!sh) continue;
      sh.uniforms.uTime.value = t;
      sh.uniforms.uForca.value = mat.userData.forcaBase * this.forcaVento * 1.6;
      sh.uniforms.uPasso.value = this.pixel.uniforms.uTexel.value;
    }
    const sa = this.agua.material.userData.shader;
    if (sa) {
      sa.uniforms.uTime.value = t;
      sa.uniforms.uBrilho.value = this.hora === "noite" ? 0.22 : this.hora === "entardecer" ? 0.7 : 1;
    }
    if (this.vagalumes.visible) this.vagalumes.material.opacity = 0.55 + 0.45 * Math.sin(t * 2.3);

    this.posicionarCamera();
    const u = this.pixel.uniforms;
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    u.tCor.value = this.rt.texture;
    u.tProf.value = this.rt.depthTexture;
    u.uNear.value = this.camera.near;
    u.uFar.value = this.camera.far;
    this.renderer.render(this.cena2d, this.cam2d);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      for (const m of [].concat(o.material ?? [])) m.dispose();
    });
    this.rt?.dispose();
    this.renderer.dispose();
  }

  info() {
    return { ...this.renderer.info.render, rt: [this.rt.width, this.rt.height], instancias: this.individuos.length };
  }
}
