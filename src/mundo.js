import { organizarPercursos } from "./percursos.js";
import { criarPlano } from "./planoMestre.js";

/**
 * Geração do mundo (demo pequena: uma clareira com bosque, lago e trilha).
 * Unidades em METROS. Determinístico: mesma semente ⇒ mesmo mundo.
 * Mesma lógica do site (src/lib/jardim/mundo.ts), simplificada para a demo.
 */

export function criarRng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruído de valor 2D suave (0..1) com oitavas. */
export function criarRuido(semente) {
  const rng = criarRng(semente);
  const perm = new Uint8Array(512);
  const val = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    val[i] = rng();
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const v = (x, y) => val[perm[(perm[x & 255] + y) & 511]];
  const s = (t) => t * t * (3 - 2 * t);
  const base = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const sx = s(x - xi), sy = s(y - yi);
    const a = v(xi, yi) + (v(xi + 1, yi) - v(xi, yi)) * sx;
    const b = v(xi, yi + 1) + (v(xi + 1, yi + 1) - v(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
  return (x, y, oitavas = 4) => {
    let soma = 0, amp = 0.5, f = 1, n = 0;
    for (let o = 0; o < oitavas; o++) {
      soma += base(x * f, y * f) * amp;
      n += amp;
      amp *= 0.5;
      f *= 2;
    }
    return soma / n;
  };
}

/** Poisson disk com raio variável (Bridson adaptado). */
export function poisson({ largura, altura, raioMin, raio, rng, aceitar, tentativas = 24 }) {
  const tam = raioMin / Math.SQRT2;
  const cols = Math.ceil(largura / tam), lins = Math.ceil(altura / tam);
  const grade = Array.from({ length: cols * lins }, () => []);
  const pts = [];
  const ativos = [];
  let alcance = raioMin;
  const livre = (x, y, r) => {
    const a = Math.max(r, alcance);
    const c0 = Math.max(0, Math.floor((x - a) / tam)), c1 = Math.min(cols - 1, Math.floor((x + a) / tam));
    const l0 = Math.max(0, Math.floor((y - a) / tam)), l1 = Math.min(lins - 1, Math.floor((y + a) / tam));
    for (let l = l0; l <= l1; l++)
      for (let c = c0; c <= c1; c++)
        for (const i of grade[l * cols + c]) {
          const p = pts[i];
          const m = Math.max(r, p.r);
          if ((p.x - x) ** 2 + (p.y - y) ** 2 < m * m) return false;
        }
    return true;
  };
  const inserir = (x, y, r) => {
    pts.push({ x, y, r });
    alcance = Math.max(alcance, r);
    grade[Math.floor(y / tam) * cols + Math.floor(x / tam)].push(pts.length - 1);
    ativos.push(pts.length - 1);
  };
  for (let s = 0; s < 30; s++) {
    const x = rng() * largura, y = rng() * altura;
    if (aceitar && !aceitar(x, y)) continue;
    const r = raio(x, y);
    if (livre(x, y, r)) inserir(x, y, r);
  }
  while (ativos.length) {
    const k = Math.floor(rng() * ativos.length);
    const p = pts[ativos[k]];
    let achou = false;
    for (let t = 0; t < tentativas; t++) {
      const ang = rng() * Math.PI * 2, d = p.r * (1 + rng());
      const x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d;
      if (x < 0 || y < 0 || x >= largura || y >= altura) continue;
      if (aceitar && !aceitar(x, y)) continue;
      const r = raio(x, y);
      if (livre(x, y, r)) {
        inserir(x, y, r);
        achou = true;
        break;
      }
    }
    if (!achou) ativos.splice(k, 1);
  }
  return pts;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
export const suave = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function distSegmento(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp01(((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(a.x + dx * t - px, a.y + dy * t - py);
}

/**
 * Mundo: lago de margem irregular, trilha sinuosa, densidade de mata por ruído,
 * árvores/arbustos (Poisson com raio variável), pedras, troncos e flores.
 * Coordenadas (x, y) no plano do chão; no 3D, y vira z.
 */
export function gerarMundo(semente, largura = 180, altura = 120) {
  const rng = criarRng(semente);
  const plano = criarPlano(largura, altura);
  const ruidoProjeto = criarRuido(0x471c52);
  const ruido = criarRuido(semente ^ 0x9e3779b9);
  const fino = criarRuido(semente ^ 0x85ebca6b);

  // Lago: centro fora do meio, margem por lóbulos + ruído (nada de elipse).
  const lago = {cx:plano.lago.x,cy:plano.lago.y,rx:plano.lago.rx,ry:plano.lago.ry};
  const fases = [0.6, 1.8, 2.5];
  lago.raio = (a) =>
    1 + 0.2 * Math.sin(2 * a + fases[0]) + 0.13 * Math.sin(3 * a + fases[1]) + 0.07 * Math.sin(5 * a + fases[2]) +
    (ruidoProjeto(Math.cos(a) * 1.7 + 11, Math.sin(a) * 1.7 + 3, 3) - 0.5) * 0.32;
  lago.contorno = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2, r = lago.raio(a);
    lago.contorno.push({ x: lago.cx + Math.cos(a) * lago.rx * r, y: lago.cy + Math.sin(a) * lago.ry * r });
  }
  /** < 1 dentro do lago; 1 na margem; > 1 fora. */
  const fatorLago = (x, y) => {
    const dx = (x - lago.cx) / lago.rx, dy = (y - lago.cy) / lago.ry;
    return Math.hypot(dx, dy) / lago.raio(Math.atan2(dy, dx));
  };

  // Trilha sinuosa atravessando a clareira.
  const trilha = { largura: 3.2, pontos: plano.trilha };
  const distTrilha = (x, y) => {
    let m = Infinity;
    for (let i = 0; i < trilha.pontos.length - 1; i++) m = Math.min(m, distSegmento(x, y, trilha.pontos[i], trilha.pontos[i + 1]));
    return m;
  };

  /** Densidade da mata: bosque denso num lado, clareira no meio, rarefeita junto à água e à trilha. */
  const densidade = (x, y) => {
    let d = Math.max(...plano.bosques.map(b=>Math.exp(-((x-b.x)**2+(y-b.y)**2)/(2*b.raio*b.raio))));
    d = clamp01((d - 0.4) * 1.6 + (ruido(x / 22, y / 22, 3) - 0.5) * 0.2);
    d *= clamp01((distTrilha(x, y) - trilha.largura * 0.7) / 10);
    d *= clamp01((fatorLago(x, y) - 1.15) / 0.8);
    return d;
  };

  // Relevo em TERRAÇOS: uma elevação contínua (colina no lado oposto ao lago,
  // baixada em volta da água) é fatiada em platôs planos separados por barrancos
  // íngremes de DEGRAU metros. Onde a trilha cruza um degrau, vira rampa.
  const DEGRAU = 4.5, PAREDE = 0.65; // altura do degrau e largura do paredão (m)
  const elevacao = (x, y) => {
    const dx=(x-plano.colina.x)/1.12,dy=(y-plano.colina.y)/0.95;
    const r=Math.hypot(dx,dy);
    // Contornos compostos, fixos e discretamente recortados; três patamares
    // concentram a composição na diagonal entre mirante, cascatas e lago.
    let c=3.48-r/28+0.12*Math.sin(x/11+0.3)*Math.sin(y/14)+0.07*Math.sin(y/9);
    c=lerp(0.5,c,suave(1.12,1.7,fatorLago(x,y)));
    c=lerp(0.5,c,1-suave(altura+2,altura+8,y));
    return Math.min(3.45,Math.max(0.3,c));
  };
  /** Altura (m) a partir da elevação c e do gradiente dela (níveis por metro). */
  const alturaDe = (x, y, c, grad) => {
    const nivel = Math.floor(c);
    // Paredão de largura FIXA (PAREDE m): quantos metros faltam até o próximo
    // nível, pelo gradiente — fica vertical mesmo onde o morro é suave.
    const falta = (1 - (c - nivel)) / Math.max(1e-3, grad);
    const degraus = nivel + suave(PAREDE, 0, falta);
    const h = degraus * DEGRAU + (ruidoProjeto(x / 9, y / 9, 2) - 0.5) * 0.14;
    return h - (1 - suave(0.6, 1.08, fatorLago(x, y))) * 2.4; // lago escavado
  };
  const alturaExata = (x, y) =>
    alturaDe(x, y, elevacao(x, y), Math.hypot(elevacao(x + 0.5, y) - elevacao(x - 0.5, y), elevacao(x, y + 0.5) - elevacao(x, y - 0.5)));

  // Grade de alturas (0,5 m) cobrindo o mapa, a borda e o viveiro: calculada UMA vez;
  // depois a altitude é só consulta (bilinear). Mantém o carregamento rápido.
  const G = { x0: -50, y0: -50, passo: 0.5 };
  G.nx = Math.round((largura + 100) / G.passo) + 1;
  G.ny = Math.round((altura + 100) / G.passo) + 1;
  const C = new Float32Array(G.nx * G.ny), H = new Float32Array(G.nx * G.ny);
  for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) C[j * G.nx + i] = elevacao(G.x0 + i * G.passo, G.y0 + j * G.passo);
  for (let j = 0; j < G.ny; j++)
    for (let i = 0; i < G.nx; i++) {
      const k = j * G.nx + i;
      const gx = C[j * G.nx + Math.min(G.nx - 1, i + 1)] - C[j * G.nx + Math.max(0, i - 1)];
      const gy = C[Math.min(G.ny - 1, j + 1) * G.nx + i] - C[Math.max(0, j - 1) * G.nx + i];
      H[k] = alturaDe(G.x0 + i * G.passo, G.y0 + j * G.passo, C[k], Math.hypot(gx, gy));
    }
  const altitude = (x, y) => {
    const fx = (x - G.x0) / G.passo, fy = (y - G.y0) / G.passo;
    const i = Math.floor(fx), j = Math.floor(fy);
    if (i < 0 || j < 0 || i >= G.nx - 1 || j >= G.ny - 1) return alturaExata(x, y);
    const tx = fx - i, ty = fy - j, k = j * G.nx + i;
    return lerp(lerp(H[k], H[k + 1], tx), lerp(H[k + G.nx], H[k + G.nx + 1], tx), ty);
  };

  // --- Riacho: nasce no platô mais alto e desce até o lago --------------------
  // Sorteio próprio (rngR): não mexe na posição de árvores, trilha e lago.
  // A água NUNCA sobe: o nível só desce ao longo do curso; onde o chão cai num
  // paredão, a água cai junto (cascata); onde há lombada, o leito é escavado.
  const rngR = criarRng(semente ^ 0x51ed);
  const riacho = { largura: 3.2, pontos: [] };
  {
    const E=plano.riacho.at(-1);
    let ctrl=plano.riacho.map(p=>({...p}));
    for (let r = 0; r < 3; r++) {
      const n = [ctrl[0]];
      for (let i = 0; i < ctrl.length - 1; i++) {
        const p = ctrl[i], q = ctrl[i + 1];
        n.push({ x: lerp(p.x, q.x, 0.25), y: lerp(p.y, q.y, 0.25) }, { x: lerp(p.x, q.x, 0.75), y: lerp(p.y, q.y, 0.75) });
      }
      n.push(ctrl[ctrl.length - 1]);
      ctrl = n;
    }
    // Amostras a cada 0,5 m com o nível da água (só desce).
    let agua = Infinity;
    for (let i = 0; i < ctrl.length - 1; i++) {
      const p = ctrl[i], q = ctrl[i + 1], n = Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / 0.5));
      for (let k = 0; k < n; k++) {
        const x = lerp(p.x, q.x, k / n), y = lerp(p.y, q.y, k / n), h0 = altitude(x, y);
        agua = Math.max(-0.5, Math.min(agua, h0 - 0.45)); // no lago, assenta na superfície (-0,55)
        riacho.pontos.push({ x, y, h0, agua });
      }
    }
    // A foz faz parte do curso, com o mesmo nível da superfície do lago.
    riacho.pontos.push({x:E.x,y:E.y,h0:altitude(E.x,E.y),agua:-0.55});
  }
  const percursos=organizarPercursos({trilha,riacho,lago,altitude,grade:G,alturas:H,DEGRAU,plano});
  const {distRiacho,larguraRiacho,perfilTrilha,pontes,ponte}=percursos;
  if(ponte)Object.assign(plano.locais.find(l=>l.id==="ponte"),{x:ponte.x,y:ponte.y,largura:ponte.comprimento,profundidade:ponte.largura});

  /** Inclinação (m/m) — barrancos passam de ~0,6. */
  const declive = (x, y) => Math.hypot(altitude(x + 0.5, y) - altitude(x - 0.5, y), altitude(x, y + 0.5) - altitude(x, y - 0.5));
  const ingreme = (x, y) => declive(x, y) > 0.45 || declive(x + 1.2, y) > 0.45 || declive(x - 1.2, y) > 0.45 || declive(x, y + 1.2) > 0.45 || declive(x, y - 1.2) > 0.45;

  const reservado = (x,y) => plano.locais.some(l=>l.status==="proposto" && Math.abs(x-l.x)<l.largura/2+1 && Math.abs(y-l.y)<l.profundidade/2+1);
  const fora = (x, y) => !reservado(x,y) && fatorLago(x, y) > 1.12 && distTrilha(x, y) > trilha.largura * 0.9 && !ingreme(x, y) && distRiacho(x, y) > larguraRiacho(x,y) * 0.5 + 1.6;
  const nascer = (d) => clamp01(0.85 - d * 0.75 + (rng() - 0.5) * 0.35);
  const objetos = [];

  for (const p of poisson({
    largura, altura, raioMin: 3.2, rng,
    raio: (x, y) => {
      const r = lerp(16, 3.2, Math.pow(densidade(x, y), 0.6));
      return fatorLago(x, y) < 1.5 ? Math.min(r, 5.5) : r; // mata ciliar mais fechada
    },
    // Mata ciliar: uma faixa de árvores esparsas na beira d'água, mesmo fora do bosque.
    aceitar: (x, y) => fora(x, y) && (densidade(x, y) > 0.12 || (fatorLago(x, y) < 1.5 && fino(x / 8, y / 8, 2) > 0.35)),
  })) {
    const d = densidade(p.x, p.y);
    objetos.push({ tipo: "arvore", x: p.x, y: p.y, d, zona: fino(p.x / 40, p.y / 40, 2), lago: fatorLago(p.x, p.y), escala: lerp(0.8, 1.15, rng()), nasce: nascer(d), giro: rng() * 6.28 });
  }
  // Grade das árvores já plantadas, para consultas de vizinhança rápidas.
  const CEL = 4;
  const gradeArv = new Map();
  for (const o of objetos) {
    const k = `${Math.floor(o.x / CEL)},${Math.floor(o.y / CEL)}`;
    gradeArv.set(k, [...(gradeArv.get(k) ?? []), o]);
  }
  const pertoDeArvore = (x, y, r) => {
    const cx = Math.floor(x / CEL), cy = Math.floor(y / CEL), n = Math.ceil(r / CEL);
    for (let i = -n; i <= n; i++)
      for (let j = -n; j <= n; j++)
        for (const o of gradeArv.get(`${cx + i},${cy + j}`) ?? []) if (Math.hypot(o.x - x, o.y - y) < r) return true;
    return false;
  };

  for (const p of poisson({
    largura, altura, raioMin: 2.2, rng,
    raio: (x, y) => lerp(12, 2.2, densidade(x, y) * 0.8 + fino(x / 25, y / 25, 2) * 0.35),
    // Arbusto não nasce colado ao tronco de uma árvore (espaço do indivíduo).
    aceitar: (x, y) => fora(x, y) && densidade(x, y) + fino(x / 30, y / 30) * 0.4 > 0.38 && !pertoDeArvore(x, y, 2.4),
  })) {
    const d = densidade(p.x, p.y);
    objetos.push({ tipo: "arbusto", x: p.x, y: p.y, d, escala: lerp(0.7, 1.2, rng()), nasce: clamp01(nascer(d) - 0.1), giro: rng() * 6.28 });
  }
  // Imperfeições: pedras (inclusive na margem), tocos e troncos caídos.
  for (let i = 0; i < 22; i++) {
    const x = rng() * largura, y = rng() * altura;
    if (!fora(x, y)) continue;
    objetos.push({ tipo: rng() < 0.7 ? "pedra" : rng() < 0.5 ? "toco" : "tronco", x, y, escala: lerp(0.6, 1.4, rng()), nasce: 0, giro: rng() * 6.28 });
  }
  for (let i = 0; i < 12; i++) {
    const a = rng() * 6.28, r = lago.raio(a) * lerp(1.04, 1.16, rng());
    objetos.push({ tipo: "pedra", x: lago.cx + Math.cos(a) * lago.rx * r, y: lago.cy + Math.sin(a) * lago.ry * r, escala: lerp(0.5, 1.1, rng()), nasce: 0, giro: rng() * 6.28 });
  }
  // Flores em manchas nas clareiras ensolaradas.
  for (let i = 0; i < 900; i++) {
    const x = rng() * largura, y = rng() * altura;
    if (!fora(x, y) || densidade(x, y) > 0.25 || fino(x / 12, y / 12, 2) < 0.55) continue;
    objetos.push({ tipo: "flor", x, y, cor: Math.floor(rng() * 4), nasce: 0 });
  }

  return { semente, plano, largura, altura, lago, fatorLago, trilha, distTrilha, densidade, altitude, declive, ingreme, DEGRAU, riacho, distRiacho, larguraRiacho, perfilTrilha, pontes, ponte, objetos, ruido, fino };
}
