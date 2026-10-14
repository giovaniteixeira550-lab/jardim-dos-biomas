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

const lerp = (a, b, t) => a + (b - a) * t;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

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
  let o = 0;
  for (const g of partes) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) cor.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3));
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
  const fatores = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = r(x * 1.7 + z * 0.8 + 3, y * 1.7 + z * 1.2 + 7, 2);
    const k = raio * (1 - irregular / 2 + n * irregular);
    p.setXYZ(i, c.x + x * k, c.y + y * k * achatar, c.z + z * k);
    fatores[i] = 0.84 + n * 0.24 + y * 0.07;
  }
  let idx = 0;
  pintar(g, hex, () => fatores[idx++]);
  g.computeVertexNormals();
  return g.toNonIndexed();
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
  return { geo: g.toNonIndexed(), topo: V(curva[0], altura, curva[1]) };
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

/** Ponto na superfície de uma copa (para frutos/flores), preferindo topo e frente. */
function pontoNaCopa(copas, rng) {
  const c = copas[Math.floor(rng() * copas.length)];
  const d = V(rng() - 0.5, rng() * 0.9 - 0.15, rng() - 0.5).normalize();
  return c.c.clone().addScaledVector(d, c.r * 0.92);
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
    const R = H * 0.33 * (def.largura ?? 1);
    const centro = V(t.topo.x, H * 0.64, t.topo.z);
    const k = Math.round(lerp(2, 9, d));
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
    const t = tronco({ altura: H * 0.72, r0: H * 0.03 * (def.grossura ?? 1), r1: H * 0.012, curva: [(rng() - 0.5) * H * 0.05, (rng() - 0.5) * H * 0.05], hex: casca, marcas: def.marcas, rng });
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
    const t = tronco({ altura: H * 0.3, r0: H * 0.035, r1: H * 0.02, hex: def.cores.casca, rng });
    const partes = [t.geo];
    const camadas = Math.round(lerp(2, 6, d));
    const base = H * 0.14, raio = H * 0.27 * (def.largura ?? 1);
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
    const r = FORMAS.redonda({ ...def, largura: (def.largura ?? 1) * 1.05 }, H, d, rng);
    const nLam = Math.round(lerp(6, 46, d));
    for (let i = 0; i < nLam; i++) {
      const c = r.copas[Math.floor(rng() * r.copas.length)];
      const a = rng() * 6.28;
      const dir = V(Math.cos(a), 0, Math.sin(a));
      const origem = c.c.clone().addScaledVector(dir, c.r * 0.85).add(V(0, -c.r * 0.1, 0));
      const comp = H * lerp(0.25, 0.42, rng());
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
    const curva = [(rng() - 0.5) * H * 0.25, (rng() - 0.5) * H * 0.25];
    const t = tronco({ altura: H * 0.88, r0: H * 0.03, r1: H * 0.022, curva, hex: def.cores.casca, segs: 14, aneis: true, rng });
    const partes = [t.geo];
    const n = Math.round(lerp(4, 10, d));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rng() * 0.3;
      partes.push(lamina({
        origem: t.topo, direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: H * lerp(0.28, 0.4, rng()),
        largura: H * 0.08, queda: 0.9, elevacao: lerp(0.35, 0.7, rng()), hex: def.cores.folha,
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
    const pe = new THREE.CylinderGeometry(H * 0.1, H * 0.15, H * 0.62, 8, 2);
    pe.translate(0, H * 0.31, 0);
    pintar(pe, def.cores.casca, (x, y) => 0.85 + (y / H) * 0.2);
    const R = H * 0.42;
    const chapeu = new THREE.SphereGeometry(R, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    chapeu.scale(1, 0.62, 1);
    chapeu.translate(0, H * 0.58, 0);
    pintar(chapeu, def.cores.folha, (x, y) => 0.88 + ((y - H * 0.58) / R) * 0.25);
    const lamelas = new THREE.CircleGeometry(R * 0.98, 14);
    lamelas.rotateX(Math.PI / 2);
    lamelas.translate(0, H * 0.585, 0);
    pintar(lamelas, def.cores.lamela ?? def.cores.casca, () => 0.6);
    const partes = [finalizar(pe), finalizar(chapeu), finalizar(lamelas)];
    const pintas = Math.round(lerp(2, 12, d));
    for (let i = 0; i < pintas; i++) {
      const a = rng() * 6.28, el = lerp(0.25, 1.2, rng());
      const c = V(Math.cos(a) * Math.cos(el) * R, H * 0.58 + Math.sin(el) * R * 0.62, Math.sin(a) * Math.cos(el) * R);
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
    const n = Math.round(lerp(3, 8, d));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rng() * 0.4;
      partes.push(lamina({
        origem: t.topo, direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: H * lerp(0.4, 0.55, rng()),
        largura: H * 0.17, queda: 1.1, elevacao: lerp(0.7, 1.1, rng()), hex: i % 3 === 0 ? (def.cores.folha2 ?? def.cores.folha) : def.cores.folha, segs: 5,
      }));
    }
    if (d > 0.99) {
      // Cacho: pencas de bananas em espiral, pendendo de um lado, e o "coração" na ponta.
      const lado = V(Math.cos(rng() * 6.28), 0, Math.sin(rng() * 6.28));
      const base = t.topo.clone().addScaledVector(lado, H * 0.08).add(V(0, -H * 0.05, 0));
      for (let i = 0; i < 14; i++) {
        const u = i / 14, a = u * 6.28 * 2;
        const c = base.clone().add(V(Math.cos(a) * H * 0.04, -u * H * 0.16, Math.sin(a) * H * 0.04));
        partes.push(bolinha(H * 0.03, c, def.fruto.cor, 1.8, 0));
      }
      partes.push(bolinha(H * 0.035, base.clone().add(V(0, -H * 0.2, 0)), def.cores.coracao, 1.6, 1));
    }
    return { partes, copas: [] };
  },

  /** Baobá: tronco em garrafa (bojudo no meio), galhos curtos no topo com copinhas achatadas. */
  garrafa(def, H, d, rng) {
    const perfil = [];
    const th = H * 0.72, rMax = H * 0.14 * (def.grossura ?? 1);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      perfil.push(new THREE.Vector2(rMax * (0.75 + 0.35 * Math.sin(Math.PI * Math.min(1, t * 1.1)) - t * 0.35), t * th));
    }
    const g = new THREE.LatheGeometry(perfil, 10);
    pintar(g, def.cores.casca, (x, y) => 0.82 + (y / th) * 0.2);
    const partes = [finalizar(g)];
    const topo = V(0, th, 0);
    const n = Math.round(lerp(3, 7, d));
    const copas = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rng() * 0.5;
      const L = H * lerp(0.18, 0.3, rng());
      const ponta = V(Math.cos(a) * L, th + H * lerp(0.08, 0.18, rng()), Math.sin(a) * L);
      partes.push(galho(topo.clone().add(V(0, -H * 0.03, 0)), ponta, H * 0.03, H * 0.012, def.cores.casca));
      const r = H * lerp(0.08, 0.11, rng());
      copas.push({ c: ponta.clone().add(V(0, r * 0.3, 0)), r });
      partes.push(volume(r, ponta.clone().add(V(0, r * 0.3, 0)), corDaCopa(def, rng), Math.floor(rng() * 1e6), 0.5, 0.35));
    }
    return { partes, copas };
  },

  /** Bambuzal: touceira de colmos com nós (anéis) e tufos de folhas finas no alto. */
  bambu(def, H, d, rng) {
    const partes = [];
    const n = Math.round(lerp(3, 11, d));
    for (let i = 0; i < n; i++) {
      const a = rng() * 6.28, dist = Math.sqrt(rng()) * H * 0.08;
      const h = H * lerp(0.7, 1, rng());
      const incl = [Math.cos(a) * h * 0.12, Math.sin(a) * h * 0.12];
      const t = tronco({ altura: h, r0: H * 0.016, r1: H * 0.013, curva: incl, hex: def.cores.casca, segs: 9, aneis: true, rng });
      t.geo.translate(Math.cos(a) * dist, 0, Math.sin(a) * dist);
      partes.push(t.geo);
      const tufos = 3;
      for (let k = 0; k < tufos; k++) {
        const u = lerp(0.55, 1, k / (tufos - 1));
        const origem = V(Math.cos(a) * dist + incl[0] * u * u, h * u, Math.sin(a) * dist + incl[1] * u * u);
        for (let f = 0; f < 3; f++) {
          const b = rng() * 6.28;
          partes.push(lamina({ origem, direcao: V(Math.cos(b), 0, Math.sin(b)), comprimento: H * 0.1, largura: H * 0.025, queda: 0.8, elevacao: 0.3, hex: def.cores.folha, segs: 3 }));
        }
      }
    }
    return { partes, copas: [] };
  },

  /** Árvore-de-cristal (fantasia): tronco de pedra e copa de cristais apontando para fora. */
  cristal(def, H, d, rng) {
    const t = tronco({ altura: H * 0.4, r0: H * 0.06, r1: H * 0.035, curva: [(rng() - 0.5) * H * 0.08, (rng() - 0.5) * H * 0.08], hex: def.cores.casca, rng });
    const partes = [t.geo];
    const centro = t.topo.clone().add(V(0, H * 0.22, 0));
    partes.push(galho(t.topo, centro, H * 0.035, H * 0.025, def.cores.casca));
    const n = Math.round(lerp(4, 16, d));
    for (let i = 0; i < n; i++) {
      const dir = V(rng() - 0.5, rng() * 0.9 + 0.1, rng() - 0.5).normalize();
      const comp = H * lerp(0.26, 0.42, rng());
      const g = new THREE.OctahedronGeometry(1, 0);
      g.scale(H * 0.07, comp / 2, H * 0.07);
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
// Estágios
// ---------------------------------------------------------------------------

/** Broto: caule fino com 2–3 folhinhas (ou um conezinho, para coníferas). */
function broto(def, rng) {
  const partes = [];
  const verde = def.cores.broto ?? def.cores.folha;
  if (def.forma === "cogumelo") {
    // Botão fechado: o chapéu ainda envolve o pé, sem disco nem pintas.
    return [bolinha(0.22, V(0, 0.24, 0), def.cores.casca, 1.25)];
  }
  if (["conica", "colunar", "araucaria"].includes(def.forma)) {
    partes.push(galho(V(0, 0, 0), V(0, 0.2, 0), 0.03, 0.025, def.cores.casca));
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      partes.push(lamina({ origem: V(0, 0.2, 0), direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: 0.24, largura: 0.05, queda: 0.05, elevacao: 0.55, hex: verde }));
    }
    return partes;
  }
  if (def.forma === "cristal") {
    partes.push(galho(V(0, 0, 0), V(0, 0.15, 0), 0.035, 0.03, def.cores.casca));
    const g = new THREE.OctahedronGeometry(1, 0);
    g.scale(0.08, 0.22, 0.08);
    g.translate(0, 0.3, 0);
    pintar(g, def.cores.folha);
    g.computeVertexNormals();
    partes.push(finalizar(g));
    return partes;
  }
  if (def.forma === "bambu") {
    for (let i = 0; i < 3; i++) {
      const a = rng() * 6.28;
      partes.push(galho(V(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05), V(Math.cos(a) * 0.08, 0.35 + rng() * 0.2, Math.sin(a) * 0.08), 0.02, 0.012, def.cores.casca));
    }
    return partes;
  }
  if (def.forma === "palmeira" || def.forma === "bananeira") {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 6.28;
      partes.push(lamina({ origem: V(0, 0.05, 0), direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: 0.5, largura: 0.12, queda: 0.4, elevacao: 0.9, hex: verde }));
    }
    return partes;
  }
  const alt = def.forma === "moita" ? 0.22 : 0.42;
  partes.push(galho(V(0, 0, 0), V(0, alt, 0), 0.025, 0.018, def.cores.casca));
  const n = 2;
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI + 0.35;
    partes.push(lamina({ origem: V(0, alt * 0.8, 0), direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: 0.3, largura: 0.18, queda: 0.08, elevacao: 0.28, hex: verde }));
  }
  return partes;
}

/** Raízes aparentes: um novo sistema de sustentação, exclusivo da adulta. */
function raizes(def, H, rng) {
  const partes = [], n = def.forma === "palmeira" ? 5 : 6;
  const raio = H * (def.forma === "palmeira" ? 0.07 : 0.13) * (def.grossura ?? 1);
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI * 2 / n + rng() * 0.15;
    partes.push(galho(V(0, H * 0.065, 0), V(Math.cos(a) * raio, H * 0.005, Math.sin(a) * raio), H * 0.035, H * 0.009, def.cores.casca));
  }
  return partes;
}

/** Caule, folhas e poucos ramos; nenhuma copa adulta em miniatura. */
function mudaFolhosa(def, H, rng) {
  const partes = [], verde = def.cores.broto ?? def.cores.folha;
  const curva = H * 0.1;
  const t = tronco({ altura: H * 0.92, r0: H * 0.025, r1: H * 0.01, curva: [curva, 0], hex: def.cores.casca, rng });
  partes.push(t.geo);
  for (let i = 0; i < 4; i++) {
    const a = i * 2.4, y = H * (0.3 + i * 0.16);
    const ponta = V(Math.cos(a) * H * 0.18 + curva * (y / H) ** 2, y + H * 0.12, Math.sin(a) * H * 0.18);
    partes.push(galho(V(curva * (y / H) ** 2, y, 0), ponta, H * 0.013, H * 0.005, def.cores.casca));
    partes.push(lamina({ origem: ponta, direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: H * 0.27, largura: H * 0.16, queda: 0.1, elevacao: 0.25, hex: verde }));
  }
  return { partes, copas: [] };
}

/** Jovem: bifurcações expostas, copa descontínua e assimétrica. */
function jovemFolhosa(def, H, rng) {
  const partes = [], copas = [], oval = def.forma === "oval";
  const t = tronco({ altura: H * 0.52, r0: H * 0.032, r1: H * 0.019, curva: [H * 0.04, 0], hex: def.cores.casca, marcas: def.marcas, rng });
  partes.push(t.geo);
  const n = oval ? 4 : 5;
  for (let i = 0; i < n; i++) {
    const a = i * 2.4 + rng() * 0.2;
    const larg = H * (oval ? 0.17 : 0.3) * (def.largura ?? 1);
    const base = t.topo.clone().setY(H * (0.36 + i * 0.025));
    const cotovelo = V(Math.cos(a) * larg * 0.65, H * (0.58 + i * 0.03), Math.sin(a) * larg * 0.65);
    const ponta = V(Math.cos(a) * larg, H * (0.7 + i * 0.045), Math.sin(a) * larg);
    partes.push(galho(base, cotovelo, H * 0.02, H * 0.012, def.cores.casca));
    partes.push(galho(cotovelo, ponta, H * 0.012, H * 0.007, def.cores.casca));
    const r = H * (oval ? 0.13 : 0.17);
    copas.push({ c: ponta, r });
    partes.push(volume(r, ponta, corDaCopa(def, rng), Math.floor(rng() * 1e6), 0.75));
    if (def.forma === "pendente") {
      partes.push(lamina({ origem: ponta, direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: H * 0.16, largura: H * 0.035, queda: 1.1, elevacao: -0.45, hex: def.cores.folha }));
    }
  }
  // Botões discretos anunciam a transformação, sem antecipar a floração adulta.
  if (def.flor) for (let i = 0; i < 3; i++) {
    partes.push(bolinha(H * 0.02, copas[i].c.clone().add(V(0, copas[i].r * 0.6, 0)), def.flor.cor));
  }
  return { partes, copas };
}

/** Cada família muda de organização, não só de dimensão. */
function construirJuvenil(def, H, estagio, rng) {
  const jovem = estagio === 2;
  if (def.forma === "garrafa") {
    if (!jovem) return mudaFolhosa(def, H, rng);
    // O bojo começa a surgir, mas ainda não é a garrafa larga da adulta.
    return FORMAS.garrafa({ ...def, grossura: (def.grossura ?? 1) * 0.4 }, H, 0.2, rng);
  }
  if (def.forma === "bananeira") {
    const t = tronco({ altura: H * (jovem ? 0.55 : 0.15), r0: H * 0.055, r1: H * 0.035, hex: def.cores.casca, rng });
    const partes = [t.geo], n = jovem ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n;
      partes.push(lamina({ origem:t.topo, direcao:V(Math.cos(a),0,Math.sin(a)), comprimento:H*0.65, largura:H*(jovem?0.16:0.22), queda:jovem?0.35:0.02, elevacao:jovem?0.8:1.15, hex:def.cores.folha }));
    }
    return { partes, copas:[] };
  }
  if (def.forma === "bambu") {
    const partes = [], n = jovem ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const x = (i - (n-1)/2)*H*0.09;
      const t = tronco({ altura:H*(1-i*0.1), r0:H*0.025, r1:H*0.017, hex:def.cores.casca, segs:6, aneis:true, rng });
      t.geo.translate(x,0,0); partes.push(t.geo);
      for(let j=0;j<(jovem?4:2);j++) {
        const a=j*2.4+i, origem=V(x,H*(0.6+j*0.09),0);
        partes.push(lamina({ origem,direcao:V(Math.cos(a),0,Math.sin(a)),comprimento:H*0.2,largura:H*0.045,queda:0.25,elevacao:0.3,hex:def.cores.folha }));
      }
    }
    return {partes,copas:[]};
  }
  if (def.forma === "cristal") {
    const partes = [], n = 3, base = jovem ? H*0.45 : H*0.08;
    partes.push(galho(V(0,0,0),V(0,base,0),H*0.06,H*0.03,def.cores.casca));
    for(let i=0;i<n;i++) {
      const a=i*Math.PI*2/n, dir=V(Math.cos(a)*0.6,1,Math.sin(a)*0.6).normalize();
      const ponta=V(Math.cos(a)*H*(jovem?0.2:0.05),H*(jovem?0.75:0.45),Math.sin(a)*H*(jovem?0.2:0.05));
      if(jovem)partes.push(galho(V(0,base,0),ponta,H*0.025,H*0.012,def.cores.casca));
      const g=new THREE.OctahedronGeometry(1,0);
      g.scale(H*(jovem?0.07:0.12),H*(jovem?0.18:0.35),H*(jovem?0.07:0.12));
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),dir));
      g.translate(ponta.x,ponta.y,ponta.z); pintar(g,i===0?(def.cores.folha2??def.cores.folha):def.cores.folha);
      g.computeVertexNormals(); partes.push(finalizar(g));
    }
    return {partes,copas:[]};
  }
  if (["redonda", "oval", "pendente", "guarda-chuva"].includes(def.forma)) {
    return jovem ? jovemFolhosa(def, H, rng) : mudaFolhosa(def, H, rng);
  }
  if (["conica", "colunar", "araucaria"].includes(def.forma)) {
    const partes = [], copas = [];
    const t = tronco({ altura: H * 0.95, r0: H * 0.025, r1: H * 0.008, hex: def.cores.casca, rng });
    partes.push(t.geo);
    const andares = jovem ? 3 : 2, n = jovem ? 5 : 3;
    for (let j = 0; j < andares; j++) {
      const y = H * (0.32 + j * 0.21);
      const L = H * (jovem ? 0.28 : 0.24) * (1 - j * 0.18);
      for (let i = 0; i < n; i++) {
        const a = i * Math.PI * 2 / n + j * 0.65;
        const ponta = V(Math.cos(a) * L, y + H * 0.05, Math.sin(a) * L);
        partes.push(galho(V(0, y, 0), ponta, H * 0.013, H * 0.004, def.cores.casca));
        if (jovem) partes.push(volume(H * 0.065, ponta, def.cores.folha, Math.floor(rng() * 1e6), 0.45));
        else partes.push(lamina({ origem: ponta, direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: H * 0.15, largura: H * 0.06, queda: 0.03, elevacao: 0.7, hex: def.cores.folha }));
      }
    }
    partes.push(camadaConica(H * 0.07, H * 0.18, H * 0.88, def.cores.folha, rng, 8));
    return { partes, copas };
  }
  if (def.forma === "palmeira") {
    const th = H * (jovem ? 0.55 : 0.13);
    const t = tronco({ altura: th, r0: H * 0.045, r1: H * 0.028, hex: def.cores.casca, aneis: jovem, rng });
    const partes = [t.geo], n = jovem ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n;
      partes.push(lamina({ origem: t.topo, direcao: V(Math.cos(a), 0, Math.sin(a)), comprimento: H * (jovem ? 0.52 : 0.8), largura: H * (jovem ? 0.1 : 0.17), queda: jovem ? 0.38 : 0.06, elevacao: jovem ? 0.62 : 1.0, hex: def.cores.folha }));
    }
    return { partes, copas: [] };
  }
  if (def.forma === "cogumelo") {
    if (!jovem) return { partes: [galho(V(0, 0, 0), V(0, H * 0.65, 0), H * 0.1, H * 0.08, def.cores.casca), bolinha(H * 0.25, V(0, H * 0.7, 0), def.cores.folha, 1.1)], copas: [] };
    const r = FORMAS.cogumelo(def, H, 0.25, rng);
    // Chapéu começa a abrir; adulta ganha anel e cogumelos acompanhantes.
    return r;
  }
  // Arbusto: caule único → dois eixos abertos → moita ramificada.
  if (!jovem) return mudaFolhosa(def, H, rng);
  const r = jovemFolhosa({ ...def, largura: 0.7 }, H, rng);
  return r;
}

/** Forma usada em cada estágio (algumas espécies mudam de arquitetura ao crescer). */
function formaDoEstagio(def, estagio) {
  if (estagio < 3 && def.formaJovem) return def.formaJovem; // ex.: araucária jovem é cônica
  return def.forma;
}

/**
 * Constrói os 4 estágios de uma variação. Devolve { estagios: [geo×4], alturas: [m×4] }.
 * Mesma semente ⇒ mesma variação (o mundo é reprodutível).
 */
export function construirVariacao(def, semente) {
  const rngAltura = criarRng(semente);
  const H = lerp(def.altura[0], def.altura[1], rngAltura());
  const estagios = [];
  const alturas = [];
  const ALTURA_ESTAGIO = [null, 0.24, 0.58, 1];
  const DETALHE = [0, 0.15, 0.5, 1];
  for (let e = 0; e < 4; e++) {
    const rng = criarRng(semente * 7 + e * 101);
    // Floríferas são verdes enquanto jovens e só ganham a cor ao amadurecer.
    const c = def.cores;
    const defE = e < 3 && c.folhaJovem ? { ...def, cores: { ...c, folha: c.folhaJovem, folha2: c.folhaJovem2 ?? c.folhaJovem } } : def;
    let partes;
    if (e === 0) partes = broto(defE, rng);
    else {
      // Arbustos formam uma moita baixa e larga; a jovem precisa caber abaixo
      // dessa copa adulta, mesmo usando ramos abertos e mais verticais.
      const fracao = def.forma === "moita" ? (e === 1 ? 0.32 : e === 2 ? 0.42 : 1) : ALTURA_ESTAGIO[e];
      const h = H * fracao;
      const r = e < 3 ? construirJuvenil(defE, h, e, rng) : FORMAS[formaDoEstagio(def, e)](defE, h, DETALHE[e], rng);
      partes = r.partes;
      if (e === 3 && !["cogumelo", "moita"].includes(def.forma)) partes.push(...raizes(defE, h, rng));
      if (e === 3 && def.forma === "moita") {
        for (let i = 0; i < 5; i++) {
          const a = i * Math.PI * 2 / 5;
          partes.push(galho(V(0, 0, 0), V(Math.cos(a) * h * 0.24, h * 0.55, Math.sin(a) * h * 0.24), h * 0.026, h * 0.01, def.cores.casca));
        }
      }
      if (e === 3 && def.forma === "cogumelo") {
        const anel = new THREE.TorusGeometry(h * 0.13, h * 0.025, 4, 12);
        anel.rotateX(Math.PI / 2);
        anel.translate(0, h * 0.34, 0);
        pintar(anel, def.cores.lamela);
        partes.push(finalizar(anel));
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI * 2 / 3;
          const pequenos = FORMAS.cogumelo(def, h * 0.2, 0.2, rng).partes;
          for (const g of pequenos) g.translate(Math.cos(a) * h * 0.35, 0, Math.sin(a) * h * 0.35);
          partes.push(...pequenos);
        }
      }
      // Adulta: flores e frutos sobre a copa.
      if (e === 3 && r.copas.length) {
        const rngExtra = criarRng(semente * 13 + 5);
        for (const extra of [def.flor, def.fruto].filter(Boolean))
          for (let i = 0; i < extra.quantidade; i++) {
            const tamanho = extra.raio * lerp(0.85, 1.15, rngExtra());
            partes.push(bolinha(tamanho, pontoNaCopa(r.copas, rngExtra), extra.cor, extra.achatar ?? 1, 1));
          }
      }
    }
    const geo = juntar(partes);
    estagios.push(geo);
    alturas.push(geo.boundingBox.max.y);
  }
  return { estagios, alturas, alturaAdulta: alturas[3] };
}
