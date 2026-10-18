/**
 * Riacho contínuo e cascatas em degraus reais. A água usa os mesmos pontos do
 * leito: encontros em meia-esquadria fecham as curvas; quedas nunca viram uma
 * tira diagonal. Todos os materiais passam pela luz toon e pela paleta do jogo.
 */
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { RAMPAS } from "./paleta.js";
import { criarRng } from "./mundo.js";

const EPS = 1e-5;

function geometriaDe(faces) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(faces.pos, 3));
  if (faces.cores) geo.setAttribute("color", new THREE.Float32BufferAttribute(faces.cores, 3));
  if (faces.dist) {
    geo.setAttribute("aDist", new THREE.Float32BufferAttribute(faces.dist, 1));
    geo.setAttribute("aLado", new THREE.Float32BufferAttribute(faces.lado, 1));
    geo.setAttribute("aQueda", new THREE.Float32BufferAttribute(faces.queda, 1));
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function quad(faces, a, b, c, d, dist0 = 0, dist1 = 0, queda = 0) {
  // A e B são as margens de montante; C e D, as margens de jusante.
  for (const [p, s, v] of [[a, -1, dist0], [c, -1, dist1], [b, 1, dist0], [b, 1, dist0], [c, -1, dist1], [d, 1, dist1]]) {
    faces.pos.push(...p);
    if (faces.dist) {
      faces.dist.push(v);
      faces.lado.push(s);
      faces.queda.push(queda);
    }
  }
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
    shader.vertexShader = "varying vec2 vPlanoAgua; attribute float aDist; attribute float aLado; attribute float aQueda; varying float vDist; varying float vLado; varying float vQueda;\n" +
      shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvPlanoAgua=position.xz; vDist = aDist; vLado = aLado; vQueda = aQueda;");
    shader.fragmentShader = `uniform vec2 uCostaLago[${lago.contorno.length}]; uniform vec4 uCaixaLago; varying vec2 vPlanoAgua;\n` + "uniform float uTime; uniform vec3 uBorda; uniform vec3 uEspuma; uniform vec3 uAguaFunda; varying float vDist; varying float vLado; varying float vQueda;\n" +
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
        float margem = step(0.972, abs(vLado));
        vec3 luzAgua = vec3(0.0);
        if (vQueda > 0.5) {
          float fase = fract(vDist / (1.25 + r * 2.8) - uTime * (0.8 + r * 0.55) + r * 7.0);
          float larguraFio = step(0.11 + r * 0.15, fract(faixas)) * (1.0 - step(0.57 + r * 0.31, fract(faixas)));
          float fio = larguraFio * step(0.38 + r * 0.23, fase) * step(0.19, r);
          diffuseColor.rgb = mix(diffuseColor.rgb, uBorda, 0.44);
          diffuseColor.rgb = mix(diffuseColor.rgb, uAguaFunda, step(r, 0.19) * 0.28);
          diffuseColor.rgb = mix(diffuseColor.rgb, uEspuma, max(fio * 0.88, margem * 0.5));
          luzAgua = diffuseColor.rgb * 0.19;
        } else {
          // Poucas meias-luas largas no trecho calmo, com uma abertura por
          // arco. Não há brilho independente em cada coluna do riacho.
          float profundidade=1.0-abs(vLado);
          diffuseColor.rgb=mix(diffuseColor.rgb,uAguaFunda,step(.34,profundidade)*.28);
          float viagem = vDist * 0.245 - uTime * 0.2;
          float celula = floor(viagem);
          float sorte = fract(sin(celula * 91.31 + 37.13) * 15731.743);
          float arco = abs(fract(viagem + vLado * vLado * 0.095) - 0.53);
          float abertura = step(0.12, abs(vLado - (sorte - 0.5) * 0.65));
          float extensao = 1.0 - step(0.52 + sorte * 0.29, abs(vLado));
          float brilho = (1.0 - step(0.014 + sorte * 0.009, arco)) * step(0.67, sorte) * abertura * extensao;
          diffuseColor.rgb = mix(diffuseColor.rgb, uBorda, max(margem * 0.23, brilho * 0.68));
          luzAgua = diffuseColor.rgb * 0.1;
        }`,
      ).replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += luzAgua;");
  };
  mat.customProgramCacheKey = () => "agua-percurso-costa-4-"+lago.contorno.length;
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
  const fita = { pos: [], dist: [], lado: [], queda: [] };
  const cortinas = { pos: [], dist: [], lado: [], queda: [] };
  const espuma = { pos: [] };
  const labios = { pos: [] };
  const margens = { pos: [], cores: [] };
  const gramaMargens = { pos: [], cores: [] };
  const bordas = (p, h = p.h) => [[p.x + p.nx, h, p.z + p.nz], [p.x - p.nx, h, p.z - p.nz]];
  let percurso = 0;
  for (let i = 0; i < secoes.length - 1; i++) {
    const a = secoes[i], b = secoes[i + 1];
    const distancia = Math.hypot(b.x - a.x, b.z - a.z);
    const desnivel = Math.max(0, a.h - b.h);
    // Bordas laterais fechadas compartilham exatamente a meia-esquadria da
    // água. O tampo estreito cobre a interpolação do leito, sem cruzar o canal.
    for (const lado of [-1, 1]) {
      if(mundo.fatorLago?.((a.x+b.x)/2,(a.z+b.z)/2)<1.025)continue;
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
        quadColorido(margens, ma.base, ma.meio, mb.base, mb.meio, RAMPAS.terra[1]);
        quadColorido(margens, ma.meio, ma.topo, mb.meio, mb.topo, RAMPAS.terra[2]);
        quadColorido(margens, ma.foraTopo, ma.foraBase, mb.foraTopo, mb.foraBase, RAMPAS.terra[2]);
        const mancha = Math.sin((a.x + b.x) * 0.17 + (a.z + b.z) * 0.105 + lado * 2.1);
        const corGrama = mancha > 0.62 ? RAMPAS.salvia[3] : RAMPAS.salvia[2];
        quadColorido(gramaMargens, ma.topo, ma.ombro, mb.topo, mb.ombro, corGrama);
        quadColorido(gramaMargens, ma.ombro, ma.foraTopo, mb.ombro, mb.foraTopo, corGrama);
      } else if (desnivel > 0.025) {
        // Na cortina, esta faixa vira uma face rochosa apenas por FORA das
        // duas bordas; o vão entre elas permanece inteiramente de água.
        quadColorido(margens, ma.topo, ma.foraTopo, mb.topo, mb.foraTopo, RAMPAS.pedra[2]);
      }
    }
    const queda = desnivel > 0.45 || (distancia < EPS && desnivel > 0.025);
    const [ae, ad] = bordas(a), [be, bd] = bordas(b);
    if (queda) {
      const [topoE, topoD] = bordas(b, a.h);
      if (distancia > EPS) quad(fita, ae, ad, topoE, topoD, percurso, percurso + distancia);
      percurso += distancia;
      quad(cortinas, topoE, topoD, be, bd, percurso, percurso + desnivel, 1);
      percurso += desnivel;
      const info = { indice: i + 1, x: b.x, z: b.z, superior: a.h, inferior: b.h, altura: desnivel, largura: b.meia * 2 };
      grupo.userData.quedas.push(info);

      // O lábio anuncia a queda antes da cortina; a lâmina permanece inteira
      // sob o desenho de espuma, inclusive nos pequenos intervalos do arco.
      for (let k = 0; k < 11; k++) {
        if (k === 2 || k === 8) continue;
        const s0 = (k / 11 * 2 - 1) * 0.93, s1 = ((k + 1) / 11 * 2 - 1) * 0.93;
        const pontoLabio = (s, t) => [b.x + b.nx * s + b.dx * t, a.h + 0.028, b.z + b.nz * s + b.dz * t];
        const curva0 = -0.06 - (1 - s0 * s0) * 0.075, curva1 = -0.06 - (1 - s1 * s1) * 0.075;
        quad(labios, pontoLabio(s0, curva0 - 0.12), pontoLabio(s1, curva1 - 0.12), pontoLabio(s0, curva0), pontoLabio(s1, curva1));
      }
      // Impacto em meias-luas quebradas; a espuma se abre rio abaixo e fica
      // mais fina e esparsa à medida que se afasta da cortina.
      for (let faixa = 0; faixa < 3; faixa++) {
        const total = 13, afastamento = [0.11, 0.64, 1.18][faixa];
        for (let k = 0; k < total; k++) {
          const parte = k / total;
          if (faixa === 0 && (k === 1 || k === total - 2)) continue;
          if (faixa === 1 && ((parte > 0.25 && parte < 0.44) || parte > 0.77)) continue;
          if (faixa === 2 && !(parte > 0.18 && parte < 0.36 || parte > 0.62 && parte < 0.76)) continue;
          const lado0 = (k / total * 2 - 1) * 0.9, lado1 = ((k + 1) / total * 2 - 1) * 0.9;
          const ponto = (lado, frente) => {
            const arco = (1 - lado * lado) * [0.24, 0.36, 0.46][faixa];
            const dente = Math.sin(lado * 8.1 + faixa * 1.7) * (faixa ? 0.025 : 0.045);
            return [b.x + b.nx * lado + b.dx * (afastamento + arco + frente + dente), b.h + 0.032 + faixa * 0.008, b.z + b.nz * lado + b.dz * (afastamento + arco + frente + dente)];
          };
          const espessura = faixa ? 0.055 : 0.12 + (0.5 + 0.5 * Math.sin(k * 1.31)) * 0.07;
          quad(espuma, ponto(lado0, 0), ponto(lado1, 0), ponto(lado0, espessura), ponto(lado1, espessura));
        }
      }
    } else if (distancia > EPS) {
      const comprimento = Math.hypot(distancia, desnivel);
      quad(fita, ae, ad, be, bd, percurso, percurso + comprimento);
      percurso += comprimento;
    }
  }

  if (!fita.pos.length && !cortinas.pos.length) return grupo;
  const material = materialCorrenteza(materialToon,mundo.lago);
  grupo.userData.materiaisAnimados.push(material);
  for (const [faces, nome] of [[fita, "superficie-riacho"], [cortinas, "cortinas-cascatas"]]) {
    if (!faces.pos.length) continue;
    const malha = new THREE.Mesh(geometriaDe(faces), material);
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
  if (espuma.pos.length || labios.pos.length) {
    const matEspuma = materialToon({ color: RAMPAS.agua[5], emissive: RAMPAS.agua[4], emissiveIntensity: 0.18, side: THREE.DoubleSide });
    for (const [faces, nome] of [[espuma, "espuma-cascatas"], [labios, "labios-cascatas"]]) {
      if (!faces.pos.length) continue;
      const malha = new THREE.Mesh(geometriaDe(faces), matEspuma);
      malha.name = nome;
      grupo.add(malha);
    }
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
