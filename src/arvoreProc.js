/**
 * Gerador procedural de árvores (próprio, sem biblioteca externa).
 *
 * Cada espécie (especies.js) define uma FORMA, cores, proporções e extras
 * (flores, frutos). Para cada variação, este módulo constrói os 4 ESTÁGIOS
 * de vida como modelos diferentes (não é só a adulta encolhida):
 *   0 broto → 1 muda → 2 jovem → 3 adulta (com flores/frutos).
 *
 * Tudo (tronco, galhos, copa, flores, frutos) sai numa ÚNICA geometria com
 * cor por vértice tirada da paleta: um desenho por estágio, leve para a GPU.
 * Unidades em metros; a base do tronco fica em y = 0.
 */
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { criarRng, criarRuido } from "./mundo.js";
import { distribuirEnfeites, validarEspecie } from "./ornamentos.js";
import { criarCatavento } from "./arvoreCatavento.js";
import { construirPitanga } from "./pitangaSol.js";
import { criarPaineiraAbracos } from "./paineiraAbracos.js";
import { criarSalgueiroCancoes } from "./salgueiroCancoes.js";
import { criarAraucariaCometas } from "./araucariaCometas.js";
import { criarManguePontes } from "./manguePontes.js";
import { criarJabuticabeiraConstelacoes } from "./jabuticabeiraConstelacoes.js";
import { criarArvoreNinhos } from "./arvoreNinhos.js";
import { criarArvoreSegredos } from "./arvoreSegredos.js";
import { RAMPAS } from "./paleta.js";

const lerp = (a, b, t) => a + (b - a) * t;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

/** Desloca uma cor n degraus dentro da sua rampa da paleta (+ clareia, − escurece). */
function deslocar(hex, n) {
  const h = hex.toLowerCase();
  for (const r of Object.values(RAMPAS)) {
    const i = r.findIndex((c) => c.toLowerCase() === h);
    if (i >= 0) return r[limitar(i + n, 0, r.length - 1)];
  }
  return hex;
}
const VERDES = new Set([...RAMPAS.mata, ...RAMPAS.salvia].map((c) => c.toLowerCase()));
const ehVerde = (hex) => VERDES.has(hex.toLowerCase());

// ---------------------------------------------------------------------------
// Utilidades de geometria
// ---------------------------------------------------------------------------

/** Cor por vértice: cor-base × fator(x, y, z). */
function pintar(g, hex, fator = () => 1) {
  const p = g.attributes.position;
  const c = new THREE.Color(hex);
  const arr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const k = fator(p.getX(i), p.getY(i), p.getZ(i));
    arr[i * 3] = c.r * k;
    arr[i * 3 + 1] = c.g * k;
    arr[i * 3 + 2] = c.b * k;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Garante: sem índice, com normais (calculadas antes de desindexar ⇒ suaves). */
function finalizar(g) {
  if (!g.attributes.normal) g.computeVertexNormals();
  return g.index ? g.toNonIndexed() : g;
}

/** Junta partes (posição, normal, cor) numa só geometria. */
export function juntar(partes) {
  const total = partes.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), cor = new Float32Array(total * 3).fill(1);
  // Altura dentro da copa (-1 base … +1 topo): o shader desenha luz, sombra e escamas de folhas.
  // -9 = não é folhagem (tronco, galho, fruto, flor): fica sem esse desenho.
  const banda = new Float32Array(total).fill(-9);
  // Folhagem: direção na esfera do volume, raio e semente — o shader distribui os aglomerados
  // de folhas SOBRE a superfície de cada volume (seguem a curvatura e a luz do sol).
  const esfera = new Float32Array(total * 3), raioCopa = new Float32Array(total), semCopa = new Float32Array(total);
  let o = 0;
  for (const g of partes) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) cor.set(g.attributes.color.array, o * 3);
    if (g.attributes.banda) banda.set(g.attributes.banda.array, o);
    if (g.attributes.esfera) {
      esfera.set(g.attributes.esfera.array, o * 3);
      raioCopa.set(g.attributes.raioCopa.array, o);
      semCopa.set(g.attributes.semCopa.array, o);
    }
    o += g.attributes.position.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3));
  geo.setAttribute("banda", new THREE.BufferAttribute(banda, 1));
  geo.setAttribute("esfera", new THREE.BufferAttribute(esfera, 3));
  geo.setAttribute("raioCopa", new THREE.BufferAttribute(raioCopa, 1));
  geo.setAttribute("semCopa", new THREE.BufferAttribute(semCopa, 1));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Volume de folhagem: icosaedro com saliências; reentrâncias mais escuras e
 * topo mais claro (cor por vértice), normais suaves.
 */
function volume(raio, c, hex, semente, achatar = 0.85, irregular = 0.4) {
  let g = new THREE.IcosahedronGeometry(1, 2);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const r = criarRuido(semente);
  const p = g.attributes.position;
  const fatores = new Float32Array(p.count), bandas = new Float32Array(p.count);
  const esf = new Float32Array(p.count * 3), raios = new Float32Array(p.count).fill(raio), sems = new Float32Array(p.count).fill(((semente * 0.6180339) % 1 + 1) % 1);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = r(x * 1.7 + z * 0.8 + 3, y * 1.7 + z * 1.2 + 7, 2);
    const k = raio * (1 - irregular / 2 + n * irregular);
    p.setXYZ(i, c.x + x * k, c.y + y * k * achatar, c.z + z * k);
    fatores[i] = 0.95 + n * 0.08; // cor quase chapada: a leitura de volume vem das faixas desenhadas
    bandas[i] = y;
    esf.set([x, y, z], i * 3);
  }
  let idx = 0;
  pintar(g, hex, () => fatores[idx++]);
  g.setAttribute("banda", new THREE.BufferAttribute(bandas, 1));
  g.setAttribute("esfera", new THREE.BufferAttribute(esf, 3));
  g.setAttribute("raioCopa", new THREE.BufferAttribute(raios, 1));
  g.setAttribute("semCopa", new THREE.BufferAttribute(sems, 1));
  g.computeVertexNormals();
  const geo = g.toNonIndexed();
  geo.userData.copa = { centro: c.clone(), raio, achatar, cor: hex };
  return geo;
}

/** Tronco cônico com leve curva; marcas de bétula ou anéis de palmeira opcionais. */
function tronco({ altura, r0, r1, curva = [0, 0], hex, segs = 8, marcas = false, aneis = false, rng }) {
  const g = new THREE.CylinderGeometry(r1, r0, altura, 7, segs, false);
  g.translate(0, altura / 2, 0);
  const p = g.attributes.position;
  const marcaLinha = Array.from({ length: segs + 1 }, () => (rng() < 0.4 ? rng() * Math.PI * 2 : null));
  const fatores = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), t = y / altura;
    p.setX(i, p.getX(i) + curva[0] * t * t);
    p.setZ(i, p.getZ(i) + curva[1] * t * t);
    let k = 0.8 + 0.2 * t; // base mais escura (sombra do chão)
    const linha = Math.round(t * segs);
    if (marcas && marcaLinha[linha] !== null) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      if (Math.abs(((a - marcaLinha[linha] + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.0) k = 0.16;
    }
    if (aneis) k *= linha % 2 ? 0.86 : 1.04;
    fatores[i] = k;
  }
  let idx = 0;
  pintar(g, hex, () => fatores[idx++]);
  g.computeVertexNormals();
  const geo = g.toNonIndexed();
  geo.userData.tronco = { altura, r0, r1, curva };
  return { geo, topo: V(curva[0], altura, curva[1]) };
}

/** Galho reto de a até b, afinando. */
function galho(a, b, r0, r1, hex) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 5, 1, false);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.normalize()));
  g.translate(a.x, a.y, a.z);
  pintar(g, hex, () => 0.9);
  return finalizar(g);
}

/** Pequena esfera (fruto, flor, pinta). */
function bolinha(raio, c, hex, achatar = 1, detalhe = 1) {
  const g = new THREE.IcosahedronGeometry(raio, detalhe);
  g.scale(1, achatar, 1);
  g.translate(c.x, c.y, c.z);
  pintar(g, hex, (x, y) => 0.92 + ((y - c.y) / raio) * 0.12);
  return finalizar(g);
}

/** Cone de conífera com borda serrilhada; base da camada mais escura. */
function camadaConica(raio, alt, yBase, hex, rng, dentes = 14) {
  let g = new THREE.ConeGeometry(raio, alt, dentes, 2, true);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const p = g.attributes.position;
  const fatores = new Float32Array(p.count);
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
    const borda = y < -alt / 2 + 1e-3;
    if (borda) {
      const a = Math.atan2(z, x);
      const d = Math.round((a / (Math.PI * 2)) * dentes) % 2 === 0 ? 1.14 : 0.88;
      p.setXYZ(k, x * d, y - (d > 1 ? alt * 0.1 : 0), z * d);
    }
    fatores[k] = borda ? 0.8 : 0.95 + (y / alt) * 0.16;
  }
  let idx = 0;
  pintar(g, hex, () => fatores[idx++]);
  const bandasC = new Float32Array(p.count);
  for (let k = 0; k < p.count; k++) bandasC[k] = (p.getY(k) / alt) * 2; // -1 na saia … +1 na ponta
  g.setAttribute("banda", new THREE.BufferAttribute(bandasC, 1));
  g.computeVertexNormals();
  g.rotateY(rng() * 6.28);
  g.translate(0, yBase + alt / 2, 0);
  return g.toNonIndexed();
}

/** Lâmina pendente (salgueiro) ou folha de palmeira (fronde). */
function lamina({ origem, direcao, comprimento, largura, queda, hex, elevacao = 0, segs = 6 }) {
  const g = new THREE.PlaneGeometry(1, 1, 1, segs);
  const p = g.attributes.position;
  const lado = V(-direcao.z, 0, direcao.x).normalize();
  const fatores = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const s = p.getX(i); // -0.5..0.5 (largura)
    const t = p.getY(i) + 0.5; // 0..1 (comprimento)
    const w = Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)), 0.7) * largura;
    const along = t * comprimento;
    const pos = origem
      .clone()
      .addScaledVector(direcao, along * Math.cos(elevacao))
      .addScaledVector(V(0, 1, 0), along * Math.sin(elevacao) - queda * t * t * comprimento)
      .addScaledVector(lado, s * w);
    p.setXYZ(i, pos.x, pos.y, pos.z);
    fatores[i] = 0.85 + t * 0.2 - Math.abs(s) * 0.1;
  }
  let idx = 0;
  pintar(g, hex, () => fatores[idx++]);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

/** Montinho de terra fofa (broto e muda recém-plantados). */
function monte(raio) {
  return bolinha(raio, V(0, -raio * 0.12, 0), RAMPAS.terra[2], 0.38, 1);
}

/** Raízes aparentes na base do tronco (só na adulta: sinal de árvore antiga). */
function raizes(r0, hex, rng) {
  const partes = [];
  const n = 4 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.28 + rng() * 0.6;
    const ini = V(Math.cos(a) * r0 * 0.4, r0 * 1.7, Math.sin(a) * r0 * 0.4);
    const fim = V(Math.cos(a) * r0 * lerp(2.6, 3.4, rng()), -r0 * 0.2, Math.sin(a) * r0 * lerp(2.6, 3.4, rng()));
    partes.push(galho(ini, fim, r0 * 0.55, r0 * 0.12, hex));
  }
  return partes;
}

/** Fragmento de cristal (octaedro esticado) apontando na direção dir. */
function fragmento(centro, dir, comp, larg, hex, refY, refH) {
  const g = new THREE.OctahedronGeometry(1, 0);
  g.scale(larg, comp / 2, larg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir));
  const c = centro.clone().addScaledVector(dir, comp * 0.45);
  g.translate(c.x, c.y, c.z);
  pintar(g, hex, (x, y) => 0.85 + ((y - refY) / refH) * 0.3);
  g.computeVertexNormals(); // facetas nítidas: parece cristal
  return finalizar(g);
}

/** Coluna de cacto com costelas (gomos claros/escuros) e topo arredondado. */
function colunaCacto(base, alt, raio, hex) {
  const lados = 16;
  const g = new THREE.CylinderGeometry(raio, raio * 1.05, alt, lados, 3, false);
  g.translate(base.x, base.y + alt / 2, base.z);
  const p = g.attributes.position;
  const fatores = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) - base.x, z = p.getZ(i) - base.z;
    const gomo = ((Math.round((Math.atan2(z, x) / (Math.PI * 2)) * lados) % 2) + 2) % 2 === 0;
    if (gomo) p.setXYZ(i, base.x + x * 1.12, p.getY(i), base.z + z * 1.12);
    fatores[i] = gomo ? 1.04 : 0.8;
  }
  let idx = 0;
  pintar(g, hex, () => fatores[idx++]);
  g.computeVertexNormals();
  const topo = new THREE.SphereGeometry(raio * 1.06, lados, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  topo.scale(1, 0.8, 1);
  topo.translate(base.x, base.y + alt, base.z);
  pintar(topo, hex, () => 1.05);
  return [finalizar(g), finalizar(topo)];
}

// ---------------------------------------------------------------------------
// Formas (uma por "arquitetura" de árvore). Recebem altura H e detalhe d (0..1).
// Devolvem { partes, copas: [{ c, r }] } — copas servem para pôr frutos/flores.
// ---------------------------------------------------------------------------

function corDaCopa(def, rng) {
  const { folha, folha2 } = def.cores;
  return folha2 && rng() < 0.4 ? folha2 : folha;
}

const FORMAS = {
  redonda(def, H, d, rng) {
    const casca = def.cores.casca;
    const th = H * lerp(0.42, 0.36, d);
    const t = tronco({ altura: th, r0: H * 0.045 * (def.grossura ?? 1), r1: H * 0.03 * (def.grossura ?? 1), curva: [(rng() - 0.5) * H * 0.06, (rng() - 0.5) * H * 0.06], hex: casca, rng });
    const partes = [t.geo];
    const jovem = def.fase === "jovem";
    const R = H * 0.33 * (def.largura ?? 1) * (jovem ? 0.68 : 1);
    const centro = V(t.topo.x, H * (jovem ? 0.72 : 0.64), t.topo.z);
    const k = jovem ? 4 : Math.round(lerp(2, 9, d));
    const copas = [];
    for (let i = 0; i < k; i++) {
      const a = rng() * 6.28, dist = i === 0 ? 0 : R * lerp(0.35, 0.65, rng());
      const c = centro.clone().add(V(Math.cos(a) * dist, (rng() - 0.35) * R * 0.5, Math.sin(a) * dist));
      const r = R * lerp(0.42, 0.58, rng()) * (i === 0 ? 1.15 : 1);
      copas.push({ c, r });
      if (i > 0 && d > 0.4) partes.push(galho(t.topo.clone().setY(th * 0.85), c.clone().lerp(t.topo, 0.25), H * 0.018, H * 0.01, casca));
      partes.push(volume(r, c, corDaCopa(def, rng), Math.floor(rng() * 1e6), 0.82));
    }
    return { partes, copas };
  },

  oval(def, H, d, rng) {
    const casca = def.cores.casca;
    const th = H * 0.32;
    const t = tronco({ altura: H * 0.72, r0: H * 0.03 * (def.grossura ?? 1), r1: H * 0.012, curva: [(rng() - 0.5) * H * 0.05, (rng() - 0.5) * H * 0.05], hex: casca, marcas: def.marcas && def.fase === "adulta", rng });
    const partes = [t.geo];
    const R = H * 0.2 * (def.largura ?? 1);
    const k = Math.round(lerp(2, 7, d));
    const copas = [];
    for (let i = 0; i < k; i++) {
      const u = k === 1 ? 0.5 : i / (k - 1);
      const y = lerp(th + R * 0.8, H - R * 0.6, u);
      const larg = Math.sin(Math.PI * lerp(0.15, 0.85, u)) * R * 0.55;
      const a = rng() * 6.28;
      const c = V(t.topo.x * (y / H) + Math.cos(a) * larg, y, t.topo.z * (y / H) + Math.sin(a) * larg);
      const r = R * lerp(0.5, 0.68, rng());
      copas.push({ c, r });
      partes.push(volume(r, c, corDaCopa(def, rng), Math.floor(rng() * 1e6), 0.9));
    }
    return { partes, copas };
  },

  conica(def, H, d, rng) {
    const jovem = def.fase === "jovem";
    const t = tronco({ altura: H * (jovem ? 0.15 : 0.4), r0: H * 0.035, r1: H * 0.02, hex: def.cores.casca, rng });
    const partes = [t.geo];
    const camadas = Math.round(lerp(2, 6, d));
    const base = H * (jovem ? 0.02 : 0.24), raio = H * 0.27 * (def.largura ?? 1) * (jovem ? 1.12 : 1);
    for (let i = 0; i < camadas; i++) {
      const u = i / camadas;
      const alt = (H - base) * (0.36 - u * 0.04);
      partes.push(camadaConica(raio * (1 - u * 0.78) * lerp(0.92, 1.08, rng()), alt, base + (H - base) * u * 0.8, def.cores.folha, rng));
    }
    return { partes, copas: [{ c: V(0, H * 0.45, 0), r: raio * 0.7 }] };
  },

  colunar(def, H, d, rng) {
    const t = tronco({ altura: H * 0.15, r0: H * 0.03, r1: H * 0.025, hex: def.cores.casca, rng });
    const partes = [t.geo];
    const n = Math.round(lerp(2, 6, d));
    const copas = [];
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const r = H * 0.12 * (1 - u * 0.55) * lerp(0.95, 1.05, rng());
      const c = V((rng() - 0.5) * r * 0.2, lerp(H * 0.2, H * 0.82, u) + r * 0.5, (rng() - 0.5) * r * 0.2);
      copas.push({ c, r });
      partes.push(volume(r, c, def.cores.folha, Math.floor(rng() * 1e6), 1.5, 0.3));
    }
    partes.push(camadaConica(H * 0.05, H * 0.14, H * 0.86, def.cores.folha, rng, 8)); // ponta
    return { partes, copas };
  },

  pendente(def, H, d, rng) {
    const jovem = def.fase === "jovem";
    const r = jovem ? FORMAS.oval({ ...def, largura: (def.largura ?? 1) * 0.9 }, H, d, rng) : FORMAS.redonda({ ...def, largura: (def.largura ?? 1) * 1.05 }, H, d, rng);
    const nLam = jovem ? 8 : Math.round(lerp(6, 46, d));
    for (let i = 0; i < nLam; i++) {
      const c = r.copas[Math.floor(rng() * r.copas.length)];
      const a = rng() * 6.28;
      const dir = V(Math.cos(a), 0, Math.sin(a));
      const origem = c.c.clone().addScaledVector(dir, c.r * 0.85).add(V(0, -c.r * 0.1, 0));
      const comp = H * (jovem ? lerp(0.1, 0.18, rng()) : lerp(0.25, 0.42, rng()));
      r.partes.push(lamina({ origem, direcao: dir, comprimento: comp, largura: H * 0.04, queda: 1.6, elevacao: -1.25, hex: def.cores.folha }));
    }
    return r;
  },

  "guarda-chuva"(def, H, d, rng) {
    const casca = def.cores.casca;
    const th = H * 0.55;
    const t = tronco({ altura: th, r0: H * 0.035, r1: H * 0.025, curva: [(rng() - 0.5) * H * 0.08, (rng() - 0.5) * H * 0.08], hex: casca, rng });
    const partes = [t.geo];
    const R = H * 0.42 * (def.largura ?? 1);
    const nGalhos = d > 0.5 ? 4 : 3;
    const pontas = [];
    for (let i = 0; i < nGalhos; i++) {
      const a = (i / nGalhos) * 6.28 + rng() * 0.5;
      const ponta = V(t.topo.x + Math.cos(a) * R * 0.55, H * 0.74, t.topo.z + Math.sin(a) * R * 0.55);
      partes.push(galho(t.topo, ponta, H * 0.02, H * 0.012, casca));
      pontas.push(ponta);
    }
    const k = Math.round(lerp(3, 9, d));
    const copas = [];
    for (let i = 0; i < k; i++) {
      const a = rng() * 6.28, dist = R * Math.sqrt(rng()) * 0.75;
      const c = V(t.topo.x + Math.cos(a) * dist, H * lerp(0.78, 0.88, rng()), t.topo.z + Math.sin(a) * dist);
      const r = H * lerp(0.13, 0.18, rng());
      copas.push({ c, r });
      partes.push(volume(r, c, corDaCopa(def, rng), Math.floor(rng() * 1e6), 0.6));
    }
    return { partes, copas };
  },

  palmeira(def, H, d, rng) {
    const jovem = def.fase === "jovem";
    const curva = jovem ? [0, 0] : [(rng() - 0.5) * H * 0.25, (rng() - 0.5) * H * 0.25];
    const t = tronco({ altura: H * (jovem ? 0.22 : 0.88), r0: H * (jovem ? 0.07 : 0.03), r1: H * (jovem ? 0.05 : 0.022), curva, hex: def.cores.casca, segs: jovem ? 4 : 14, aneis: true, rng });
    const partes = [t.geo];
    const n = jovem ? 7 : Math.round(lerp(4, 10, d));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rng() * 0.3;
      partes.push(lamina({
        origem: t.topo, direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: H * (jovem ? lerp(0.5, 0.65, rng()) : lerp(0.28, 0.4, rng())),
        largura: H * (jovem ? 0.12 : 0.08), queda: 0.9, elevacao: jovem ? lerp(0.75, 1.05, rng()) : lerp(0.35, 0.7, rng()), hex: i % 3 === 0 && def.cores.folha2 ? def.cores.folha2 : def.cores.folha,
      }));
    }
    return { partes, copas: [{ c: t.topo.clone().add(V(0, -H * 0.03, 0)), r: H * 0.05 }] };
  },

  araucaria(def, H, d, rng) {
    const casca = def.cores.casca;
    const t = tronco({ altura: H * 0.9, r0: H * 0.03, r1: H * 0.016, hex: casca, segs: 10, rng });
    const partes = [t.geo];
    const verticilos = 3;
    for (let v = 0; v < verticilos; v++) {
      const u = v / (verticilos - 1);
      const y = lerp(H * 0.62, H * 0.86, u);
      const L = H * lerp(0.3, 0.16, u);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.28 + v * 0.5 + rng() * 0.2;
        const ponta = V(Math.cos(a) * L, y + L * 0.28, Math.sin(a) * L);
        partes.push(galho(V(0, y, 0), ponta, H * 0.01, H * 0.006, casca));
        // Tufo virado para cima na ponta: o "candelabro" da araucária.
        partes.push(volume(H * 0.06, ponta.clone().add(V(0, H * 0.025, 0)), def.cores.folha, Math.floor(rng() * 1e6), 0.55, 0.3));
      }
    }
    partes.push(volume(H * 0.07, V(0, H * 0.92, 0), def.cores.folha, Math.floor(rng() * 1e6), 0.6, 0.3));
    return { partes, copas: [{ c: V(0, H * 0.8, 0), r: H * 0.25 }] };
  },

  cogumelo(def, H, d, rng) {
    if (def.fase === "jovem") {
      const pe = new THREE.CylinderGeometry(H * 0.12, H * 0.17, H * 0.42, 8, 2);
      pe.translate(0, H * 0.21, 0);
      pintar(pe, def.cores.casca, (x, y) => 0.85 + (y / H) * 0.2);
      const R = H * 0.3;
      const sino = new THREE.SphereGeometry(R, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
      sino.scale(1, 1.3, 1);
      sino.translate(0, H * 0.4, 0);
      pintar(sino, def.cores.folha, (x, y) => 0.86 + ((y - H * 0.4) / R) * 0.2);
      const partes = [finalizar(pe), finalizar(sino)];
      for (let i = 0; i < 5; i++) {
        const a = rng() * 6.28, el = lerp(0.5, 1.2, rng());
        partes.push(bolinha(R * 0.16, V(Math.cos(a) * Math.cos(el) * R, H * 0.4 + Math.sin(el) * R * 1.3, Math.sin(a) * Math.cos(el) * R), def.cores.pinta, 0.5, 1));
      }
      return { partes, copas: [] };
    }
    const pe = new THREE.CylinderGeometry(H * 0.1, H * 0.15, H * 0.62, 8, 2);
    pe.translate(0, H * 0.31, 0);
    pintar(pe, def.cores.casca, (x, y) => 0.85 + (y / H) * 0.2);
    const R = H * 0.5;
    const chapeu = new THREE.SphereGeometry(R, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    chapeu.scale(1, 0.5, 1);
    chapeu.translate(0, H * 0.58, 0);
    pintar(chapeu, def.cores.folha, (x, y) => 0.88 + ((y - H * 0.58) / R) * 0.25);
    const lamelas = new THREE.CircleGeometry(R * 0.98, 14);
    lamelas.rotateX(Math.PI / 2);
    lamelas.translate(0, H * 0.585, 0);
    pintar(lamelas, def.cores.lamela ?? def.cores.casca, () => 0.6);
    const partes = [finalizar(pe), finalizar(chapeu), finalizar(lamelas)];
    partes.push(bolinha(H * 0.17, V(0, H * 0.44, 0), def.cores.pinta, 0.28, 1)); // anel (saia) no pé
    const pintas = Math.round(lerp(2, 14, d));
    for (let i = 0; i < pintas; i++) {
      const a = rng() * 6.28, el = lerp(0.25, 1.2, rng());
      const c = V(Math.cos(a) * Math.cos(el) * R, H * 0.58 + Math.sin(el) * R * 0.5, Math.sin(a) * Math.cos(el) * R);
      partes.push(bolinha(R * lerp(0.08, 0.13, rng()), c, def.cores.pinta, 0.45, 1));
    }
    return { partes, copas: [] };
  },

  moita(def, H, d, rng) {
    const n = 2 + Math.floor(rng() * 3);
    const partes = [];
    const copas = [];
    for (let i = 0; i < n; i++) {
      const a = rng() * 6.28, dist = i === 0 ? 0 : H * lerp(0.2, 0.4, rng());
      const r = H * lerp(0.35, 0.5, rng());
      const c = V(Math.cos(a) * dist, r * 0.75, Math.sin(a) * dist);
      copas.push({ c, r });
      partes.push(volume(r, c, def.cores.folha, Math.floor(rng() * 1e6), 0.75));
    }
    return { partes, copas };
  },

  /** Bananeira: pseudocaule grosso, folhas largas em leque; adulta com cacho e "coração" roxo. */
  bananeira(def, H, d, rng) {
    const t = tronco({ altura: H * 0.55, r0: H * 0.07, r1: H * 0.05, hex: def.cores.casca, segs: 6, aneis: true, rng });
    const partes = [t.geo];
    const jovem = def.fase === "jovem";
    const n = jovem ? 5 : Math.round(lerp(3, 8, d));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rng() * 0.4;
      partes.push(lamina({
        origem: t.topo, direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: H * lerp(0.4, 0.55, rng()),
        largura: H * 0.17, queda: 1.1, elevacao: jovem ? lerp(1.0, 1.3, rng()) : lerp(0.7, 1.1, rng()), hex: i % 3 === 0 ? (def.cores.folha2 ?? def.cores.folha) : def.cores.folha, segs: 5,
      }));
    }
    if (jovem) {
      // Primeiro o coração (a flor) pende sozinho; as bananas vêm depois.
      const lado = V(Math.cos(rng() * 6.28), 0, Math.sin(rng() * 6.28));
      partes.push(bolinha(H * 0.045, t.topo.clone().addScaledVector(lado, H * 0.08).add(V(0, -H * 0.1, 0)), def.cores.coracao, 1.6, 1));
    } else {
      // Cacho: pencas de bananas em espiral, pendendo de um lado, e o "coração" na ponta.
      const lado = V(Math.cos(rng() * 6.28), 0, Math.sin(rng() * 6.28));
      const base = t.topo.clone().addScaledVector(lado, H * 0.08).add(V(0, -H * 0.05, 0));
      for (let i = 0; i < 14; i++) {
        const u = i / 14, a = u * 6.28 * 2;
        const c = base.clone().add(V(Math.cos(a) * H * 0.04, -u * H * 0.16, Math.sin(a) * H * 0.04));
        partes.push(bolinha(H * 0.03, c, def.fruto.cor, 1.8, 0));
      }
      partes.push(bolinha(H * 0.035, base.clone().add(V(0, -H * 0.2, 0)), def.cores.coracao, 1.6, 1));
      // Filhote: a bananeira adulta brota uma nova ao pé.
      const fl = lado.clone().multiplyScalar(-1);
      const tf = tronco({ altura: H * 0.18, r0: H * 0.035, r1: H * 0.028, hex: def.cores.casca, segs: 2, rng });
      tf.geo.translate(fl.x * H * 0.2, 0, fl.z * H * 0.2);
      partes.push(tf.geo);
      for (let i = 0; i < 3; i++) {
        const a = rng() * 6.28;
        partes.push(lamina({ origem: V(fl.x * H * 0.2, H * 0.18, fl.z * H * 0.2), direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: H * 0.2, largura: H * 0.07, queda: 0.6, elevacao: 1.1, hex: deslocar(def.cores.folha, 1), segs: 3 }));
      }
    }
    return { partes, copas: [] };
  },

  /** Baobá: tronco em garrafa (bojudo no meio), galhos curtos no topo com copinhas achatadas. */
  garrafa(def, H, d, rng) {
    const perfil = [];
    const jovem = def.fase === "jovem";
    const th = H * (jovem ? 0.62 : 0.72), rMax = H * 0.14 * (def.grossura ?? 1) * (jovem ? 0.4 : 1);
    const bojo = jovem ? 0.1 : 0.35;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      perfil.push(new THREE.Vector2(rMax * (0.75 + bojo * Math.sin(Math.PI * Math.min(1, t * 1.1)) - t * 0.35), t * th));
    }
    const g = new THREE.LatheGeometry(perfil, 10);
    pintar(g, def.cores.casca, (x, y) => 0.82 + (y / th) * 0.2);
    const partes = [finalizar(g)];
    const topo = V(0, th, 0);
    const n = jovem ? 3 : Math.round(lerp(3, 7, d));
    const copas = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rng() * 0.5;
      const L = H * (jovem ? lerp(0.1, 0.16, rng()) : lerp(0.18, 0.3, rng()));
      const ponta = V(Math.cos(a) * L, th + H * lerp(0.08, 0.18, rng()), Math.sin(a) * L);
      partes.push(galho(topo.clone().add(V(0, -H * 0.03, 0)), ponta, H * 0.03, H * 0.012, def.cores.casca));
      const r = H * lerp(0.08, 0.11, rng());
      copas.push({ c: ponta.clone().add(V(0, r * 0.3, 0)), r });
      partes.push(volume(r, ponta.clone().add(V(0, r * 0.3, 0)), corDaCopa(def, rng), Math.floor(rng() * 1e6), 0.5, 0.35));
    }
    if (def.espinhos) {
      // Paineira (barriguda): acúleos cônicos espalhados pelo tronco.
      for (let i = 0; i < (jovem ? 14 : 30); i++) {
        const u = rng() * 0.85, a = rng() * 6.28;
        const rr = rMax * (0.75 + bojo * Math.sin(Math.PI * Math.min(1, u * 1.1)) - u * 0.35);
        const dir = V(Math.cos(a), 0.15, Math.sin(a)).normalize();
        const g = new THREE.ConeGeometry(H * 0.012, H * 0.035, 4);
        g.translate(0, H * 0.0175, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir));
        g.translate(Math.cos(a) * rr * 0.95, u * th, Math.sin(a) * rr * 0.95);
        pintar(g, RAMPAS.pedra[1]);
        partes.push(finalizar(g));
      }
    }
    return { partes, copas };
  },

  /** Bambuzal: touceira de colmos com nós (anéis) e tufos de folhas finas no alto. */
  bambu(def, H, d, rng) {
    // Touceira em forma de vaso: colmos nascem juntos e se arqueiam para fora;
    // a folhagem fica no alto, em plumas que pendem — a cara de um bambuzal.
    const partes = [];
    const jovem = def.fase === "jovem";
    const n = jovem ? 6 : 18;
    const raioBase = H * (jovem ? 0.05 : 0.09);
    const folhas = [def.cores.folha, def.cores.folha2 ?? deslocar(def.cores.folha, -1)];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rng() * 0.5, fora = Math.sqrt(rng());
      const dist = fora * raioBase;
      const h = H * lerp(0.75, 1, rng()) * (1 - fora * 0.15);
      const abre = h * lerp(0.15, 0.32, fora) * (jovem ? 0.7 : 1); // os de fora arqueiam mais
      const incl = [Math.cos(a) * abre, Math.sin(a) * abre];
      const velho = !jovem && i % 6 === 5;
      const casca = velho ? RAMPAS.amarelo[0] : i % 3 === 0 ? deslocar(def.cores.casca, -1) : def.cores.casca;
      const t = tronco({ altura: h, r0: H * (jovem ? 0.009 : 0.013), r1: H * (jovem ? 0.006 : 0.009), curva: incl, hex: casca, segs: 10, aneis: true, rng });
      const bx = Math.cos(a) * dist, bz = Math.sin(a) * dist;
      t.geo.translate(bx, 0, bz);
      partes.push(t.geo);
      const ponto = (u) => V(bx + incl[0] * u * u, h * u, bz + incl[1] * u * u);
      // Raminhos com folhas finas pendendo, concentrados na metade de cima.
      const nos = jovem ? 4 : 6;
      for (let k = 0; k < nos; k++) {
        const u = lerp(jovem ? 0.5 : 0.62, 1, k / (nos - 1));
        const origem = ponto(u);
        for (let fo = 0; fo < 3; fo++) {
          const b = a + (rng() - 0.5) * 2.6; // a maioria virada para fora da touceira
          partes.push(lamina({ origem, direcao: V(Math.cos(b), 0, Math.sin(b)), comprimento: H * lerp(0.08, 0.12, rng()), largura: H * 0.022, queda: 0.9, elevacao: 0.15, hex: folhas[(k + fo) % 2], segs: 3 }));
        }
      }
      // Leque de folhas pendendo da ponta arqueada (a pluma do bambu).
      const ponta = ponto(1);
      for (let fo = 0; fo < 7; fo++) {
        const b = a + (fo / 6 - 0.5) * 3.4;
        partes.push(lamina({ origem: ponta, direcao: V(Math.cos(b), 0, Math.sin(b)), comprimento: H * lerp(0.1, 0.14, rng()), largura: H * 0.024, queda: 1.2, elevacao: 0.25, hex: folhas[fo % 2], segs: 3 }));
      }
    }
    if (!jovem)
      // Brotos novos (rebentos) ao pé da touceira.
      for (let i = 0; i < 4; i++) {
        const a = rng() * 6.28, dist = raioBase * lerp(1.2, 1.7, rng());
        const g = new THREE.ConeGeometry(H * 0.02, H * lerp(0.05, 0.09, rng()), 6);
        g.translate(Math.cos(a) * dist, H * 0.035, Math.sin(a) * dist);
        pintar(g, RAMPAS.terra[3], (x, y) => 0.85 + y / H);
        partes.push(finalizar(g));
      }
    return { partes, copas: [] };
  },

  /**
   * Embaúba (Cecropia): tronco claro com anéis; folhas grandes e recortadas em
   * guarda-sol nas pontas. Jovem = um guarda-sol só no topo; adulta = braços em candelabro.
   */
  candelabro(def, H, d, rng) {
    const jovem = def.fase === "jovem";
    const th = H * (jovem ? 0.82 : 0.58);
    const t = tronco({ altura: th, r0: H * 0.028 * (def.grossura ?? 1), r1: H * 0.018, curva: [(rng() - 0.5) * H * 0.06, (rng() - 0.5) * H * 0.06], hex: def.cores.casca, segs: 10, aneis: true, rng });
    const partes = [t.geo], copas = [], pontas = [t.topo];
    if (!jovem) {
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.28 + rng() * 0.6;
        const base = t.topo.clone().multiplyScalar(lerp(0.82, 0.95, rng()));
        const L = H * lerp(0.13, 0.2, rng());
        const meio = base.clone().add(V(Math.cos(a) * L, H * 0.04, Math.sin(a) * L));
        const ponta = meio.clone().add(V(Math.cos(a) * L * 0.25, H * lerp(0.16, 0.3, rng()), Math.sin(a) * L * 0.25));
        partes.push(galho(base, meio, H * 0.014, H * 0.011, def.cores.casca), galho(meio, ponta, H * 0.011, H * 0.008, def.cores.casca));
        pontas.push(ponta);
      }
    }
    for (const p of pontas) {
      const nf = 7;
      for (let i = 0; i < nf; i++) {
        const a = (i / nf) * 6.28 + rng() * 0.3;
        partes.push(lamina({ origem: p, direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: H * lerp(0.1, 0.14, rng()), largura: H * 0.075, queda: 0.7, elevacao: 0.15, hex: i % 2 ? (def.cores.folha2 ?? def.cores.folha) : def.cores.folha, segs: 4 }));
      }
      copas.push({ c: p.clone().add(V(0, -H * 0.02, 0)), r: H * 0.05 });
    }
    return { partes, copas };
  },

  /**
   * Buriti (Mauritia): estipe reto e alto, folhas em LEQUE na ponta de pecíolos
   * longos, saia de folhas secas e cachos de frutos. Jovem: leques saindo do chão.
   */
  leque(def, H, d, rng) {
    const jovem = def.fase === "jovem";
    const th = H * (jovem ? 0.1 : 0.78);
    const t = tronco({ altura: th, r0: H * (jovem ? 0.06 : 0.034), r1: H * (jovem ? 0.05 : 0.03), hex: def.cores.casca, segs: jovem ? 2 : 12, aneis: true, rng });
    const partes = [t.geo];
    const n = jovem ? 6 : 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rng() * 0.4;
      const el = jovem ? lerp(0.6, 1.1, rng()) : lerp(-0.15, 1.1, rng());
      const dir = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)).normalize();
      const fim = t.topo.clone().addScaledVector(dir, H * (jovem ? 0.3 : 0.16));
      partes.push(galho(t.topo, fim, H * 0.008, H * 0.006, def.cores.casca));
      // Leque: setor de círculo pregueado (gomos claros/escuros), voltado para fora.
      const raio = H * (jovem ? 0.16 : 0.12);
      const g = new THREE.CircleGeometry(raio, 12, Math.PI * 0.5 - 1.2, 2.4);
      const p = g.attributes.position, fat = new Float32Array(p.count);
      for (let k = 0; k < p.count; k++) fat[k] = Math.floor(((Math.atan2(p.getY(k), p.getX(k)) + 3.2) / 6.4) * 24) % 2 ? 0.86 : 1.06;
      let idx = 0;
      pintar(g, i % 3 ? def.cores.folha : (def.cores.folha2 ?? def.cores.folha), () => fat[idx++]);
      const lado = Math.abs(dir.y) > 0.95 ? V(1, 0, 0) : V().crossVectors(dir, V(0, 1, 0)).normalize();
      const normal = V().crossVectors(lado, dir).normalize();
      g.applyMatrix4(new THREE.Matrix4().makeBasis(lado, dir, normal));
      g.translate(fim.x, fim.y, fim.z);
      partes.push(finalizar(g));
    }
    if (!jovem) {
      // Saia de folhas secas pendendo sob a copa.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.28 + rng() * 0.5;
        partes.push(lamina({ origem: t.topo.clone().add(V(0, -H * 0.02, 0)), direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: H * 0.14, largura: H * 0.05, queda: 2.2, elevacao: -0.3, hex: RAMPAS.terra[2], segs: 3 }));
      }
    }
    return { partes, copas: [{ c: t.topo.clone().add(V(0, -H * 0.06, 0)), r: H * 0.05 }] };
  },

  /**
   * Açaí (Euterpe): touceira de estipes finos e curvos; cada um com o "palmito"
   * verde (bainha) sob a coroa de folhas pinadas pendentes e cachos roxos.
   */
  acai(def, H, d, rng) {
    const jovem = def.fase === "jovem";
    const partes = [], copas = [];
    const n = jovem ? 2 : 4 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rng() * 0.6, dist = i === 0 ? 0 : H * lerp(0.03, 0.07, rng());
      const h = H * (i === 0 ? 1 : lerp(0.65, 0.95, rng()));
      const abre = h * lerp(0.06, 0.16, rng());
      const t = tronco({ altura: h, r0: H * 0.013, r1: H * 0.01, curva: [Math.cos(a) * abre, Math.sin(a) * abre], hex: def.cores.casca, segs: 10, aneis: true, rng });
      t.geo.translate(Math.cos(a) * dist, 0, Math.sin(a) * dist);
      partes.push(t.geo);
      const topo = t.topo.clone().add(V(Math.cos(a) * dist, 0, Math.sin(a) * dist));
      const palmito = new THREE.CylinderGeometry(H * 0.013, H * 0.016, H * 0.1, 7);
      palmito.translate(topo.x, topo.y - H * 0.05, topo.z);
      pintar(palmito, RAMPAS.mata[4], (x, y) => 0.9 + (y - topo.y) / H);
      partes.push(finalizar(palmito));
      for (let f = 0; f < 7; f++) {
        const b = (f / 7) * 6.28 + rng() * 0.4;
        partes.push(lamina({ origem: topo, direcao: V(Math.cos(b), 0, Math.sin(b)), comprimento: H * lerp(0.2, 0.26, rng()), largura: H * 0.04, queda: 1.5, elevacao: lerp(0.5, 0.9, rng()), hex: f % 3 ? def.cores.folha : (def.cores.folha2 ?? def.cores.folha), segs: 6 }));
      }
      copas.push({ c: topo.clone().add(V(0, -H * 0.12, 0)), r: H * 0.035 });
    }
    return { partes, copas };
  },

  /**
   * Cajueiro: tronco curto e grosso que logo se abre em galhos quase horizontais,
   * longos e tortos; copa baixa e larga em volumes achatados.
   */
  esparramada(def, H, d, rng) {
    const jovem = def.fase === "jovem";
    const casca = def.cores.casca;
    const th = H * 0.2;
    const t = tronco({ altura: th, r0: H * 0.07 * (def.grossura ?? 1), r1: H * 0.05 * (def.grossura ?? 1), curva: [(rng() - 0.5) * H * 0.1, (rng() - 0.5) * H * 0.1], hex: casca, rng });
    const partes = [t.geo], copas = [];
    const n = jovem ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rng() * 0.7;
      const L = H * lerp(0.4, 0.65, rng()) * (def.largura ?? 1);
      const meio = t.topo.clone().add(V(Math.cos(a) * L * 0.5, H * lerp(0.0, 0.12, rng()), Math.sin(a) * L * 0.5));
      const ponta = t.topo.clone().add(V(Math.cos(a) * L, H * lerp(0.1, 0.3, rng()), Math.sin(a) * L));
      partes.push(galho(t.topo, meio, H * 0.035, H * 0.026, casca), galho(meio, ponta, H * 0.026, H * 0.015, casca));
      for (const u of [0.55, 1]) {
        const c = meio.clone().lerp(ponta, (u - 0.5) * 2).add(V(0, H * 0.1, 0));
        const r = H * lerp(0.15, 0.22, rng()) * (u === 1 ? 1 : 0.85);
        copas.push({ c, r });
        partes.push(volume(r, c, corDaCopa(def, rng), Math.floor(rng() * 1e6), 0.55, 0.35));
      }
    }
    return { partes, copas };
  },

  /** Cacto colunar (mandacaru): jovem é uma coluna só; adulto vira candelabro com braços e flores. */
  cacto(def, H, d, rng) {
    const jovem = def.fase === "jovem";
    const r = H * 0.065;
    const partes = colunaCacto(V(0, 0, 0), H * 0.92, r, def.cores.folha);
    const copas = [{ c: V(0, H * 0.92 + r * 0.5, 0), r: r * 0.6 }];
    const nBracos = jovem ? 2 : 3 + Math.floor(rng() * 2);
    for (let i = 0; i < nBracos; i++) {
      const a = (i / nBracos) * 6.28 + rng() * 0.8;
      const dir = V(Math.cos(a), 0, Math.sin(a));
      const y = H * lerp(0.3, 0.55, rng());
      if (jovem) {
        // Só um "calo" verde onde o braço vai nascer.
        partes.push(bolinha(r * 0.75, V(0, y, 0).addScaledVector(dir, r * 1.1), def.cores.folha2 ?? def.cores.folha, 1.2, 1));
        continue;
      }
      const L = H * lerp(0.13, 0.19, rng());
      const cotovelo = V(0, y, 0).addScaledVector(dir, L);
      partes.push(galho(V(0, y, 0), cotovelo, r * 0.8, r * 0.8, def.cores.folha));
      partes.push(bolinha(r * 0.82, cotovelo, def.cores.folha, 1, 1));
      const alt = H * lerp(0.28, 0.45, rng());
      partes.push(...colunaCacto(cotovelo, alt, r * 0.82, i % 2 ? (def.cores.folha2 ?? def.cores.folha) : def.cores.folha));
      copas.push({ c: cotovelo.clone().add(V(0, alt + r * 0.4, 0)), r: r * 0.5 });
    }
    return { partes, copas };
  },

  /** Árvore-de-cristal (fantasia): tronco de pedra e copa de cristais apontando para fora. */
  cristal(def, H, d, rng) {
    if (def.fase === "jovem") {
      const partes = [volume(H * 0.17, V(0, H * 0.04, 0), def.cores.casca, Math.floor(rng() * 1e6), 0.6, 0.35)];
      const centro = V(0, H * 0.1, 0);
      for (let i = 0; i < 8; i++) {
        const dir = V(rng() - 0.5, rng() * 0.8 + 0.35, rng() - 0.5).normalize();
        partes.push(fragmento(centro, dir, H * lerp(0.25, 0.5, rng()), H * 0.07, i % 3 === 0 ? (def.cores.folha2 ?? def.cores.folha) : def.cores.folha, centro.y, H * 0.5));
      }
      return { partes, copas: [{ c: V(0, H * 0.3, 0), r: H * 0.2 }] };
    }
    const t = tronco({ altura: H * 0.4, r0: H * 0.06, r1: H * 0.035, curva: [(rng() - 0.5) * H * 0.08, (rng() - 0.5) * H * 0.08], hex: def.cores.casca, rng });
    const partes = [t.geo];
    const centro = t.topo.clone().add(V(0, H * 0.22, 0));
    const n = Math.round(lerp(4, 16, d));
    for (let i = 0; i < n; i++) {
      const dir = V(rng() - 0.5, rng() * 0.9 + 0.1, rng() - 0.5).normalize();
      const comp = H * lerp(0.18, 0.34, rng());
      const g = new THREE.OctahedronGeometry(1, 0);
      g.scale(H * 0.05, comp / 2, H * 0.05);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir));
      const c = centro.clone().addScaledVector(dir, comp * 0.45);
      g.translate(c.x, c.y, c.z);
      const hex = i % 3 === 0 ? (def.cores.folha2 ?? def.cores.folha) : def.cores.folha;
      pintar(g, hex, (x, y) => 0.85 + ((y - centro.y) / (H * 0.4)) * 0.3);
      g.computeVertexNormals(); // facetas nítidas: parece cristal
      partes.push(finalizar(g));
    }
    return { partes, copas: [{ c: centro, r: H * 0.2 }] };
  },
};

// ---------------------------------------------------------------------------
// Estágios — cada fase tem identidade própria, não só tamanho:
//   broto  → montinho de terra + folhas-semente (ou coco, pinhão, rebento…)
//   muda   → caulezinho com folhas espaçadas, amarrado a uma estaca
//   jovem  → tronco fino, copa rala e mais clara, primeira florada
//   adulta → forma madura, cores plenas, raízes aparentes, frutos
// ---------------------------------------------------------------------------

const FASES = ["broto", "muda", "jovem", "adulta"];
const FANTASIA = ["cogumelo", "cristal"];
const PALMAS = ["palmeira", "leque", "acai"];
const CONIFERAS = ["conica", "colunar", "araucaria"];
/** Raio da base do tronco (fração de H) por forma — onde nascem as raízes aparentes. */
const RAIZ = { candelabro: 0.03, esparramada: 0.06, redonda: 0.045, oval: 0.03, pendente: 0.047, "guarda-chuva": 0.035, conica: 0.035, araucaria: 0.03, garrafa: 0.09 };

/**
 * Cores de cada fase. Folhas novas são mais claras; espécies de folha
 * colorida nascem verdes. Na jovem, a primeira florada são flores menores
 * apoiadas na copa; volumes inteiros só recebem a cor madura na adulta.
 */
function coresDaFase(def, fase) {
  const c = def.cores;
  if (fase === "adulta" || FANTASIA.includes(def.forma)) return c;
  const verdeBase = c.folhaJovem ?? (ehVerde(c.folha) ? c.folha : RAMPAS.mata[4]);
  const casca = c.cascaJovem ?? c.casca;
  if (fase === "jovem") {
    const colorida = c.folhaJovem || !ehVerde(c.folha);
    return { ...c, casca, folha: c.folhaJovem ? verdeBase : deslocar(verdeBase, 1), folha2: colorida ? (c.folhaJovem2 ?? verdeBase) : deslocar(c.folha2 ?? c.folha, 1) };
  }
  const clara = c.broto ?? deslocar(verdeBase, 2);
  return { ...c, casca, folha: clara, folha2: deslocar(clara, -1) };
}

/** Broto: o primeiro sinal de vida, diferente por tipo de planta. */
function broto(def, rng) {
  const partes = [monte(0.26)];
  const verde = def.cores.folha;
  if (def.forma === "cogumelo") {
    // Três "cabecinhas de alfinete" brotando do chão.
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + rng(), r = i === 0 ? 0 : 0.12, h = i === 0 ? 0.22 : 0.12;
      const base = V(Math.cos(a) * r, 0, Math.sin(a) * r);
      partes.push(galho(base, base.clone().setY(h), 0.035, 0.03, def.cores.casca));
      partes.push(bolinha(i === 0 ? 0.07 : 0.05, base.clone().setY(h + 0.02), def.cores.folha, 0.8, 1));
    }
    return partes;
  }
  if (def.forma === "cristal") {
    partes.push(volume(0.14, V(0, 0.03, 0), def.cores.casca, Math.floor(rng() * 1e6), 0.6, 0.3));
    partes.push(fragmento(V(0, 0.08, 0), V(0.15, 1, 0.1).normalize(), 0.42, 0.06, def.cores.folha, 0, 0.5));
    return partes;
  }
  if (def.forma === "cacto") {
    // Bolinha de cacto rente ao chão.
    partes.push(...colunaCacto(V(0, 0, 0), 0.12, 0.11, verde));
    return partes;
  }
  if (def.forma === "bambu") {
    // Rebentos pontudos de bambu, ainda com a bainha marrom.
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + rng() * 0.5, r = i === 0 ? 0 : 0.11, h = i === 0 ? 0.5 : lerp(0.25, 0.35, rng());
      const g = new THREE.ConeGeometry(0.07, h, 6);
      g.translate(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      pintar(g, RAMPAS.terra[3], (x, y) => (y > h * 0.75 ? 1.25 : 0.85 + y));
      partes.push(finalizar(g));
    }
    return partes;
  }
  if (PALMAS.includes(def.forma)) {
    // A semente meio enterrada (coco, no coqueiro), com a primeira folha em lança.
    const coco = def.forma === "palmeira";
    partes.push(bolinha(coco ? 0.2 : 0.1, V(0, coco ? 0.1 : 0.05, 0), coco ? RAMPAS.terra[1] : def.fruto?.cor ?? RAMPAS.terra[1], 0.85, 1));
    for (let i = 0; i < 2; i++) {
      const a = i * 3.14 + rng();
      partes.push(lamina({ origem: V(0, 0.22, 0), direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: 0.5 - i * 0.15, largura: 0.08, queda: 0.15, elevacao: 1.3, hex: verde, segs: 3 }));
    }
    return partes;
  }
  if (def.forma === "bananeira") {
    // Folha enrolada em charuto saindo da terra.
    const g = new THREE.ConeGeometry(0.06, 0.5, 6);
    g.translate(0, 0.25, 0);
    pintar(g, verde, (x, y) => 0.85 + y * 0.4);
    partes.push(finalizar(g));
    partes.push(lamina({ origem: V(0, 0.3, 0), direcao: V(1, 0, 0), comprimento: 0.3, largura: 0.12, queda: 0.4, elevacao: 0.9, hex: verde, segs: 3 }));
    return partes;
  }
  if (CONIFERAS.includes(def.forma)) {
    // Caule fino com uma "estrelinha" de agulhas (e o pinhão, na araucária).
    partes.push(galho(V(0, 0, 0), V(0, 0.22, 0), 0.025, 0.02, def.cores.casca));
    partes.push(camadaConica(0.13, 0.22, 0.16, verde, rng, 8));
    if (def.forma === "araucaria") partes.push(bolinha(0.05, V(0.12, 0.05, 0.04), RAMPAS.terra[3], 2, 1));
    return partes;
  }
  // Folhosas: caule em gancho com as duas folhas-semente (cotilédones) abertas.
  const topo = V(0.03, def.forma === "moita" ? 0.2 : 0.32, 0);
  partes.push(galho(V(0, 0, 0), topo, 0.025, 0.02, deslocar(verde, -1)));
  const a = rng() * 3.14;
  for (const s of [0, Math.PI])
    partes.push(lamina({ origem: topo, direcao: V(Math.cos(a + s), 0, Math.sin(a + s)), comprimento: 0.2, largura: 0.14, queda: 0.25, elevacao: 0.3, hex: verde, segs: 2 }));
  partes.push(bolinha(0.04, topo.clone().add(V(0, 0.03, 0)), deslocar(verde, -1), 1.2, 0));
  return partes;
}

/** Muda: planta pequena, de "viveiro", com a cara da espécie mas ainda frágil. */
function muda(def, Hadulta, rng) {
  const verde = def.cores.folha;
  const casca = def.cores.casca;
  const h = def.arbusto ? Hadulta * 0.5 : limitar(Hadulta * 0.17, 1.2, 2.2);
  const partes = [monte(def.arbusto ? 0.3 : 0.36)];
  const copas = [];

  if (def.forma === "cogumelo") {
    // "Ovo": o cogumelo ainda fechado num véu branco, só a ponta do chapéu de fora.
    partes.push(bolinha(0.5, V(0, 0.45, 0), def.cores.casca, 1.3, 1));
    partes.push(bolinha(0.4, V(0, 0.85, 0), def.cores.folha, 0.65, 1));
    return { partes, copas };
  }
  if (def.forma === "cristal") {
    partes.push(volume(0.4, V(0, 0.08, 0), def.cores.casca, Math.floor(rng() * 1e6), 0.6, 0.35));
    for (let i = 0; i < 5; i++) {
      const dir = V(rng() - 0.5, rng() * 0.6 + 0.6, rng() - 0.5).normalize();
      partes.push(fragmento(V(0, 0.15, 0), dir, lerp(0.6, 1.1, rng()), 0.11, i === 0 ? (def.cores.folha2 ?? verde) : verde, 0, 0.8));
    }
    return { partes, copas };
  }
  if (def.forma === "cacto") {
    // Coluna curta e gorducha, sem braços.
    partes.push(...colunaCacto(V(0, 0, 0), 0.55, 0.15, verde));
    return { partes, copas };
  }
  if (def.forma === "bambu") {
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + rng() * 0.5, r = i === 0 ? 0 : 0.1, hh = h * lerp(0.7, 1.2, rng());
      const t = tronco({ altura: hh, r0: 0.03, r1: 0.022, curva: [Math.cos(a) * 0.08, Math.sin(a) * 0.08], hex: casca, segs: 4, aneis: true, rng });
      t.geo.translate(Math.cos(a) * r, 0, Math.sin(a) * r);
      partes.push(t.geo);
      for (let f = 0; f < 4; f++) {
        const b = rng() * 6.28;
        partes.push(lamina({ origem: V(Math.cos(a) * r, hh * lerp(0.4, 1, f / 3), Math.sin(a) * r), direcao: V(Math.cos(b), 0, Math.sin(b)), comprimento: 0.3, largura: 0.07, queda: 0.6, elevacao: 0.3, hex: verde, segs: 2 }));
      }
    }
    return { partes, copas };
  }
  if (PALMAS.includes(def.forma) || def.forma === "bananeira") {
    // Roseta de folhas saindo do chão (a palmeira ainda no coco), sem tronco.
    const palma = PALMAS.includes(def.forma);
    if (def.forma === "palmeira") partes.push(bolinha(0.22, V(0.12, 0.08, 0), RAMPAS.terra[1], 0.85, 1));
    else if (!palma) {
      const t = tronco({ altura: h * 0.35, r0: 0.09, r1: 0.07, hex: casca, segs: 2, aneis: true, rng });
      partes.push(t.geo);
    }
    const n = palma ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rng() * 0.4;
      partes.push(lamina({
        origem: V(0, palma ? 0.15 : h * 0.35, 0), direcao: V(Math.cos(a), 0, Math.sin(a)),
        comprimento: h * lerp(0.7, 0.9, rng()), largura: palma ? 0.16 : 0.3,
        queda: 0.6, elevacao: lerp(1.05, 1.3, rng()), hex: i % 2 ? (def.cores.folha2 ?? verde) : verde, segs: 4,
      }));
    }
    return { partes, copas };
  }
  if (CONIFERAS.includes(def.forma)) {
    // Mini-conífera: três andares de agulhas desde o chão.
    partes.push(galho(V(0, 0, 0), V(0, h * 0.25, 0), 0.035, 0.03, casca));
    const larg = def.forma === "colunar" ? 0.7 : 1;
    for (let i = 0; i < 3; i++) {
      const u = i / 3;
      partes.push(camadaConica(h * 0.32 * larg * (1 - u * 0.6), h * 0.42, h * (0.08 + u * 0.5), verde, rng, 10));
    }
    return { partes, copas };
  }
  if (def.forma === "moita") {
    // Tufo baixo e solto.
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + rng(), r = h * lerp(0.28, 0.36, rng());
      const c = V(Math.cos(a) * h * 0.2, r * 0.8, Math.sin(a) * h * 0.2);
      copas.push({ c, r });
      partes.push(volume(r, c, i === 1 ? def.cores.folha2 : verde, Math.floor(rng() * 1e6), 0.75, 0.3));
    }
    return { partes, copas };
  }

  // Folhosas: caule fino (levemente torto) com folhas alternadas, preso a uma estaca.
  const meio = V((rng() - 0.5) * 0.12, h * 0.5, (rng() - 0.5) * 0.12);
  const topo = V(0, h, 0);
  partes.push(galho(V(0, 0, 0), meio, 0.035, 0.026, casca), galho(meio, topo, 0.026, 0.015, casca));
  const estreita = def.forma === "pendente";
  const n = 6;
  for (let i = 0; i < n; i++) {
    const u = lerp(0.3, 0.92, i / (n - 1));
    const origem = u < 0.5 ? V(0, 0, 0).lerp(meio, u / 0.5) : meio.clone().lerp(topo, (u - 0.5) / 0.5);
    const a = i * 2.4 + rng() * 0.3; // filotaxia: cada folha gira ~137°
    partes.push(lamina({
      origem, direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: h * lerp(0.3, 0.38, rng()) * (1.15 - u * 0.4) * (estreita ? 1.3 : 1),
      largura: h * (estreita ? 0.08 : 0.19), queda: estreita ? 1.2 : 0.5, elevacao: 0.45, hex: i % 2 ? def.cores.folha2 : verde, segs: 3,
    }));
  }
  const ponta = topo.clone().add(V(0, 0.03, 0));
  partes.push(volume(h * 0.08, ponta, verde, Math.floor(rng() * 1e6), 0.9, 0.2));
  copas.push({ c: ponta, r: h * 0.1 });
  // Estaca de madeira clara com um laço vermelho (cuidado de jardineiro).
  partes.push(galho(V(0.17, -0.1, 0), V(0.17, h * 0.72, 0), 0.026, 0.022, RAMPAS.terra[4]));
  partes.push(galho(V(0.17, h * 0.5, 0), meio.clone().lerp(V(0, h * 0.5, 0), 0.5), 0.018, 0.018, RAMPAS.vermelho[1]));
  return { partes, copas };
}

/** Forma usada em cada estágio (algumas espécies mudam de arquitetura ao crescer). */
function formaDoEstagio(def, estagio) {
  if (estagio < 3 && def.formaJovem) return def.formaJovem; // ex.: araucária jovem é cônica
  return def.forma;
}

/** Enfeites usam a superfície real ou os pontos próprios da arquitetura. */
function salpicar(partes, copas, extras, rng, registros) {
  for (const extra of extras) {
    const pontos = distribuirEnfeites(partes, copas, extra, rng);
    for (const ponto of pontos) {
      const { centro, apoio, tamanho } = ponto;
      const cor = extra.cores ? extra.cores[Math.floor(rng() * extra.cores.length)] : extra.cor;
      // Pedúnculo curto: fruto pendente ligado à folhagem, nunca uma esfera solta.
      if (ponto.haste) {
        partes.push(galho(copas[ponto.suporte].c, ponto.haste[0], tamanho * .14, tamanho * .12, RAMPAS.terra[2]));
        partes.push(galho(...ponto.haste, tamanho * .14, tamanho * .1, RAMPAS.terra[2]));
      }
      if (extra.tipo === "fruto") partes.push(galho(apoio, centro, tamanho * .09, tamanho * .06, RAMPAS.terra[2]));
      partes.push(bolinha(tamanho, centro, cor, extra.achatar ?? 1, 1));
      registros.push({ ...ponto, tipo: extra.tipo ?? "flor", cor, disposicao: extra.disposicao ?? "copa" });
    }
  }
}

/** Tapete de pétalas caídas sob a copa (ipês, jacarandá, cerejeira). */
function tapete(def, H, rng) {
  const partes = [];
  const R = H * 0.36 * (def.largura ?? 1);
  for (let i = 0; i < 34; i++) {
    const a = rng() * 6.28, r = R * Math.sqrt(lerp(0.08, 1, rng()));
    partes.push(bolinha(lerp(0.12, 0.2, rng()), V(Math.cos(a) * r, 0.02, Math.sin(a) * r), i % 3 ? def.flor.cor : def.cores.folha, 0.12, 0));
  }
  return partes;
}

/**
 * Frutos (ou flores) colados no tronco, como na jabuticabeira (cauliflora).
 * Segue altura, curva e afunilamento registrados pelo tronco gerado.
 */
function noTronco(partes, cor, n, raio, rng, registros, tipo) {
  const t = partes.find(g => g.userData.tronco)?.userData.tronco;
  if (!t) throw Error("Frutos no tronco sem eixo de apoio");
  const resultado = [];
  for (let i = 0; i < n; i++) {
    const u = lerp(.15, .8, rng()), a = i * 2.39996 + rng() * .35;
    const r = lerp(t.r0, t.r1, u), tamanho = raio * lerp(.85, 1.15, rng());
    const eixo = V(t.curva[0] * u * u, u * t.altura, t.curva[1] * u * u);
    const apoio = eixo.clone().add(V(Math.cos(a) * r, 0, Math.sin(a) * r));
    const centro = apoio.clone().add(V(Math.cos(a) * tamanho * .55, 0, Math.sin(a) * tamanho * .55));
    resultado.push(bolinha(tamanho, centro, cor, 1, 1));
    registros.push({ centro, apoio, tamanho, tipo, cor, disposicao: "tronco", suporte: 0 });
  }
  return resultado;
}


/**
 * Constrói os 4 estágios de uma variação. Devolve { estagios: [geo×4], alturas: [m×4] }.
 * Mesma semente ⇒ mesma variação (o mundo é reprodutível).
 */
export function construirVariacao(def, semente) {
  // Preserva o gerador próprio aprovado pelo Claude.
  if (def.gerador === "pitanga") return construirPitanga(semente, def);
  // Geradores próprios do bosque de Pediatria aprovados pelo usuário.
  const PROPRIOS = { catavento: criarCatavento, paineiraAbracos: criarPaineiraAbracos, salgueiroCancoes: criarSalgueiroCancoes, araucariaCometas: criarAraucariaCometas, manguePontes: criarManguePontes, jabuticabeiraConstelacoes: criarJabuticabeiraConstelacoes, arvoreNinhos: criarArvoreNinhos, arvoreSegredos: criarArvoreSegredos };
  validarEspecie(def, [...Object.keys(FORMAS), ...Object.keys(PROPRIOS)]);
  // Arquiteturas próprias aprovadas: nenhum enfeite ou broto genérico é aplicado.
  if (PROPRIOS[def.forma]) {
    const { estagios } = PROPRIOS[def.forma](semente, juntar);
    const alturas = estagios.map((geo, e) => {
      geo.userData.arvore = { ...geo.userData.proposta, especie: def.nome, fase: FASES[e], ornamentos: [], copas: [] };
      return geo.boundingBox.max.y;
    });
    return { estagios, alturas, alturaAdulta: alturas[3] };
  }
  const rngAltura = criarRng(semente);
  const H = lerp(def.altura[0], def.altura[1], rngAltura());
  const estagios = [];
  const alturas = [];
  for (let e = 0; e < 4; e++) {
    const rng = criarRng(semente * 7 + e * 101);
    const rngExtra = criarRng(semente * 13 + 5 + e);
    const fase = FASES[e];
    const defE = {
      ...def, fase, cores: coresDaFase(def, fase),
      // Jovem: tronco esguio de "vara"; a grossura vem com a idade.
      grossura: (def.grossura ?? 1) * (fase === "jovem" ? 0.6 : 1),
      largura: fase === "jovem" ? def.larguraJovem ?? def.largura : def.largura,
    };
    let partes;
    const ornamentos = [];
    if (e === 0) partes = broto(defE, rng);
    else if (e === 1) partes = muda(defE, H, rng).partes;
    else {
      const forma = formaDoEstagio(def, e);
      const h = H * (def.arbusto ? (e === 2 ? 0.75 : 1) : e === 2 ? 0.55 : 1);
      const r = FORMAS[forma](defE, h, e === 2 ? 0.5 : 1, rng);
      partes = r.partes;
      if (e === 2) {
        // Jovem: primeira florada. Frutíferas florescem antes de frutificar.
        const extras = [];
        if (def.flor) extras.push({ ...def.flor, quantidade: Math.round(def.flor.quantidade * 0.35) });
        else if (def.fruto?.quantidade && def.floracao !== null)
          extras.push({ cor: def.floracao ?? RAMPAS.betula[0], raio: def.fruto.raio * 0.75, quantidade: Math.round(def.fruto.quantidade * 0.8), achatar: 0.6 });
        salpicar(partes, r.copas, extras, rngExtra, ornamentos);
        if (def.noTronco) partes.push(...noTronco(partes, RAMPAS.betula[0], Math.round(def.noTronco * 0.6), def.fruto.raio * 0.8, rngExtra, ornamentos, "flor"));
      } else {
        if (def.noTronco) partes.push(...noTronco(partes, def.fruto.cor, def.noTronco, def.fruto.raio, rngExtra, ornamentos, "fruto"));
        salpicar(partes, r.copas, [def.flor && { ...def.flor, tipo: "flor" }, def.fruto && { ...def.fruto, tipo: "fruto" }].filter(Boolean), rngExtra, ornamentos);
        if (RAIZ[forma] && !def.arbusto) partes.push(...raizes(H * RAIZ[forma] * (def.grossura ?? 1), def.cores.casca, rng));
        if (def.tapete && def.flor) partes.push(...tapete(def, H, rngExtra));
      }
    }
    const geo = juntar(partes);
    geo.userData.arvore = { especie: def.nome, fase, ornamentos, copas: partes.filter(g => g.userData.copa).map(g => g.userData.copa) };
    if (e === 0) geo.scale(1.8, 1.8, 1.8), geo.computeBoundingBox(); // exagero de jogo: o broto precisa ser visto
    estagios.push(geo);
    alturas.push(geo.boundingBox.max.y);
  }
  // O exagero de 1,8× do broto não pode fazê-lo superar a própria muda.
  // Ajuste uniforme preserva a anatomia e não altera os modelos aprovados próprios.
  if (alturas[0] >= alturas[1]) {
    estagios[0].scale(alturas[1] * .82 / alturas[0], alturas[1] * .82 / alturas[0], alturas[1] * .82 / alturas[0]);
    estagios[0].computeBoundingBox(); estagios[0].computeBoundingSphere();
    alturas[0] = estagios[0].boundingBox.max.y;
  }
  return { estagios, alturas, alturaAdulta: alturas[3] };
}
