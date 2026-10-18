/** Postes de pediatria: bengala em volume, faixas helicoidais e luz quente real. */
import * as THREE from "three";
import { RAMPAS } from "./paleta.js";

class CurvaDoce extends THREE.Curve {
  getPoint(t, alvo = new THREE.Vector3()) {
    const comprimento = 4.25 + Math.PI * .85, s = t * comprimento;
    if (s <= 4.25) return alvo.set(0, s, 0);
    const a = (s - 4.25) / .85;
    return alvo.set(.85 - .85 * Math.cos(a), 4.25 + .85 * Math.sin(a), 0);
  }
}

function texturaDoce() {
  const w = 512, h = 64, dados = new Uint8Array(w * h * 4);
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const branco = rgb(RAMPAS.betula[0]), vermelho = rgb(RAMPAS.vermelho[1]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fase = ((x / w * 9 - y / h) % 1 + 1) % 1;
    dados.set([...(fase < .46 ? vermelho : branco), 255], (y * w + x) * 4);
  }
  const textura = new THREE.DataTexture(dados, w, h);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.magFilter = THREE.NearestFilter;
  textura.needsUpdate = true;
  return textura;
}

/** Mesmas geometrias e materiais para a prancheta e o caminho. */
export function criarRecursosPoste(toon) {
  const doce = toon({map: texturaDoce()});
  // Mantém as listras legíveis perto do globo, sem estourar o vermelho em amarelo.
  doce.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>',
      '#include <lights_fragment_end>\nreflectedLight.directDiffuse = min(reflectedLight.directDiffuse, diffuseColor.rgb * 1.15);');
  };
  doce.customProgramCacheKey = () => 'doce-faixas-v1';
  return {
    haste: new THREE.TubeGeometry(new CurvaDoce(), 128, .24, 12, false),
    ponta: new THREE.SphereGeometry(.24, 12, 8),
    pe: new THREE.CylinderGeometry(.34, .46, .28, 8),
    globo: new THREE.SphereGeometry(.43, 12, 8),
    aro: new THREE.CylinderGeometry(.27, .33, .14, 10),
    doce,
    branco: toon({color: RAMPAS.betula[0]}),
    pedra: toon({color: RAMPAS.pedra[1]}),
    metal: toon({color: RAMPAS.terra[1]}),
    vidro: toon({color: RAMPAS.betula[0], emissive: RAMPAS.luz[0], emissiveIntensity: 0}),
  };
}

export function criarPosteDoce(recursos) {
  const grupo = new THREE.Group();
  const parte = (geo, mat, x, y) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0);
    m.castShadow = m.receiveShadow = true; grupo.add(m); return m;
  };
  parte(recursos.pe, recursos.pedra, 0, .14);
  parte(recursos.haste, recursos.doce, 0, .28);

  // Luminária pendente na ponta da bengala, conforme indicação do usuário.
  parte(recursos.aro, recursos.metal, 1.7, 4.48);
  const globo = parte(recursos.globo, recursos.vidro, 1.7, 4.0);
  globo.castShadow = false;
  const luz = new THREE.PointLight(RAMPAS.luz[0], 0, 24, 2);
  luz.position.set(1.7, 4.0, 0);
  // Sem sombras extras: preserva o custo do mapa de sombras existente.
  grupo.add(luz);
  grupo.userData.luz = luz;
  return grupo;
}

/** Distribuição na borda real da trilha, sem replantar árvores ou mover percursos. */
export function planejarPostes(mundo) {
  const pontos = mundo.trilha.amostras, locais = [];
  let proximo = 5;
  for (let i = 1; i < pontos.length - 1; i++) {
    const p = pontos[i];
    if (p.s < proximo) continue;
    if (p.ponte || p.escada) continue;
    const a = pontos[Math.max(0, i - 3)], b = pontos[Math.min(pontos.length - 1, i + 3)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len, nz = (b.x - a.x) / len;
    for (const lado of [locais.length % 2 ? -1 : 1, locais.length % 2 ? 1 : -1]) {
      const afastamento = mundo.trilha.largura / 2 + .85;
      const x = p.x + nx * afastamento * lado, z = p.y + nz * afastamento * lado;
      if (x < 1 || z < 1 || x > mundo.largura - 1 || z > mundo.altura - 1) continue;
      const h = mundo.altitude(x, z);
      if (Math.abs(h - p.h) > .7 || mundo.declive(x, z) > .45) continue;
      if (mundo.fatorLago(x, z) < 1.05 || mundo.distRiacho(x, z) < mundo.larguraRiacho(x,z)/2 + .7) continue;
      if (mundo.objetos.some(o => ['arvore', 'arbusto'].includes(o.tipo) && Math.hypot(o.x-x,o.y-z) < 1.9)) continue;
      locais.push({x, z, h, s:p.s, giro:Math.atan2(nx * lado, nz * lado) + Math.PI / 2});
      proximo = p.s + 15;
      break;
    }
  }
  return locais;
}

export function criarPostesDoces(mundo, toon) {
  const grupo = new THREE.Group(); grupo.name = 'Postes doces — Pediatria';
  const recursos = criarRecursosPoste(toon), locais = planejarPostes(mundo);
  for (const p of locais) {
    const poste = criarPosteDoce(recursos);
    poste.position.set(p.x, p.h, p.z); poste.rotation.y = p.giro;
    grupo.add(poste);
  }
  grupo.userData.locais = locais;
  grupo.userData.descartar = () => recursos.doce.map.dispose();
  grupo.userData.aplicarHora = hora => {
    const forca = hora === 'noite' ? 1 : hora === 'entardecer' ? .65 : 0;
    recursos.vidro.emissiveIntensity = forca * 2;
    for (const poste of grupo.children) poste.userData.luz.intensity = 180 * forca;
  };
  return grupo;
}

