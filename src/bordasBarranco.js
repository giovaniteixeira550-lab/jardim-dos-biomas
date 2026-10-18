/** Capas finas de solo e grama, sem avanços largos nas quinas dos barrancos. */
import * as THREE from "three";
import { RAMPAS } from "./paleta.js";

const hash = (x, z, sal = 0) => {
  const n = Math.sin(x * 127.1 + z * 311.7 + sal * 74.73) * 43758.5453;
  return n - Math.floor(n);
};

/**
 * Apenas acrescenta volume às bordas; não modifica o terreno nem seus campos.
 * O desenho usa coordenadas do mundo e permanece igual ao girar a câmera.
 */
export function criarBordasBarranco(mundo, geometriaTerreno, indicesParede, toon) {
  const grupo = new THREE.Group();
  grupo.name = "bordas-barrancos";
  const pos = geometriaTerreno.getAttribute("position");
  const limites = geometriaTerreno.getAttribute("aLimitesSolo");
  if (!pos || !limites || !indicesParede?.length) return grupo;

  const vertices = [], cores = [];
  const vistas = new Set();
  const terraEscura = new THREE.Color(RAMPAS.terra[1]);
  const terraMedia = new THREE.Color(RAMPAS.terra[2]);
  const verdeTopo = [new THREE.Color(RAMPAS.salvia[3]), new THREE.Color(RAMPAS.salvia[4])];
  const verdeLado = new THREE.Color(RAMPAS.salvia[2]);
  const limiteTriangulos = 4800;
  let triangulos = 0, labios = 0, arestasConsolidadas = 0;
  let inverterFaces = false;
  const vertice = (i) => new THREE.Vector3().fromBufferAttribute(pos, i);
  const triangulo = (a, b, c, tinta) => {
    for (const p of [a, b, c]) {
      vertices.push(p.x, p.y, p.z);
      cores.push(tinta.r, tinta.g, tinta.b);
    }
    triangulos++;
  };
  const quad = (a, b, c, d, tinta) => {
    // A ordem dos extremos depende de qual aresta do triângulo foi extraída.
    if (inverterFaces) { triangulo(a, d, c, tinta); triangulo(a, c, b, tinta); }
    else { triangulo(a, b, c, tinta); triangulo(a, c, d, tinta); }
  };
  const livre = (x, z) => {
    if (x < 1 || z < 1 || x > mundo.largura - 1 || z > mundo.altura - 1) return false;
    if (mundo.distTrilha(x, z) < mundo.trilha.largura / 2 + 1.4) return false;
    const larguraRio = mundo.larguraRiacho?.(x, z) ?? mundo.riacho.largura;
    if (mundo.distRiacho(x, z) < larguraRio / 2 + 1.8 || mundo.fatorLago(x, z) < 1.08) return false;
    return !mundo.plano?.locais?.some((l) => l.status === "proposto"
      && Math.abs(x - l.x) < l.largura / 2 + 0.4 && Math.abs(z - l.y) < l.profundidade / 2 + 0.4);
  };

  const arestas = [], porVertice = new Map();
  for (let i = 0; i < indicesParede.length; i += 3) {
    const ids = [indicesParede[i], indicesParede[i + 1], indicesParede[i + 2]];
    const pontos = ids.map(vertice);
    // A aresta precisa tocar o topo local e ter uma face descendendo logo abaixo.
    for (const [ia, ib, ic] of [[0, 1, 2], [1, 2, 0], [2, 0, 1]]) {
      const a = pontos[ia], b = pontos[ib], baixo = pontos[ic];
      if (Math.abs(a.y - b.y) > 0.18 || Math.min(a.y, b.y) - baixo.y < 0.5) continue;
      if (limites.getX(ids[ia]) - a.y > 0.35 || limites.getX(ids[ib]) - b.y > 0.35) continue;
      const chave = ids[ia] < ids[ib] ? `${ids[ia]}:${ids[ib]}` : `${ids[ib]}:${ids[ia]}`;
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      const meio = a.clone().add(b).multiplyScalar(0.5);
      if (!livre(meio.x, meio.z)) continue;
      // As interrupções pertencem a massas largas, não a cada quadrado de 0,5 m.
      if (hash(Math.floor(meio.x / 5.2), Math.floor(meio.z / 5.2), 2) < 0.18) continue;
      const tangente = b.clone().sub(a); tangente.y = 0;
      const comprimento = tangente.length();
      if (comprimento < 0.15 || comprimento > 1.5) continue;
      tangente.divideScalar(comprimento);
      const fora = baixo.clone().sub(meio); fora.y = 0;
      fora.addScaledVector(tangente, -fora.dot(tangente));
      if (fora.lengthSq() < 1e-6) continue;
      fora.normalize();
      const aresta = { a, b, ia: ids[ia], ib: ids[ib], fora,
        prioridade: hash(Math.floor(meio.x / 5.2), Math.floor(meio.z / 5.2), 29) + hash(meio.x, meio.z, 31) * 0.005 };
      arestas.push(aresta);
      for (const id of [aresta.ia, aresta.ib]) {
        if (!porVertice.has(id)) porVertice.set(id, []);
        porVertice.get(id).push(aresta);
      }
      break;
    }
  }

  // Junta segmentos realmente colineares e apoiados no mesmo topo. As placas
  // maiores eliminam os retalhos repetidos a cada célula, sem atalhar curvas.
  const usadas = new Set();
  for (const inicial of arestas.sort((a, b) => a.prioridade - b.prioridade)) {
    if (triangulos + 18 > limiteTriangulos) break;
    if (usadas.has(inicial)) continue;
    usadas.add(inicial);
    let a = inicial.a.clone(), b = inicial.b.clone(), ia = inicial.ia, ib = inicial.ib, unidos = 1;
    const fora = inicial.fora;
    for (let rodada = 0; rodada < 5; rodada++) {
      let cresceu = false;
      for (const inicio of [true, false]) {
        const id = inicio ? ia : ib, ponta = inicio ? a : b, outra = inicio ? b : a;
        const direcao = ponta.clone().sub(outra); direcao.y = 0; direcao.normalize();
        for (const vizinha of porVertice.get(id) ?? []) {
          if (usadas.has(vizinha) || fora.dot(vizinha.fora) < 0.94) continue;
          const novoId = vizinha.ia === id ? vizinha.ib : vizinha.ia;
          const novaPonta = (vizinha.ia === id ? vizinha.b : vizinha.a).clone();
          const extensao = novaPonta.clone().sub(ponta); extensao.y = 0; extensao.normalize();
          if (extensao.dot(direcao) < 0.97 || Math.abs(novaPonta.y - outra.y) > 0.18
            || Math.hypot(novaPonta.x - outra.x, novaPonta.z - outra.z) > 2.2) continue;
          if (inicio) { a = novaPonta; ia = novoId; } else { b = novaPonta; ib = novoId; }
          usadas.add(vizinha); unidos++; cresceu = true;
          break;
        }
      }
      if (!cresceu) break;
    }
    const meio = a.clone().add(b).multiplyScalar(0.5);
    const celX = Math.floor(meio.x / 5.2), celZ = Math.floor(meio.z / 5.2);
    const variacao = hash(celX, celZ, 5);
    const tangente = b.clone().sub(a); tangente.y = 0;
    const comprimento = tangente.length(); tangente.divideScalar(comprimento);
    inverterFaces = tangente.z * fora.x - tangente.x * fora.z > 0;
    const e0 = a.clone(), e1 = b.clone();
    const a0 = e0.clone().addScaledVector(fora, -0.14), a1 = e1.clone().addScaledVector(fora, -0.14);
    // Avanço curto e espessura fina evitam uma fileira de dentes na silhueta.
    const avanco = 0.075 + variacao * 0.025;
    const f0 = e0.clone().addScaledVector(fora, avanco), f1 = e1.clone().addScaledVector(fora, avanco);
    if (![a0, a1, f0, f1].every((p) => livre(p.x, p.z))) continue;
    a0.y += 0.012; a1.y += 0.012; f0.y -= 0.025; f1.y -= 0.025;
    const verde = variacao > 0.7 ? verdeTopo[1] : verdeTopo[0];
    const frente = variacao > 0.5 ? terraMedia : terraEscura;
    const espessuraVerde = 0.075;
    const espessuraTotal = espessuraVerde + 0.08;
    const g0 = a0.clone(), g1 = a1.clone(), gf0 = f0.clone(), gf1 = f1.clone();
    for (const p of [g0, g1, gf0, gf1]) p.y -= espessuraVerde;
    const b0 = a0.clone(), b1 = a1.clone(), f2 = f0.clone(), f3 = f1.clone();
    for (const p of [b0, b1, f2, f3]) p.y -= espessuraTotal;
    quad(a0, f0, f1, a1, verde);
    quad(f0, gf0, gf1, f1, verdeLado);
    quad(gf0, f2, f3, gf1, frente);
    quad(a0, g0, gf0, f0, verdeLado);
    quad(g0, b0, f2, gf0, frente);
    quad(a1, f1, gf1, g1, verdeLado);
    quad(g1, gf1, f3, b1, frente);
    quad(b0, b1, f3, f2, terraEscura);
    quad(a0, a1, b1, b0, terraMedia);
    labios++; arestasConsolidadas += unidos;
  }

  const adicionar = (pontos, tintas, nome, duplaFace = false) => {
    if (!pontos.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pontos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(tintas, 3));
    g.computeVertexNormals();
    const material = toon({ vertexColors: true, side: duplaFace ? THREE.DoubleSide : THREE.FrontSide });
    const malha = new THREE.Mesh(g, material);
    malha.name = nome;
    malha.castShadow = malha.receiveShadow = true;
    grupo.add(malha);
  };
  adicionar(vertices, cores, "labios-terra");
  grupo.userData = { labios, placas: labios, tufos: 0, arestasConsolidadas, triangulos,
    referencia: "mundo", alteraAltura: false, estilo: "capas-graficas" };
  return grupo;
}
