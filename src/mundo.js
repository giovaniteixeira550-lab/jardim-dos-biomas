import { organizarPercursos } from "./percursos.js";
import { criarPlano } from "./planoMestre.js";
import { elevacaoPlanejada } from "./formacaoTerreno.js";
import { distanciaTerra, definirPontoPesca } from "./trilhaTerra.js";

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
export function gerarMundo(semente, largura = 260, altura = 170) {
  const areaRel=(largura*altura)/(180*120);
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

  // O antigo largo do pavilhão volta ao gramado. A caminhada termina num
  // banco simples junto à margem, sem praça, canteiros ou plataforma nova.
  const pesca=definirPontoPesca(lago);
  plano.pesca=pesca;
  Object.assign(plano.locais.find(l=>l.id==="pavilhao"),{acesso:"replanejar",descricao:"Reserva futura do pavilhão. Largo, flores e banco retirados por enquanto; o banco atual fica junto à margem norte do lago."});
  plano.locais.push({id:"pesca",nome:"Ponto de pesca",tipo:"pesca",status:"implantado",x:pesca.x,y:pesca.y,largura:4,profundidade:3,descricao:"Banco horizontal junto à margem norte, voltado para o lago. A trilha chega por trás do assento."});
  plano.trilha=[...plano.trilha.slice(0,-1),pesca.acesso];
  if(plano.trilhaPlantio)plano.trilhaPlantio=[...plano.trilhaPlantio.slice(0,-1),pesca.acesso];

  // Trilha sinuosa atravessando a clareira.
  // O plantio continua usando o corredor histórico. O desvio local é aplicado
  // depois dos sorteios, preservando os indivíduos fora da nova passagem.
  const trilha = { largura: 3.2, pontos: plano.trilhaPlantio??plano.trilha, largos: plano.largos };
  const distTrilha = (x, y) => {
    let m = Infinity;
    for (let i = 0; i < trilha.pontos.length - 1; i++) m = Math.min(m, distSegmento(x, y, trilha.pontos[i], trilha.pontos[i + 1]));
    return distanciaTerra(x, y, m, trilha);
  };
  const distPlantio = (x, y) => {
    const pontos=plano.corredorPlantio??trilha.pontos;
    let d=Infinity;
    for(let i=1;i<pontos.length;i++)d=Math.min(d,distSegmento(x,y,pontos[i-1],pontos[i]));
    return d;
  };

  /** Bosquetes abertos e ligados por árvores esparsas; preserva os eixos de vista. */
  const densidade = (x, y, dt=distPlantio(x,y), f=fatorLago(x,y)) => {
    // Pequeno deslocamento do campo evita ilhas elípticas com contorno regular.
    const px=x+(ruido(x/28+7,y/28,2)-.5)*8,py=y+(ruido(x/28,y/28+11,2)-.5)*8;
    let maior=0,soma=0;
    for(const b of plano.bosques){
      const valor=b.forca*Math.exp(-((px-b.x)**2/(2*(b.rx*.75)**2)+(py-b.y)**2/(2*(b.ry*.75)**2)));
      maior=Math.max(maior,valor);soma+=valor;
    }
    // Núcleos mais próximos e bordas abertas: evita tanto o tapete uniforme
    // de árvores afastadas quanto a volta aos quatro aglomerados iniciais.
    let d=Math.min(.90,Math.max(.10,.12+maior*1.20+soma*.10+(ruido(x/16,y/16,3)-.5)*.18));
    d *= clamp01((dt - trilha.largura * 0.7) / 10);
    d *= clamp01((f - 1.15) / 0.8);
    return d;
  };

  // Relevo em TERRAÇOS: uma elevação contínua (colina no lado oposto ao lago,
  // baixada em volta da água) é fatiada em platôs planos separados por barrancos
  // íngremes de DEGRAU metros. Onde a trilha cruza um degrau, vira rampa.
  const DEGRAU = 4.5, PAREDE = 0.65; // altura do degrau e largura do paredão (m)
  const elevacao = (x, y, f=fatorLago(x,y)) => {
    const px=x/(largura/180),py=y/(altura/120);
    // Crista, ombro e saia com contornos próprios: não são anéis de um cone.
    let c=elevacaoPlanejada(px,py);
    c=lerp(0.5,c,suave(1.12,1.7,f));
    c=lerp(0.5,c,1-suave(altura+2,altura+8,y));
    return Math.min(3.45,Math.max(0.3,c));
  };
  /** Altura (m) a partir da elevação c e do gradiente dela (níveis por metro). */
  const alturaDe = (x, y, c, grad, f=fatorLago(x,y)) => {
    const nivel = Math.floor(c);
    // Paredão de largura FIXA (PAREDE m): quantos metros faltam até o próximo
    // nível, pelo gradiente — fica vertical mesmo onde o morro é suave.
    const falta = (1 - (c - nivel)) / Math.max(1e-3, grad);
    const degraus = nivel + suave(PAREDE, 0, falta);
    const h = degraus * DEGRAU + (ruidoProjeto(x / 9, y / 9, 2) - 0.5) * 0.14;
    return h - (1 - suave(0.6, 1.08, f)) * 2.4; // lago escavado
  };
  const alturaExata = (x, y) =>
    alturaDe(x, y, elevacao(x, y), Math.hypot(elevacao(x + 0.5, y) - elevacao(x - 0.5, y), elevacao(x, y + 0.5) - elevacao(x, y - 0.5)));

  // Grade de alturas (0,5 m) cobrindo o mapa, a borda e o viveiro: calculada UMA vez;
  // depois a altitude é só consulta (bilinear). Mantém o carregamento rápido.
  const G = { x0: -50, y0: -50, passo: 0.5 };
  G.nx = Math.round((largura + 100) / G.passo) + 1;
  G.ny = Math.round((altura + 100) / G.passo) + 1;
  const C = new Float32Array(G.nx * G.ny), H = new Float32Array(G.nx * G.ny);
  const FL=new Float32Array(H.length),DT=new Float32Array(H.length),DN=new Float32Array(H.length);
  for(let j=0;j<G.ny;j++)for(let i=0;i<G.nx;i++) {
    const k=j*G.nx+i,x=G.x0+i*G.passo,y=G.y0+j*G.passo;
    FL[k]=fatorLago(x,y);DT[k]=distTrilha(x,y);DN[k]=densidade(x,y,distPlantio(x,y),FL[k]);C[k]=elevacao(x,y,FL[k]);
  }
  for (let j = 0; j < G.ny; j++)
    for (let i = 0; i < G.nx; i++) {
      const k = j * G.nx + i;
      const gx = C[j * G.nx + Math.min(G.nx - 1, i + 1)] - C[j * G.nx + Math.max(0, i - 1)];
      const gy = C[Math.min(G.ny - 1, j + 1) * G.nx + i] - C[Math.max(0, j - 1) * G.nx + i];
      H[k] = alturaDe(G.x0 + i * G.passo, G.y0 + j * G.passo, C[k], Math.hypot(gx, gy),FL[k]);
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
  const alturasNaturais=plano.ajusteTrilha?H.slice():null;
  const cursoNatural=plano.ajusteTrilha?riacho.pontos.map(p=>({...p})):null;
  const percursos=organizarPercursos({trilha,riacho,lago,fatorLago,altitude,grade:G,alturas:H,DEGRAU,plano});
  const {distRiacho,larguraRiacho,perfilTrilha,pontes,ponte}=percursos;
  if(ponte)Object.assign(plano.locais.find(l=>l.id==="ponte"),{x:ponte.x,y:ponte.y,largura:ponte.comprimento,profundidade:ponte.largura});

  /** Inclinação (m/m) — barrancos passam de ~0,6. */
  const declive = (x, y) => Math.hypot(altitude(x + 0.5, y) - altitude(x - 0.5, y), altitude(x, y + 0.5) - altitude(x, y - 0.5));
  const ingreme = (x, y) => declive(x, y) > 0.45 || declive(x + 1.2, y) > 0.45 || declive(x - 1.2, y) > 0.45 || declive(x, y + 1.2) > 0.45 || declive(x, y - 1.2) > 0.45;

  const reservado = (x,y) => plano.locais.some(l=>l.status==="proposto" && Math.abs(x-l.x)<l.largura/2+1 && Math.abs(y-l.y)<l.profundidade/2+1);
  const sobPassarela=(x,y)=>plano.passarela&&distSegmento(x,y,plano.passarela.inicio,plano.passarela.fim)<plano.passarela.largura/2+1.2;
  const fora = (x, y) => !sobPassarela(x,y) && !reservado(x,y) && fatorLago(x, y) > 1.12 && distPlantio(x, y) > trilha.largura * 0.9 && !ingreme(x, y) && distRiacho(x, y) > larguraRiacho(x,y) * 0.5 + 1.6;
  const nascer = (d) => clamp01(0.85 - d * 0.75 + (rng() - 0.5) * 0.35);
  const objetos = [];

  // Sorteio próprio: o novo desenho do plantio não interfere no terreno.
  const rngPlantio=criarRng(semente^0x731a2);
  const livreParaArvore=(x,y)=>fora(x,y)&&distTrilha(x,y)>4.6&&Math.hypot(x-pesca.x,y-pesca.y)>8&&
    pontes.every(p=>Math.hypot(x-p.x,y-p.y)>9.5)&&riacho.quedas.every(q=>Math.hypot(x-q.x,y-q.y)>6.5)&&
    ![[-3,0],[3,0],[0,-3],[0,3]].some(([dx,dy])=>ingreme(x+dx,y+dy));
  for (const p of poisson({
    largura, altura, raioMin: 7.8, rng:rngPlantio,
    raio: (x, y) => lerp(13.7,7.8,suave(.18,.65,densidade(x,y))),
    // Sem limiar que condene todos os platôs fora dos quatro bosques antigos.
    aceitar: (x, y) => livreParaArvore(x,y),
  })) {
    const d = densidade(p.x, p.y);
    objetos.push({ tipo: "arvore", x: p.x, y: p.y, d, zona: fino(p.x / 40, p.y / 40, 2), lago: fatorLago(p.x, p.y), escala: lerp(0.8, 1.15, rngPlantio()), nasce: nascer(d), giro: rngPlantio() * 6.28 });
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
    largura, altura, raioMin: 6.5, rng:rngPlantio,
    raio: (x, y) => lerp(12, 6.5, densidade(x, y)),
    // Arbusto não nasce colado ao tronco de uma árvore (espaço do indivíduo).
    aceitar: (x, y) => fora(x, y) && distTrilha(x,y)>3.2 && Math.hypot(x-pesca.x,y-pesca.y)>6 &&
      densidade(x, y)>.18 && fino(x/14,y/14,2)>.38 && !pertoDeArvore(x, y, 4),
  })) {
    const d = densidade(p.x, p.y);
    objetos.push({ tipo: "arbusto", x: p.x, y: p.y, d, escala: lerp(0.7, 1.2, rng()), nasce: clamp01(nascer(d) - 0.1), giro: rng() * 6.28 });
  }
  // Imperfeições: pedras (inclusive na margem), tocos e troncos caídos.
  for (let i = 0; i < Math.round(22 * areaRel); i++) {
    const x = rng() * largura, y = rng() * altura;
    if (!fora(x, y)) continue;
    objetos.push({ tipo: rng() < 0.7 ? "pedra" : rng() < 0.5 ? "toco" : "tronco", x, y, escala: lerp(0.6, 1.4, rng()), nasce: 0, giro: rng() * 6.28 });
  }
  for (let i = 0; i < 12; i++) {
    const a = rng() * 6.28, r = lago.raio(a) * lerp(1.04, 1.16, rng());
    objetos.push({ tipo: "pedra", x: lago.cx + Math.cos(a) * lago.rx * r, y: lago.cy + Math.sin(a) * lago.ry * r, escala: lerp(0.5, 1.1, rng()), nasce: 0, giro: rng() * 6.28 });
  }
  // Flores em manchas nas clareiras ensolaradas.
  for (let i = 0; i < Math.round(900 * areaRel); i++) {
    const x = rng() * largura, y = rng() * altura;
    if (!fora(x, y) || densidade(x, y) > 0.25 || fino(x / 12, y / 12, 2) < 0.55) continue;
    objetos.push({ tipo: "flor", x, y, cor: Math.floor(rng() * 4), nasce: 0 });
  }

  // Alteração localizada: não sorteia novamente as árvores do interior.
  const casa=plano.locais.find(l=>l.id==="casa-madeira");
  const naReservaCasa=(x,y)=>casa&&Math.abs(x-casa.x)<casa.largura/2+casa.margemVegetacao&&Math.abs(y-casa.y)<casa.profundidade/2+casa.margemVegetacao;
  const arvoresExistentes=objetos.filter(o=>o.tipo==="arvore");
  for(const [indice,zona] of (plano.reforcosPlantio??[]).entries()) {
    const rngBorda=criarRng(semente^Math.imul(indice+1,0x4b01a3));
    const candidatos=poisson({largura:zona.x1-zona.x0,altura:zona.y1-zona.y0,raioMin:8.3,raio:()=>8.6,rng:rngBorda,
      aceitar:(px,py)=>{
        const x=zona.x0+px,y=zona.y0+py;
        return !naReservaCasa(x,y)&&altitude(x,y)>3.8&&livreParaArvore(x,y)&&
          arvoresExistentes.every(o=>Math.hypot(o.x-x,o.y-y)>=8.3);
      }});
    for(const p of candidatos) {
      const x=zona.x0+p.x,y=zona.y0+p.y,d=densidade(x,y);
      const arvore={tipo:"arvore",x,y,d,zona:fino(x/40,y/40,2),lago:fatorLago(x,y),escala:lerp(.80,1.05,rngBorda()),nasce:Math.max(0,.7-d*.5),giro:rngBorda()*6.28,reforcoVisual:zona.id};
      objetos.push(arvore);arvoresExistentes.push(arvore);
    }
  }
  // Preenche os vazios dentro das faixas corrigidas. O candidato mais
  // distante dos troncos existentes entra primeiro, sem alinhar fileiras.
  for(const [indice,zona] of plano.complementosPlantio.entries()) {
    const rngFaixa=criarRng(semente^Math.imul(indice+1,0x82aa31));
    const candidatos=[];
    for(let i=0;i<1800;i++){
      const x=lerp(zona.x0,zona.x1,rngFaixa()),y=lerp(zona.y0,zona.y1,rngFaixa()),h=altitude(x,y);
      if(naReservaCasa(x,y)||h<3.8||h>5||!livreParaArvore(x,y))continue;
      const distancia=Math.min(...arvoresExistentes.map(o=>Math.hypot(o.x-x,o.y-y)));
      if(distancia>=8.3)candidatos.push({x,y,distancia});
    }
    while(candidatos.length){
      candidatos.sort((a,b)=>b.distancia-a.distancia);
      const p=candidatos.shift();
      if(p.distancia<8.3)break;
      const {x,y}=p,d=densidade(x,y);
      const especiePaisagem=["carvalho","carvalho","carvalho","pinheiro","ipeRoxo"][Math.floor(rngFaixa()*5)];
      const arvore={tipo:"arvore",x,y,d,zona:fino(x/40,y/40,2),lago:fatorLago(x,y),escala:lerp(.88,1.08,rngFaixa()),nasce:.25,giro:rngFaixa()*6.28,reforcoVisual:zona.id,complementoVisual:true,especiePaisagem};
      objetos.push(arvore);arvoresExistentes.push(arvore);
      for(const q of candidatos)q.distancia=Math.min(q.distancia,Math.hypot(q.x-x,q.y-y));
    }
  }
  // Conserva a sequência do sorteio das espécies, inclusive dos indivíduos
  // retirados: abrir a clareira não transforma as outras árvores do mapa.
  const sequenciaPlantio=objetos.filter(o=>o.tipo==="arvore"||o.tipo==="arbusto");
  // Retira árvores, arbustos e objetos da reserva, mantendo o gramado natural.
  for(let i=objetos.length-1;i>=0;i--)if(naReservaCasa(objetos[i].x,objetos[i].y))objetos.splice(i,1);
  // Marcos (a Grande Árvore): círculo livre de outras árvores, arbustos e objetos, para a copa e as raízes caberem.
  const marcos=plano.locais.filter(l=>l.raioReserva);
  for(let i=objetos.length-1;i>=0;i--)if(marcos.some(l=>Math.hypot(objetos[i].x-l.x,objetos[i].y-l.y)<l.raioReserva))objetos.splice(i,1);

  let percursosFinais=percursos;
  const objetosRetirados=[];
  if(plano.ajusteTrilha){
    // Recomeça do chão natural: a vala e a marca do caminho antigo somem,
    // em vez de ficarem sob uma segunda escada ou de serem apenas escondidas.
    H.set(alturasNaturais);trilha.pontos=plano.trilha;
    riacho.pontos=cursoNatural;
    percursosFinais=organizarPercursos({trilha,riacho,lago,fatorLago,altitude,grade:G,alturas:H,DEGRAU,plano});
    for(let j=0;j<G.ny;j++)for(let i=0;i<G.nx;i++)DT[j*G.nx+i]=distTrilha(G.x0+i*G.passo,G.y0+j*G.passo);
    for(let i=objetos.length-1;i>=0;i--){
      const o=objetos[i],folga=o.tipo==='arvore'?4.6:o.tipo==='arbusto'?3.2:trilha.largura*.9;
      if(distTrilha(o.x,o.y)<=folga){objetosRetirados.push({...o});objetos.splice(i,1);}
    }
    if(percursosFinais.ponte)Object.assign(plano.locais.find(l=>l.id==='ponte'),{x:percursosFinais.ponte.x,y:percursosFinais.ponte.y});
  }
  return { semente, plano, largura, altura, areaRel, grade:{...G,FL,DT,DN}, lago, fatorLago, trilha, distTrilha, densidade, altitude, declive, ingreme, DEGRAU, riacho, ...percursosFinais, objetos, sequenciaPlantio, objetosRetirados, ruido, fino };
}
