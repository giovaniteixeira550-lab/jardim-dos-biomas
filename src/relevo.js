/** Materiais de solo e geometrias das obras de pedra. */
import * as THREE from "three";
import { RAMPAS } from "./paleta.js";
export { criarMaterialRelevo } from "./solo.js";

const EPS = 1e-4;
const misturar = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: a.s + (b.s - a.s) * t, ...(a.nx!==undefined ? {nx:a.nx+(b.nx-a.nx)*t,ny:a.ny+(b.ny-a.ny)*t} : {}) });
const distancia = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const tomPedra = (n) => RAMPAS.pedra[2 + (Math.abs(Math.floor(n)) % 3 === 0 ? 1 : 0)];

/** Normais no chão, com união em meia-esquadria para não abrir fendas em curvas. */
function bordas(pontos, meiaLargura, afastamento = 0) {
  return pontos.map((p, i) => {
    if(p.nx!==undefined) return [-1,1].map(lado=>({x:p.x+p.nx*(afastamento+lado*meiaLargura),z:p.y+p.ny*(afastamento+lado*meiaLargura)}));
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

/** Refina o corredor conservando as mesmas bordas nas juntas entre degraus. */
function refinarFaixa(pontos) {
  const refinados=[pontos[0]];
  for(let i=1;i<pontos.length;i++) {
    const n=Math.max(1,Math.ceil(distancia(pontos[i-1],pontos[i])/.125));
    for(let j=1;j<=n;j++) refinados.push(misturar(pontos[i-1],pontos[i],j/n));
  }
  return refinados;
}

/** Laje regular: face dividida em pedras menores e nariz com três faces de chanfro. */
function lajeEscada(trajeto, largura, topo, frentes) {
  const pontos=refinarFaixa(trajeto), externas=bordas(pontos,largura/2);
  const internas=bordas(pontos,largura/2-.045), bisel=.045, base=topo-.46;
  // O recuo é perpendicular à frente do piso e igual nos quatro cantos.
  for(const inicio of [true,false]) {
    if(!frentes.includes(inicio?'inicio':'fim'))continue;
    const k=inicio?0:pontos.length-1,vizinho=inicio?1:k-1;
    const d=Math.max(EPS,distancia(pontos[k],pontos[vizinho]));
    for(const p of internas[k]) {
      p.x+=(pontos[vizinho].x-pontos[k].x)/d*.055;
      p.z+=(pontos[vizinho].y-pontos[k].y)/d*.055;
    }
  }
  const vertices=[],cores=[];
  const piso=new THREE.Color(RAMPAS.pedra[3]), espelho=new THREE.Color(RAMPAS.pedra[1]);
  const nariz=new THREE.Color(RAMPAS.pedra[4]), junta=new THREE.Color(RAMPAS.pedra[2]);
  const v=(p,h)=>[p.x,h,p.z];
  const entre=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
  const quad=(a,b,c,d,cor)=>{
    for(let tri of [[a,b,c],[a,c,d]]) {
      if(tri.every(p=>p[1]>=topo-.013&&p[1]<=topo+EPS)) {
        const [p,q,r]=tri;
        if((q[2]-p[2])*(r[0]-p[0])-(q[0]-p[0])*(r[2]-p[2])<0)tri=[p,r,q];
      }
      for(const p of tri){vertices.push(...p);cores.push(cor.r,cor.g,cor.b);}
    }
  };
  const colunas=4, meiaJunta=.018/largura;
  for(let i=0;i<pontos.length-1;i++) {
    const e=externas[i],f=externas[i+1],a=internas[i],b=internas[i+1];
    // Quatro pedras alinhadas. Juntas rebaixadas substituem os riscos diagonais.
    const cortes=[0,...[1,2,3].flatMap(j=>[j/colunas-meiaJunta,j/colunas+meiaJunta]),1];
    for(let j=0;j<cortes.length-1;j++) {
      const lo=cortes[j],hi=cortes[j+1],sulco=j%2===1,h=topo-(sulco ? .012 : 0);
      quad(v(entre(a[0],a[1],lo),h),v(entre(a[0],a[1],hi),h),v(entre(b[0],b[1],hi),h),v(entre(b[0],b[1],lo),h),sulco?junta:piso);
      if(sulco)for(const t of [lo,hi]) {
        const p=entre(a[0],a[1],t),q=entre(b[0],b[1],t);
        quad(v(p,h),v(q,h),v(q,topo),v(p,topo),junta);
      }
    }
    for(let lado=0;lado<2;lado++) {
      const q=lado?[e[lado],f[lado],b[lado],a[lado]]:[f[lado],e[lado],a[lado],b[lado]];
      quad(v(q[0],topo-bisel),v(q[1],topo-bisel),v(q[2],topo),v(q[3],topo),piso);
      quad(v(q[0],base),v(q[1],base),v(q[1],topo-bisel),v(q[0],topo-bisel),espelho);
    }
    quad(v(e[1],base),v(e[0],base),v(f[0],base),v(f[1],base),espelho);
  }
  for(const inicio of [true,false]) {
    const k=inicio?0:pontos.length-1,e=externas[k],n=internas[k],l=inicio?0:1,r=1-l;
    // Frontais menores evitam triângulos largos e dão uma quina uniforme ao degrau.
    const divisao=12;
    for(let j=0;j<divisao;j++) {
      const a=entre(e[l],e[r],j/divisao),b=entre(e[l],e[r],(j+1)/divisao);
      const c=entre(n[l],n[r],j/divisao),d=entre(n[l],n[r],(j+1)/divisao);
      quad(v(a,base),v(b,base),v(b,topo-bisel),v(a,topo-bisel),espelho);
      for(let faixa=0;faixa<3;faixa++) {
        const t=faixa/3,u=(faixa+1)/3;
        const h0=topo-bisel+bisel*Math.sin(t*Math.PI/2),h1=topo-bisel+bisel*Math.sin(u*Math.PI/2);
        quad(v(entre(a,c,t),h0),v(entre(b,d,t),h0),v(entre(b,d,u),h1),v(entre(a,c,u),h1),frentes.includes(inicio?'inicio':'fim')?nariz:piso);
      }
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cores,3));
  geo.computeVertexNormals();geo.computeBoundingSphere();return geo;
}

/** Borda baixa contínua, com cabeças rebaixadas; acompanha a subida sem serrilhar. */
function bordaEscada(pontos, larguraLivre, lado) {
  const externas = bordas(pontos, 0.16, lado * (larguraLivre / 2 + 0.22));
  const internas = bordas(pontos, 0.125, lado * (larguraLivre / 2 + 0.22));
  const vertices = [], cores = [];
  const alturas = pontos.map((p,i)=>{
    const vizinhos=pontos.filter(q=>Math.abs(q.s-p.s)<=1);
    return vizinhos.reduce((s,q)=>s+q.h,0)/vizinhos.length;
  });
  const topo = pontos.map((p, i) => alturas[i] + (i === 0 || i === pontos.length - 1 ? 0.11 : 0.25));
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
  const origem = mundo.trilha?.amostras ?? [];
  // Uma única referência transversal impede cada laje de girar por conta própria.
  const referencia=bordas(origem,1);
  const A=origem.map((p,i)=>({...p,nx:referencia[i][1].x-p.x,ny:referencia[i][1].z-p.y}));
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
        add(escada, lajeEscada(pontos, largura + 0.025, A[j].h, frentes), `degrau-${numeroPiso++}`, { tipo: "degrau", topo: A[j].h, s0: antes.s, s1: depois.s, larguraLivre: largura, frentes });
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
