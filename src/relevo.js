/** Pedra, terraços e travessias: medidas e texturas pertencem ao mundo 3D. */
import * as THREE from "three";
import { RAMPAS } from "./paleta.js";

/** A rocha fica presa ao mundo; os tufinhos desenhados acompanham a leitura da vista. */
export function criarMaterialRelevo(toon, opcoes = {}) {
  const mat = toon({ vertexColors: true });
  const direita = opcoes.direita ?? { value: new THREE.Vector2(1, 0) };
  const texel = opcoes.texel ?? { value: 0.1 };
  mat.name = "terreno-blocos-mundo";
  mat.userData.relevo = { versao: 1, referencia: "mundo", cursos: 1.05, larguraBloco: 2.15 };
  mat.userData.gramado = { direita, texel };
  mat.onBeforeCompile = (sh) => {
    const cores = {
      uPedraSombra: RAMPAS.terra[1], uPedraBase: RAMPAS.terra[3],
      uPedraClara: RAMPAS.terra[4], uPedraCinza: RAMPAS.pedra[2],
      uJunta: RAMPAS.terra[0], uMusgo: RAMPAS.mata[2],
      uRochaBase: RAMPAS.pedra[2], uRochaClara: RAMPAS.pedra[3], uRochaEscura: RAMPAS.pedra[1],
      uTufo: RAMPAS.mata[2], uTufoLuz: RAMPAS.mata[5],
    };
    for (const [nome, cor] of Object.entries(cores)) sh.uniforms[nome] = { value: new THREE.Color(cor) };
    sh.uniforms.uDireita = direita;
    sh.uniforms.uTexel = texel;
    sh.vertexShader = `attribute float aRocha;
      attribute float aGrama;
      varying float vRocha;
      varying float vGrama;
      varying vec3 vPedraMundo;
      varying vec3 vPedraNormal;
    ` + sh.vertexShader.replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
      vRocha = aRocha;
      vGrama = aGrama;
      vPedraMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vPedraNormal = normalize(mat3(modelMatrix) * objectNormal);
    `);
    sh.fragmentShader = `uniform vec3 uPedraSombra;
      uniform vec3 uPedraBase;
      uniform vec3 uPedraClara;
      uniform vec3 uPedraCinza;
      uniform vec3 uJunta;
      uniform vec3 uMusgo;
      uniform vec3 uRochaBase; uniform vec3 uRochaClara; uniform vec3 uRochaEscura;
      uniform vec2 uDireita; uniform float uTexel;
      uniform vec3 uTufo; uniform vec3 uTufoLuz;
      varying float vRocha;
      varying float vGrama;
      varying vec3 vPedraMundo;
      varying vec3 vPedraNormal;
      float pedraHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruidoGrama(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(pedraHash(i), pedraHash(i + vec2(1.0, 0.0)), f.x), mix(pedraHash(i + vec2(0.0, 1.0)), pedraHash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
    ` + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      vec3 normalPedra = normalize(vPedraNormal);
      if (normalPedra.y < 0.68 && vRocha > 0.5) {
        // Dois eixos fixos: cada face usa o eixo do chão que acompanha sua parede.
        // Cursos alternados desfazem as antigas colunas verticais repetidas.
        float lateral = abs(normalPedra.x) > abs(normalPedra.z) ? vPedraMundo.z : vPedraMundo.x;
        float natural = step(1.15,vRocha);
        float alturaFiada = mix(1.05,1.8,natural);
        float fiada = floor(vPedraMundo.y / alturaFiada);
        float desloca = mod(fiada, 2.0) * 0.51 + (pedraHash(vec2(fiada, 6.0)) - 0.5) * 0.19;
        float u = lateral / mix(2.15,2.4+pedraHash(vec2(fiada,3.0))*1.2,natural) + desloca;
        float coluna = floor(u);
        float fx = fract(u), fy = fract(vPedraMundo.y / alturaFiada);
        float tom = pedraHash(vec2(coluna, fiada));
        vec3 pedra = tom < 0.20 ? uPedraCinza : mix(uPedraSombra, uPedraBase, tom < 0.48 ? 0.72 : 1.0);
        // Chanfro: topo claro e face inferior escura; a iluminação toon continua ativa.
        if (fy > 0.87 || fx < 0.055) pedra = mix(pedra, uPedraClara, 0.65);
        if (fy < 0.105 || fx > 0.945) pedra = mix(pedra, uPedraSombra, 0.72);
        if (fy < 0.045 || fx > 0.978) pedra = uJunta;
        if(natural>0.5) {
          pedra=mix(uRochaEscura,uRochaBase,tom<0.25?0.2:0.85);
          if(fy>0.87||fx<0.07)pedra=mix(pedra,uRochaClara,0.65);
          if(fy<0.07||fx>0.94)pedra=uRochaEscura;
          if(tom>0.84)pedra=mix(pedra,uPedraBase,0.35);
        }
        // Crosta de terra e musgo em bordas superiores de cada patamar de 4,5 m.
        float topoPatamar = fract((vPedraMundo.y + 0.015) / 4.5);
        if (topoPatamar > 0.962) pedra = tom > 0.65 ? uMusgo : uPedraSombra;
        else if (topoPatamar < 0.07) pedra = mix(pedra, uPedraSombra, 0.65);
        diffuseColor.rgb = pedra;
      } else if (vGrama > 0.5) {
        // Gramado da versão principal: três tons em manchas e tufinhos em V.
        vec2 p = vPedraMundo.xz;
        float n = ruidoGrama(p / 9.0) * 0.7 + ruidoGrama(p / 3.1) * 0.3;
        vec3 grama = diffuseColor.rgb * (n < 0.36 ? 0.8 : (n > 0.66 ? 1.16 : 1.0));
        // Os tufos somem no afastamento para não virarem chuvisco na paleta.
        if (uTexel < 0.2) {
          vec2 cel = floor(p / 1.1);
          float h = pedraHash(cel);
          if (h > 0.55) {
            vec2 o = (cel + 0.25 + vec2(fract(h * 7.3), fract(h * 13.1)) * 0.5) * 1.1;
            vec2 cima = vec2(uDireita.y, -uDireita.x);
            vec2 d = p - o;
            float ax = dot(d, uDireita), ay = dot(d, cima) / 0.62;
            float esp = max(0.05, uTexel * 0.75);
            float folhas = step(0.0, ay) * step(ay, 0.38) * max(step(abs(ax + ay * 0.5), esp), max(step(abs(ax - ay * 0.5), esp), step(abs(ax), esp) * step(ay, 0.48)));
            if (folhas > 0.5) grama = h > 0.9 ? uTufoLuz : uTufo;
          }
        }
        diffuseColor.rgb = grama;
      }
    `);
  };
  mat.customProgramCacheKey = () => "relevo-blocos-no-mundo-2-gramado";
  return mat;
}

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
        add(escada, faixaPedra(pontos, largura + 0.025, A[j].h, A[j].h - 0.46, tomPedra(numeroPiso)), `degrau-${numeroPiso++}`, { tipo: "degrau", topo: A[j].h, s0: antes.s, s1: depois.s, larguraLivre: largura });
      }
      j = k + 1;
    }
    // Pequenas muretas só acompanham as escadas; nada atravessa o piso livre.
    let trecho = 0;
    for (let j = inicio; j <= fim; j += 2) {
      const k = Math.min(fim, j + 1);
      const antes = j ? misturar(A[j - 1], A[j], 0.5) : A[j];
      const depois = k + 1 < A.length ? misturar(A[k], A[k + 1], 0.5) : A[k];
      const pontos = [antes, ...A.slice(j, k + 1), depois].filter((p, t, ps) => !t || distancia(ps[t - 1], p) > EPS);
      if (pontos.length < 2) continue;
      const alto = Math.max(...A.slice(j, k + 1).map((p) => p.h));
      const baixo = Math.min(...A.slice(j, k + 1).map((p) => p.h));
      for (const lado of [-1, 1]) {
        add(escada, faixaPedra(pontos, 0.38, alto + 0.46, baixo - 0.2, RAMPAS.pedra[3], lado * (largura / 2 + 0.24)), `mureta-${trecho}-${lado}`, { tipo: "mureta-escada", lado, s0: antes.s, s1: depois.s, topo: alto + 0.46, terminacao: j === inicio || k === fim });
      }
      trecho++;
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
