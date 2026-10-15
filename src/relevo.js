/** Materiais de solo e geometrias das obras de pedra. */
import * as THREE from "three";
import { RAMPAS } from "./paleta.js";
export { criarMaterialRelevo } from "./solo.js";

const EPS = 1e-4;
const misturar = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: a.s + (b.s - a.s) * t });
const distancia = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const tomPedra = (n) => RAMPAS.pedra[2 + (Math.abs(Math.floor(n)) % 3 === 0 ? 1 : 0)];

/** Normais no chão, com união em meia-esquadria para não abrir fendas em curvas. */
function bordas(pontos, meiaLargura, afastamento = 0) {
  return pontos.map((p, i) => {
    const antes = pontos[Math.max(0, i - 1)], depois = pontos[Math.min(pontos.length - 1, i + 1)];
    const aa = Math.hypot(p.x - antes.x, p.y - antes.y), bb = Math.hypot(depois.x - p.x, depois.y - p.y);
    const da = aa > EPS ? { x: (p.x - antes.x) / aa, y: (p.y - antes.y) / aa } : { x: (depois.x - p.x) / Math.max(EPS, bb), y: (depois.y - p.y) / Math.max(EPS, bb) };
    const db = bb > EPS ? { x: (depois.x - p.x) / bb, y: (depois.y - p.y) / bb } : da;
    const nx = -da.y - db.y, ny = da.x + db.x, tam = Math.max(EPS, Math.hypot(nx, ny));
    const normal = { x: nx / tam, y: ny / tam };
    const ganho = 1 / Math.max(0.84, normal.x * -db.y + normal.y * db.x);
    const lado = (s) => ({ x: p.x + normal.x * (afastamento + s * meiaLargura) * ganho, z: p.y + normal.y * (afastamento + s * meiaLargura) * ganho });
    return [lado(-1), lado(1)];
  });
}

/** Faixa curva sólida: piso plano, espelhos verticais e pequenas faces de chanfro. */
function faixaPedra(pontos, largura, topo, base, cor, afastamento = 0) {
  const margem = Math.min(0.045, largura * 0.08), bisel = Math.min(0.045, (topo - base) * 0.2);
  const externas = bordas(pontos, largura / 2, afastamento);
  const internas = bordas(pontos, largura / 2 - margem, afastamento);
  const vertices = [], cores = [];
  const cTopo = new THREE.Color(cor), cLado = new THREE.Color(RAMPAS.pedra[2]);
  const cBisel = new THREE.Color(RAMPAS.pedra[3]);
  const vertice = (v, h) => [v.x, h, v.z];
  const quad = (a, b, c, d, tinta) => {
    for (const v of [a, b, c, a, c, d]) { vertices.push(...v); cores.push(tinta.r, tinta.g, tinta.b); }
  };
  for (let i = 0; i < pontos.length - 1; i++) {
    const a = externas[i], b = externas[i + 1], ai = internas[i], bi = internas[i + 1];
    quad(vertice(ai[0], topo), vertice(ai[1], topo), vertice(bi[1], topo), vertice(bi[0], topo), cTopo);
    // Lados externos: a mesma malha contém piso e espelho, sem placas flutuantes.
    for (let s = 0; s < 2; s++) {
      const sequencia = s ? [a[s], b[s], bi[s], ai[s]] : [b[s], a[s], ai[s], bi[s]];
      quad(vertice(sequencia[0], topo - bisel), vertice(sequencia[1], topo - bisel), vertice(sequencia[2], topo), vertice(sequencia[3], topo), cBisel);
      const par = s ? [a[s], b[s]] : [b[s], a[s]];
      quad(vertice(par[0], base), vertice(par[1], base), vertice(par[1], topo - bisel), vertice(par[0], topo - bisel), cLado);
    }
    quad(vertice(a[1], base), vertice(a[0], base), vertice(b[0], base), vertice(b[1], base), cLado);
  }
  for (const inicio of [true, false]) {
    const k = inicio ? 0 : pontos.length - 1, e = externas[k], n = internas[k];
    const l = inicio ? 0 : 1, r = 1 - l;
    quad(vertice(e[l], base), vertice(e[r], base), vertice(e[r], topo - bisel), vertice(e[l], topo - bisel), cLado);
    quad(vertice(e[l], topo - bisel), vertice(e[r], topo - bisel), vertice(n[r], topo), vertice(n[l], topo), cBisel);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function caixaChanfrada(comprimento, altura, largura, cor=RAMPAS.pedra[3]) {
  return faixaPedra([{ x: -comprimento / 2, y: 0, s: 0 }, { x: comprimento / 2, y: 0, s: comprimento }], largura, altura / 2, -altura / 2, cor);
}

/** Piso claro e espelho escuro: a aresta pertence ao degrau, sem uma placa por cima. */
function lajeEscada(pontos, largura, topo, frentes, indice) {
  const externas = bordas(pontos, largura / 2), internas = bordas(pontos, largura / 2 - 0.045);
  const bisel = 0.075, base = topo - 0.46;
  for (const inicio of [true, false]) {
    if (!frentes.includes(inicio ? "inicio" : "fim")) continue;
    const k = inicio ? 0 : pontos.length - 1, vizinho = inicio ? 1 : k - 1;
    const d = Math.max(EPS, distancia(pontos[k], pontos[vizinho]));
    const passo = Math.min(0.085, d * 0.35);
    for (const p of internas[k]) { p.x += (pontos[vizinho].x - pontos[k].x) / d * passo; p.z += (pontos[vizinho].y - pontos[k].y) / d * passo; }
  }
  const vertices = [], cores = [];
  const piso = new THREE.Color(RAMPAS.pedra[indice % 7 === 4 ? 4 : 3]);
  const espelho = new THREE.Color(RAMPAS.pedra[1]), nariz = new THREE.Color(RAMPAS.pedra[4]);
  const junta = new THREE.Color(RAMPAS.pedra[2]);
  const v = (p, h) => [p.x, h, p.z];
  const quad = (a, b, c, d, cor) => {
    for (let triangulo of [[a, b, c], [a, c, d]]) {
      // Curvas fechadas podem inverter um leque na borda interna. O piso olha para cima.
      if (triangulo.every((p) => Math.abs(p[1] - topo) < EPS)) {
        const [p, q, r] = triangulo;
        if ((q[2] - p[2]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[2] - p[2]) < 0) triangulo = [p, r, q];
      }
      for (const p of triangulo) { vertices.push(...p); cores.push(cor.r, cor.g, cor.b); }
    }
  };
  const entre = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
  const s0 = pontos[0].s, comprimento = Math.max(EPS, pontos.at(-1).s - s0);
  // Uma junta curta por laje, desencontrada nas seguintes: nunca vira um xadrez.
  const junta0 = 0.13 + indice % 3 * 0.08, junta1 = 0.72 + indice % 2 * 0.12;
  const eixoJunta = 0.23 + (indice * 7 % 11) * 0.049, meiaJunta = 0.032 / largura;
  for (let i = 0; i + 1 < pontos.length; i++) {
    const e = externas[i], f = externas[i + 1], a = internas[i], b = internas[i + 1];
    const t0 = (pontos[i].s - s0) / comprimento, t1 = (pontos[i + 1].s - s0) / comprimento;
    const cortes = [t0, ...[junta0, junta1].filter((t) => t > t0 + EPS && t < t1 - EPS), t1];
    for (let k = 0; k + 1 < cortes.length; k++) {
      const lo = cortes[k], hi = cortes[k + 1];
      const al = entre(a[0], b[0], (lo - t0) / (t1 - t0)), ar = entre(a[1], b[1], (lo - t0) / (t1 - t0));
      const bl = entre(a[0], b[0], (hi - t0) / (t1 - t0)), br = entre(a[1], b[1], (hi - t0) / (t1 - t0));
      if ((lo + hi) / 2 < junta0 || (lo + hi) / 2 > junta1) quad(v(al, topo), v(ar, topo), v(br, topo), v(bl, topo), piso);
      else {
        const ca = eixoJunta + (lo - 0.5) * 0.04, cb = eixoJunta + (hi - 0.5) * 0.04;
        const aj = entre(al, ar, ca - meiaJunta), ak = entre(al, ar, ca + meiaJunta);
        const bj = entre(bl, br, cb - meiaJunta), bk = entre(bl, br, cb + meiaJunta);
        quad(v(al, topo), v(aj, topo), v(bj, topo), v(bl, topo), piso);
        quad(v(aj, topo), v(ak, topo), v(bk, topo), v(bj, topo), junta);
        quad(v(ak, topo), v(ar, topo), v(br, topo), v(bk, topo), piso);
      }
    }
    for (let lado = 0; lado < 2; lado++) {
      const q = lado ? [e[lado], f[lado], b[lado], a[lado]] : [f[lado], e[lado], a[lado], b[lado]];
      quad(v(q[0], topo - bisel), v(q[1], topo - bisel), v(q[2], topo), v(q[3], topo), piso);
      quad(v(q[0], base), v(q[1], base), v(q[1], topo - bisel), v(q[0], topo - bisel), espelho);
    }
    quad(v(e[1], base), v(e[0], base), v(f[0], base), v(f[1], base), espelho);
  }
  for (const inicio of [true, false]) {
    const k = inicio ? 0 : pontos.length - 1, e = externas[k], n = internas[k];
    const l = inicio ? 0 : 1, r = 1 - l;
    quad(v(e[l], base), v(e[r], base), v(e[r], topo - bisel), v(e[l], topo - bisel), espelho);
    quad(v(e[l], topo - bisel), v(e[r], topo - bisel), v(n[r], topo), v(n[l], topo), frentes.includes(inicio ? "inicio" : "fim") ? nariz : piso);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals(); geo.computeBoundingSphere();
  return geo;
}

/** Borda baixa contínua, com cabeças rebaixadas; acompanha a subida sem serrilhar. */
function bordaEscada(pontos, larguraLivre, lado) {
  const externas = bordas(pontos, 0.16, lado * (larguraLivre / 2 + 0.22));
  const internas = bordas(pontos, 0.125, lado * (larguraLivre / 2 + 0.22));
  const vertices = [], cores = [];
  const topo = pontos.map((p, i) => p.h + (i === 0 || i === pontos.length - 1 ? 0.11 : 0.25));
  const base = pontos.map((p) => p.h - 0.25);
  const cFace = new THREE.Color(RAMPAS.pedra[2]), cTopo = new THREE.Color(RAMPAS.pedra[3]), cPe = new THREE.Color(RAMPAS.pedra[1]);
  const v = (p, h) => [p.x, h, p.z];
  const quad = (a, b, c, d, cor) => { for (const p of [a, b, c, a, c, d]) { vertices.push(...p); cores.push(cor.r, cor.g, cor.b); } };
  for (let i = 0; i + 1 < pontos.length; i++) {
    const a = externas[i], b = externas[i + 1], ai = internas[i], bi = internas[i + 1];
    quad(v(ai[0], topo[i]), v(ai[1], topo[i]), v(bi[1], topo[i + 1]), v(bi[0], topo[i + 1]), cTopo);
    for (let s = 0; s < 2; s++) {
      const q = s ? [a[s], b[s], bi[s], ai[s]] : [b[s], a[s], ai[s], bi[s]];
      const h = s ? [i, i + 1, i + 1, i] : [i + 1, i, i, i + 1];
      quad(v(q[0], topo[h[0]] - 0.045), v(q[1], topo[h[1]] - 0.045), v(q[2], topo[h[2]]), v(q[3], topo[h[3]]), cTopo);
      quad(v(q[0], base[h[0]] + 0.12), v(q[1], base[h[1]] + 0.12), v(q[1], topo[h[1]] - 0.045), v(q[0], topo[h[0]] - 0.045), cFace);
      quad(v(q[0], base[h[0]]), v(q[1], base[h[1]]), v(q[1], base[h[1]] + 0.12), v(q[0], base[h[0]] + 0.12), cPe);
    }
    quad(v(a[1], base[i]), v(a[0], base[i]), v(b[0], base[i + 1]), v(b[1], base[i + 1]), cPe);
  }
  for (const inicio of [true, false]) {
    const k = inicio ? 0 : pontos.length - 1, e = externas[k], n = internas[k], l = inicio ? 0 : 1, r = 1 - l;
    quad(v(e[l], base[k]), v(e[r], base[k]), v(e[r], topo[k] - 0.045), v(e[l], topo[k] - 0.045), cFace);
    quad(v(e[l], topo[k] - 0.045), v(e[r], topo[k] - 0.045), v(n[r], topo[k]), v(n[l], topo[k]), cTopo);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals(); geo.computeBoundingSphere();
  return geo;
}

/** Escadas e pontes obedecem ao perfil caminhável já decidido pela geração. */
export function criarTravessias(mundo, toon) {
  const grupo = new THREE.Group();
  grupo.name = "travessias-pedra";
  grupo.userData.tipo = "travessias";
  const material = toon({ vertexColors: true });
  material.name = "pedra-travessias";
  const add = (pai, geo, nome, dados = {}) => {
    const m = new THREE.Mesh(geo, material);
    m.name = nome;
    m.userData = dados;
    m.castShadow = m.receiveShadow = true;
    pai.add(m);
    return m;
  };
  const A = mundo.trilha?.amostras ?? [];
  const largura = mundo.trilha?.largura ?? 3.2;
  let numeroEscada = 0;
  for (let inicio = 0; inicio < A.length;) {
    if (!A[inicio].escada) { inicio++; continue; }
    let fim = inicio;
    while (fim + 1 < A.length && A[fim + 1].escada) fim++;
    const escada = new THREE.Group();
    escada.name = `escada-pedra-${numeroEscada++}`;
    escada.userData = { tipo: "escada", s0: A[inicio].s, s1: A[fim].s, larguraLivre: largura, h0: A[inicio].h, h1: A[fim].h };
    grupo.add(escada);
    let numeroPiso = 0;
    for (let j = inicio; j <= fim;) {
      let k = j;
      while (k < fim && Math.abs(A[k + 1].h - A[j].h) < EPS) k++;
      const antes = j ? misturar(A[j - 1], A[j], 0.5) : A[j];
      const depois = k + 1 < A.length ? misturar(A[k], A[k + 1], 0.5) : A[k];
      const pontos = [antes, ...A.slice(j, k + 1), depois].filter((p, t, ps) => !t || distancia(ps[t - 1], p) > EPS);
      if (pontos.length > 1) {
        const frentes = [];
        if (j && A[j - 1].h < A[j].h - EPS) frentes.push("inicio");
        if (k + 1 < A.length && A[k + 1].h < A[k].h - EPS) frentes.push("fim");
        add(escada, lajeEscada(pontos, largura + 0.025, A[j].h, frentes, numeroPiso), `degrau-${numeroPiso++}`, { tipo: "degrau", topo: A[j].h, s0: antes.s, s1: depois.s, larguraLivre: largura, frentes });
      }
      j = k + 1;
    }
    // Duas bordas inteiras substituem a sucessão de caixotes em cada degrau.
    const antes = inicio ? misturar(A[inicio - 1], A[inicio], 0.5) : A[inicio];
    const depois = fim + 1 < A.length ? misturar(A[fim], A[fim + 1], 0.5) : A[fim];
    const laterais = [{ ...antes, h: A[inicio].h }, ...A.slice(inicio, fim + 1), { ...depois, h: A[fim].h }].filter((p, t, ps) => !t || distancia(ps[t - 1], p) > EPS);
    if (laterais.length > 1) for (const lado of [-1, 1]) {
      add(escada, bordaEscada(laterais, largura, lado), `mureta-continua-${lado}`, { tipo: "mureta-escada", lado, s0: antes.s, s1: depois.s, topo: Math.max(...laterais.map((p) => p.h)) + 0.25, terminacao: true });
    }
    inicio = fim + 1;
  }

  const pontes = mundo.pontes ?? (mundo.ponte ? [mundo.ponte] : []);
  pontes.forEach((p, numero) => {
    const norma = Math.hypot(p.dx, p.dy);
    if (!(norma > EPS && p.comprimento > 0 && p.largura > 0 && Number.isFinite(p.h))) return;
    const dx = p.dx / norma, dy = p.dy / norma;
    const ponte = new THREE.Group();
    ponte.name = `ponte-pedra-${numero}`;
    ponte.position.set(p.x, p.h, p.y);
    ponte.rotation.y = -Math.atan2(dy, dx);
    ponte.userData = { tipo: "ponte", s0: p.s0, s1: p.s1, h: p.h, dx, dy, comprimento: p.comprimento, larguraLivre: p.largura };
    grupo.add(ponte);
    const livre = p.largura, total = livre + 0.72;
    // Base contínua sob os blocos fecha as juntas e deixa o vão da água livre.
    const base = add(ponte, caixaChanfrada(p.comprimento, 0.3, total,RAMPAS.pedra[1]), "base-tabuleiro", { tipo: "tabuleiro", topo: p.h - 0.12 });
    base.position.y = -0.27;
    const linhas = Math.max(1, Math.ceil(p.comprimento / 1.7)), colunas = 3;
    const passoX = p.comprimento / linhas, passoZ = total / colunas;
    for (let i = 0; i < linhas; i++) for (let j = 0; j < colunas; j++) {
      const bloco = add(ponte, caixaChanfrada(passoX - 0.065, 0.24, passoZ - 0.065,tomPedra(i+j)), `piso-ponte-${i}-${j}`, { tipo: "piso-ponte", topo: p.h });
      bloco.position.set(-p.comprimento / 2 + (i + 0.5) * passoX, -0.12, -total / 2 + (j + 0.5) * passoZ);
    }
    for (const ponta of [-1, 1]) {
      // Apoios ficam nas cabeceiras, nunca no centro do canal.
      const x = ponta * (p.comprimento / 2 - 0.35);
      const chao = mundo.altitude?.(p.x + dx * x, p.y + dy * x) ?? p.h - 1;
      const altura = Math.max(0.55, Math.min(4, p.h - chao + 0.3));
      const apoio = add(ponte, caixaChanfrada(0.72, altura, total), `encontro-${ponta}`, { tipo: "apoio-ponte", cabeceira: ponta });
      apoio.position.set(x, -altura / 2 - 0.18, 0);
      for (const lado of [-1, 1]) {
        const comprimento = Math.min(1.8, p.comprimento * 0.23);
        const mureta = add(ponte, caixaChanfrada(comprimento, 0.48, 0.3), `parapeito-${ponta}-${lado}`, { tipo: "parapeito-ponte", cabeceira: ponta, lado });
        mureta.position.set(ponta * (p.comprimento / 2 - comprimento / 2), 0.24, lado * (livre / 2 + 0.21));
      }
    }
  });
  // Em mundos sem travessias o material não fica abandonado fora da cena.
  if (!grupo.children.length) material.dispose();
  return grupo;
}
