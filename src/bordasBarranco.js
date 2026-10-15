/** Pequenos recortes de terra e capim presos às quinas reais dos barrancos. */
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
  const coresTerreno = geometriaTerreno.getAttribute("color");
  const limites = geometriaTerreno.getAttribute("aLimitesSolo");
  if (!pos || !coresTerreno || !limites || !indicesParede?.length) return grupo;

  const vertices = [], cores = [], folhas = [], coresFolhas = [];
  const vistas = new Set();
  const terraEscura = new THREE.Color(RAMPAS.terra[1]);
  const terraMedia = new THREE.Color(RAMPAS.terra[2]);
  const terraClara = new THREE.Color(RAMPAS.terra[3]);
  const limiteTriangulos = 4800;
  let triangulos = 0, labios = 0, tufos = 0;
  let inverterFaces = false;
  const vertice = (i) => new THREE.Vector3().fromBufferAttribute(pos, i);
  const corVertice = (i) => new THREE.Color().fromBufferAttribute(coresTerreno, i);
  const triangulo = (a, b, c, tinta, destino = vertices, tintas = cores) => {
    for (const p of [a, b, c]) {
      destino.push(p.x, p.y, p.z);
      tintas.push(tinta.r, tinta.g, tinta.b);
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

  // Distribui o orçamento pelo mapa, mantendo grupos vizinhos. A ordem linear
  // da grade concentraria todas as bordas na primeira metade do jardim.
  const ordem = Array.from({ length: Math.floor(indicesParede.length / 3) }, (_, n) => {
    const i = n * 3;
    const x = (pos.getX(indicesParede[i]) + pos.getX(indicesParede[i + 1]) + pos.getX(indicesParede[i + 2])) / 3;
    const z = (pos.getZ(indicesParede[i]) + pos.getZ(indicesParede[i + 1]) + pos.getZ(indicesParede[i + 2])) / 3;
    return { i, prioridade: hash(Math.floor(x / 3.4), Math.floor(z / 3.4), 29) + hash(x, z, 31) * 0.005 };
  }).sort((a, b) => a.prioridade - b.prioridade);
  for (const { i } of ordem) {
    if (triangulos + 16 > limiteTriangulos) break;
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
      // Células largas formam grupos interrompidos, sem um dente por célula da grade.
      if (hash(Math.floor(meio.x / 3.4), Math.floor(meio.z / 3.4), 2) < 0.32) continue;
      const tangente = b.clone().sub(a); tangente.y = 0;
      const comprimento = tangente.length();
      if (comprimento < 0.15 || comprimento > 1.5) continue;
      tangente.divideScalar(comprimento);
      const fora = baixo.clone().sub(meio); fora.y = 0;
      fora.addScaledVector(tangente, -fora.dot(tangente));
      if (fora.lengthSq() < 1e-6) continue;
      fora.normalize();
      inverterFaces = tangente.z * fora.x - tangente.x * fora.z > 0;
      const aleatorio = hash(meio.x, meio.z, 5);
      const inicio = 0.015 + hash(meio.x, meio.z, 7) * 0.07;
      const fim = 0.985 - hash(meio.x, meio.z, 9) * 0.07;
      const e0 = a.clone().lerp(b, inicio), e1 = a.clone().lerp(b, fim);
      const recuo = 0.08;
      const a0 = e0.clone().addScaledVector(fora, -recuo);
      const a1 = e1.clone().addScaledVector(fora, -recuo);
      const f0 = e0.clone().addScaledVector(fora, 0.15 + aleatorio * 0.15);
      const f1 = e1.clone().addScaledVector(fora, 0.15 + hash(meio.x, meio.z, 11) * 0.15);
      if (![a0, a1, f0, f1].every((p) => livre(p.x, p.z))) continue;
      const espessura = 0.2 + hash(meio.x, meio.z, 13) * 0.2;
      a0.y += 0.012; a1.y += 0.012;
      f0.y -= 0.035 + aleatorio * 0.035;
      f1.y -= 0.035 + hash(meio.x, meio.z, 15) * 0.035;
      const b0 = a0.clone(), b1 = a1.clone(), f2 = f0.clone(), f3 = f1.clone();
      b0.y -= espessura; b1.y -= espessura;
      f2.y -= espessura; f3.y -= espessura;
      const topo = corVertice(ids[ia]).lerp(corVertice(ids[ib]), 0.5);
      const frente = aleatorio > 0.62 ? terraMedia : terraEscura;
      quad(a0, f0, f1, a1, topo);
      quad(f0, f2, f3, f1, frente);
      quad(a0, b0, f2, f0, terraMedia);
      quad(a1, f1, f3, b1, terraMedia);
      quad(b0, b1, f3, f2, terraEscura);
      quad(a0, a1, b1, b0, terraClara);
      labios++;

      // Poucas lâminas fixas, com planos distintos: capim 3D, sem billboard ou vento.
      if (aleatorio > 0.42) {
        const raiz = e0.clone().lerp(e1, 0.25 + hash(meio.x, meio.z, 17) * 0.5);
        raiz.addScaledVector(fora, 0.025); raiz.y += 0.018;
        for (const sentido of [-1, 1]) {
          const base0 = raiz.clone().addScaledVector(tangente, -0.028);
          const base1 = raiz.clone().addScaledVector(tangente, 0.028);
          const ponta = raiz.clone().addScaledVector(tangente, sentido * 0.07)
            .addScaledVector(fora, 0.025 + sentido * 0.025);
          ponta.y += 0.13 + hash(meio.x, meio.z, 19 + sentido) * 0.12;
          triangulo(base0, base1, ponta, topo, folhas, coresFolhas);
        }
        tufos++;
      }
      break;
    }
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
  adicionar(folhas, coresFolhas, "tufos-borda", true);
  grupo.userData = { labios, tufos, triangulos, referencia: "mundo", alteraAltura: false };
  return grupo;
}
