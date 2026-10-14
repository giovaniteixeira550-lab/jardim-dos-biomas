/**
 * Pós-processamento "pixel art": a cena 3D é renderizada em BAIXA resolução e
 * este shader a desenha na tela com pixels nítidos, aplicando:
 *  1. contorno de 1 px onde há salto de profundidade (silhuetas);
 *  2. brilho de borda no topo dos objetos (luz de recorte, leitura de volume);
 *  3. quantização para a paleta fixa com dithering ordenado (Bayer 4×4).
 */
import * as THREE from "three";
import { PALETA_RGB } from "./paleta.js";

const N = PALETA_RGB.length;

export function criarMaterialPixel() {
  return new THREE.ShaderMaterial({
    uniforms: {
      tCor: { value: null },
      tProf: { value: null },
      uTam: { value: new THREE.Vector2(1, 1) },
      uNear: { value: 1 },
      uFar: { value: 1000 },
      uTexel: { value: 0.25 },
      uPal: { value: PALETA_RGB.map(([r, g, b]) => new THREE.Vector3(r, g, b)) },
      uDither: { value: 0.42 },
      uContorno: { value: 1 },
      uQuant: { value: 1 },
    },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: /* glsl */ `
      #include <common>
      #include <packing>
      uniform sampler2D tCor;
      uniform sampler2D tProf;
      uniform vec2 uTam;
      uniform float uNear, uFar, uTexel, uDither, uContorno, uQuant;
      uniform vec3 uPal[${N}];
      varying vec2 vUv;

      vec2 px;
      vec2 uvDe(vec2 d) { return (px + d + 0.5) / uTam; }
      float dist(vec2 d) { return -orthographicDepthToViewZ(texture2D(tProf, uvDe(d)).r, uNear, uFar); }

      float bayer4(vec2 p) {
        int i = int(mod(p.x, 4.0)) + int(mod(p.y, 4.0)) * 4;
        float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
        return (m[i] + 0.5) / 16.0;
      }
      vec3 paraSRGB(vec3 c) {
        return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      }
      /** Cor mais próxima da paleta; perto do meio-termo entre duas, alterna pelo Bayer. */
      vec3 quantizar(vec3 c, float limiar) {
        float d1 = 1e9, d2 = 1e9;
        vec3 c1 = c, c2 = c;
        for (int i = 0; i < ${N}; i++) {
          vec3 e = (c - uPal[i]) * vec3(0.95, 1.2, 0.8);
          float d = dot(e, e);
          if (d < d1) { d2 = d1; c2 = c1; d1 = d; c1 = uPal[i]; }
          else if (d < d2) { d2 = d; c2 = uPal[i]; }
        }
        float t = sqrt(d1) / (sqrt(d1) + sqrt(d2) + 1e-5);
        return (t * 2.0 * uDither > limiar) ? c2 : c1;
      }

      void main() {
        px = floor(vUv * uTam);
        gl_FragColor = vec4(texture2D(tCor, uvDe(vec2(0.0))).rgb, 1.0);
        #include <tonemapping_fragment>
        vec3 c = paraSRGB(clamp(gl_FragColor.rgb, 0.0, 1.0));

        if (uContorno > 0.5) {
          float d = dist(vec2(0.0));
          // Limiar acompanha o tamanho do pixel no mundo (chão inclinado não vira linha).
          float lim = max(0.45, uTexel * 3.5);
          float atras = 0.0;
          atras = max(atras, step(lim, d - dist(vec2(1.0, 0.0))));
          atras = max(atras, step(lim, d - dist(vec2(-1.0, 0.0))));
          atras = max(atras, step(lim, d - dist(vec2(0.0, 1.0))));
          atras = max(atras, step(lim, d - dist(vec2(0.0, -1.0))));
          // Topo de um objeto: o pixel de cima está bem mais longe ⇒ brilho de recorte.
          float topo = step(lim * 1.5, dist(vec2(0.0, 1.0)) - d) * (1.0 - atras);
          c = mix(c, c * vec3(0.42, 0.45, 0.5), atras);
          c = mix(c, min(c * 1.18 + 0.03, 1.0), topo * 0.8);
        }
        if (uQuant > 0.5) c = quantizar(c, bayer4(px));
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
}
