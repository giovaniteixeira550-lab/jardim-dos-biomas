/** Estilo de folhagem compartilhado: anatomia 3D da v0.16 do Claude. */
import * as THREE from "three";
import { RAMPAS } from "./paleta.js";
// Luz noturna compartilhada por todos os materiais de árvore: 0 de dia, 0,35 ao entardecer e 1 à noite.
// A cena ajusta o valor em aplicarHora; catálogo, evolução e viveiro ficam em 0 (dia).
export const LUZ_NOTURNA = { value: 0 };

// Cores da copa sem estudo (atributo secura, 0–1, por árvore): oliva ao amarelar, ocre e castanho ao secar.
const cor = (hex) => new THREE.Color(hex);
const CORES_SECURA = {
  uOliva: { value: cor(RAMPAS.salvia[0]).lerp(cor(RAMPAS.amarelo[0]), .32).lerp(cor(RAMPAS.terra[3]), .22) },
  uSeca1: { value: cor(RAMPAS.outono[1]) },
  uSeca2: { value: cor(RAMPAS.terra[3]) },
  uMadeiraSeca: { value: cor(RAMPAS.pedra[2]).lerp(cor(RAMPAS.terra[2]), .45) },
};

export function estiloCopa(sh, direita, texel) {
  sh.uniforms.uTexelC = texel;
  sh.uniforms.uNoite = LUZ_NOTURNA;
  Object.assign(sh.uniforms, CORES_SECURA);
  sh.vertexShader = sh.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
      attribute float banda; attribute vec3 esfera; attribute float raioCopa; attribute float semCopa; attribute float brilho; attribute float brilhoNoite; attribute float secura;
      varying float vSecura; varying vec3 vPosO;
      varying float vBrilho; varying float vBrilhoN; varying float vBanda; varying vec3 vEsf; varying float vRaioC; varying float vSemC; varying vec3 vLeste; varying vec3 vNorte;`,
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vBanda = banda; vEsf = esfera; vRaioC = raioCopa; vSemC = semCopa; vBrilho = brilho; vBrilhoN = brilhoNoite; vSecura = secura; vPosO = position;
      // Eixos tangentes da esfera (leste/norte), levados para o espaço da câmera como a normal.
      vec3 dE = normalize(esfera + vec3(1e-5));
      vec3 le = normalize(cross(vec3(0.0, 1.0, 0.0), dE) + vec3(1e-4, 0.0, 0.0));
      vec3 no = cross(dE, le);
      mat3 mi = mat3(1.0);
      #ifdef USE_INSTANCING
        mi = mat3(instanceMatrix);
      #endif
      vLeste = normalize(normalMatrix * (mi * le));
      vNorte = normalize(normalMatrix * (mi * no));`,
    );
  sh.fragmentShader = sh.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      varying float vBanda; varying vec3 vEsf; varying float vRaioC; varying float vSemC; varying vec3 vLeste; varying vec3 vNorte; varying float vBrilho; varying float vBrilhoN; varying float vSecura; varying vec3 vPosO;
      uniform float uTexelC; uniform float uNoite; uniform vec3 uOliva; uniform vec3 uSeca1; uniform vec3 uSeca2; uniform vec3 uMadeiraSeca;`,
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      if (vBanda > -2.0) {
        if (vBanda > 0.5) diffuseColor.rgb *= vec3(1.12, 1.18, 1.04); // topo iluminado
        else if (vBanda < -0.38) diffuseColor.rgb *= 0.64;            // base na sombra
      }
      // Copa sem estudo (secura vale 0 sem o atributo): amarela, perde tufos e, na seca, os volumes
      // inteiros, um de cada vez, até ficarem só tronco e galhos. O porte não muda.
      if (vSecura > 0.001) {
        float lumS = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        if (vBanda > -2.0) {
          float tam = vRaioC > 0.0 ? clamp(vRaioC * 0.35, 0.25, 1.2) : 0.6;
          vec3 celS = floor(vPosO / tam + vSemC * 17.0);
          float hS = fract(sin(dot(celS, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          float hV = fract(sin(vSemC * 91.7 + 3.1) * 43758.5453);
          if (hS < smoothstep(0.3, 1.0, vSecura) * 0.9 || vSecura > 0.62 + hV * 0.36) discard;
          vec3 alvoS = mix(uOliva, mix(uSeca1, uSeca2, hS), smoothstep(0.3, 0.85, vSecura));
          diffuseColor.rgb = mix(diffuseColor.rgb, alvoS * (0.6 + lumS), smoothstep(0.0, 0.3, vSecura) * 0.9);
        } else {
          // Madeira, flores e frutos só desbotam na seca avançada.
          diffuseColor.rgb = mix(diffuseColor.rgb, uMadeiraSeca * (0.6 + lumS), smoothstep(0.45, 1.0, vSecura) * 0.55);
        }
      }`,
    )
    .replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      if (vBanda > -2.0 && length(vEsf) > 0.5 && uTexelC < 0.16) {
        // Aglomerados = células orgânicas (Voronoi 3D) sobre a superfície do volume:
        // sem linhas nem polos; cada célula é um domo iluminado pelo sol.
        vec3 d = normalize(vEsf);
        float S = clamp(vRaioC * 0.42, 0.5, 1.05);          // tamanho do aglomerado (m)
        vec3 q = d * vRaioC / S + vSemC * 17.0;
        vec3 ip = floor(q), fp = fract(q);
        float d1 = 8.0, d2 = 8.0;
        vec3 m1 = vec3(0.0);
        for (int x = -1; x <= 1; x++)
          for (int y = -1; y <= 1; y++)
            for (int z = -1; z <= 1; z++) {
              vec3 g = vec3(float(x), float(y), float(z));
              vec3 h = ip + g;
              vec3 o = fract(sin(vec3(dot(h, vec3(127.1, 311.7, 74.7)), dot(h, vec3(269.5, 183.3, 246.1)), dot(h, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
              vec3 rr = g + o - fp;
              float dd = dot(rr, rr);
              if (dd < d1) { d2 = d1; d1 = dd; m1 = rr; } else if (dd < d2) { d2 = dd; }
            }
        float borda = sqrt(d2) - sqrt(d1);
        // Do centro do aglomerado para este ponto, na tangente da esfera.
        vec3 off = -m1;
        off -= d * dot(off, d);
        vec3 le = normalize(cross(vec3(0.0, 1.0, 0.0), d) + vec3(1e-4, 0.0, 0.0));
        vec3 no = cross(d, le);
        float fy = dot(off, no);
        if (borda < 0.18 && fy < -0.05) {
          diffuseColor.rgb *= 0.62; // sombra só EMBAIXO de cada tufo (a borda de cima fica clara)
        } else {
          // Domo: a normal inclina do centro para fora → lado do sol claro, lado oposto escuro.
          normal = normalize(normal * 0.55 + (vLeste * dot(off, le) + vNorte * fy) * 2.0);
        }
      }`,
    )
    .replace(
      "#include <opaque_fragment>",
      `// Luz própria (atributo brilho, 0–1; vale 0 em geometrias sem ele): a peça soma a sua cor à luz recebida
      // e continua acesa na sombra e à noite. Hoje só a Araucária dos Cometas (luas e copa) usa.
      outgoingLight = mix(outgoingLight, diffuseColor.rgb, clamp(vBrilho, 0.0, 1.0));
      // Luz noturna (atributo brilhoNoite × uNoite): só acende ao entardecer e à noite. Hoje só a Jabuticabeira
      // das Constelações usa: a copa branca vira lanterna e ilumina troncos, frutos e o chão da própria árvore.
      outgoingLight = mix(outgoingLight, diffuseColor.rgb, clamp(vBrilhoN * uNoite, 0.0, 1.0));
      #include <opaque_fragment>`,
    );
}

export function aplicarEstiloCopa(material, direita, texel) {
  material.onBeforeCompile = (shader) => estiloCopa(shader, direita, texel);
  material.customProgramCacheKey = () => "copa-celulas-compartilhada-v17-secura";
  return material;
}
