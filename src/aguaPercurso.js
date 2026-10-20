/**
 * Riacho contínuo e cascatas em degraus reais. A água usa os mesmos pontos do
 * leito: encontros em meia-esquadria fecham as curvas; quedas nunca viram uma
 * tira diagonal. Todos os materiais passam pela luz toon e pela paleta do jogo.
 */
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { RAMPAS } from "./paleta.js";
import { criarRng } from "./mundo.js";
import { criarMaterialRelevo } from "./solo.js";

const EPS = 1e-5;

function geometriaDe(faces) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(faces.pos, 3));
  if (faces.cores) geo.setAttribute("color", new THREE.Float32BufferAttribute(faces.cores, 3));
  if (faces.dist) {
    geo.setAttribute("aDist", new THREE.Float32BufferAttribute(faces.dist, 1));
    geo.setAttribute("aLado", new THREE.Float32BufferAttribute(faces.lado, 1));
    geo.setAttribute("aQueda", new THREE.Float32BufferAttribute(faces.queda, 1));
    geo.setAttribute("aProgresso", new THREE.Float32BufferAttribute(faces.progresso, 1));
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function quad(faces, a, b, c, d, dist0 = 0, dist1 = 0, queda = 0, t0 = 0, t1 = 0, lado0 = -1, lado1 = 1) {
  // A e B são as margens de montante; C e D, as margens de jusante.
  for (const [p, s, v, t] of [[a, lado0, dist0, t0], [c, lado0, dist1, t1], [b, lado1, dist0, t0], [b, lado1, dist0, t0], [c, lado0, dist1, t1], [d, lado1, dist1, t1]]) {
    faces.pos.push(...p);
    if (faces.dist) {
      faces.dist.push(v);
      faces.lado.push(s);
      faces.queda.push(queda);
      faces.progresso.push(t);
    }
  }
}

// Uma lâmina contínua: arco tangente à superfície, corpo abaulado e pé aberto.
// A distância é acumulada pela curva para que os veios atravessem a virada.
function laminaCascata(faces, p, superior, inferior, raio, distBase) {
  const perfil = [];
  for (let j = 0; j <= 8; j++) {
    const angulo = j / 8 * Math.PI / 2;
    perfil.push({ f: -raio + raio * Math.sin(angulo), h: superior - raio * (1 - Math.cos(angulo)), t: j / 8 * 0.14 });
  }
  for (let j = 1; j <= 18; j++) {
    const t = j / 18;
    perfil.push({ f: Math.sin(t * Math.PI * 0.5) * 0.4, h: superior - raio - (superior - raio - inferior) * t, t: 0.14 + t * 0.86 });
  }
  let dist = distBase;
  const ponto = (r, s) => {
    const volume = Math.sin(r.t * Math.PI);
    const largura = 1 - volume * 0.065 + Math.pow(r.t, 9) * 0.07;
    const veio = Math.sin(s * 13 + r.t * 8) * 0.035 * volume;
    const frente = r.f + (1 - s * s) * volume * 0.14 + veio;
    return [p.x + p.nx * s * largura + p.dx * frente, r.h, p.z + p.nz * s * largura + p.dz * frente];
  };
  for (let j = 0; j < perfil.length - 1; j++) {
    const a = perfil[j], b = perfil[j + 1], proxima = dist + Math.hypot(b.f - a.f, b.h - a.h);
    for (let k = 0; k < 16; k++) {
      const s0 = k / 8 - 1, s1 = (k + 1) / 8 - 1;
      quad(faces, ponto(a, s0), ponto(a, s1), ponto(b, s0), ponto(b, s1), dist, proxima, 1, a.t, b.t, s0, s1);
    }
    dist = proxima;
  }
  return dist;
}

function quadColorido(faces, a, b, c, d, cor) {
  const inicio = faces.pos.length / 3;
  quad(faces, a, b, c, d);
  const tinta = new THREE.Color(cor);
  for (let i = inicio; i < faces.pos.length / 3; i++) faces.cores.push(tinta.r, tinta.g, tinta.b);
}

function materialCorrenteza(toon,lago) {
  const mat = toon({ color: RAMPAS.agua[3], side: THREE.DoubleSide });
  mat.name = "agua-correnteza-toon";
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uCostaLago={value:lago.contorno.map(p=>new THREE.Vector2(p.x,p.y))};
    shader.uniforms.uCaixaLago={value:new THREE.Vector4(lago.cx,lago.cy,lago.rx*1.35,lago.ry*1.35)};
    shader.uniforms.uBorda = { value: new THREE.Color(RAMPAS.agua[4]) };
    shader.uniforms.uEspuma = { value: new THREE.Color(RAMPAS.agua[5]) };
    shader.uniforms.uAguaFunda = { value: new THREE.Color(RAMPAS.agua[2]) };
    mat.userData.shader = shader;
    shader.vertexShader = "uniform float uTime; varying vec2 vPlanoAgua; attribute float aDist; attribute float aLado; attribute float aQueda; attribute float aProgresso; varying float vProgresso; varying float vDist; varying float vLado; varying float vQueda;\n" +
      shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvPlanoAgua=position.xz; vDist = aDist; vLado = aLado; vQueda = aQueda; vProgresso = aProgresso; transformed += normal * sin(aDist * 8.0 - uTime * 6.0 + aLado * 9.0) * 0.025 * aQueda * sin(aProgresso * 3.14159265);");
    shader.fragmentShader = `uniform vec2 uCostaLago[${lago.contorno.length}]; uniform vec4 uCaixaLago; varying vec2 vPlanoAgua;\n` + "uniform float uTime; uniform vec3 uBorda; uniform vec3 uEspuma; uniform vec3 uAguaFunda; varying float vProgresso; varying float vDist; varying float vLado; varying float vQueda;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // A superfície do rio termina na costa exata: não há duas águas
        // coplanares competindo no interior do lago.
        if(vQueda<.5 && abs(vPlanoAgua.x-uCaixaLago.x)<uCaixaLago.z && abs(vPlanoAgua.y-uCaixaLago.y)<uCaixaLago.w){
          bool dentro=false;vec2 b=uCostaLago[${lago.contorno.length-1}];
          for(int i=0;i<${lago.contorno.length};i++){vec2 a=uCostaLago[i];if((a.y>vPlanoAgua.y)!=(b.y>vPlanoAgua.y)){if(vPlanoAgua.x<(b.x-a.x)*(vPlanoAgua.y-a.y)/(b.y-a.y)+a.x)dentro=!dentro;}b=a;}
          if(dentro)discard;
        }
        // Cortina: a coordenada lateral deformada produz fios de larguras
        // diferentes; o desenho acompanha a água, sem uma grade de pontos.
        float u = vLado * 0.5 + 0.5;
        float faixas = u * 12.0 + sin(u * 14.0) * 0.32 + sin(u * 33.0) * 0.15;
        float canal = floor(faixas);
        float r = fract(sin(canal * 71.73 + 13.6) * 43758.5453);
        float margem = step(0.982, abs(vLado));
        vec3 luzAgua = vec3(0.0);
        if (vQueda > 0.5) {
          float lado = abs(vLado);
          float curva = smoothstep(0.0, 0.18, vProgresso);
          float veios = sin(faixas * 6.2831853 + sin(vDist * 1.8 - uTime * 2.4) * 0.65);
          float viagem = vDist * 1.7 - uTime * 3.8;
          float pulso = sin(viagem + vLado * 9.0 + sin(vLado * 18.0));
          vec3 corQueda = lado < 0.58 ? uAguaFunda : diffuseColor.rgb;
          corQueda = mix(corQueda, uBorda, curva * (0.18 + step(0.48, veios) * 0.35));
          float fio = step(0.72, veios) * smoothstep(0.15, 0.75, pulso) * curva;
          // O progresso é local a CADA queda; topo e base não dependem da
          // distância total do rio nem de um fract que cria faixas repetidas.
          float topo = (1.0 - smoothstep(0.04, 0.24, vProgresso)) * smoothstep(-0.3, 0.8, sin(vLado * 24.0 - uTime * 1.3));
          float impacto = smoothstep(0.72, 1.0, vProgresso) * (0.45 + 0.55 * smoothstep(-0.6, 0.5, pulso));
          float borda = smoothstep(0.83, 1.0, lado) * smoothstep(-0.2, 0.7, pulso);
          corQueda = mix(corQueda, uEspuma, max(fio * 0.72, max(topo * 0.85, max(impacto * 0.96, borda * 0.7))));
          diffuseColor.rgb = corQueda;
          luzAgua = corQueda * 0.1;
        } else {
          // Trecho calmo na mesma linguagem do lago: canal fundo chapado no meio, faixa rasa
          // nas laterais com borda clara quebrada, e traços curtos que descem com a correnteza.
          float lado=abs(vLado);
          // A corrente se curva e se abre em veios irregulares, em vez de repetir ladrilhos.
          float desvio=sin(vDist*.18+vLado*3.1)*.095+sin(vDist*.47-vLado*6.3)*.035;
          float ondula=sin(vDist*.32+vLado*2.4)*.048+sin(vDist*.13)*.035;
          float veios=sin((vLado+desvio)*11.8+sin(vDist*.23-uTime*.36)*.85);
          float ilhas=sin(vDist*.48-vLado*6.7-uTime*.13)*sin(vDist*.19+vLado*13.1);
          vec3 corRio=lado<.55+ondula?uAguaFunda:diffuseColor.rgb;
          // Sombras líquidas e reflexos fragmentados, sempre usando a paleta original.
          if(lado<.82 && veios<-.74 && ilhas>.08)corRio=mix(corRio,uAguaFunda,.56);
          if(lado<.76 && veios>.82 && ilhas>.28)corRio=mix(corRio,uBorda,.65);
          float sorteBorda=fract(sin(floor(vDist*1.7)*12.9898)*43758.5453);
          if(lado>.9+ondula*.5&&sorteBorda>.25)corRio=uBorda;
          float faixaRio=floor(((vLado+desvio)*.5+.5)*9.);
          float sorteFaixa=fract(sin(faixaRio*78.233+5.1)*43758.5453);
          float viagem=vDist*.38-uTime*(.42+sorteFaixa*.30)+sorteFaixa*9.+sin(vDist*.27+vLado*5.)*.24;
          float celula=floor(viagem),sorte=fract(sin(celula*91.31+faixaRio*17.7)*15731.743);
          float traco=step(fract(viagem),.22+sorte*.25)*step(.55,sorte);
          float centroFaixa=abs(fract(((vLado+desvio)*.5+.5)*9.)-.5);
          if(traco>.5&&centroFaixa<.09&&lado<.78&&ilhas>.02)corRio=lado<.55+ondula?diffuseColor.rgb:uBorda;
          diffuseColor.rgb=corRio;
          luzAgua = diffuseColor.rgb * 0.1;
        }`,
      ).replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += luzAgua;")
        // Mesmo alfa baixo do lago: a água sai chapada, sem o pontilhado Bayer.
        .replace("#include <opaque_fragment>", "outgoingLight = mix(outgoingLight, diffuseColor.rgb, vQueda * 0.32);\n#include <opaque_fragment>\ngl_FragColor.a = 0.05;");
  };
  mat.customProgramCacheKey = () => "agua-percurso-curva-6-"+lago.contorno.length;
  return mat;
}

/**
 * Pontos usam x/y para o plano do mapa e agua para a altura. Dois pontos no
 * mesmo x/y com alturas diferentes representam os dois lados exatos de uma
 * queda; saltos entre pontos separados também recebem uma cortina vertical.
 */
export function criarAguaPercurso(mundo, materialToon) {
  const grupo = new THREE.Group();
  grupo.name = "agua-percurso";
  grupo.userData.materiaisAnimados = [];
  grupo.userData.quedas = [];
  const pontos = (mundo.riacho?.pontos ?? []).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.agua));
  if (pontos.length < 2) return grupo;
  const larguraBase = mundo.riacho.largura ?? 3.2;
  const secoes = pontos.map((p, i) => {
    const larguraLocal = Number.isFinite(p.largura) && p.largura > 0 ? p.largura : larguraBase;
    const meia = larguraLocal * 0.5;
    // Ignora a distância vertical ao procurar a direção: uma cascata pode ter
    // dois pontos consecutivos na mesma posição horizontal.
    let a = i - 1, b = i + 1;
    while (a >= 0 && Math.hypot(p.x - pontos[a].x, p.y - pontos[a].y) < EPS) a--;
    while (b < pontos.length && Math.hypot(p.x - pontos[b].x, p.y - pontos[b].y) < EPS) b++;
    const anterior = pontos[a] ?? p, seguinte = pontos[b] ?? p;
    const d0 = new THREE.Vector2(p.x - anterior.x, p.y - anterior.y).normalize();
    const d1 = new THREE.Vector2(seguinte.x - p.x, seguinte.y - p.y).normalize();
    if (d0.lengthSq() < EPS) d0.copy(d1);
    if (d1.lengthSq() < EPS) d1.copy(d0);
    if (d0.lengthSq() < EPS) {
      d0.set(1, 0);
      d1.set(1, 0);
    }
    const n0 = new THREE.Vector2(-d0.y, d0.x), n1 = new THREE.Vector2(-d1.y, d1.x);
    const normal = n0.clone().add(n1).normalize();
    if (normal.lengthSq() < EPS) normal.copy(n1);
    const comprimento = Math.min(meia * 1.5, meia / Math.max(0.35, normal.dot(n1)));
    normal.multiplyScalar(comprimento);
    return { x: p.x, z: p.y, h: p.agua, meia, nx: normal.x, nz: normal.y, dx: d1.x, dz: d1.y };
  });
  const fita = { pos: [], dist: [], lado: [], queda: [], progresso: [] };
  const cortinas = { pos: [], dist: [], lado: [], queda: [], progresso: [] };
  const espuma = { pos: [] };
  const labios = { pos: [] };
  const margens = { pos: [], cores: [] };
  const gramaMargens = { pos: [], cores: [] };
  // Barranco natural: faixa contínua ao longo do curso, da água até o gramado (~2 m), seguindo o terreno.
  // Cobre o corte do canal (que a grade de 0,5 m desenhava em dentes) e recebe a pintura de margem do solo.
  const barranco = { pos: [], cores: [], agua: [] };
  const S = RAMPAS.salvia, corGrama = (x, z, y) => {
    const n1 = mundo.ruido ? mundo.ruido(x / 22, z / 22 + 9, 3) : 0.5;
    let idx = (n1 < 0.5 ? 3 : 4) + Math.floor(Math.max(0, y + 0.6) / (mundo.DEGRAU ?? 4.5)) - 1;
    const c = new THREE.Color(S[Math.max(0, Math.min(S.length - 1, idx))]);
    const d = mundo.densidade ? mundo.densidade(x, z) : 0, t = Math.max(0, Math.min(1, (d - 0.25) / 0.65));
    return c.lerp(new THREE.Color(S[1]), Math.round(t * t * (3 - 2 * t) * 2) / 2 * 0.7);
  };
  const OFFSETS = [0.1, 0.25, 0.45, 0.7, 0.95, 1.25, 1.6, 1.95];
  const secaoBarranco = (p, lado) => {
    const nl = Math.hypot(p.nx, p.nz) || 1, ux = p.nx / nl * lado, uz = p.nz / nl * lado;
    const bx = p.x + p.nx * lado, bz = p.z + p.nz * lado;
    // Altura do terreno: a maior numa pequena vizinhança (ao longo e através do curso), para o corte do canal
    // nunca furar o barranco entre uma seção e a próxima.
    const alt = (sd) => {
      if (!mundo.altitude) return p.h;
      let h = -Infinity;
      for (const [ta, tc] of [[0, 0], [-0.9, 0], [0.9, 0], [-0.45, 0.25], [0.45, 0.25], [0, -0.2]]) h = Math.max(h, mundo.altitude(bx + ux * (sd + tc) + p.dx * ta, bz + uz * (sd + tc) + p.dz * ta));
      return h;
    };
    const topo = alt(1.95), pts = [[bx, p.h - 0.55, bz, -0.6], [bx, p.h - 0.04, bz, -0.08]];
    for (const sd of OFFSETS) {
      const t = Math.max(0, Math.min(1, (sd - 0.1) / 1.5)), alvo = p.h + 0.02 + (topo - p.h - 0.02) * t * t * (3 - 2 * t);
      const y = sd >= 1.95 ? topo + 0.03 : Math.max(alvo, alt(sd) + 0.07);
      pts.push([bx + ux * sd, y, bz + uz * sd, sd - 0.08]);
    }
    return pts;
  };
  const ligarBarranco = (sa, sb) => {
    for (let k = 0; k < sa.length - 1; k++) {
      const v = [sa[k], sb[k], sa[k + 1], sb[k + 1]];
      for (const tri of [[0, 1, 2], [1, 3, 2]]) for (const i of tri) {
        const [x, y, z, a] = v[i]; barranco.pos.push(x, y, z); barranco.agua.push(a);
        const c = corGrama(x, z, y); barranco.cores.push(c.r, c.g, c.b);
      }
    }
  };
  // Recorta somente a superfície antes do arco. O terreno e o barranco
  // continuam nas coordenadas originais do projeto.
  for (let i = 0; i < secoes.length - 1; i++) {
    const a = secoes[i], b = secoes[i + 1], altura = a.h - b.h;
    if (altura > 0.45 || (Math.hypot(a.x - b.x, a.z - b.z) < EPS && altura > 0.025)) {
      const raio = Math.min(0.85, altura * 0.22);
      a.raioQueda = raio;
      const entrada = { ...b, x: b.x - b.dx * raio, z: b.z - b.dz * raio, h: a.h };
      // O arco ocupa mais de uma amostra do rio. Colapsa apenas as seções
      // internas de água na entrada comum; barrancos usam as seções originais.
      for (let j = i; j >= 0 && Math.abs(secoes[j].h - a.h) < EPS; j--) {
        if (Math.hypot(secoes[j].x - b.x, secoes[j].z - b.z) > raio) break;
        secoes[j].corteAgua = entrada;
      }
    }
  }
  const bordas = (p, h = p.h) => {
    p = p.corteAgua ?? p;
    const x = p.x, z = p.z;
    return [[x + p.nx, h, z + p.nz], [x - p.nx, h, z - p.nz]];
  };
  let percurso = 0;
  for (let i = 0; i < secoes.length - 1; i++) {
    const a = secoes[i], b = secoes[i + 1];
    const distancia = Math.hypot(b.x - a.x, b.z - a.z);
    const desnivel = Math.max(0, a.h - b.h);
    // Bordas laterais fechadas compartilham exatamente a meia-esquadria da
    // água. O tampo estreito cobre a interpolação do leito, sem cruzar o canal.
    for (const lado of [-1, 1]) {
      if(mundo.fatorLago?.((a.x+b.x)/2,(a.z+b.z)/2)<0.99)continue; // a margem segue até dentro da foz, cobrindo o corte do terreno
      const secaoMargem = (p) => {
        const nl = Math.hypot(p.nx, p.nz) || 1;
        const x = p.x + p.nx * lado, z = p.z + p.nz * lado;
        // A costura interna continua exata; o recorte varia só para fora do
        // canal. A função espacial é igual dos dois lados de uma emenda.
        const faixa = 0.59 + (0.5 + 0.5 * Math.sin(p.x * 0.83 - p.z * 0.47 + lado)) * 0.06;
        const recorte = 0.15 + Math.sin(p.x * 0.22 + p.z * 0.17 + lado * 1.7) * 0.025;
        const ox = x + p.nx / nl * faixa * lado, oz = z + p.nz / nl * faixa * lado;
        const externo = mundo.altitude?.(ox, oz);
        const topoExterno = Number.isFinite(externo) ? Math.max(p.h + recorte, Math.min(p.h + 0.65, externo + 0.015)) : p.h + recorte;
        return {
          base: [x, p.h - 0.55, z],
          meio: [x+p.nx/nl*.06*lado, p.h - 0.04, z+p.nz/nl*.06*lado],
          topo: [x+p.nx/nl*.18*lado, p.h + recorte, z+p.nz/nl*.18*lado],
          ombro: [x+p.nx/nl*faixa*.62*lado, p.h+recorte+(topoExterno-p.h-recorte)*.65, z+p.nz/nl*faixa*.62*lado],
          foraBase: [ox, p.h - 0.55, oz], foraTopo: [ox, topoExterno, oz],
        };
      };
      const ma = secaoMargem(a), mb = secaoMargem(b);
      if (distancia > EPS) {
        // Barranco natural no lugar da tira estreita de margem e do ombro de grama liso.
        ligarBarranco(secaoBarranco(a, lado), secaoBarranco(b, lado));
      } else if (desnivel > 0.025) {
        // Na cortina, esta faixa vira uma face rochosa apenas por FORA das
        // duas bordas; o vão entre elas permanece inteiramente de água.
        quadColorido(margens, ma.topo, ma.foraTopo, mb.topo, mb.foraTopo, RAMPAS.pedra[2]);
      }
    }
    const queda = desnivel > 0.45 || (distancia < EPS && desnivel > 0.025);
    const [ae, ad] = bordas(a), [be, bd] = bordas(b);
    if (queda) {
      const raio = a.raioQueda;
      const entrada = { ...b, x: b.x - b.dx * raio, z: b.z - b.dz * raio };
      const [topoE, topoD] = bordas(entrada, a.h);
      if (distancia > EPS) quad(fita, ae, ad, topoE, topoD, percurso, percurso + distancia);
      percurso += distancia;
      percurso = laminaCascata(cortinas, b, a.h, b.h + 0.015, raio, percurso);
      const info = { indice: i + 1, x: b.x, z: b.z, superior: a.h, inferior: b.h, altura: desnivel, largura: b.meia * 2 };
      grupo.userData.quedas.push(info);

      // O lábio anuncia a queda antes da cortina; a lâmina permanece inteira
      // sob o desenho de espuma, inclusive nos pequenos intervalos do arco.
      for (let k = 0; k < 11; k++) {
        if (k === 2 || k === 8) continue;
        const s0 = (k / 11 * 2 - 1) * 0.93, s1 = ((k + 1) / 11 * 2 - 1) * 0.93;
        const pontoLabio = (s, t) => [b.x + b.nx * s + b.dx * t, a.h + 0.028, b.z + b.nz * s + b.dz * t];
        const curva0 = -raio - 0.035 - (1 - s0 * s0) * 0.075, curva1 = -raio - 0.035 - (1 - s1 * s1) * 0.075;
        quad(labios, pontoLabio(s0, curva0 - 0.2), pontoLabio(s1, curva1 - 0.2), pontoLabio(s0, curva0), pontoLabio(s1, curva1));
      }
      // Impacto em meias-luas quebradas; a espuma se abre rio abaixo e fica
      // mais fina e esparsa à medida que se afasta da cortina.
      for (let faixa = 0; faixa < 4; faixa++) {
        const total = 17, afastamento = [0.26, 0.72, 1.24, 1.82][faixa];
        for (let k = 0; k < total; k++) {
          const parte = k / total;
          if (faixa === 0 && (k === 1 || k === total - 2)) continue;
          if (faixa === 1 && ((parte > 0.25 && parte < 0.44) || parte > 0.77)) continue;
          if (faixa === 2 && !(parte > 0.18 && parte < 0.36 || parte > 0.62 && parte < 0.76)) continue;
          if (faixa === 3 && !(parte > 0.32 && parte < 0.53 || parte > 0.7 && parte < 0.83)) continue;
          const lado0 = (k / total * 2 - 1) * 0.9, lado1 = ((k + 1) / total * 2 - 1) * 0.9;
          const ponto = (lado, frente) => {
            const arco = (1 - lado * lado) * [0.24, 0.36, 0.46, 0.56][faixa];
            const dente = Math.sin(lado * 8.1 + faixa * 1.7) * (faixa ? 0.025 : 0.045);
            return [b.x + b.nx * lado + b.dx * (afastamento + arco + frente + dente), b.h + 0.032 + faixa * 0.008, b.z + b.nz * lado + b.dz * (afastamento + arco + frente + dente)];
          };
          const espessura = faixa ? [0, 0.11, 0.075, 0.05][faixa] : 0.22 + (0.5 + 0.5 * Math.sin(k * 1.31)) * 0.12;
          quad(espuma, ponto(lado0, 0), ponto(lado1, 0), ponto(lado0, espessura), ponto(lado1, espessura));
        }
      }
    } else if (distancia > EPS) {
      const comprimento = Math.hypot(be[0] - ae[0], be[1] - ae[1], be[2] - ae[2]);
      if (comprimento < EPS) continue;
      quad(fita, ae, ad, be, bd, percurso, percurso + comprimento);
      percurso += comprimento;
    }
  }

  if (!fita.pos.length && !cortinas.pos.length) return grupo;
  const material = materialCorrenteza(materialToon,mundo.lago);
  grupo.userData.materiaisAnimados.push(material);
  for (const [faces, nome] of [[fita, "superficie-riacho"], [cortinas, "cortinas-cascatas"]]) {
    if (!faces.pos.length) continue;
    const original = geometriaDe(faces);
    original.deleteAttribute("normal");
    const geometria = mergeVertices(original, 0.0001);
    original.dispose();
    geometria.computeVertexNormals();
    const malha = new THREE.Mesh(geometria, material);
    malha.name = nome;
    malha.receiveShadow = true;
    grupo.add(malha);
  }
  for (const [faces, nome] of [[margens, "margens-riacho"], [gramaMargens, "bordas-grama-riacho"]]) {
    if (!faces.pos.length) continue;
    const original = geometriaDe(faces);
    // Normais compartilhadas ao longo da margem, sem iluminar cada
    // triângulo como uma pedrinha independente.
    original.deleteAttribute('normal');
    const geometria = mergeVertices(original, 0.0001);
    original.dispose();
    geometria.computeVertexNormals();
    geometria.userData = { origem: "aguaPercurso", tipo: nome, larguraFaixa: 0.65, secoes: secoes.length };
    const matMargem = materialToon({ vertexColors: true, side: THREE.DoubleSide });
    matMargem.name = `${nome}-toon`;
    const malha = new THREE.Mesh(geometria, matMargem);
    malha.name = nome;
    malha.receiveShadow = true;
    grupo.add(malha);
  }
  if (barranco.pos.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(barranco.pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(barranco.cores, 3));
    geo.setAttribute("aAgua", new THREE.Float32BufferAttribute(barranco.agua, 1));
    const unida = mergeVertices(geo, 0.0001); geo.dispose(); unida.computeVertexNormals();
    unida.setAttribute("aNormalSombra", unida.getAttribute("normal"));
    // A ordem dos vértices inverte de um lado do curso para o outro: desenha as duas faces.
    const matBarranco = criarMaterialRelevo(materialToon); matBarranco.side = THREE.DoubleSide;
    const malha = new THREE.Mesh(unida, matBarranco);
    malha.name = "barranco-natural-riacho"; malha.receiveShadow = true;
    grupo.add(malha);
  }
  if (espuma.pos.length || labios.pos.length) {
    const matEspuma = materialToon({ color: RAMPAS.agua[5], emissive: RAMPAS.agua[4], emissiveIntensity: 0.18, side: THREE.DoubleSide });
    matEspuma.name = "espuma-cascata-animada";
    matEspuma.onBeforeCompile = shader => {
      shader.uniforms.uTime = { value: 0 };
      matEspuma.userData.shader = shader;
      shader.vertexShader = "uniform float uTime; varying vec2 vEspuma;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvEspuma=position.xz; transformed.y += sin(position.x*4.0+position.z*3.0-uTime*2.5)*0.012;");
      shader.fragmentShader = "uniform float uTime; varying vec2 vEspuma;\n" + shader.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\nfloat bolha=sin(vEspuma.x*13.0+sin(vEspuma.y*11.0-uTime*2.0)); if(bolha>0.87)discard;");
    };
    matEspuma.customProgramCacheKey = () => "espuma-cascata-animada-1";
    grupo.userData.materiaisAnimados.push(matEspuma);
    for (const [faces, nome] of [[espuma, "espuma-cascatas"], [labios, "labios-cascatas"]]) {
      if (!faces.pos.length) continue;
      const malha = new THREE.Mesh(geometriaDe(faces), matEspuma);
      malha.name = nome;
      grupo.add(malha);
    }
  }

  // Gotas pequenas saem da zona de impacto, percorrem arcos e voltam à água.
  // O movimento é calculado no material: sem criar objetos a cada quadro.
  if (grupo.userData.quedas.length) {
    const gota = new THREE.OctahedronGeometry(1, 0);
    const pos = [], origens = [], velocidades = [], sementes = [];
    const rng = criarRng(0xa671);
    for (const queda of grupo.userData.quedas) {
      const p = secoes[queda.indice];
      for (let k = 0; k < 26; k++) {
        const lado = (rng() * 2 - 1) * 0.86, raio = 0.035 + rng() * 0.045;
        const semente = rng(), lateral = (rng() - 0.5) * 0.8, frente = 0.5 + rng() * 1.2;
        const origem = [p.x + p.nx * lado + p.dx * 0.45, p.h + 0.055, p.z + p.nz * lado + p.dz * 0.45];
        const velocidade = [p.dx * frente + p.nx * lateral, 0.35 + rng() * 0.5, p.dz * frente + p.nz * lateral];
        for (let v = 0; v < gota.attributes.position.count; v++) {
          pos.push(gota.attributes.position.getX(v) * raio, gota.attributes.position.getY(v) * raio * 1.5, gota.attributes.position.getZ(v) * raio);
          origens.push(...origem); velocidades.push(...velocidade); sementes.push(semente);
        }
      }
    }
    gota.dispose();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("aOrigem", new THREE.Float32BufferAttribute(origens, 3));
    geo.setAttribute("aVelocidade", new THREE.Float32BufferAttribute(velocidades, 3));
    geo.setAttribute("aSemente", new THREE.Float32BufferAttribute(sementes, 1));
    geo.computeVertexNormals();
    // O volume inclui o trajeto inteiro, além da geometria local das gotas.
    geo.boundingBox = new THREE.Box3();
    for (let v = 0; v < origens.length; v += 3) {
      geo.boundingBox.expandByPoint(new THREE.Vector3(origens[v] - 3, origens[v + 1] - 1, origens[v + 2] - 3));
      geo.boundingBox.expandByPoint(new THREE.Vector3(origens[v] + 3, origens[v + 1] + 2, origens[v + 2] + 3));
    }
    geo.boundingSphere = geo.boundingBox.getBoundingSphere(new THREE.Sphere());
    const mat = materialToon({ color: RAMPAS.agua[5], emissive: RAMPAS.agua[4], emissiveIntensity: 0.12 });
    mat.name = "respingos-cascata-animados";
    mat.onBeforeCompile = shader => {
      shader.uniforms.uTime = { value: 0 }; mat.userData.shader = shader;
      shader.vertexShader = "uniform float uTime; attribute vec3 aOrigem; attribute vec3 aVelocidade; attribute float aSemente;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nfloat fase=fract(uTime*(0.7+aSemente*0.4)+aSemente); float volume=smoothstep(0.0,0.12,fase)*(1.0-smoothstep(0.75,1.0,fase)); transformed=position*volume+aOrigem; transformed.xz+=aVelocidade.xz*fase; transformed.y+=4.0*aVelocidade.y*fase*(1.0-fase);");
    };
    mat.customProgramCacheKey = () => "respingos-cascata-1";
    grupo.userData.materiaisAnimados.push(mat);
    const malha = new THREE.Mesh(geo, mat); malha.name = "respingos-cascatas"; grupo.add(malha);
  }

  // Pedras apoiadas nas margens, fora do canal, nunca sorteadas no pé da
  // cortina: o caminho da água continua livre e se lê em qualquer giro.
  if (grupo.userData.quedas.length) {
    const rng = criarRng(0x67a3); // pedras pertencem ao projeto, não ao plantio
    const geoPedra = new THREE.IcosahedronGeometry(1, 0);
    const cores = [];
    const pp = geoPedra.attributes.position;
    for (let i = 0; i < pp.count; i += 3) {
      const alto = (pp.getY(i) + pp.getY(i + 1) + pp.getY(i + 2)) / 3;
      const c = new THREE.Color(alto > 0.25 ? RAMPAS.pedra[3] : RAMPAS.pedra[2]);
      for (let j = 0; j < 3; j++) cores.push(c.r, c.g, c.b);
    }
    geoPedra.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
    const matPedra = materialToon({ vertexColors: true });
    let usadas = 0;
    for (const queda of grupo.userData.quedas) {
      const p = secoes[queda.indice];
      const meia = p.meia;
      const nl = Math.hypot(p.nx, p.nz);
      for (const lado of [-1, 1]) {
        const raio = 0.48 + rng() * 0.33;
        const lateral = meia + raio * 0.9 + 0.28;
        const frente = 0.3 + rng() * 0.9;
        const x = p.x + p.nx / nl * lateral * lado + p.dx * frente;
        const z = p.z + p.nz / nl * lateral * lado + p.dz * frente;
        if (mundo.distRiacho && mundo.distRiacho(x, z) < meia + raio * 0.75 + 0.1) continue;
        const h = mundo.altitude?.(x, z) ?? p.h;
        if (!Number.isFinite(h) || h - p.h > 1.5) continue;
        const pedra = new THREE.Mesh(geoPedra, matPedra);
        pedra.name = "pedra-margem-cascata";
        pedra.scale.set(raio * (1.05 + rng() * 0.4), raio * 0.65, raio);
        pedra.rotation.y = rng() * Math.PI;
        pedra.position.set(x, h + raio * 0.35, z);
        pedra.castShadow = pedra.receiveShadow = true;
        grupo.add(pedra);
        usadas++;
      }
    }
    if (!usadas) {
      geoPedra.dispose();
      matPedra.dispose();
    }
  }
  grupo.userData.comprimento = percurso;
  grupo.userData.largura = larguraBase;
  return grupo;
}
