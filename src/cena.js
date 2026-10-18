/**
 * Cena do Jardim (demo): mundo 3D renderizado como pixel art.
 *
 * Pipeline: cena 3D (materiais toon de 3 faixas, sombras duras) → alvo de
 * render em baixa resolução → shader de pixel (contorno, brilho de topo,
 * paleta + dithering) → tela com pixels nítidos.
 * Câmera ortográfica em ¾, com giro livre e atalhos de 45°, com "snap" ao grid de
 * pixels para o cenário não tremeluzir ao mover.
 */
import * as THREE from "three";

import { BASE, RAMPAS } from "./paleta.js";
import { criarRng, criarRuido, gerarMundo, suave } from "./mundo.js";
import { criarMaterialPixel } from "./pixel.js";
import { dimensoesRender } from "./qualidade.js";
import { ESPECIES, estagioDe } from "./especies.js";
import { competirPorLuz, condicoes, criarAmbiente, descrever, escolherEspecie } from "./ecossistema.js";
import { construirVariacao } from "./arvoreProc.js";
import { organizarViveiro } from "./viveiro.js";
import { estiloCopa } from "./estiloCopa.js";
import { criarLago } from "./aguaLago.js";
import { criarAguaPercurso } from "./aguaPercurso.js";
import { criarPonteMadeira } from "./ponteMadeira.js";
import { criarMaterialRelevo, criarTravessias } from "./relevo.js";
import { criarBordasBarranco } from "./bordasBarranco.js";

const lerp = THREE.MathUtils.lerp;

// Cede a vez ao navegador entre etapas do carregamento (atualiza a barra).
// setTimeout em vez de requestAnimationFrame: rAF pausa com a aba em segundo
// plano, e o carregamento ficaria parado até o usuário voltar.
const quadro = () => new Promise((r) => setTimeout(r, 0));
const cor = (hex) => new THREE.Color(hex);

// ---------------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------------

let rampaLuz = null;
/** 3 faixas de luz (sombra, meio-tom, luz) com transição seca. */
function rampa() {
  if (rampaLuz) return rampaLuz;
  rampaLuz = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 178, 178, 178, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  rampaLuz.minFilter = rampaLuz.magFilter = THREE.NearestFilter;
  rampaLuz.generateMipmaps = false;
  rampaLuz.needsUpdate = true;
  return rampaLuz;
}
const toon = (p) => new THREE.MeshToonMaterial({ gradientMap: rampa(), ...p });

// ---------------------------------------------------------------------------
// Geometrias procedurais pequenas
// ---------------------------------------------------------------------------

/** Touceira de capim: lâminas curvas com gradiente (base escura → ponta clara). */
function touceira(rng) {
  const pos = [], cores = [], idx = [];
  const baseC = cor(RAMPAS.mata[2]), pontaC = cor(RAMPAS.mata[5]), c = new THREE.Color();
  // Menos lâminas, mais largas e menos inclinadas: touceira firme, que lê bem em pixel.
  for (let b = 0; b < 6; b++) {
    const ang = rng() * 6.28, incl = 0.12 + rng() * 0.3, alt = 0.35 + rng() * 0.3, larg = 0.06 + rng() * 0.03;
    const ox = (rng() - 0.5) * 0.25, oz = (rng() - 0.5) * 0.25, dx = Math.cos(ang), dz = Math.sin(ang);
    const i0 = pos.length / 3;
    for (let k = 0; k <= 3; k++) {
      const t = k / 3, cv = incl * t * t, w = larg * (1 - t * 0.9);
      const cx = ox + dx * cv, cz = oz + dz * cv, y = alt * t;
      pos.push(cx - dz * w, y, cz + dx * w, cx + dz * w, y, cz - dx * w);
      c.copy(baseC).lerp(pontaC, t);
      cores.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (k < 3) idx.push(i0 + k * 2, i0 + k * 2 + 1, i0 + k * 2 + 2, i0 + k * 2 + 1, i0 + k * 2 + 3, i0 + k * 2 + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Pedra: icosaedro deformado por ruído, facetado, com musgo no topo. */
function pedraGeo(semente) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const r = criarRuido(semente);
  const p = g.attributes.position;
  const cores = [];
  const cPedra = cor(BASE.pedra), cMusgo = cor(BASE.musgo);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const k = 0.75 + r(v.x * 1.3 + 5, v.z * 1.3 + v.y, 2) * 0.55;
    v.multiplyScalar(k);
    v.y = v.y * 0.6;
    p.setXYZ(i, v.x, v.y, v.z);
    const musgo = v.y > 0.25 && r(v.x * 3, v.z * 3) > 0.45;
    const c = musgo ? cMusgo : cPedra;
    cores.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
  const plano = g.index ? g.toNonIndexed() : g;
  plano.computeVertexNormals(); // normais por face: pedra facetada
  return plano;
}

// ---------------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------------

export class Jardim {
  constructor(canvas) {
    // Cada montagem tem seu próprio cancelamento, inclusive para os controles.
    this.cancelamento = new AbortController();
    this.descartado = false;
    this.recursosLiberados = false;
    this.compilando = false;
    this.cargaIniciada = false;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    // Sombras duras: bordas de 1 pixel, como pixel art desenhada.
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
    this.alvo = new THREE.Vector3();
    this.yaw = Math.PI / 4;
    this.yawAlvo = this.yaw;
    this.pitch = THREE.MathUtils.degToRad(38);
    this.altura = 180; // vista inicial das seis regiões de relevo
    this.tamPixel = 2; // estilo definido: pixel mínimo, sempre com contorno
    this.qualidade = "alta";
    this.crescimento = 0.9;
    this.cresceVisto = -1;
    this.forcaVento = 0.55;
    this.hora = "dia";
    this.relogio = new THREE.Timer();
    // Material único das árvores: cor por vértice (gerador) × tom do indivíduo.
    this.matArvore = toon({ vertexColors: true, side: THREE.DoubleSide });
    this.uDireita={value:new THREE.Vector2(1,0)};
    this.matArvore.onBeforeCompile=sh=>estiloCopa(sh,this.uDireita,this.pixel.uniforms.uTexel);
    this.matArvore.customProgramCacheKey=()=>"arvore-copa-celulas-v16";
    this.cursorArvore = null;
    this.sobrevoo = null;
    this.ultimoRastreio = -Infinity;
    this.matrizZero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.individuos = [];
    this.grupos = [];
    this.pixel = criarMaterialPixel();
    this.cena2d = new THREE.Scene();
    this.cena2d.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.pixel));
    this.cam2d = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.rt = null;
  }

  async carregar(semente, progresso) {
    this.verificarAtivo();
    if (this.cargaIniciada) throw new Error("Crie um novo Jardim para carregar outro mundo.");
    this.cargaIniciada = true;
    this.tempos={}; let marca=performance.now();
    const medir=nome=>{const agora=performance.now();this.tempos[nome]=Math.round(agora-marca);marca=agora;};
    progresso(0.04, "Semeando o mundo…");
    await this.ceder();
    const m = (this.mundo = gerarMundo(semente));
    medir("mundo");
    this.irAoViveiro(false);

    progresso(0.1, "Moldando o terreno…");
    await this.ceder();
    this.criarTerreno();
    medir("terreno");
    this.criarAgua();
    this.criarRiacho();
    this.criarPlantasAquaticas();
    medir("agua");

    const lista = Object.entries(ESPECIES);
    const total = lista.reduce((n, [, e]) => n + e.variacoes, 0);
    let feitas = 0;
    this.variacoes = [];
    for (const [id, e] of lista)
      for (let v = 0; v < e.variacoes; v++) {
        progresso(0.18 + (feitas / total) * 0.55, `Desenhando árvores (${feitas + 1}/${total})…`);
        await this.ceder();
        this.variacoes.push(this.gerarVariacao(id, e, semente * 31 + feitas * 977));
        feitas++;
      }

    progresso(0.78, "Plantando o bosque…");
    await this.ceder();
    medir("arvores");
    this.plantar();
    medir("plantar");
    this.montarViveiro();
    this.criarDetalhes();
    medir("detalhes");

    progresso(0.9, "Acendendo a luz…");
    await this.ceder();
    this.criarLuz();
    this.aplicarHora();
    this.redimensionar();
    this.atualizarCrescimento(true);
    // A compilação não é interrompível. Aguarda terminar antes de liberar a GPU,
    // mas nunca monta observadores, controles ou animação de uma carga cancelada.
    this.compilando = true;
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } finally {
      this.compilando = false;
      if (this.descartado) this.liberarRecursos();
    }
    this.verificarAtivo();

    medir("luz_e_shaders");
    progresso(1, "Pronto");
    this.verificarAtivo();
    this.ro = new ResizeObserver(() => this.redimensionar());
    this.ro.observe(this.canvas);
    this.ligarControles();
    this.relogio.reset();
    this.loop = () => {
      if (this.descartado) return;
      this.quadroAnim();
      if (!this.descartado) this.raf = requestAnimationFrame(this.loop);
    };
    this.raf = requestAnimationFrame(this.loop);
  }

  verificarAtivo() {
    if (this.descartado) throw new DOMException("Carregamento do jardim cancelado.", "AbortError");
  }

  async ceder() {
    await quadro();
    this.verificarAtivo();
  }

  // --- Terreno e água -----------------------------------------------------

  alturaEm(x, z) {
    return this.mundo.altitude(x, z);
  }

  criarTerreno() {
    const m = this.mundo;
    const borda = 50, passo = 0.5;
    const L = m.largura + borda * 2, P = m.altura + borda * 2;
    const nx = Math.round(L / passo), nz = Math.round(P / passo);
    const g = new THREE.PlaneGeometry(L, P, nx, nz);
    g.rotateX(-Math.PI / 2);
    g.translate(m.largura / 2, 0, m.altura / 2);
    const pos = g.attributes.position;
    const cores = new Float32Array(pos.count * 3);
    const rocha = new Float32Array(pos.count); // máscara dos barrancos naturais, sem alvenaria
    const grama = new Float32Array(pos.count); // 1 = gramado: recebe manchas e tufinhos desenhados no shader
    const limitesSolo = new Float32Array(pos.count * 2); // topo e pé REAIS do corte local
    const S = RAMPAS.salvia, T = RAMPAS.terra;
    const c = new THREE.Color(), tmp = new THREE.Color();
    const rng = criarRng(m.semente ^ 0x77);
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.alturaEm(pos.getX(i), pos.getZ(i)));
    // Inclinação pelos vizinhos da grade (barranco = degrau entre platôs).
    const inclinacao = (i) => {
      const ix = i % (nx + 1), iz = Math.floor(i / (nx + 1));
      const a = pos.getY(iz * (nx + 1) + Math.max(0, ix - 1)), b = pos.getY(iz * (nx + 1) + Math.min(nx, ix + 1));
      const c2 = pos.getY(Math.max(0, iz - 1) * (nx + 1) + ix), d2 = pos.getY(Math.min(nz, iz + 1) * (nx + 1) + ix);
      return Math.hypot(b - a, d2 - c2) / (2 * passo);
    };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
      const n1 = m.ruido(x / 22, z / 22 + 9, 3), n2 = m.fino(x / 6, z / 6, 2);
      // Campos já calculados pelo mundo (mesma grade de 0,5 m): sem recalcular ruído.
      const gr = m.grade, mesmo = pos.count === gr.nx * gr.ny;
      const d = mesmo ? gr.DN[i] : m.densidade(x, z), f = mesmo ? gr.FL[i] : m.fatorLago(x, z);
      const trilha = (mesmo ? gr.DT[i] : m.distTrilha(x, z)) / m.trilha.largura;
      rocha[i] = suave(0.5, 0.62, trilha);
      // Gramado: tom de base por platô; as manchas e os tufinhos vêm do shader (desenho limpo).
      let idx = n1 < 0.5 ? 3 : 4;
      idx += Math.floor(Math.max(0, y + 0.6) / m.DEGRAU) - 1; // cada platô com seu tom: alto mais claro e seco, baixada mais escura
      c.set(S[Math.max(0, Math.min(S.length - 1, idx))]);
      // Chão de mata: mais escuro e terroso sob o bosque.
      c.lerp(tmp.set(S[1]), Math.round(suave(0.25, 0.9, d) * 2) / 2 * 0.7); // em degraus: sem degradê (que vira chuvisco no pontilhado)
      // Sombra de contato ao pé do paredão e brilho na beirada de cima (leitura de volume).
      // Vizinhos a 1 m (2 pontos da grade), lidos direto da malha: barato.
      const ix = i % (nx + 1), iz = Math.floor(i / (nx + 1)), h = y;
      const hv = [pos.getY(iz * (nx + 1) + Math.min(nx, ix + 2)), pos.getY(iz * (nx + 1) + Math.max(0, ix - 2)), pos.getY(Math.min(nz, iz + 2) * (nx + 1) + ix), pos.getY(Math.max(0, iz - 2) * (nx + 1) + ix)];
      const viz = Math.max(hv[0], hv[1], hv[2], hv[3]), vizMin = Math.min(hv[0], hv[1], hv[2], hv[3]);
      if (viz - h > 2) c.multiplyScalar(0.72); // pé do paredão
      else if (h - vizMin > 2) c.set(S[Math.min(S.length - 1, idx + 2)]); // beirada iluminada
      // Trilha: terra batida limpa, com borda escura de 1 traço e pedrinhas claras raras.
      if (trilha < 0.56) c.set(T[n2 > 0.8 ? 5 : 4]);
      else if (trilha < 0.7) c.set(T[2]);
      // Margem e fundo do lago.
      if (f < 1.0) c.set(f < .85 ? RAMPAS.agua[0] : f < .975 ? RAMPAS.terra[2] : RAMPAS.salvia[2]); // faixa clara rente à margem: a borda ciano das referências
      else if (f < 1.035 + n2 * 0.03) c.set(S[1]).lerp(tmp.set(T[2]), 0.45);
      // Barranco: camadas de terra e pedra (estratos horizontais), fora da trilha.
      const inc = inclinacao(i);
      // Altura local do corte: acompanha também recortes junto à estrada/água.
      // A crosta não usa múltiplos globais de 4,5 m, que desenhavam faixas falsas.
      let topoSolo = h, peSolo = h;
      if (inc > 0.35) {
        const gx = hv[0] - hv[1], gz = hv[2] - hv[3], comprimento = Math.hypot(gx, gz) || 1;
        for (let raio = 1; raio <= 6; raio++) for (const sinal of [-1, 1]) {
          const jx = Math.max(0, Math.min(nx, Math.round(ix + gx / comprimento * raio * sinal)));
          const jz = Math.max(0, Math.min(nz, Math.round(iz + gz / comprimento * raio * sinal)));
          const vizinho = pos.getY(jz * (nx + 1) + jx);
          topoSolo = Math.max(topoSolo, vizinho); peSolo = Math.min(peSolo, vizinho);
        }
      }
      limitesSolo.set([topoSolo, peSolo], i * 2);
      if (inc > 0.7 && f > 1.0 && trilha > 0.62) c.set(T[3]);
      else if (inc > 0.35 && f > 1.0 && trilha > 0.62) c.set(S[1]); // beirada do platô
      // Os degraus são as malhas sólidas das obras; o chão sob eles continua terra.
      grama[i] = trilha > 0.75 && f > 1.04 && inc < 0.35 ? 1 : 0;
      cores.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(cores, 3));
    g.setAttribute("aRocha", new THREE.BufferAttribute(rocha, 1));
    g.setAttribute("aGrama", new THREE.BufferAttribute(grama, 1));
    g.setAttribute("aLimitesSolo", new THREE.BufferAttribute(limitesSolo, 2));
    g.computeVertexNormals();
    // As faces dos barrancos têm normais próprias. O topo continua suave;
    // a quina não se dissolve numa transição arredondada de luz.
    const indicesChao=[],indicesParede=[],a3=new THREE.Vector3(),b3=new THREE.Vector3(),c3=new THREE.Vector3();
    for(let i=0;i<g.index.count;i+=3) {
      const ids=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];
      a3.fromBufferAttribute(pos,ids[0]);b3.fromBufferAttribute(pos,ids[1]);c3.fromBufferAttribute(pos,ids[2]);
      const normal=b3.sub(a3).cross(c3.sub(a3)).normalize();
      (Math.abs(normal.y)<0.72?indicesParede:indicesChao).push(...ids);
    }
    const material=this.materialTerreno();
    if(indicesParede.length) {
      const recorte=new THREE.BufferGeometry();
      for(const nome of ["position","color","aRocha","aGrama","aLimitesSolo"])recorte.setAttribute(nome,g.getAttribute(nome));
      recorte.setIndex(indicesParede);
      const faces=recorte.toNonIndexed();faces.computeVertexNormals();recorte.dispose();
      const paredes=new THREE.Mesh(faces,material);paredes.name="paredoes-facetados";paredes.receiveShadow=paredes.castShadow=true;this.scene.add(paredes);
    }
    this.scene.add(criarBordasBarranco(m, g, indicesParede, toon));
    g.setIndex(indicesChao);
    const t = new THREE.Mesh(g, material);
    t.receiveShadow = true;
    this.scene.add(t);
    this.terreno = t;
  }

  /** Terra natural em camadas; obras de pedra têm material e geometria próprios. */
  materialTerreno() {
    return criarMaterialRelevo(toon,{direita:this.uDireita,texel:this.pixel.uniforms.uTexel});
  }

  criarAgua() {
    this.agua=criarLago(this.mundo,toon);this.scene.add(this.agua);
  }

  /**
   * Riacho: fita de água seguindo o curso (mundo.riacho). Onde o nível cai de
   * repente (paredão), a fita fica em pé e vira CASCATA: cortina clara com
   * listras brancas descendo e espuma no pé. Borda ciano clara junto à margem,
   * como nos jogos de pixel art de referência.
   */
  criarRiacho() {
    this.aguaPercurso = criarAguaPercurso(this.mundo, toon);
    this.scene.add(this.aguaPercurso);
    this.travessias = criarTravessias(this.mundo, toon);
    this.scene.add(this.travessias);
    if(this.mundo.plano.passarela)this.travessias.add(criarPonteMadeira(this.mundo.plano.passarela,toon,this.mundo.altitude));
  }

  /** Vitórias-régias e taboas na beira do lago. */
  criarPlantasAquaticas() {
    const m = this.mundo, L = m.lago, rng = criarRng(m.semente ^ 0x1e1a);
    const folhas = [], taboas = [], pontas = [];
    for (let i = 0; i < 16; i++) {
      const a = rng() * 6.28, r = L.raio(a) * lerp(0.62, 0.9, rng());
      const x = L.cx + Math.cos(a) * L.rx * r, z = L.cy + Math.sin(a) * L.ry * r;
      const f = new THREE.CylinderGeometry(lerp(0.6, 0.95, rng()), lerp(0.6, 0.95, rng()), 0.05, 10, 1, false, 0.5, 5.6); // fatia aberta: o "corte" da folha
      f.rotateY(rng() * 6.28);
      f.translate(x, -0.52, z);
      folhas.push(f);
    }
    for (let c = 0; c < 7; c++) {
      const a = rng() * 6.28, r = L.raio(a) * lerp(0.95, 1.05, rng());
      const cx = L.cx + Math.cos(a) * L.rx * r, cz = L.cy + Math.sin(a) * L.ry * r;
      for (let k = 0; k < 6; k++) {
        const x = cx + (rng() - 0.5) * 1.4, z = cz + (rng() - 0.5) * 1.4, h = lerp(1.0, 1.7, rng());
        const y = Math.max(-0.55, m.altitude(x, z));
        const haste = new THREE.CylinderGeometry(0.03, 0.04, h, 4);
        haste.translate(x, y + h / 2, z);
        taboas.push(haste);
        const ponta = new THREE.CylinderGeometry(0.07, 0.07, 0.3, 5);
        ponta.translate(x, y + h - 0.12, z);
        pontas.push(ponta);
      }
    }
    for (const [lista, cor] of [[folhas, RAMPAS.mata[4]], [taboas, RAMPAS.mata[3]], [pontas, RAMPAS.terra[1]]]) {
      const geo = new THREE.BufferGeometry();
      const tot = lista.reduce((s, b) => s + b.toNonIndexed().attributes.position.count, 0);
      const arr = new Float32Array(tot * 3);
      let o = 0;
      for (const b of lista) {
        const nb = b.toNonIndexed();
        arr.set(nb.attributes.position.array, o);
        o += nb.attributes.position.array.length;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      geo.computeVertexNormals();
      const malha = new THREE.Mesh(geo, toon({ color: cor, side: THREE.DoubleSide }));
      malha.castShadow = malha.receiveShadow = true;
      this.scene.add(malha);
    }
  }

  // --- Árvores ------------------------------------------------------------

  /** Uma VARIAÇÃO: os 4 estágios (modelos diferentes) de uma espécie, do gerador próprio. */
  gerarVariacao(id, e, semente) {
    return { especie: id, ...construirVariacao(e, semente) };
  }

  /**
   * Indivíduos: cada árvore/arbusto é uma entidade própria (número, espécie,
   * posição, crescimento, estágio, tom). O desenho agrupa por variação, com
   * uma malha instanciada por ESTÁGIO; o indivíduo aparece só na do seu estágio.
   */
  plantar() {
    const rng = criarRng(this.mundo.semente ^ 0x1234567);
    const porEspecie = new Map();
    for (const v of this.variacoes) porEspecie.set(v.especie, [...(porEspecie.get(v.especie) ?? []), v]);
    const DEGRAUS = [0.88, 1, 1, 1.1];
    const porVariacao = new Map();
    this.ambiente = criarAmbiente(this.mundo);
    this.individuos = [];
    for (const o of this.mundo.objetos) {
      if (o.tipo !== "arvore" && o.tipo !== "arbusto") continue;
      // Quem nasce aqui depende do nicho: umidade do solo, luz e altitude do lugar.
      const especie = escolherEspecie(o.tipo, condicoes(this.ambiente, o.x, o.y), rng);
      const opcoes = porEspecie.get(especie);
      const variacao = opcoes[Math.floor(rng() * opcoes.length)];
      const ind = {
        numero: this.individuos.length + 1,
        especie,
        nome: ESPECIES[especie].nome,
        x: o.x,
        z: o.y,
        y: this.alturaEm(o.x, o.y) - 0.1,
        giro: o.giro,
        inclinacao: [(rng() - 0.5) * 0.06, (rng() - 0.5) * 0.06],
        escala: o.escala,
        altura: variacao.alturaAdulta * o.escala,
        nasce: o.nasce,
        tom: DEGRAUS[Math.floor(rng() * DEGRAUS.length)],
        estagio: null,
        indice: -1,
        variacao,
      };
      this.individuos.push(ind);
      porVariacao.set(variacao, [...(porVariacao.get(variacao) ?? []), ind]);
    }
    // Competição por luz entre vizinhos ⇒ vigor: tamanho final e velocidade.
    competirPorLuz(this.individuos, this.ambiente);
    for (const ind of this.individuos) {
      ind.escala *= 0.82 + 0.26 * ind.vigor;
      if (ind.nasce > 0) ind.nasce = Math.min(0.95, Math.max(0.02, ind.nasce + (0.55 - ind.vigor) * 0.25));
    }
    this.grupos = [];
    this.malhaParaGrupo = new Map();
    const tom = new THREE.Color();
    for (const [variacao, membros] of porVariacao) {
      const malhas = variacao.estagios.map((geo) => {
        const im = new THREE.InstancedMesh(geo, this.matArvore, membros.length);
        im.castShadow = im.receiveShadow = true;
        im.frustumCulled = false;
        this.scene.add(im);
        return im;
      });
      const grupo = { variacao, membros, malhas };
      membros.forEach((ind, vaga) => {
        ind.grupo = grupo;
        ind.vaga = vaga;
        for (const im of malhas) im.setColorAt(vaga, tom.setScalar(ind.tom));
      });
      malhas.forEach((im, estagio) => this.malhaParaGrupo.set(im, { grupo, estagio }));
      this.grupos.push(grupo);
    }
  }

  /** Regra de crescimento de cada indivíduo: estágio (modelo) + tamanho. */
  atualizarCrescimento(forcar = false) {
    if (this.cresceVisto < 0) this.cresceVisto = this.crescimento;
    const delta = this.crescimento - this.cresceVisto;
    if (!forcar && Math.abs(delta) < 0.001) return;
    if (!forcar) this.cresceVisto += delta * 0.08;
    const g = this.cresceVisto;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (const grupo of this.grupos) {
      for (const ind of grupo.membros) {
        const gf = ind.nasce === 0 ? 1 : suave(ind.nasce, ind.nasce + 0.3, g);
        const { indice, estagio, escala } = estagioDe(gf);
        ind.estagio = estagio;
        ind.indice = indice;
        q.setFromEuler(e.set(ind.inclinacao[0], ind.giro, ind.inclinacao[1]));
        m.compose(p.set(ind.x, ind.y, ind.z), q, s.setScalar(ind.escala * escala));
        grupo.malhas.forEach((im, est) => im.setMatrixAt(ind.vaga, est === indice ? m : zero));
      }
      for (const im of grupo.malhas) {
        im.instanceMatrix.needsUpdate = true;
        im.boundingSphere = null; // recalculado sob demanda (clique)
      }
    }
  }

  /** Clique numa árvore: seleciona o indivíduo e devolve sua ficha. */
  selecionarEm(clienteX, clienteY) {
    const caixa = this.canvas.getBoundingClientRect();
    const r = caixa.width && caixa.height ? caixa : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    this.selecionarNDC(new THREE.Vector2(((clienteX - r.left) / r.width) * 2 - 1, -((clienteY - r.top) / r.height) * 2 + 1));
  }

  // --- Transparência da árvore inteira sob o ponteiro --------------------

  focarEm(clienteX, clienteY) {
    if (!this.cursorArvore || clienteX == null) this.ultimoRastreio = -Infinity;
    this.cursorArvore = clienteX == null ? null : { x: clienteX, y: clienteY };
    if (!this.cursorArvore) this.restaurarSobrevoo();
  }

  /** Devolve a árvore opaca antes de atualizar crescimento ou fazer raycast.
   * A cópia translúcida nunca participa dos testes de interseção: não oscila
   * entre a árvore da frente e as que ficaram visíveis atrás dela.
   */
  restaurarSobrevoo() {
    const h = this.sobrevoo;
    if (!h) return;
    if (h.ind) {
      h.malha.setMatrixAt(h.ind.vaga, h.matriz);
      h.malha.instanceMatrix.needsUpdate = true;
    } else h.malha.visible = true;
    this.fantasma.visible = false;
    this.sobrevoo = null;
  }

  encontrarArvore(ndc) {
    this.camera.updateMatrixWorld();
    this.scene.updateMatrixWorld();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const malhas = [...(this.viveiro ?? []), ...this.grupos.flatMap(g => g.malhas)];
    for (const hit of ray.intersectObjects(malhas, false)) {
      if (hit.object.userData.viveiro) return { malha: hit.object };
      const info = this.malhaParaGrupo.get(hit.object);
      const ind = info?.grupo.membros[hit.instanceId];
      if (ind && ind.indice === info.estagio) return { malha: hit.object, ind };
    }
    return null;
  }

  atualizarSobrevoo(t) {
    if (!this.cursorArvore) return;
    // No máximo 15 buscas por segundo; movimento da câmera e crescimento
    // também atualizam a interseção quando o cursor fica parado.
    if (t - this.ultimoRastreio >= 1 / 15) {
      const r = this.canvas.getBoundingClientRect(), p = this.cursorArvore;
      this.alvoSobrevoo = this.encontrarArvore(new THREE.Vector2(
        (p.x - r.left) / r.width * 2 - 1, -(p.y - r.top) / r.height * 2 + 1));
      this.ultimoRastreio = t;
    }
    const h = this.alvoSobrevoo;
    if (!h) return;
    if (h.ind && h.ind.indice < 0) return; // o crescimento pode recuar para antes do nascimento
    // O estágio pode mudar entre duas buscas. Usa sempre o modelo atual.
    if (h.ind) h.malha = h.ind.grupo.malhas[h.ind.indice];
    if (!this.fantasma) {
      const material = this.matArvore.clone();
      material.onBeforeCompile=this.matArvore.onBeforeCompile;
      material.customProgramCacheKey=this.matArvore.customProgramCacheKey;
      material.transparent = true;
      material.opacity = 0.22;
      material.depthWrite = false;
      // Uma única superfície translúcida por pixel evita escurecer copas
      // fechadas pela soma de frente e verso da mesma folha/lóbulo.
      material.side = THREE.FrontSide;
      this.fantasma = new THREE.Mesh(h.malha.geometry, material);
      this.fantasma.matrixAutoUpdate = false;
      this.fantasma.renderOrder = 2;
      this.scene.add(this.fantasma);
    }
    const f = this.fantasma;
    f.geometry = h.malha.geometry;
    f.visible = true;
    if (h.ind) {
      h.matriz = new THREE.Matrix4();
      h.malha.getMatrixAt(h.ind.vaga, h.matriz);
      f.matrix.multiplyMatrices(h.malha.matrixWorld, h.matriz);
      h.malha.getColorAt(h.ind.vaga, f.material.color);
      h.malha.setMatrixAt(h.ind.vaga, this.matrizZero);
      h.malha.instanceMatrix.needsUpdate = true;
    } else {
      f.matrix.copy(h.malha.matrixWorld);
      f.material.color.copy(h.malha.material.color);
      h.malha.visible = false;
    }
    f.matrixWorldNeedsUpdate = true;
    this.sobrevoo = h;
  }

  /** Seleção a partir de coordenadas normalizadas da tela (-1..1). */
  selecionarNDC(ndc) {
    this.restaurarSobrevoo();
    const hit = this.encontrarArvore(ndc);
    const anterior = this.selecionado;
    const cor = new THREE.Color();
    if (anterior) for (const im of anterior.grupo.malhas) im.setColorAt(anterior.vaga, cor.setScalar(anterior.tom));
    this.selecionado = null;
    const peca = hit?.malha.userData.viveiro ? hit.malha : null;
    if (peca) {
      const d = peca.userData.viveiro;
      const def = ESPECIES[d.especie];
      const enfeite = def.fruto ?? def.flor;
      const ESTAG = ["Broto", "Muda", "Jovem", "Adulta"];
      for (const g of this.grupos) for (const im of g.malhas) im.instanceColor.needsUpdate = true;
      return this.aoSelecionar?.({ numero: "viveiro", nome: d.nome, especie: d.especie, estagio: ESTAG[d.estagio], extra: ["Vitrine do viveiro", ...(enfeite ? [`Adulta: com ${enfeite.nome}`] : [])] });
    }
    if (hit?.ind) {
      this.selecionado = hit.ind;
      hit.malha.setColorAt(hit.ind.vaga, cor.setScalar(hit.ind.tom * 1.35));
    }
    for (const g of this.grupos) for (const im of g.malhas) im.instanceColor.needsUpdate = true;
    const i = this.selecionado;
    if (!i) return this.aoSelecionar?.(null);
    const def = ESPECIES[i.especie];
    const extra = descrever(i);
    const enfeite = def.fruto ?? def.flor;
    if (enfeite) extra.push(i.indice === 3 ? `Com ${enfeite.nome}` : `${enfeite.nome[0].toUpperCase()}${enfeite.nome.slice(1)} quando adulta`);
    this.aoSelecionar?.({ numero: i.numero, nome: i.nome, especie: i.especie, estagio: i.estagio.nome, extra });
  }

  // --- Capim, flores, pedras, troncos -------------------------------------

  criarDetalhes() {
    const m = this.mundo;
    const rng = criarRng(m.semente ^ 0x99);
    const d = new THREE.Object3D();

    // Capim: 3 formatos, agrupado por manchas, fora da trilha e da água.
    // Capim balança devagar (uVel 0.5) e não grava profundidade: o contorno de
    // tinta não o enxerga, então as lâminas não ganham riscos que piscam; ele se
    // lê pela cor (base escura, ponta clara). Desenhado depois dos opacos, ainda
    // fica corretamente atrás de troncos e pedras.
    const matCapim = toon({ vertexColors: true, side: THREE.DoubleSide, depthWrite: false });
    for (let f = 0; f < 3; f++) {
      const max = Math.round(2600 * m.areaRel);
      const im = new THREE.InstancedMesh(touceira(criarRng(m.semente + f)), matCapim, max);
      let n = 0;
      for (let t = 0; t < max * 5 && n < max; t++) {
        const x = rng() * m.largura, z = rng() * m.altura;
        if (m.fatorLago(x, z) < 1.05 || m.distTrilha(x, z) < m.trilha.largura * 0.6 || m.declive(x, z) > 0.5 || m.distRiacho(x, z) < m.larguraRiacho(x,z) * 0.5 + 0.6) continue;
        const mancha = m.fino(x / 9, z / 9, 3);
        const margem = 1 - suave(1.05, 1.4, m.fatorLago(x, z));
        if (rng() > Math.min(1, suave(0.35, 0.65, mancha) * (1 - m.densidade(x, z) * 0.5) + margem)) continue;
        d.position.set(x, this.alturaEm(x, z), z);
        d.rotation.set(0, rng() * 6.28, 0);
        const s = 0.8 + rng() * 0.8 + margem * 0.5;
        d.scale.set(s, s * (0.8 + rng() * 0.6), s);
        d.updateMatrix();
        im.setMatrixAt(n++, d.matrix);
      }
      im.count = n;
      im.receiveShadow = true;
      im.frustumCulled = false;
      im.renderOrder = 1;
      this.scene.add(im);
    }

    // Flores: miolo colorido sobre um caule curto (viram 1–2 pixels de cor).
    const coresFlor = [RAMPAS.betula[0], RAMPAS.outono[4], RAMPAS.flor[2], RAMPAS.flor[3]];
    const flores = m.objetos.filter((o) => o.tipo === "flor");
    const geoFlor = new THREE.IcosahedronGeometry(0.16, 0);
    geoFlor.translate(0, 0.32, 0);
    const imFlor = new THREE.InstancedMesh(geoFlor, toon({ color: 0xffffff }), flores.length * 4);
    let nf = 0;
    for (const f of flores)
      for (let k = 0; k < 4; k++) {
        const x = f.x + (rng() - 0.5) * 1.6, z = f.y + (rng() - 0.5) * 1.6;
        d.position.set(x, this.alturaEm(x, z), z);
        d.rotation.set(0, 0, 0);
        d.scale.setScalar(0.8 + rng() * 0.5);
        d.updateMatrix();
        imFlor.setMatrixAt(nf, d.matrix);
        imFlor.setColorAt(nf++, cor(coresFlor[(f.cor + (k === 3 ? 1 : 0)) % coresFlor.length]));
      }
    imFlor.count = nf;
    imFlor.castShadow = true;
    this.scene.add(imFlor);

    // Pedras (facetadas, com musgo) e madeira caída.
    const pedras = m.objetos.filter((o) => o.tipo === "pedra");
    const matPedra = toon({ vertexColors: true });
    [pedraGeo(m.semente + 1), pedraGeo(m.semente + 2), pedraGeo(m.semente + 3)].forEach((geo, k) => {
      const minhas = pedras.filter((_, i) => i % 3 === k);
      const im = new THREE.InstancedMesh(geo, matPedra, minhas.length);
      minhas.forEach((p, i) => {
        d.position.set(p.x, this.alturaEm(p.x, p.y) - 0.15, p.y);
        d.rotation.set(0, p.giro, 0);
        d.scale.setScalar(p.escala * (0.7 + rng() * 0.6));
        d.updateMatrix();
        im.setMatrixAt(i, d.matrix);
      });
      im.castShadow = im.receiveShadow = true;
      this.scene.add(im);
    });
    const madeira = toon({ color: RAMPAS.terra[2] });
    for (const o of m.objetos) {
      if (o.tipo !== "toco" && o.tipo !== "tronco") continue;
      const caido = o.tipo === "tronco";
      const g = caido ? new THREE.CylinderGeometry(0.28, 0.34, 4 * o.escala, 7) : new THREE.CylinderGeometry(0.42, 0.55, 0.7, 7);
      const malha = new THREE.Mesh(g, madeira);
      malha.position.set(o.x, this.alturaEm(o.x, o.y) + (caido ? 0.2 : 0.3), o.y);
      if (caido) malha.rotation.set(Math.PI / 2, 0, o.giro);
      malha.castShadow = malha.receiveShadow = true;
      this.scene.add(malha);
    }

    // Vaga-lumes (noite): pontos de 1 pixel que piscam.
    const n = Math.round(140 * m.areaRel), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = rng() * m.largura, z = rng() * m.altura;
      pos.set([x, this.alturaEm(x, z) + 0.6 + rng() * 2.5, z], i * 3);
    }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.vagalumes = new THREE.Points(gp, new THREE.PointsMaterial({ color: RAMPAS.luz[0], size: 1.5, sizeAttenuation: false, transparent: true }));
    this.scene.add(this.vagalumes);
  }

  // --- Luz e hora ---------------------------------------------------------

  criarLuz() {
    this.ceu = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    this.sol = new THREE.DirectionalLight(0xffffff, 2);
    this.sol.castShadow = true;
    const sombra = Math.min(this.qualidade === "alta" ? 4096 : 2048, this.renderer.capabilities.maxTextureSize);
    this.sol.shadow.mapSize.set(sombra, sombra);
    const ext = 115;
    Object.assign(this.sol.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 400 });
    this.sol.shadow.bias = -0.0006;
    this.sol.shadow.normalBias = 0.04;
    this.sol.target.position.set(this.mundo.largura / 2, 0, this.mundo.altura / 2);
    this.scene.add(this.ceu, this.sol, this.sol.target);
  }

  aplicarHora() {
    if (!this.sol) return;
    const H = {
      dia: { sol: 0xfff1d6, i: 2.2, dir: [-0.6, 1, -0.35], ceu: 0xe4ecd2, chao: 0x6c7a52, ic: 1.25, fundo: RAMPAS.salvia[1], exp: 1.0 },
      entardecer: { sol: 0xffa060, i: 2.0, dir: [-0.95, 0.45, -0.2], ceu: 0xffc89c, chao: 0x45352c, ic: 0.85, fundo: RAMPAS.terra[1], exp: 1.0 },
      noite: { sol: 0x8fa8ff, i: 0.7, dir: [-0.3, 1, 0.4], ceu: 0x3a4d80, chao: 0x101422, ic: 0.55, fundo: RAMPAS.noite[0], exp: 1.15 },
    }[this.hora];
    const c = new THREE.Vector3(this.mundo.largura / 2, 0, this.mundo.altura / 2);
    const dir = new THREE.Vector3(...H.dir).normalize();
    this.sol.position.copy(c).addScaledVector(dir, 200);
    this.sol.color.setHex(H.sol);
    this.sol.intensity = H.i;
    this.ceu.color.setHex(H.ceu);
    this.ceu.groundColor.setHex(H.chao);
    this.ceu.intensity = H.ic;
    this.scene.background = cor(H.fundo);
    this.renderer.toneMappingExposure = H.exp;
    this.vagalumes.visible = this.hora === "noite";
  }

  // --- Câmera e controles -------------------------------------------------

  redimensionar() {
    if (this.descartado) return;
    // Sem tamanho ainda (aba/painel oculto): usa a janela; o ResizeObserver corrige depois.
    const caixa = this.canvas.getBoundingClientRect();
    const r = caixa.width && caixa.height ? caixa : { width: window.innerWidth || 800, height: window.innerHeight || 600 };
    const tamanho = dimensoesRender(r.width, r.height, this.qualidade, this.renderer.capabilities.maxTextureSize);
    this.renderer.setSize(tamanho.largura, tamanho.altura, false);
    const w = Math.max(1, Math.floor(tamanho.largura / this.tamPixel));
    const h = Math.max(1, Math.floor(tamanho.altura / this.tamPixel));
    if (!this.rt) {
      const dt = new THREE.DepthTexture(w, h);
      dt.minFilter = dt.magFilter = THREE.NearestFilter;
      this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: dt });
    } else this.rt.setSize(w, h);
    this.pixel.uniforms.uTam.value.set(w, h);
    this.aspecto = r.width / r.height;
  }

  posicionarCamera() {
    const meia = this.altura / 2;
    this.camera.top = meia;
    this.camera.bottom = -meia;
    this.camera.left = -meia * this.aspecto;
    this.camera.right = meia * this.aspecto;
    this.camera.updateProjectionMatrix();
    const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    // "Snap" ao grid de pixels: o alvo anda em múltiplos exatos de 1 pixel na tela.
    this.camera.position.copy(this.alvo).addScaledVector(dir, 250);
    this.camera.lookAt(this.alvo);
    const texel = this.altura / this.rt.height;
    const dirX = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const dirY = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const px = this.alvo.dot(dirX), py = this.alvo.dot(dirY);
    const ajuste = dirX.multiplyScalar(Math.round(px / texel) * texel - px).add(dirY.multiplyScalar(Math.round(py / texel) * texel - py));
    this.camera.position.add(ajuste);
    this.pixel.uniforms.uTexel.value = texel;
  }

  ligarControles() {
    const c = this.canvas;
    const signal = this.cancelamento.signal;
    const ponteiros = new Map();
    let pinca = 0, angulo = null;
    const mover = (dx, dy) => {
      // Arrastar move o chão sob o cursor (direita/frente da câmera projetadas no plano).
      const mpp = this.altura / c.clientHeight;
      const dir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const lado = new THREE.Vector3(dir.z, 0, -dir.x);
      this.alvo.addScaledVector(lado, -dx * mpp);
      this.alvo.addScaledVector(dir, (-dy * mpp) / Math.sin(this.pitch));
      this.limitar();
    };
    let inicio = null;
    c.addEventListener("contextmenu", e => e.preventDefault(), { signal });
    c.addEventListener("auxclick", e => { if (e.button === 1) e.preventDefault(); }, { signal });
    c.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && ![0, 1, 2].includes(e.button)) return;
      if (e.button === 1) e.preventDefault(); // impede a rolagem automática da rodinha
      c.setPointerCapture(e.pointerId);
      this.focarEm(null);
      const giro = e.button === 2 ? "inclinar" : e.button === 1 || e.shiftKey ? "girar" : null;
      ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY, giro });
      inicio = ponteiros.size === 1 && !giro ? { x: e.clientX, y: e.clientY } : null;
      if (ponteiros.size === 2) {
        const [p, q] = [...ponteiros.values()];
        pinca = Math.hypot(p.x - q.x, p.y - q.y);
        angulo = Math.atan2(q.y - p.y, q.x - p.x);
      }
    }, { signal });
    c.addEventListener("pointermove", (e) => {
      const a = ponteiros.get(e.pointerId);
      if (!a) {
        if (e.pointerType === "mouse" && !e.buttons) this.focarEm(e.clientX, e.clientY);
        return;
      }
      const b = { x: e.clientX, y: e.clientY, giro: a.giro };
      if (ponteiros.size === 1) {
        if (a.giro === "inclinar") this.pitch = THREE.MathUtils.clamp(this.pitch + (b.y - a.y) * 0.006, THREE.MathUtils.degToRad(20), THREE.MathUtils.degToRad(75));
        else if (a.giro === "girar") this.yaw = this.yawAlvo += (b.x - a.x) * 0.008;
        else mover(b.x - a.x, b.y - a.y);
      }
      ponteiros.set(e.pointerId, b);
      if (ponteiros.size === 2) {
        const [p, q] = [...ponteiros.values()];
        const dd = Math.hypot(p.x - q.x, p.y - q.y);
        const aa = Math.atan2(q.y - p.y, q.x - p.x);
        if (pinca && dd > 2) this.zoom(pinca / dd);
        if (angulo !== null && dd > 2) {
          const delta = Math.atan2(Math.sin(aa - angulo), Math.cos(aa - angulo));
          this.yaw = this.yawAlvo += delta;
        }
        pinca = dd; angulo = aa;
      }
    }, { signal });
    const soltar = (e) => {
      if (!ponteiros.has(e.pointerId)) return;
      ponteiros.delete(e.pointerId);
      pinca = 0; angulo = null;
      if (inicio && e.type === "pointerup" && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < 5) this.selecionarEm(e.clientX, e.clientY);
      inicio = null;
      const r = c.getBoundingClientRect();
      if (!ponteiros.size && e.pointerType === "mouse" && e.type === "pointerup" && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) this.focarEm(e.clientX, e.clientY);
    };
    c.addEventListener("pointerup", soltar, { signal });
    c.addEventListener("pointercancel", soltar, { signal });
    c.addEventListener("lostpointercapture", soltar, { signal });
    c.addEventListener("pointerleave", () => this.focarEm(null), { signal });
    c.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.zoom(Math.exp(e.deltaY * 0.0012));
    }, { passive: false, signal });
    this.teclas = new Set();
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
      if (e.key === "q" || e.key === "Q") this.girar(-1);
      else if (e.key === "e" || e.key === "E") this.girar(1);
      else this.teclas.add(e.key.toLowerCase());
    }, { signal });
    window.addEventListener("keyup", (e) => this.teclas.delete(e.key.toLowerCase()), { signal });
    window.addEventListener("blur", () => {
      this.teclas.clear(); ponteiros.clear(); inicio = null; pinca = 0; angulo = null; this.focarEm(null);
    }, { signal });
    this._mover = mover;
  }

  limitar() {
    // O viveiro fica além da borda sul do mapa: a câmera pode ir até lá.
    this.alvo.x = THREE.MathUtils.clamp(this.alvo.x, 0, this.mundo.largura);
    this.alvo.z = THREE.MathUtils.clamp(this.alvo.z, 0, this.fimViveiro ?? this.mundo.altura + 50);
  }

  /**
   * Viveiro: vitrine de todas as espécies e seus 4 estágios, em fileiras,
   * numa faixa plana além da borda sul do mapa. Serve para revisar a arte.
   */
  montarViveiro() {
    const ids = Object.keys(ESPECIES);
    const z0 = this.mundo.altura + 12;
    this.viveiro = [];
    this.rotulosViveiro = [];
    const grupos=organizarViveiro(ids.map(id=>this.variacoes.find(v=>v.especie===id)),this.mundo.largura,z0);
    this.posicoesViveiro=new Map(grupos.map(g=>[g.especie,g]));
    this.fimViveiro=Math.max(...grupos.map(g=>g.limites.maxZ))+6;
    for(const grupo of grupos) {
      const id=grupo.especie;
      for(const {geo,estagio:e,x,z} of grupo.modelos) {
        const malha = new THREE.Mesh(geo, this.matArvore);
        malha.position.set(x, this.alturaEm(x, z), z);
        malha.castShadow = malha.receiveShadow = true;
        malha.userData.viveiro = { nome: ESPECIES[id].nome, estagio: e, especie: id };
        this.scene.add(malha);
        this.viveiro.push(malha);
      }
      const placa=document.createElement('canvas');placa.width=512;placa.height=64;
      const ctx=placa.getContext('2d');ctx.fillStyle=RAMPAS.tinta[0];ctx.fillRect(0,0,512,64);
      ctx.fillStyle=RAMPAS.betula[0];ctx.textAlign='center';ctx.textBaseline='middle';
      let tamanho=30;ctx.font=`bold ${tamanho}px monospace`;
      while(ctx.measureText(ESPECIES[id].nome).width>490){tamanho--;ctx.font=`bold ${tamanho}px monospace`;}
      ctx.fillText(ESPECIES[id].nome,256,32);
      const mapa=new THREE.CanvasTexture(placa);mapa.minFilter=mapa.magFilter=THREE.NearestFilter;mapa.generateMipmaps=false;mapa.colorSpace=THREE.SRGBColorSpace;
      const rotulo=new THREE.Sprite(new THREE.SpriteMaterial({map:mapa,depthWrite:false}));
      rotulo.scale.set(11,1.375,1);rotulo.position.set(grupo.rotulo.x,.12,grupo.rotulo.z);rotulo.visible=false;
      this.scene.add(rotulo);this.rotulosViveiro.push(rotulo);
    }
  }

  /** Leva a câmera ao viveiro (ou de volta ao bosque). */
  irAoViveiro(ir = true) {
    for(const rotulo of this.rotulosViveiro ?? [])rotulo.visible=ir;
    if (ir) {
      this.alvo.set(14, 0, this.mundo.altura + 28);
      this.altura = 46;
    } else {
      this.alvo.set(this.mundo.largura * 0.5, 4, this.mundo.altura * 0.5);
      this.altura = 180;
    }
  }

  /** Visita um conjunto inteiro, sem procurar a espécie entre todas as fileiras. */
  focarEspecieViveiro(id) {
    const g=this.posicoesViveiro?.get(id);if(!g)return;
    this.irAoViveiro(true);
    this.alvo.set((g.limites.minX+g.limites.maxX)/2,0,(g.limites.minZ+g.limites.maxZ)/2);
    this.altura=Math.max(24,Math.min(85,g.limites.maxX-g.limites.minX+12));
  }

  recentrar() {
    this.irAoViveiro(false);
    this.yaw = this.yawAlvo = Math.PI / 4;
    this.pitch = THREE.MathUtils.degToRad(38);
  }

  irParaLocal(id) {
    const local=this.mundo.plano?.locais.find(l=>l.id===id);
    if(!local)return false;
    this.focarEm(null);
    this.alvo.set(local.x,Math.max(0,this.alturaEm(local.x,local.y)),local.y);
    this.altura=local.tipo==="ponte-madeira"?46:local.tipo==="escada"?18:local.tipo==="agua"&&id==="lago"?52:32;
    return true;
  }

  zoom(f) {
    this.altura = THREE.MathUtils.clamp(this.altura * f, 8, 240);
  }
  girar(sentido) {
    this.yawAlvo += (sentido * Math.PI) / 4;
  }

  // --- API da página ------------------------------------------------------

  setCrescimento(v) { this.crescimento = v; }
  setHora(h) { this.hora = h; this.aplicarHora(); }
  setTamPixel(p) { this.tamPixel = p; this.redimensionar(); }
  setQualidade(qualidade) {
    if (!["alta", "original"].includes(qualidade) || qualidade === this.qualidade) return;
    this.qualidade = qualidade;
    if (this.sol) {
      const tamanho = Math.min(qualidade === "alta" ? 4096 : 2048, this.renderer.capabilities.maxTextureSize);
      this.sol.shadow.mapSize.set(tamanho, tamanho);
      this.sol.shadow.map?.dispose();
      this.sol.shadow.map = null;
      this.sol.shadow.needsUpdate = true;
    }
    this.redimensionar();
  }
  setContorno(on) { this.pixel.uniforms.uContorno.value = on ? 1 : 0; }
  setPaleta(on) { this.pixel.uniforms.uQuant.value = on ? 1 : 0; }

  quadroAnim() {
    this.relogio.update();
    const t = this.relogio.getElapsed();
    const dt = Math.min(0.05, this.relogio.getDelta());
    this.restaurarSobrevoo();
    this.atualizarCrescimento();
    // Teclado: WASD / setas movem; giro animado até o próximo passo de 45°.
    const k = this.teclas, v = 280 * dt;
    if (k.has("w") || k.has("arrowup")) this._mover(0, v);
    if (k.has("s") || k.has("arrowdown")) this._mover(0, -v);
    if (k.has("a") || k.has("arrowleft")) this._mover(v, 0);
    if (k.has("d") || k.has("arrowright")) this._mover(-v, 0);
    this.yaw += (this.yawAlvo - this.yaw) * Math.min(1, dt * 7);
    const sa = this.agua.material.userData.shader;
    if (sa) {
      sa.uniforms.uTime.value = t;
      sa.uniforms.uBrilho.value = this.hora === "noite" ? 0.22 : this.hora === "entardecer" ? 0.7 : 1;
    }
    for (const material of this.aguaPercurso?.userData.materiaisAnimados ?? []) {
      const sr = material.userData.shader;
      if (sr) sr.uniforms.uTime.value = t;
    }
    if (this.vagalumes.visible) this.vagalumes.material.opacity = 0.55 + 0.45 * Math.sin(t * 2.3);

    this.posicionarCamera();
    this.uDireita.value.set(Math.cos(this.yaw),-Math.sin(this.yaw));
    this.atualizarSobrevoo(t);
    const u = this.pixel.uniforms;
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    u.tCor.value = this.rt.texture;
    u.tProf.value = this.rt.depthTexture;
    u.uNear.value = this.camera.near;
    u.uFar.value = this.camera.far;
    this.renderer.render(this.cena2d, this.cam2d);
  }

  dispose() {
    if (this.descartado) return;
    this.descartado = true;
    this.restaurarSobrevoo();
    this.cursorArvore = this.alvoSobrevoo = null;
    this.cancelamento.abort();
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.ro?.disconnect();
    this.ro = null;
    this.teclas?.clear();
    this.aoSelecionar = null;
    this.selecionado = null;
    if (!this.compilando) this.liberarRecursos();
  }

  liberarRecursos() {
    if (this.recursosLiberados) return;
    this.recursosLiberados = true;
    // Geometrias e materiais de instâncias são compartilhados: liberar uma vez.
    // Inclui variações ainda não plantadas e o quad de pós-processamento.
    const geometrias = new Set(), materiais = new Set();
    for (const cena of [this.scene, this.cena2d]) {
      cena.traverse((o) => {
        if (o.geometry) geometrias.add(o.geometry);
        for (const m of [].concat(o.material ?? [])) materiais.add(m);
        if (o.isInstancedMesh) o.dispose();
        o.shadow?.dispose();
      });
      cena.clear();
    }
    for (const v of this.variacoes ?? []) {
      for (const g of v.estagios) geometrias.add(g);
    }
    materiais.add(this.matArvore);
    for (const g of geometrias) g.dispose();
    for (const m of materiais) m.dispose();
    for(const rotulo of this.rotulosViveiro ?? [])rotulo.material.map.dispose();
    this.rotulosViveiro=[];
    this.posicoesViveiro?.clear();
    // A rampa toon é um cache do módulo, reutilizado entre Jardins; não pertence
    // à instância, portanto continua disponível para o próximo Jardim.
    this.rt?.dispose();
    this.relogio.dispose();
    this.renderer.dispose();
    this.variacoes = [];
    this.individuos = [];
    this.grupos = [];
    this.viveiro = [];
    this.malhaParaGrupo?.clear();
  }

  info() {
    return { ...this.renderer.info.render, rt: [this.rt.width, this.rt.height], instancias: this.individuos.length };
  }
}
