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
import arbusto1 from "./presets/arbusto1.js";
import arbusto2 from "./presets/arbusto2.js";
import arbusto3 from "./presets/arbusto3.js";

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

/** Casca de bétula: branca com marcas escuras horizontais (lenticelas), em coordenadas locais. */
function cascaDeBetula() {
  const mat = toon({ color: BASE.cascaBetula });
  mat.onBeforeCompile = (shader) => {
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
  };
  mat.customProgramCacheKey = () => "casca-betula";
  return mat;
}

/**
 * Vento em instâncias (adaptado do ez-tree, MIT). Amplitude pela altura:
 * relativa ao topo (`alturaRef` > 0, folhas) ou absoluta (capim).
 * `soAlfa`: a textura só recorta o formato; a cor vem da paleta.
 */
function vento(material, forca, alturaRef = 0, soAlfa = false) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uForca = { value: forca };
    shader.uniforms.uEscalaVento = { value: forca };
    shader.uniforms.uAltura = { value: alturaRef };
    shader.vertexShader =
      `uniform float uTime; uniform float uForca; uniform float uAltura;
      float ondaV(vec2 p){ return sin(p.x*0.11 + p.y*0.07) * 0.5 + sin(p.x*0.05 - p.y*0.13 + 1.7) * 0.5; }
      ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
      float fase = 6.28 * ondaV((modelMatrix * mvPosition).xz);
      float h = uAltura > 0.0 ? clamp(position.y / uAltura, 0.0, 1.0) : position.y;
      float s = sin(uTime * 1.1 + fase) * cos(uTime * 1.55 + fase);
      mvPosition.xz += h * uForca * vec2(s, s * 0.6);
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`,
    );
    if (soAlfa) shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "diffuseColor.a *= texture2D(map, vMapUv).a;");
    material.userData.shader = shader;
  };
  material.customProgramCacheKey = () => `vento-${soAlfa ? 1 : 0}`;
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

const ESPECIES = [
  { id: "carvalho", preset: "Oak Large", altura: [10, 13], cor: BASE.carvalho, n: 3 },
  { id: "freixo", preset: "Ash Medium", altura: [10, 13], cor: BASE.freixo, n: 2 },
  { id: "betula", preset: "Aspen Medium", altura: [9, 12], cor: BASE.betula, casca: BASE.cascaBetula, ajustar: (o) => (o.bark.type = BarkType.Birch), n: 2 },
  { id: "pinheiro", preset: "Pine Medium", altura: [11, 15], cor: BASE.pinheiro, n: 3, folhas: 0.6 },
  {
    id: "salgueiro", preset: "Ash Medium", altura: [8, 10], cor: BASE.salgueiro, n: 2,
    ajustar: (o) => { o.bark.type = BarkType.Willow; o.leaves.type = LeafType.Aspen; o.branch.force.strength = -0.05; o.branch.angle[2] = 75; },
  },
  { id: "outonal", preset: "Oak Small", altura: [7, 9], cor: BASE.outonal, n: 2 },
  { id: "dourada", preset: "Aspen Small", altura: [7, 9], cor: BASE.dourada, casca: BASE.cascaBetula, ajustar: (o) => (o.bark.type = BarkType.Birch), n: 1 },
  { id: "cerejeira", preset: "Ash Small", altura: [6, 8], cor: BASE.cerejeira, n: 1 },
  { id: "arbusto_a", json: arbusto1, altura: [1.4, 2], cor: RAMPAS.mata[3], n: 2, folhas: 0.6, galhos: 0.3 },
  { id: "arbusto_b", json: arbusto2, altura: [1.1, 1.6], cor: RAMPAS.mata[4], n: 2, folhas: 0.6, galhos: 0.3 },
  { id: "arbusto_c", json: arbusto3, altura: [1.6, 2.3], cor: RAMPAS.mata[2], n: 2, folhas: 0.6, galhos: 0.3 },
];

// ---------------------------------------------------------------------------
// Geometrias procedurais pequenas
// ---------------------------------------------------------------------------

/** Touceira de capim: lâminas curvas com gradiente (base escura → ponta clara). */
function touceira(rng) {
  const pos = [], cores = [], idx = [];
  const baseC = cor(RAMPAS.mata[2]), pontaC = cor(RAMPAS.mata[5]), c = new THREE.Color();
  for (let b = 0; b < 7; b++) {
    const ang = rng() * 6.28, incl = 0.2 + rng() * 0.5, alt = 0.35 + rng() * 0.35, larg = 0.035 + rng() * 0.02;
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
 * Massa sólida da copa: agrupa os vértices das folhas (k-means) e põe uma
 * esfera facetada em cada grupo. As folhas viram a borda irregular por fora;
 * por dentro há volume — é o que faz a árvore ler como "massa" em pixel art.
 */
function massaDaCopa(folhas, k, rng, fator = 0.95) {
  const p = folhas.attributes.position;
  const pts = [];
  for (let i = 0; i < p.count; i += 4) pts.push(new THREE.Vector3().fromBufferAttribute(p, i));
  if (pts.length < k) return null;
  const centros = Array.from({ length: k }, () => pts[Math.floor(rng() * pts.length)].clone());
  const grupo = new Int32Array(pts.length);
  for (let it = 0; it < 10; it++) {
    pts.forEach((v, i) => {
      let m = Infinity;
      centros.forEach((c, j) => { const d = v.distanceToSquared(c); if (d < m) { m = d; grupo[i] = j; } });
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
    const raio = (d / n) * fator;
    const g = new THREE.IcosahedronGeometry(raio, 1);
    g.scale(1, 0.85, 1);
    g.translate(c.x, c.y, c.z);
    partes.push((g.index ? g.toNonIndexed() : g));
  });
  return partes.length ? juntar(partes) : null;
}

/** Junta geometrias não indexadas (posição + normal) num só buffer, sem dependências extras. */
function juntar(partes) {
  const total = partes.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of partes) {
    g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return geo;
}

/**
 * Pinheiro: camadas de cones empilhadas (de baixo para cima, cada vez menores),
 * com leve desalinhamento — a silhueta clássica de pinheiro em pixel art.
 */
function camadasDePinheiro(folhas, rng) {
  const bb = folhas.boundingBox;
  const base = bb.min.y + (bb.max.y - bb.min.y) * 0.12;
  const topo = bb.max.y;
  const raioBase = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.42;
  const n = 5;
  const partes = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const alt = (topo - base) * (0.34 - t * 0.04);
    const r = raioBase * (1 - t * 0.78) * (0.92 + rng() * 0.16);
    const g = new THREE.ConeGeometry(r, alt, 9, 1, true);
    g.rotateY(rng() * 6.28);
    g.translate((rng() - 0.5) * r * 0.12, base + (topo - base) * t * 0.82 + alt / 2, (rng() - 0.5) * r * 0.12);
    partes.push((g.index ? g.toNonIndexed() : g));
  }
  return juntar(partes);
}

/**
 * Salgueiro: "cortina" de galhos pendentes saindo da borda externa da copa.
 * Lâminas finas e compridas que, em pixel, viram riscos verticais caindo.
 */
function cortinaDeSalgueiro(folhas, rng) {
  const p = folhas.attributes.position;
  const bb = folhas.boundingBox;
  const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
  const raio = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2;
  const meio = (bb.min.y + bb.max.y) / 2;
  const partes = [];
  for (let i = 0; i < p.count && partes.length < 70; i += 7) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = Math.hypot(x - cx, z - cz);
    if (y < meio || d < raio * 0.55 || rng() < 0.4) continue;
    const comp = (bb.max.y - bb.min.y) * (0.35 + rng() * 0.3);
    const g = new THREE.PlaneGeometry(raio * 0.09, comp, 1, 3);
    // Leve curva para fora na ponta, como galho pesado.
    const q = g.attributes.position;
    for (let k = 0; k < q.count; k++) {
      const v = (q.getY(k) + comp / 2) / comp;
      q.setZ(k, (1 - v) * (1 - v) * raio * 0.12);
    }
    g.rotateY(Math.atan2(x - cx, z - cz));
    g.translate(x, y - comp / 2, z);
    partes.push((g.index ? g.toNonIndexed() : g));
  }
  return partes.length ? juntar(partes) : null;
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
    this.arvores = [];
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

    const total = ESPECIES.reduce((n, e) => n + e.n, 0);
    let feitas = 0;
    this.variacoes = [];
    for (const e of ESPECIES)
      for (let v = 0; v < e.n; v++) {
        progresso(0.18 + (feitas / total) * 0.55, `Desenhando árvores (${feitas + 1}/${total})…`);
        await quadro();
        this.variacoes.push(this.gerarVariacao(e, semente * 31 + feitas * 977));
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

  gerarVariacao(e, semente) {
    const rng = criarRng(semente);
    const tree = new Tree();
    if (e.json) tree.loadFromJson(structuredClone(e.json));
    else tree.loadPreset(e.preset);
    tree.options.seed = Math.floor(rng() * 1e6);
    economizar(tree.options, e.folhas, e.galhos);
    e.ajustar?.(tree.options);
    tree.generate();
    const galhos = tree.branchesMesh.geometry, folhas = tree.leavesMesh.geometry;
    galhos.computeBoundingBox();
    folhas.computeBoundingBox();
    const topo = Math.max(galhos.boundingBox.max.y, folhas.boundingBox.max.y);
    const alvo = e.altura[0] + rng() * (e.altura[1] - e.altura[0]);
    const orig = tree.leavesMesh.material;
    const matFolhas = vento(
      toon({ map: orig.map, color: e.cor, side: THREE.DoubleSide, alphaTest: 0.5 }),
      e.altura[0] < 3 ? 0.12 : 0.35,
      topo,
      true,
    );
    const matGalhos = e.id === "betula" || e.id === "dourada" ? cascaDeBetula() : toon({ color: e.casca ?? BASE.casca });
    // Silhueta por espécie: pinheiro em cones; salgueiro com cortina pendente;
    // carvalho largo e lobado; demais folhosas e arbustos com massa padrão.
    let massa;
    if (e.id === "pinheiro") massa = camadasDePinheiro(folhas, rng);
    else {
      const k = e.altura[0] < 3 ? 3 : e.id === "carvalho" ? 10 : 7;
      massa = massaDaCopa(folhas, k, rng, e.id === "carvalho" ? 1.02 : 0.95);
      if (e.id === "salgueiro") {
        const cortina = cortinaDeSalgueiro(folhas, rng);
        if (massa && cortina) massa = juntar([massa, cortina]);
      }
    }
    const matMassa = massa ? toon({ color: new THREE.Color(e.cor).multiplyScalar(0.92), side: e.id === "salgueiro" ? THREE.DoubleSide : THREE.FrontSide }) : null;
    return { id: e.id, galhos, folhas, massa, matMassa, matGalhos, matFolhas, escala: alvo / Math.max(1, topo) };
  }

  /** Espécie pelo lugar: salgueiros na água, pinheiros em manchas, acentos raros. */
  especie(o, rng) {
    if (o.tipo === "arbusto") return ["arbusto_a", "arbusto_b", "arbusto_c"][Math.floor(rng() * 3)];
    if (o.lago < 1.6 && rng() < 0.7) return "salgueiro";
    const r = rng();
    if (r < 0.05) return "cerejeira";
    if (r < 0.1) return "outonal";
    if (r < 0.13) return "dourada";
    if (o.zona > 0.58) return r < 0.7 ? "pinheiro" : "betula";
    if (o.zona < 0.42) return r < 0.6 ? "carvalho" : "freixo";
    return r < 0.4 ? "freixo" : r < 0.7 ? "betula" : "carvalho";
  }

  plantar() {
    const rng = criarRng(this.mundo.semente ^ 0x1234567);
    const porId = new Map();
    for (const v of this.variacoes) porId.set(v.id, [...(porId.get(v.id) ?? []), v]);
    const grupos = new Map();
    const q = new THREE.Quaternion();
    for (const o of this.mundo.objetos) {
      if (o.tipo !== "arvore" && o.tipo !== "arbusto") continue;
      const lista = porId.get(this.especie(o, rng));
      const v = lista[Math.floor(rng() * lista.length)];
      const s = v.escala * o.escala;
      q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.08, o.giro, (rng() - 0.5) * 0.08));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(o.x, this.alturaEm(o.x, o.y) - 0.15, o.y), q, new THREE.Vector3(s, s, s));
      grupos.set(v, [...(grupos.get(v) ?? []), { m, nasce: o.nasce }]);
    }
    for (const [v, itens] of grupos) {
      const galhos = new THREE.InstancedMesh(v.galhos, v.matGalhos, itens.length);
      const folhas = new THREE.InstancedMesh(v.folhas, v.matFolhas, itens.length);
      const massa = v.massa ? new THREE.InstancedMesh(v.massa, v.matMassa, itens.length) : null;
      // Tom por árvore em DEGRAUS (como um pintor de pixel escolheria): mais escura,
      // normal ou mais clara — copa e folhas juntas, para a árvore ler como unidade.
      const DEGRAUS = [0.86, 1, 1, 1.13];
      const tom = new THREE.Color();
      itens.forEach((_, i) => {
        const l = DEGRAUS[Math.floor(rng() * DEGRAUS.length)];
        tom.setRGB(l, l, l);
        folhas.setColorAt(i, tom);
        massa?.setColorAt(i, tom);
      });
      for (const im of [galhos, folhas, massa].filter(Boolean)) {
        im.castShadow = im.receiveShadow = true;
        im.frustumCulled = false;
        this.scene.add(im);
      }
      this.materiaisVento.push(v.matFolhas);
      this.arvores.push({ malhas: [galhos, folhas, massa].filter(Boolean), itens });
    }
  }

  atualizarCrescimento(forcar = false) {
    if (this.cresceVisto < 0) this.cresceVisto = this.crescimento;
    const delta = this.crescimento - this.cresceVisto;
    if (!forcar && Math.abs(delta) < 0.001) return;
    if (!forcar) this.cresceVisto += delta * 0.08;
    const g = this.cresceVisto;
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), m = new THREE.Matrix4();
    for (const a of this.arvores) {
      a.itens.forEach((it, i) => {
        const gf = it.nasce === 0 ? 1 : suave(it.nasce, it.nasce + 0.22, g);
        it.m.decompose(p, q, s);
        m.compose(p, q, s.multiplyScalar(gf <= 0.01 ? 0 : 0.2 + 0.8 * gf));
        for (const im of a.malhas) im.setMatrixAt(i, m);
      });
      for (const im of a.malhas) im.instanceMatrix.needsUpdate = true;
    }
  }

  // --- Capim, flores, pedras, troncos -------------------------------------

  criarDetalhes() {
    const m = this.mundo;
    const rng = criarRng(m.semente ^ 0x99);
    const d = new THREE.Object3D();

    // Capim: 3 formatos, agrupado por manchas, fora da trilha e da água.
    const matCapim = vento(toon({ vertexColors: true, side: THREE.DoubleSide }), 0.12);
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
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
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
    return { ...this.renderer.info.render, rt: [this.rt.width, this.rt.height], instancias: this.arvores.reduce((n, a) => n + a.itens.length, 0) };
  }
}
