/**
 * Pitanga-de-Sol — gerador ISOLADO (proposta para aprovação, fora do mapa).
 *
 * Inspirada na pitangueira (Eugenia uniflora): árvore baixa, ramificada desde
 * perto do chão, folhas opostas, brotações novas cor de cobre, flores brancas
 * de quatro pétalas com tufo de estames e frutos com sulcos longitudinais,
 * coroados pelas sépalas que ficam no fruto. Nesta espécie do jardim, os
 * frutos vão do amarelo quente ao vermelho e lembram pequenos sóis.
 *
 * Usa as peças do jogo — `juntar` (atributos de folhagem do estilo de copa),
 * `criarRng`/`criarRuido` (determinismo) e a paleta — sem alterar arquivos
 * compartilhados. Mesma semente ⇒ mesmos quatro modelos.
 * Unidades em metros; base do tronco em y = 0.
 */
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { juntar } from "../../src/arvoreProc.js";
import { criarRng, criarRuido } from "../../src/mundo.js";
import { RAMPAS } from "../../src/paleta.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const CIMA = V(0, 1, 0);

/** Cores da espécie — todas da paleta. */
export const CORES = Object.freeze({
  folha: RAMPAS.mata[3], folha2: RAMPAS.mata[2], folhaJovem: RAMPAS.mata[4], folhaBroto: RAMPAS.mata[5],
  cobre: RAMPAS.outono[1], cobreVivo: RAMPAS.vermelho[1], // brotações novas avermelhadas
  casca: RAMPAS.terra[2], cascaClara: RAMPAS.terra[3], cascaJovem: RAMPAS.terra[1],
  sepala: RAMPAS.mata[1], pedunculo: RAMPAS.mata[2],
  petala: RAMPAS.betula[0], estame: RAMPAS.luz[0], antera: RAMPAS.amarelo[2],
  // Maturação: amarelo quente → alaranjado → vermelho.
  frutos: [RAMPAS.amarelo[1], RAMPAS.outono[3], RAMPAS.outono[2], RAMPAS.vermelho[2], RAMPAS.vermelho[1]],
});
const PESO_FRUTOS = [1, 2, 2.4, 2, 1.2];

export const FASES = ["broto", "muda", "jovem", "adulta"];
export const ESPECIE = Object.freeze({
  nome: "Pitanga-de-Sol",
  altura: [4.0, 4.6], // adulta: baixa
  fruto: { raio: 0.17, sulcos: 8, quantidade: 34 },
  flor: { raio: 0.13, quantidade: 16 },
});

// ---------------------------------------------------------------------------
// Peças de geometria
// ---------------------------------------------------------------------------

function pintar(g, hex, fator) {
  const p = g.attributes.position, c = new THREE.Color(hex), arr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const k = fator ? fator(i, p.getX(i), p.getY(i), p.getZ(i)) : 1;
    arr.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Triângulos soltos (sem índice), como o gerador do jogo espera. */
const soltos = (g) => (g.index ? g.toNonIndexed() : g);

function semUV(g) {
  if (g.attributes.uv) g.deleteAttribute("uv");
  return g;
}

/**
 * Volume de folhagem com os mesmos atributos do gerador do jogo (banda, esfera,
 * raioCopa, semCopa): o shader compartilhado desenha luz e aglomerados de folhas.
 * Devolve também `raioEm(d)`: o raio real na direção d, para apoiar frutos e
 * flores na superfície verdadeira, não numa esfera aproximada.
 */
function volume(raio, c, hex, semente, achatar, irregular = 0.32) {
  let g = new THREE.IcosahedronGeometry(1, 2);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const ruido = criarRuido(semente);
  const fatorRaio = (x, y, z) => 1 - irregular / 2 + ruido(x * 1.7 + z * 0.8 + 3, y * 1.7 + z * 1.2 + 7, 2) * irregular;
  const p = g.attributes.position;
  const bandas = new Float32Array(p.count), esf = new Float32Array(p.count * 3), fat = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = raio * fatorRaio(x, y, z);
    p.setXYZ(i, c.x + x * k, c.y + y * k * achatar, c.z + z * k);
    bandas[i] = y;
    esf.set([x, y, z], i * 3);
    fat[i] = 0.95 + (fatorRaio(x, y, z) - 1 + irregular / 2) / irregular * 0.08;
  }
  pintar(g, hex, (i) => fat[i]);
  g.setAttribute("banda", new THREE.BufferAttribute(bandas, 1));
  g.setAttribute("esfera", new THREE.BufferAttribute(esf, 3));
  g.setAttribute("raioCopa", new THREE.BufferAttribute(new Float32Array(p.count).fill(raio), 1));
  g.setAttribute("semCopa", new THREE.BufferAttribute(new Float32Array(p.count).fill(((semente * 0.6180339) % 1 + 1) % 1), 1));
  g.computeVertexNormals();
  const geo = soltos(g);
  const copa = { centro: c.clone(), raio, achatar, cor: hex };
  // Raio real na direção unitária d (antes do achatamento).
  copa.raioEm = (d) => raio * fatorRaio(d.x, d.y, d.z);
  /** Distância normalizada de um ponto à superfície: < 1 dentro, > 1 fora. */
  copa.normalizada = (q) => {
    const d = q.clone().sub(c);
    d.y /= achatar;
    const len = d.length();
    return len < 1e-9 ? 0 : len / copa.raioEm(d.divideScalar(len));
  };
  geo.userData.copa = copa;
  return geo;
}

/**
 * Ramo curvo e afunilado ao longo de uma curva (galhos arqueados).
 * Casca lisa com placas mais claras: a pitangueira descasca em lâminas finas.
 */
function ramo(curva, r0, r1, hex, { segs = 12, lados = 6, placas = null, claro = CORES.cascaClara } = {}) {
  const frames = curva.computeFrenetFrames(segs, false);
  const pos = [], idx = [], k = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, c = curva.getPointAt(t), r = lerp(r0, r1, Math.pow(t, 0.8));
    for (let j = 0; j < lados; j++) {
      const a = (j / lados) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      const q = c.clone().addScaledVector(n, r);
      pos.push(q.x, q.y, q.z);
      k.push(placas && placas(q.x * 2.3, q.z * 2.3 + q.y * 3.1, 2) > 0.62 ? -1 : 0.86 + 0.14 * t);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < lados; j++) {
      const a = i * lados + j, b = i * lados + ((j + 1) % lados), c = a + lados, d = b + lados;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const base = new THREE.Color(hex), clara = new THREE.Color(claro), cor = new Float32Array(k.length * 3);
  k.forEach((f, i) => cor.set(f < 0 ? [clara.r, clara.g, clara.b] : [base.r * f, base.g * f, base.b * f], i * 3));
  g.setAttribute("color", new THREE.BufferAttribute(cor, 3));
  g.computeVertexNormals();
  const geo = soltos(g);
  geo.userData.ramo = { curva, r0, r1 };
  return geo;
}

const reto = (a, b) => new THREE.LineCurve3(a.clone(), b.clone());
const arco = (p0, p1, p2, p3) => new THREE.CubicBezierCurve3(p0, p1, p2, p3);

/** Folha simples, ovada e acuminada, com leve dobra na nervura central. */
function folha(origem, direcao, comp, larg, hex, queda = 0.25) {
  const dir = direcao.clone().normalize();
  let lado = dir.clone().cross(CIMA);
  if (lado.lengthSq() < 1e-6) lado = V(1, 0, 0);
  lado.normalize();
  const nor = lado.clone().cross(dir).normalize();
  const T = 5, S = [-1, -0.5, 0, 0.5, 1];
  const pos = [], idx = [];
  for (let i = 0; i <= T; i++) {
    const t = i / T, w = larg * 0.5 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.9);
    for (const s of S) {
      const q = origem.clone().addScaledVector(dir, t * comp).addScaledVector(lado, s * w)
        .addScaledVector(nor, (1 - Math.abs(s)) * w * 0.32 - queda * t * t * comp);
      pos.push(q.x, q.y, q.z);
    }
  }
  for (let i = 0; i < T; i++)
    for (let j = 0; j < S.length - 1; j++) {
      const a = i * S.length + j, b = a + 1, c = a + S.length, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  pintar(g, hex, (i) => (i % S.length === 2 ? 1.08 : 0.94)); // nervura clara
  g.computeVertexNormals();
  return soltos(g);
}

/** Par de folhas opostas num nó (filotaxia oposta, como nas mirtáceas). */
function parDeFolhas(no, azimute, comp, larg, hex, elevacao = 0.35, queda = 0.25) {
  return [0, Math.PI].map((s) => {
    const a = azimute + s;
    const dir = V(Math.cos(a) * Math.cos(elevacao), Math.sin(elevacao), Math.sin(a) * Math.cos(elevacao));
    return folha(no, dir, comp, larg, hex, queda);
  });
}

/**
 * Fruto com gomos: esfera achatada nos polos, `sulcos` reentrâncias
 * longitudinais, covinha do pedúnculo no topo e coroa de quatro sépalas no
 * polo oposto. Construído no eixo local (+y = pedúnculo) e depois orientado.
 */
export function geometriaFruto(raio, hex, sulcos = 8) {
  const LAT = 10, LON = sulcos * 4;
  const pos = [V(0, raio * 0.62, 0)], k = [0.85];
  for (let i = 1; i < LAT; i++) {
    const th = (i / LAT) * Math.PI, s = Math.sin(th);
    for (let j = 0; j < LON; j++) {
      const ph = (j / LON) * Math.PI * 2;
      const vale = Math.pow(0.5 + 0.5 * Math.cos(sulcos * ph), 4); // 1 no fundo do sulco
      const r = raio * (1 - 0.16 * vale * Math.pow(s, 0.6));
      let y = Math.cos(th) * raio * 0.8;
      if (th < 0.6) y -= raio * 0.1 * (1 - th / 0.6); // covinha do pedúnculo
      pos.push(V(Math.cos(ph) * s * r, y, Math.sin(ph) * s * r));
      k.push(lerp(1.06, 0.7, vale) * (0.94 + 0.1 * Math.cos(th)));
    }
  }
  pos.push(V(0, -raio * 0.7, 0));
  k.push(0.8);
  const idx = [], anel = (i, j) => 1 + (i - 1) * LON + (j % LON), sul = pos.length - 1;
  for (let j = 0; j < LON; j++) idx.push(0, anel(1, j + 1), anel(1, j));
  for (let i = 1; i < LAT - 1; i++)
    for (let j = 0; j < LON; j++) idx.push(anel(i, j), anel(i, j + 1), anel(i + 1, j), anel(i, j + 1), anel(i + 1, j + 1), anel(i + 1, j));
  for (let j = 0; j < LON; j++) idx.push(sul, anel(LAT - 1, j), anel(LAT - 1, j + 1));
  const g = new THREE.BufferGeometry().setFromPoints(pos);
  g.setIndex(idx);
  pintar(g, hex, (i) => k[i]);
  g.computeVertexNormals();
  const partes = [soltos(g)];
  // Coroa de sépalas: quatro pontas verdes abertas como uma estrelinha.
  for (let s = 0; s < 4; s++) {
    const a = (s / 4) * Math.PI * 2 + Math.PI / sulcos;
    const sep = new THREE.ConeGeometry(raio * 0.16, raio * 0.42, 3, 1);
    semUV(sep);
    sep.translate(0, raio * 0.21, 0);
    sep.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(CIMA, V(Math.cos(a), -0.55, Math.sin(a)).normalize()));
    sep.translate(0, -raio * 0.66, 0);
    pintar(sep, CORES.sepala);
    partes.push(soltos(sep));
  }
  return partes;
}

/** Flor: quatro pétalas brancas em concha e um pompom de estames com anteras. */
function geometriaFlor(raio) {
  const partes = [];
  for (let s = 0; s < 4; s++) {
    const a = (s / 4) * Math.PI * 2;
    const p = new THREE.CircleGeometry(raio * 0.5, 6);
    semUV(p);
    p.scale(1, 0.8, 1);
    p.rotateX(-Math.PI / 2 + 0.35); // pétala em concha, levemente erguida
    p.translate(0, 0, raio * 0.5);
    p.rotateY(a);
    pintar(p, CORES.petala, (i, x, y, z) => 0.94 + Math.hypot(x, z) / raio * 0.1);
    partes.push(soltos(p));
  }
  const tufo = new THREE.IcosahedronGeometry(raio * 0.36, 0);
  tufo.scale(1, 0.75, 1);
  tufo.translate(0, raio * 0.22, 0);
  pintar(tufo, CORES.estame);
  partes.push(soltos(tufo));
  for (let s = 0; s < 5; s++) {
    const a = s * 2.39996, an = new THREE.IcosahedronGeometry(raio * 0.09, 0);
    an.translate(Math.cos(a) * raio * 0.28, raio * 0.42, Math.sin(a) * raio * 0.28);
    pintar(an, CORES.antera);
    partes.push(soltos(an));
  }
  return partes;
}

/** Leva partes do espaço local (+y) para a posição e o eixo dados. */
function orientar(partes, centro, eixo, giro) {
  const q = new THREE.Quaternion().setFromUnitVectors(CIMA, eixo.clone().normalize());
  const qg = new THREE.Quaternion().setFromAxisAngle(CIMA, giro);
  for (const g of partes) {
    g.applyQuaternion(qg);
    g.applyQuaternion(q);
    g.translate(centro.x, centro.y, centro.z);
  }
  return partes;
}

function monte(raio) {
  const g = new THREE.IcosahedronGeometry(raio, 1);
  g.scale(1, 0.38, 1);
  g.translate(0, -raio * 0.12, 0);
  pintar(g, RAMPAS.terra[2], (i, x, y) => 0.92 + (y / raio) * 0.3);
  return soltos(g);
}

// ---------------------------------------------------------------------------
// Apoio de flores e frutos na anatomia
// ---------------------------------------------------------------------------

/** Amostras dos ramos para checar colisão e apoio. */
function amostrasDeRamos(ramos) {
  const pts = [];
  for (const r of ramos)
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push({ p: r.curva.getPointAt(t), r: lerp(r.r0, r.r1, Math.pow(t, 0.8)) });
    }
  return pts;
}

/**
 * Coloca enfeites (flores ou frutos) presos por pedúnculo:
 *  - "copa": nasce dentro da superfície real de um volume, na metade de baixo/lateral,
 *    voltado para fora do eixo da árvore;
 *  - "ramo": nasce num trecho exposto de um ramo arqueado.
 * Rejeita posições enterradas noutra copa, encostadas em ramos, outros enfeites ou no chão.
 */
function distribuir({ tipo, n, raio, copas, ramos, amostras, rng, fracaoRamo, faixaY }) {
  const registros = [];
  const enterrado = (q, folga) => copas.some((c) => c.normalizada(q) < folga);
  const pesoCopas = copas.map((c) => c.raio * c.raio), totalCopas = pesoCopas.reduce((a, b) => a + b, 0);
  const sortearCopa = () => {
    let alvo = rng() * totalCopas;
    for (let i = 0; i < copas.length; i++) if ((alvo -= pesoCopas[i]) <= 0) return i;
    return copas.length - 1;
  };
  for (let tentativa = 0; registros.length < n && tentativa < n * 120; tentativa++) {
    let apoio, para, suporte;
    if (ramos.length && rng() < fracaoRamo) {
      const ir = Math.floor(rng() * ramos.length), r = ramos[ir], t = lerp(0.45, 0.97, rng());
      apoio = r.curva.getPointAt(t);
      if (enterrado(apoio, 1.02)) continue; // só trechos expostos
      const tg = r.curva.getTangentAt(t);
      para = V(-tg.z, 0, tg.x).normalize().multiplyScalar(rng() < 0.5 ? 1 : -1);
      suporte = { tipo: "ramo", indice: ir, t };
    } else {
      const ic = sortearCopa(), c = copas[ic];
      const a = rng() * Math.PI * 2, y = lerp(faixaY[0], faixaY[1], rng());
      const d = V(Math.cos(a) * Math.sqrt(1 - y * y), y, Math.sin(a) * Math.sqrt(1 - y * y));
      const fora = V(c.centro.x, 0, c.centro.z);
      if (fora.lengthSq() > 1e-4 && V(d.x, 0, d.z).normalize().dot(fora.normalize()) < -0.15) continue;
      const rr = c.raioEm(d) * 0.86; // ponto de origem dentro da folhagem
      apoio = c.centro.clone().add(V(d.x * rr, d.y * rr * c.achatar, d.z * rr));
      para = V(d.x, 0, d.z).normalize();
      suporte = { tipo: "copa", indice: ic };
    }
    // Pedúnculo: sai para fora e verga com o peso (fruto) ou se ergue (flor).
    const L = raio * lerp(1.7, 2.4, rng());
    const caida = tipo === "fruto" ? lerp(0.55, 1.0, rng()) : lerp(-0.35, 0.15, rng());
    const p1 = apoio.clone().addScaledVector(para, L * 0.55).add(V(0, L * 0.12, 0));
    const fim = p1.clone().addScaledVector(para, L * lerp(0.15, 0.45, rng())).add(V(0, -L * caida, 0));
    const curva = new THREE.QuadraticBezierCurve3(apoio.clone(), p1, fim);
    const tg = curva.getTangentAt(1);
    const eixo = tipo === "fruto" ? tg.clone().negate() : tg.clone().add(V(0, 0.6, 0)).normalize(); // +y local
    const centro = tipo === "fruto" ? fim.clone().addScaledVector(eixo, -raio * 0.72) : fim.clone();
    if (centro.y < raio * 1.3 || centro.y < faixaY[2]) continue;
    if (enterrado(centro, 1.0 + raio / 1.2) || enterrado(fim, 1.0)) continue;
    if (amostras.some((s) => s.p.distanceTo(centro) < s.r + raio * 1.15)) continue;
    if (registros.some((q) => q.centro.distanceTo(centro) < raio * 2.4)) continue;
    registros.push({ tipo, centro, apoio, fim, eixo, curva, suporte, giro: rng() * Math.PI * 2 });
  }
  return registros;
}

function sortearCor(rng) {
  let alvo = rng() * PESO_FRUTOS.reduce((a, b) => a + b, 0);
  for (let i = 0; i < PESO_FRUTOS.length; i++) if ((alvo -= PESO_FRUTOS[i]) <= 0) return CORES.frutos[i];
  return CORES.frutos[0];
}

// ---------------------------------------------------------------------------
// Estágios
// ---------------------------------------------------------------------------

/** 1 · Broto: caule avermelhado com pares de folhas opostas cruzadas; as mais novas cor de cobre. */
function broto(rng) {
  const partes = [monte(0.22)], pares = [];
  const altura = 0.3, inclina = V((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.04);
  partes.push(ramo(reto(V(0, -0.02, 0), V(0, altura, 0).add(inclina)), 0.016, 0.009, CORES.cascaJovem, { segs: 3, lados: 5 }));
  const a0 = rng() * Math.PI;
  const cores = [CORES.folhaJovem, CORES.folhaBroto, CORES.cobre];
  [0.1, 0.19, 0.28].forEach((h, i) => {
    const no = V(0, h, 0).addScaledVector(inclina, h / altura);
    const az = a0 + i * Math.PI / 2; // decussada: cada par gira 90°
    const comp = [0.15, 0.13, 0.09][i];
    partes.push(...parDeFolhas(no, az, comp, comp * 0.52, cores[i], [0.25, 0.45, 0.85][i], 0.2));
    pares.push({ altura: h, azimute: az, cor: cores[i] });
  });
  const gema = new THREE.IcosahedronGeometry(0.018, 0);
  gema.scale(1, 1.6, 1);
  gema.translate(inclina.x, altura + 0.015, inclina.z);
  partes.push(soltos(pintar(gema, CORES.cobreVivo)));
  return { partes, info: { paresDeFolhas: pares, ramosLaterais: 0, copas: [], ramos: [], flores: [], frutos: [] } };
}

/** 2 · Muda: caule único e os primeiros pares de ramos laterais, também opostos. */
function muda(rng) {
  const h = 1.25, partes = [monte(0.34)], pares = [], laterais = [], ramos = [], copasG = [];
  const torto = V((rng() - 0.5) * 0.1, 0, (rng() - 0.5) * 0.1);
  const caule = arco(V(0, -0.02, 0), V(0, h * 0.35, 0), V(0, h * 0.7, 0).add(torto), V(0, h, 0).add(torto));
  partes.push(ramo(caule, 0.03, 0.012, CORES.cascaJovem, { segs: 8, lados: 6 }));
  ramos.push({ curva: caule, r0: 0.03, r1: 0.012 });
  const a0 = rng() * Math.PI;
  // Dois nós com ramos laterais opostos (cruzados entre si) e nós só com folhas.
  const nos = [{ u: 0.3, folhas: true }, { u: 0.45, ramos: true }, { u: 0.6, folhas: true }, { u: 0.72, ramos: true }, { u: 0.86, folhas: true }];
  nos.forEach((n, i) => {
    const no = caule.getPointAt(n.u), az = a0 + i * Math.PI / 2;
    if (n.folhas) {
      partes.push(...parDeFolhas(no, az, 0.2 * (1.1 - n.u * 0.4), 0.1, CORES.folhaJovem, 0.3, 0.3));
      pares.push({ altura: no.y, azimute: az });
      return;
    }
    for (const s of [0, Math.PI]) {
      const a = az + s, L = lerp(0.36, 0.44, rng()) * (1.2 - n.u * 0.5);
      const dir = V(Math.cos(a), 0, Math.sin(a));
      const ponta = no.clone().addScaledVector(dir, L).add(V(0, L * 0.75, 0));
      const curva = new THREE.QuadraticBezierCurve3(no.clone(), no.clone().addScaledVector(dir, L * 0.55).add(V(0, L * 0.2, 0)), ponta);
      partes.push(ramo(curva, 0.013, 0.006, CORES.cascaJovem, { segs: 5, lados: 5 }));
      ramos.push({ curva, r0: 0.013, r1: 0.006 });
      laterais.push({ altura: no.y, azimute: a });
      // Folhas opostas ao longo do ramo lateral e um tufo na ponta.
      const meio = curva.getPointAt(0.55);
      partes.push(...parDeFolhas(meio, a + Math.PI / 2, 0.15, 0.075, CORES.folhaJovem, 0.35, 0.3));
      const r = 0.09, c = ponta.clone().add(V(0, r * 0.4, 0));
      const vol = volume(r, c, CORES.folhaJovem, Math.floor(rng() * 1e6), 0.8, 0.25);
      partes.push(vol);
      copasG.push(vol.userData.copa);
    }
  });
  const topo = caule.getPointAt(1);
  partes.push(...parDeFolhas(topo, a0 + Math.PI / 2 * 5, 0.11, 0.06, CORES.cobre, 0.8, 0.15)); // brotação de cobre no ápice
  // Estaca e laço: o mesmo cuidado de jardineiro das demais mudas do jardim.
  partes.push(ramo(reto(V(0.17, -0.1, 0), V(0.17, h * 0.62, 0)), 0.024, 0.02, RAMPAS.terra[4], { segs: 1, lados: 5 }));
  const laco = caule.getPointAt(0.42);
  partes.push(ramo(reto(V(0.17, laco.y, 0), laco), 0.016, 0.016, RAMPAS.vermelho[1], { segs: 1, lados: 4 }));
  return { partes, info: { paresDeFolhas: pares, ramosLaterais: laterais.length, laterais, copas: copasG, ramos, flores: [], frutos: [] } };
}

/**
 * Estrutura de árvore: tronco curto que se divide baixo em pernadas
 * arqueadas (sobem, fazem o arco e descem as pontas) e ramos secundários.
 * `arqueio` 0..1 controla quanto as pontas já desceram.
 */
function estrutura({ H, grossura = 1, largura, pernadas, arqueio, secundarios, rng, placas, folhas, cobres, raioCopa, tCopas }) {
  const partes = [], ramos = [], copas = [], arcos = [], pontas = [];
  const forquilha = V((rng() - 0.5) * 0.08, H * 0.2, (rng() - 0.5) * 0.08);
  const r0 = H * 0.06 * grossura;
  const tronco = arco(V(0, -0.05, 0), V(0, H * 0.08, 0), forquilha.clone().multiplyScalar(0.6).setY(H * 0.14), forquilha);
  partes.push(ramo(tronco, r0, r0 * 0.78, CORES.casca, { segs: 5, lados: 8, placas }));
  ramos.push({ curva: tronco, r0, r1: r0 * 0.78 });
  const a0 = rng() * Math.PI * 2;
  const pushCopa = (raio, c, cor, achatar) => {
    const v = volume(raio, c, cor, Math.floor(rng() * 1e6), achatar);
    partes.push(v);
    copas.push(v.userData.copa);
  };
  for (let i = 0; i < pernadas; i++) {
    const a = a0 + (i / pernadas) * Math.PI * 2 + (rng() - 0.5) * 0.5;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const alcance = largura * 0.5 * lerp(0.85, 1.0, rng());
    const pico = H * lerp(0.66, 0.74, rng());
    const pontaY = lerp(pico * 0.95, H * 0.48, arqueio) * lerp(0.95, 1.05, rng());
    // Arco: sobe inclinado, faz a curva perto de 40% do alcance e desce até a ponta.
    const curva = arco(
      forquilha.clone(),
      forquilha.clone().addScaledVector(dir, alcance * 0.1).setY(pico * 0.95),
      forquilha.clone().addScaledVector(dir, alcance * 0.62).setY(pico * lerp(1.08, 1.16, arqueio)),
      forquilha.clone().addScaledVector(dir, alcance).setY(pontaY),
    );
    const rr0 = r0 * 0.6, rr1 = r0 * 0.14;
    partes.push(ramo(curva, rr0, rr1, CORES.casca, { segs: 16, lados: 6, placas }));
    ramos.push({ curva, r0: rr0, r1: rr1 });
    let topoY = -Infinity;
    for (let k = 0; k <= 20; k++) topoY = Math.max(topoY, curva.getPointAt(k / 20).y);
    arcos.push({ azimute: a, topoY, pontaY: curva.getPointAt(1).y, alcance });
    // Folhagem assentada sobre a crista do arco; o trecho que desce fica à mostra.
    tCopas.forEach((t, k) => {
      const p = curva.getPointAt(t), r = raioCopa * lerp(0.9, 1.08, rng()) * (k ? 0.9 : 1);
      pushCopa(r, p.clone().add(V(0, r * 0.3, 0)), folhas[(i + k) % folhas.length], 0.52);
    });
    // Pontinha de folhas na extremidade pendente do arco.
    const ponta = curva.getPointAt(1), rp = raioCopa * 0.42;
    pushCopa(rp, ponta.clone().add(V(0, rp * 0.15, 0)), folhas[(i + 1) % folhas.length], 0.7);
    pontas.push({ p: ponta, tg: curva.getTangentAt(1) });
    // Ramos secundários: saem da pernada para os lados e também arqueiam.
    for (let s = 0; s < secundarios; s++) {
      const t = s === 0 ? 0.3 : 0.5, base = curva.getPointAt(t);
      const lado = (s + i) % 2 ? 1 : -1, b = a + lado * lerp(0.75, 1.05, rng());
      const db = V(Math.cos(b), 0, Math.sin(b)), L = alcance * lerp(0.42, 0.52, rng());
      const sp = base.clone().addScaledVector(db, L).add(V(0, -H * 0.05 * arqueio, 0));
      const sc = arco(base.clone(), base.clone().addScaledVector(db, L * 0.25).add(V(0, H * 0.07, 0)), base.clone().addScaledVector(db, L * 0.7).add(V(0, H * 0.07, 0)), sp);
      partes.push(ramo(sc, rr0 * 0.42, rr1 * 0.7, CORES.casca, { segs: 10, lados: 5, placas }));
      ramos.push({ curva: sc, r0: rr0 * 0.42, r1: rr1 * 0.7 });
      const pc = sc.getPointAt(0.55), r = raioCopa * lerp(0.76, 0.88, rng());
      pushCopa(r, pc.add(V(0, r * 0.32, 0)), folhas[(i + s + 1) % folhas.length], 0.55);
    }
  }
  // Brotações cor de cobre: pares de folhas novas saindo de algumas pontas.
  for (let i = 0; i < cobres; i++) {
    const { p, tg } = pontas[(i * 3) % pontas.length];
    const az = Math.atan2(tg.z, tg.x) + Math.PI / 2, f = raioCopa * 0.36;
    const no = p.clone().add(V(0, raioCopa * 0.16, 0));
    partes.push(...parDeFolhas(no, az, f, f * 0.5, CORES.cobre, 0.7, 0.2), ...parDeFolhas(no.clone().add(V(0, f * 0.15, 0)), az + Math.PI / 2, f * 0.7, f * 0.36, CORES.cobre, 0.95, 0.1));
  }
  return { partes, ramos, copas, arcos, forquilha };
}

function raizes(r0, rng, placas) {
  const partes = [];
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.28 + rng() * 0.6;
    const ini = V(Math.cos(a) * r0 * 0.3, r0 * 1.4, Math.sin(a) * r0 * 0.3);
    const fim = V(Math.cos(a) * r0 * lerp(2.4, 3.1, rng()), -r0 * 0.25, Math.sin(a) * r0 * lerp(2.4, 3.1, rng()));
    const meio = ini.clone().lerp(fim, 0.5).add(V(0, -r0 * 0.4, 0));
    partes.push(ramo(new THREE.QuadraticBezierCurve3(ini, meio, fim), r0 * 0.5, r0 * 0.12, CORES.casca, { segs: 4, lados: 5, placas }));
  }
  return partes;
}

function prenderEnfeites(registros, partes, raio, cor) {
  for (const e of registros) {
    const pd = ramo(e.curva, raio * 0.075, raio * 0.055, CORES.pedunculo, { segs: 4, lados: 4 });
    pd.userData = {};
    partes.push(pd);
    if (e.tipo === "fruto") {
      e.cor = cor(e);
      partes.push(...orientar(geometriaFruto(raio, e.cor, ESPECIE.fruto.sulcos), e.centro, e.eixo, e.giro));
    } else partes.push(...orientar(geometriaFlor(raio), e.centro, e.eixo, e.giro));
  }
}

/** 3 · Jovem: pernadas começam a arquear, copa aberta e primeira florada. */
function jovem(H, rng, placas) {
  const est = estrutura({ H, grossura: 0.65, largura: H * 1.45, pernadas: 3, arqueio: 0.3, secundarios: 1, rng, placas, folhas: [CORES.folhaJovem, CORES.folha], cobres: 3, raioCopa: H * 0.16, tCopas: [0.36, 0.7] });
  const amostras = amostrasDeRamos(est.ramos);
  const flores = distribuir({ tipo: "flor", n: ESPECIE.flor.quantidade, raio: ESPECIE.flor.raio, copas: est.copas, ramos: est.ramos.slice(1), amostras, rng, fracaoRamo: 0.3, faixaY: [-0.55, 0.45, H * 0.35] });
  prenderEnfeites(flores, est.partes, ESPECIE.flor.raio);
  return { partes: est.partes, info: { ...est, flores, frutos: [] } };
}

/** 4 · Adulta: copa baixa e larga sobre pernadas arqueadas; frutos em várias alturas e direções. */
function adulta(H, rng, placas) {
  const est = estrutura({ H, largura: H * 1.9, pernadas: 4, arqueio: 1, secundarios: 2, rng, placas, folhas: [CORES.folha, CORES.folha2, CORES.folha], cobres: 5, raioCopa: H * 0.22, tCopas: [0.26, 0.48] });
  // Volume central baixo: fecha o miolo da copa sem esconder as pernadas laterais.
  const centro = volume(H * 0.27, V(est.forquilha.x, H * 0.8, est.forquilha.z), CORES.folha2, Math.floor(rng() * 1e6), 0.5);
  est.partes.push(centro);
  est.copas.push(centro.userData.copa);
  const amostras = amostrasDeRamos(est.ramos);
  const frutos = distribuir({ tipo: "fruto", n: ESPECIE.fruto.quantidade, raio: ESPECIE.fruto.raio, copas: est.copas.filter((c) => c.cor !== CORES.cobre), ramos: est.ramos.slice(1), amostras, rng, fracaoRamo: 0.3, faixaY: [-0.8, 0.25, H * 0.28] });
  prenderEnfeites(frutos, est.partes, ESPECIE.fruto.raio, () => sortearCor(rng));
  est.partes.push(...raizes(H * 0.045, rng, placas));
  return { partes: est.partes, info: { ...est, flores: [], frutos } };
}

/**
 * Constrói os quatro estágios. Devolve { estagios: [geo×4], alturas, info: [×4] }.
 * Cada geometria traz `userData.pitanga` com o registro anatômico do estágio
 * (pares de folhas, ramos, copas, flores e frutos com seus pontos de apoio).
 */
export function construirPitanga(semente = 1234) {
  const rngA = criarRng(semente);
  const H = lerp(ESPECIE.altura[0], ESPECIE.altura[1], rngA());
  const placas = criarRuido(semente * 3 + 11);
  const estagios = [], alturas = [], info = [];
  for (let e = 0; e < 4; e++) {
    const rng = criarRng(semente * 7 + e * 101);
    const r = e === 0 ? broto(rng) : e === 1 ? muda(rng) : e === 2 ? jovem(H * 0.6, rng, placas) : adulta(H, rng, placas);
    const geo = juntar(r.partes);
    if (e === 0) geo.scale(1.8, 1.8, 1.8), geo.computeBoundingBox(), geo.computeBoundingSphere(); // exagero de jogo, como nos outros brotos
    geo.userData.pitanga = { fase: FASES[e], escala: e === 0 ? 1.8 : 1, ...r.info };
    estagios.push(geo);
    alturas.push(geo.boundingBox.max.y);
    info.push(geo.userData.pitanga);
  }
  return { estagios, alturas, alturaAdulta: alturas[3], info };
}
